import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleDisplayTouch
} from './interactive-display';
import { createInitialHardwareState, generateBootloaderLogs } from './esp-emulator';
import { PRESET_PROJECTS, MCU_BOARDS } from './hardware-catalog';

test('Board catalog contains modern ESP32, Arduino, Radxa, and Pico boards', () => {
  const families = MCU_BOARDS.map((b) => b.family);
  assert.ok(families.includes('ESP32-S3'), 'ESP32-S3 must be present');
  assert.ok(families.includes('ESP32-P4'), 'ESP32-P4 must be present');
  assert.ok(families.includes('Arduino-Uno-R4'), 'Arduino Uno R4 must be present');
  assert.ok(families.includes('Arduino-Giga-R1'), 'Arduino Giga R1 must be present');
  assert.ok(families.includes('Radxa-Zero-3W'), 'Radxa Zero 3W must be present');
  assert.ok(families.includes('Radxa-Rock-5B'), 'Radxa ROCK 5B must be present');
  assert.ok(families.includes('Raspberry-Pi-Pico-2'), 'Raspberry Pi Pico 2 must be present');
});

test('Radxa Linux SBC bootloader emits U-Boot and Linux 6.1 kernel messages', () => {
  const radxaPreset = PRESET_PROJECTS.find((p) => p.mcu.family === 'Radxa-Zero-3W');
  assert.ok(radxaPreset, 'Radxa preset must exist');

  const logs = generateBootloaderLogs(radxaPreset);
  assert.ok(logs.some((l) => l.text.includes('U-Boot SPL')), 'Must log U-Boot SPL');
  assert.ok(logs.some((l) => l.text.includes('Linux version 6.1')), 'Must log Linux 6.1 kernel boot');
  assert.ok(logs.some((l) => l.text.includes('NPU Core')), 'Must log NPU acceleration');
});

test('handleDisplayTouch navigates between firmware applications via bottom nav bar', () => {
  const phone = PRESET_PROJECTS[0];
  const initial = createInitialHardwareState(phone);
  assert.equal(initial.touchScreenState.activeApp, 'launcher');

  // Tap bottom nav bar for "Phone" (X: 135, Y: 360)
  const navToPhone = handleDisplayTouch(initial, 135, 360, phone);
  assert.equal(navToPhone.updatedState.touchScreenState.activeApp, 'phone');
  assert.ok(navToPhone.serialEvent?.includes('PHONE'));

  // Tap bottom nav bar for "Lights" (X: 220, Y: 360)
  const navToMatrix = handleDisplayTouch(navToPhone.updatedState, 220, 360, phone);
  assert.equal(navToMatrix.updatedState.touchScreenState.activeApp, 'matrix');

  // Tap bottom nav bar for "Sensors" (X: 300, Y: 360)
  const navToSensor = handleDisplayTouch(navToMatrix.updatedState, 300, 360, phone);
  assert.equal(navToSensor.updatedState.touchScreenState.activeApp, 'sensor');
});

test('handleDisplayTouch phone dialer app dials digits and handles backspace', () => {
  const phone = PRESET_PROJECTS[0];
  const initial = createInitialHardwareState(phone);
  initial.touchScreenState.activeApp = 'phone';

  // Dial '5' (Keypad row 1 col 1: X=215, Y=175)
  const dial5 = handleDisplayTouch(initial, 215, 175, phone);
  assert.equal(dial5.updatedState.touchScreenState.phoneDialBuffer, '5');
  assert.equal(dial5.audioFreq, 770, 'DTMF frequency for 5 should be 770Hz');

  // Dial '8' (Keypad row 2 col 1: X=215, Y=225)
  const dial8 = handleDisplayTouch(dial5.updatedState, 215, 225, phone);
  assert.equal(dial8.updatedState.touchScreenState.phoneDialBuffer, '58');

  // Tap Backspace button (X=450, Y=75)
  const backspace = handleDisplayTouch(dial8.updatedState, 450, 75, phone);
  assert.equal(backspace.updatedState.touchScreenState.phoneDialBuffer, '5');
});

test('handleDisplayTouch matrix app toggles lighting patterns and brightness', () => {
  const phone = PRESET_PROJECTS[0];
  const initial = createInitialHardwareState(phone);
  initial.touchScreenState.activeApp = 'matrix';

  // Tap "Rainbow Wave" mode card (X=110, Y=145)
  const rainbow = handleDisplayTouch(initial, 110, 145, phone);
  assert.equal(rainbow.updatedState.touchScreenState.lightMatrixMode, 'rainbow');

  // Tap "Breathing" mode card (X=250, Y=145)
  const breathing = handleDisplayTouch(rainbow.updatedState, 250, 145, phone);
  assert.equal(breathing.updatedState.touchScreenState.lightMatrixMode, 'breathing');
});
