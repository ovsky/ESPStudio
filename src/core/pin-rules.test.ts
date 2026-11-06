import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCircuit } from './pin-rules';
import { PRESET_PROJECTS, MCU_BOARDS, MODULE_CATALOG } from './hardware-catalog';
import { DeviceProject } from '../types/hardware';

test('Preset Modular Phone passes essential validation without fatal electrical hazards', () => {
  const phone = PRESET_PROJECTS[0];
  const issues = validateCircuit(phone);

  // Strapping pin warning is expected for GPIO0 / GPIO3 on ESP32-S3
  const fatalErrors = issues.filter(i => i.severity === 'error');
  assert.equal(fatalErrors.length, 0, 'No fatal wiring errors should exist in reference phone preset');
});

test('Overvoltage Hazard Rule triggers when 5V rail connects directly to 3.3V GPIO', () => {
  const dummyProject: DeviceProject = {
    id: 'test-overvoltage',
    name: 'Overvoltage Test',
    version: '1.0.0',
    description: 'Hazard test',
    mcu: MCU_BOARDS[0],
    components: [
      {
        id: 'comp_test',
        typeId: 'mod_disp_ili9488',
        name: 'Test Display',
        category: 'display',
        description: 'Test',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 50,
        powerCurrentStandbyMa: 1,
        protocol: 'SPI',
        estimatedCostUsd: 10,
        x: 0,
        y: 0,
        pins: MODULE_CATALOG[0].pins
      }
    ],
    wires: [
      {
        id: 'bad_wire',
        fromComponentId: 'mcu',
        fromPinId: '5v', // 5V rail
        toComponentId: 'mcu',
        toPinId: 'gpio4', // 3.3V GPIO
        wireType: 'power-vcc',
        color: '#ff0000',
        gauge: '28AWG',
        lengthMm: 10
      }
    ],
    enclosure: PRESET_PROJECTS[0].enclosure,
    batteryCapacityMah: 1000,
    activeDutyCyclePercent: 50,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-06'
  };

  const issues = validateCircuit(dummyProject);
  const overvoltIssue = issues.find(i => i.code === 'OVERVOLTAGE_HAZARD');
  assert.ok(overvoltIssue, 'Should catch direct 5V to GPIO overvoltage connection');
  assert.equal(overvoltIssue.severity, 'error');
});

test('Floating ground detected when module lacks ground return wire', () => {
  const dummyProject: DeviceProject = {
    id: 'test-floating-gnd',
    name: 'Floating GND Test',
    version: '1.0.0',
    description: 'GND test',
    mcu: MCU_BOARDS[0],
    components: [
      {
        id: 'comp_test',
        typeId: 'mod_sensor_bme680',
        name: 'BME680',
        category: 'sensor',
        description: 'Test',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 10,
        powerCurrentStandbyMa: 0.1,
        protocol: 'I2C',
        estimatedCostUsd: 10,
        x: 0,
        y: 0,
        pins: MODULE_CATALOG[11].pins
      }
    ],
    wires: [], // No ground or power wired
    enclosure: PRESET_PROJECTS[0].enclosure,
    batteryCapacityMah: 1000,
    activeDutyCyclePercent: 50,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-06'
  };

  const issues = validateCircuit(dummyProject);
  const gndIssue = issues.find(i => i.code === 'FLOATING_GND');
  assert.ok(gndIssue, 'Should catch floating ground when module has no ground connection');
});
