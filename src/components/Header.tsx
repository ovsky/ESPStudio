import React from 'react';
import { Cpu, Box, Zap, Code, FileSpreadsheet, Plus, Download, RefreshCw, Smartphone, GitBranch } from 'lucide-react';
import { PRESET_PROJECTS, MCU_BOARDS } from '../core/hardware-catalog';
import { DeviceProject, McuFamily } from '../types/hardware';

export type ActiveTab = 'canvas' | 'enclosure' | 'rules' | 'firmware' | 'bom';

interface HeaderProps {
  project: DeviceProject;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onLoadPreset: (presetId: string) => void;
  onChangeMcu: (family: McuFamily) => void;
  onOpenAddModule: () => void;
  onExportJson: () => void;
  onResetProject: () => void;
  issuesCount: { errors: number; warnings: number };
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeTab,
  onTabChange,
  onLoadPreset,
  onChangeMcu,
  onOpenAddModule,
  onExportJson,
  onResetProject,
  issuesCount
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-200 sticky top-0 z-40">
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold ring-1 ring-white/20">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">ESP-Forge Studio</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.0.0
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <GitBranch className="w-3 h-3 text-cyan-400" /> main
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-xs">{project.name}</p>
          </div>
        </div>

        {/* Preset Selector & MCU family */}
        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs max-w-full">
            <span className="text-slate-400 px-1 font-medium hidden md:inline">Preset:</span>
            <select
              aria-label="Select device template preset"
              value={project.id.startsWith('preset-') ? project.id : ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-1 outline-none focus:border-cyan-500 cursor-pointer max-w-[140px] sm:max-w-xs truncate"
            >
              <option value="" disabled>Custom Project</option>
              {PRESET_PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <span className="text-slate-600 px-0.5">|</span>

            <select
              aria-label="Select microcontroller board"
              value={project.mcu.family}
              onChange={(e) => onChangeMcu(e.target.value as McuFamily)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono rounded px-1.5 py-1 outline-none focus:border-cyan-500 cursor-pointer max-w-[105px] sm:max-w-none truncate"
            >
              {MCU_BOARDS.map((m) => (
                <option key={m.id} value={m.family}>
                  {m.family}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop View Modes */}
        <nav className="hidden lg:flex items-center bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onTabChange('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'canvas'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Schematic CAD</span>
          </button>

          <button
            onClick={() => onTabChange('enclosure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'enclosure'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Enclosure</span>
          </button>

          <button
            onClick={() => onTabChange('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all relative ${
              activeTab === 'rules'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>DRC & Power</span>
            {issuesCount.errors > 0 ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            ) : issuesCount.warnings > 0 ? (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            ) : null}
          </button>

          <button
            onClick={() => onTabChange('firmware')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'firmware'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Firmware</span>
          </button>

          <button
            onClick={() => onTabChange('bom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'bom'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>BOM</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModule}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Module</span>
          </button>

          <button
            onClick={onExportJson}
            title="Download Project JSON specification"
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Export Project JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onResetProject}
            title="Reset to blank canvas"
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Reset Canvas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
