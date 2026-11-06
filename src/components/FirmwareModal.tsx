import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { DeviceProject } from '../types/hardware';
import { generateFirmware, FirmwareTarget } from '../core/firmware-gen';

interface FirmwareModalProps {
  project: DeviceProject;
}

export const FirmwareModal: React.FC<FirmwareModalProps> = ({ project }) => {
  const [activeTarget, setActiveTarget] = useState<FirmwareTarget>('arduino');
  const [copied, setCopied] = useState(false);

  const code = generateFirmware(project, activeTarget);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filenameMap: Record<FirmwareTarget, string> = {
      arduino: `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ino`,
      'esp-idf': 'app_main.c',
      platformio: 'platformio.ini',
      micropython: 'main.py'
    };

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameMap[activeTarget];
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-[#080d17] text-slate-200 overflow-hidden flex flex-col p-4 md:p-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Firmware Code Generator</h2>
            <p className="text-xs text-slate-400">
              Target: <span className="text-cyan-400 font-mono font-semibold">{project.mcu.name}</span> with configured pinouts and buses
            </p>
          </div>
        </div>

        {/* Framework Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(
            [
              { id: 'arduino', label: 'Arduino C++' },
              { id: 'esp-idf', label: 'ESP-IDF C' },
              { id: 'platformio', label: 'PlatformIO' },
              { id: 'micropython', label: 'MicroPython' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTarget(t.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTarget === t.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="font-mono text-slate-400 ml-2">
              {activeTarget === 'arduino'
                ? 'main.ino'
                : activeTarget === 'esp-idf'
                ? 'main/app_main.c'
                : activeTarget === 'platformio'
                ? 'platformio.ini'
                : 'main.py'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400/90">
            {code.split('\n').length} lines
          </span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed selection:bg-cyan-500 selection:text-black">
          <pre className="whitespace-pre">{code}</pre>
        </div>
      </div>

      {/* Flashing Instructions Bar */}
      <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>
            Flash Command: <code className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">esptool.py --chip {project.mcu.family.toLowerCase().replace('-', '')} --port /dev/ttyUSB0 write_flash 0x0 build/{project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.bin</code>
          </span>
        </div>
        <span className="text-[11px] text-slate-500">Hold BOOT button if ROM fails to auto-sync.</span>
      </div>
    </div>
  );
};
