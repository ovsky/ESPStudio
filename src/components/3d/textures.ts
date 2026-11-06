import * as THREE from 'three';

/**
 * Generates procedural high-resolution canvas textures for realistic electronics:
 * - PCB solder mask with copper trace routing & gold ENIG pads
 * - Laser-etched metallic IC / SoC shield cans (ESP32-S3, ESP32-P4 RISC-V)
 * - Active illuminated AMOLED / IPS UI display screens
 * - BlackBerry QWERTY keypad silkscreen lettering
 * - Lithium Polymer battery warning labels & ratings
 */

export function createPcbTexture(color: 'green' | 'black' | 'blue' = 'green'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base solder mask background
  ctx.fillStyle = color === 'green' ? '#0d4a22' : color === 'blue' ? '#0e2b4d' : '#141416';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle fiberglass weave texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let i = 0; i < 1024; i += 4) {
    ctx.fillRect(i, 0, 1, 1024);
    ctx.fillRect(0, i, 1024, 1);
  }

  // Copper traces routing lines
  ctx.strokeStyle = color === 'green' ? '#14632e' : color === 'blue' ? '#1a4170' : '#22252a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 40; i < 980; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 40);
    ctx.lineTo(i, 300);
    ctx.lineTo(i + 40, 340);
    ctx.lineTo(i + 40, 700);
    ctx.lineTo(i + 80, 740);
    ctx.lineTo(i + 80, 980);
    ctx.stroke();
  }

  // Gold ENIG vias & test points
  ctx.fillStyle = '#eab308';
  for (let x = 60; x < 960; x += 64) {
    for (let y = 60; y < 960; y += 64) {
      if ((x + y) % 128 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
      }
    }
  }

  // White silkscreen labels & designators
  ctx.fillStyle = 'rgba(240, 245, 255, 0.85)';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('ESP-FORGE CAD v1.0', 60, 80);
  ctx.fillText('FR-4 TG155 ROHS', 60, 110);
  ctx.font = '16px monospace';
  ctx.fillText('GND  3V3  SDA  SCL  TXD  RXD', 60, 960);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createEspChipShieldTexture(modelName: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Brushed aluminum metallic can background
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#c0c5ce');
  grad.addColorStop(0.5, '#e2e8f0');
  grad.addColorStop(1, '#a8b1be');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Brushed metal fine lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 512; i += 2) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Laser etched logo & text
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';

  // Espressif logo stylized
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('ESPRESSIF', 256, 140);

  ctx.font = 'bold 36px monospace';
  ctx.fillText(modelName, 256, 210);

  ctx.font = '22px monospace';
  ctx.fillText('FCC ID: 2AC7Z-ESP32', 256, 270);
  ctx.fillText('CE 240MHz WI-FI + BLE 5', 256, 310);
  ctx.fillText('RISC-V / XTENSA AI CORE', 256, 350);

  // QR Code / Data matrix placeholder box
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(206, 390, 100, 100);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(216, 400, 80, 80);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(226, 410, 60, 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDisplayScreenTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Modern cybernetic UI on dark glass
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, 512, 384);

  // Top status bar
  ctx.fillStyle = '#0b1324';
  ctx.fillRect(0, 0, 512, 40);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ESP-OS v2.4', 20, 26);

  ctx.fillStyle = '#4ade80';
  ctx.fillText('4G LTE  ● 98% BAT', 340, 26);

  // Main widget card
  ctx.fillStyle = '#090f1d';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(20, 60, 472, 190, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(title, 40, 105);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText('CPU: 240MHz Dual-Core', 40, 145);
  ctx.fillText('FPS: 60.0  RAM: 8MB PSRAM', 40, 175);
  ctx.fillText('Status: ALL SYSTEMS NOMINAL', 40, 205);

  // Bottom action buttons
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(30, 280, 130, 65, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('DIALER', 65, 320);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(190, 280, 130, 65, 8);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('TERMINAL', 215, 320);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(350, 280, 130, 65, 8);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('SETTINGS', 375, 320);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBatteryLabelTexture(capacityMah: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Silver / blue pouch cell wrap
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('LITHIUM-ION RECHARGEABLE CELL', 30, 60);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 42px monospace';
  ctx.fillText(`3.7V  ${capacityMah} mAh`, 30, 120);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText('Standard Charge: 0.5C | Max Pulse: 2.0C', 30, 160);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CAUTION: Do not puncture, incinerate or reverse polarity.', 30, 200);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural studio HDRI used for physically based reflections.
 * Painted as an equirectangular panorama: dark studio shell, cool ceiling
 * strip lights and two warm/cool softboxes that read beautifully on
 * anodized aluminium and glass.
 */
export function createStudioEnvironmentTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep studio gradient sky to floor
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#101a30');
  sky.addColorStop(0.42, '#070c18');
  sky.addColorStop(0.55, '#04070f');
  sky.addColorStop(1, '#010204');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);

  // Horizon glow
  const horizon = ctx.createLinearGradient(0, 210, 0, 330);
  horizon.addColorStop(0, 'rgba(34, 211, 238, 0)');
  horizon.addColorStop(0.5, 'rgba(34, 211, 238, 0.16)');
  horizon.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 200, 1024, 140);

  // Softbox 1 - huge cool key light
  const key = ctx.createRadialGradient(260, 150, 10, 260, 150, 190);
  key.addColorStop(0, 'rgba(235, 250, 255, 1)');
  key.addColorStop(0.25, 'rgba(186, 230, 253, 0.85)');
  key.addColorStop(0.65, 'rgba(56, 189, 248, 0.18)');
  key.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = key;
  ctx.fillRect(70, 0, 380, 340);

  // Softbox 2 - warm rim
  const rim = ctx.createRadialGradient(780, 170, 8, 780, 170, 170);
  rim.addColorStop(0, 'rgba(255, 246, 230, 0.95)');
  rim.addColorStop(0.35, 'rgba(251, 191, 36, 0.35)');
  rim.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = rim;
  ctx.fillRect(610, 0, 340, 340);

  // Thin overhead strip lights
  [
    { x: 380, w: 270, color: 'rgba(165, 243, 252, 0.9)' },
    { x: 700, w: 160, color: 'rgba(196, 181, 253, 0.65)' }
  ].forEach(({ x, w, color }) => {
    const grad = ctx.createLinearGradient(x, 20, x + w, 20);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 16, w, 10);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Dark reflective studio floor with cyan precision-CAD grid. */
export function createStudioFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Center light pool
  const pool = ctx.createRadialGradient(512, 512, 20, 512, 512, 540);
  pool.addColorStop(0, 'rgba(20, 58, 82, 0.55)');
  pool.addColorStop(0.35, 'rgba(8, 24, 42, 0.35)');
  pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, 1024, 1024);

  // Fine grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Major grid
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 256) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Concentric CAD measurement rings
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
  ctx.lineWidth = 2;
  [150, 300, 450].forEach((r) => {
    ctx.beginPath();
    ctx.arc(512, 512, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Crisp crosshair
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(512, 40);
  ctx.lineTo(512, 984);
  ctx.moveTo(40, 512);
  ctx.lineTo(984, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Soft radial alpha mask for a grounded contact shadow. */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export function createKeypadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 512, 320);

  // Draw 4 rows of 10 keys
  const keys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '←'],
    ['alt', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '$', '↵'],
    ['123', 'mic', 'sym', '       SPACE       ', 'aA', 'del']
  ];

  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';

  keys.forEach((row, rowIdx) => {
    const y = 30 + rowIdx * 70;
    const keyWidth = 512 / row.length;
    row.forEach((key, colIdx) => {
      const x = colIdx * keyWidth + keyWidth / 2;
      // Key cap border
      ctx.fillStyle = '#1f242d';
      ctx.beginPath();
      ctx.roundRect(colIdx * keyWidth + 4, y, keyWidth - 8, 54, 6);
      ctx.fill();

      // Key text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(key, x, y + 33);
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
