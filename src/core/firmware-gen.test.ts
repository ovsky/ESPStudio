import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFirmware } from './firmware-gen';
import { PRESET_PROJECTS } from './hardware-catalog';

test('Firmware generation outputs valid Arduino C++ structure', () => {
  const phone = PRESET_PROJECTS[0];
  const cpp = generateFirmware(phone, 'arduino');

  assert.ok(cpp.includes('void setup()'), 'Must contain setup()');
  assert.ok(cpp.includes('void loop()'), 'Must contain loop()');
  assert.ok(cpp.includes('Serial.begin(115200)'), 'Must configure UART baudrate');
});

test('Firmware generation outputs PlatformIO configuration with correct board', () => {
  const phone = PRESET_PROJECTS[0];
  const ini = generateFirmware(phone, 'platformio');

  assert.ok(ini.includes('[env:'), 'Must define environment');
  assert.ok(ini.includes('platform = espressif32'), 'Must use espressif32 platform');
  assert.ok(ini.includes('board = esp32-s3-devkitc-1'), 'Must configure S3 board');
});
