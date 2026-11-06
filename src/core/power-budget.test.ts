import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePowerBudget } from './power-budget';
import { generateFirmware } from './firmware-gen';
import { PRESET_PROJECTS } from './hardware-catalog';

test('Power budget calculation accurately calculates battery life on modular phone', () => {
  const phone = PRESET_PROJECTS[0];
  const budget = calculatePowerBudget(phone);

  assert.ok(budget.totalActiveCurrentMa > 500, 'Modular phone active current should exceed 500mA');
  assert.ok(budget.estimatedBatteryLifeHours > 0, 'Battery life hours should be positive');
  assert.equal(budget.batteryCapacityMah, 3000);
});

test('Firmware generation outputs valid Arduino C++ structure', () => {
  const phone = PRESET_PROJECTS[0];
  const arduinoCode = generateFirmware(phone, 'arduino');

  assert.ok(arduinoCode.includes('void setup()'), 'Must contain Arduino setup()');
  assert.ok(arduinoCode.includes('void loop()'), 'Must contain Arduino loop()');
  assert.ok(arduinoCode.includes('PIN_'), 'Must generate pin defines');
  assert.ok(arduinoCode.includes(phone.mcu.name), 'Must identify MCU name');
});

test('Firmware generation outputs PlatformIO configuration with correct board', () => {
  const p4Project = PRESET_PROJECTS[1];
  const pioConfig = generateFirmware(p4Project, 'platformio');

  assert.ok(pioConfig.includes('[platformio]'), 'Must contain platformio header');
  assert.ok(pioConfig.includes('esp32-p4'), 'Must configure ESP32-P4 target');
});
