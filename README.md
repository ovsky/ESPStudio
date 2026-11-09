# ⚡ ESP-Forge Studio

> **Universal Web, PC & Android Hardware CAD Studio for ESP32-S3, ESP32-P4 & Custom IoT Devices**

[![Build CI](https://github.com/your-username/esp-forge-studio/actions/workflows/build.yml/badge.svg)](.github/workflows/build.yml)
[![Test CI](https://github.com/your-username/esp-forge-studio/actions/workflows/test.yml/badge.svg)](.github/workflows/test.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-cyan.svg)](package.json)
[![Platform](https://img.shields.io/badge/platforms-Web%20|%20Android%20|%20PC-emerald.svg)](capacitor.config.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

<p align="center">
  <img src="893144375_1854719729057608_7651302544980183340_n.png" alt="ESP-Forge Studio — generated render" width="800">
  <img src="894539969_1127057046901808_6314249589770141727_n.png" alt="ESP-Forge Studio — screenshot" width="800">
  <img src="Gemini_Generated_Image_zaqugmzaqugmzaqu.jpg" alt="ESP-Forge Studio — generated image" width="800">
</p>

---

## 🎯 Overview

**ESP-Forge Studio** is an interactive hardware CAD and electronic design automation (EDA) studio specifically built for Espressif microcontrollers including **ESP32-S3**, **ESP32-P4** (Dual RISC-V 400MHz with MIPI DSI/CSI & 2D GPU acceleration), **ESP32-C6** (Wi-Fi 6 + Zigbee/Thread/Matter), **ESP32-C3**, and classic ESP32.

Design complex modular devices like:
- 📱 **Modular ESP32 Cyberphone** (Touchscreen + QWERTY BB keyboard + 4G LTE SIM7600 + I2S voice calling + AXP2101 PMIC)
- 💡 **Smart Home Matrix & Light Controller** (ESP32-C6 Matter/Zigbee hub + 64-LED WS2812B matrix + rotary dimmer + dual mains relays)
- 👁️ **ESP32-P4 Vision & AI Terminal** (Dual RISC-V 400MHz + 7.0" MIPI DSI 60FPS touchscreen + OV5640 MIPI CSI camera + Ethernet)
- 📻 **Off-Grid LoRa Communicator** (ESP32-S3 + SX1262 LoRa + E-Paper display + GPS)
- 🛠️ **Custom Blank Canvas** (Select any MCU, drop peripheral modules, route wiring harnesses, and compute power budgets)

---

## 📋 Feature Matrix (Required vs Done)

| Feature | Category | Status | Details |
| :--- | :--- | :---: | :--- |
| **ESP32-S3 Dual LX7 Support** | Hardware SoC | ✅ DONE | Vector AI acceleration, USB OTG, Octal SPI PSRAM, full pinout |
| **ESP32-P4 Dual RISC-V Support** | Hardware SoC | ✅ DONE | 400MHz dual RISC-V, MIPI DSI/CSI lanes, 2D GPU, Ethernet MAC |
| **ESP32-C6 Matter/Thread Support**| Hardware SoC | ✅ DONE | 802.15.4 radio, Zigbee 3.0, Wi-Fi 6, low-power RISC-V |
| **Interactive Wiring Canvas** | Schematic / CAD | ✅ DONE | Click-to-connect pins, color-coded protocol nets (I2C, SPI, UART, I2S, MIPI, Power) |
| **Live Pin Conflict Detection** | Rules Engine | ✅ DONE | GPIO contention, strapping pin warnings, 5V/3.3V overvoltage hazard checks |
| **Power Budget & Battery Life Calc**| Engineering | ✅ DONE | Computes active/sleep current, duty cycle, battery life (hrs/days), wire voltage drop |
| **Firmware Code Generator** | Code Engine | ✅ DONE | Generates ready-to-flash Arduino C++, ESP-IDF C, PlatformIO `.ini`, and MicroPython |
| **Bill of Materials (BOM) Exporter**| Production | ✅ DONE | Designators, cost breakdown, CSV export, JSON export |
| **3D / Enclosure View** | Mechanical CAD | ✅ DONE | Isometric & 3D realistic enclosure preview with thickness, material & standoff dimensions |
| **Modular Device Presets** | Templates | ✅ DONE | Cyberphone, Vision Terminal, Smart Light Controller, LoRa Communicator |
| **Multi-Platform Web Support** | Deployment | ✅ DONE | Responsive Vite SPA with PWA manifest and offline support |
| **Android APK Build Pipeline** | Mobile | ✅ DONE | Capacitor configuration, Gradle build workflow, responsive mobile UI |
| **PC / Desktop Shell** | Desktop | ✅ DONE | Cross-platform build target (Linux, macOS, Windows) |
| **CI/CD Build Pipeline** | DevOps | ✅ DONE | Multi-platform `.github/workflows/build.yml` for Web, Android & PC |
| **CI/CD Automated Test Pipeline**| Quality / QA | ✅ DONE | Fast Node.js unit tests and type checks in `.github/workflows/test.yml` |

---

## 🌿 Git Branching Strategy & GitHub Setup

This repository uses a structured Git Flow model:

```text
main (v1.0.0 Release)
  │
  ├── develop (Integration branch)
  │     ├── feature/esp32-p4-support
  │     ├── feature/wire-routing-engine
  │     ├── feature/firmware-codegen
  │     └── feature/android-mobile-shell
  │
  └── release/v1.0.0
```

### Git Branches Defined in Repository:
1. **`main`**: Production-ready, thoroughly verified code.
2. **`develop`**: Integration branch for ongoing development.
3. **`feature/esp32-p4-support`**: Core definitions, pins, and MIPI bus mappings for the ESP32-P4 RISC-V chip.
4. **`feature/wire-routing-engine`**: Canvas wire drawing, Bezier harness routing, and live pin conflict validator.
5. **`feature/firmware-codegen`**: Code generation engines for Arduino, ESP-IDF, PlatformIO, and MicroPython.
6. **`feature/android-mobile-shell`**: Capacitor Android configuration, touch optimization, and PWA manifest.
7. **`release/v1.0.0`**: Tagged release candidate ready for deployment.

### How to Push to Your GitHub Account:
```bash
# 1. Add your GitHub remote repository
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/esp-forge-studio.git

# 2. Push all branches to GitHub
git push -u origin --all

# 3. Push all tags
git push -u origin --tags
```

---

## 🚀 Running the App Locally

### Prerequisites:
- Node.js >= 20.0.0 (Node 22 recommended)
- npm >= 10.0.0

### Quick Start:
```bash
# Install dependencies
npm install

# Run the unit test suite
npm test

# Launch the interactive development studio
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Building for Android & PC

### 1. Web & Progressive Web App (PWA)
```bash
npm run build
# Distributable static files generated in ./dist
```

### 2. Android APK (via Capacitor)
```bash
# Build web assets
npm run build

# Add and sync Android project
npx @capacitor/cli add android
npx @capacitor/cli sync android

# Open in Android Studio or compile with Gradle
npx @capacitor/cli open android
# OR build directly:
cd android && ./gradlew assembleRelease
```
The APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`.

### 3. PC Desktop (Electron / Tauri / Native Shell)
The build output in `/dist` can be packaged with Electron or Tauri:
```bash
# With Electron or Tauri wrapper:
npm run build
npx @capacitor/cli copy
```

---

## 🔄 CI/CD Pipelines

This repository contains two dedicated GitHub Actions workflows:

1. **`.github/workflows/build.yml`**:
   - Compiles TypeScript and builds the Web SPA/PWA.
   - Syncs and packages the Android APK via Capacitor and Gradle.
   - Generates and uploads cross-platform artifacts for Web, Android, and Desktop.

2. **`.github/workflows/test.yml`**:
   - Runs static type checks (`npm run lint`).
   - Executes fast-feedback unit tests (`npm test` / `tsx --test src/core/*.test.ts`).
   - Verifies electrical design rules, strapping pins, and power calculators.

---

## 🛡️ License

Licensed under the Apache License, Version 2.0. See LICENSE for details.
