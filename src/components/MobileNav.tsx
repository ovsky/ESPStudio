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
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'error' | 'warning' | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  issuesCount
}) => {
  const tabs: MobileTabItem[] = [
    { id: 'canvas', label: 'Schematic', icon: Cpu },
    { id: 'enclosure', label: '3D Device', icon: Box },
    { id: 'rules', label: 'DRC', icon: Zap, badge: issuesCount.errors > 0 ? 'error' : issuesCount.warnings > 0 ? 'warning' : null },
    { id: 'firmware', label: 'Firmware', icon: Code },
    { id: 'emulator', label: 'Runner', icon: Terminal },
    { id: 'bom', label: 'BOM', icon: FileSpreadsheet }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-2 text-slate-400">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id as ActiveTab)}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all relative cursor-pointer ${
              isActive ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {t.badge === 'error' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
              {t.badge === 'warning' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
