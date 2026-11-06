import { McuBoardSpec, ComponentModule, DeviceProject, PinDefinition } from '../types/hardware';

// --- MCU Boards Catalog ---
export const MCU_BOARDS: McuBoardSpec[] = [
  {
    id: 'esp32-s3-devkitc',
    name: 'ESP32-S3 DevKitC-1',
    family: 'ESP32-S3',
    tagline: 'Dual Xtensa LX7 @ 240MHz + AI Vector Instructions + USB OTG',
    cpuArchitecture: 'Xtensa Dual-Core 32-bit LX7',
    clockSpeedMhz: 240,
    cores: 2,
    flashSizeMb: 16,
    psramSizeMb: 8,
    wireless: ['Wi-Fi 4 (802.11 b/g/n)', 'Bluetooth 5 (LE & Mesh)'],
    specialHardware: ['AI Vector Acceleration', 'USB OTG Full-Speed', 'LCD/Camera Parallel Interface', 'Touch Sensors'],
    typicalCurrentActiveMa: 95,
    typicalCurrentDeepSleepUa: 8,
    pins: [
      // Left side pins
      { id: '3v3', name: '3V3', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'en', name: 'EN (RST)', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 2 },
      { id: 'gpio4', name: 'GPIO4', gpioNumber: 4, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'gpio5', name: 'GPIO5', gpioNumber: 5, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'gpio6', name: 'GPIO6', gpioNumber: 6, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'gpio7', name: 'GPIO7', gpioNumber: 7, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'gpio15', name: 'GPIO15', gpioNumber: 15, supportedSignals: ['GPIO', 'ADC', 'TOUCH', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 7 },
      { id: 'gpio16', name: 'GPIO16', gpioNumber: 16, supportedSignals: ['GPIO', 'ADC', 'TOUCH', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 8 },
      { id: 'gpio17', name: 'GPIO17', gpioNumber: 17, supportedSignals: ['GPIO', 'ADC', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 9 },
      { id: 'gpio18', name: 'GPIO18', gpioNumber: 18, supportedSignals: ['GPIO', 'ADC', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 10 },
      { id: 'gpio8', name: 'GPIO8 (SDA)', gpioNumber: 8, supportedSignals: ['GPIO', 'I2C_SDA', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 11 },
      { id: 'gpio9', name: 'GPIO9 (SCL)', gpioNumber: 9, supportedSignals: ['GPIO', 'I2C_SCL', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 12 },
      { id: 'gpio3', name: 'GPIO3 (STRAP)', gpioNumber: 3, supportedSignals: ['GPIO', 'STRAP', 'STRAP'], isStrappingPin: true, strappingNote: 'JTAG/Boot strapping pin. Avoid pulling down during reset.', voltageDomain: '3.3V', side: 'left', order: 13 },
      { id: 'gpio46', name: 'GPIO46 (STRAP)', gpioNumber: 46, supportedSignals: ['GPIO', 'STRAP'], isStrappingPin: true, strappingNote: 'ROM messages printing selector. Input only.', voltageDomain: '3.3V', side: 'left', order: 14 },
      { id: 'gpio10', name: 'GPIO10 (SPI-CS)', gpioNumber: 10, supportedSignals: ['GPIO', 'SPI_CS', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 15 },
      { id: 'gpio11', name: 'GPIO11 (SPI-MOSI)', gpioNumber: 11, supportedSignals: ['GPIO', 'SPI_MOSI', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 16 },
      { id: 'gpio12', name: 'GPIO12 (SPI-SCK)', gpioNumber: 12, supportedSignals: ['GPIO', 'SPI_SCK', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 17 },
      { id: 'gpio13', name: 'GPIO13 (SPI-MISO)', gpioNumber: 13, supportedSignals: ['GPIO', 'SPI_MISO', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 18 },
      { id: 'gpio14', name: 'GPIO14', gpioNumber: 14, supportedSignals: ['GPIO', 'PWM', 'TOUCH'], voltageDomain: '3.3V', side: 'left', order: 19 },
      { id: '5v', name: '5V (VBUS)', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 20 },
      { id: 'gnd1', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 21 },

      // Right side pins
      { id: 'gpio43', name: 'GPIO43 (TXD0)', gpioNumber: 43, supportedSignals: ['GPIO', 'UART_TX'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'gpio44', name: 'GPIO44 (RXD0)', gpioNumber: 44, supportedSignals: ['GPIO', 'UART_RX'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'gpio1', name: 'GPIO1', gpioNumber: 1, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'right', order: 3 },
      { id: 'gpio2', name: 'GPIO2', gpioNumber: 2, supportedSignals: ['GPIO', 'ADC', 'TOUCH'], voltageDomain: '3.3V', side: 'right', order: 4 },
      { id: 'gpio42', name: 'GPIO42 (I2S-LRCK)', gpioNumber: 42, supportedSignals: ['GPIO', 'I2S_LRCK', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 5 },
      { id: 'gpio41', name: 'GPIO41 (I2S-BCLK)', gpioNumber: 41, supportedSignals: ['GPIO', 'I2S_BCLK', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 6 },
      { id: 'gpio40', name: 'GPIO40 (I2S-DOUT)', gpioNumber: 40, supportedSignals: ['GPIO', 'I2S_DATA', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 7 },
      { id: 'gpio39', name: 'GPIO39 (I2S-DIN)', gpioNumber: 39, supportedSignals: ['GPIO', 'I2S_DATA', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 8 },
      { id: 'gpio38', name: 'GPIO38', gpioNumber: 38, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 9 },
      { id: 'gpio0', name: 'GPIO0 (BOOT)', gpioNumber: 0, supportedSignals: ['GPIO', 'STRAP'], isStrappingPin: true, strappingNote: 'Boot mode strap. High for SPI boot, Low for flashing download.', voltageDomain: '3.3V', side: 'right', order: 10 },
      { id: 'gpio45', name: 'GPIO45 (STRAP)', gpioNumber: 45, supportedSignals: ['GPIO', 'STRAP'], isStrappingPin: true, strappingNote: 'VDD_SPI voltage strapping pin.', voltageDomain: '3.3V', side: 'right', order: 11 },
      { id: 'gpio48', name: 'GPIO48 (RGB-LED)', gpioNumber: 48, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 12 },
      { id: 'gpio47', name: 'GPIO47', gpioNumber: 47, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 13 },
      { id: 'gpio21', name: 'GPIO21', gpioNumber: 21, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 14 },
      { id: 'gpio20', name: 'GPIO20 (USB D+)', gpioNumber: 20, supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 15 },
      { id: 'gpio19', name: 'GPIO19 (USB D-)', gpioNumber: 19, supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 16 },
      { id: 'gnd2', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'right', order: 17 }
    ]
  },
  {
    id: 'esp32-p4-pro',
    name: 'ESP32-P4 High-Performance Board',
    family: 'ESP32-P4',
    tagline: 'Dual RISC-V @ 400MHz + MIPI-CSI/DSI + 2D GPU + H.264 + 100M Ethernet',
    cpuArchitecture: 'RISC-V Dual-Core 400MHz HP + 40MHz LP Core',
    clockSpeedMhz: 400,
    cores: 2,
    flashSizeMb: 32,
    psramSizeMb: 32,
    wireless: ['Ext. Wi-Fi/BT via SDIO/SPI Host', 'Native 100M RMII Ethernet'],
    specialHardware: ['2-Lane MIPI-DSI Display', '2-Lane MIPI-CSI Camera', '2D Hardware PPA GPU Accelerator', 'H.264 Video Encoder', 'USB 2.0 High-Speed 480Mbps OTG'],
    typicalCurrentActiveMa: 180,
    typicalCurrentDeepSleepUa: 15,
    pins: [
      { id: 'p4_3v3', name: '3V3_OUT', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'p4_5v', name: '5V_IN', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 2 },
      { id: 'p4_gnd1', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 3 },
      { id: 'p4_mipi_dsi_d0p', name: 'DSI_D0+', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'p4_mipi_dsi_d0n', name: 'DSI_D0-', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'p4_mipi_dsi_clkp', name: 'DSI_CLK+', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'p4_mipi_dsi_clkn', name: 'DSI_CLK-', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 7 },
      { id: 'p4_mipi_dsi_d1p', name: 'DSI_D1+', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 8 },
      { id: 'p4_mipi_dsi_d1n', name: 'DSI_D1-', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 9 },
      { id: 'p4_gpio20', name: 'GPIO20 (I2C-SDA)', gpioNumber: 20, supportedSignals: ['GPIO', 'I2C_SDA'], voltageDomain: '3.3V', side: 'left', order: 10 },
      { id: 'p4_gpio21', name: 'GPIO21 (I2C-SCL)', gpioNumber: 21, supportedSignals: ['GPIO', 'I2C_SCL'], voltageDomain: '3.3V', side: 'left', order: 11 },
      { id: 'p4_gpio22', name: 'GPIO22 (TOUCH-INT)', gpioNumber: 22, supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 12 },
      { id: 'p4_gpio23', name: 'GPIO23 (DSI-RST)', gpioNumber: 23, supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 13 },
      { id: 'p4_eth_txd0', name: 'ETH_TXD0', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 14 },
      { id: 'p4_eth_txd1', name: 'ETH_TXD1', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 15 },
      { id: 'p4_eth_txen', name: 'ETH_TXEN', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 16 },

      { id: 'p4_mipi_csi_d0p', name: 'CSI_D0+', supportedSignals: ['MIPI_CSI'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'p4_mipi_csi_d0n', name: 'CSI_D0-', supportedSignals: ['MIPI_CSI'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'p4_mipi_csi_clkp', name: 'CSI_CLK+', supportedSignals: ['MIPI_CSI'], voltageDomain: '3.3V', side: 'right', order: 3 },
      { id: 'p4_mipi_csi_clkn', name: 'CSI_CLK-', supportedSignals: ['MIPI_CSI'], voltageDomain: '3.3V', side: 'right', order: 4 },
      { id: 'p4_gpio30', name: 'GPIO30 (CAM-PWDN)', gpioNumber: 30, supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 5 },
      { id: 'p4_gpio31', name: 'GPIO31 (CAM-MCLK)', gpioNumber: 31, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'right', order: 6 },
      { id: 'p4_gpio32', name: 'GPIO32 (I2S-MCLK)', gpioNumber: 32, supportedSignals: ['GPIO', 'I2S_DATA'], voltageDomain: '3.3V', side: 'right', order: 7 },
      { id: 'p4_gpio33', name: 'GPIO33 (I2S-BCLK)', gpioNumber: 33, supportedSignals: ['GPIO', 'I2S_BCLK'], voltageDomain: '3.3V', side: 'right', order: 8 },
      { id: 'p4_gpio34', name: 'GPIO34 (I2S-WS)', gpioNumber: 34, supportedSignals: ['GPIO', 'I2S_LRCK'], voltageDomain: '3.3V', side: 'right', order: 9 },
      { id: 'p4_gpio35', name: 'GPIO35 (I2S-DOUT)', gpioNumber: 35, supportedSignals: ['GPIO', 'I2S_DATA'], voltageDomain: '3.3V', side: 'right', order: 10 },
      { id: 'p4_usb_dp', name: 'USB_HS_DP', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 11 },
      { id: 'p4_usb_dm', name: 'USB_HS_DM', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 12 },
      { id: 'p4_gnd2', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'right', order: 13 }
    ]
  },
  {
    id: 'esp32-c6-devkitm',
    name: 'ESP32-C6 DevKitM-1',
    family: 'ESP32-C6',
    tagline: 'Single RISC-V @ 160MHz + Wi-Fi 6 + Zigbee 3.0 / Thread / Matter + BLE 5',
    cpuArchitecture: 'RISC-V 32-bit Single-Core 160MHz',
    clockSpeedMhz: 160,
    cores: 1,
    flashSizeMb: 8,
    psramSizeMb: 0,
    wireless: ['Wi-Fi 6 (802.11 ax)', 'Zigbee 3.0', 'Thread 1.3 / Matter', 'Bluetooth 5 (LE)'],
    specialHardware: ['802.15.4 Radio for Matter', 'Low Power RISC-V Core', 'Hardware Crypto Engine'],
    typicalCurrentActiveMa: 70,
    typicalCurrentDeepSleepUa: 7,
    pins: [
      { id: 'c6_3v3', name: '3V3', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'c6_gpio0', name: 'GPIO0', gpioNumber: 0, supportedSignals: ['GPIO', 'ADC'], voltageDomain: '3.3V', side: 'left', order: 2 },
      { id: 'c6_gpio1', name: 'GPIO1', gpioNumber: 1, supportedSignals: ['GPIO', 'ADC'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'c6_gpio6', name: 'GPIO6 (I2C-SDA)', gpioNumber: 6, supportedSignals: ['GPIO', 'I2C_SDA', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'c6_gpio7', name: 'GPIO7 (I2C-SCL)', gpioNumber: 7, supportedSignals: ['GPIO', 'I2C_SCL', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'c6_gpio8', name: 'GPIO8 (PWM-1)', gpioNumber: 8, supportedSignals: ['GPIO', 'PWM'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'c6_gpio9', name: 'GPIO9 (BOOT/STRAP)', gpioNumber: 9, supportedSignals: ['GPIO', 'STRAP'], isStrappingPin: true, strappingNote: 'Boot strapping pin.', voltageDomain: '3.3V', side: 'left', order: 7 },
      { id: 'c6_gnd1', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 8 },

      { id: 'c6_5v', name: '5V', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'right', order: 1 },
      { id: 'c6_gpio16', name: 'GPIO16 (TXD)', gpioNumber: 16, supportedSignals: ['GPIO', 'UART_TX'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'c6_gpio17', name: 'GPIO17 (RXD)', gpioNumber: 17, supportedSignals: ['GPIO', 'UART_RX'], voltageDomain: '3.3V', side: 'right', order: 3 },
      { id: 'c6_gpio18', name: 'GPIO18 (SPI-MOSI)', gpioNumber: 18, supportedSignals: ['GPIO', 'SPI_MOSI'], voltageDomain: '3.3V', side: 'right', order: 4 },
      { id: 'c6_gpio19', name: 'GPIO19 (SPI-MISO)', gpioNumber: 19, supportedSignals: ['GPIO', 'SPI_MISO'], voltageDomain: '3.3V', side: 'right', order: 5 },
      { id: 'c6_gpio20', name: 'GPIO20 (SPI-SCK)', gpioNumber: 20, supportedSignals: ['GPIO', 'SPI_SCK'], voltageDomain: '3.3V', side: 'right', order: 6 },
      { id: 'c6_gpio21', name: 'GPIO21 (SPI-CS)', gpioNumber: 21, supportedSignals: ['GPIO', 'SPI_CS'], voltageDomain: '3.3V', side: 'right', order: 7 },
      { id: 'c6_gnd2', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'right', order: 8 }
    ]
  }
];

// --- Modular Peripheral Components Catalog ---
export const MODULE_CATALOG: Omit<ComponentModule, 'id' | 'x' | 'y'>[] = [
  // Displays
  {
    typeId: 'mod_disp_ili9488',
    name: '3.5" IPS Capacitive Touch (ILI9488 + FT6236)',
    category: 'display',
    description: '480x320 16-bit color TFT with SPI display interface and I2C capacitive touch controller.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 140,
    powerCurrentStandbyMa: 2,
    protocol: 'SPI',
    estimatedCostUsd: 14.5,
    pins: [
      { id: 'vcc', name: 'VCC', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'cs', name: 'LCD_CS', supportedSignals: ['SPI_CS'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'dc', name: 'LCD_DC', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'sck', name: 'LCD_SCK', supportedSignals: ['SPI_SCK'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'mosi', name: 'LCD_MOSI', supportedSignals: ['SPI_MOSI'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'miso', name: 'LCD_MISO', supportedSignals: ['SPI_MISO'], voltageDomain: '3.3V', side: 'left', order: 7 },
      { id: 'tp_sda', name: 'TOUCH_SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'tp_scl', name: 'TOUCH_SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'tp_int', name: 'TOUCH_INT', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 3 },
      { id: 'tp_rst', name: 'TOUCH_RST', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 4 }
    ]
  },
  {
    typeId: 'mod_disp_mipi_7in',
    name: '7.0" MIPI DSI Touchscreen (1024x600)',
    category: 'display',
    description: 'High-speed 2-lane MIPI DSI display for ESP32-P4 with high-frame-rate LVGL UI acceleration.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 380,
    powerCurrentStandbyMa: 5,
    protocol: 'MIPI-DSI',
    estimatedCostUsd: 28.0,
    pins: [
      { id: 'vcc', name: 'VCC_3V3', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'd0p', name: 'DSI_D0+', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'd0n', name: 'DSI_D0-', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'clkp', name: 'DSI_CLK+', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'clkn', name: 'DSI_CLK-', supportedSignals: ['MIPI_DSI'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'tp_sda', name: 'TP_SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'tp_scl', name: 'TP_SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'tp_rst', name: 'TP_RST', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 3 }
    ]
  },
  {
    typeId: 'mod_disp_oled_13',
    name: '1.3" I2C Monochrome OLED (SSD1306 / SH1106)',
    category: 'display',
    description: '128x64 low power compact status display with hardware I2C addressing.',
    operatingVoltage: '3.3V-5V',
    powerCurrentActiveMa: 22,
    powerCurrentStandbyMa: 0.1,
    protocol: 'I2C',
    estimatedCostUsd: 3.2,
    pins: [
      { id: 'vcc', name: 'VCC', supportedSignals: ['POWER_3V3', 'POWER_5V'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'scl', name: 'SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'sda', name: 'SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'left', order: 4 }
    ]
  },

  // Modems & Connectivity
  {
    typeId: 'mod_comm_sim7600_4g',
    name: 'SIM7600E 4G LTE + GPS Modem Module',
    category: 'connectivity',
    description: 'Global 4G LTE CAT4 modem with GNSS/GPS positioning and AT command UART interface.',
    operatingVoltage: '5V',
    powerCurrentActiveMa: 320,
    powerCurrentStandbyMa: 15,
    protocol: 'UART',
    estimatedCostUsd: 22.0,
    pins: [
      { id: 'vcc', name: 'VCC (5V Peak 2A)', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'pwrkey', name: 'PWRKEY', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'tx', name: 'MODEM_TXD', supportedSignals: ['UART_TX'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'rx', name: 'MODEM_RXD', supportedSignals: ['UART_RX'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'rst', name: 'MODEM_RST', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 3 }
    ]
  },
  {
    typeId: 'mod_comm_sx1262_lora',
    name: 'SX1262 LoRa 868/915MHz Transceiver',
    category: 'connectivity',
    description: 'Long-range ultra-low power sub-GHz radio with up to +22dBm transmit output for off-grid mesh.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 110,
    powerCurrentStandbyMa: 0.05,
    protocol: 'SPI',
    estimatedCostUsd: 7.5,
    pins: [
      { id: 'vcc', name: '3V3', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'nss', name: 'LORA_CS', supportedSignals: ['SPI_CS'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'sck', name: 'SCK', supportedSignals: ['SPI_SCK'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'mosi', name: 'MOSI', supportedSignals: ['SPI_MOSI'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'miso', name: 'MISO', supportedSignals: ['SPI_MISO'], voltageDomain: '3.3V', side: 'left', order: 6 },
      { id: 'dio1', name: 'DIO1_INT', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'busy', name: 'BUSY', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'rst', name: 'RESET', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 3 }
    ]
  },

  // Keyboards & Input
  {
    typeId: 'mod_input_bbq20',
    name: 'BB QWERTY Keyboard & Optical Trackpad (I2C)',
    category: 'input',
    description: 'Full tactile 35-key BlackBerry keyboard with backlighting and center click navigation.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 18,
    powerCurrentStandbyMa: 0.2,
    protocol: 'I2C',
    estimatedCostUsd: 12.0,
    pins: [
      { id: 'vcc', name: 'VCC', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'sda', name: 'SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'scl', name: 'SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'int', name: 'KEY_INT', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 1 }
    ]
  },
  {
    typeId: 'mod_input_rotary',
    name: 'EC11 Rotary Encoder with Push Button',
    category: 'input',
    description: 'Quadrature incremental rotary encoder with integrated push switch for menu & dimming control.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 2,
    powerCurrentStandbyMa: 0.0,
    protocol: 'GPIO/PWM',
    estimatedCostUsd: 1.5,
    pins: [
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 1 },
      { id: 'pin_a', name: 'CLK_A', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 2 },
      { id: 'pin_b', name: 'DT_B', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'sw', name: 'PUSH_SW', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 1 }
    ]
  },

  // Audio
  {
    typeId: 'mod_audio_max98357a',
    name: 'MAX98357A I2S 3.2W Class-D Amplifier',
    category: 'audio',
    description: 'High-efficiency mono digital I2S audio amplifier directly driving 4-8 Ohm speakers.',
    operatingVoltage: '3.3V-5V',
    powerCurrentActiveMa: 280,
    powerCurrentStandbyMa: 0.01,
    protocol: 'I2S',
    estimatedCostUsd: 3.5,
    pins: [
      { id: 'vin', name: 'VIN (5V/3V3)', supportedSignals: ['POWER_5V', 'POWER_3V3'], voltageDomain: '5V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'bclk', name: 'BCLK', supportedSignals: ['I2S_BCLK'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'lrc', name: 'LRC', supportedSignals: ['I2S_LRCK'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'din', name: 'DIN', supportedSignals: ['I2S_DATA'], voltageDomain: '3.3V', side: 'left', order: 5 },
      { id: 'sd', name: 'SD_MODE', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 1 }
    ]
  },
  {
    typeId: 'mod_audio_inmp441',
    name: 'INMP441 Omnidirectional I2S Digital Mic',
    category: 'audio',
    description: 'Low-noise digital MEMS microphone with bottom port and 24-bit I2S output for voice recording.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 1.5,
    powerCurrentStandbyMa: 0.05,
    protocol: 'I2S',
    estimatedCostUsd: 2.8,
    pins: [
      { id: 'vdd', name: 'VDD (3V3)', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'sck', name: 'SCK', supportedSignals: ['I2S_BCLK'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'ws', name: 'WS (LRCK)', supportedSignals: ['I2S_LRCK'], voltageDomain: '3.3V', side: 'left', order: 4 },
      { id: 'sd', name: 'SD (DATA_OUT)', supportedSignals: ['I2S_DATA'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'l_r', name: 'L/R_SELECT', supportedSignals: ['GND', 'POWER_3V3'], voltageDomain: 'GND', side: 'right', order: 2 }
    ]
  },

  // Power & Battery
  {
    typeId: 'mod_power_axp2101',
    name: 'AXP2101 Multi-Channel PMIC & LiPo Fuel Gauge',
    category: 'power',
    description: 'Advanced power management IC with multiple DC-DC bucks, LDOs, battery fuel gauge, and I2C status.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 5,
    powerCurrentStandbyMa: 0.02,
    protocol: 'I2C',
    estimatedCostUsd: 4.8,
    pins: [
      { id: 'vbat', name: 'VBAT_IN (3.7V)', supportedSignals: ['POWER_3V3'], voltageDomain: 'VBAT', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'dcdc1_3v3', name: 'OUT_3V3 (2A)', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'vbus_5v', name: 'VBUS_5V (USB)', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 4 },
      { id: 'sda', name: 'PMIC_SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'right', order: 1 },
      { id: 'scl', name: 'PMIC_SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'right', order: 2 },
      { id: 'irq', name: 'PMIC_IRQ', supportedSignals: ['GPIO'], voltageDomain: '3.3V', side: 'right', order: 3 }
    ]
  },

  // Actuators & Lighting
  {
    typeId: 'mod_act_ws2812b_matrix',
    name: 'WS2812B Addressable RGB LED Array (64 LEDs)',
    category: 'actuator',
    description: 'High-density 5V digital addressable RGB LEDs with single-wire high-speed PWM timing.',
    operatingVoltage: '5V',
    powerCurrentActiveMa: 1200,
    powerCurrentStandbyMa: 1,
    protocol: 'GPIO/PWM',
    estimatedCostUsd: 8.0,
    pins: [
      { id: '5v', name: '5V (Power)', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'din', name: 'DIN (Data)', supportedSignals: ['GPIO', 'PWM'], voltageDomain: '5V', side: 'right', order: 1 }
    ]
  },
  {
    typeId: 'mod_act_dual_relay',
    name: 'Dual 10A 250VAC Optocoupled Relay Module',
    category: 'actuator',
    description: 'High-current mains switching relays with optical isolation and flyback diode protection.',
    operatingVoltage: '5V',
    powerCurrentActiveMa: 160,
    powerCurrentStandbyMa: 1,
    protocol: 'GPIO/PWM',
    estimatedCostUsd: 3.5,
    pins: [
      { id: 'vcc', name: 'VCC (5V)', supportedSignals: ['POWER_5V'], voltageDomain: '5V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'in1', name: 'RELAY_1', supportedSignals: ['GPIO'], voltageDomain: '3.3V-5V', side: 'right', order: 1 },
      { id: 'in2', name: 'RELAY_2', supportedSignals: ['GPIO'], voltageDomain: '3.3V-5V', side: 'right', order: 2 }
    ]
  },

  // Sensors
  {
    typeId: 'mod_sensor_bme680',
    name: 'BME680 Environmental Gas, Pressure & Temp Sensor',
    category: 'sensor',
    description: '4-in-1 sensor measuring ambient temperature, barometric pressure, relative humidity, and VOC air quality.',
    operatingVoltage: '3.3V',
    powerCurrentActiveMa: 12,
    powerCurrentStandbyMa: 0.05,
    protocol: 'I2C',
    estimatedCostUsd: 9.5,
    pins: [
      { id: 'vcc', name: 'VCC (3V3)', supportedSignals: ['POWER_3V3'], voltageDomain: '3.3V', side: 'left', order: 1 },
      { id: 'gnd', name: 'GND', supportedSignals: ['GND'], voltageDomain: 'GND', side: 'left', order: 2 },
      { id: 'scl', name: 'SCL', supportedSignals: ['I2C_SCL'], voltageDomain: '3.3V', side: 'left', order: 3 },
      { id: 'sda', name: 'SDA', supportedSignals: ['I2C_SDA'], voltageDomain: '3.3V', side: 'left', order: 4 }
    ]
  }
];

// --- Device Template Presets ---
export const PRESET_PROJECTS: DeviceProject[] = [
  {
    id: 'preset-modular-phone',
    name: 'Modular ESP32-S3 Cyberphone',
    version: '1.0.0',
    description: 'Pocket modular Linux/ESP-IDF handheld phone with 3.5" IPS touch screen, QWERTY BB keyboard, 4G LTE SIM7600 modem, I2S voice calling, and AXP2101 power management.',
    batteryCapacityMah: 3000,
    activeDutyCyclePercent: 30,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-06',
    enclosure: {
      formFactor: 'modular-phone',
      widthMm: 72,
      heightMm: 138,
      depthMm: 16.5,
      material: 'Anodized Aluminum',
      colorHex: '#181b24',
      wallThicknessMm: 2.0,
      hasBatteryBay: true,
      hasAntennaCutout: true
    },
    mcu: MCU_BOARDS[0], // ESP32-S3
    components: [
      {
        id: 'comp_disp_1',
        typeId: 'mod_disp_ili9488',
        name: '3.5" IPS Capacitive Touch',
        category: 'display',
        description: 'Primary visual interface',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 140,
        powerCurrentStandbyMa: 2,
        protocol: 'SPI',
        estimatedCostUsd: 14.5,
        x: 480,
        y: 40,
        pins: MODULE_CATALOG[0].pins
      },
      {
        id: 'comp_kb_1',
        typeId: 'mod_input_bbq20',
        name: 'BB QWERTY Keypad',
        category: 'input',
        description: 'Tactile physical keyboard & trackpad',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 18,
        powerCurrentStandbyMa: 0.2,
        protocol: 'I2C',
        estimatedCostUsd: 12.0,
        x: 480,
        y: 290,
        pins: MODULE_CATALOG[5].pins
      },
      {
        id: 'comp_modem_1',
        typeId: 'mod_comm_sim7600_4g',
        name: 'SIM7600 4G LTE & GPS',
        category: 'connectivity',
        description: 'Cellular calls, SMS and high-speed data',
        operatingVoltage: '5V',
        powerCurrentActiveMa: 320,
        powerCurrentStandbyMa: 15,
        protocol: 'UART',
        estimatedCostUsd: 22.0,
        x: 480,
        y: 480,
        pins: MODULE_CATALOG[3].pins
      },
      {
        id: 'comp_audio_spk',
        typeId: 'mod_audio_max98357a',
        name: 'MAX98357A Speaker Amp',
        category: 'audio',
        description: 'Handsfree and earpiece speaker amplifier',
        operatingVoltage: '5V',
        powerCurrentActiveMa: 280,
        powerCurrentStandbyMa: 0.01,
        protocol: 'I2S',
        estimatedCostUsd: 3.5,
        x: 480,
        y: 690,
        pins: MODULE_CATALOG[7].pins
      },
      {
        id: 'comp_pmic_1',
        typeId: 'mod_power_axp2101',
        name: 'AXP2101 PMIC & Battery Gauge',
        category: 'power',
        description: '3.7V LiPo charging, fuel gauging and system power rails',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 5,
        powerCurrentStandbyMa: 0.02,
        protocol: 'I2C',
        estimatedCostUsd: 4.8,
        x: 760,
        y: 540,
        pins: MODULE_CATALOG[9].pins
      }
    ],
    wires: [
      // Display connections (SPI)
      { id: 'w1', fromComponentId: 'mcu', fromPinId: 'gpio10', toComponentId: 'comp_disp_1', toPinId: 'cs', wireType: 'spi', color: '#38bdf8', gauge: '28AWG', lengthMm: 45, netName: 'LCD_CS' },
      { id: 'w2', fromComponentId: 'mcu', fromPinId: 'gpio11', toComponentId: 'comp_disp_1', toPinId: 'mosi', wireType: 'spi', color: '#0ea5e9', gauge: '28AWG', lengthMm: 45, netName: 'SPI_MOSI' },
      { id: 'w3', fromComponentId: 'mcu', fromPinId: 'gpio12', toComponentId: 'comp_disp_1', toPinId: 'sck', wireType: 'spi', color: '#6366f1', gauge: '28AWG', lengthMm: 45, netName: 'SPI_SCK' },
      { id: 'w4', fromComponentId: 'mcu', fromPinId: 'gpio13', toComponentId: 'comp_disp_1', toPinId: 'miso', wireType: 'spi', color: '#818cf8', gauge: '28AWG', lengthMm: 45, netName: 'SPI_MISO' },
      { id: 'w5', fromComponentId: 'mcu', fromPinId: '3v3', toComponentId: 'comp_disp_1', toPinId: 'vcc', wireType: 'power-vcc', color: '#ef4444', gauge: '26AWG', lengthMm: 50, netName: '3V3_SYS' },
      { id: 'w6', fromComponentId: 'mcu', fromPinId: 'gnd1', toComponentId: 'comp_disp_1', toPinId: 'gnd', wireType: 'power-gnd', color: '#1e293b', gauge: '26AWG', lengthMm: 50, netName: 'GND' },
      // I2C Bus for Keyboard and Touch
      { id: 'w7', fromComponentId: 'mcu', fromPinId: 'gpio8', toComponentId: 'comp_kb_1', toPinId: 'sda', wireType: 'i2c', color: '#06b6d4', gauge: '28AWG', lengthMm: 35, netName: 'I2C_SDA' },
      { id: 'w8', fromComponentId: 'mcu', fromPinId: 'gpio9', toComponentId: 'comp_kb_1', toPinId: 'scl', wireType: 'i2c', color: '#e879f9', gauge: '28AWG', lengthMm: 35, netName: 'I2C_SCL' },
      { id: 'w9', fromComponentId: 'mcu', fromPinId: '3v3', toComponentId: 'comp_kb_1', toPinId: 'vcc', wireType: 'power-vcc', color: '#ef4444', gauge: '28AWG', lengthMm: 40, netName: '3V3_SYS' },
      { id: 'w10', fromComponentId: 'mcu', fromPinId: 'gnd1', toComponentId: 'comp_kb_1', toPinId: 'gnd', wireType: 'power-gnd', color: '#1e293b', gauge: '28AWG', lengthMm: 40, netName: 'GND' },
      // SIM7600 UART modem
      { id: 'w11', fromComponentId: 'mcu', fromPinId: 'gpio43', toComponentId: 'comp_modem_1', toPinId: 'rx', wireType: 'uart', color: '#eab308', gauge: '26AWG', lengthMm: 60, netName: 'UART_TX_MODEM' },
      { id: 'w12', fromComponentId: 'mcu', fromPinId: 'gpio44', toComponentId: 'comp_modem_1', toPinId: 'tx', wireType: 'uart', color: '#f97316', gauge: '26AWG', lengthMm: 60, netName: 'UART_RX_MODEM' },
      { id: 'w13', fromComponentId: 'mcu', fromPinId: '5v', toComponentId: 'comp_modem_1', toPinId: 'vcc', wireType: 'power-vcc', color: '#dc2626', gauge: '22AWG', lengthMm: 65, netName: '5V_BOOST' },
      { id: 'w14', fromComponentId: 'mcu', fromPinId: 'gnd2', toComponentId: 'comp_modem_1', toPinId: 'gnd', wireType: 'power-gnd', color: '#0f172a', gauge: '22AWG', lengthMm: 65, netName: 'GND' },
      // Speaker Amp (I2S)
      { id: 'w15', fromComponentId: 'mcu', fromPinId: 'gpio41', toComponentId: 'comp_audio_spk', toPinId: 'bclk', wireType: 'i2s', color: '#10b981', gauge: '28AWG', lengthMm: 50, netName: 'I2S_BCLK' },
      { id: 'w16', fromComponentId: 'mcu', fromPinId: 'gpio42', toComponentId: 'comp_audio_spk', toPinId: 'lrc', wireType: 'i2s', color: '#14b8a6', gauge: '28AWG', lengthMm: 50, netName: 'I2S_LRC' },
      { id: 'w17', fromComponentId: 'mcu', fromPinId: 'gpio40', toComponentId: 'comp_audio_spk', toPinId: 'din', wireType: 'i2s', color: '#059669', gauge: '28AWG', lengthMm: 50, netName: 'I2S_DOUT' },
      { id: 'w18', fromComponentId: 'mcu', fromPinId: '5v', toComponentId: 'comp_audio_spk', toPinId: 'vin', wireType: 'power-vcc', color: '#dc2626', gauge: '24AWG', lengthMm: 55, netName: '5V_AUDIO' },
      { id: 'w19', fromComponentId: 'mcu', fromPinId: 'gnd2', toComponentId: 'comp_audio_spk', toPinId: 'gnd', wireType: 'power-gnd', color: '#0f172a', gauge: '24AWG', lengthMm: 55, netName: 'GND' },
      // PMIC Power & I2C Bus
      { id: 'w20', fromComponentId: 'mcu', fromPinId: 'gnd1', toComponentId: 'comp_pmic_1', toPinId: 'gnd', wireType: 'power-gnd', color: '#1e293b', gauge: '26AWG', lengthMm: 45, netName: 'GND' },
      { id: 'w21', fromComponentId: 'mcu', fromPinId: '3v3', toComponentId: 'comp_pmic_1', toPinId: 'dcdc1_3v3', wireType: 'power-vcc', color: '#ef4444', gauge: '24AWG', lengthMm: 45, netName: '3V3_SYS' },
      { id: 'w22', fromComponentId: 'mcu', fromPinId: 'gpio8', toComponentId: 'comp_pmic_1', toPinId: 'sda', wireType: 'i2c', color: '#06b6d4', gauge: '28AWG', lengthMm: 45, netName: 'I2C_SDA' },
      { id: 'w23', fromComponentId: 'mcu', fromPinId: 'gpio9', toComponentId: 'comp_pmic_1', toPinId: 'scl', wireType: 'i2c', color: '#e879f9', gauge: '28AWG', lengthMm: 45, netName: 'I2C_SCL' }
    ]
  },
  {
    id: 'preset-p4-vision-deck',
    name: 'ESP32-P4 High-Performance Vision & AI Terminal',
    version: '1.0.0',
    description: 'Workstation cyberdeck powered by ESP32-P4 Dual RISC-V @ 400MHz, 7.0" MIPI DSI 60FPS display, Ethernet and BME680 telemetry.',
    batteryCapacityMah: 5000,
    activeDutyCyclePercent: 80,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-06',
    enclosure: {
      formFactor: 'vision-terminal',
      widthMm: 185,
      heightMm: 110,
      depthMm: 24.0,
      material: 'CNC Polycarbonate',
      colorHex: '#0f172a',
      wallThicknessMm: 3.0,
      hasBatteryBay: true,
      hasAntennaCutout: true
    },
    mcu: MCU_BOARDS[1], // ESP32-P4
    components: [
      {
        id: 'comp_p4_dsi',
        typeId: 'mod_disp_mipi_7in',
        name: '7.0" MIPI DSI Touchscreen',
        category: 'display',
        description: 'Direct 2-lane MIPI differential high-speed video',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 380,
        powerCurrentStandbyMa: 5,
        protocol: 'MIPI-DSI',
        estimatedCostUsd: 28.0,
        x: 480,
        y: 60,
        pins: MODULE_CATALOG[1].pins
      },
      {
        id: 'comp_p4_bme',
        typeId: 'mod_sensor_bme680',
        name: 'BME680 Environmental Station',
        category: 'sensor',
        description: 'Ambient telemetry & VOC gas index',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 12,
        powerCurrentStandbyMa: 0.05,
        protocol: 'I2C',
        estimatedCostUsd: 9.5,
        x: 480,
        y: 380,
        pins: MODULE_CATALOG[11].pins
      }
    ],
    wires: [
      { id: 'pw1', fromComponentId: 'mcu', fromPinId: 'p4_mipi_dsi_d0p', toComponentId: 'comp_p4_dsi', toPinId: 'd0p', wireType: 'mipi', color: '#38bdf8', gauge: 'FPC-Ribbon', lengthMm: 30, netName: 'DSI_D0+' },
      { id: 'pw2', fromComponentId: 'mcu', fromPinId: 'p4_mipi_dsi_d0n', toComponentId: 'comp_p4_dsi', toPinId: 'd0n', wireType: 'mipi', color: '#0284c7', gauge: 'FPC-Ribbon', lengthMm: 30, netName: 'DSI_D0-' },
      { id: 'pw3', fromComponentId: 'mcu', fromPinId: 'p4_mipi_dsi_clkp', toComponentId: 'comp_p4_dsi', toPinId: 'clkp', wireType: 'mipi', color: '#818cf8', gauge: 'FPC-Ribbon', lengthMm: 30, netName: 'DSI_CLK+' },
      { id: 'pw4', fromComponentId: 'mcu', fromPinId: 'p4_mipi_dsi_clkn', toComponentId: 'comp_p4_dsi', toPinId: 'clkn', wireType: 'mipi', color: '#4f46e5', gauge: 'FPC-Ribbon', lengthMm: 30, netName: 'DSI_CLK-' },
      { id: 'pw5', fromComponentId: 'mcu', fromPinId: 'p4_3v3', toComponentId: 'comp_p4_dsi', toPinId: 'vcc', wireType: 'power-vcc', color: '#ef4444', gauge: '24AWG', lengthMm: 35, netName: '3V3_RAIL' },
      { id: 'pw6', fromComponentId: 'mcu', fromPinId: 'p4_gnd1', toComponentId: 'comp_p4_dsi', toPinId: 'gnd', wireType: 'power-gnd', color: '#0f172a', gauge: '24AWG', lengthMm: 35, netName: 'GND' },
      { id: 'pw7', fromComponentId: 'mcu', fromPinId: 'p4_gpio20', toComponentId: 'comp_p4_bme', toPinId: 'sda', wireType: 'i2c', color: '#06b6d4', gauge: '28AWG', lengthMm: 50, netName: 'I2C_SDA' },
      { id: 'pw8', fromComponentId: 'mcu', fromPinId: 'p4_gpio21', toComponentId: 'comp_p4_bme', toPinId: 'scl', wireType: 'i2c', color: '#e879f9', gauge: '28AWG', lengthMm: 50, netName: 'I2C_SCL' }
    ]
  },
  {
    id: 'preset-light-controller',
    name: 'Smart Home Matrix & Light Controller',
    version: '1.0.0',
    description: 'Matter & Thread smart lighting hub powered by ESP32-C6 with 64-LED WS2812B RGB effects, rotary encoder, OLED dashboard, and dual 10A relay mains control.',
    batteryCapacityMah: 0, // Mains powered
    activeDutyCyclePercent: 100,
    createdAt: '2026-11-06',
    updatedAt: '2026-11-06',
    enclosure: {
      formFactor: 'light-controller',
      widthMm: 110,
      heightMm: 85,
      depthMm: 32.0,
      material: '3D-Printed PETG',
      colorHex: '#1e293b',
      wallThicknessMm: 2.5,
      hasBatteryBay: false,
      hasAntennaCutout: true
    },
    mcu: MCU_BOARDS[2], // ESP32-C6
    components: [
      {
        id: 'comp_oled_stat',
        typeId: 'mod_disp_oled_13',
        name: '1.3" OLED Status Screen',
        category: 'display',
        description: 'Displays Matter pairing code, Wi-Fi IP and lumen output',
        operatingVoltage: '3.3V-5V',
        powerCurrentActiveMa: 22,
        powerCurrentStandbyMa: 0.1,
        protocol: 'I2C',
        estimatedCostUsd: 3.2,
        x: 480,
        y: 40,
        pins: MODULE_CATALOG[2].pins
      },
      {
        id: 'comp_rotary_dim',
        typeId: 'mod_input_rotary',
        name: 'Rotary Dimmer Knob',
        category: 'input',
        description: 'Smooth rotary dial for light intensity and scene presets',
        operatingVoltage: '3.3V',
        powerCurrentActiveMa: 2,
        powerCurrentStandbyMa: 0.0,
        protocol: 'GPIO/PWM',
        estimatedCostUsd: 1.5,
        x: 480,
        y: 220,
        pins: MODULE_CATALOG[6].pins
      },
      {
        id: 'comp_ws2812_strip',
        typeId: 'mod_act_ws2812b_matrix',
        name: 'WS2812B RGB Matrix (64 LEDs)',
        category: 'actuator',
        description: 'Ambient lighting and addressable accent patterns',
        operatingVoltage: '5V',
        powerCurrentActiveMa: 1200,
        powerCurrentStandbyMa: 1,
        protocol: 'GPIO/PWM',
        estimatedCostUsd: 8.0,
        x: 480,
        y: 390,
        pins: MODULE_CATALOG[10].pins
      },
      {
        id: 'comp_dual_relay',
        typeId: 'mod_act_dual_relay',
        name: 'Dual 10A Mains Relays',
        category: 'actuator',
        description: 'Switches high-voltage chandelier or ceiling light ballasts',
        operatingVoltage: '5V',
        powerCurrentActiveMa: 160,
        powerCurrentStandbyMa: 1,
        protocol: 'GPIO/PWM',
        estimatedCostUsd: 3.5,
        x: 480,
        y: 560,
        pins: MODULE_CATALOG[11].pins
      }
    ],
    wires: [
      { id: 'lw1', fromComponentId: 'mcu', fromPinId: 'c6_gpio6', toComponentId: 'comp_oled_stat', toPinId: 'sda', wireType: 'i2c', color: '#06b6d4', gauge: '28AWG', lengthMm: 40, netName: 'I2C_SDA' },
      { id: 'lw2', fromComponentId: 'mcu', fromPinId: 'c6_gpio7', toComponentId: 'comp_oled_stat', toPinId: 'scl', wireType: 'i2c', color: '#e879f9', gauge: '28AWG', lengthMm: 40, netName: 'I2C_SCL' },
      { id: 'lw3', fromComponentId: 'mcu', fromPinId: 'c6_gpio8', toComponentId: 'comp_ws2812_strip', toPinId: 'din', wireType: 'gpio', color: '#22c55e', gauge: '24AWG', lengthMm: 60, netName: 'NEOPIXEL_DATA' },
      { id: 'lw4', fromComponentId: 'mcu', fromPinId: 'c6_5v', toComponentId: 'comp_ws2812_strip', toPinId: '5v', wireType: 'power-vcc', color: '#ef4444', gauge: '22AWG', lengthMm: 60, netName: '5V_MAINS' },
      { id: 'lw5', fromComponentId: 'mcu', fromPinId: 'c6_gnd1', toComponentId: 'comp_ws2812_strip', toPinId: 'gnd', wireType: 'power-gnd', color: '#020617', gauge: '22AWG', lengthMm: 60, netName: 'GND' },
      { id: 'lw6', fromComponentId: 'mcu', fromPinId: 'c6_gpio0', toComponentId: 'comp_rotary_dim', toPinId: 'pin_a', wireType: 'gpio', color: '#f59e0b', gauge: '28AWG', lengthMm: 45, netName: 'ENC_A' },
      { id: 'lw7', fromComponentId: 'mcu', fromPinId: 'c6_gpio1', toComponentId: 'comp_rotary_dim', toPinId: 'pin_b', wireType: 'gpio', color: '#eab308', gauge: '28AWG', lengthMm: 45, netName: 'ENC_B' },
      { id: 'lw8', fromComponentId: 'mcu', fromPinId: 'c6_gpio16', toComponentId: 'comp_dual_relay', toPinId: 'in1', wireType: 'gpio', color: '#a855f7', gauge: '26AWG', lengthMm: 50, netName: 'RELAY_CH1' },
      { id: 'lw9', fromComponentId: 'mcu', fromPinId: 'c6_gpio17', toComponentId: 'comp_dual_relay', toPinId: 'in2', wireType: 'gpio', color: '#c084fc', gauge: '26AWG', lengthMm: 50, netName: 'RELAY_CH2' }
    ]
  }
];
