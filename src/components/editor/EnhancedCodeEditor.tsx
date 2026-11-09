import React, { useState, useEffect } from 'react';
import {
  DeviceProject
} from '../../types/hardware';
import {
  generateFirmware,
  FirmwareTarget
} from '../../core/firmware-gen';
import {
  Code,
  Copy,
  Check,
  Download,
  Play,
  FileCode,
  Sparkles,
  Layers
} from 'lucide-react';

interface EnhancedCodeEditorProps {
  project: DeviceProject;
  code: string;
  onChangeCode: (code: string) => void;
  onRunCode: () => void;
}

export const EnhancedCodeEditor: React.FC<EnhancedCodeEditorProps> = ({
  project,
  code,
  onChangeCode,
  onRunCode
}) => {
  const [target, setTarget] = useState<FirmwareTarget>('arduino');
  const [copied, setCopied] = useState(false);

  // Re-generate code when target or project changes
  useEffect(() => {
    const generated = generateFirmware(project, target);
    onChangeCode(generated);
  }, [target, project, onChangeCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = target === 'arduino' ? 'ino' : target === 'platformio' ? 'ini' : target === 'micropython' || target === 'linux_python' ? 'py' : 'c';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_main.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const targets: Array<{ id: FirmwareTarget; label: string; tag: string }> = [
    { id: 'arduino', label: 'Arduino C++', tag: 'C++' },
    { id: 'espidf', label: 'ESP-IDF Native', tag: 'C' },
    { id: 'platformio', label: 'PlatformIO Config', tag: 'INI' },
    { id: 'micropython', label: 'MicroPython', tag: 'PY' },
    { id: 'linux_python', label: 'Linux Daemon (SBC)', tag: 'PY3' }
  ];

  return (
    <div className="w-full h-full bg-[#070b13] flex flex-col overflow-hidden text-slate-200">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-3 border-b border-slate-800 shrink-0">
        {/* Left: Framework Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => setTarget(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                target === t.id
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-mono text-cyan-400 font-bold">[{t.tag}]</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            title="Download source code"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={onRunCode}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Flash to Virtual MCU</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body with Line Numbers */}
      <div className="flex-1 min-h-0 flex bg-[#060a12] font-mono text-xs overflow-hidden">
        {/* Line Numbers */}
        <div className="w-12 bg-[#090d18] border-r border-slate-800/80 py-4 text-right pr-3 select-none text-slate-600 font-mono text-xs overflow-hidden">
          {code.split('\n').map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Editable Code Textarea */}
        <textarea
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          spellCheck={false}
          className="flex-1 h-full bg-transparent p-4 outline-none text-slate-200 resize-none font-mono text-xs leading-relaxed overflow-y-auto selection:bg-cyan-500 selection:text-black"
        />
      </div>
    </div>
  );
};
