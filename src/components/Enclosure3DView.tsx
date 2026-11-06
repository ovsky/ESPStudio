import React, { useState } from 'react';
import {
  Box,
  Layers,
  Sliders,
  Rotate3d,
  Maximize2,
  Cpu,
  Tv,
  Battery,
  Radio,
  FileDown
} from 'lucide-react';
import { DeviceProject, DeviceEnclosureSpecs } from '../types/hardware';

interface Enclosure3DViewProps {
  project: DeviceProject;
  onUpdateEnclosure: (specs: Partial<DeviceEnclosureSpecs>) => void;
}

type ViewAngle = 'isometric' | 'front' | 'top' | 'side';

export const Enclosure3DView: React.FC<Enclosure3DViewProps> = ({
  project,
  onUpdateEnclosure
}) => {
  const [viewAngle, setViewAngle] = useState<ViewAngle>('isometric');
  const [showShell, setShowShell] = useState(true);
  const [showInternalPcb, setShowInternalPcb] = useState(true);
  const [showWires, setShowWires] = useState(true);
  const [showBattery, setShowBattery] = useState(true);

  const enc = project.enclosure;

  // Compute physical metrics
  const volumeCm3 = Math.round((enc.widthMm * enc.heightMm * enc.depthMm) / 1000);
  const materialDensity = enc.material === 'Anodized Aluminum' ? 2.7 : enc.material === 'CNC Polycarbonate' ? 1.2 : 1.27;
  const estimatedWeightGrams = Math.round((volumeCm3 * 0.35) * materialDensity);

  // Isometric transform angles
  const getTransformStyle = () => {
    switch (viewAngle) {
      case 'isometric':
        return 'rotateX(58deg) rotateZ(-38deg) translateZ(0px)';
      case 'front':
        return 'rotateX(0deg) rotateZ(0deg)';
      case 'top':
        return 'rotateX(0deg) rotateZ(0deg) scale(0.95)';
      case 'side':
        return 'rotateX(0deg) rotateY(75deg)';
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#080d17] text-slate-200 overflow-hidden">
      {/* 3D CAD Stage */}
      <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden bg-gradient-to-b from-[#080d17] to-[#04070e]">
        {/* Engineering Drafting Grid Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0),
              linear-gradient(to right, #1e293b 1px, transparent 1px),
              linear-gradient(to bottom, #1e293b 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px, 100px 100px, 100px 100px'
          }}
        />

        {/* View Angle Pill Selector */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-xl shadow-lg text-xs">
          {(['isometric', 'front', 'top', 'side'] as ViewAngle[]).map((angle) => (
            <button
              key={angle}
              onClick={() => setViewAngle(angle)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                viewAngle === angle
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {angle}
            </button>
          ))}
        </div>

        {/* Dimension Labels */}
        <div className="absolute bottom-4 left-4 z-20 text-[11px] font-mono text-cyan-400/80 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-cyan-900/40">
          W: {enc.widthMm}mm × H: {enc.heightMm}mm × D: {enc.depthMm}mm (t: {enc.wallThicknessMm}mm)
        </div>

        {/* 3D Model Enclosure Representation */}
        <div
          style={{ perspective: '1200px' }}
          className="w-full h-full flex items-center justify-center"
        >
          <div
            style={{
              transform: getTransformStyle(),
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="relative transition-all duration-500 shadow-2xl"
          >
            {/* Outer Enclosure Shell */}
            <div
              style={{
                width: `${Math.min(420, enc.widthMm * 2.8)}px`,
                height: `${Math.min(540, enc.heightMm * 2.8)}px`,
                backgroundColor: showShell ? enc.colorHex : 'transparent',
                borderColor: '#38bdf840',
                borderWidth: `${Math.max(2, enc.wallThicknessMm)}px`
              }}
              className="rounded-3xl p-5 border shadow-2xl transition-all relative overflow-hidden backdrop-blur-sm"
            >
              {/* Metallic / Texture Sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-black/40 pointer-events-none rounded-3xl" />

              {/* Antenna Cutout Window */}
              {enc.hasAntennaCutout && (
                <div className="absolute top-2 right-6 w-8 h-3 rounded-full bg-slate-950/80 border border-cyan-500/40 flex items-center justify-center">
                  <Radio className="w-2.5 h-2.5 text-cyan-400" />
                </div>
              )}

              {/* Internal PCB Board Representation */}
              {showInternalPcb && (
                <div className="w-full h-full rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/60 p-4 shadow-inner flex flex-col justify-between relative">
                  {/* Silk Screen Grid Lines */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none rounded-2xl"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, #34d399 1.5px, transparent 0)',
                      backgroundSize: '16px 16px'
                    }}
                  />

                  {/* Top Section: Display / UI Modules */}
                  <div className="relative z-10">
                    <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 shadow-md mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5 text-cyan-400" />
                          Display & Input Deck
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">{project.components[0]?.name || 'Display Deck'}</span>
                      </div>
                      <div className="h-24 bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
                        [Active UI Surface: 480×320 IPS]
                      </div>
                    </div>
                  </div>

                  {/* Center Section: MCU SoC */}
                  <div className="relative z-10 flex items-center justify-center my-2">
                    <div className="w-32 h-32 rounded-xl bg-slate-900 border-2 border-cyan-400/80 shadow-lg shadow-cyan-900/50 flex flex-col items-center justify-center p-2 text-center">
                      <Cpu className="w-6 h-6 text-cyan-400 mb-1" />
                      <span className="font-bold text-[11px] text-white leading-tight">{project.mcu.name}</span>
                      <span className="text-[9px] font-mono text-cyan-400">{project.mcu.family}</span>
                      <span className="text-[8px] font-mono text-slate-400 mt-1">{project.mcu.clockSpeedMhz} MHz</span>
                    </div>
                  </div>

                  {/* Bottom Section: Battery Compartment & Modems */}
                  {showBattery && enc.hasBatteryBay && (
                    <div className="relative z-10 bg-amber-950/40 border border-amber-600/50 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-semibold text-amber-200 block">LiPo Battery Bay</span>
                          <span className="text-[10px] font-mono text-amber-400/90">{project.batteryCapacityMah} mAh Cell</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60">
                        3.7V Nominal
                      </span>
                    </div>
                  )}

                  {/* 4 Corner Standoff Screws */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 rounded-full border border-slate-400/60 bg-slate-800 flex items-center justify-center text-[7px] text-slate-400">+</div>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border border-slate-400/60 bg-slate-800 flex items-center justify-center text-[7px] text-slate-400">+</div>
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 rounded-full border border-slate-400/60 bg-slate-800 flex items-center justify-center text-[7px] text-slate-400">+</div>
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full border border-slate-400/60 bg-slate-800 flex items-center justify-center text-[7px] text-slate-400">+</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Properties & Enclosure Customizer Panel */}
      <div className="w-full lg:w-80 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto space-y-6">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-1">
            <Box className="w-4 h-4 text-cyan-400" />
            Enclosure CAD Parameters
          </h3>
          <p className="text-xs text-slate-400">Mechanical casing, standoffs & physical footprint</p>
        </div>

        {/* Physical Metrics Card */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Displacement</span>
            <span className="text-white font-bold">{volumeCm3} cm³</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Est. Weight</span>
            <span className="text-cyan-400 font-bold">{estimatedWeightGrams} g</span>
          </div>
        </div>

        {/* Material Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 block">Enclosure Material</label>
          <select
            value={enc.material}
            onChange={(e) => onUpdateEnclosure({ material: e.target.value as any })}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="Anodized Aluminum">Anodized Aluminum (CNC)</option>
            <option value="3D-Printed PETG">3D-Printed PETG (FDM)</option>
            <option value="CNC Polycarbonate">CNC Polycarbonate (Clear/Smoke)</option>
            <option value="FR4 PCB Shell">FR4 PCB Shell Plate</option>
          </select>
        </div>

        {/* Color Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 block">Shell Finish Tint</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={enc.colorHex}
              onChange={(e) => onUpdateEnclosure({ colorHex: e.target.value })}
              className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-400">{enc.colorHex.toUpperCase()}</span>
          </div>
        </div>

        {/* Dimensional Sliders */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Width (X-Axis)</span>
              <span className="font-mono text-cyan-400">{enc.widthMm} mm</span>
            </div>
            <input
              type="range"
              min="50"
              max="240"
              value={enc.widthMm}
              onChange={(e) => onUpdateEnclosure({ widthMm: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Height (Y-Axis)</span>
              <span className="font-mono text-cyan-400">{enc.heightMm} mm</span>
            </div>
            <input
              type="range"
              min="50"
              max="240"
              value={enc.heightMm}
              onChange={(e) => onUpdateEnclosure({ heightMm: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Depth (Z-Axis Thickness)</span>
              <span className="font-mono text-cyan-400">{enc.depthMm} mm</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={enc.depthMm}
              onChange={(e) => onUpdateEnclosure({ depthMm: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Wall Shell Thickness</span>
              <span className="font-mono text-cyan-400">{enc.wallThicknessMm} mm</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={enc.wallThicknessMm}
              onChange={(e) => onUpdateEnclosure({ wallThicknessMm: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-2 border-t border-slate-800 pt-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showShell}
              onChange={(e) => setShowShell(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span className="text-slate-300">Show Outer Enclosure Shell</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInternalPcb}
              onChange={(e) => setShowInternalPcb(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span className="text-slate-300">Show Internal Motherboard PCB</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBattery}
              onChange={(e) => setShowBattery(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span className="text-slate-300">Show LiPo Battery Bay</span>
          </label>
        </div>
      </div>
    </div>
  );
};
