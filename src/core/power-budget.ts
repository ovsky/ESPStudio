import { DeviceProject, PowerBudgetSummary, WireGauge } from '../types/hardware';

/**
 * Approximate resistance per meter in Ohms at 20C for copper stranded hookup wire.
 */
const WIRE_RESISTANCE_OHM_PER_METER: Record<WireGauge, number> = {
  '28AWG': 0.213,
  '26AWG': 0.134,
  '24AWG': 0.084,
  '22AWG': 0.053,
  'FPC-Ribbon': 0.350
};

/**
 * Computes power consumption, battery runtime, and wire IR voltage drop.
 */
export function calculatePowerBudget(project: DeviceProject): PowerBudgetSummary {
  // MCU active and sleep draw
  let totalActiveCurrentMa = project.mcu.typicalCurrentActiveMa;
  let totalSleepCurrentMa = project.mcu.typicalCurrentDeepSleepUa / 1000.0;

  // Add component currents
  for (const comp of project.components) {
    totalActiveCurrentMa += comp.powerCurrentActiveMa;
    totalSleepCurrentMa += comp.powerCurrentStandbyMa;
  }

  const batteryCapacityMah = project.batteryCapacityMah || 0;
  const activeDutyCyclePercent = Math.max(1, Math.min(100, project.activeDutyCyclePercent || 20));

  // Weighted average current draw in mA:
  // Avg = (Active * Duty% + Sleep * (100 - Duty%)) / 100
  const avgCurrentMa =
    (totalActiveCurrentMa * activeDutyCyclePercent +
      totalSleepCurrentMa * (100 - activeDutyCyclePercent)) /
    100.0;

  let estimatedBatteryLifeHours = 0;
  let estimatedBatteryLifeDays = 0;

  if (batteryCapacityMah > 0 && avgCurrentMa > 0) {
    // 85% battery discharge efficiency factor
    estimatedBatteryLifeHours = Math.round(((batteryCapacityMah * 0.85) / avgCurrentMa) * 10) / 10;
    estimatedBatteryLifeDays = Math.round((estimatedBatteryLifeHours / 24.0) * 10) / 10;
  }

  // Calculate worst-case wire voltage drop on highest current branch
  let maxVoltageDropVolts = 0;
  for (const wire of project.wires) {
    if (wire.wireType === 'power-vcc' || wire.wireType === 'power-gnd') {
      const lengthMeters = (wire.lengthMm || 50) / 1000.0;
      const resPerM = WIRE_RESISTANCE_OHM_PER_METER[wire.gauge] || 0.15;
      const wireRes = resPerM * lengthMeters;

      // Find component connected to this wire
      const targetComp = project.components.find(
        c => c.id === wire.toComponentId || c.id === wire.fromComponentId
      );
      const currentAmps = (targetComp ? targetComp.powerCurrentActiveMa : totalActiveCurrentMa) / 1000.0;
      const vDrop = currentAmps * wireRes;
      if (vDrop > maxVoltageDropVolts) {
        maxVoltageDropVolts = Math.round(vDrop * 1000) / 1000;
      }
    }
  }

  const notes: string[] = [];
  const isPowerDeficit = totalActiveCurrentMa > 1200;

  if (totalActiveCurrentMa > 1000) {
    notes.push(
      'Peak active current exceeds 1.0A. Use dedicated thick 22AWG power traces and ensure low-ESR bulk electrolytic capacitors (470uF - 1000uF).'
    );
  }

  if (batteryCapacityMah === 0) {
    notes.push('Mains / USB-C powered system. Continuous operation with no battery depletion.');
  } else if (estimatedBatteryLifeHours < 4) {
    notes.push(
      `Short runtime (${estimatedBatteryLifeHours}h). Consider increasing battery size or lowering display backlight brightness & active duty cycle.`
    );
  } else {
    notes.push(
      `Estimated battery endurance is approximately ${estimatedBatteryLifeDays} days (${estimatedBatteryLifeHours} operating hours).`
    );
  }

  return {
    totalActiveCurrentMa: Math.round(totalActiveCurrentMa),
    totalSleepCurrentMa: Math.round(totalSleepCurrentMa * 100) / 100,
    batteryCapacityMah,
    activeDutyCyclePercent,
    estimatedBatteryLifeHours,
    estimatedBatteryLifeDays,
    maxVoltageDropVolts,
    isPowerDeficit,
    notes
  };
}
