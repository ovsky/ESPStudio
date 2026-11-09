import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialHardwareState,
  generateBootloaderLogs,
  processSerialCommand,
  stepSimulation
} from './esp-emulator';
import { PRESET_PROJECTS } from './hardware-catalog';

test('createInitialHardwareState initializes correct memory and frequency for ESP32-S3', () => {
  const phone = PRESET_PROJECTS[0];
  const state = createInitialHardwareState(phone);

  assert.equal(state.status, 'stopped');
  assert.equal(state.activeFrequencyMhz, 240);
  assert.ok(state.freeHeapBytes > 5000000, 'Free heap should be > 5MB with PSRAM');
  assert.equal(state.ws2812Colors.length, 8);
});

test('generateBootloaderLogs creates standard ESP32 boot stages', () => {
  const phone = PRESET_PROJECTS[0];
  const logs = generateBootloaderLogs(phone);

  assert.ok(logs.length > 5, 'Should generate multi-stage boot logs');
  assert.ok(logs.some((l) => l.text.includes('POWERON_RESET')), 'Must contain poweron reset');
  assert.ok(logs.some((l) => l.text.includes('PSRAM')), 'Must initialize PSRAM');
});

test('processSerialCommand handles AT modem commands correctly', () => {
  const phone = PRESET_PROJECTS[0];
  const state = createInitialHardwareState(phone);

  const atRes = processSerialCommand('AT', state);
  assert.deepEqual(atRes.response, ['OK']);

  const csqRes = processSerialCommand('AT+CSQ', state);
  assert.ok(csqRes.response[0].includes('+CSQ:'), 'CSQ should report signal quality');

  const relayRes = processSerialCommand('RELAY1 ON', state);
  assert.equal(relayRes.nextState.relays?.ch1, true, 'Relay 1 should be energized');
});

test('stepSimulation increments uptime and updates sensor readings', () => {
  const phone = PRESET_PROJECTS[0];
  const state = createInitialHardwareState(phone);

  const step1 = stepSimulation(state);
  assert.equal(step1.nextState.uptimeSeconds, 1);
  assert.ok(step1.nextState.sensorReadings.temperatureC > 20, 'Temperature should remain realistic');
});
