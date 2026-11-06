import React from 'react';
import {
  Zap,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  BatteryCharging,
  Sliders,
  ShieldAlert,
  Flame,
  Cable
} from 'lucide-react';
import { DeviceProject, PinConflictRuleIssue } from '../types/hardware';
import { calculatePowerBudget } from '../core/power-budget';

interface ElectricalInspectorProps {
  project: DeviceProject;
  issues: PinConflictRuleIssue[];
  onUpdateBatteryCapacity: (capacityMah: number) => void;
  onUpdateDutyCycle: (percent: number) => void;
}

export const ElectricalInspector: React.FC<ElectricalInspectorProps> = ({
  project,
  issues,
  onUpdateBatteryCapacity,
  onUpdateDutyCycle
}) => {
  const powerBudget = calculatePowerBudget(project);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="w-full h-full bg-[#080d17] text-slate-200 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Banner DRC Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              errors.length > 0
                ? 'bg-rose-950/80 border border-rose-600 text-rose-400'
                : warnings.length > 0
                ? 'bg-amber-950/80 border border-amber-600 text-amber-400'
                : 'bg-emerald-950/80 border border-emerald-600 text-emerald-400'
            }`}
          >
            {errors.length > 0 ? (
              <XCircle className="w-6 h-6 animate-pulse" />
            ) : warnings.length > 0 ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Design Rule Check (DRC) & Electrical Safety
            </h2>
            <p className="text-xs text-slate-400">
              {errors.length > 0
                ? `${errors.length} Critical Electrical Errors requiring correction`
                : warnings.length > 0
                ? `${warnings.length} Warnings: Verify strapping pins and bus pull-ups`
                : 'All electrical connections, grounds, and signal buses verified compliant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300">
            {errors.length} Errors
          </span>
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300">
            {warnings.length} Warnings
          </span>
        </div>
      </div>

      {/* Grid: Left Column (Issues List) | Right Column (Power Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DRC Rule Findings */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Pinout & Circuit Rule Audit
          </h3>

          {issues.length === 0 ? (
            <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="font-semibold text-emerald-300 text-sm">Perfect Signal Integrity</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No floating grounds, no voltage domain clashes, and no strapping pin conflicts detected in the current design.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    issue.severity === 'error'
                      ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                      : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs">{issue.title}</span>
                    <span
                      className={`uppercase text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        issue.severity === 'error'
                          ? 'bg-rose-900 text-rose-200'
                          : 'bg-amber-900 text-amber-200'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{issue.description}</p>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-cyan-400">Recommendation: </strong>
                    {issue.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Power Budget & Battery Simulation */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            Power Budget & Battery Life Simulator
          </h3>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Active Draw</span>
              <span className="text-white font-bold text-sm">{powerBudget.totalActiveCurrentMa} mA</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Sleep Draw</span>
              <span className="text-cyan-300 font-bold text-sm">{powerBudget.totalSleepCurrentMa} mA</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Runtime (Hrs)</span>
              <span className="text-emerald-400 font-bold text-sm">{powerBudget.estimatedBatteryLifeHours} h</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Runtime (Days)</span>
              <span className="text-emerald-300 font-bold text-sm">{powerBudget.estimatedBatteryLifeDays} d</span>
            </div>
          </div>

          {/* Battery & Duty Cycle Controls */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>LiPo Battery Capacity</span>
                <span className="font-mono text-cyan-400 font-bold">{project.batteryCapacityMah} mAh</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={project.batteryCapacityMah}
                onChange={(e) => onUpdateBatteryCapacity(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">Set to 0 for continuous AC/USB-C powered devices.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span>Active Wake Duty Cycle</span>
                <span className="font-mono text-cyan-400 font-bold">{project.activeDutyCyclePercent}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={project.activeDutyCyclePercent}
                onChange={(e) => onUpdateDutyCycle(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1% (Periodic Beacon)</span>
                <span>50% (Interactive)</span>
                <span>100% (Continuous)</span>
              </div>
            </div>
          </div>

          {/* Wire Resistance & IR Drop */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Cable className="w-3.5 h-3.5 text-cyan-400" />
                Max Wire IR Drop
              </span>
              <span className="font-mono text-cyan-300">{powerBudget.maxVoltageDropVolts} V</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Calculated based on 22AWG/28AWG wire gauge resistance and peak current draws across the harness.
            </p>
          </div>

          {/* Engineering Advisories */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-2 text-xs">
            <span className="font-semibold text-slate-300 block">Engineering Recommendations:</span>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc pl-4">
              {powerBudget.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
              <li>Ensure bypass ceramic 100nF decoupling capacitors are installed close to each VCC pin.</li>
              <li>When using ESP32-P4 with MIPI-DSI, maintain 100 Ohm differential impedance on data pairs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
