import React, { useState } from 'react';
import {
  X,
  Plus,
  Search,
  Cpu,
  Tv,
  Radio,
  Sliders,
  Volume2,
  Battery,
  Flame,
  Activity,
  Layers
} from 'lucide-react';
import { MODULE_CATALOG } from '../core/hardware-catalog';
import { ComponentModule, ModuleCategory } from '../types/hardware';

interface ComponentPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (moduleTemplate: (typeof MODULE_CATALOG)[0]) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  isOpen,
  onClose,
  onSelectComponent
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Modules' },
    { id: 'display', label: 'Displays' },
    { id: 'connectivity', label: 'Cellular / LoRa' },
    { id: 'input', label: 'Keyboards & Dials' },
    { id: 'audio', label: 'I2S Audio' },
    { id: 'power', label: 'PMIC & Battery' },
    { id: 'actuator', label: 'Lighting & Relays' },
    { id: 'sensor', label: 'Sensors' }
  ];

  const filteredModules = MODULE_CATALOG.filter((mod) => {
    const matchesCat = selectedCategory === 'all' || mod.category === selectedCategory;
    const matchesSearch =
      mod.name.toLowerCase().includes(search.toLowerCase()) ||
      mod.description.toLowerCase().includes(search.toLowerCase()) ||
      mod.protocol.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white tracking-tight">Hardware Component Library</h3>
            <p className="text-xs text-slate-400">Select modules, displays, modems, or sensors to add to your design</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close component library"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search components by name, protocol (I2C, SPI, MIPI...), or function..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modules List Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map((mod) => (
            <div
              key={mod.typeId}
              className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    {mod.name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {mod.protocol}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{mod.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-4">
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {mod.operatingVoltage}
                  </span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-cyan-300">
                    {mod.powerCurrentActiveMa} mA active
                  </span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-emerald-300">
                    ${mod.estimatedCostUsd.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectComponent(mod);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-cyan-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Canvas</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
