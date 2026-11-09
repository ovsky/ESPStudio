import {
  DeviceProject,
  CircuitValidationIssue,
  HardwarePin
} from '../types/hardware';

/**
 * Validates circuit schematic connections for electrical hazards, pin contentions,
 * strapping pin violations, and power rail integrity.
 */
export function validateCircuit(project: DeviceProject): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];

  // Helper: map pin IDs to pin objects
  const findPin = (componentId: string, pinId: string): { pin: HardwarePin | null; compName: string } => {
    if (componentId === 'mcu') {
      const p = project.mcu.pins.find((pin) => pin.id === pinId) || null;
      return { pin: p, compName: project.mcu.name };
    }
    const comp = project.components.find((c) => c.id === componentId);
    if (!comp) return { pin: null, compName: 'Unknown' };
    const p = comp.pins.find((pin) => pin.id === pinId) || null;
    return { pin: p, compName: comp.name };
  };

  // Rule 1: Power & Ground Integrity per Component
  project.components.forEach((comp) => {
    const powerPins = comp.pins.filter((p) => p.electricalType === 'power');
    const groundPins = comp.pins.filter((p) => p.electricalType === 'ground');

    const hasPowerConnected = powerPins.some((p) =>
      project.wires.some(
        (w) =>
          (w.fromComponentId === comp.id && w.fromPinId === p.id) ||
          (w.toComponentId === comp.id && w.toPinId === p.id)
      )
    );

    const hasGroundConnected = groundPins.some((p) =>
      project.wires.some(
        (w) =>
          (w.fromComponentId === comp.id && w.fromPinId === p.id) ||
          (w.toComponentId === comp.id && w.toPinId === p.id)
      )
    );

    if (powerPins.length > 0 && !hasPowerConnected) {
      issues.push({
        id: `unpowered_${comp.id}`,
        severity: 'error',
        title: `Unpowered Module: ${comp.name}`,
        description: `${comp.name} requires a ${comp.supplyVoltage} supply rail but has no power net connected.`,
        affectedComponents: [comp.id],
        affectedPins: powerPins.map((p) => p.id),
        fixRecommendation: `Route a wire from the MCU ${comp.supplyVoltage} power pin to ${comp.name} VCC.`
      });
    }

    if (groundPins.length > 0 && !hasGroundConnected) {
      issues.push({
        id: `floating_gnd_${comp.id}`,
        severity: 'error',
        title: `Floating Ground: ${comp.name}`,
        description: `${comp.name} lacks a ground return path (GND wire missing), which prevents signal reference.`,
        affectedComponents: [comp.id],
        affectedPins: groundPins.map((p) => p.id),
        fixRecommendation: `Connect ${comp.name} GND to the common system ground rail.`
      });
    }
  });

  // Rule 2: 5V Overvoltage Hazard Check (5V directly wired to 3.3V GPIO without level shifter)
  project.wires.forEach((wire) => {
    const from = findPin(wire.fromComponentId, wire.fromPinId);
    const to = findPin(wire.toComponentId, wire.toPinId);

    if (!from.pin || !to.pin) return;

    // Check if one is a 5V power or native 5V output and the other is a 3.3V GPIO input
    const isFrom5v = from.pin.voltageDomain === '5.0V' && from.pin.electricalType === 'power';
    const isTo3v3Digital = to.pin.voltageDomain === '3.3V' && to.pin.electricalType === 'digital';

    const isTo5v = to.pin.voltageDomain === '5.0V' && to.pin.electricalType === 'power';
    const isFrom3v3Digital = from.pin.voltageDomain === '3.3V' && from.pin.electricalType === 'digital';

    if ((isFrom5v && isTo3v3Digital) || (isTo5v && isFrom3v3Digital)) {
      issues.push({
        id: `overvoltage_${wire.id}`,
        severity: 'error',
        title: '5V Overvoltage Hazard on 3.3V GPIO',
        description: `Wire connects a 5.0V rail directly to 3.3V sensitive digital GPIO pin (${isTo3v3Digital ? to.pin.label : from.pin.label}). This causes permanent gate oxide breakdown without a bidirectional level shifter.`,
        affectedComponents: [wire.fromComponentId, wire.toComponentId],
        affectedPins: [wire.fromPinId, wire.toPinId],
        fixRecommendation: 'Remove direct wire or insert an inline bidirectional MOSFET level shifter (e.g., TXB0108).'
      });
    }
  });

  // Rule 3: Strapping Pin Bootstrap Warnings
  project.wires.forEach((wire) => {
    const from = findPin(wire.fromComponentId, wire.fromPinId);
    const to = findPin(wire.toComponentId, wire.toPinId);

    [from, to].forEach((item) => {
      if (item.pin && item.pin.isStrappingPin) {
        issues.push({
          id: `strapping_${wire.id}_${item.pin.id}`,
          severity: 'warning',
          title: `Strapping Pin Utilized: ${item.pin.label}`,
          description: `${item.pin.label} is an internal bootloader strapping pin. Holding this line LOW during power-on triggers download boot mode rather than normal SPI flash execution.`,
          affectedComponents: ['mcu'],
          affectedPins: [item.pin.id],
          fixRecommendation: 'Ensure connected peripheral keeps this line floating or pulled HIGH during cold boot.'
        });
      }
    });
  });

  return issues;
}

/**
 * Computes battery runtime estimate based on component power budgets,
 * battery capacity, and active duty cycle percentage.
 */
export function calculatePowerBudget(project: DeviceProject): {
  totalActiveMa: number;
  totalSleepMa: number;
  weightedAvgMa: number;
  batteryLifeHours: number;
  batteryLifeDays: number;
} {
  const mcuActive = project.mcu.activeCurrentMa;
  const mcuSleep = project.mcu.idleCurrentMa;

  let compActive = 0;
  let compSleep = 0;

  project.components.forEach((c) => {
    compActive += c.activeCurrentMa;
    compSleep += c.sleepCurrentMa;
  });

  const totalActiveMa = mcuActive + compActive;
  const totalSleepMa = mcuSleep + compSleep;

  const dutyCycle = Math.max(1, Math.min(100, project.activeDutyCyclePercent)) / 100.0;
  const weightedAvgMa = totalActiveMa * dutyCycle + totalSleepMa * (1.0 - dutyCycle);

  const capacity = project.batteryCapacityMah > 0 ? project.batteryCapacityMah : 2500;
  const usableCapacity = capacity * 0.85; // 85% LDO/DCDC conversion efficiency

  const batteryLifeHours = Math.round((usableCapacity / weightedAvgMa) * 10) / 10;
  const batteryLifeDays = Math.round((batteryLifeHours / 24) * 10) / 10;

  return {
    totalActiveMa,
    totalSleepMa,
    weightedAvgMa: Math.round(weightedAvgMa * 10) / 10,
    batteryLifeHours,
    batteryLifeDays
  };
}
