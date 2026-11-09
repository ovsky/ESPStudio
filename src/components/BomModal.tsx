import React from 'react';
import { DeviceProject } from '../types/hardware';
import {
  FileSpreadsheet,
  Download,
  DollarSign,
  PackageCheck,
  Cpu,
  Layers,
  ExternalLink
} from 'lucide-react';

interface BomModalProps {
  project: DeviceProject;
}

export const BomModal: React.FC<BomModalProps> = ({ project }) => {
  // Compute pricing for components & MCU
  const items: Array<{
    designator: string;
    partName: string;
    category: string;
    qty: number;
    unitPriceUsd: number;
    supplier: string;
    partNumber: string;
  }> = [
    {
      designator: 'U1',
      partName: project.mcu.name,
      category: 'Microcontroller / SoC',
      qty: 1,
      unitPriceUsd: project.mcu.family === 'ESP32-P4' ? 6.20 : project.mcu.category === 'sbc' ? 24.00 : 3.80,
      supplier: 'Espressif / Mouser / DigiKey',
      partNumber: project.mcu.id.toUpperCase()
    },
    ...project.components.map((c, idx) => ({
      designator: `MOD${idx + 1}`,
      partName: c.name,
      category: c.category.toUpperCase(),
      qty: 1,
      unitPriceUsd: c.category === 'display' ? 8.50 : c.category === 'connectivity' ? 22.00 : c.category === 'actuator' ? 4.20 : 3.50,
      supplier: 'LCSC / Adafruit / SparkFun',
      partNumber: c.typeId.toUpperCase()
    })),
    ...(project.batteryCapacityMah > 0
      ? [
          {
            designator: 'BT1',
            partName: `${project.batteryCapacityMah}mAh 3.7V LiPo Pouch Cell`,
            category: 'POWER',
            qty: 1,
            unitPriceUsd: 6.50,
            supplier: 'PKCELL / Amazon',
            partNumber: 'LP-804060'
          }
        ]
      : []),
    {
      designator: 'ENC1',
      partName: `${project.enclosure.formFactor} (${project.enclosure.material})`,
      category: 'MECHANICAL',
      qty: 1,
      unitPriceUsd: project.enclosure.material === 'Anodized Aluminum' ? 18.00 : 4.50,
      supplier: 'JLCPCB 3D / CNC Machining',
      partNumber: 'ENC-CUSTOM-CAD'
    }
  ];

  const totalCost = items.reduce((sum, item) => sum + item.qty * item.unitPriceUsd, 0);

  const handleExportCsv = () => {
    const headers = ['Designator', 'Part Name', 'Category', 'Quantity', 'Unit Price ($)', 'Subtotal ($)', 'Supplier', 'MPN'];
    const rows = items.map((i) => [
      i.designator,
      `"${i.partName}"`,
      i.category,
      i.qty,
      i.unitPriceUsd.toFixed(2),
      (i.qty * i.unitPriceUsd).toFixed(2),
      `"${i.supplier}"`,
      i.partNumber
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_BOM.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-[#070b13] text-slate-200 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <span>Bill of Materials (BOM) & Sourcing</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete parts breakdown with designators, estimated sourcing costs, and manufacturer part numbers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Total Prototyping Cost: </span>
            <strong className="text-emerald-400 text-sm">${totalCost.toFixed(2)} USD</strong>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-3.5">Designator</th>
                <th className="p-3.5">Component / Part Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-center">Qty</th>
                <th className="p-3.5 text-right">Unit Price</th>
                <th className="p-3.5 text-right">Extended</th>
                <th className="p-3.5">Recommended Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5 font-bold text-cyan-400">{item.designator}</td>
                  <td className="p-3.5 font-sans font-medium text-white">{item.partName}</td>
                  <td className="p-3.5 text-slate-400 text-[11px]">{item.category}</td>
                  <td className="p-3.5 text-center text-slate-300 font-bold">{item.qty}</td>
                  <td className="p-3.5 text-right text-slate-400">${item.unitPriceUsd.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-bold text-emerald-400">
                    ${(item.qty * item.unitPriceUsd).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-slate-400 font-sans text-xs flex items-center justify-between">
                    <span>{item.supplier}</span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      In Stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
