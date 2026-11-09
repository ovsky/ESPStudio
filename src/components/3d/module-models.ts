import * as THREE from 'three';
import {
  McuBoardSpec,
  ComponentModule,
  WireConnection,
  DeviceEnclosureSpecs
} from '../../types/hardware';
import {
  createPcbTexture,
  createEspChipShieldTexture,
  createDisplayScreenTexture,
  createBatteryLabelTexture,
  createKeypadTexture
} from './textures';

// Shared material cache to optimize memory and draw calls
const pcbGreenMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.35,
  metalness: 0.1,
  map: createPcbTexture('green')
});

const pcbBlackMat = new THREE.MeshStandardMaterial({
  color: 0x111317,
  roughness: 0.4,
  metalness: 0.15,
  map: createPcbTexture('black')
});

const pcbBlueMat = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  roughness: 0.35,
  metalness: 0.1,
  map: createPcbTexture('blue')
});

const goldPinMat = new THREE.MeshStandardMaterial({
  color: 0xfacc15,
  metalness: 0.9,
  roughness: 0.2
});

const blackPlasticMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.6,
  metalness: 0.1
});

const silverMetalMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  metalness: 0.95,
  roughness: 0.2
});

/**
 * Creates 3D model of ESP32-S3 or ESP32-P4 Dev Board with:
 * 1. FR4 PCB substrate
 * 2. Metal RF shield can with laser etched logo
 * 3. Dual 2.54mm header pin strips with gold pins & black nylon headers
 * 4. Dual USB-C metallic receptacle ports
 * 5. Tactile micro-switches (BOOT & RST) with brass domes
 * 6. Addressable RGB status LED with emissive glow
 */
export function createMcuBoardMesh(mcu: McuBoardSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = `MCU_${mcu.family}`;

  const family = mcu.family;
  const isArduinoUno = family === 'Arduino-Uno-R4';
  const isArduinoGiga = family === 'Arduino-Giga-R1';
  const isRadxaZero = family === 'Radxa-Zero-3W';
  const isRadxaRock = family === 'Radxa-Rock-5B';
  const isPico = family === 'Raspberry-Pi-Pico-2';
  const isP4 = family === 'ESP32-P4';
  const isRpi5 = family === 'Raspberry-Pi-5';
  const isTeensy = family === 'Teensy-4.1';
  const isHeltec = family === 'Heltec-WiFi-LoRa32-V3';

  const thickness = 0.16; // 1.6mm standard PCB

  // -------------------------------------------------------------
  // 1. ARDUINO UNO R4 WIFI 3D MODEL
  // -------------------------------------------------------------
  if (isArduinoUno) {
    const width = 5.34;
    const length = 6.86;

    // Uno Italian Teal PCB
    const unoPcbMat = new THREE.MeshStandardMaterial({
      color: 0x00878a,
      roughness: 0.35,
      metalness: 0.12,
      map: createPcbTexture('blue')
    });
    const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), unoPcbMat);
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    group.add(pcbMesh);

    // 12x8 LED Matrix Panel on Uno R4
    const matrixWidth = 2.4;
    const matrixLength = 1.6;
    const matrixHeight = 0.18;
    const matrixBase = new THREE.Mesh(
      new THREE.BoxGeometry(matrixWidth, matrixHeight, matrixLength),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 })
    );
    matrixBase.position.set(-0.2, thickness / 2 + matrixHeight / 2, -0.6);
    group.add(matrixBase);

    // Individual glowing red LEDs in matrix (12 cols x 8 rows)
    const ledDotGeo = new THREE.BoxGeometry(0.1, 0.04, 0.1);
    const ledDotMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const dot = new THREE.Mesh(ledDotGeo, ledDotMat);
        dot.position.set(
          -matrixWidth / 2 + 0.25 + c * 0.38,
          thickness / 2 + matrixHeight + 0.02,
          -0.6 - matrixLength / 2 + 0.25 + r * 0.38
        );
        group.add(dot);
      }
    }

    // DC Power Barrel Jack (Bottom-left)
    const barrelJack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16),
      blackPlasticMat
    );
    barrelJack.rotation.x = Math.PI / 2;
    barrelJack.position.set(-width / 2 + 0.7, thickness / 2 + 0.45, length / 2 - 0.7);
    group.add(barrelJack);

    // USB-C Receptacle (Top-left)
    const usbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.7), silverMetalMat);
    usbMesh.position.set(-width / 2 + 0.7, thickness / 2 + 0.16, -length / 2 + 0.35);
    group.add(usbMesh);

    // Renesas RA4M1 QFP IC Chip
    const mcuChip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.18, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.1 })
    );
    mcuChip.position.set(0.6, thickness / 2 + 0.09, 0.8);
    group.add(mcuChip);

    // ESP32-S3 Mini Wi-Fi Shield Can
    const wifiShield = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.22, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.9,
        roughness: 0.25,
        map: createEspChipShieldTexture('ESP32-S3 CO-CPU')
      })
    );
    wifiShield.position.set(0.6, thickness / 2 + 0.11, -1.2);
    group.add(wifiShield);

    // Female Black Pin Headers (Digital 10-pin & 8-pin, Power 8-pin, Analog 6-pin)
    [-width / 2 + 0.25, width / 2 - 0.25].forEach((xPos) => {
      const headerStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.75, length - 1.2),
        blackPlasticMat
      );
      headerStrip.position.set(xPos, thickness / 2 + 0.375, 0.2);
      group.add(headerStrip);
    });

    return group;
  }

  // -------------------------------------------------------------
  // 2. RADXA ZERO 3W (SBC) 3D MODEL
  // -------------------------------------------------------------
  if (isRadxaZero) {
    const width = 3.0;
    const length = 6.5;

    // Radxa Dark PCB
    const radxaPcb = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), pcbBlackMat);
    radxaPcb.castShadow = true;
    radxaPcb.receiveShadow = true;
    group.add(radxaPcb);

    // Rockchip RK3566 Bare-Die Flip Chip with Silicon Mirror Top
    const rkChip = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.16, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.15
      })
    );
    rkChip.position.set(0, thickness / 2 + 0.08, -0.4);
    group.add(rkChip);

    // Dual USB-C Receptacles on side
    [-0.8, 0.8].forEach((zPos) => {
      const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.65), silverMetalMat);
      usbPort.position.set(-width / 2 + 0.2, thickness / 2 + 0.14, zPos);
      group.add(usbPort);
    });

    // Micro-HDMI Receptacle
    const hdmiPort = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.65), goldPinMat);
    hdmiPort.position.set(width / 2 - 0.2, thickness / 2 + 0.125, -1.8);
    group.add(hdmiPort);

    // 40-Pin Raspberry Pi Header (2x20 Dual Row)
    const gpioBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 5.0), blackPlasticMat);
    gpioBase.position.set(width / 2 - 0.32, thickness / 2 + 0.175, 0.4);
    group.add(gpioBase);

    // 40 Gold Pins
    for (let p = 0; p < 20; p++) {
      [-0.12, 0.12].forEach((xOff) => {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), goldPinMat);
        pin.position.set(width / 2 - 0.32 + xOff, thickness / 2 + 0.4, -2.0 + p * 0.25);
        group.add(pin);
      });
    }

    return group;
  }

  // -------------------------------------------------------------
  // 3. RADXA ROCK 5B (EDGE AI SBC) 3D MODEL
  // -------------------------------------------------------------
  if (isRadxaRock) {
    const width = 5.6;
    const length = 8.5;

    // Deep Blue/Black SBC PCB
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), pcbBlueMat);
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    group.add(pcb);

    // Rockchip RK3588 with Aluminum Heat Spreader & NPU Branding
    const rk3588 = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.28, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
    );
    rk3588.position.set(-0.4, thickness / 2 + 0.14, -0.6);
    group.add(rk3588);

    // RJ45 Gigabit Ethernet Jack
    const ethJack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.9), silverMetalMat);
    ethJack.position.set(-width / 2 + 1.0, thickness / 2 + 0.65, length / 2 - 0.9);
    group.add(ethJack);

    // Dual Stacked USB 3.0 Ports
    const usbStack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 }));
    usbStack.position.set(width / 2 - 0.9, thickness / 2 + 0.6, length / 2 - 0.8);
    group.add(usbStack);

    // 40-Pin Color Coded Header
    const gpioBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 5.0), blackPlasticMat);
    gpioBase.position.set(-width / 2 + 0.35, thickness / 2 + 0.175, 0);
    group.add(gpioBase);

    return group;
  }

  // -------------------------------------------------------------
  // 3b. RASPBERRY PI 5 (8GB SBC) 3D MODEL
  // -------------------------------------------------------------
  if (isRpi5) {
    const width = 5.6;
    const length = 8.5;

    // Classic Raspberry Green PCB
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), pcbGreenMat);
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    group.add(pcb);

    // BCM2712 Quad-Core Cortex-A76 with Metallic Silver Heat Spreader
    const cpuMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.22, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
    );
    cpuMesh.position.set(-0.3, thickness / 2 + 0.11, -0.8);
    group.add(cpuMesh);

    // RP1 Southbridge I/O Controller
    const rp1Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.14, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.2 })
    );
    rp1Mesh.position.set(0.6, thickness / 2 + 0.07, 1.2);
    group.add(rp1Mesh);

    // RJ45 Gigabit Ethernet Jack (Metal Shielded)
    const ethJack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 2.0), silverMetalMat);
    ethJack.position.set(width / 2 - 1.1, thickness / 2 + 0.675, length / 2 - 0.9);
    group.add(ethJack);

    // Dual Stacked USB 3.0 (Blue) & Dual USB 2.0 (Black)
    const usb3 = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.3, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.75, roughness: 0.3 })
    );
    usb3.position.set(-width / 2 + 1.1, thickness / 2 + 0.65, length / 2 - 0.7);
    group.add(usb3);

    // Dual Micro-HDMI Ports
    [-0.5, 0.6].forEach((zPos) => {
      const hdmi = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.55), goldPinMat);
      hdmi.position.set(-width / 2 + 0.25, thickness / 2 + 0.14, zPos);
      group.add(hdmi);
    });

    // 40-Pin Raspberry Pi Header
    const gpioBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 5.0), blackPlasticMat);
    gpioBase.position.set(width / 2 - 0.38, thickness / 2 + 0.175, -1.0);
    group.add(gpioBase);

    for (let p = 0; p < 20; p++) {
      [-0.12, 0.12].forEach((xOff) => {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), goldPinMat);
        pin.position.set(width / 2 - 0.38 + xOff, thickness / 2 + 0.4, -3.2 + p * 0.25);
        group.add(pin);
      });
    }

    return group;
  }

  // -------------------------------------------------------------
  // 3c. TEENSY 4.1 3D MODEL
  // -------------------------------------------------------------
  if (isTeensy) {
    const width = 1.8;
    const length = 6.2;

    // Slim Matte Black DIP PCB
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), pcbBlackMat);
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    group.add(pcb);

    // NXP i.MX RT1062 ARM Cortex-M7 BGA Chip (Laser Etched)
    const nxpChip = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.16, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.3, roughness: 0.35 })
    );
    nxpChip.position.set(0, thickness / 2 + 0.08, -0.8);
    group.add(nxpChip);

    // MicroSD Card Socket at Bottom Tail
    const sdSocket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.4), silverMetalMat);
    sdSocket.position.set(0, thickness / 2 + 0.09, length / 2 - 0.8);
    group.add(sdSocket);

    // Micro-USB / USB-C Port at Top Head
    const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), silverMetalMat);
    usbPort.position.set(0, thickness / 2 + 0.15, -length / 2 + 0.3);
    group.add(usbPort);

    // Dual 24-pin Header Strips
    [-width / 2 + 0.12, width / 2 - 0.12].forEach((xPos) => {
      const headerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, length - 0.8), blackPlasticMat);
      headerStrip.position.set(xPos, thickness / 2 + 0.11, 0);
      group.add(headerStrip);

      for (let i = 0; i < 24; i++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), goldPinMat);
        pin.position.set(xPos, thickness / 2 + 0.35, -length / 2 + 0.6 + i * 0.215);
        group.add(pin);
      }
    });

    return group;
  }

  // -------------------------------------------------------------
  // 3d. HELTEC WIFI LORA 32 (V3) 3D MODEL
  // -------------------------------------------------------------
  if (isHeltec) {
    const width = 2.8;
    const length = 5.8;

    // Matte Black IoT PCB
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), pcbBlackMat);
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    group.add(pcb);

    // SX1262 LoRa Metallic Shield Can
    const loraShield = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.24, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.9,
        roughness: 0.2,
        map: createEspChipShieldTexture('SX1262 LoRa')
      })
    );
    loraShield.position.set(0, thickness / 2 + 0.12, 0.8);
    group.add(loraShield);

    // Onboard 0.96" Monochrome White/Cyan OLED Display
    const oledFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.4), blackPlasticMat);
    oledFrame.position.set(0, thickness / 2 + 0.09, -1.0);
    group.add(oledFrame);

    const oledGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.0),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8
      })
    );
    oledGlass.rotation.x = -Math.PI / 2;
    oledGlass.position.set(0, thickness / 2 + 0.19, -1.0);
    group.add(oledGlass);

    // Gold IPEX LoRa Antenna Connector
    const ipex = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), goldPinMat);
    ipex.position.set(width / 2 - 0.35, thickness / 2 + 0.08, length / 2 - 0.4);
    group.add(ipex);

    // USB-C Connector at Top
    const usbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.65), silverMetalMat);
    usbMesh.position.set(0, thickness / 2 + 0.15, -length / 2 + 0.3);
    group.add(usbMesh);

    // Dual 18-Pin Headers
    [-width / 2 + 0.16, width / 2 - 0.16].forEach((xPos) => {
      const headerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, length - 0.6), blackPlasticMat);
      headerStrip.position.set(xPos, thickness / 2 + 0.11, 0);
      group.add(headerStrip);

      for (let i = 0; i < 18; i++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), goldPinMat);
        pin.position.set(xPos, thickness / 2 + 0.375, -length / 2 + 0.5 + i * 0.28);
        group.add(pin);
      }
    });

    return group;
  }
  const width = isP4 ? 4.2 : isPico ? 2.1 : isArduinoGiga ? 5.3 : 2.8;
  const length = isP4 ? 6.8 : isPico ? 5.1 : isArduinoGiga ? 10.2 : 5.8;

  // 1. PCB Substrate
  const pcbGeo = new THREE.BoxGeometry(width, thickness, length);
  const pcbMesh = new THREE.Mesh(pcbGeo, isP4 || isArduinoGiga ? pcbBlueMat : isPico ? pcbGreenMat : pcbBlackMat);
  pcbMesh.castShadow = true;
  pcbMesh.receiveShadow = true;
  group.add(pcbMesh);

  // 2. Metal SoC RF Shield Can
  const shieldWidth = isP4 ? 2.6 : 1.8;
  const shieldLength = isP4 ? 2.6 : 2.2;
  const shieldHeight = 0.28;
  const shieldGeo = new THREE.BoxGeometry(shieldWidth, shieldHeight, shieldLength);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.92,
    roughness: 0.25,
    map: createEspChipShieldTexture(mcu.name.includes('P4') ? 'ESP32-P4 RISC-V' : mcu.name.includes('Pico') ? 'RP2350 CORTEX-M33' : 'ESP32-S3 WROOM')
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.set(0, thickness / 2 + shieldHeight / 2, -0.6);
  shieldMesh.castShadow = true;
  group.add(shieldMesh);

  // 3. Dual Pin Headers (Left & Right)
  const pinRows = isPico ? 20 : 20;
  const pinSpacing = length / (pinRows + 2);
  const pinHeight = 0.85;

  [-width / 2 + 0.18, width / 2 - 0.18].forEach((xPos) => {
    // Plastic header base strip
    const headerBaseGeo = new THREE.BoxGeometry(0.25, 0.25, length - 0.6);
    const headerBase = new THREE.Mesh(headerBaseGeo, blackPlasticMat);
    headerBase.position.set(xPos, thickness / 2 + 0.125, 0);
    group.add(headerBase);

    // Individual square gold pins
    for (let i = 0; i < pinRows; i++) {
      const zPos = -length / 2 + 0.5 + i * pinSpacing;
      const pinGeo = new THREE.BoxGeometry(0.06, pinHeight, 0.06);
      const pinMesh = new THREE.Mesh(pinGeo, goldPinMat);
      pinMesh.position.set(xPos, thickness / 2 + pinHeight / 2, zPos);
      group.add(pinMesh);
    }
  });

  // 4. USB-C Metallic Receptacle
  const usbGeo = new THREE.BoxGeometry(0.9, 0.32, 0.7);
  const usbMesh = new THREE.Mesh(usbGeo, silverMetalMat);
  usbMesh.position.set(0, thickness / 2 + 0.16, length / 2 - 0.1);
  group.add(usbMesh);

  // 5. Tactile Buttons (BOOT & RST)
  [-0.6, 0.6].forEach((xPos) => {
    const btnBaseGeo = new THREE.BoxGeometry(0.35, 0.18, 0.35);
    const btnBase = new THREE.Mesh(btnBaseGeo, blackPlasticMat);
    btnBase.position.set(xPos, thickness / 2 + 0.09, length / 2 - 0.8);
    group.add(btnBase);

    const btnCapGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16);
    const btnCap = new THREE.Mesh(btnCapGeo, silverMetalMat);
    btnCap.position.set(xPos, thickness / 2 + 0.22, length / 2 - 0.8);
    group.add(btnCap);
  });

  // 6. Onboard WS2812B RGB Status LED
  const ledGeo = new THREE.BoxGeometry(0.2, 0.08, 0.2);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.2
  });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.position.set(0, thickness / 2 + 0.04, 0.9);
  group.add(ledMesh);

  return group;
}

/**
 * Creates 3D model of Display Module:
 * - Ultra-thin TFT / IPS Glass panel with active UI texture
 * - Metallic bezel and aluminum backplate
 * - Flexible FPC ribbon cable tail
 * - Interactive touchscreen raycast surface
 */
export function createDisplayMesh(
  comp: ComponentModule,
  dynamicTexture?: THREE.Texture | null
): THREE.Group {
  const group = new THREE.Group();
  group.name = `DISPLAY_${comp.id}`;
  group.userData = { componentId: comp.id, componentName: comp.name, category: comp.category };

  const is7in = comp.typeId.includes('7in');
  const isOled = comp.typeId.includes('oled');
  // Clean, realistic phone display: width 5.0 (fits comfortably in 7.2 enclosure), length 4.1.
  // Active screen plane: width 4.4, length 3.3 -> EXACT 4:3 (1.333) aspect ratio matching 512x384 canvas texture!
  const width = is7in ? 8.8 : isOled ? 2.8 : 5.0;
  const length = is7in ? 6.8 : isOled ? 2.3 : 4.1;
  const height = 0.35;

  const screenActiveW = is7in ? 8.0 : isOled ? 2.4 : 4.4;
  const screenActiveL = is7in ? 6.0 : isOled ? 1.8 : 3.3; // 4.4 / 3.3 = 1.33333333 (exact 4:3!)

  // 1. Back Bezel Housing
  const bezelGeo = new THREE.BoxGeometry(width, height, length);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.9,
    roughness: 0.2
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  bezelMesh.userData = { componentId: comp.id };
  group.add(bezelMesh);

  // 1b. Polished Outer Screen Chamfer Trim (Metallic Phone Edge)
  const trimGeo = new THREE.BoxGeometry(width * 0.96, 0.04, length * 0.94);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    metalness: 0.95,
    roughness: 0.1
  });
  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.userData = { componentId: comp.id };
  trimMesh.position.set(0, height / 2 + 0.01, 0);
  group.add(trimMesh);

  // 2. Active Screen OLED Surface (Completely non-reflective, self-luminous and crisp at any angle)
  const tex = dynamicTexture || createDisplayScreenTexture(comp.name);
  if (tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  const screenGeo = new THREE.PlaneGeometry(screenActiveW, screenActiveL);
  // MeshBasicMaterial has ZERO specular or diffuse reflection from external lighting - always 100% visible
  const screenMat = new THREE.MeshBasicMaterial({
    map: tex,
    toneMapped: false
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.name = 'TOUCH_DISPLAY_SCREEN';
  screenMesh.userData = { componentId: comp.id, isInteractiveScreen: true };
  screenMesh.rotation.x = -Math.PI / 2;
  screenMesh.position.set(0, height / 2 + 0.035, 0);
  group.add(screenMesh);

  // 2c. Speaker ear-piece micro-grille slit at top bezel
  const speakerGeo = new THREE.BoxGeometry(width * 0.22, 0.02, 0.12);
  const speakerMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const speakerMesh = new THREE.Mesh(speakerGeo, speakerMat);
  speakerMesh.userData = { componentId: comp.id };
  speakerMesh.position.set(0, height / 2 + 0.036, -length * 0.46);
  group.add(speakerMesh);

  // 3. FPC Ribbon Cable
  const fpcGeo = new THREE.BoxGeometry(1.4, 0.04, 1.8);
  const fpcMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Amber Polyimide Kapton FPC
    roughness: 0.3,
    metalness: 0.4
  });
  const fpcMesh = new THREE.Mesh(fpcGeo, fpcMat);
  fpcMesh.userData = { componentId: comp.id };
  fpcMesh.position.set(0, -height / 2 - 0.02, length / 2 + 0.8);
  group.add(fpcMesh);

  return group;
}

/**
 * Creates 3D model of Physical QWERTY Keyboard:
 * - FR4 base substrate
 * - Sculpted tactile keycaps with silkscreen lettering
 * - Center optical navigation trackpad
 */
export function createKeyboardMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `KEYBOARD_${comp.id}`;

  const width = 5.6;
  const length = 3.6;
  const thickness = 0.22;

  // 1. Keyboard base frame
  const baseGeo = new THREE.BoxGeometry(width, thickness, length);
  const baseMesh = new THREE.Mesh(baseGeo, blackPlasticMat);
  group.add(baseMesh);

  // 2. Keypad Surface Plate with Printed Keys
  const keyplateGeo = new THREE.PlaneGeometry(width * 0.94, length * 0.92);
  const keyplateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.1,
    map: createKeypadTexture()
  });
  const keyplateMesh = new THREE.Mesh(keyplateGeo, keyplateMat);
  keyplateMesh.rotation.x = -Math.PI / 2;
  keyplateMesh.position.set(0, thickness / 2 + 0.01, 0);
  group.add(keyplateMesh);

  // 3. Center Optical Trackpad
  const trackpadGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 32);
  const trackpadMesh = new THREE.Mesh(trackpadGeo, silverMetalMat);
  trackpadMesh.position.set(0, thickness / 2 + 0.06, -length / 2 + 0.5);
  group.add(trackpadMesh);

  return group;
}

/**
 * Creates 3D model of 4G LTE SIM7600 Modem:
 * - PCB with high-current wide traces
 * - Nickel RF shielding can with SIMCOM engraving
 * - Micro-SIM card slot tray
 * - Gold IPEX u.FL antenna connector
 */
export function createModemMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `MODEM_${comp.id}`;

  const width = 3.8;
  const length = 4.2;
  const thickness = 0.16;

  // PCB Base
  const pcbGeo = new THREE.BoxGeometry(width, thickness, length);
  const pcb = new THREE.Mesh(pcbGeo, pcbBlueMat);
  group.add(pcb);

  // Nickel Shielding Can
  const shieldGeo = new THREE.BoxGeometry(2.8, 0.32, 2.8);
  const shield = new THREE.Mesh(shieldGeo, silverMetalMat);
  shield.position.set(0, thickness / 2 + 0.16, -0.3);
  group.add(shield);

  // Micro-SIM Card Slot
  const simSlotGeo = new THREE.BoxGeometry(1.6, 0.18, 1.4);
  const simSlot = new THREE.Mesh(simSlotGeo, silverMetalMat);
  simSlot.position.set(0, thickness / 2 + 0.09, length / 2 - 0.9);
  group.add(simSlot);

  // Gold IPEX u.FL Antenna Connector
  const ipexGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
  const ipex = new THREE.Mesh(ipexGeo, goldPinMat);
  ipex.position.set(width / 2 - 0.5, thickness / 2 + 0.08, -length / 2 + 0.5);
  group.add(ipex);

  return group;
}

/**
 * Creates 3D model of I2S Audio Amp & Dynamic Speaker:
 * - Compact PCB with MAX98357A IC
 * - Dynamic 28mm round speaker with brass coil & neodymium magnet
 */
export function createAudioMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `AUDIO_${comp.id}`;

  // PCB Board
  const pcbGeo = new THREE.BoxGeometry(2.0, 0.16, 2.0);
  const pcb = new THREE.Mesh(pcbGeo, pcbGreenMat);
  group.add(pcb);

  // Circular Speaker Frame
  const speakerRimGeo = new THREE.CylinderGeometry(1.4, 1.2, 0.5, 32);
  const speakerRim = new THREE.Mesh(speakerRimGeo, blackPlasticMat);
  speakerRim.position.set(0, 0.33, 0);
  group.add(speakerRim);

  // Inner Speaker Cone (Mylar diaphragm)
  const coneGeo = new THREE.CylinderGeometry(0.9, 0.2, 0.25, 32);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.2
  });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.set(0, 0.45, 0);
  group.add(coneMesh);

  // Center Brass Dust Cap
  const capGeo = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeo, goldPinMat);
  capMesh.position.set(0, 0.55, 0);
  group.add(capMesh);

  return group;
}

/**
 * Creates 3D model of Rechargeable LiPo Pouch Battery Cell:
 * - Metallic silver/blue sealed pouch cell with rounded corners
 * - Printed manufacturer specifications label
 * - Integrated BMS circuit board with red/black silicone output leads
 */
export function createBatteryMesh(capacityMah: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BATTERY_PACK';

  const width = 4.6;
  const length = 6.4;
  const thickness = 0.75;

  // Main Pouch Cell
  const pouchGeo = new THREE.BoxGeometry(width, thickness, length);
  const pouchMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.35,
    map: createBatteryLabelTexture(capacityMah)
  });
  const pouchMesh = new THREE.Mesh(pouchGeo, pouchMat);
  group.add(pouchMesh);

  // Protective BMS PCB at top
  const bmsGeo = new THREE.BoxGeometry(width, 0.14, 0.6);
  const bmsMesh = new THREE.Mesh(bmsGeo, pcbGreenMat);
  bmsMesh.position.set(0, 0, -length / 2 - 0.3);
  group.add(bmsMesh);

  // Red & Black Silicone Power Leads
  [-0.6, 0.6].forEach((xPos, i) => {
    const wireGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
    const wireMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xef4444 : 0x020617,
      roughness: 0.5
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.rotation.x = Math.PI / 2;
    wireMesh.position.set(xPos, 0, -length / 2 - 0.9);
    group.add(wireMesh);
  });

  return group;
}

/**
 * Creates 3D model of EC11 Rotary Encoder Knob:
 * - Cylindrical knurled aluminum knob
 * - Metal mounting threaded shaft & bracket
 */
export function createRotaryMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `ROTARY_${comp.id}`;

  // PCB Breakout
  const pcbGeo = new THREE.BoxGeometry(2.2, 0.16, 2.2);
  const pcb = new THREE.Mesh(pcbGeo, pcbBlueMat);
  group.add(pcb);

  // Knurled Aluminum Knob
  const knobGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.2, 32);
  const knobMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.2
  });
  const knobMesh = new THREE.Mesh(knobGeo, knobMat);
  knobMesh.position.set(0, 0.68, 0);
  group.add(knobMesh);

  // Pointer Notch line
  const notchGeo = new THREE.BoxGeometry(0.08, 0.9, 0.25);
  const notchMesh = new THREE.Mesh(notchGeo, silverMetalMat);
  notchMesh.position.set(0, 0.7, 0.8);
  group.add(notchMesh);

  return group;
}

/**
 * Creates 3D model of Dual 10A Mains Relays:
 * - Blue Songle sugar-cube relay housings
 * - High-voltage screw terminal blocks
 */
export function createRelayMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `RELAYS_${comp.id}`;

  const pcbGeo = new THREE.BoxGeometry(4.4, 0.16, 3.8);
  const pcb = new THREE.Mesh(pcbGeo, pcbBlueMat);
  group.add(pcb);

  // Two Blue Relay Blocks
  [-1.0, 1.0].forEach((xPos) => {
    const relayGeo = new THREE.BoxGeometry(1.6, 1.4, 1.8);
    const relayMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Songle Blue
      roughness: 0.35,
      metalness: 0.1
    });
    const relay = new THREE.Mesh(relayGeo, relayMat);
    relay.position.set(xPos, 0.78, -0.4);
    group.add(relay);
  });

  // Screw Terminals (Green Block)
  const termGeo = new THREE.BoxGeometry(3.6, 0.9, 0.8);
  const termMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Phoenix Green
    roughness: 0.5
  });
  const termMesh = new THREE.Mesh(termGeo, termMat);
  termMesh.position.set(0, 0.53, 1.3);
  group.add(termMesh);

  return group;
}

/**
 * Creates 3D model of Sensor Breakout (BME680 / IMU):
 * - Purple ENIG PCB
 * - Tiny metallic MEMS sensor package with acoustic/gas port
 */
export function createSensorMesh(comp: ComponentModule): THREE.Group {
  const group = new THREE.Group();
  group.name = `SENSOR_${comp.id}`;

  // Purple PCB
  const pcbGeo = new THREE.BoxGeometry(1.6, 0.16, 1.6);
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x7e22ce, // OSH Park / Adafruit Purple
    roughness: 0.35,
    metalness: 0.2
  });
  const pcb = new THREE.Mesh(pcbGeo, pcbMat);
  group.add(pcb);

  // MEMS Metal Package
  const memsGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
  const mems = new THREE.Mesh(memsGeo, silverMetalMat);
  mems.position.set(0, 0.155, 0);
  group.add(mems);

  return group;
}

/**
 * Creates 3D Insulated Hookup Wires as smooth Spline Tubes:
 * Real 3D physical wires curving between components with thickness and insulation
 */
export function create3dWireMesh(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  colorHex: string,
  gauge: string
): THREE.Mesh {
  // Compute realistic droop / harness sag curve
  const midPoint = new THREE.Vector3()
    .addVectors(startPos, endPos)
    .multiplyScalar(0.5);
  // Add natural downward catenary sag
  midPoint.y += 0.8 + Math.random() * 0.4;

  const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
  const radius = gauge === '22AWG' ? 0.08 : gauge === 'FPC-Ribbon' ? 0.12 : 0.05;
  const tubeGeo = new THREE.TubeGeometry(curve, 24, radius, 8, false);

  const wireMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.4,
    metalness: 0.1
  });

  const wireMesh = new THREE.Mesh(tubeGeo, wireMat);
  wireMesh.castShadow = true;
  return wireMesh;
}

/**
 * Creates 3D Enclosure Shell:
 * - Sleek mechanical casing with beveled walls
 * - USB-C, SIM card and power cutouts
 * - Standoff screw bosses
 */
/**
 * Creates 3D Enclosure Shell with split Top Bezel & Bottom Chassis:
 * - ENCLOSURE_TOP: CNC faceplate bezel with display cutout window, chamfered edge, and corner screw counter-bores
 * - ENCLOSURE_BOTTOM: Rigid chassis tray with bottom floor, side perimeter walls, USB cutouts, and brass standoff posts
 * Allows true mechanical exploded view animation where top bezel lifts off upward and chassis lowers downward.
 */
export function createEnclosure3dMesh(
  enc: DeviceEnclosureSpecs,
  opacity: number = 0.85
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ENCLOSURE_SHELL';

  const width = enc.widthMm / 10.0;
  const length = enc.heightMm / 10.0;
  const depth = enc.depthMm / 10.0;
  const wall = (enc.wallThicknessMm || 2.0) / 10.0;

  // Material properties
  let roughness = 0.3;
  let metalness = 0.85;

  if (enc.material === '3D-Printed PETG') {
    roughness = 0.6;
    metalness = 0.05;
  } else if (enc.material === 'CNC Polycarbonate') {
    roughness = 0.15;
    metalness = 0.1;
  }

  const caseMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(enc.colorHex),
    roughness,
    metalness,
    transmission: enc.material === 'CNC Polycarbonate' ? 0.75 : 0,
    transparent: opacity < 1.0,
    opacity,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15
  });

  // ==========================================
  // 1. TOP BEZEL / FACEPLATE (ENCLOSURE_TOP)
  // ==========================================
  const topGroup = new THREE.Group();
  topGroup.name = 'ENCLOSURE_TOP';
  topGroup.position.set(0, depth / 2 - wall / 2, 0);

  // Top Faceplate Outer Frame
  const topThickness = wall * 1.2;
  // Create outer border segments around display/keyboard
  const topBorderLeft = new THREE.Mesh(
    new THREE.BoxGeometry(wall * 1.4, topThickness, length),
    caseMat
  );
  topBorderLeft.position.set(-width / 2 + wall * 0.7, 0, 0);
  topBorderLeft.castShadow = true;
  topGroup.add(topBorderLeft);

  const topBorderRight = new THREE.Mesh(
    new THREE.BoxGeometry(wall * 1.4, topThickness, length),
    caseMat
  );
  topBorderRight.position.set(width / 2 - wall * 0.7, 0, 0);
  topBorderRight.castShadow = true;
  topGroup.add(topBorderRight);

  const topBorderTop = new THREE.Mesh(
    new THREE.BoxGeometry(width - wall * 2.8, topThickness, wall * 1.6),
    caseMat
  );
  topBorderTop.position.set(0, 0, -length / 2 + wall * 0.8);
  topBorderTop.castShadow = true;
  topGroup.add(topBorderTop);

  const topBorderBottom = new THREE.Mesh(
    new THREE.BoxGeometry(width - wall * 2.8, topThickness, wall * 1.6),
    caseMat
  );
  topBorderBottom.position.set(0, 0, length / 2 - wall * 0.8);
  topBorderBottom.castShadow = true;
  topGroup.add(topBorderBottom);

  // 4 Corner Screws on Top Bezel (M2.5 Torx / Allen)
  [
    [-width / 2 + wall + 0.3, -length / 2 + wall + 0.3],
    [width / 2 - wall - 0.3, -length / 2 + wall + 0.3],
    [-width / 2 + wall + 0.3, length / 2 - wall - 0.3],
    [width / 2 - wall - 0.3, length / 2 - wall - 0.3]
  ].forEach(([x, z]) => {
    const screwCapGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16);
    const screwCap = new THREE.Mesh(screwCapGeo, silverMetalMat);
    screwCap.position.set(x, topThickness / 2 + 0.02, z);
    topGroup.add(screwCap);

    // Dark torx hex socket indent
    const socketGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 6);
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const socket = new THREE.Mesh(socketGeo, socketMat);
    socket.position.set(x, topThickness / 2 + 0.06, z);
    topGroup.add(socket);
  });

  group.add(topGroup);

  // ==========================================
  // 2. BOTTOM CHASSIS TRAY (ENCLOSURE_BOTTOM)
  // ==========================================
  const bottomGroup = new THREE.Group();
  bottomGroup.name = 'ENCLOSURE_BOTTOM';
  bottomGroup.position.set(0, -depth / 2 + wall / 2, 0);

  // Base floor plate
  const bottomGeo = new THREE.BoxGeometry(width, wall, length);
  const bottom = new THREE.Mesh(bottomGeo, caseMat);
  bottom.receiveShadow = true;
  bottomGroup.add(bottom);

  // Left & Right perimeter walls
  [-width / 2 + wall / 2, width / 2 - wall / 2].forEach((xPos) => {
    const wallGeo = new THREE.BoxGeometry(wall, depth * 0.85, length);
    const wallMesh = new THREE.Mesh(wallGeo, caseMat);
    wallMesh.position.set(xPos, depth * 0.42, 0);
    wallMesh.castShadow = true;
    bottomGroup.add(wallMesh);
  });

  // Top & Bottom perimeter walls
  [-length / 2 + wall / 2, length / 2 - wall / 2].forEach((zPos) => {
    const wallGeo = new THREE.BoxGeometry(width - wall * 2, depth * 0.85, wall);
    const wallMesh = new THREE.Mesh(wallGeo, caseMat);
    wallMesh.position.set(0, depth * 0.42, zPos);
    wallMesh.castShadow = true;
    bottomGroup.add(wallMesh);
  });

  // 4 Corner Brass Standoff Posts inside bottom chassis
  const standoffHeight = depth * 0.7;
  const standoffGeo = new THREE.CylinderGeometry(0.18, 0.18, standoffHeight, 16);
  const standoffMat = new THREE.MeshStandardMaterial({
    color: 0xca8a04, // Polished Brass Standoffs
    metalness: 0.9,
    roughness: 0.25
  });

  [
    [-width / 2 + wall + 0.3, -length / 2 + wall + 0.3],
    [width / 2 - wall - 0.3, -length / 2 + wall + 0.3],
    [-width / 2 + wall + 0.3, length / 2 - wall - 0.3],
    [width / 2 - wall - 0.3, length / 2 - wall - 0.3]
  ].forEach(([x, z]) => {
    const post = new THREE.Mesh(standoffGeo, standoffMat);
    post.position.set(x, standoffHeight / 2 + wall / 2, z);
    bottomGroup.add(post);
  });

  // USB-C Cutout slot on side wall
  const portBezelGeo = new THREE.BoxGeometry(wall * 1.2, 0.38, 0.9);
  const portBezelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
  const portBezel = new THREE.Mesh(portBezelGeo, portBezelMat);
  portBezel.position.set(-width / 2 + wall / 2, 0.5, 0);
  bottomGroup.add(portBezel);

  group.add(bottomGroup);

  return group;
}
