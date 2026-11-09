import { VirtualHardwareState, DeviceProject } from '../types/hardware';

/**
 * Interactive Touchscreen Firmware Engine
 * Simulates a capacitive touch display running embedded GUI frameworks (LVGL / TouchGFX / Slint).
 * Supports multi-app switching, tactile button presses, phone dialing, light matrix control,
 * sensor visualization, camera AI vision, and terminal diagnostics.
 */

export interface TouchPoint {
  x: number;
  y: number;
}

export type DisplayApp = 'launcher' | 'phone' | 'matrix' | 'sensor' | 'vision' | 'terminal';

/**
 * Processes a touch/click event on the display surface (coordinates in range 0..512, 0..384)
 */
export function handleDisplayTouch(
  state: VirtualHardwareState,
  x: number,
  y: number,
  project: DeviceProject
): { updatedState: VirtualHardwareState; serialEvent?: string; audioFreq?: number } {
  const currentApp = state.touchScreenState.activeApp;
  let nextState: VirtualHardwareState = JSON.parse(JSON.stringify(state));
  let serialEvent: string | undefined;
  let audioFreq: number | undefined;

  // Global Bottom Navigation Bar (Y: 344 to 384)
  if (y >= 344) {
    if (x >= 20 && x <= 95) nextState.touchScreenState.activeApp = 'launcher';
    else if (x >= 105 && x <= 175) nextState.touchScreenState.activeApp = 'phone';
    else if (x >= 185 && x <= 255) nextState.touchScreenState.activeApp = 'matrix';
    else if (x >= 265 && x <= 335) nextState.touchScreenState.activeApp = 'sensor';
    else if (x >= 345 && x <= 415) nextState.touchScreenState.activeApp = 'vision';
    else if (x >= 425 && x <= 495) nextState.touchScreenState.activeApp = 'terminal';

    serialEvent = `[TOUCH_NAV] Switched to App: ${nextState.touchScreenState.activeApp.toUpperCase()}`;
    return { updatedState: nextState, serialEvent };
  }

  // App 1: Launcher Grid
  if (currentApp === 'launcher') {
    // 6 App Cards
    if (x >= 40 && x <= 180 && y >= 70 && y <= 180) {
      nextState.touchScreenState.activeApp = 'phone';
      serialEvent = '[TOUCH_APP] Opened Phone Dialer';
    } else if (x >= 190 && x <= 330 && y >= 70 && y <= 180) {
      nextState.touchScreenState.activeApp = 'matrix';
      serialEvent = '[TOUCH_APP] Opened RGB Light Controller';
    } else if (x >= 340 && x <= 480 && y >= 70 && y <= 180) {
      nextState.touchScreenState.activeApp = 'sensor';
      serialEvent = '[TOUCH_APP] Opened Environmental Lab';
    } else if (x >= 40 && x <= 180 && y >= 200 && y <= 310) {
      nextState.touchScreenState.activeApp = 'vision';
      serialEvent = '[TOUCH_APP] Opened AI Vision Camera';
    } else if (x >= 190 && x <= 330 && y >= 200 && y <= 310) {
      nextState.touchScreenState.activeApp = 'terminal';
      serialEvent = '[TOUCH_APP] Opened Diagnostic Shell';
    } else if (x >= 340 && x <= 480 && y >= 200 && y <= 310) {
      // Toggle Relay 1 as quick action
      nextState.relays.ch1 = !nextState.relays.ch1;
      serialEvent = `[HARDWARE] Relay 1 ${nextState.relays.ch1 ? 'ENERGIZED (CLOSED)' : 'DE-ENERGIZED (OPEN)'}`;
    }
  }

  // App 2: Phone Dialer
  else if (currentApp === 'phone') {
    // Top Display area (Backspace on top right)
    if (x >= 420 && x <= 480 && y >= 55 && y <= 95) {
      const cur = nextState.touchScreenState.phoneDialBuffer;
      nextState.touchScreenState.phoneDialBuffer = cur.slice(0, -1);
      audioFreq = 400;
    }

    // Keypad layout (4 rows x 3 cols: 1-9, *, 0, #)
    // Left: 140, 220, 300. Tops: 105, 160, 215, 270
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', '#']
    ];
    const freqs: Record<string, number> = {
      '1': 697, '2': 770, '3': 852,
      '4': 697, '5': 770, '6': 852,
      '7': 697, '8': 770, '9': 852,
      '*': 941, '0': 941, '#': 941
    };

    let touchedKey = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const kx = 135 + c * 80;
        const ky = 110 + r * 50;
        if (x >= kx && x <= kx + 70 && y >= ky && y <= ky + 42) {
          touchedKey = keys[r][c];
          break;
        }
      }
    }

    if (touchedKey) {
      nextState.touchScreenState.phoneDialBuffer += touchedKey;
      audioFreq = freqs[touchedKey] || 700;
      serialEvent = `[TOUCH_KEYPAD] Pressed '${touchedKey}' -> Dial: "${nextState.touchScreenState.phoneDialBuffer}"`;
    }

    // Call Button (Green pill at bottom: 380, 270)
    if (x >= 380 && x <= 470 && y >= 270 && y <= 325) {
      const dialNum = nextState.touchScreenState.phoneDialBuffer || '911';
      serialEvent = `[MODEM] ATD${dialNum}; -> Dialing Voice Call (4G VoLTE Active)...`;
      audioFreq = 440;
    }
  }

  // App 3: RGB Matrix & Relays
  else if (currentApp === 'matrix') {
    // Mode Buttons (Y: 60 to 95)
    if (y >= 60 && y <= 95) {
      if (x >= 25 && x <= 110) nextState.touchScreenState.lightMatrixMode = 'solid';
      else if (x >= 120 && x <= 205) nextState.touchScreenState.lightMatrixMode = 'neon';
      else if (x >= 215 && x <= 300) nextState.touchScreenState.lightMatrixMode = 'aurora';
      else if (x >= 310 && x <= 395) nextState.touchScreenState.lightMatrixMode = 'rainbow';
      else if (x >= 405 && x <= 490) nextState.touchScreenState.lightMatrixMode = 'strobe';

      serialEvent = `[LIGHT_UI] Switched Pattern: ${nextState.touchScreenState.lightMatrixMode.toUpperCase()}`;
    }

    // Pattern Mode cards or Color swatches (Y: 120 to 165)
    if (y >= 120 && y <= 165) {
      if (x >= 80 && x <= 160) {
        nextState.touchScreenState.lightMatrixMode = 'rainbow';
        serialEvent = `[LIGHT_UI] Switched Pattern: RAINBOW`;
      } else if (x >= 200 && x <= 290) {
        nextState.touchScreenState.lightMatrixMode = 'breathing';
        serialEvent = `[LIGHT_UI] Switched Pattern: BREATHING`;
      } else {
        const swatches = ['#38bdf8', '#ec4899', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ffffff'];
        swatches.forEach((col, idx) => {
          const cx = 40 + idx * 65;
          if (x >= cx && x <= cx + 55 && y >= 115 && y <= 165) {
            nextState.touchScreenState.selectedLightColor = col;
            nextState.ws2812Colors = nextState.ws2812Colors.map(() => col);
            serialEvent = `[LIGHT_UI] Color Palette Selected: ${col}`;
          }
        });
      }
    }

    // Dual Relay Toggles (Y: 230 to 290)
    if (y >= 230 && y <= 290) {
      if (x >= 40 && x <= 240) {
        nextState.relays.ch1 = !nextState.relays.ch1;
        serialEvent = `[RELAY] Channel 1 ${nextState.relays.ch1 ? 'ENERGIZED (CLOSED)' : 'DE-ENERGIZED (OPEN)'}`;
      } else if (x >= 270 && x <= 470) {
        nextState.relays.ch2 = !nextState.relays.ch2;
        serialEvent = `[RELAY] Channel 2 ${nextState.relays.ch2 ? 'ENERGIZED (CLOSED)' : 'DE-ENERGIZED (OPEN)'}`;
      }
    }
  }

  // App 4: Sensor Lab
  else if (currentApp === 'sensor') {
    // Calibration / Sample Button (Y: 260 to 310)
    if (x >= 140 && x <= 370 && y >= 260 && y <= 310) {
      nextState.sensorReadings.temperatureC = Math.round((22 + Math.random() * 5) * 10) / 10;
      nextState.sensorReadings.humidityPercent = Math.round((45 + Math.random() * 12) * 10) / 10;
      nextState.sensorReadings.vocKohm = Math.round((120 + Math.random() * 30) * 10) / 10;
      serialEvent = `[BME680] High-precision sample triggered: ${nextState.sensorReadings.temperatureC}°C, ${nextState.sensorReadings.humidityPercent}% RH, ${nextState.sensorReadings.vocKohm} kΩ`;
    }
  }

  // App 5: AI Vision
  else if (currentApp === 'vision') {
    // Snapshot Frame
    if (x >= 160 && x <= 350 && y >= 265 && y <= 315) {
      const detections = ['Person (96.2%)', 'ESP32-S3 PCB (98.9%)', 'Electronics Harness (91.4%)', 'Cat (88.7%)'];
      nextState.touchScreenState.cameraObjectDetected = detections[Math.floor(Math.random() * detections.length)];
      serialEvent = `[NPU_VISION] Snapshot Captured! Classified: ${nextState.touchScreenState.cameraObjectDetected}`;
    }
  }

  // App 6: Diagnostic Terminal
  else if (currentApp === 'terminal') {
    // Quick Touch Buttons: AT (X: 30..130), STATUS (140..250), RELAY1 (260..370), REBOOT (380..490)
    if (y >= 260 && y <= 310) {
      if (x >= 30 && x <= 130) {
        serialEvent = 'AT -> OK (Virtual UART0)';
      } else if (x >= 140 && x <= 250) {
        serialEvent = `STATUS -> Uptime:${nextState.uptimeSeconds}s | Heap:${Math.round(nextState.freeHeapBytes / 1024)}KB | Relays: [${nextState.relays.ch1 ? 'ON' : 'OFF'}, ${nextState.relays.ch2 ? 'ON' : 'OFF'}]`;
      } else if (x >= 260 && x <= 370) {
        nextState.relays.ch1 = !nextState.relays.ch1;
        serialEvent = `RELAY1 -> Toggled to ${nextState.relays.ch1 ? 'ON' : 'OFF'}`;
      } else if (x >= 380 && x <= 490) {
        nextState.uptimeSeconds = 0;
        serialEvent = '[SYSTEM] Software Reset initiated via Touch Terminal';
      }
    }
  }

  nextState.touchScreenState.lastTouchX = x;
  nextState.touchScreenState.lastTouchY = y;
  nextState.touchScreenState.touchPressed = true;

  return { updatedState: nextState, serialEvent, audioFreq };
}

/**
 * Draws the active firmware UI onto any HTML5 2D canvas (size 512x384)
 */
export function renderDisplayToCanvas(
  canvas: HTMLCanvasElement,
  state: VirtualHardwareState,
  project: DeviceProject
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width || 512;
  const h = canvas.height || 384;
  const app = state.touchScreenState?.activeApp || 'launcher';

  // 1. Sleek Dark Background
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  // 2. Top Status Bar (0 to 36 px)
  const gradHeader = ctx.createLinearGradient(0, 0, 0, 36);
  gradHeader.addColorStop(0, '#0f172a');
  gradHeader.addColorStop(1, '#090d16');
  ctx.fillStyle = gradHeader;
  ctx.fillRect(0, 0, w, 36);

  // Left Status: Time & Cellular
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('12:45 PM', 14, 23);

  // 4G Signal bars
  ctx.fillStyle = '#22c55e';
  for (let b = 0; b < 4; b++) {
    ctx.fillRect(80 + b * 5, 25 - b * 3, 3, b * 3 + 4);
  }
  ctx.font = '10px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('4G LTE', 105, 23);

  // Right Status: Battery & Core
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${project.mcu.name.split(' ')[0]} | 94%`, w - 14, 23);

  // Battery icon
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w - 75, 13, 20, 11);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(w - 73, 15, 14, 7);

  // -------------------------------------------------------------
  // APP 1: LAUNCHER GRID
  // -------------------------------------------------------------
  if (app === 'launcher') {
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${project.name}`, 24, 60);

    const apps = [
      { name: 'Phone Dialer', desc: 'Cellular & VoLTE', col: '#10b981', x: 30, y: 75, icon: '📞' },
      { name: 'Light Matrix', desc: 'RGB LEDs & Mains', col: '#06b6d4', x: 190, y: 75, icon: '💡' },
      { name: 'Sensor Lab', desc: 'BME680 Telemetry', col: '#8b5cf6', x: 350, y: 75, icon: '🌡️' },
      { name: 'AI Vision', desc: 'Camera NPU (6 TOPS)', col: '#ec4899', x: 30, y: 195, icon: '📷' },
      { name: 'Terminal Shell', desc: 'UART & AT Commands', col: '#f59e0b', x: 190, y: 195, icon: '⚡' },
      { name: 'Relay 1 Toggle', desc: state.relays.ch1 ? 'ACTIVE (CLOSED)' : 'OFF (OPEN)', col: state.relays.ch1 ? '#22c55e' : '#64748b', x: 350, y: 195, icon: '🔌' }
    ];

    apps.forEach((a) => {
      // Card background
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(a.x, a.y, 135, 95, 12);
      ctx.fill();

      // Card border
      ctx.strokeStyle = a.col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(a.x, a.y, 135, 95, 12);
      ctx.stroke();

      // Icon & Name
      ctx.font = '22px system-ui';
      ctx.fillText(a.icon, a.x + 12, a.y + 34);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(a.name, a.x + 12, a.y + 60);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(a.desc, a.x + 12, a.y + 78);
    });

    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Tap any tile to launch firmware application', w / 2, 320);
  }

  // -------------------------------------------------------------
  // APP 2: PHONE DIALER
  // -------------------------------------------------------------
  else if (app === 'phone') {
    // Dial display bar
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(40, 50, 432, 45, 10);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(state.touchScreenState.phoneDialBuffer || 'Enter Number...', 56, 81);

    // Backspace button
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⌫', 445, 80);

    // 12 Keypad Buttons
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', '#']
    ];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const kx = 135 + c * 80;
        const ky = 110 + r * 50;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(kx, ky, 70, 42, 8);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(keys[r][c], kx + 35, ky + 27);
      }
    }

    // Call Button
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.roundRect(385, 270, 85, 42, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CALL', 427, 296);
  }

  // -------------------------------------------------------------
  // APP 3: RGB MATRIX & RELAYS
  // -------------------------------------------------------------
  else if (app === 'matrix') {
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('WS2812B Light Scene Modes', 25, 55);

    // Mode chips
    const modes: Array<{ id: 'solid' | 'neon' | 'aurora' | 'rainbow' | 'strobe'; label: string; x: number }> = [
      { id: 'solid', label: 'Solid', x: 25 },
      { id: 'neon', label: 'Neon Pulse', x: 120 },
      { id: 'aurora', label: 'Aurora', x: 215 },
      { id: 'rainbow', label: 'Rainbow', x: 310 },
      { id: 'strobe', label: 'Strobe', x: 405 }
    ];

    modes.forEach((m) => {
      const isSel = state.touchScreenState.lightMatrixMode === m.id;
      ctx.fillStyle = isSel ? '#0284c7' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(m.x, 65, 85, 30, 8);
      ctx.fill();
      ctx.strokeStyle = isSel ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isSel ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, m.x + 42, 84);
    });

    // Color Swatches
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Color Palette (Tap to set all 8/64 LEDs)', 25, 115);

    const swatches = ['#38bdf8', '#ec4899', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ffffff'];
    swatches.forEach((col, idx) => {
      const cx = 35 + idx * 65;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx + 25, 145, 18, 0, Math.PI * 2);
      ctx.fill();
      if (state.touchScreenState.selectedLightColor === col) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Relay Cards
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Mains High-Voltage Relays (Tap to Toggle)', 25, 205);

    // Relay 1 Card
    ctx.fillStyle = state.relays.ch1 ? '#064e3b' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(35, 220, 210, 85, 10);
    ctx.fill();
    ctx.strokeStyle = state.relays.ch1 ? '#10b981' : '#334155';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Relay 1 (Chandelier)', 50, 248);
    ctx.fillStyle = state.relays.ch1 ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(state.relays.ch1 ? '● ENERGIZED [CLOSED]' : '○ DE-ENERGIZED [OPEN]', 50, 275);

    // Relay 2 Card
    ctx.fillStyle = state.relays.ch2 ? '#064e3b' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(265, 220, 210, 85, 10);
    ctx.fill();
    ctx.strokeStyle = state.relays.ch2 ? '#10b981' : '#334155';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Relay 2 (HVAC Power)', 280, 248);
    ctx.fillStyle = state.relays.ch2 ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(state.relays.ch2 ? '● ENERGIZED [CLOSED]' : '○ DE-ENERGIZED [OPEN]', 280, 275);
  }

  // -------------------------------------------------------------
  // APP 4: SENSOR LAB
  // -------------------------------------------------------------
  else if (app === 'sensor') {
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BME680 Environmental Station (I2C @ 0x77)', 25, 58);

    const s = state.sensorReadings;
    const cards = [
      { label: 'Ambient Temperature', val: `${s.temperatureC}°C`, col: '#f97316', x: 30, y: 75 },
      { label: 'Relative Humidity', val: `${s.humidityPercent}%`, col: '#06b6d4', x: 265, y: 75 },
      { label: 'Barometric Pressure', val: `${s.pressureHpa} hPa`, col: '#a855f7', x: 30, y: 165 },
      { label: 'Gas Sensor VOC Index', val: `${s.vocKohm} kΩ (Good)`, col: '#22c55e', x: 265, y: 165 }
    ];

    cards.forEach((c) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, 215, 75, 10);
      ctx.fill();
      ctx.strokeStyle = c.col;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(c.label, c.x + 14, c.y + 26);

      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = c.col;
      ctx.fillText(c.val, c.x + 14, c.y + 55);
    });

    // Sample trigger button
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(140, 260, 230, 42, 10);
    ctx.fill();
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Sample High-Precision Data', 255, 286);
  }

  // -------------------------------------------------------------
  // APP 5: AI VISION CAMERA
  // -------------------------------------------------------------
  else if (app === 'vision') {
    ctx.fillStyle = '#020617';
    ctx.fillRect(30, 50, 452, 205);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 50, 452, 205);

    // Viewfinder crosshair
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(256, 70);
    ctx.lineTo(256, 235);
    ctx.moveTo(50, 152);
    ctx.lineTo(462, 152);
    ctx.stroke();

    // Bounding Box
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(170, 90, 172, 125);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fillRect(170, 90, 172, 125);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(state.touchScreenState.cameraObjectDetected || 'Target (96.4%)', 175, 110);
    ctx.fillText('NPU: 6.0 TOPS 60 FPS', 175, 128);

    // Trigger button
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.roundRect(160, 268, 192, 42, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📷 Capture & Classify', 256, 294);
  }

  // -------------------------------------------------------------
  // APP 6: DIAGNOSTIC TERMINAL
  // -------------------------------------------------------------
  else if (app === 'terminal') {
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(25, 48, 462, 198, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`[ROOT@${project.mcu.name.split(' ')[0]} ~]# uname -a`, 35, 70);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`FreeRTOS Kernel v10.4.3 / Dual-Core LX7 @ ${project.mcu.clockSpeedMhz}MHz`, 35, 90);
    ctx.fillText(`Free Heap: ${Math.round(state.freeHeapBytes / 1024)} KB | Uptime: ${state.uptimeSeconds}s`, 35, 110);
    ctx.fillText(`Relays: CH1=${state.relays.ch1 ? 'ON' : 'OFF'} | CH2=${state.relays.ch2 ? 'ON' : 'OFF'}`, 35, 130);
    ctx.fillText(`Sensors: Temp=${state.sensorReadings.temperatureC}°C, Humidity=${state.sensorReadings.humidityPercent}%`, 35, 150);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('> Click buttons below to send commands to virtual UART:', 35, 180);

    // Command Buttons
    const cmdButtons = [
      { label: 'AT', x: 25 },
      { label: 'STATUS', x: 145 },
      { label: 'RELAY1', x: 265 },
      { label: 'REBOOT', x: 385 }
    ];
    cmdButtons.forEach((b) => {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(b.x, 260, 105, 42, 8);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + 52, 286);
    });
  }

  // -------------------------------------------------------------
  // GLOBAL BOTTOM NAVIGATION BAR (Y: 340 to 384)
  // -------------------------------------------------------------
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 340, w, 44);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 340);
  ctx.lineTo(w, 340);
  ctx.stroke();

  const navItems: Array<{ id: DisplayApp; label: string; icon: string; x: number }> = [
    { id: 'launcher', label: 'Home', icon: '🏠', x: 50 },
    { id: 'phone', label: 'Phone', icon: '📞', x: 135 },
    { id: 'matrix', label: 'Lights', icon: '💡', x: 220 },
    { id: 'sensor', label: 'Sensors', icon: '🌡️', x: 305 },
    { id: 'vision', label: 'Vision', icon: '📷', x: 390 },
    { id: 'terminal', label: 'Shell', icon: '⚡', x: 470 }
  ];

  navItems.forEach((item) => {
    const isAct = app === item.id;
    ctx.font = isAct ? '16px sans-serif' : '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, item.x, 360);

    ctx.font = isAct ? 'bold 9px sans-serif' : '9px sans-serif';
    ctx.fillStyle = isAct ? '#38bdf8' : '#64748b';
    ctx.fillText(item.label, item.x, 374);
  });
}
