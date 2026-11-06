import { DeviceProject } from '../types/hardware';

export interface BomItem {
  reference: string;
  name: string;
  category: string;
  protocol: string;
  voltage: string;
  qty: number;
  unitCostUsd: number;
  totalCostUsd: number;
  notes: string;
}

export function generateBom(project: DeviceProject): { items: BomItem[]; grandTotalUsd: number } {
  const items: BomItem[] = [];

  // 1. MCU Board
  const mcuCost = project.mcu.family === 'ESP32-P4' ? 14.0 : project.mcu.family === 'ESP32-S3' ? 8.5 : 6.0;
  items.push({
    reference: 'U1',
    name: project.mcu.name,
    category: 'MCU / SoC',
    protocol: 'Internal Bus / Wireless',
    voltage: '3.3V / 5V USB',
    qty: 1,
    unitCostUsd: mcuCost,
    totalCostUsd: mcuCost,
    notes: `${project.mcu.cpuArchitecture}, ${project.mcu.clockSpeedMhz}MHz, ${project.mcu.psramSizeMb}MB PSRAM`
  });

  // 2. Components
  project.components.forEach((comp, idx) => {
    items.push({
      reference: `MOD${idx + 1}`,
      name: comp.name,
      category: comp.category.toUpperCase(),
      protocol: comp.protocol,
      voltage: comp.operatingVoltage,
      qty: 1,
      unitCostUsd: comp.estimatedCostUsd,
      totalCostUsd: comp.estimatedCostUsd,
      notes: comp.description
    });
  });

  // 3. Wires & Harness
  const wireCost = Math.max(1.5, Math.round(project.wires.length * 0.15 * 10) / 10);
  items.push({
    reference: 'W-HARNESS',
    name: `Custom Hookup Harness (${project.wires.length} wires)`,
    category: 'WIRING',
    protocol: 'Interconnect',
    voltage: 'Mixed',
    qty: 1,
    unitCostUsd: wireCost,
    totalCostUsd: wireCost,
    notes: `${project.wires.map(w => w.gauge).filter((v, i, a) => a.indexOf(v) === i).join(', ')} stranded copper / FPC`
  });

  // 4. Enclosure
  const encCost = project.enclosure.material === 'Anodized Aluminum' ? 24.0 : 9.5;
  items.push({
    reference: 'ENC-01',
    name: `${project.enclosure.formFactor.replace('-', ' ').toUpperCase()} Enclosure (${project.enclosure.material})`,
    category: 'MECHANICAL',
    protocol: 'N/A',
    voltage: 'N/A',
    qty: 1,
    unitCostUsd: encCost,
    totalCostUsd: encCost,
    notes: `${project.enclosure.widthMm} x ${project.enclosure.heightMm} x ${project.enclosure.depthMm} mm, Wall: ${project.enclosure.wallThicknessMm}mm`
  });

  const grandTotalUsd = Math.round(items.reduce((acc, it) => acc + it.totalCostUsd, 0) * 100) / 100;

  return { items, grandTotalUsd };
}

export function exportBomCsv(project: DeviceProject): string {
  const { items, grandTotalUsd } = generateBom(project);
  const rows = [
    ['Designator', 'Component Name', 'Category', 'Protocol', 'Voltage', 'Qty', 'Unit Price ($)', 'Total Price ($)', 'Specifications'].map(s => `"${s}"`).join(',')
  ];

  for (const it of items) {
    rows.push(
      [
        it.reference,
        it.name,
        it.category,
        it.protocol,
        it.voltage,
        it.qty.toString(),
        it.unitCostUsd.toFixed(2),
        it.totalCostUsd.toFixed(2),
        it.notes
      ].map(s => `"${s}"`).join(',')
    );
  }

  rows.push(`"","GRAND TOTAL","","","","","","${grandTotalUsd.toFixed(2)}",""`);
  return rows.join('\n');
}
