import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  RotateCw,
  Grid,
  Move,
  Maximize2
} from 'lucide-react';
import {
  DeviceProject,
  ComponentModule,
  WireConnection,
  PinDefinition,
  PinSignalType,
  WireType
} from '../types/hardware';

interface SchematicCanvasProps {
  project: DeviceProject;
  uiHidden?: boolean;
  onUpdateComponentPosition: (componentId: string, x: number, y: number) => void;
  onUpdateComponentTransform?: (
    componentId: string,
    transform: { x?: number; y?: number; rotation?: number; scale?: number }
  ) => void;
  onAddWire: (wire: Omit<WireConnection, 'id'>) => void;
  onDeleteWire: (wireId: string) => void;
  onRemoveComponent: (componentId: string) => void;
}

interface PendingWireConnection {
  fromComponentId: string;
  fromPinId: string;
  fromPinName: string;
  fromX: number;
  fromY: number;
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  project,
  uiHidden = false,
  onUpdateComponentPosition,
  onUpdateComponentTransform,
  onAddWire,
  onDeleteWire,
  onRemoveComponent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom (state mirrors refs so pointer gestures never read stale values)
  const [zoom, setZoomState] = useState(1.0);
  const [pan, setPanState] = useState({ x: 40, y: 30 });
  const zoomRef = useRef(1.0);
  const panRef = useRef({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);

  // Grid Snapping
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Selected Component & Transformation
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // Drag / gesture state
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<
    | {
        mode: 'pan';
        startClient: { x: number; y: number };
        startPan: { x: number; y: number };
      }
    | {
        mode: 'drag' | 'drag-mcu';
        compId?: string;
        offset: { x: number; y: number };
      }
    | {
        mode: 'pinch';
        startDist: number;
        startZoom: number;
        anchorWorld: { x: number; y: number };
      }
    | {
        mode: 'scale';
        compId: string;
        centerWorld: { x: number; y: number };
        startDist: number;
        startScale: number;
      }
    | null
  >(null);

  // Wire Connection Mode
  const [pendingWire, setPendingWire] = useState<PendingWireConnection | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Selected Wire
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Pin hover tooltip
  const [hoveredPin, setHoveredPin] = useState<{
    pin: PinDefinition;
    compName: string;
    x: number;
    y: number;
  } | null>(null);

  // MCU board position is now fully draggable on the canvas
  const [mcuPos, setMcuPos] = useState({ x: 70, y: 60 });
  const mcuPosRef = useRef(mcuPos);
  mcuPosRef.current = mcuPos;

  // Calculate pin world coordinates with rotation & scaling support
  const getPinCoordinate = (componentId: string, pinId: string): { x: number; y: number } => {
    if (componentId === 'mcu') {
      const pin = project.mcu.pins.find((p) => p.id === pinId);
      if (!pin) return { x: mcuPos.x + 140, y: mcuPos.y + 100 };
      const isLeft = pin.side === 'left';
      // MCU dimensions: width 280, height ~ 600
      const x = isLeft ? mcuPos.x : mcuPos.x + 280;
      const y = mcuPos.y + 70 + (pin.order - 1) * 26;
      return { x, y };
    }

    const comp = project.components.find((c) => c.id === componentId);
    if (!comp) return { x: 400, y: 200 };

    const pin = comp.pins.find((p) => p.id === pinId);
    if (!pin) return { x: comp.x + 120, y: comp.y + 60 };

    const compWidth = comp.width || 240;
    const compHeight = comp.height || (60 + Math.max(comp.pins.length / 2, 2) * 26);
    const scale = comp.scale || 1.0;
    const rotationDeg = comp.rotation || 0;
    const rad = (rotationDeg * Math.PI) / 180;

    const isLeft = pin.side === 'left';
    const localX = isLeft ? 0 : compWidth;
    const localY = 55 + (pin.order - 1) * 26;

    // Component Center in world coordinates
    const cx = comp.x + compWidth / 2;
    const cy = comp.y + compHeight / 2;

    // Offset from center with scale
    const dx = (localX - compWidth / 2) * scale;
    const dy = (localY - compHeight / 2) * scale;

    // Apply 2D rotation matrix
    const x = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
    const y = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
    return { x, y };
  };

  const clampZoom = (value: number) => Math.min(2.5, Math.max(0.3, value));

  const applyView = (nextZoom: number, nextPan: { x: number; y: number }) => {
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoomState(nextZoom);
    setPanState(nextPan);
  };

  const getLocalPoint = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const localToWorld = (local: { x: number; y: number }) => ({
    x: (local.x - panRef.current.x) / zoomRef.current,
    y: (local.y - panRef.current.y) / zoomRef.current
  });

  const zoomAtPoint = (local: { x: number; y: number }, requestedZoom: number) => {
    const nextZoom = clampZoom(requestedZoom);
    const world = localToWorld(local);
    applyView(nextZoom, {
      x: local.x - world.x * nextZoom,
      y: local.y - world.y * nextZoom
    });
  };

  const zoomByFactor = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    zoomAtPoint(
      { x: el.clientWidth / 2, y: el.clientHeight / 2 },
      zoomRef.current * factor
    );
  };

  const resetView = () => {
    applyView(1.0, { x: 40, y: 30 });
  };

  // Native non-passive wheel listener: trackpad pinch + wheel zoom anchored at cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const local = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-event.deltaY * 0.0016);
      zoomAtPoint(local, zoomRef.current * factor);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const snapValue = (value: number) => (snapToGrid ? Math.round(value / 20) * 20 : value);

  const handlePointerDown = (event: React.PointerEvent) => {
    const target = event.target as HTMLElement;
    const scaleHandle = target.closest('[data-scale-handle]') as HTMLElement | null;

    // Interactive controls and pins keep their native click behaviour.
    if (!scaleHandle) {
      if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('[data-pin]')) {
        return;
      }
      if (target.closest('[data-wire]')) {
        return;
      }
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const container = containerRef.current;
    if (!container) return;
    container.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const local = getLocalPoint(event.clientX, event.clientY);
    const world = localToWorld(local);
    setMousePos(world);

    if (activePointersRef.current.size === 1) {
      if (scaleHandle && selectedCompId) {
        const comp = project.components.find((item) => item.id === selectedCompId);
        if (comp) {
          const compWidth = comp.width || 240;
          const compHeight = comp.height || 60 + Math.max(comp.pins.length / 2, 2) * 26;
          const centerWorld = {
            x: comp.x + compWidth / 2,
            y: comp.y + compHeight / 2
          };
          gestureRef.current = {
            mode: 'scale',
            compId: comp.id,
            centerWorld,
            startDist: Math.max(8, Math.hypot(world.x - centerWorld.x, world.y - centerWorld.y)),
            startScale: comp.scale || 1.0
          };
        }
        return;
      }

      const compEl = target.closest('[data-component-id]') as HTMLElement | null;
      const mcuEl = target.closest('[data-mcu]') as HTMLElement | null;

      if (compEl?.dataset.componentId) {
        const compId = compEl.dataset.componentId;
        const comp = project.components.find((item) => item.id === compId);
        if (comp) {
          setSelectedCompId(compId);
          setSelectedWireId(null);
          setDraggingCompId(compId);
          gestureRef.current = {
            mode: 'drag',
            compId,
            offset: { x: world.x - comp.x, y: world.y - comp.y }
          };
        }
      } else if (mcuEl) {
        setSelectedCompId(null);
        setSelectedWireId(null);
        setDraggingCompId('mcu');
        gestureRef.current = {
          mode: 'drag-mcu',
          offset: { x: world.x - mcuPosRef.current.x, y: world.y - mcuPosRef.current.y }
        };
      } else {
        setIsPanning(true);
        setSelectedCompId(null);
        setSelectedWireId(null);
        gestureRef.current = {
          mode: 'pan',
          startClient: { x: event.clientX, y: event.clientY },
          startPan: { ...panRef.current }
        };
      }
      return;
    }

    if (activePointersRef.current.size === 2) {
      const points = Array.from(activePointersRef.current.values());
      const [a, b] = points;
      const midClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const localMid = getLocalPoint(midClient.x, midClient.y);
      gestureRef.current = {
        mode: 'pinch',
        startDist: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)),
        startZoom: zoomRef.current,
        anchorWorld: localToWorld(localMid)
      };
      setIsPanning(false);
      setDraggingCompId(null);
    }
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const world = localToWorld(getLocalPoint(event.clientX, event.clientY));
    setMousePos(world);

    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.mode === 'pinch') {
      if (activePointersRef.current.size < 2) return;
      const points = Array.from(activePointersRef.current.values());
      const [a, b] = points;
      const midClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const localMid = getLocalPoint(midClient.x, midClient.y);
      const nextZoom = clampZoom(
        gesture.startZoom * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.startDist)
      );
      applyView(nextZoom, {
        x: localMid.x - gesture.anchorWorld.x * nextZoom,
        y: localMid.y - gesture.anchorWorld.y * nextZoom
      });
      return;
    }

    if (gesture.mode === 'pan') {
      applyView(zoomRef.current, {
        x: gesture.startPan.x + (event.clientX - gesture.startClient.x),
        y: gesture.startPan.y + (event.clientY - gesture.startClient.y)
      });
      return;
    }

    if (gesture.mode === 'drag' && gesture.compId) {
      const nextX = snapValue(world.x - gesture.offset.x);
      const nextY = snapValue(world.y - gesture.offset.y);
      onUpdateComponentPosition(
        gesture.compId,
        Math.max(-200, Math.round(nextX)),
        Math.max(-200, Math.round(nextY))
      );
      return;
    }

    if (gesture.mode === 'drag-mcu') {
      const nextX = snapValue(world.x - gesture.offset.x);
      const nextY = snapValue(world.y - gesture.offset.y);
      setMcuPos({
        x: Math.max(0, Math.round(nextX)),
        y: Math.max(-200, Math.round(nextY))
      });
      return;
    }

    if (gesture.mode === 'scale') {
      const distance = Math.hypot(
        world.x - gesture.centerWorld.x,
        world.y - gesture.centerWorld.y
      );
      const nextScale = Math.min(
        2.6,
        Math.max(0.4, gesture.startScale * (distance / gesture.startDist))
      );
      onUpdateComponentTransform?.(gesture.compId, { scale: nextScale });
    }
  };

  const endPointerGesture = (event: React.PointerEvent) => {
    activePointersRef.current.delete(event.pointerId);
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }

    if (activePointersRef.current.size === 0) {
      gestureRef.current = null;
      setIsPanning(false);
      setDraggingCompId(null);
      return;
    }

    // Keep the remaining finger usable as a one-finger pan.
    const remaining = Array.from(activePointersRef.current.values())[0];
    gestureRef.current = {
      mode: 'pan',
      startClient: { x: remaining.x, y: remaining.y },
      startPan: { ...panRef.current }
    };
    setIsPanning(true);
    setDraggingCompId(null);
  };

  // Auto-detect wire type & color
  const detectWireProperties = (
    pinA: PinDefinition,
    pinB: PinDefinition
  ): { wireType: WireType; color: string; netName: string } => {
    if (pinA.voltageDomain === 'GND' || pinB.voltageDomain === 'GND') {
      return { wireType: 'power-gnd', color: '#0f172a', netName: 'GND' };
    }
    if (pinA.voltageDomain === '5V' || pinB.voltageDomain === '5V') {
      return { wireType: 'power-vcc', color: '#ef4444', netName: '5V' };
    }
    if (pinA.voltageDomain === '3.3V' && pinB.voltageDomain === '3.3V' && (pinA.id.includes('3v') || pinB.id.includes('3v'))) {
      return { wireType: 'power-vcc', color: '#f87171', netName: '3V3' };
    }
    if (pinA.supportedSignals.includes('I2C_SDA') || pinB.supportedSignals.includes('I2C_SDA')) {
      return { wireType: 'i2c', color: '#06b6d4', netName: 'I2C_SDA' };
    }
    if (pinA.supportedSignals.includes('I2C_SCL') || pinB.supportedSignals.includes('I2C_SCL')) {
      return { wireType: 'i2c', color: '#e879f9', netName: 'I2C_SCL' };
    }
    if (pinA.supportedSignals.includes('SPI_MOSI') || pinB.supportedSignals.includes('SPI_MOSI')) {
      return { wireType: 'spi', color: '#0ea5e9', netName: 'SPI_MOSI' };
    }
    if (pinA.supportedSignals.includes('SPI_SCK') || pinB.supportedSignals.includes('SPI_SCK')) {
      return { wireType: 'spi', color: '#6366f1', netName: 'SPI_SCK' };
    }
    if (pinA.supportedSignals.includes('UART_TX') || pinB.supportedSignals.includes('UART_TX')) {
      return { wireType: 'uart', color: '#f59e0b', netName: 'UART' };
    }
    if (pinA.supportedSignals.includes('MIPI_DSI') || pinB.supportedSignals.includes('MIPI_DSI')) {
      return { wireType: 'mipi', color: '#8b5cf6', netName: 'MIPI_DSI' };
    }
    if (pinA.supportedSignals.includes('I2S_DATA') || pinB.supportedSignals.includes('I2S_DATA')) {
      return { wireType: 'i2s', color: '#10b981', netName: 'I2S_DATA' };
    }
    return { wireType: 'gpio', color: '#22c55e', netName: 'SIGNAL' };
  };

  // Pin Click handling
  const handlePinClick = (
    componentId: string,
    pin: PinDefinition,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!pendingWire) {
      // Start wire
      const pinCoords = getPinCoordinate(componentId, pin.id);
      setPendingWire({
        fromComponentId: componentId,
        fromPinId: pin.id,
        fromPinName: pin.name,
        fromX: pinCoords.x,
        fromY: pinCoords.y
      });
    } else {
      // Finish wire if not same pin
      if (pendingWire.fromComponentId === componentId && pendingWire.fromPinId === pin.id) {
        setPendingWire(null);
        return;
      }

      // Find fromPin definition
      let fromPin: PinDefinition | undefined;
      if (pendingWire.fromComponentId === 'mcu') {
        fromPin = project.mcu.pins.find((p) => p.id === pendingWire.fromPinId);
      } else {
        const c = project.components.find((c) => c.id === pendingWire.fromComponentId);
        fromPin = c?.pins.find((p) => p.id === pendingWire.fromPinId);
      }

      if (fromPin) {
        const detected = detectWireProperties(fromPin, pin);
        onAddWire({
          fromComponentId: pendingWire.fromComponentId,
          fromPinId: pendingWire.fromPinId,
          toComponentId: componentId,
          toPinId: pin.id,
          wireType: detected.wireType,
          color: detected.color,
          gauge: detected.wireType === 'power-vcc' || detected.wireType === 'power-gnd' ? '24AWG' : '28AWG',
          lengthMm: 45,
          netName: detected.netName
        });
      }

      setPendingWire(null);
    }
  };

  // Pin badge color helper
  const getPinSignalColor = (pin: PinDefinition) => {
    if (pin.voltageDomain === 'GND') return 'bg-slate-700 text-slate-300';
    if (pin.voltageDomain === '5V') return 'bg-red-950 text-red-400 border border-red-800';
    if (pin.id.includes('3v') || pin.name.includes('3V3')) return 'bg-rose-950 text-rose-300 border border-rose-800';
    if (pin.supportedSignals.includes('I2C_SDA') || pin.supportedSignals.includes('I2C_SCL')) return 'bg-cyan-950 text-cyan-300 border border-cyan-800';
    if (pin.supportedSignals.includes('SPI_MOSI') || pin.supportedSignals.includes('SPI_SCK')) return 'bg-indigo-950 text-indigo-300 border border-indigo-800';
    if (pin.supportedSignals.includes('UART_TX') || pin.supportedSignals.includes('UART_RX')) return 'bg-amber-950 text-amber-300 border border-amber-800';
    if (pin.supportedSignals.includes('MIPI_DSI') || pin.supportedSignals.includes('MIPI_CSI')) return 'bg-violet-950 text-violet-300 border border-violet-800';
    if (pin.supportedSignals.includes('I2S_DATA') || pin.supportedSignals.includes('I2S_BCLK')) return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    if (pin.isStrappingPin) return 'bg-orange-950 text-orange-300 border border-orange-700';
    return 'bg-slate-800 text-slate-300';
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerGesture}
      onPointerCancel={endPointerGesture}
      className={`relative w-full h-full bg-[#070b12] overflow-hidden select-none touch-none ${
        isPanning ? 'cursor-grabbing' : draggingCompId ? 'cursor-move' : 'cursor-crosshair'
      } ${uiHidden ? 'ui-hidden' : ''}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.10) 1px, transparent 0),
          linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
        `,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px, ${120 * zoom}px ${120 * zoom}px, ${120 * zoom}px ${120 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* Floating Canvas Controls */}
      <div data-ui-overlay className="absolute top-4 left-4 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-lg shadow-xl text-slate-300">
        <button
          onClick={() => zoomByFactor(1.16)}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomByFactor(1 / 1.16)}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200"
          title="Reset View"
          aria-label="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-2 text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-px h-4 bg-slate-800 mx-0.5" />
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded transition-colors ${
            snapToGrid
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={snapToGrid ? 'Snap to Grid: ON (20px)' : 'Snap to Grid: OFF'}
          aria-label="Toggle Grid Snapping"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Component Transform Floating Gizmo */}
      {selectedCompId && (() => {
        const selectedComp = project.components.find((c) => c.id === selectedCompId);
        if (!selectedComp) return null;
        const currentRotation = selectedComp.rotation || 0;
        const currentScale = selectedComp.scale || 1.0;

        return (
          <div data-ui-overlay className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 backdrop-blur border border-cyan-500/50 text-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xl text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white truncate max-w-[120px]">{selectedComp.name}</span>
            </div>

            {/* Rotate Clockwise 90deg */}
            <button
              onClick={() => {
                const nextRot = ((selectedComp.rotation || 0) + 90) % 360;
                onUpdateComponentTransform?.(selectedComp.id, { rotation: nextRot });
              }}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-[11px]">{currentRotation}°</span>
            </button>

            {/* Scale Slider */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Scale:</span>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={currentScale}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateComponentTransform?.(selectedComp.id, { scale: val });
                }}
                className="w-16 accent-cyan-400 cursor-pointer h-1"
                title={`Scale: ${currentScale.toFixed(1)}x`}
              />
              <span className="font-mono text-[10px] text-cyan-300 w-7 text-right">
                {currentScale.toFixed(1)}x
              </span>
            </div>

            {/* Reset Transform */}
            {(currentRotation !== 0 || currentScale !== 1.0) && (
              <button
                onClick={() => {
                  onUpdateComponentTransform?.(selectedComp.id, { rotation: 0, scale: 1.0 });
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset Transform to 0° 1.0x"
              >
                Reset
              </button>
            )}

            {/* Close Gizmo */}
            <button
              onClick={() => setSelectedCompId(null)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Wire Connection Helper Banner */}
      {pendingWire && (
        <div data-ui-overlay className="absolute top-4 right-4 z-30 flex items-center gap-3 bg-cyan-950/95 border border-cyan-500/50 text-cyan-200 px-4 py-2 rounded-lg shadow-2xl text-xs animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>
            Connecting wire from <strong className="text-white">{pendingWire.fromPinName}</strong>. Click any target pin to attach.
          </span>
          <button
            onClick={() => setPendingWire(null)}
            className="p-1 hover:bg-cyan-900 rounded text-cyan-400 hover:text-white"
            title="Cancel wire"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Wire Inspector Bar */}
      {selectedWireId && (
        <div data-ui-overlay className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-white/20" style={{
              backgroundColor: project.wires.find((w) => w.id === selectedWireId)?.color || '#38bdf8'
            }} />
            <span className="font-semibold text-white">
              Net: {project.wires.find((w) => w.id === selectedWireId)?.netName || selectedWireId}
            </span>
            <span className="text-slate-400 font-mono">
              ({project.wires.find((w) => w.id === selectedWireId)?.gauge}, {project.wires.find((w) => w.id === selectedWireId)?.lengthMm}mm)
            </span>
          </div>

          <button
            onClick={() => {
              onDeleteWire(selectedWireId);
              setSelectedWireId(null);
            }}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2.5 py-1 rounded border border-rose-900/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Wire</span>
          </button>

          <button
            onClick={() => setSelectedWireId(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Pan/Zoom Canvas Wrapper */}
      <div
        className="w-full h-full origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
        {/* SVG Wire Layer */}
        <svg
          className="absolute inset-0 w-[4000px] h-[3000px] pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Existing Wires */}
          {project.wires.map((wire) => {
            const start = getPinCoordinate(wire.fromComponentId, wire.fromPinId);
            const end = getPinCoordinate(wire.toComponentId, wire.toPinId);
            const isSelected = wire.id === selectedWireId;

            // Compute smooth Bezier Control Points
            const dx = Math.abs(end.x - start.x) * 0.55;
            const pathData = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;

            const strokeWidth = wire.gauge === '22AWG' ? 4 : wire.gauge === 'FPC-Ribbon' ? 5 : 2.5;

            return (
              <g
                key={wire.id}
                data-wire={wire.id}
                className="cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWireId(wire.id);
                }}
              >
                {/* Thick invisible hit area for easy clicking */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                />
                {/* Outer Glow when selected */}
                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth + 6}
                    opacity={0.4}
                  />
                )}
                {/* Visible Wire Body */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  filter="url(#wire-glow)"
                  opacity={isSelected ? 1.0 : 0.85}
                  strokeDasharray={wire.wireType === 'i2c' ? '6 3' : wire.wireType === 'spi' ? '8 2' : 'none'}
                />
                {/* Pin solder points */}
                <circle cx={start.x} cy={start.y} r={4.5} fill={wire.color} stroke="#020617" strokeWidth={1.5} />
                <circle cx={end.x} cy={end.y} r={4.5} fill={wire.color} stroke="#020617" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Live Dragging Wire */}
          {pendingWire && (
            <path
              d={`M ${pendingWire.fromX} ${pendingWire.fromY} Q ${(pendingWire.fromX + mousePos.x) / 2} ${(pendingWire.fromY + mousePos.y) / 2 - 30}, ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={3}
              strokeDasharray="4 4"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* --- MCU Board Node --- */}
        <div
          data-mcu
          style={{
            transform: `translate(${mcuPos.x}px, ${mcuPos.y}px)`,
            width: '280px'
          }}
          className={`absolute z-20 bg-slate-900/95 border-2 rounded-2xl shadow-2xl shadow-cyan-950/50 backdrop-blur p-4 cursor-move touch-none transition-shadow ${
            draggingCompId === 'mcu'
              ? 'border-cyan-400 ring-2 ring-cyan-400/40'
              : 'border-cyan-500/80 hover:border-cyan-400'
          }`}
          title="Drag the board to reposition it"
        >
          {/* MCU Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                SoC
              </div>
              <div>
                <h3 className="font-bold text-sm text-white tracking-tight leading-tight">{project.mcu.name}</h3>
                <span className="text-[10px] text-cyan-400 font-mono">{project.mcu.cpuArchitecture}</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              {project.mcu.clockSpeedMhz}MHz
            </span>
          </div>

          {/* Quick Specs Chips */}
          <div className="grid grid-cols-2 gap-1.5 mb-4 text-[10px] font-mono text-slate-300">
            <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              Flash: <span className="text-white font-bold">{project.mcu.flashSizeMb}MB</span>
            </div>
            <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              PSRAM: <span className="text-white font-bold">{project.mcu.psramSizeMb}MB</span>
            </div>
          </div>

          {/* Pins Columns */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Left Header Pins */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase text-slate-500 block px-1">J1 Left Bus</span>
              {project.mcu.pins
                .filter((p) => p.side === 'left')
                .map((pin) => (
                  <div
                    key={pin.id}
                    onClick={(e) => handlePinClick('mcu', pin, e)}
                    onMouseEnter={() => setHoveredPin({ pin, compName: project.mcu.name, x: mcuPos.x, y: mcuPos.y })}
                    onMouseLeave={() => setHoveredPin(null)}
                    className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[10px] cursor-pointer transition-all hover:scale-105 ${getPinSignalColor(
                      pin
                    )} hover:ring-2 hover:ring-cyan-400`}
                  >
                    <span className="truncate">{pin.name}</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400/80 ring-1 ring-cyan-200" />
                  </div>
                ))}
            </div>

            {/* Right Header Pins */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase text-slate-500 block px-1 text-right">J2 Right Bus</span>
              {project.mcu.pins
                .filter((p) => p.side === 'right')
                .map((pin) => (
                  <div
                    key={pin.id}
                    onClick={(e) => handlePinClick('mcu', pin, e)}
                    onMouseEnter={() => setHoveredPin({ pin, compName: project.mcu.name, x: mcuPos.x + 280, y: mcuPos.y })}
                    onMouseLeave={() => setHoveredPin(null)}
                    className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[10px] cursor-pointer transition-all hover:scale-105 ${getPinSignalColor(
                      pin
                    )} hover:ring-2 hover:ring-cyan-400`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400/80 ring-1 ring-cyan-200" />
                    <span className="truncate">{pin.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* --- Draggable Modular Components --- */}
        {project.components.map((comp) => {
          const compWidth = comp.width || 240;
          const rotation = comp.rotation || 0;
          const scale = comp.scale || 1.0;
          const isSelected = comp.id === selectedCompId;

          return (
            <div
              key={comp.id}
              data-component-id={comp.id}
              style={{
                transform: `translate(${comp.x}px, ${comp.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center center',
                width: `${compWidth}px`
              }}
              className={`absolute z-20 bg-slate-900/95 border ${
                isSelected
                  ? 'border-cyan-400 ring-2 ring-cyan-500/50 shadow-2xl shadow-cyan-950/80'
                  : 'border-slate-700/80 hover:border-slate-500 shadow-xl'
              } rounded-xl backdrop-blur p-3 cursor-move transition-shadow select-none touch-none`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompId(comp.id);
              }}
            >
              {/* Component Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h4 className="font-semibold text-xs text-white truncate">{comp.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {comp.protocol}
                  </span>
                  <button
                    onClick={() => onRemoveComponent(comp.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                    title="Remove module"
                    aria-label={`Remove module ${comp.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Protocol & Power Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3 px-1">
                <span>{comp.operatingVoltage}</span>
                <span className="font-mono text-cyan-300">{comp.powerCurrentActiveMa}mA</span>
              </div>

              {/* Component Pins */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-1">
                  {comp.pins
                    .filter((p) => p.side === 'left')
                    .map((pin) => (
                      <div
                        key={pin.id}
                        data-pin={pin.id}
                        onClick={(e) => handlePinClick(comp.id, pin, e)}
                        onMouseEnter={() => setHoveredPin({ pin, compName: comp.name, x: comp.x, y: comp.y })}
                        onMouseLeave={() => setHoveredPin(null)}
                        className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[9px] cursor-pointer transition-all hover:scale-105 ${getPinSignalColor(
                          pin
                        )} hover:ring-2 hover:ring-emerald-400`}
                      >
                        <span className="truncate">{pin.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                    ))}
                </div>

                <div className="space-y-1">
                  {comp.pins
                    .filter((p) => p.side === 'right')
                    .map((pin) => (
                      <div
                        key={pin.id}
                        data-pin={pin.id}
                        onClick={(e) => handlePinClick(comp.id, pin, e)}
                        onMouseEnter={() => setHoveredPin({ pin, compName: comp.name, x: comp.x + compWidth, y: comp.y })}
                        onMouseLeave={() => setHoveredPin(null)}
                        className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[9px] cursor-pointer transition-all hover:scale-105 ${getPinSignalColor(
                          pin
                        )} hover:ring-2 hover:ring-emerald-400`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="truncate">{pin.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Touch / mouse resize handle */}
              {isSelected && (
                <button
                  type="button"
                  data-scale-handle
                  onClick={(event) => event.stopPropagation()}
                  className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-cyan-500 text-slate-950 border-2 border-slate-950 shadow-lg shadow-cyan-500/40 flex items-center justify-center cursor-nwse-resize touch-none z-30 hover:bg-cyan-400 active:scale-95 transition-transform"
                  title="Drag to scale component"
                  aria-label={`Scale ${comp.name}`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Gesture Hint */}
      <div data-ui-overlay className="hidden md:flex absolute bottom-4 left-4 z-20 items-center gap-2 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] text-slate-400 font-mono pointer-events-none">
        <Move className="w-3.5 h-3.5 text-cyan-400" />
        <span>Drag to move</span>
        <span className="text-slate-700">•</span>
        <span>Pinch / wheel to zoom</span>
        <span className="text-slate-700">•</span>
        <span>Corner handle to resize</span>
      </div>

      {/* Pin Hover Tooltip Card */}
      {hoveredPin && (
        <div data-ui-overlay className="absolute bottom-6 right-6 z-40 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs max-w-xs pointer-events-none backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-white">{hoveredPin.pin.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {hoveredPin.pin.voltageDomain}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-1">
            <strong>Device:</strong> {hoveredPin.compName}
          </p>
          <p className="text-[11px] text-slate-400 mb-1">
            <strong>Signals:</strong> {hoveredPin.pin.supportedSignals.join(', ')}
          </p>
          {hoveredPin.pin.isStrappingPin && (
            <div className="flex items-start gap-1.5 text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800/80 mt-1.5 text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>{hoveredPin.pin.strappingNote || 'Boot strapping pin! Check default pull state.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
