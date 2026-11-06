/**
 * Hardware, Pinout, Wiring & Project Types for ESP-Forge Studio
 */

export type McuFamily = 'ESP32-S3' | 'ESP32-P4' | 'ESP32-C6' | 'ESP32-C3' | 'ESP32-Classic';

export type PinSignalType =
  | 'POWER_3V3'
  | 'POWER_5V'
  | 'GND'
  | 'GPIO'
  | 'ADC'
  | 'DAC'
  | 'I2C_SDA'
  | 'I2C_SCL'
  | 'SPI_MOSI'
  | 'SPI_MISO'
  | 'SPI_SCK'
  | 'SPI_CS'
  | 'UART_TX'
  | 'UART_RX'
  | 'I2S_DATA'
  | 'I2S_BCLK'
  | 'I2S_LRCK'
  | 'MIPI_DSI'
  | 'MIPI_CSI'
  | 'DVP_CAM'
  | 'STRAP'
  | 'TOUCH'
  | 'PWM';

export interface PinDefinition {
  id: string;
  name: string;
  pinNumber?: number;
  gpioNumber?: number;
  supportedSignals: PinSignalType[];
  isStrappingPin?: boolean;
  strappingNote?: string;
  isAdc2?: boolean; // ESP32 classic Wi-Fi conflict caution
  voltageDomain: '3.3V' | '5V' | 'GND' | 'VBAT' | '3.3V-5V';
  side: 'left' | 'right' | 'top' | 'bottom';
  order: number;
}

export interface McuBoardSpec {
  id: string;
  name: string;
  family: McuFamily;
  tagline: string;
  cpuArchitecture: string;
  clockSpeedMhz: number;
  cores: number;
  flashSizeMb: number;
  psramSizeMb: number;
  wireless: string[];
  specialHardware: string[];
  typicalCurrentActiveMa: number;
  typicalCurrentDeepSleepUa: number;
  pins: PinDefinition[];
}

export type ModuleCategory =
  | 'display'
  | 'camera'
  | 'input'
  | 'audio'
  | 'connectivity'
  | 'power'
  | 'sensor'
  | 'actuator';

export interface ComponentModule {
  id: string;
  typeId: string;
  name: string;
  category: ModuleCategory;
  description: string;
  operatingVoltage: '3.3V' | '5V' | '3.3V-5V';
  powerCurrentActiveMa: number;
  powerCurrentStandbyMa: number;
  protocol: 'I2C' | 'SPI' | 'UART' | 'I2S' | 'MIPI-DSI' | 'MIPI-CSI' | 'DVP' | 'GPIO/PWM' | 'Analog' | 'Power';
  pins: PinDefinition[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  estimatedCostUsd: number;
}

export type WireType =
  | 'power-vcc'
  | 'power-gnd'
  | 'i2c'
  | 'spi'
  | 'uart'
  | 'i2s'
  | 'mipi'
  | 'gpio'
  | 'analog'
  | 'rf';

export type WireGauge = '28AWG' | '26AWG' | '24AWG' | '22AWG' | 'FPC-Ribbon';

export interface WireConnection {
  id: string;
  fromComponentId: string; // 'mcu' or component module id
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  wireType: WireType;
  color: string;
  gauge: WireGauge;
  lengthMm: number;
  netName?: string;
}

export interface PinConflictRuleIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  title: string;
  description: string;
  involvedPinIds: string[];
  involvedComponentIds: string[];
  recommendation: string;
}

export interface PowerBudgetSummary {
  totalActiveCurrentMa: number;
  totalSleepCurrentMa: number;
  batteryCapacityMah: number;
  activeDutyCyclePercent: number;
  estimatedBatteryLifeHours: number;
  estimatedBatteryLifeDays: number;
  maxVoltageDropVolts: number;
  isPowerDeficit: boolean;
  notes: string[];
}

export interface DeviceEnclosureSpecs {
  formFactor: 'modular-phone' | 'light-controller' | 'vision-terminal' | 'cyberdeck' | 'custom-enclosure';
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material: 'Anodized Aluminum' | '3D-Printed PETG' | 'CNC Polycarbonate' | 'FR4 PCB Shell';
  colorHex: string;
  wallThicknessMm: number;
  hasBatteryBay: boolean;
  hasAntennaCutout: boolean;
}

export interface DeviceProject {
  id: string;
  name: string;
  version: string;
  description: string;
  mcu: McuBoardSpec;
  components: ComponentModule[];
  wires: WireConnection[];
  enclosure: DeviceEnclosureSpecs;
  batteryCapacityMah: number;
  activeDutyCyclePercent: number;
  createdAt: string;
  updatedAt: string;
}
