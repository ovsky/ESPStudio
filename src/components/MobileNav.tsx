import React from 'react';
import { Cpu, Box, Zap, Code, FileSpreadsheet, Terminal } from 'lucide-react';
import { ActiveTab } from './Header';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  issuesCount: { errors: number; warnings: number };
}

interface MobileTabItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'error' | 'warning' | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  issuesCount
}) => {
  const tabs: MobileTabItem[] = [
    { id: 'canvas', label: 'Schematic', shortLabel: 'CAD', icon: Cpu },
    { id: 'enclosure', label: '3D Device', shortLabel: '3D', icon: Box },
    {
      id: 'rules',
      label: 'DRC & Power',
      shortLabel: 'DRC',
      icon: Zap,
      badge: issuesCount.errors > 0 ? 'error' : issuesCount.warnings > 0 ? 'warning' : null
    },
    { id: 'firmware', label: 'Firmware', shortLabel: 'Code', icon: Code },
    { id: 'emulator', label: 'Runner', shortLabel: 'Run', icon: Terminal },
    { id: 'bom', label: 'BOM', shortLabel: 'BOM', icon: FileSpreadsheet }
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Main mobile navigation"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <div className="flex items-stretch justify-around px-1 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-w-0 max-w-[7rem] flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer touch-manipulation ${
                isActive
                  ? 'text-cyan-300 bg-cyan-500/10'
                  : 'text-slate-500 hover:text-slate-200 active:bg-slate-800/70'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              )}
              <div className="relative">
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.55)]' : ''}`} />
                {tab.badge === 'error' && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                )}
                {tab.badge === 'warning' && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                )}
              </div>
              <span className="truncate w-full text-center leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
