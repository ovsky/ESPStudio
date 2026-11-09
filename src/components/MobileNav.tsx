import React from 'react';
import {
  Cpu,
  Box,
  Zap,
  Code,
  Play,
  FileSpreadsheet
} from 'lucide-react';
import { ActiveTab } from './Header';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  issuesCount: { errors: number; warnings: number };
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  issuesCount
}) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; isAlert?: boolean }> = [
    { id: 'canvas', label: 'Schematic', icon: <Cpu className="w-5 h-5" /> },
    { id: 'enclosure', label: '3D Device', icon: <Box className="w-5 h-5" /> },
    {
      id: 'rules',
      label: 'DRC',
      icon: <Zap className="w-5 h-5" />,
      isAlert: issuesCount.errors > 0 || issuesCount.warnings > 0
    },
    { id: 'firmware', label: 'Code', icon: <Code className="w-5 h-5" /> },
    { id: 'emulator', label: 'Run MCU', icon: <Play className="w-5 h-5" /> },
    { id: 'bom', label: 'BOM', icon: <FileSpreadsheet className="w-5 h-5" /> }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg flex items-center justify-around z-40 px-2 select-none">
      {tabs.map((tab) => {
        const isAct = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all cursor-pointer ${
              isAct ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.isAlert && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border border-slate-950" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
