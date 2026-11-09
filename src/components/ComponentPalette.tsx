import React, { useState } from 'react';
import {
  MODULE_CATALOG
} from '../core/hardware-catalog';
import {
  ComponentCategory
} from '../types/hardware';
import {
  X,
  Plus,
  Tv,
  Keyboard,
  Radio,
  Volume2,
  Zap,
  Activity,
  Sliders,
  Search,
  Check
} from 'lucide-react';

interface ComponentPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (compTemplate: (typeof MODULE_CATALOG)[0]) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  isOpen,
  onClose,
  onSelectComponent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  if (!isOpen) return null;

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Modules' },
    { id: 'display', label: 'Displays' },
    { id: 'input', label: 'Input & Dials' },
    { id: 'connectivity', label: 'Modems & RF' },
    { id: 'audio', label: 'Audio Codecs' },
    { id: 'sensor', label: 'Sensors' },
    { id: 'actuator', label: 'Relays & Actuators' }
  ];

  const filtered = MODULE_CATALOG.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.protocol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="font-bold text-white text-sm">Add Modular Hardware Component</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search components by protocol, sensor type, display..."
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  selectedCat === cat.id
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectComponent(item);
                onClose();
              }}
              className="flex items-center justify-between p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all cursor-pointer group"
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                    {item.name}
                  </span>
                  <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                    {item.protocol}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {item.supplyVoltage} • {item.activeCurrentMa}mA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <button
                className="flex items-center gap-1 bg-cyan-600/80 group-hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
