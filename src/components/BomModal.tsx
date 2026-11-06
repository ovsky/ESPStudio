import React from 'react';
import {
  FileSpreadsheet,
  Download,
  DollarSign,
  PackageCheck,
  Cpu,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { DeviceProject } from '../types/hardware';
import { generateBom, exportBomCsv } from '../core/bom-exporter';

interface BomModalProps {
  project: DeviceProject;
}

export const BomModal: React.FC<BomModalProps> = ({ project }) => {
  const [copied, setCopied] = React.useState(false);
  const { items, grandTotalUsd } = generateBom(project);

  const handleDownloadCsv = () => {
    const csvContent = exportBomCsv(project);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = () => {
    const csvContent = exportBomCsv(project);
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full bg-[#080d17] text-slate-200 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Bill of Materials (BOM) & Sourcing</h2>
            <p className="text-xs text-slate-400">
              Hardware line items, estimated part pricing, and mechanical enclosure cost
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy CSV'}</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Unique Line Items</span>
          <span className="text-xl font-bold text-white font-mono">{items.length} Parts</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Wiring Interconnects</span>
          <span className="text-xl font-bold text-cyan-400 font-mono">{project.wires.length} Wires</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Estimated Unit Production Cost</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">${grandTotalUsd.toFixed(2)} USD</span>
        </div>
      </div>

      {/* Interactive Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Ref</th>
                <th className="py-3 px-4">Component Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Interface</th>
                <th className="py-3 px-4">Voltage</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit ($)</th>
                <th className="py-3 px-4 text-right">Subtotal ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{it.reference}</td>
                  <td className="py-3 px-4 font-medium text-white">{it.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      {it.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{it.protocol}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{it.voltage}</td>
                  <td className="py-3 px-4 text-center font-mono">{it.qty}</td>
                  <td className="py-3 px-4 text-right font-mono">${it.unitCostUsd.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    ${it.totalCostUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-white">
              <tr>
                <td colSpan={7} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider font-mono">
                  Grand Total Bill of Materials:
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400 text-sm font-mono">
                  ${grandTotalUsd.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
