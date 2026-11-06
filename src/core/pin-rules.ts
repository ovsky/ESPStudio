import { DeviceProject, PinConflictRuleIssue, PinDefinition, PinSignalType } from '../types/hardware';

/**
 * Validates hardware connections, strapping pins, bus topologies, and electrical domains.
 */
export function validateCircuit(project: DeviceProject): PinConflictRuleIssue[] {
  const issues: PinConflictRuleIssue[] = [];

  const mcuPinMap = new Map<string, PinDefinition>();
  for (const pin of project.mcu.pins) {
    mcuPinMap.set(pin.id, pin);
  }

  // Map each component pin
  const compPinMap = new Map<string, { compId: string; compName: string; pin: PinDefinition }>();
  for (const comp of project.components) {
    for (const pin of comp.pins) {
      compPinMap.set(`${comp.id}:${pin.id}`, {
        compId: comp.id,
        compName: comp.name,
        pin
      });
    }
  }

  // Track connections per pin
  const pinConnectionsCount = new Map<string, { wires: string[]; targets: string[] }>();
  for (const wire of project.wires) {
    const fromKey = wire.fromComponentId === 'mcu' ? `mcu:${wire.fromPinId}` : `${wire.fromComponentId}:${wire.fromPinId}`;
    const toKey = wire.toComponentId === 'mcu' ? `mcu:${wire.toPinId}` : `${wire.toComponentId}:${wire.toPinId}`;

    if (!pinConnectionsCount.has(fromKey)) pinConnectionsCount.set(fromKey, { wires: [], targets: [] });
    if (!pinConnectionsCount.has(toKey)) pinConnectionsCount.set(toKey, { wires: [], targets: [] });

    pinConnectionsCount.get(fromKey)!.wires.push(wire.id);
    pinConnectionsCount.get(fromKey)!.targets.push(toKey);

    pinConnectionsCount.get(toKey)!.wires.push(wire.id);
    pinConnectionsCount.get(toKey)!.targets.push(fromKey);
  }

  // Rule 1: Check Strapping Pins on MCU
  for (const pin of project.mcu.pins) {
    if (pin.isStrappingPin) {
      const key = `mcu:${pin.id}`;
      const conns = pinConnectionsCount.get(key);
      if (conns && conns.wires.length > 0) {
        issues.push({
          severity: 'warning',
          code: 'STRAPPING_PIN_USED',
          title: `Strapping Pin Utilized: ${pin.name}`,
          description: `${pin.name} is a boot strapping pin on ${project.mcu.name}. ${pin.strappingNote || 'Care must be taken to avoid pulling it unexpectedly at boot time.'}`,
          involvedPinIds: [pin.id],
          involvedComponentIds: ['mcu'],
          recommendation: 'Ensure external circuitry or pull-up/pull-down resistors do not force the pin into the wrong logic level during power-on reset.'
        });
      }
    }
  }

  // Rule 2: Multiple non-bus drivers on same GPIO
  for (const pin of project.mcu.pins) {
    const key = `mcu:${pin.id}`;
    const conns = pinConnectionsCount.get(key);
    if (!conns || conns.wires.length <= 1) continue;

    // Allowed bus sharings: I2C (SDA/SCL), SPI (SCK/MOSI/MISO with distinct CS), Power (3V3/5V/GND)
    const isBusPin =
      pin.supportedSignals.includes('I2C_SDA') ||
      pin.supportedSignals.includes('I2C_SCL') ||
      pin.supportedSignals.includes('SPI_SCK') ||
      pin.supportedSignals.includes('SPI_MOSI') ||
      pin.supportedSignals.includes('SPI_MISO') ||
      pin.supportedSignals.includes('POWER_3V3') ||
      pin.supportedSignals.includes('POWER_5V') ||
      pin.supportedSignals.includes('GND');

    if (!isBusPin) {
      issues.push({
        severity: 'error',
        code: 'GPIO_CONTENTION',
        title: `GPIO Contention on ${pin.name}`,
        description: `${pin.name} is connected to ${conns.wires.length} endpoints simultaneously, but is not configured for a shared multidrop bus.`,
        involvedPinIds: [pin.id],
        involvedComponentIds: ['mcu'],
        recommendation: 'Assign dedicated GPIOs for individual digital signals, SPI Chip Selects (CS), or UART links.'
      });
    }
  }

  // Rule 3: Missing GND Return Path on Modules
  for (const comp of project.components) {
    // Check if component has a GND pin defined
    const gndPin = comp.pins.find(p => p.supportedSignals.includes('GND'));
    if (gndPin) {
      const gndKey = `${comp.id}:${gndPin.id}`;
      const conns = pinConnectionsCount.get(gndKey);
      if (!conns || conns.wires.length === 0) {
        issues.push({
          severity: 'error',
          code: 'FLOATING_GND',
          title: `Floating Ground on "${comp.name}"`,
          description: `Component "${comp.name}" does not have its GND pin wired to system Ground. A return current path is strictly required.`,
          involvedPinIds: [gndPin.id],
          involvedComponentIds: [comp.id],
          recommendation: `Connect pin "${gndPin.name}" to MCU GND or power supply ground rail.`
        });
      }
    }

    // Check if component has power pin wired
    const powerPin = comp.pins.find(p => p.supportedSignals.includes('POWER_3V3') || p.supportedSignals.includes('POWER_5V'));
    if (powerPin) {
      // If pin is battery input and project has a battery configured, it's powered by the battery bay
      const isBatteryFed = powerPin.voltageDomain === 'VBAT' && (project.batteryCapacityMah || 0) > 0;
      const pwrKey = `${comp.id}:${powerPin.id}`;
      const conns = pinConnectionsCount.get(pwrKey);
      if (!isBatteryFed && (!conns || conns.wires.length === 0)) {
        issues.push({
          severity: 'warning',
          code: 'UNPOWERED_MODULE',
          title: `Unconnected Power on "${comp.name}"`,
          description: `Pin "${powerPin.name}" on "${comp.name}" is not connected to a 3.3V or 5V power supply rail.`,
          involvedPinIds: [powerPin.id],
          involvedComponentIds: [comp.id],
          recommendation: `Connect to ${comp.operatingVoltage} power source.`
        });
      }
    }
  }

  // Rule 4: UART TX/RX connection check (common user mistake: TX to TX instead of TX to RX)
  for (const wire of project.wires) {
    let fromSignal: PinSignalType[] = [];
    let toSignal: PinSignalType[] = [];

    if (wire.fromComponentId === 'mcu') {
      const p = mcuPinMap.get(wire.fromPinId);
      if (p) fromSignal = p.supportedSignals;
    } else {
      const p = compPinMap.get(`${wire.fromComponentId}:${wire.fromPinId}`);
      if (p) fromSignal = p.pin.supportedSignals;
    }

    if (wire.toComponentId === 'mcu') {
      const p = mcuPinMap.get(wire.toPinId);
      if (p) toSignal = p.supportedSignals;
    } else {
      const p = compPinMap.get(`${wire.toComponentId}:${wire.toPinId}`);
      if (p) toSignal = p.pin.supportedSignals;
    }

    if (fromSignal.includes('UART_TX') && toSignal.includes('UART_TX')) {
      issues.push({
        severity: 'error',
        code: 'UART_TX_TX_COLLISION',
        title: 'UART TX to TX Direct Link Detected',
        description: `Wire ${wire.netName || wire.id} connects a TX output to another TX output. UART requires TX -> RX crossover.`,
        involvedPinIds: [wire.fromPinId, wire.toPinId],
        involvedComponentIds: [wire.fromComponentId, wire.toComponentId],
        recommendation: 'Cross the connections: connect TX on device A to RX on device B, and RX on device A to TX on device B.'
      });
    }

    // Voltage safety: 5V power connected to 3.3V GPIO
    let fromPinObj: PinDefinition | undefined;
    let toPinObj: PinDefinition | undefined;
    if (wire.fromComponentId === 'mcu') fromPinObj = mcuPinMap.get(wire.fromPinId);
    else fromPinObj = compPinMap.get(`${wire.fromComponentId}:${wire.fromPinId}`)?.pin;

    if (wire.toComponentId === 'mcu') toPinObj = mcuPinMap.get(wire.toPinId);
    else toPinObj = compPinMap.get(`${wire.toComponentId}:${wire.toPinId}`)?.pin;

    const has5vRail = fromSignal.includes('POWER_5V') || toSignal.includes('POWER_5V');
    const targetIs3v3Gpio =
      (fromSignal.includes('GPIO') && fromPinObj?.voltageDomain === '3.3V') ||
      (toSignal.includes('GPIO') && toPinObj?.voltageDomain === '3.3V');

    if (has5vRail && targetIs3v3Gpio) {
      issues.push({
        severity: 'error',
        code: 'OVERVOLTAGE_HAZARD',
        title: '5V Connected to 3.3V GPIO Pin',
        description: `A 5V power rail is shorted directly to a 3.3V GPIO pin. 3.3V logic devices will suffer permanent dielectric breakdown.`,
        involvedPinIds: [wire.fromPinId, wire.toPinId],
        involvedComponentIds: [wire.fromComponentId, wire.toComponentId],
        recommendation: 'Never wire 5V directly to 3.3V GPIOs. Use a resistor voltage divider or logic level shifter (e.g. TXS0108E).'
      });
    }
  }

  return issues;
}
