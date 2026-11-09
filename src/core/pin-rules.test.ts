import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCircuit, calculatePowerBudget } from './pin-rules';
import { PRESET_PROJECTS } from './hardware-catalog';

test('Preset Modular Phone passes essential validation without fatal electrical hazards', () => {
  const phone = PRESET_PROJECTS[0];
  const issues = validateCircuit(phone);
  const errors = issues.filter((i) => i.severity === 'error');

  assert.equal(errors.length, 0, 'Cyberphone preset should have zero fatal errors');
});

test('Overvoltage Hazard Rule triggers when 5V rail connects directly to 3.3V GPIO', () => {
  const phone = JSON.parse(JSON.stringify(PRESET_PROJECTS[0]));
  // Artificially create a hazardous 5V -> 3.3V GPIO net
  phone.wires.push({
    id: 'hazard_wire',
    fromComponentId: 'mcu',
    fromPinId: 'p5v',
    toComponentId: 'mcu',
    toPinId: 'g8',
    signalType: 'POWER_5V',
    color: '#ff0000',
    gauge: '22AWG'
  });

  const issues = validateCircuit(phone);
  const hazard = issues.find((i) => i.id.includes('overvoltage'));
  assert.ok(hazard, 'Must detect 5V to 3.3V GPIO overvoltage hazard');
});

test('Floating ground detected when module lacks ground return wire', () => {
  const phone = JSON.parse(JSON.stringify(PRESET_PROJECTS[0]));
  // Remove ground wire to display
  phone.wires = phone.wires.filter((w: any) => !(w.toComponentId === 'disp_1' && w.toPinId === 'd_gnd'));

  const issues = validateCircuit(phone);
  const floatGnd = issues.find((i) => i.id.includes('floating_gnd_disp_1'));
  assert.ok(floatGnd, 'Must detect floating ground on display module');
});

test('Power budget calculation accurately calculates battery life on modular phone', () => {
  const phone = PRESET_PROJECTS[0];
  const budget = calculatePowerBudget(phone);

  assert.ok(budget.totalActiveMa > 100, 'Active current should exceed 100mA');
  assert.ok(budget.batteryLifeHours > 5, '3200mAh battery should provide > 5 hours runtime');
  assert.ok(budget.batteryLifeDays > 0.2, 'Battery life days should be positive');
});
