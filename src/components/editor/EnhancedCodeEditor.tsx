import React, { useState, useEffect } from 'react';
import {
  Code,
  Play,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  Terminal,
  FileCode,
  Sliders,
  Settings
} from 'lucide-react';
import { DeviceProject } from '../../types/hardware';
import { generateFirmware, FirmwareTarget } from '../../core/firmware-gen';

interface EnhancedCodeEditorProps {
  project: DeviceProject;
  code: string;
  onChangeCode: (newCode: string) => void;
  onRunCode: () => void;
}

export const EnhancedCodeEditor: React.FC<EnhancedCodeEditorProps> = ({
  project,
  code,
  onChangeCode,
  onRunCode
}) => {
  const [activeTarget, setActiveTarget] = useState<FirmwareTarget>('arduino');
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('auto');

  // Regenerate template when target or project changes if user hasn't heavily modified it
  useEffect(() => {
    if (selectedTemplate === 'auto') {
      const generated = generateFirmware(project, activeTarget);
      onChangeCode(generated);
    }
  }, [project, activeTarget, selectedTemplate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeTarget === 'arduino' ? '.ino' : activeTarget === 'esp-idf' ? '.c' : activeTarget === 'platformio' ? '.ini' : '.py';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="w-full h-full bg-[#080d17] text-slate-200 overflow-hidden flex flex-col p-4 md:p-6 space-y-4">
      {/* Top Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Interactive Firmware IDE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Live Editable
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Target: <strong className="text-cyan-400 font-mono">{project.mcu.name}</strong> ({project.mcu.family})
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
              onClick={() => {
                setActiveTarget(t.id);
                setSelectedTemplate('auto');
              }}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRunCode}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Run on Device</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 text-xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 text-xs transition-colors cursor-pointer"
            title="Download code file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Editor Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="font-mono text-slate-400 ml-2">
              src/main.{activeTarget === 'arduino' ? 'ino' : activeTarget === 'esp-idf' ? 'c' : activeTarget === 'platformio' ? 'ini' : 'py'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>UTF-8</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Code Input Area with Line Numbers */}
        <div className="flex-1 flex overflow-hidden">
          {/* Line Numbers Column */}
          <div className="w-12 bg-slate-950/80 border-r border-slate-900 text-slate-600 font-mono text-xs py-3 select-none text-right pr-3 overflow-hidden leading-[1.6]">
            {lineNumbers.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Editable Textarea */}
          <textarea
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-slate-200 font-mono text-xs p-3 leading-[1.6] outline-none resize-none overflow-auto whitespace-pre selection:bg-cyan-500 selection:text-black"
          />
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Edit code freely or click <strong>"Run on Device"</strong> to launch in the virtual ESP32 simulator with live serial logs.</span>
        </div>
        <span className="font-mono text-cyan-400/90 text-[11px]">FreeRTOS Core 0/1 Active</span>
      </div>
    </div>
  );
};
