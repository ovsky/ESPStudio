import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  Box,
  Layers,
  Sliders,
  RotateCcw,
  Maximize2,
  Tv,
  Cpu,
  Battery,
  Cable,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MousePointer,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import {
  DeviceProject,
  DeviceEnclosureSpecs,
  ComponentModule,
  VirtualHardwareState,
  SerialLogEntry
} from '../../types/hardware';
import {
  createMcuBoardMesh,
  createDisplayMesh,
  createKeyboardMesh,
  createModemMesh,
  createAudioMesh,
  createBatteryMesh,
  createRotaryMesh,
  createRelayMesh,
  createSensorMesh,
  create3dWireMesh,
  createEnclosure3dMesh
} from './module-models';
import {
  renderDisplayToCanvas,
  handleDisplayTouch
} from '../../core/interactive-display';

interface RealDeviceViewer3DProps {
  project: DeviceProject;
  onUpdateEnclosure: (specs: Partial<DeviceEnclosureSpecs>) => void;
  virtualState?: VirtualHardwareState;
  onUpdateVirtualState?: (state: VirtualHardwareState) => void;
  onAddLog?: (entry: SerialLogEntry) => void;
}

export const RealDeviceViewer3D: React.FC<RealDeviceViewer3DProps> = ({
  project,
  onUpdateEnclosure,
  virtualState,
  onUpdateVirtualState,
  onAddLog
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 3D Scene Controls State
  const [explodedFactor, setExplodedFactor] = useState(0.2); // 0 = fully assembled, 1 = exploded
  const [caseOpacity, setCaseOpacity] = useState(0.88);
  const [showShell, setShowShell] = useState(true);
  const [showWires, setShowWires] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showModules, setShowModules] = useState(true);
  const [enableAO, setEnableAO] = useState(true);
  const [enableBloom, setEnableBloom] = useState(true);
  const [showTouchPip, setShowTouchPip] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // References to dynamic 3D groups for smooth CAD exploded animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const shellTopGroupRef = useRef<THREE.Group | null>(null);
  const shellBottomGroupRef = useRef<THREE.Group | null>(null);
  const mcuGroupRef = useRef<THREE.Group | null>(null);
  const displayGroupRef = useRef<THREE.Group | null>(null);
  const keyboardGroupRef = useRef<THREE.Group | null>(null);
  const peripheralModulesRef = useRef<Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number }>>([]);
  const batteryGroupRef = useRef<THREE.Group | null>(null);
  const wiresGroupRef = useRef<THREE.Group | null>(null);

  // Dynamic Touchscreen Canvas & Texture for 3D Display Glass
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // RequestRender helper for pacing on software WebGL
  const requestRenderRef = useRef<(() => void) | null>(null);

  // Tone sound synthesizer helper
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
      // Ignored if browser audio blocked
    }
  };

  // 1. Initialize Offscreen Display Canvas & THREE.CanvasTexture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    screenCanvasRef.current = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    screenTextureRef.current = texture;
  }, []);

  // Update canvas texture whenever virtualState or project changes
  useEffect(() => {
    if (!screenCanvasRef.current || !screenTextureRef.current) return;
    if (virtualState) {
      renderDisplayToCanvas(screenCanvasRef.current, virtualState, project);
      screenTextureRef.current.needsUpdate = true;
      if (pipCanvasRef.current) {
        renderDisplayToCanvas(pipCanvasRef.current, virtualState, project);
      }
      if (requestRenderRef.current) requestRenderRef.current();
    }
  }, [virtualState, project]);

  // Handle Touch Screen Dispatch
  const dispatchTouch = useCallback(
    (touchX: number, touchY: number) => {
      if (!virtualState || !onUpdateVirtualState) return;
      const { updatedState, serialEvent, audioFreq } = handleDisplayTouch(
        virtualState,
        touchX,
        touchY,
        project
      );

      if (audioFreq) {
        playTone(audioFreq);
      }

      onUpdateVirtualState(updatedState);

      if (serialEvent && onAddLog) {
        onAddLog({
          id: `touch_${Date.now()}_${Math.random()}`,
          timestampMs: Date.now(),
          level: 'info',
          text: serialEvent
        });
      }
    },
    [virtualState, onUpdateVirtualState, onAddLog, project]
  );

  // 2. Initialize Three.js Scene, Renderer & Postprocessing
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene & Environment
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(13, 15, 19);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip below horizon
    controls.minDistance = 5;
    controls.maxDistance = 55;
    controlsRef.current = controls;

    // Studio Lighting Rig for Global Illumination Feel
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    keyLight.position.set(12, 24, 14);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 45;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    fillLight.position.set(-14, 10, -12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.6);
    rimLight.position.set(0, -6, 15);
    scene.add(rimLight);

    // Ground Contact Shadow Floor Plane
    const groundGeo = new THREE.PlaneGeometry(70, 70);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.8;
    ground.receiveShadow = true;
    scene.add(ground);

    // Precision CAD Grid Floor Guide
    const grid = new THREE.GridHelper(50, 50, 0x0284c7, 0x1e293b);
    grid.position.y = -3.78;
    scene.add(grid);

    // EffectComposer Postprocessing (GTAO + Subtle Bloom + OutputPass)
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // GTAO Ambient Occlusion Pass
        const gtaoPass = new GTAOPass(scene, camera, width, height);
        gtaoPass.output = GTAOPass.OUTPUT.Default;
        gtaoPass.blendIntensity = 0.8;
        composer.addPass(gtaoPass);

        // Subtle Bloom Pass for screen glow and LED illumination
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.32, // strength
          0.25, // radius
          0.86  // threshold
        );
        composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        composerRef.current = composer;
      } catch (e) {
        console.warn('Postprocessing composer fallback to direct render:', e);
        composer = null;
      }
    }

    // Request Render Loop with Pacing
    let renderBusy = false;
    let renderDirty = false;
    let frameId = 0;

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        if (composerRef.current) {
          composerRef.current.render();
        } else {
          renderer.render(scene, camera);
        }
        renderBusy = false;
        if (renderDirty) requestRender();
      });
    };
    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    // 3D Raycasting for Direct Screen Touch Interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // Left click only
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Check if touched the interactive screen mesh
      for (const hit of intersects) {
        if (hit.object.name === 'TOUCH_DISPLAY_SCREEN' && hit.uv) {
          const touchX = Math.round(hit.uv.x * 512);
          const touchY = Math.round((1 - hit.uv.y) * 384);
          dispatchTouch(touchX, touchY);
          event.stopPropagation();
          break;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      if (composerRef.current) {
        composerRef.current.setSize(w, h);
      }
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    requestRender();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      controls.dispose();
      if (composerRef.current) {
        composerRef.current.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dispatchTouch]);

  // 3. Build & Populate 3D Device CAD Model
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean existing assembly
    const existing = scene.getObjectByName('DEVICE_ROOT');
    if (existing) {
      scene.remove(existing);
    }

    shellTopGroupRef.current = null;
    shellBottomGroupRef.current = null;
    mcuGroupRef.current = null;
    displayGroupRef.current = null;
    keyboardGroupRef.current = null;
    peripheralModulesRef.current = [];
    batteryGroupRef.current = null;
    wiresGroupRef.current = null;

    // Root Assembly Group
    const deviceRoot = new THREE.Group();
    deviceRoot.name = 'DEVICE_ROOT';

    // 1. Enclosure Casing (Split Top Bezel & Bottom Tray)
    if (showShell) {
      const shell = createEnclosure3dMesh(project.enclosure, caseOpacity);
      const topGroup = shell.getObjectByName('ENCLOSURE_TOP') as THREE.Group;
      const bottomGroup = shell.getObjectByName('ENCLOSURE_BOTTOM') as THREE.Group;

      shellTopGroupRef.current = topGroup;
      shellBottomGroupRef.current = bottomGroup;
      deviceRoot.add(shell);
    }

    // 2. MCU Board (Anchored at Y = 0)
    const mcuMesh = createMcuBoardMesh(project.mcu);
    mcuMesh.position.set(0, 0, 0);
    mcuGroupRef.current = mcuMesh;
    deviceRoot.add(mcuMesh);

    // 3. Modular Components (Added directly to deviceRoot for clean independent layer separation)
    const modulesToTrack: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number }> = [];

    project.components.forEach((comp) => {
      let compMesh: THREE.Group | null = null;
      let baseX = 0;
      let baseY = 0.3;
      let baseZ = 0;

      if (comp.category === 'display') {
        compMesh = createDisplayMesh(comp, screenTextureRef.current);
        baseX = 0;
        baseY = 0.8;
        baseZ = -1.6;
        compMesh.position.set(baseX, baseY, baseZ);
        displayGroupRef.current = compMesh;
        if (showModules) deviceRoot.add(compMesh);
      } else if (comp.category === 'input') {
        if (comp.typeId.includes('rotary')) {
          compMesh = createRotaryMesh(comp);
          baseX = 2.8;
          baseY = 0.4;
          baseZ = 2.2;
        } else {
          compMesh = createKeyboardMesh(comp);
          baseX = 0;
          baseY = 0.6;
          baseZ = 2.2;
          keyboardGroupRef.current = compMesh;
        }
        if (compMesh) {
          compMesh.position.set(baseX, baseY, baseZ);
          if (showModules) deviceRoot.add(compMesh);
        }
      } else if (comp.category === 'connectivity') {
        compMesh = createModemMesh(comp);
        baseX = -2.8;
        baseY = 0.3;
        baseZ = -0.2;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'audio') {
        compMesh = createAudioMesh(comp);
        baseX = 2.7;
        baseY = 0.3;
        baseZ = -0.6;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'actuator') {
        compMesh = createRelayMesh(comp);
        baseX = 0;
        baseY = 0.3;
        baseZ = 1.8;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'sensor') {
        compMesh = createSensorMesh(comp);
        baseX = -2.5;
        baseY = 0.25;
        baseZ = 2.2;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      }

      if (compMesh) {
        if (comp.rotation) {
          compMesh.rotation.y = (comp.rotation * Math.PI) / 180;
        }
        if (comp.scale && comp.scale !== 1.0) {
          compMesh.scale.set(comp.scale, comp.scale, comp.scale);
        }
      }
    });

    peripheralModulesRef.current = modulesToTrack;

    // 4. LiPo Battery Pack (Positioned under MCU)
    if (showBattery && project.batteryCapacityMah > 0) {
      const battery = createBatteryMesh(project.batteryCapacityMah);
      battery.position.set(0, -1.1, 0.2);
      batteryGroupRef.current = battery;
      deviceRoot.add(battery);
    }

    // 5. 3D Wire Harness
    if (showWires) {
      const wiresGroup = new THREE.Group();
      wiresGroup.name = 'WIRE_HARNESS';

      project.wires.forEach((wire) => {
        const start = new THREE.Vector3(
          wire.fromComponentId === 'mcu' ? -1.4 : 1.6,
          0.3,
          -2.0 + Math.random() * 4.0
        );
        const end = new THREE.Vector3(
          wire.toComponentId === 'mcu' ? -1.4 : 2.2,
          0.8,
          -1.5 + Math.random() * 3.5
        );

        const wireMesh = create3dWireMesh(start, end, wire.color, wire.gauge);
        wiresGroup.add(wireMesh);
      });

      wiresGroupRef.current = wiresGroup;
      deviceRoot.add(wiresGroup);
    }

    scene.add(deviceRoot);
    if (requestRenderRef.current) requestRenderRef.current();
  }, [project, showShell, showWires, showBattery, showModules, caseOpacity]);

  // 4. Multi-Tier Exploded CAD Separation Animation
  useEffect(() => {
    const factor = explodedFactor;
    const depth = project.enclosure.depthMm / 10.0;
    const wall = (project.enclosure.wallThicknessMm || 2.0) / 10.0;

    // 1. Top Bezel lifts highest (+Y)
    if (shellTopGroupRef.current) {
      shellTopGroupRef.current.position.y = depth / 2 - wall / 2 + factor * 6.5;
    }

    // 2. Display lifts below bezel
    if (displayGroupRef.current) {
      displayGroupRef.current.position.y = 0.8 + factor * 4.8;
    }

    // 3. Physical Keyboard lifts
    if (keyboardGroupRef.current) {
      keyboardGroupRef.current.position.y = 0.6 + factor * 3.4;
    }

    // 4. Peripheral Modules expand outward radially and lift slightly
    peripheralModulesRef.current.forEach(({ mesh, baseX, baseZ, baseY }) => {
      const radialX = baseX > 0 ? baseX + factor * 1.8 : baseX - factor * 1.8;
      const radialZ = baseZ > 0 ? baseZ + factor * 1.5 : baseZ - factor * 1.5;
      mesh.position.set(radialX, baseY + factor * 2.2, radialZ);
    });

    // 5. Motherboard stays grounded at Y = 0 (Central Anchor)
    if (mcuGroupRef.current) {
      mcuGroupRef.current.position.y = 0;
    }

    // 6. Wires float mid-level
    if (wiresGroupRef.current) {
      wiresGroupRef.current.position.y = factor * 1.5;
    }

    // 7. Battery lowers downward (-Y)
    if (batteryGroupRef.current) {
      batteryGroupRef.current.position.y = -1.1 - factor * 3.8;
    }

    // 8. Bottom Chassis lowers furthest downward (-Y)
    if (shellBottomGroupRef.current) {
      shellBottomGroupRef.current.position.y = -depth / 2 + wall / 2 - factor * 6.0;
    }

    if (requestRenderRef.current) requestRenderRef.current();
  }, [explodedFactor, project.enclosure.depthMm, project.enclosure.wallThicknessMm]);

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'front' | 'top' | 'macro') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    switch (preset) {
      case 'iso':
        camera.position.set(13, 15, 19);
        break;
      case 'front':
        camera.position.set(0, 2, 26);
        break;
      case 'top':
        camera.position.set(0, 28, 0.1);
        break;
      case 'macro':
        camera.position.set(4, 5, 6);
        break;
    }
    controls.target.set(0, 0, 0);
    controls.update();
    if (requestRenderRef.current) requestRenderRef.current();
  };

  // Picture-in-Picture Direct Touch Click Handler
  const handlePipClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 512 / rect.width;
    const scaleY = 384 / rect.height;
    const touchX = Math.max(0, Math.min(512, (e.clientX - rect.left) * scaleX));
    const touchY = Math.max(0, Math.min(384, (e.clientY - rect.top) * scaleY));
    dispatchTouch(touchX, touchY);
  };

  return (
    <div className="relative w-full h-full bg-[#070b13] overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec Badge */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-xl max-w-xs text-xs pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h3 className="font-bold text-white tracking-tight text-xs">{project.name}</h3>
        </div>
        <p className="text-[11px] text-slate-400">
          Board: <strong className="text-cyan-300 font-mono">{project.mcu.name}</strong>
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
          {project.enclosure.widthMm} × {project.enclosure.heightMm} × {project.enclosure.depthMm} mm ({project.enclosure.material})
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-emerald-400 font-mono">
          <MousePointer className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Click 3D screen to touch</span>
        </div>
      </div>

      {/* Top Right Controls Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Camera Angles */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-xl text-xs">
          <button
            onClick={() => setCameraPreset('iso')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            Isometric
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            Top
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('macro')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            Macro
          </button>
        </div>

        {/* Touchscreen PIP Toggle Button */}
        <button
          onClick={() => setShowTouchPip(!showTouchPip)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow-xl transition-all cursor-pointer ${
            showTouchPip
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
              : 'bg-slate-900/90 backdrop-blur border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Toggle interactive 2D touchscreen glass overlay"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{showTouchPip ? 'Hide Screen Glass' : 'Touchscreen PIP'}</span>
        </button>
      </div>

      {/* Floating Picture-in-Picture Touchscreen Glass Overlay */}
      {showTouchPip && (
        <div className="absolute top-16 right-4 z-30 w-72 sm:w-80 bg-slate-950/95 backdrop-blur border border-cyan-500/40 rounded-2xl shadow-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-cyan-400" />
              Direct Touch Glass Surface
            </span>
            <button
              onClick={() => setShowTouchPip(false)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-[#040810]">
            <canvas
              ref={pipCanvasRef}
              width={512}
              height={384}
              onClick={handlePipClick}
              className="w-full h-auto aspect-[4/3] cursor-pointer touch-none block"
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Tap phone / lights / sensors</span>
            <span className="text-cyan-400">Live 3D Mirroring</span>
          </div>
        </div>
      )}

      {/* Collapsible Unified Bottom CAD Control Dock */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-out flex flex-col items-center"
        style={{
          transform: `translateX(-50%) translateY(${isHudCollapsed ? 'calc(100% - 32px)' : '0px'})`,
          maxWidth: 'min(940px, 94vw)'
        }}
      >
        {/* Collapse / Expand Tab Toggle */}
        <button
          onClick={() => setIsHudCollapsed(!isHudCollapsed)}
          className="flex items-center gap-1.5 bg-slate-900/95 border-t border-x border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium px-4 py-1.5 rounded-t-xl shadow-lg cursor-pointer transition-colors"
        >
          {isHudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isHudCollapsed ? 'Show 3D Studio CAD Controls' : 'Hide Controls (Zen Mode)'}</span>
        </button>

        {/* Main Dock Glass Panel */}
        <div className="w-full bg-slate-900/95 backdrop-blur border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-3 text-xs text-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Exploded View Slider */}
            <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  CAD Exploded Assembly
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(explodedFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Assembled Enclosure</span>
                <span>Expanded Layers</span>
              </div>
            </div>

            {/* Case Transparency Slider */}
            <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  Shell Opacity
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(caseOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={caseOpacity}
                onChange={(e) => setCaseOpacity(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>See-Through Glass</span>
                <span>Solid Material</span>
              </div>
            </div>

            {/* Material Finish Swatches */}
            <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-white block mb-1">Casing Finish</span>
              <div className="flex items-center gap-2">
                <select
                  value={project.enclosure.material}
                  onChange={(e) => onUpdateEnclosure({ material: e.target.value as any })}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-1.5 outline-none focus:border-cyan-500 cursor-pointer flex-1"
                >
                  <option value="Anodized Aluminum">Anodized Aluminum</option>
                  <option value="CNC Polycarbonate">CNC Polycarbonate</option>
                  <option value="3D-Printed PETG">3D-Printed PETG</option>
                </select>
                <input
                  type="color"
                  value={project.enclosure.colorHex}
                  onChange={(e) => onUpdateEnclosure({ colorHex: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Layer Visibility & Visual Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-2.5 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Display Layers:</span>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showShell}
                onChange={(e) => setShowShell(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Top Bezel & Bottom Chassis</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showModules}
                onChange={(e) => setShowModules(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Displays & Modules</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showWires}
                onChange={(e) => setShowWires(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>3D Wiring Harness</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showBattery}
                onChange={(e) => setShowBattery(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>LiPo Battery</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
