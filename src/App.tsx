import React, { useState, useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import { Header, ActiveTab } from './components/Header';
import { SchematicCanvas } from './components/SchematicCanvas';
import { RealDeviceViewer3D } from './components/3d/RealDeviceViewer3D';
import { ElectricalInspector } from './components/ElectricalInspector';
import { EnhancedCodeEditor } from './components/editor/EnhancedCodeEditor';
import { VirtualRunnerModal } from './components/simulation/VirtualRunnerModal';
import { BomModal } from './components/BomModal';
import { ComponentPalette } from './components/ComponentPalette';
import { MobileNav } from './components/MobileNav';
import { PRESET_PROJECTS, MCU_BOARDS, MODULE_CATALOG } from './core/hardware-catalog';
import { validateCircuit } from './core/pin-rules';
import { generateFirmware } from './core/firmware-gen';
import { createInitialHardwareState } from './core/esp-emulator';
import {
  DeviceProject,
  DeviceEnclosureSpecs,
  WireConnection,
  ComponentModule,
  McuFamily,
  VirtualHardwareState,
  SerialLogEntry
} from './types/hardware';

export default function App() {
  // Active Project State
  const [project, setProject] = useState<DeviceProject>(() => {
    // Check URL parameters for preset override or autostart
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get('preset');
    const matched = PRESET_PROJECTS.find((p) => p.id === presetParam);
    return matched || PRESET_PROJECTS[0]; // Default to Cyberphone
  });

  // Active View Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('canvas');

  // Zen Mode for Fullscreen Mobile Canvas / 3D
  const [isZenMode, setIsZenMode] = useState(false);

  // Component Palette Modal
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Live Firmware Code State
  const [activeCode, setActiveCode] = useState<string>(() =>
    generateFirmware(project, 'arduino')
  );

  // Virtual Hardware Execution State & Serial Logs
  const [virtualState, setVirtualState] = useState<VirtualHardwareState>(() =>
    createInitialHardwareState(project)
  );
  const [logs, setLogs] = useState<SerialLogEntry[]>([]);

  // Live DRC Circuit Validation
  const drcIssues = useMemo(() => validateCircuit(project), [project]);
  const issuesCount = useMemo(() => {
    return {
      errors: drcIssues.filter((i) => i.severity === 'error').length,
      warnings: drcIssues.filter((i) => i.severity === 'warning').length
    };
  }, [drcIssues]);

  // Handler: Load Preset Project
  const handleLoadPreset = (presetId: string) => {
    const found = PRESET_PROJECTS.find((p) => p.id === presetId);
    if (found) {
      const cloned: DeviceProject = JSON.parse(JSON.stringify(found));
      setProject(cloned);
      setActiveCode(generateFirmware(cloned, 'arduino'));
      setVirtualState(createInitialHardwareState(cloned));
      setLogs([]);
    }
  };

  // Handler: Change SoC MCU Board
  const handleChangeMcu = (family: McuFamily) => {
    const targetBoard = MCU_BOARDS.find((b) => b.family === family) || MCU_BOARDS[0];
    setProject((prev) => {
      const updated: DeviceProject = {
        ...prev,
        mcu: targetBoard,
        wires: prev.wires.filter(
          (w) =>
            targetBoard.pins.some((p) => p.id === w.fromPinId || p.id === w.toPinId) ||
            (w.fromComponentId !== 'mcu' && w.toComponentId !== 'mcu')
        )
      };
      setVirtualState(createInitialHardwareState(updated));
      return updated;
    });
  };

  // Handler: Update Component Position on Canvas
  const handleUpdateComponentPosition = (componentId: string, x: number, y: number) => {
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === componentId ? { ...c, x, y } : c))
    }));
  };

  // Handler: Update Component Transform (position, rotation, scale)
  const handleUpdateComponentTransform = (
    componentId: string,
    transform: { x?: number; y?: number; rotation?: number; scale?: number }
  ) => {
    setProject((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === componentId ? { ...c, ...transform } : c
      )
    }));
  };

  // Handler: Add New Wire Connection
  const handleAddWire = (wireData: Omit<WireConnection, 'id'>) => {
    const newWire: WireConnection = {
      ...wireData,
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    setProject((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire]
    }));
  };

  // Handler: Delete Wire
  const handleDeleteWire = (wireId: string) => {
    setProject((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId)
    }));
  };

  // Handler: Remove Component Module
  const handleRemoveComponent = (componentId: string) => {
    setProject((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== componentId),
      // Remove all wires connected to this module
      wires: prev.wires.filter(
        (w) => w.fromComponentId !== componentId && w.toComponentId !== componentId
      )
    }));
  };

  // Handler: Add Module from Palette
  const handleSelectComponent = (moduleTemplate: (typeof MODULE_CATALOG)[0]) => {
    const newId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const offsetIndex = project.components.length;

    const newComp: ComponentModule = {
      ...moduleTemplate,
      id: newId,
      x: 480,
      y: 60 + (offsetIndex % 5) * 160
    };

    setProject((prev) => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
  };

  // Handler: Update Enclosure CAD specs
  const handleUpdateEnclosure = (specs: Partial<DeviceEnclosureSpecs>) => {
    setProject((prev) => ({
      ...prev,
      enclosure: {
        ...prev.enclosure,
        ...specs
      }
    }));
  };

  // Handler: Update Battery Capacity
  const handleUpdateBatteryCapacity = (capacityMah: number) => {
    setProject((prev) => ({
      ...prev,
      batteryCapacityMah: capacityMah
    }));
  };

  // Handler: Update Duty Cycle
  const handleUpdateDutyCycle = (percent: number) => {
    setProject((prev) => ({
      ...prev,
      activeDutyCyclePercent: percent
    }));
  };

  // Handler: Export Project JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler: Reset Project to Blank Canvas
  const handleResetProject = () => {
    setProject({
      id: `proj_${Date.now()}`,
      name: 'Custom ESP32 Device',
      version: '1.0.0',
      description: 'Custom electronic hardware and wire harness project',
      mcu: MCU_BOARDS[0],
      components: [],
      wires: [],
      batteryCapacityMah: 2500,
      activeDutyCyclePercent: 20,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      enclosure: {
        formFactor: 'custom-enclosure',
        widthMm: 120,
        heightMm: 80,
        depthMm: 22.0,
        material: '3D-Printed PETG',
        colorHex: '#0f172a',
        wallThicknessMm: 2.0,
        hasBatteryBay: true,
        hasAntennaCutout: true
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 overflow-hidden font-sans">
      {/* Top Header (Hideable in Zen Mode) */}
      {!isZenMode && (
        <Header
          project={project}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLoadPreset={handleLoadPreset}
          onChangeMcu={handleChangeMcu}
          onOpenAddModule={() => setIsPaletteOpen(true)}
          onExportJson={handleExportJson}
          onResetProject={handleResetProject}
          issuesCount={issuesCount}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
        />
      )}

      {/* Main View Area (Full screen in Zen Mode) */}
      <main className={`flex-1 relative overflow-hidden ${isZenMode ? 'pb-0' : 'pb-14 lg:pb-0'}`}>
        {activeTab === 'canvas' && (
          <SchematicCanvas
            project={project}
            onUpdateComponentPosition={handleUpdateComponentPosition}
            onUpdateComponentTransform={handleUpdateComponentTransform}
            onAddWire={handleAddWire}
            onDeleteWire={handleDeleteWire}
            onRemoveComponent={handleRemoveComponent}
          />
        )}

        {activeTab === 'enclosure' && (
          <RealDeviceViewer3D
            project={project}
            onUpdateEnclosure={handleUpdateEnclosure}
            onUpdateComponentTransform={handleUpdateComponentTransform}
            onRemoveComponent={handleRemoveComponent}
            virtualState={virtualState}
            onUpdateVirtualState={setVirtualState}
            onAddLog={(entry) => setLogs((prev) => [...prev, entry])}
          />
        )}

        {activeTab === 'rules' && (
          <ElectricalInspector
            project={project}
            issues={drcIssues}
            onUpdateBatteryCapacity={handleUpdateBatteryCapacity}
            onUpdateDutyCycle={handleUpdateDutyCycle}
          />
        )}

        {activeTab === 'firmware' && (
          <EnhancedCodeEditor
            project={project}
            code={activeCode}
            onChangeCode={setActiveCode}
            onRunCode={() => setActiveTab('emulator')}
          />
        )}

        {activeTab === 'emulator' && (
          <VirtualRunnerModal
            project={project}
            activeCode={activeCode}
            virtualState={virtualState}
            onUpdateVirtualState={setVirtualState}
            logs={logs}
            onAddLog={(entry) => setLogs((prev) => [...prev, entry])}
            onClearLogs={() => setLogs([])}
          />
        )}

        {activeTab === 'bom' && <BomModal project={project} />}
      </main>

      {/* Mobile Bottom Navigation Bar (Hideable in Zen Mode) */}
      {!isZenMode && (
        <MobileNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          issuesCount={issuesCount}
        />
      )}

      {/* Zen Mode Floating Restore Button */}
      {isZenMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1.5 bg-slate-900/95 border border-cyan-500/60 text-cyan-300 hover:text-white px-4 py-2 rounded-full shadow-2xl text-xs font-semibold backdrop-blur cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Open Navigation & Windows"
          >
            <ChevronUp className="w-4 h-4 text-cyan-400" />
            <span>Show Navigation & Windows</span>
          </button>
        </div>
      )}

      {/* Hardware Component Palette Modal */}
      <ComponentPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectComponent={handleSelectComponent}
      />
    </div>
  );
}
