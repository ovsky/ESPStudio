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
  // 4. DEFAULT ESP32 / ARDUINO GIGA / PICO BOARDS
  // -------------------------------------------------------------
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
 * Returns physical panel dimensions for any catalog display module.
 * Shared by the 3D builder and the enclosure faceplate cut-out generator.
 */
export function getDisplayDimensions(comp: ComponentModule): {
  width: number;
  length: number;
  height: number;
} {
  const is7in = comp.typeId.includes('7in');
  const isOled = comp.typeId.includes('oled');
  return {
    width: is7in ? 9.5 : isOled ? 3.0 : 5.8,
    length: is7in ? 6.2 : isOled ? 3.2 : 8.6,
    height: 0.35
  };
}

/**
 * Creates 3D model of Display Module:
 * - Ultra-thin TFT / IPS glass panel with active UI texture
 * - Metallic bezel, polished glass reflection layer and cyan frame glow
 * - Flexible FPC ribbon cable tail
 * - Interactive touchscreen raycast surface
 */
export function createDisplayMesh(
  comp: ComponentModule,
  dynamicTexture?: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();
  group.name = `DISPLAY_${comp.id}`;

  const { width, length, height } = getDisplayDimensions(comp);

  // 1. Back Bezel Housing
  const bezelGeo = new THREE.BoxGeometry(width, height, length);
  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f1115,
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  bezelMesh.castShadow = true;
  group.add(bezelMesh);

  // 2. Active Screen Glass Surface (Interactive Touch Target)
  const screenGeo = new THREE.PlaneGeometry(width * 0.9, length * 0.88);
  const screenTexture = dynamicTexture || createDisplayScreenTexture(comp.name);
  const screenMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.0,
    emissive: 0xffffff,
    emissiveIntensity: 1.15,
    map: screenTexture,
    emissiveMap: screenTexture,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.6
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.name = 'TOUCH_DISPLAY_SCREEN';
  screenMesh.userData = { componentId: comp.id, isInteractiveScreen: true };
  screenMesh.rotation.x = -Math.PI / 2;
  screenMesh.position.set(0, height / 2 + 0.012, 0);
  group.add(screenMesh);

  // Polished cover glass with a faint reflective sheen in front of the pixels
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    envMapIntensity: 2.2
  });
  const coverGlass = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, length * 0.88), coverMat);
  coverGlass.rotation.x = -Math.PI / 2;
  coverGlass.position.set(0, height / 2 + 0.03, 0);
  coverGlass.renderOrder = 3;
  group.add(coverGlass);

  // Thin emissive accent outline around the active area
  const outlinePoints = [
    new THREE.Vector3(-width * 0.45, height / 2 + 0.025, -length * 0.44),
    new THREE.Vector3(width * 0.45, height / 2 + 0.025, -length * 0.44),
    new THREE.Vector3(width * 0.45, height / 2 + 0.025, length * 0.44),
    new THREE.Vector3(-width * 0.45, height / 2 + 0.025, length * 0.44)
  ];
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outline = new THREE.LineLoop(
    outlineGeo,
    new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(outline);

  // 3. FPC Ribbon Cable
  const fpcGeo = new THREE.BoxGeometry(1.4, 0.04, 1.8);
  const fpcMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Amber Polyimide Kapton FPC
    roughness: 0.3,
    metalness: 0.4
  });
  const fpcMesh = new THREE.Mesh(fpcGeo, fpcMat);
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

export interface EnclosureDisplayCutout {
  width: number;
  length: number;
  centerZ: number;
}

/**
 * Creates 3D Enclosure Shell with split Top Bezel & Bottom Chassis:
 * - ENCLOSURE_TOP: CNC faceplate with a real display cut-out window,
 *   chamfered optical bezel, camera punch-hole and speaker slit
 * - ENCLOSURE_BOTTOM: machined chassis tray with perimeter walls,
 *   port cut-outs and brass stand-off posts
 * Allows true mechanical exploded view animation where the faceplate
 * lifts toward the viewer and the chassis drops behind the board stack.
 */
export function createEnclosure3dMesh(
  enc: DeviceEnclosureSpecs,
  opacity: number = 0.85,
  cutout?: EnclosureDisplayCutout
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ENCLOSURE_SHELL';

  const width = enc.widthMm / 10.0;
  const length = enc.heightMm / 10.0;
  const depth = enc.depthMm / 10.0;
  const wall = (enc.wallThicknessMm || 2.0) / 10.0;

  // Material properties
  let roughness = 0.24;
  let metalness = 0.9;

  if (enc.material === '3D-Printed PETG') {
    roughness = 0.55;
    metalness = 0.05;
  } else if (enc.material === 'CNC Polycarbonate') {
    roughness = 0.12;
    metalness = 0.08;
  }

  const caseMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(enc.colorHex),
    roughness,
    metalness,
    transparent: opacity < 0.999,
    opacity,
    clearcoat: enc.material === 'CNC Polycarbonate' ? 1.0 : 0.72,
    clearcoatRoughness: enc.material === 'CNC Polycarbonate' ? 0.04 : 0.16,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
    depthWrite: opacity > 0.92
  });
  caseMat.userData.isShellMaterial = true;

  // ==========================================
  // 1. TOP FACEPLATE / OPTICAL BEZEL (ENCLOSURE_TOP)
  // ==========================================
  const topGroup = new THREE.Group();
  topGroup.name = 'ENCLOSURE_TOP';
  topGroup.position.set(0, depth / 2 - wall / 2, 0);

  const topThickness = Math.max(wall * 1.2, 0.16);
  const halfW = width / 2;
  const halfL = length / 2;

  // Build the faceplate as a real extruded solid with a display window hole.
  const faceShape = new THREE.Shape();
  faceShape.moveTo(-halfW + 0.02, -halfL + 0.02);
  faceShape.lineTo(halfW - 0.02, -halfL + 0.02);
  faceShape.lineTo(halfW - 0.02, halfL - 0.02);
  faceShape.lineTo(-halfW + 0.02, halfL - 0.02);
  faceShape.closePath();

  if (cutout) {
    const margin = wall * 1.6;
    const cutW = Math.min(cutout.width, width - margin * 2);
    const cutL = Math.min(cutout.length, length - margin * 2);
    const cutZ = Math.min(
      halfL - cutL / 2 - margin,
      Math.max(-halfL + cutL / 2 + margin, cutout.centerZ)
    );
    const hole = new THREE.Path();
    hole.moveTo(-cutW / 2, cutZ - cutL / 2);
    hole.lineTo(-cutW / 2, cutZ + cutL / 2);
    hole.lineTo(cutW / 2, cutZ + cutL / 2);
    hole.lineTo(cutW / 2, cutZ - cutL / 2);
    hole.closePath();
    faceShape.holes.push(hole);

    // Recessed black gasket just below the cut glass
    const gasket = new THREE.Mesh(
      new THREE.BoxGeometry(cutW + 0.12, 0.035, cutL + 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x030407,
        roughness: 0.8,
        metalness: 0.1
      })
    );
    gasket.position.set(0, -topThickness / 2 + 0.01, cutZ);
    topGroup.add(gasket);
  }

  const faceGeo = new THREE.ExtrudeGeometry(faceShape, {
    depth: topThickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 4
  });
  faceGeo.rotateX(Math.PI / 2);
  const facePlate = new THREE.Mesh(faceGeo, caseMat);
  facePlate.position.y = topThickness / 2;
  facePlate.castShadow = true;
  facePlate.receiveShadow = true;
  topGroup.add(facePlate);

  // Speaker slit + camera punch-hole above the display
  if (cutout) {
    const speaker = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.035, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x020305, roughness: 0.55, metalness: 0.4 })
    );
    speaker.position.set(0, topThickness / 2 + 0.015, -halfL + wall * 2.2);
    topGroup.add(speaker);

    const cameraRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.025, 10, 28),
      silverMetalMat
    );
    cameraRing.rotation.x = Math.PI / 2;
    cameraRing.position.set(0, topThickness / 2 + 0.018, -halfL + wall * 3.35);
    topGroup.add(cameraRing);

    const cameraLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.035, 20),
      new THREE.MeshPhysicalMaterial({
        color: 0x020617,
        metalness: 0.4,
        roughness: 0.08,
        clearcoat: 1
      })
    );
    cameraLens.position.set(0, topThickness / 2 + 0.015, -halfL + wall * 3.35);
    topGroup.add(cameraLens);
  }

  // 4 Corner Screws on Top Bezel (M2.5 Torx / Allen)
  [
    [-width / 2 + wall + 0.3, -length / 2 + wall + 0.3],
    [width / 2 - wall - 0.3, -length / 2 + wall + 0.3],
    [-width / 2 + wall + 0.3, length / 2 - wall - 0.3],
    [width / 2 - wall - 0.3, length / 2 - wall - 0.3]
  ].forEach(([x, z]) => {
    const screwCapGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16);
    const screwCap = new THREE.Mesh(screwCapGeo, silverMetalMat);
    screwCap.position.set(x, topThickness / 2 + 0.09, z);
    topGroup.add(screwCap);

    // Dark torx hex socket indent
    const socketGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 6);
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const socket = new THREE.Mesh(socketGeo, socketMat);
    socket.position.set(x, topThickness / 2 + 0.13, z);
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
  const standoffHeight = depth * 0.66;
  const standoffGeo = new THREE.CylinderGeometry(0.18, 0.18, standoffHeight, 16);
  const standoffMat = new THREE.MeshStandardMaterial({
    color: 0xca8a04, // Polished Brass Standoffs
    metalness: 0.92,
    roughness: 0.22
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

  // USB-C port cut-out / connector cage on the side wall
  const portBezelGeo = new THREE.BoxGeometry(wall * 1.15, 0.34, 0.82);
  const portBezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    roughness: 0.35,
    metalness: 0.75,
    clearcoat: 0.5
  });
  const portBezel = new THREE.Mesh(portBezelGeo, portBezelMat);
  portBezel.position.set(-width / 2 + wall / 2, 0.5, 0);
  bottomGroup.add(portBezel);

  const portCavity = new THREE.Mesh(
    new THREE.BoxGeometry(wall * 1.3, 0.18, 0.56),
    new THREE.MeshBasicMaterial({ color: 0x02040a })
  );
  portCavity.position.set(-width / 2 + wall * 0.52, 0.5, 0);
  bottomGroup.add(portCavity);

  // Side power / volume key on the opposite edge
  const powerKey = new THREE.Mesh(
    new THREE.BoxGeometry(wall * 0.7, 0.55, 0.14),
    silverMetalMat
  );
  powerKey.position.set(width / 2 - wall * 0.25, 0.34, -length * 0.18);
  bottomGroup.add(powerKey);

  // Subtle inner copper RF shield liner for the exploded view
  const liner = new THREE.Mesh(
    new THREE.BoxGeometry(width - wall * 2.4, 0.028, length - wall * 2.4),
    new THREE.MeshStandardMaterial({
      color: 0x7c4a16,
      metalness: 0.85,
      roughness: 0.34
    })
  );
  liner.position.set(0, wall * 0.62, 0);
  bottomGroup.add(liner);

  group.add(bottomGroup);

  return group;
}
