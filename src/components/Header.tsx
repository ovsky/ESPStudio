import React, { useState } from 'react';
import {
  Cpu,
  Box,
  Zap,
  Code,
  FileSpreadsheet,
  Plus,
  Download,
  RefreshCw,
  Smartphone,
  GitBranch,
  Terminal,
  Play,
  EyeOff,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PRESET_PROJECTS, MCU_BOARDS } from '../core/hardware-catalog';
import { DeviceProject, McuFamily } from '../types/hardware';

export type ActiveTab = 'canvas' | 'enclosure' | 'rules' | 'firmware' | 'emulator' | 'bom';

interface HeaderProps {
  project: DeviceProject;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onLoadPreset: (presetId: string) => void;
  onChangeMcu: (family: McuFamily) => void;
  onOpenAddModule: () => void;
  onExportJson: () => void;
  onResetProject: () => void;
  onToggleUi?: () => void;
  issuesCount: { errors: number; warnings: number };
}

interface NavItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
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
  onToggleUi,
  issuesCount
}) => {
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'canvas', label: 'Schematic CAD', shortLabel: 'Schematic', icon: Cpu },
    { id: 'enclosure', label: '3D Real Device', shortLabel: '3D', icon: Box },
    { id: 'rules', label: 'DRC & Power', shortLabel: 'DRC', icon: Zap },
    { id: 'firmware', label: 'Firmware', shortLabel: 'Firmware', icon: Code },
    { id: 'emulator', label: 'Virtual Runner', shortLabel: 'Runner', icon: Terminal, accent: 'text-amber-400' },
    { id: 'bom', label: 'BOM', shortLabel: 'BOM', icon: FileSpreadsheet }
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 text-slate-200 sticky top-0 z-40">
      {/* Compact top row: brand + primary actions */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold ring-1 ring-white/20 shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                ESP-Forge
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Studio
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <GitBranch className="w-3 h-3 text-cyan-400" /> main
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[260px]">
              {project.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => onTabChange('emulator')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg shadow-md transition-all cursor-pointer"
            title="Run code in ESP32 emulator and serial monitor"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Run</span>
          </button>

          <button
            onClick={onOpenAddModule}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg shadow-md transition-all cursor-pointer"
            title="Add a module to the schematic"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Add Module</span>
          </button>

          <button
            onClick={() => setMobileOptionsOpen((value) => !value)}
            className={`lg:hidden p-2 rounded-lg border transition-colors cursor-pointer ${
              mobileOptionsOpen
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Preset & board options"
            aria-label="Toggle preset and board options"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            onClick={onExportJson}
            title="Download Project JSON specification"
            className="hidden sm:block p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Export Project JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onResetProject}
            title="Reset to blank canvas"
            className="hidden sm:block p-2 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Reset Canvas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onToggleUi && (
            <button
              onClick={onToggleUi}
              title="Hide header and navigation for more workspace"
              className="p-2 text-slate-400 hover:text-cyan-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
              aria-label="Hide UI chrome"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop second row: preset / board + full nav */}
      <div className="hidden lg:flex items-center justify-between gap-3 px-4 pb-2 border-t border-slate-800/70">
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs">
          <span className="text-slate-400 px-1 font-medium">Preset:</span>
          <select
            aria-label="Select device template preset"
            value={project.id.startsWith('preset-') ? project.id : ''}
            onChange={(e) => onLoadPreset(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-1 outline-none focus:border-cyan-500 cursor-pointer max-w-[210px] truncate"
          >
            <option value="" disabled>Custom Project</option>
            {PRESET_PROJECTS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          <span className="text-slate-600 px-0.5">|</span>

          <select
            aria-label="Select microcontroller board"
            value={project.mcu.family}
            onChange={(e) => onChangeMcu(e.target.value as McuFamily)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono rounded px-1.5 py-1 outline-none focus:border-cyan-500 cursor-pointer max-w-[230px] truncate"
          >
            {MCU_BOARDS.map((board) => (
              <option key={board.id} value={board.family}>
                {board.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex items-center bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs font-medium overflow-x-auto">
          {navItems.map(({ id, label, shortLabel, icon: Icon, accent }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${activeTab === id ? '' : accent ?? ''}`} />
              <span className="hidden xl:inline">{label}</span>
              <span className="xl:hidden">{shortLabel}</span>
              {id === 'rules' && (issuesCount.errors > 0 || issuesCount.warnings > 0) && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    issuesCount.errors > 0 ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile preset / board drawer */}
      {mobileOptionsOpen && (
        <div className="lg:hidden px-3 pb-3 pt-2 border-t border-slate-800/70 space-y-2 bg-slate-950/60 animate-in fade-in slide-in-from-top-1">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Device preset</span>
            <select
              aria-label="Select device template preset"
              value={project.id.startsWith('preset-') ? project.id : ''}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-2 outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="" disabled>Custom Project</option>
              {PRESET_PROJECTS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Microcontroller board</span>
            <select
              aria-label="Select microcontroller board"
              value={project.mcu.family}
              onChange={(e) => onChangeMcu(e.target.value as McuFamily)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono rounded-lg px-2 py-2 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {MCU_BOARDS.map((board) => (
                <option key={board.id} value={board.family}>
                  {board.name} · {board.clockSpeedMhz}MHz
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={onExportJson}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={onResetProject}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      )}

      {/* Mobile hint for the current view */}
      <div className="lg:hidden px-3 pb-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5">
          <Smartphone className="w-3 h-3 text-cyan-500" />
          {navItems.find((item) => item.id === activeTab)?.label}
        </span>
        <button
          onClick={() => setMobileOptionsOpen((value) => !value)}
          className="flex items-center gap-0.5 text-slate-500 hover:text-cyan-300 cursor-pointer"
        >
          {mobileOptionsOpen ? 'Less' : 'Preset & board'}
          {mobileOptionsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
    </header>
  );
};
