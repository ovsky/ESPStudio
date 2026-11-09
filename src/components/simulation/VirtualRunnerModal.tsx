import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Terminal,
  Cpu,
  Tv,
  Zap,
  Activity,
  Flame,
  Battery,
  Sliders,
  Send,
  Trash2,
  Copy,
  Check,
  Radio,
  Sparkles,
  Smartphone
} from 'lucide-react';
import {
  DeviceProject,
  VirtualHardwareState,
  SerialLogEntry,
  SimulationStatus
} from '../../types/hardware';
import {
  createInitialHardwareState,
  generateBootloaderLogs,
  processSerialCommand,
  stepSimulation
} from '../../core/esp-emulator';
import {
  renderDisplayToCanvas,
  handleDisplayTouch
} from '../../core/interactive-display';

interface VirtualRunnerModalProps {
  project: DeviceProject;
  activeCode: string;
  virtualState: VirtualHardwareState;
  onUpdateVirtualState: (state: VirtualHardwareState) => void;
  logs: SerialLogEntry[];
  onAddLog: (entry: SerialLogEntry) => void;
  onClearLogs: () => void;
}

export const VirtualRunnerModal: React.FC<VirtualRunnerModalProps> = ({
  project,
  activeCode,
  virtualState,
  onUpdateVirtualState,
  logs,
  onAddLog,
  onClearLogs
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play audio frequency feedback for dialer keys / tap feedback
  const playTone = (freq: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio playback silently ignored if blocked by autoplay policy
    }
  };

  // Render display canvas whenever virtualState changes
  useEffect(() => {
    if (displayCanvasRef.current) {
      renderDisplayToCanvas(displayCanvasRef.current, virtualState, project);
    }
  }, [virtualState, project]);

  // Handle Touch/Click on Display Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 512 / rect.width;
    const scaleY = 384 / rect.height;
    const clickX = Math.max(0, Math.min(512, (e.clientX - rect.left) * scaleX));
    const clickY = Math.max(0, Math.min(384, (e.clientY - rect.top) * scaleY));

    const { updatedState, serialEvent, audioFreq } = handleDisplayTouch(
      virtualState,
      clickX,
      clickY,
      project
    );

    if (audioFreq) {
      playTone(audioFreq);
    }

    onUpdateVirtualState(updatedState);

    if (serialEvent) {
      onAddLog({
        id: `touch_${Date.now()}_${Math.random()}`,
        timestampMs: Date.now(),
        level: 'info',
        text: serialEvent
      });
    }
  };

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Simulation Timer Hook (steps every 1000ms when running)
  useEffect(() => {
    if (virtualState.status !== 'running') return;

    const interval = setInterval(() => {
      const { nextState, newLogs } = stepSimulation(virtualState);
      onUpdateVirtualState(nextState);
      newLogs.forEach(onAddLog);
    }, 1000);

    return () => clearInterval(interval);
  }, [virtualState, onUpdateVirtualState, onAddLog]);

  // Handle Play / Flash
  const handleStartSimulation = () => {
    onClearLogs();
    const bootLogs = generateBootloaderLogs(project);
    bootLogs.forEach(onAddLog);

    onUpdateVirtualState({
      ...createInitialHardwareState(project),
      status: 'running'
    });
  };

  // Handle Pause
  const handlePauseSimulation = () => {
    onUpdateVirtualState({
      ...virtualState,
      status: virtualState.status === 'running' ? 'paused' : 'running'
    });
  };

  // Handle Stop
  const handleStopSimulation = () => {
    onAddLog({
      id: `stop_${Date.now()}`,
      timestampMs: Date.now(),
      level: 'warn',
      text: '[SYS] MCU execution halted by user. CPU clock gates disabled.'
    });
    onUpdateVirtualState({
      ...virtualState,
      status: 'stopped'
    });
  };

  // Handle Hardware Reset
  const handleResetMcu = () => {
    onAddLog({
      id: `rst_${Date.now()}`,
      timestampMs: Date.now(),
      level: 'warn',
      text: '[HARDWARE] EN (Reset) pin pulled LOW. Re-booting MCU...'
    });
    const bootLogs = generateBootloaderLogs(project);
    bootLogs.forEach(onAddLog);

    onUpdateVirtualState({
      ...createInitialHardwareState(project),
      status: 'running'
    });
  };

  // Send Command to Serial Monitor
  const handleSendCommand = (cmd?: string) => {
    const textToSend = cmd || commandInput;
    if (!textToSend.trim()) return;

    onAddLog({
      id: `tx_${Date.now()}`,
      timestampMs: Date.now(),
      level: 'tx',
      text: `> ${textToSend}`
    });

    const { response, nextState } = processSerialCommand(textToSend, virtualState);

    if (Object.keys(nextState).length > 0) {
      onUpdateVirtualState({
        ...virtualState,
        ...nextState
      });
    }

    response.forEach((line) => {
      onAddLog({
        id: `rx_${Date.now()}_${Math.random()}`,
        timestampMs: Date.now(),
        level: line.startsWith('ERR') ? 'error' : 'rx',
        text: line
      });
    });

    if (!cmd) setCommandInput('');
  };

  // Copy Serial Logs
  const handleCopyLogs = () => {
    const allText = logs.map((l) => `[${new Date(l.timestampMs).toLocaleTimeString()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full bg-[#070b13] text-slate-200 overflow-hidden flex flex-col p-4 md:p-6 space-y-4">
      {/* Top Simulation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/95 border border-slate-800 p-3.5 rounded-2xl shadow-xl shrink-0">
        {/* Left: Execution Controls */}
        <div className="flex items-center gap-2">
          {virtualState.status !== 'running' ? (
            <button
              onClick={handleStartSimulation}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Flash & Run</span>
            </button>
          ) : (
            <button
              onClick={handlePauseSimulation}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStopSimulation}
            disabled={virtualState.status === 'stopped'}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-900/80 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>

          <button
            onClick={handleResetMcu}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Simulate Hardware RST Pin"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset MCU</span>
          </button>
        </div>

        {/* Center: Status Indicators */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                virtualState.status === 'running'
                  ? 'bg-emerald-400 animate-ping'
                  : virtualState.status === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-bold text-white uppercase text-[11px]">{virtualState.status}</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">{virtualState.uptimeSeconds}s Uptime</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400 text-[11px]">
            <span>CPU: <strong className="text-white">{virtualState.activeFrequencyMhz}MHz</strong></span>
            <span>Heap: <strong className="text-emerald-400">{Math.round(virtualState.freeHeapBytes / 1024)}KB</strong></span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={onClearLogs}
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Clear Serial Monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Serial Terminal Console, Right = Virtual Hardware Actuators */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Serial Terminal Console (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white tracking-tight">UART0 Virtual Serial Monitor</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                115200 baud
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Autoscroll</span>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 selection:bg-cyan-500 selection:text-black">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-700" />
                <p>Virtual Serial Terminal idle.</p>
                <p className="text-[11px] text-slate-500">
                  Click <strong>"Flash & Run"</strong> to execute firmware and view boot logs.
                </p>
              </div>
            ) : (
              logs.map((log) => {
                const time = new Date(log.timestampMs).toLocaleTimeString();
                let colorClass = 'text-slate-300';
                if (log.level === 'boot') colorClass = 'text-amber-400 font-semibold';
                if (log.level === 'info') colorClass = 'text-cyan-300';
                if (log.level === 'warn') colorClass = 'text-amber-300';
                if (log.level === 'error') colorClass = 'text-rose-400 font-bold';
                if (log.level === 'tx') colorClass = 'text-emerald-400';
                if (log.level === 'rx') colorClass = 'text-white font-semibold';

                return (
                  <div key={log.id} className="flex gap-2.5">
                    <span className="text-slate-600 select-none shrink-0">[{time}]</span>
                    <span className={colorClass}>{log.text}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Interactive AT Command Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center gap-2 p-2.5 bg-slate-900 border-t border-slate-800"
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Send UART command (e.g., 'AT', 'STATUS', 'RELAY1 ON')..."
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Right: Virtual Physical Hardware & Actuators (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 overflow-y-auto">
          {/* Active Capacitive Touchscreen Display Simulation */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-cyan-400" />
                Capacitive Touchscreen (512×384 IPS)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Touch Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  60 FPS
                </span>
              </div>
            </div>

            {/* Interactive Canvas Surface */}
            <div className="relative group rounded-xl overflow-hidden border border-cyan-500/30 shadow-inner shadow-cyan-950/50 bg-[#040810]">
              <canvas
                ref={displayCanvasRef}
                width={512}
                height={384}
                onClick={handleCanvasClick}
                className="w-full h-auto aspect-[4/3] cursor-pointer touch-none select-none block"
                title="Tap or click anywhere to interact with embedded firmware apps"
              />
            </div>

            {/* Firmware App Quick Switcher Pills */}
            <div className="flex items-center justify-between gap-1 pt-1 overflow-x-auto text-[10px] font-medium">
              {(
                [
                  { id: 'launcher', label: '🏠 Launcher' },
                  { id: 'phone', label: '📞 Phone' },
                  { id: 'matrix', label: '💡 Lights' },
                  { id: 'sensor', label: '🌡️ Sensor Lab' },
                  { id: 'vision', label: '📷 AI Vision' },
                  { id: 'terminal', label: '⚡ Shell' }
                ] as const
              ).map((appItem) => (
                <button
                  key={appItem.id}
                  onClick={() => {
                    const next: VirtualHardwareState = JSON.parse(JSON.stringify(virtualState));
                    next.touchScreenState.activeApp = appItem.id;
                    onUpdateVirtualState(next);
                    onAddLog({
                      id: `nav_${Date.now()}`,
                      timestampMs: Date.now(),
                      level: 'info',
                      text: `[TOUCH] Activated firmware app: ${appItem.label}`
                    });
                  }}
                  className={`px-2 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    virtualState.touchScreenState.activeApp === appItem.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {appItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* WS2812B NeoPixel 8-LED Preview */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Addressable WS2812B NeoPixel Output
              </span>
              <span className="text-[10px] font-mono text-slate-400">GPIO 48</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-around gap-2">
              {virtualState.ws2812Colors.map((color, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    style={{
                      backgroundColor: virtualState.status === 'running' ? color : '#1e293b',
                      boxShadow:
                        virtualState.status === 'running'
                          ? `0 0 12px ${color}, 0 0 20px ${color}80`
                          : 'none'
                    }}
                    className="w-6 h-6 rounded-md border border-white/20 transition-all duration-300"
                  />
                  <span className="text-[8px] font-mono text-slate-500">#{i}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Relays & Actuators Control Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                High-Voltage Relays Actuation
              </span>
              <span className="text-[10px] font-mono text-slate-400">10A 250VAC</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div
                onClick={() =>
                  handleSendCommand(`RELAY1 ${virtualState.relays.ch1 ? 'OFF' : 'ON'}`)
                }
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  virtualState.relays.ch1
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold block text-white">Relay Channel 1</span>
                  <span className="text-[10px] font-mono">
                    {virtualState.relays.ch1 ? 'CLOSED (ON)' : 'OPEN (OFF)'}
                  </span>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    virtualState.relays.ch1 ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-slate-700'
                  }`}
                />
              </div>

              <div
                onClick={() =>
                  handleSendCommand(`RELAY2 ${virtualState.relays.ch2 ? 'OFF' : 'ON'}`)
                }
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  virtualState.relays.ch2
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold block text-white">Relay Channel 2</span>
                  <span className="text-[10px] font-mono">
                    {virtualState.relays.ch2 ? 'CLOSED (ON)' : 'OPEN (OFF)'}
                  </span>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    virtualState.relays.ch2 ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-slate-700'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* BME680 Sensor Telemetry */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Environmental Telemetry (BME680)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">I2C @ 0x77</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Temperature</span>
                <span className="font-bold text-white text-sm">
                  {virtualState.sensorReadings.temperatureC}°C
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Humidity</span>
                <span className="font-bold text-cyan-300 text-sm">
                  {virtualState.sensorReadings.humidityPercent}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Pressure</span>
                <span className="font-bold text-slate-300 text-sm">
                  {Math.round(virtualState.sensorReadings.pressureHpa)} hPa
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Air Quality</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {virtualState.sensorReadings.vocKohm} kΩ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
