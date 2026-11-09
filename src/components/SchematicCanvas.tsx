import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Maximize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Focus
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
  onUpdateComponentPosition,
  onUpdateComponentTransform,
  onAddWire,
  onDeleteWire,
  onRemoveComponent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Touch gesture state
  const touchStateRef = useRef<{
    isTouchDragging: boolean;
    touchId: number | null;
    initialDistance: number | null;
    initialZoom: number;
    initialPan: { x: number; y: number };
    midpoint: { x: number; y: number };
  }>({
    isTouchDragging: false,
    touchId: null,
    initialDistance: null,
    initialZoom: 1.0,
    initialPan: { x: 40, y: 30 },
    midpoint: { x: 0, y: 0 }
  });

  // Grid Snapping
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Selected Component & Transformation
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // Dragging Component
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizing Component via corner handle
  const [resizingCompId, setResizingCompId] = useState<string | null>(null);
  const [initialResizeDist, setInitialResizeDist] = useState<number>(0);
  const [initialResizeScale, setInitialResizeScale] = useState<number>(1.0);

  // Wire Connection Mode
  const [pendingWire, setPendingWire] = useState<PendingWireConnection | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Selected Wire
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Zen Mode (Hide Toolbars for Fullscreen Mobile Drawing)
  const [isZenMode, setIsZenMode] = useState(false);

  // Pin hover tooltip
  const [hoveredPin, setHoveredPin] = useState<{
    pin: PinDefinition;
    compName: string;
    x: number;
    y: number;
  } | null>(null);

  // Fixed MCU board position on canvas
  const mcuPos = { x: 70, y: 60 };

  // Calculate pin world coordinates with rotation & scaling support
  const getPinCoordinate = (componentId: string, pinId: string): { x: number; y: number } => {
    if (componentId === 'mcu') {
      const pin = project.mcu.pins.find((p) => p.id === pinId);
      if (!pin) return { x: mcuPos.x + 140, y: mcuPos.y + 100 };
      const isLeft = pin.side === 'left';
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

    // Center in world coordinates
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

  // Convert mouse / pointer event to canvas world coordinates
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }, [pan.x, pan.y, zoom]);

  // Mouse Wheel Smooth Zoom towards cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.5, Math.max(0.35, zoom * factor));
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mouse Move handling
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    if (draggingCompId) {
      let newX = coords.x - dragOffset.x;
      let newY = coords.y - dragOffset.y;
      if (snapToGrid) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }
      onUpdateComponentPosition(draggingCompId, Math.max(340, Math.round(newX)), Math.max(10, Math.round(newY)));
    } else if (resizingCompId) {
      const comp = project.components.find((c) => c.id === resizingCompId);
      if (comp) {
        const compWidth = comp.width || 240;
        const compHeight = comp.height || 120;
        const centerX = comp.x + compWidth / 2;
        const centerY = comp.y + compHeight / 2;
        const currentDist = Math.hypot(coords.x - centerX, coords.y - centerY);
        if (initialResizeDist > 0) {
          const ratio = currentDist / initialResizeDist;
          const nextScale = Math.min(2.2, Math.max(0.6, initialResizeScale * ratio));
          onUpdateComponentTransform?.(resizingCompId, { scale: Math.round(nextScale * 10) / 10 });
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on empty background
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedWireId(null);
      setSelectedCompId(null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
    setResizingCompId(null);
  };

  // Touch Event Handlers for Mobile Gesture Control
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = touch.target as HTMLElement;
      const compElement = target.closest('[data-component-id]') as HTMLElement | null;

      if (compElement) {
        // Touch on a component card
        const compId = compElement.dataset.componentId!;
        const comp = project.components.find((c) => c.id === compId);
        if (comp) {
          const coords = getCanvasCoords(touch.clientX, touch.clientY);
          setSelectedCompId(compId);
          setDraggingCompId(compId);
          setDragOffset({ x: coords.x - comp.x, y: coords.y - comp.y });
          touchStateRef.current.isTouchDragging = true;
          touchStateRef.current.touchId = touch.identifier;
          return;
        }
      }

      // Touch on background -> Start Canvas Pan
      setIsPanning(true);
      setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setSelectedWireId(null);
      setSelectedCompId(null);
    } else if (e.touches.length === 2) {
      // 2 Fingers -> Start Pinch-to-Zoom
      setIsPanning(false);
      setDraggingCompId(null);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      touchStateRef.current = {
        isTouchDragging: false,
        touchId: null,
        initialDistance: dist,
        initialZoom: zoom,
        initialPan: { ...pan },
        midpoint: { x: midX, y: midY }
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      setMousePos(coords);

      if (draggingCompId) {
        let newX = coords.x - dragOffset.x;
        let newY = coords.y - dragOffset.y;
        if (snapToGrid) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }
        onUpdateComponentPosition(draggingCompId, Math.max(340, Math.round(newX)), Math.max(10, Math.round(newY)));
      } else if (isPanning) {
        setPan({
          x: touch.clientX - startPan.x,
          y: touch.clientY - startPan.y
        });
      }
    } else if (e.touches.length === 2 && touchStateRef.current.initialDistance) {
      // Pinch-to-zoom calculation
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      const scaleFactor = dist / touchStateRef.current.initialDistance;
      const newZoom = Math.min(2.5, Math.max(0.35, touchStateRef.current.initialZoom * scaleFactor));

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const midRelX = touchStateRef.current.midpoint.x - rect.left;
        const midRelY = touchStateRef.current.midpoint.y - rect.top;

        const newPanX = currentMidX - rect.left - (midRelX - touchStateRef.current.initialPan.x) * (newZoom / touchStateRef.current.initialZoom);
        const newPanY = currentMidY - rect.top - (midRelY - touchStateRef.current.initialPan.y) * (newZoom / touchStateRef.current.initialZoom);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggingCompId(null);
    setResizingCompId(null);
    touchStateRef.current.initialDistance = null;
    touchStateRef.current.isTouchDragging = false;
  };

  // Fit All Elements into Screen Viewport
  const handleFitAllToScreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    let minX = mcuPos.x;
    let maxX = mcuPos.x + 280;
    let minY = mcuPos.y;
    let maxY = mcuPos.y + 600;

    project.components.forEach((c) => {
      const w = c.width || 240;
      const h = c.height || 180;
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x + w);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y + h);
    });

    const contentWidth = maxX - minX + 80;
    const contentHeight = maxY - minY + 80;

    const zoomX = rect.width / contentWidth;
    const zoomY = rect.height / contentHeight;
    const targetZoom = Math.min(1.4, Math.max(0.45, Math.min(zoomX, zoomY) * 0.9));

    const targetPanX = (rect.width - contentWidth * targetZoom) / 2 - minX * targetZoom + 40 * targetZoom;
    const targetPanY = (rect.height - contentHeight * targetZoom) / 2 - minY * targetZoom + 40 * targetZoom;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
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
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();

    if (!pendingWire) {
      const pinCoords = getPinCoordinate(componentId, pin.id);
      setPendingWire({
        fromComponentId: componentId,
        fromPinId: pin.id,
        fromPinName: pin.name,
        fromX: pinCoords.x,
        fromY: pinCoords.y
      });
    } else {
      if (pendingWire.fromComponentId === componentId && pendingWire.fromPinId === pin.id) {
        setPendingWire(null);
        return;
      }

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
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full bg-[#070b12] overflow-hidden select-none cursor-crosshair touch-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.08) 1px, transparent 0),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 120px 120px, 120px 120px'
      }}
    >
      {/* Floating Canvas Controls (Hideable in Zen Mode) */}
      {!isZenMode && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-xl text-slate-300">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200 cursor-pointer"
            title="Zoom In (or Wheel Up / Pinch)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200 cursor-pointer"
            title="Zoom Out (or Wheel Down / Pinch)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitAllToScreen}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200 cursor-pointer"
            title="Fit All Components to Viewport"
            aria-label="Fit View"
          >
            <Focus className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 40, y: 30 });
            }}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-200 cursor-pointer"
            title="Reset View 100%"
            aria-label="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono px-1.5 text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
      )}

      {/* Zen Mode Toggle (Maximizes Mobile Screen Space) */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => setIsZenMode(!isZenMode)}
          className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xl transition-all cursor-pointer"
          title={isZenMode ? 'Show CAD Toolbars' : 'Zen View: Fullscreen space for mobile'}
        >
          {isZenMode ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isZenMode ? 'Open Controls' : 'Zen View'}</span>
        </button>
      </div>

      {/* Selected Component Quick Transform Bar */}
      {selectedCompId && !isZenMode && (() => {
        const selectedComp = project.components.find((c) => c.id === selectedCompId);
        if (!selectedComp) return null;
        const currentRotation = selectedComp.rotation || 0;
        const currentScale = selectedComp.scale || 1.0;

        return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2 bg-slate-900/95 backdrop-blur border border-cyan-500/50 text-slate-200 px-3.5 py-1.5 rounded-2xl shadow-2xl text-xs">
            <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white truncate max-w-[140px]">{selectedComp.name}</span>
            </div>

            {/* Rotate Clockwise 90deg */}
            <button
              onClick={() => {
                const nextRot = ((selectedComp.rotation || 0) + 90) % 360;
                onUpdateComponentTransform?.(selectedComp.id, { rotation: nextRot });
              }}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-[11px]">{currentRotation}°</span>
            </button>

            {/* Scale +/- Buttons for Easy Touch Scaling */}
            <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => {
                  const next = Math.max(0.5, Math.round((currentScale - 0.1) * 10) / 10);
                  onUpdateComponentTransform?.(selectedComp.id, { scale: next });
                }}
                className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-300 hover:text-white font-bold cursor-pointer"
                title="Scale Down (-10%)"
              >
                -
              </button>
              <span className="font-mono text-[11px] text-cyan-300 px-1">
                {currentScale.toFixed(1)}x
              </span>
              <button
                onClick={() => {
                  const next = Math.min(2.5, Math.round((currentScale + 0.1) * 10) / 10);
                  onUpdateComponentTransform?.(selectedComp.id, { scale: next });
                }}
                className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-300 hover:text-white font-bold cursor-pointer"
                title="Scale Up (+10%)"
              >
                +
              </button>
            </div>

            {/* Reset Scale & Rotation */}
            {(currentRotation !== 0 || currentScale !== 1.0) && (
              <button
                onClick={() => {
                  onUpdateComponentTransform?.(selectedComp.id, { rotation: 0, scale: 1.0 });
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Reset Transform to 0° 1.0x"
              >
                Reset
              </button>
            )}

            {/* Delete Component Button */}
            <button
              onClick={() => {
                onRemoveComponent(selectedComp.id);
                setSelectedCompId(null);
              }}
              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-950/80 rounded-lg transition-colors cursor-pointer"
              title="Remove Component"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-cyan-950/95 border border-cyan-500 text-cyan-200 px-4 py-2 rounded-xl shadow-2xl text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Connecting from <strong className="text-white">{pendingWire.fromPinName}</strong>. Tap any target pin to attach wire.
          </span>
          <button
            onClick={() => setPendingWire(null)}
            className="p-1 hover:bg-cyan-900 rounded text-cyan-400 hover:text-white cursor-pointer"
            title="Cancel wire"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Wire Inspector Bar */}
      {selectedWireId && !isZenMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-200 px-4 py-2 rounded-xl shadow-2xl text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border border-white/20 shrink-0"
              style={{
                backgroundColor: project.wires.find((w) => w.id === selectedWireId)?.color || '#38bdf8'
              }}
            />
            <span className="font-semibold text-white">
              Net: {project.wires.find((w) => w.id === selectedWireId)?.netName || selectedWireId}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({project.wires.find((w) => w.id === selectedWireId)?.wireType})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDeleteWire(selectedWireId);
                setSelectedWireId(null);
              }}
              className="flex items-center gap-1 text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-900 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Wire</span>
            </button>

            <button
              onClick={() => setSelectedWireId(null)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Transformable Canvas World Container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* SVG Bezier Wire Layer */}
        <svg className="absolute inset-0 w-[5000px] h-[4000px] pointer-events-none overflow-visible">
          <defs>
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Wire Harness Connections */}
          {project.wires.map((wire) => {
            const start = getPinCoordinate(wire.fromComponentId, wire.fromPinId);
            const end = getPinCoordinate(wire.toComponentId, wire.toPinId);
            const isSelected = wire.id === selectedWireId;

            const dx = Math.abs(end.x - start.x) * 0.55;
            const pathData = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
            const strokeWidth = wire.gauge === '22AWG' ? 4 : wire.gauge === 'FPC-Ribbon' ? 5 : 2.5;

            return (
              <g
                key={wire.id}
                className="cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWireId(wire.id);
                }}
              >
                {/* Thick hit area for easy touch / mouse clicking */}
                <path d={pathData} fill="none" stroke="transparent" strokeWidth={18} />
                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth + 6}
                    opacity={0.4}
                  />
                )}
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
            />
          )}
        </svg>

        {/* --- MCU Board Node --- */}
        <div
          style={{
            transform: `translate(${mcuPos.x}px, ${mcuPos.y}px)`,
            width: '280px'
          }}
          className="absolute z-20 bg-slate-900/95 border-2 border-cyan-500/80 rounded-2xl shadow-2xl shadow-cyan-950/50 backdrop-blur p-4 pointer-events-auto"
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
                    className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[10px] cursor-pointer transition-all hover:scale-105 active:scale-95 ${getPinSignalColor(
                      pin
                    )} hover:ring-2 hover:ring-cyan-400`}
                  >
                    <span className="truncate">{pin.name}</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400/80 ring-1 ring-cyan-200 shrink-0 ml-1" />
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
                    className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[10px] cursor-pointer transition-all hover:scale-105 active:scale-95 ${getPinSignalColor(
                      pin
                    )} hover:ring-2 hover:ring-cyan-400`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400/80 ring-1 ring-cyan-200 shrink-0 mr-1" />
                    <span className="truncate">{pin.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* --- Draggable & Scalable Modular Components --- */}
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
              } rounded-2xl backdrop-blur p-3 cursor-move transition-shadow select-none pointer-events-auto touch-none`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompId(comp.id);
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('[data-pin]')) {
                  const coords = getCanvasCoords(e.clientX, e.clientY);
                  setSelectedCompId(comp.id);
                  setDraggingCompId(comp.id);
                  setDragOffset({ x: coords.x - comp.x, y: coords.y - comp.y });
                }
              }}
            >
              {/* Component Header / Drag Handle */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-1.5 truncate">
                  <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <h4 className="font-semibold text-xs text-white truncate">{comp.name}</h4>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {comp.protocol}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveComponent(comp.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Remove module"
                    aria-label={`Remove module ${comp.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Protocol & Power Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2.5 px-1">
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
                        className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[9px] cursor-pointer transition-all hover:scale-105 active:scale-95 ${getPinSignalColor(
                          pin
                        )} hover:ring-2 hover:ring-emerald-400`}
                      >
                        <span className="truncate">{pin.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
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
                        className={`flex items-center justify-between px-2 py-1 rounded font-mono text-[9px] cursor-pointer transition-all hover:scale-105 active:scale-95 ${getPinSignalColor(
                          pin
                        )} hover:ring-2 hover:ring-emerald-400`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mr-1" />
                        <span className="truncate">{pin.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Interactive Corner Resize Handle for Tactile Scaling */}
              {isSelected && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const coords = getCanvasCoords(e.clientX, e.clientY);
                    const compHeight = comp.height || 140;
                    const centerX = comp.x + compWidth / 2;
                    const centerY = comp.y + compHeight / 2;
                    setInitialResizeDist(Math.hypot(coords.x - centerX, coords.y - centerY));
                    setInitialResizeScale(comp.scale || 1.0);
                    setResizingCompId(comp.id);
                  }}
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-cyan-500 hover:bg-cyan-400 border-2 border-white rounded-full cursor-nwse-resize shadow-md flex items-center justify-center pointer-events-auto"
                  title="Drag to scale module size"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-black" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pin Hover Tooltip Card */}
      {hoveredPin && !isZenMode && (
        <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1 max-w-xs pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">{hoveredPin.pin.name}</span>
            <span className="font-mono text-[10px] text-cyan-400">{hoveredPin.compName}</span>
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            Voltage: <strong className="text-white">{hoveredPin.pin.voltageDomain}</strong> | Signals: {hoveredPin.pin.supportedSignals.join(', ')}
          </div>
          {hoveredPin.pin.isStrappingPin && (
            <div className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
              ⚠️ {hoveredPin.pin.strappingNote || 'Boot strapping pin'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
