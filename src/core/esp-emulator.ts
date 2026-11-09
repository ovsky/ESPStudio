import { DeviceProject, VirtualHardwareState, SerialLogEntry } from '../types/hardware';

/**
 * Creates initial default hardware state
 */
export function createInitialHardwareState(project: DeviceProject): VirtualHardwareState {
  const isP4 = project.mcu.family === 'ESP32-P4';

  // Initial 8-LED WS2812B default colors
  const initialLeds = [
    '#38bdf8', '#0ea5e9', '#06b6d4', '#10b981',
    '#22c55e', '#eab308', '#f97316', '#ef4444'
  ];

  return {
    status: 'stopped',
    uptimeSeconds: 0,
    freeHeapBytes: isP4 ? 28450120 : 7924180,
    activeFrequencyMhz: project.mcu.clockSpeedMhz,
    gpioStates: {
      0: { level: 'HIGH', pwm: 0, mode: 'INPUT' },
      4: { level: 'LOW', pwm: 0, mode: 'OUTPUT' },
      8: { level: 'HIGH', pwm: 0, mode: 'OUTPUT' }, // I2C SDA
      9: { level: 'HIGH', pwm: 0, mode: 'OUTPUT' }, // I2C SCL
      10: { level: 'HIGH', pwm: 0, mode: 'OUTPUT' }, // SPI CS
      48: { level: 'HIGH', pwm: 255, mode: 'OUTPUT' } // RGB
    },
    ws2812Colors: initialLeds,
    relays: { ch1: false, ch2: false },
    displayLines: [
      `System: ${project.name}`,
      `SoC: ${project.mcu.family} (${project.mcu.clockSpeedMhz}MHz)`,
      'Status: READY TO EXECUTE',
      'RAM: Octal PSRAM Mounted'
    ],
    sensorReadings: {
      temperatureC: 24.5,
      humidityPercent: 48.2,
      pressureHpa: 1013.25,
      vocKohm: 125.4
    },
    rotaryEncoderPos: 0,
    modemConnected: true,
    batteryMillivolts: 4120,
    touchScreenState: {
      activeApp: 'launcher',
      touchPressed: false,
      lastTouchX: 240,
      lastTouchY: 160,
      phoneDialBuffer: '',
      lightMatrixMode: 'neon',
      lightBrightness: 85,
      selectedLightColor: '#38bdf8',
      cameraObjectDetected: 'ESP32 PCB Component (98.4%)'
    }
  };
}

/**
 * Generates authentic bootloader logs for ESP32, Arduino, and Radxa SBC
 */
export function generateBootloaderLogs(project: DeviceProject): SerialLogEntry[] {
  const family = project.mcu.family;
  const isP4 = family === 'ESP32-P4';
  const isArduino = family.startsWith('Arduino');
  const isRadxa = family.startsWith('Radxa');
  const now = Date.now();
  let timeOffset = 0;

  const entries: SerialLogEntry[] = [];

  const add = (text: string, level: SerialLogEntry['level'] = 'boot') => {
    entries.push({
      id: `boot_${entries.length}_${Math.random().toString(36).substr(2, 4)}`,
      timestampMs: now + timeOffset,
      level,
      text
    });
    timeOffset += 120;
  };

  if (isRadxa) {
    add(`U-Boot SPL 2024.01-armbian (Rockchip ${project.mcu.name})`, 'boot');
    add(`Model: ${project.mcu.name} (RAM: ${project.mcu.psramSizeMb}MB, eMMC: ${project.mcu.flashSizeMb}MB)`, 'boot');
    add(`DRAM: ${project.mcu.psramSizeMb} MiB LPDDR4x channel init [OK]`, 'boot');
    add(`Loading kernel image /boot/vmlinuz-6.1-rockchip... [OK]`, 'boot');
    add(`[    0.000000] Linux version 6.1.43-rockchip (Debian GNU/Linux 12 bookworm)`, 'boot');
    add(`[    0.142010] CPU: ${project.mcu.cpuArchitecture} with ${project.mcu.cores} active cores`, 'boot');
    add(`[    0.412890] NPU Core: Rockchip RKNN Neural Processing Engine loaded (6 TOPS capability)`, 'boot');
    add(`[    0.851020] systemd[1]: Reached target Basic System & Network Interfaces.`, 'boot');
    add(`[    1.210450] systemd[1]: Started ESP-Forge Hardware Daemon (${project.name}).`, 'info');
    project.components.forEach((comp) => {
      add(`[DEV] Mounted /dev/i2c-1 & /dev/spidev0.0 for ${comp.name}`, 'info');
    });
    add(`Hardware runtime initialized. Python 3.11 interactive daemon running.`, 'info');
    return entries;
  }

  if (isArduino) {
    add(`SAM-BA / Renesas DFU USB Bootloader v3.2 active`, 'boot');
    add(`Target MCU: ${project.mcu.name} (${project.mcu.cpuArchitecture})`, 'boot');
    add(`System Core Clock: ${project.mcu.clockSpeedMhz} MHz, Voltage: 5.0V Native`, 'boot');
    add(`Initializing Arduino Core runtime...`, 'boot');
    add(`Wire / SPI hardware peripherals registered`, 'boot');
    add(`setup() entered: Starting sketch execution`, 'info');
    project.components.forEach((comp) => {
      add(`[INIT] Attached ${comp.name} on ${comp.protocol} bus`, 'info');
    });
    add(`Sketch loop() active at 115200 baud. Serial ready.`, 'info');
    return entries;
  }

  add('rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)', 'boot');
  add('configsip: 0, SPIWP:0xee', 'boot');
  add('clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00', 'boot');
  add(`mode:DIO, clock div:1, CPU freq:${project.mcu.clockSpeedMhz}MHz`, 'boot');
  add(`load:0x3fce3808,len:0x1654, entry 0x40378b88`, 'boot');
  add(`chip: ${project.mcu.name} (${project.mcu.cpuArchitecture})`, 'info');
  add(`features: Wi-Fi 2.4GHz, BT 5.0 LE, Vector AI Engine, High-Speed DMA`, 'info');
  add(`flash: ${project.mcu.flashSizeMb}MB QIO 80MHz, crystal 40MHz`, 'info');
  add(`PSRAM: ${project.mcu.psramSizeMb}MB Octal SPI 120MHz initialized in DMA cache`, 'info');
  add('cpu_start: Starting scheduler on PRO CPU & APP CPU', 'info');
  add('FreeRTOS kernel v10.4.3 running across dual cores', 'info');
  add('========================================================', 'info');
  add(`[APP_MAIN] Launching "${project.name}" runtime tasks`, 'info');

  // Module peripheral detection logs
  project.components.forEach(comp => {
    add(`[INIT] Probing ${comp.name} via ${comp.protocol} bus... [OK]`, 'info');
  });

  add('Hardware self-test: 0 ERRORS. Entering main loop.', 'info');

  return entries;
}

/**
 * Interactive AT Command parser for cellular modem and system console
 */
export function processSerialCommand(
  cmdInput: string,
  currentState: VirtualHardwareState
): { response: string[]; nextState: Partial<VirtualHardwareState> } {
  const trimmed = cmdInput.trim();
  const upper = trimmed.toUpperCase();

  // AT Commands for cellular modem
  if (upper === 'AT') {
    return { response: ['OK'], nextState: {} };
  }
  if (upper === 'AT+CSQ') {
    return { response: ['+CSQ: 28,99', 'OK'], nextState: {} };
  }
  if (upper === 'AT+CGATT?') {
    return { response: ['+CGATT: 1', 'OK'], nextState: { modemConnected: true } };
  }
  if (upper === 'AT+COPS?') {
    return { response: ['+COPS: 0,0,"Global 4G LTE",7', 'OK'], nextState: {} };
  }
  if (upper === 'AT+CBC') {
    const pct = Math.min(100, Math.max(0, Math.round(((currentState.batteryMillivolts - 3300) / 900) * 100)));
    return { response: [`+CBC: 0,${pct},${currentState.batteryMillivolts}`, 'OK'], nextState: {} };
  }

  // Hardware interactive commands
  if (upper.startsWith('RELAY1 ON') || upper === 'RELAY 1 ON') {
    return {
      response: ['[HARDWARE] Relay 1 ENERGIZED (NO circuit closed)', 'OK'],
      nextState: { relays: { ...currentState.relays, ch1: true } }
    };
  }
  if (upper.startsWith('RELAY1 OFF') || upper === 'RELAY 1 OFF') {
    return {
      response: ['[HARDWARE] Relay 1 DE-ENERGIZED (Circuit open)', 'OK'],
      nextState: { relays: { ...currentState.relays, ch1: false } }
    };
  }
  if (upper.startsWith('RELAY2 ON') || upper === 'RELAY 2 ON') {
    return {
      response: ['[HARDWARE] Relay 2 ENERGIZED', 'OK'],
      nextState: { relays: { ...currentState.relays, ch2: true } }
    };
  }
  if (upper.startsWith('RELAY2 OFF') || upper === 'RELAY 2 OFF') {
    return {
      response: ['[HARDWARE] Relay 2 DE-ENERGIZED', 'OK'],
      nextState: { relays: { ...currentState.relays, ch2: false } }
    };
  }

  // LED Strip Color Command
  if (upper.startsWith('COLOR ') || upper.startsWith('RGB ')) {
    const hex = trimmed.split(' ')[1] || '#06b6d4';
    const newLeds = Array(8).fill(hex);
    return {
      response: [`[WS2812B] Updated 8 LEDs to color ${hex}`, 'OK'],
      nextState: { ws2812Colors: newLeds }
    };
  }

  // System Status & Telemetry
  if (upper === 'STATUS' || upper === 'SYSINFO') {
    return {
      response: [
        '--- SYSTEM TELEMETRY ---',
        `Uptime: ${currentState.uptimeSeconds}s`,
        `CPU Frequency: ${currentState.activeFrequencyMhz} MHz`,
        `Free Heap: ${currentState.freeHeapBytes} bytes`,
        `Battery: ${(currentState.batteryMillivolts / 1000).toFixed(2)}V`,
        `Ambient Temp: ${currentState.sensorReadings.temperatureC.toFixed(1)}°C`,
        `Relative Humidity: ${currentState.sensorReadings.humidityPercent.toFixed(1)}%`,
        `Barometric Pressure: ${currentState.sensorReadings.pressureHpa.toFixed(1)} hPa`,
        `Gas Resistance: ${currentState.sensorReadings.vocKohm.toFixed(1)} kΩ`,
        `Relay 1: ${currentState.relays.ch1 ? 'ON' : 'OFF'} | Relay 2: ${currentState.relays.ch2 ? 'ON' : 'OFF'}`,
        'OK'
      ],
      nextState: {}
    };
  }

  if (upper === 'HELP') {
    return {
      response: [
        'Available Simulator Serial Commands:',
        '  AT, AT+CSQ, AT+CGATT?, AT+CBC, AT+COPS?  (Cellular Modem)',
        '  RELAY1 ON / OFF, RELAY2 ON / OFF           (Relay actuation)',
        '  RGB <#hex_color>                           (Addressable LED strip color)',
        '  STATUS, SYSINFO                            (Print live hardware telemetry)',
        '  HELP                                       (Show this command reference)'
      ],
      nextState: {}
    };
  }

  // Unknown command
  return {
    response: [`ERROR: Unknown command "${trimmed}". Type HELP for command list.`],
    nextState: {}
  };
}

/**
 * Advances simulation tick (called every 1s when simulation is active)
 */
export function stepSimulation(currentState: VirtualHardwareState): {
  nextState: VirtualHardwareState;
  newLogs: SerialLogEntry[];
} {
  const uptime = currentState.uptimeSeconds + 1;
  const newLogs: SerialLogEntry[] = [];
  const now = Date.now();

  // Subtle sensor fluctuations (simulating real physical ambient telemetry)
  const tempDelta = (Math.random() - 0.49) * 0.15;
  const humDelta = (Math.random() - 0.49) * 0.25;
  const gasDelta = (Math.random() - 0.48) * 1.5;

  const newTemp = Math.round((currentState.sensorReadings.temperatureC + tempDelta) * 10) / 10;
  const newHum = Math.round((currentState.sensorReadings.humidityPercent + humDelta) * 10) / 10;
  const newVoc = Math.round((currentState.sensorReadings.vocKohm + gasDelta) * 10) / 10;

  // Cycle animated WS2812B rainbow hue
  const hueShift = (uptime * 45) % 360;
  const newWs2812 = currentState.ws2812Colors.map((_, i) => {
    const h = (hueShift + i * 40) % 360;
    return `hsl(${h}, 90%, 55%)`;
  });

  // Battery slow drain simulation
  const newMv = Math.max(3300, currentState.batteryMillivolts - 1);

  // Periodic heartbeat log every 3 seconds
  if (uptime % 3 === 0) {
    newLogs.push({
      id: `hb_${uptime}`,
      timestampMs: now,
      level: 'info',
      text: `[HEARTBEAT ${uptime}s] FreeHeap: ${currentState.freeHeapBytes} B | Temp: ${newTemp}°C | Hum: ${newHum}% | Bat: ${(newMv / 1000).toFixed(2)}V`
    });
  }

  // Updated display screen lines
  const displayLines = [
    `ESP-OS RUNNING [${uptime}s]`,
    `TEMP: ${newTemp}°C | HUM: ${newHum}%`,
    `AIR QUAL: ${newVoc} kΩ (GOOD)`,
    `FREE HEAP: ${Math.round(currentState.freeHeapBytes / 1024)} KB`
  ];

  return {
    nextState: {
      ...currentState,
      uptimeSeconds: uptime,
      ws2812Colors: newWs2812,
      displayLines,
      batteryMillivolts: newMv,
      sensorReadings: {
        ...currentState.sensorReadings,
        temperatureC: newTemp,
        humidityPercent: newHum,
        vocKohm: newVoc
      }
    },
    newLogs
  };
}
