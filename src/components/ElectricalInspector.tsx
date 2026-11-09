import React from 'react';
import {
  DeviceProject,
  CircuitValidationIssue
} from '../types/hardware';
import { calculatePowerBudget } from '../core/pin-rules';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Battery,
  Zap,
  Sliders,
  ShieldCheck,
  Flame,
  Info
} from 'lucide-react';

interface ElectricalInspectorProps {
  project: DeviceProject;
  issues: CircuitValidationIssue[];
  onUpdateBatteryCapacity: (capacityMah: number) => void;
  onUpdateDutyCycle: (percent: number) => void;
}

export const ElectricalInspector: React.FC<ElectricalInspectorProps> = ({
  project,
  issues,
  onUpdateBatteryCapacity,
  onUpdateDutyCycle
}) => {
  const budget = calculatePowerBudget(project);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="w-full h-full bg-[#070b13] text-slate-200 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Electrical DRC & Power Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated verification of electrical rules, 5V overvoltage hazards, bootstrap strapping pins, and power budgets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span><strong>{errors.length}</strong> Errors</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span><strong>{warnings.length}</strong> Warnings</span>
          </div>
        </div>
      </div>

      {/* Grid: Left = DRC Issues List, Right = Power Budget Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: DRC Rule Checks (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Design Rule Checks (DRC)
          </h3>

          {issues.length === 0 ? (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-white text-sm">All Circuit Rules Passed!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                No electrical overvoltage hazards, floating grounds, or strapping pin contention detected in the current schematic netlist.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const isErr = issue.severity === 'error';
                return (
                  <div
                    key={issue.id}
                    className={`rounded-2xl border p-4 space-y-2 transition-all ${
                      isErr
                        ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                        : 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isErr ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <h4 className="font-bold text-sm text-white">{issue.title}</h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {issue.description}
                    </p>

                    {issue.fixRecommendation && (
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-cyan-300 font-mono">
                        💡 <strong>Fix:</strong> {issue.fixRecommendation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Power Budget & Battery Life (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Power Budget & Battery Life
          </h3>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            {/* Battery Runtime Highlight */}
            <div className="bg-gradient-to-br from-cyan-950/80 to-slate-950 p-4 rounded-xl border border-cyan-500/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Estimated Battery Runtime</span>
                <span className="text-3xl font-extrabold text-cyan-300 font-mono">
                  {budget.batteryLifeHours} hrs
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  (~{budget.batteryLifeDays} continuous days)
                </span>
              </div>
              <Battery className="w-10 h-10 text-cyan-400" />
            </div>

            {/* Battery Capacity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">LiPo Battery Capacity</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {project.batteryCapacityMah} mAh
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="8000"
                step="100"
                value={project.batteryCapacityMah}
                onChange={(e) => onUpdateBatteryCapacity(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>500 mAh (Slim)</span>
                <span>8000 mAh (Powerbank)</span>
              </div>
            </div>

            {/* Duty Cycle Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">Active Work Duty Cycle</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {project.activeDutyCyclePercent}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={project.activeDutyCyclePercent}
                onChange={(e) => onUpdateDutyCycle(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1% (Deep Sleep)</span>
                <span>100% (Continuous On)</span>
              </div>
            </div>

            {/* Detailed Currents */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Active Peak Current</span>
                <span className="font-bold text-white text-sm">{budget.totalActiveMa} mA</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Deep-Sleep Current</span>
                <span className="font-bold text-emerald-400 text-sm">{budget.totalSleepMa} mA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
