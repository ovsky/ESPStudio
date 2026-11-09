import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  Box,
  Layers,
  Sliders,
  RotateCcw,
  RotateCw,
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
  Smartphone,
  Sun,
  Palette,
  Play,
  Pause,
  Grid,
  Shield,
  Disc,
  Camera,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  Move,
  Scale,
  Info,
  Trash2,
  Focus,
  GripHorizontal,
  Minimize2,
  X
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
  onUpdateComponentTransform?: (
    componentId: string,
    transform: { x?: number; y?: number; cadX?: number; cadY?: number; cadZ?: number; rotation?: number; scale?: number }
  ) => void;
  onRemoveComponent?: (componentId: string) => void;
  virtualState?: VirtualHardwareState;
  onUpdateVirtualState?: (state: VirtualHardwareState) => void;
  onAddLog?: (entry: SerialLogEntry) => void;
}

export type RenderPreset =
  | 'scifi-diorama'
  | 'clean-lab'
  | 'unreal-studio'
  | 'cyberpunk-neon'
  | 'stealth-noir'
  | 'outdoor-daylight'
  | 'blueprint-cad';

export type RenderStyleMode =
  | 'textured'
  | 'wireframe-shell'
  | 'all-wireframe'
  | 'xray-cad'
  | 'clay-sculpt';

export const RealDeviceViewer3D: React.FC<RealDeviceViewer3DProps> = ({
  project,
  onUpdateEnclosure,
  onUpdateComponentTransform,
  onRemoveComponent,
  virtualState,
  onUpdateVirtualState,
  onAddLog
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 3D Assembly & Casing Controls State
  const [explodedFactor, setExplodedFactor] = useState(0.2); // 0 = assembled, 1 = exploded
  const [caseOpacity, setCaseOpacity] = useState(0.88);
  const [showShell, setShowShell] = useState(true);
  const [showWires, setShowWires] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showModules, setShowModules] = useState(true);
  const [showGuideLines, setShowGuideLines] = useState(true);
  const [isWireframeShell, setIsWireframeShell] = useState(false);

  // Unreal / Shadertoy & Wireframe CAD Rendering Settings
  const [renderPreset, setRenderPreset] = useState<RenderPreset>('scifi-diorama');
  const [renderStyle, setRenderStyle] = useState<RenderStyleMode>('textured');
  const [screenBrightness, setScreenBrightness] = useState(1.25);
  const [enableAO, setEnableAO] = useState(true);
  const [ssaoKernelRadius, setSsaoKernelRadius] = useState(16);
  const [ssaoMinDistance, setSsaoMinDistance] = useState(0.005);
  const [ssaoMaxDistance, setSsaoMaxDistance] = useState(0.18);
  const [ssaoOutput, setSsaoOutput] = useState<'default' | 'ssao' | 'depth' | 'normal'>('default');
  const [enableGI, setEnableGI] = useState(true);
  const [giIntensity, setGiIntensity] = useState(1.1);
  const [giBounceColor, setGiBounceColor] = useState('#f97316'); // Warm sci-fi diorama orange
  const [enableBloom, setEnableBloom] = useState(false);
  const [bloomStrength, setBloomStrength] = useState(0.18);
  const [exposure, setExposure] = useState(1.08);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showFloorGrid, setShowFloorGrid] = useState(true);
  const [pcbColor, setPcbColor] = useState<'black' | 'green' | 'blue' | 'purple' | 'cyan' | 'white' | 'red'>('black');

  // UI Panels Visibility & Tab state
  const [isZenMode, setIsZenMode] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(true); // Hidden by default as requested!
  const [activeHudTab, setActiveHudTab] = useState<'inspector' | 'exploded' | 'styles' | 'render' | 'camera'>('inspector');
  const [showTouchPip, setShowTouchPip] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const setSelectedComponentIdRef = useRef<((id: string | null) => void) | null>(null);
  setSelectedComponentIdRef.current = setSelectedComponentId;
  const setIsHudCollapsedRef = useRef<((collapsed: boolean) => void) | null>(null);
  setIsHudCollapsedRef.current = setIsHudCollapsed;
  const setActiveHudTabRef = useRef<((tab: any) => void) | null>(null);
  setActiveHudTabRef.current = setActiveHudTab;

  // Moveable & Scalable CAD HUD Window State (Starts compact / smaller at default)
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);
  const [hudSize, setHudSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? Math.min(440, window.innerWidth - 24) : 440,
    height: 480
  });
  const [isDraggingHud, setIsDraggingHud] = useState(false);
  const [isResizingHud, setIsResizingHud] = useState(false);
  const hudDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const hudResizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Moveable & Scalable Touch Mirror PIP Window State (Smaller at default: 260px)
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
  const [pipWidth, setPipWidth] = useState<number>(260);
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [isResizingPip, setIsResizingPip] = useState(false);
  const pipDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const pipResizeRef = useRef<{ startX: number; origW: number } | null>(null);

  // Blender-Quality Studio Render State
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [renderResolution, setRenderResolution] = useState<'1080p' | '2k' | '4k'>('2k');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isRenderingImage, setIsRenderingImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // References to 3D Scene Objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const ssaoPassRef = useRef<SSAOPass | null>(null);
  const giBounceLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Lighting Rig references for instant preset adjustments
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // References to exploded parts
  const shellTopGroupRef = useRef<THREE.Group | null>(null);
  const shellBottomGroupRef = useRef<THREE.Group | null>(null);
  const mcuGroupRef = useRef<THREE.Group | null>(null);
  const displayGroupRef = useRef<THREE.Group | null>(null);
  const keyboardGroupRef = useRef<THREE.Group | null>(null);
  const peripheralModulesRef = useRef<Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number; componentId?: string }>>([]);
  const batteryGroupRef = useRef<THREE.Group | null>(null);
  const wiresGroupRef = useRef<THREE.Group | null>(null);
  const guideLinesGroupRef = useRef<THREE.Group | null>(null);

  // Dynamic Touchscreen Canvas & Texture for 3D Phone Screen
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // RequestRender helper
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
      // Audio autoplay restrictions ignored
    }
  };

  // 1. Initialize Offscreen Display Canvas & THREE.CanvasTexture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    if (virtualState) {
      renderDisplayToCanvas(canvas, virtualState, project);
    }
    screenCanvasRef.current = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
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
    renderer.toneMappingExposure = exposure;
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
    camera.position.set(13, 14, 18);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.minDistance = 4;
    controls.maxDistance = 60;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // Cinematic 4-Point Lighting Rig (Default Clean Lab preset)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.4);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(8, 28, 12);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.bias = -0.0003;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 50;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
    }
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.5);
    fillLight.position.set(-14, 12, -12);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.7);
    rimLight.position.set(0, -6, 16);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Global Illumination (GI) Floor Diffuse Bounce Light
    const giBounceLight = new THREE.DirectionalLight(0xf97316, 0.9);
    giBounceLight.position.set(0, -8, 0);
    scene.add(giBounceLight);
    giBounceLightRef.current = giBounceLight;

    // Studio Ground Pedestal with Radial Shadow
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.8;
    ground.receiveShadow = true;
    scene.add(ground);

    // Glowing Precision CAD Grid Floor Guide
    const grid = new THREE.GridHelper(50, 50, 0xf97316, 0x1e293b);
    grid.position.y = -3.78;
    grid.visible = showFloorGrid;
    scene.add(grid);
    gridHelperRef.current = grid;

    // EffectComposer Postprocessing (SSAOPass + UnrealBloomPass + OutputPass)
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const ssaoPass = new SSAOPass(scene, camera, width, height);
        ssaoPass.kernelRadius = ssaoKernelRadius;
        ssaoPass.minDistance = ssaoMinDistance;
        ssaoPass.maxDistance = ssaoMaxDistance;
        ssaoPass.output = ssaoOutput === 'ssao'
          ? SSAOPass.OUTPUT.SSAO
          : ssaoOutput === 'depth'
          ? SSAOPass.OUTPUT.Depth
          : ssaoOutput === 'normal'
          ? SSAOPass.OUTPUT.Normal
          : SSAOPass.OUTPUT.Default;
        ssaoPass.enabled = enableAO;
        composer.addPass(ssaoPass);
        ssaoPassRef.current = ssaoPass;

        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          bloomStrength,
          0.3,
          0.82
        );
        bloomPass.enabled = enableBloom;
        composer.addPass(bloomPass);
        bloomPassRef.current = bloomPass;

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        composerRef.current = composer;
      } catch (e) {
        console.warn('Postprocessing composer fallback to direct render:', e);
        composer = null;
      }
    }

    // Render loop
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
        if (renderDirty || autoRotate) requestRender();
      });
    };
    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    // 3D Raycasting for Direct Phone Screen Touch Interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let hitScreen = false;
      for (const hit of intersects) {
        if (hit.object.name === 'TOUCH_DISPLAY_SCREEN' && hit.uv) {
          const touchX = Math.round(hit.uv.x * 512);
          const touchY = Math.round((1 - hit.uv.y) * 384);
          dispatchTouch(touchX, touchY);
          hitScreen = true;
          event.stopPropagation();
          break;
        }
      }

      // If not clicking interactive screen apps, check if user clicked any hardware module, MCU, or battery to select it!
      if (!hitScreen) {
        let foundId: string | null = null;
        for (const hit of intersects) {
          if (hit.object === ground || hit.object === grid) continue;
          let cur: THREE.Object3D | null = hit.object;
          while (cur && cur !== scene) {
            if (cur.userData && cur.userData.componentId) {
              foundId = cur.userData.componentId;
              break;
            }
            cur = cur.parent;
          }
          if (foundId) break;
        }

        if (foundId && setSelectedComponentIdRef.current) {
          setSelectedComponentIdRef.current(foundId);
          if (setIsHudCollapsedRef.current) setIsHudCollapsedRef.current(false);
          if (setActiveHudTabRef.current) setActiveHudTabRef.current('inspector');
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

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
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Controls autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      if (autoRotate && requestRenderRef.current) {
        requestRenderRef.current();
      }
    }
  }, [autoRotate]);

  // Update Postprocessing & SSAO / GI parameters
  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = enableBloom;
      bloomPassRef.current.strength = bloomStrength;
    }
    if (ssaoPassRef.current) {
      ssaoPassRef.current.enabled = enableAO;
      ssaoPassRef.current.kernelRadius = ssaoKernelRadius;
      ssaoPassRef.current.minDistance = ssaoMinDistance;
      ssaoPassRef.current.maxDistance = ssaoMaxDistance;
      ssaoPassRef.current.output = ssaoOutput === 'ssao'
        ? SSAOPass.OUTPUT.SSAO
        : ssaoOutput === 'depth'
        ? SSAOPass.OUTPUT.Depth
        : ssaoOutput === 'normal'
        ? SSAOPass.OUTPUT.Normal
        : SSAOPass.OUTPUT.Default;
    }
    if (giBounceLightRef.current) {
      giBounceLightRef.current.intensity = enableGI ? giIntensity * 0.75 : 0;
      giBounceLightRef.current.color.set(giBounceColor);
    }
    if (sceneRef.current) {
      (sceneRef.current as any).environmentIntensity = enableGI ? giIntensity : 0.2;
    }
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = exposure;
    }
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showFloorGrid;
    }
    if (requestRenderRef.current) requestRenderRef.current();
  }, [
    enableBloom,
    bloomStrength,
    enableAO,
    ssaoKernelRadius,
    ssaoMinDistance,
    ssaoMaxDistance,
    ssaoOutput,
    enableGI,
    giIntensity,
    giBounceColor,
    exposure,
    showFloorGrid
  ]);

  // Lighting preset switcher (Sci-Fi Diorama, Unreal Studio, Cyberpunk Neon, Clean Lab, Stealth Noir)
  useEffect(() => {
    const key = keyLightRef.current;
    const fill = fillLightRef.current;
    const rim = rimLightRef.current;
    const hemi = hemiLightRef.current;
    const grid = gridHelperRef.current;
    if (!key || !fill || !rim || !hemi) return;

    if (renderPreset === 'scifi-diorama') {
      key.color.setHex(0xffedd5);
      key.intensity = 2.7;
      key.position.set(16, 26, 14);

      fill.color.setHex(0x38bdf8);
      fill.intensity = 1.35;

      rim.color.setHex(0xf97316);
      rim.intensity = 1.25;

      hemi.color.setHex(0x60a5fa);
      hemi.groundColor.setHex(0x1e2433);

      setExposure(1.1);
      setBloomStrength(0.12);
      setGiBounceColor('#f97316');
      setGiIntensity(1.2);
    } else if (renderPreset === 'unreal-studio') {
      key.color.setHex(0xfff5ea);
      key.intensity = 2.6;
      key.position.set(12, 24, 14);

      fill.color.setHex(0x38bdf8);
      fill.intensity = 1.2;

      rim.color.setHex(0xa855f7);
      rim.intensity = 0.9;

      hemi.color.setHex(0xffffff);
      hemi.groundColor.setHex(0x090d16);

      setExposure(1.18);
      setBloomStrength(0.35);
    } else if (renderPreset === 'cyberpunk-neon') {
      key.color.setHex(0x06b6d4);
      key.intensity = 3.2;
      key.position.set(14, 20, 12);

      fill.color.setHex(0xec4899);
      fill.intensity = 2.2;

      rim.color.setHex(0x8b5cf6);
      rim.intensity = 1.8;

      hemi.color.setHex(0x083344);
      hemi.groundColor.setHex(0x020617);

      setExposure(1.28);
      setBloomStrength(0.65);
    } else if (renderPreset === 'clean-lab') {
      key.color.setHex(0xffffff);
      key.intensity = 2.8;
      key.position.set(8, 28, 12);

      fill.color.setHex(0xe2e8f0);
      fill.intensity = 1.5;

      rim.color.setHex(0x94a3b8);
      rim.intensity = 0.7;

      hemi.color.setHex(0xffffff);
      hemi.groundColor.setHex(0x1e293b);

      setExposure(1.08);
      setBloomStrength(0.18);
    } else if (renderPreset === 'stealth-noir') {
      key.color.setHex(0xffd59e);
      key.intensity = 2.2;
      key.position.set(16, 18, 16);

      fill.color.setHex(0x1e293b);
      fill.intensity = 0.6;

      rim.color.setHex(0x38bdf8);
      rim.intensity = 1.6;

      hemi.color.setHex(0x334155);
      hemi.groundColor.setHex(0x000000);

      setExposure(1.0);
      setBloomStrength(0.45);
    } else if (renderPreset === 'outdoor-daylight') {
      key.color.setHex(0xfff7ed);
      key.intensity = 3.6;
      key.position.set(10, 32, 10);

      fill.color.setHex(0x93c5fd);
      fill.intensity = 1.6;

      rim.color.setHex(0xfef08a);
      rim.intensity = 0.8;

      hemi.color.setHex(0xbae6fd);
      hemi.groundColor.setHex(0x334155);

      setExposure(1.15);
      setBloomStrength(0.12);
    } else if (renderPreset === 'blueprint-cad') {
      key.color.setHex(0x38bdf8);
      key.intensity = 2.4;
      key.position.set(0, 26, 16);

      fill.color.setHex(0x0284c7);
      fill.intensity = 1.8;

      rim.color.setHex(0x06b6d4);
      rim.intensity = 1.5;

      hemi.color.setHex(0x0369a1);
      hemi.groundColor.setHex(0x020617);

      setExposure(1.0);
      setBloomStrength(0.2);
    }

    if (requestRenderRef.current) requestRenderRef.current();
  }, [renderPreset]);

  // 3. Build & Populate 3D Device CAD Model
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = scene.getObjectByName('DEVICE_ROOT');
    if (existing) scene.remove(existing);

    shellTopGroupRef.current = null;
    shellBottomGroupRef.current = null;
    mcuGroupRef.current = null;
    displayGroupRef.current = null;
    keyboardGroupRef.current = null;
    peripheralModulesRef.current = [];
    batteryGroupRef.current = null;
    wiresGroupRef.current = null;
    guideLinesGroupRef.current = null;

    const deviceRoot = new THREE.Group();
    deviceRoot.name = 'DEVICE_ROOT';

    // 1. Enclosure Casing
    if (showShell) {
      const shell = createEnclosure3dMesh(project.enclosure, caseOpacity);

      if (isWireframeShell) {
        shell.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.material) {
              (m.material as any).wireframe = true;
            }
          }
        });
      }

      const topGroup = shell.getObjectByName('ENCLOSURE_TOP') as THREE.Group;
      const bottomGroup = shell.getObjectByName('ENCLOSURE_BOTTOM') as THREE.Group;

      shell.userData = { componentId: 'enclosure', componentName: 'Device Enclosure', category: 'enclosure' };
      shell.traverse((child) => {
        child.userData = { ...child.userData, componentId: 'enclosure' };
      });

      shellTopGroupRef.current = topGroup;
      shellBottomGroupRef.current = bottomGroup;
      deviceRoot.add(shell);
    }

    // 2. MCU Board
    const mcuMesh = createMcuBoardMesh(project.mcu);
    mcuMesh.userData = { componentId: 'mcu', componentName: project.mcu.name, category: 'mcu' };
    mcuMesh.traverse((child) => {
      child.userData = { ...child.userData, componentId: 'mcu' };
    });
    mcuMesh.position.set(0, 0, 0);
    mcuGroupRef.current = mcuMesh;
    deviceRoot.add(mcuMesh);

    // 3. Modular Components
    const modulesToTrack: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number; componentId?: string }> = [];

    project.components.forEach((comp) => {
      let compMesh: THREE.Group | null = null;
      let baseX = 0;
      let baseY = 0.3;
      let baseZ = 0;

      if (comp.category === 'display') {
        compMesh = createDisplayMesh(comp, screenTextureRef.current || undefined);
        baseX = comp.cadX !== undefined ? comp.cadX : 0;
        baseY = comp.cadY !== undefined ? comp.cadY : 0.8;
        baseZ = comp.cadZ !== undefined ? comp.cadZ : -1.6;
        compMesh.position.set(baseX, baseY, baseZ);
        displayGroupRef.current = compMesh;
        if (showModules) deviceRoot.add(compMesh);
      } else if (comp.category === 'input') {
        if (comp.typeId.includes('rotary')) {
          compMesh = createRotaryMesh(comp);
          baseX = comp.cadX !== undefined ? comp.cadX : 2.8;
          baseY = comp.cadY !== undefined ? comp.cadY : 0.4;
          baseZ = comp.cadZ !== undefined ? comp.cadZ : 2.2;
        } else {
          compMesh = createKeyboardMesh(comp);
          baseX = comp.cadX !== undefined ? comp.cadX : 0;
          baseY = comp.cadY !== undefined ? comp.cadY : 0.6;
          baseZ = comp.cadZ !== undefined ? comp.cadZ : 2.2;
          keyboardGroupRef.current = compMesh;
        }
        if (compMesh) {
          compMesh.position.set(baseX, baseY, baseZ);
          if (showModules) deviceRoot.add(compMesh);
        }
      } else if (comp.category === 'connectivity') {
        compMesh = createModemMesh(comp);
        baseX = comp.cadX !== undefined ? comp.cadX : -2.8;
        baseY = comp.cadY !== undefined ? comp.cadY : 0.3;
        baseZ = comp.cadZ !== undefined ? comp.cadZ : -0.2;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY, componentId: comp.id });
        }
      } else if (comp.category === 'audio') {
        compMesh = createAudioMesh(comp);
        baseX = comp.cadX !== undefined ? comp.cadX : 2.7;
        baseY = comp.cadY !== undefined ? comp.cadY : 0.3;
        baseZ = comp.cadZ !== undefined ? comp.cadZ : -0.6;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY, componentId: comp.id });
        }
      } else if (comp.category === 'actuator') {
        compMesh = createRelayMesh(comp);
        baseX = comp.cadX !== undefined ? comp.cadX : 0;
        baseY = comp.cadY !== undefined ? comp.cadY : 0.3;
        baseZ = comp.cadZ !== undefined ? comp.cadZ : 1.8;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY, componentId: comp.id });
        }
      } else if (comp.category === 'sensor') {
        compMesh = createSensorMesh(comp);
        baseX = comp.cadX !== undefined ? comp.cadX : -2.5;
        baseY = comp.cadY !== undefined ? comp.cadY : 0.25;
        baseZ = comp.cadZ !== undefined ? comp.cadZ : 2.2;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY, componentId: comp.id });
        }
      }

      if (compMesh) {
        compMesh.userData = { componentId: comp.id, componentName: comp.name, category: comp.category };
        compMesh.traverse((child) => {
          child.userData = { ...child.userData, componentId: comp.id };
        });
        if (comp.rotation) {
          compMesh.rotation.y = (comp.rotation * Math.PI) / 180;
        }
        if (comp.scale && comp.scale !== 1.0) {
          compMesh.scale.set(comp.scale, comp.scale, comp.scale);
        }
      }
    });

    peripheralModulesRef.current = modulesToTrack;

    // 4. Battery Pack
    if (showBattery && project.batteryCapacityMah > 0) {
      const battery = createBatteryMesh(project.batteryCapacityMah);
      battery.userData = { componentId: 'battery', componentName: 'LiPo Battery Pack', category: 'power' };
      battery.traverse((child) => {
        child.userData = { ...child.userData, componentId: 'battery' };
      });
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

    // 6. Exploded CAD Guide Alignment Lines
    const guideGroup = new THREE.Group();
    guideGroup.name = 'CAD_GUIDE_LINES';
    const guideMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.35,
      gapSize: 0.2,
      linewidth: 1,
      opacity: 0.5,
      transparent: true
    });

    // 4 Corner Alignment Pillars
    const wHalf = project.enclosure.widthMm / 20.0;
    const lHalf = project.enclosure.heightMm / 20.0;
    [
      [-wHalf + 0.4, -lHalf + 0.4],
      [wHalf - 0.4, -lHalf + 0.4],
      [-wHalf + 0.4, lHalf - 0.4],
      [wHalf - 0.4, lHalf - 0.4]
    ].forEach(([cx, cz]) => {
      const pts = [
        new THREE.Vector3(cx, -6, cz),
        new THREE.Vector3(cx, 6, cz)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, guideMat);
      line.computeLineDistances();
      guideGroup.add(line);
    });

    guideGroup.visible = showGuideLines && explodedFactor > 0.05;
    guideLinesGroupRef.current = guideGroup;
    deviceRoot.add(guideGroup);

    // Apply Global Render Style (Wireframe, X-Ray, Clay, Shell-Wireframe)
    if (renderStyle === 'all-wireframe') {
      deviceRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.name !== 'TOUCH_DISPLAY_SCREEN' && m.material) {
            (m.material as any).wireframe = true;
          }
        }
      });
    } else if (renderStyle === 'wireframe-shell') {
      if (shellTopGroupRef.current) {
        shellTopGroupRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
            ((child as THREE.Mesh).material as any).wireframe = true;
          }
        });
      }
      if (shellBottomGroupRef.current) {
        shellBottomGroupRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
            ((child as THREE.Mesh).material as any).wireframe = true;
          }
        });
      }
    } else if (renderStyle === 'xray-cad') {
      deviceRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.name !== 'TOUCH_DISPLAY_SCREEN' && m.material) {
            (m.material as any).transparent = true;
            (m.material as any).opacity = 0.3;
            if ((m.material as any).roughness !== undefined) {
              (m.material as any).roughness = 0.1;
              (m.material as any).metalness = 0.05;
            }
          }
        }
      });
    } else if (renderStyle === 'clay-sculpt') {
      deviceRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.name !== 'TOUCH_DISPLAY_SCREEN' && m.material) {
            if ((m.material as any).color) {
              (m.material as any).color.setHex(0xd4d4d8);
              (m.material as any).roughness = 0.88;
              (m.material as any).metalness = 0.02;
            }
          }
        }
      });
    }

    // Apply Display Screen Emissive Brightness
    const activeDisplayGroup = displayGroupRef.current as THREE.Group | null;
    if (activeDisplayGroup) {
      activeDisplayGroup.traverse((child: THREE.Object3D) => {
        if (child.name === 'TOUCH_DISPLAY_SCREEN' && (child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.emissiveIntensity = screenBrightness;
          }
        }
      });
    }

    scene.add(deviceRoot);
    if (requestRenderRef.current) requestRenderRef.current();
  }, [project, showShell, showWires, showBattery, showModules, caseOpacity, isWireframeShell, showGuideLines, renderStyle, screenBrightness, pcbColor]);

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
      displayGroupRef.current.position.y = 0.85 + factor * 4.8;
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

    // 9. Guide Lines visibility
    if (guideLinesGroupRef.current) {
      guideLinesGroupRef.current.visible = showGuideLines && factor > 0.05;
    }

    if (selectionBoxRef.current) {
      selectionBoxRef.current.update();
    }

    if (requestRenderRef.current) requestRenderRef.current();
  }, [explodedFactor, project.enclosure.depthMm, project.enclosure.wallThicknessMm, showGuideLines]);

  // 3D Selection Box Helper updates
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (selectionBoxRef.current) {
      scene.remove(selectionBoxRef.current);
      selectionBoxRef.current.dispose();
      selectionBoxRef.current = null;
    }

    if (!selectedComponentId) {
      if (requestRenderRef.current) requestRenderRef.current();
      return;
    }

    let targetObject: THREE.Object3D | null = null;
    if (selectedComponentId === 'mcu') {
      targetObject = mcuGroupRef.current;
    } else if (selectedComponentId === 'battery') {
      targetObject = batteryGroupRef.current;
    } else if (selectedComponentId === 'enclosure') {
      targetObject = shellTopGroupRef.current || shellBottomGroupRef.current;
    } else {
      scene.traverse((obj) => {
        if (obj.userData && obj.userData.componentId === selectedComponentId && obj instanceof THREE.Group) {
          targetObject = obj;
        }
      });
    }

    if (targetObject) {
      const box = new THREE.BoxHelper(targetObject, 0x06b6d4); // Vibrant cyan CAD highlight
      (box.material as THREE.LineBasicMaterial).depthTest = false;
      (box.material as THREE.LineBasicMaterial).transparent = true;
      (box.material as THREE.LineBasicMaterial).opacity = 0.95;
      box.renderOrder = 999;
      scene.add(box);
      selectionBoxRef.current = box;
    }

    if (requestRenderRef.current) requestRenderRef.current();
  }, [selectedComponentId, project.components, explodedFactor]);

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'front' | 'top' | 'macro' | 'screen') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    switch (preset) {
      case 'iso':
        camera.position.set(13, 15, 19);
        controls.target.set(0, 0, 0);
        break;
      case 'screen':
        camera.position.set(0, 11, -0.4);
        controls.target.set(0, 0.85, -1.6);
        break;
      case 'front':
        camera.position.set(0, 2, 26);
        controls.target.set(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 28, 0.1);
        controls.target.set(0, 0, 0);
        break;
      case 'macro':
        camera.position.set(4, 5, 6);
        controls.target.set(0, 0, 0);
        break;
    }
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

  // Blender-Quality Studio 4K Snapshot Exporter
  const handleRenderBlenderHeroShot = async () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    setIsRenderingImage(true);

    // Yield to let React display spinner
    await new Promise((r) => setTimeout(r, 60));

    try {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const composer = composerRef.current;

      let targetW = 2560;
      let targetH = 1440;
      if (renderResolution === '1080p') {
        targetW = 1920;
        targetH = 1080;
      } else if (renderResolution === '4k') {
        targetW = 3840;
        targetH = 2160;
      }

      const origW = mountRef.current?.clientWidth || 800;
      const origH = mountRef.current?.clientHeight || 600;

      // Update camera and renderer for high-dpi capture
      camera.aspect = targetW / targetH;
      camera.updateProjectionMatrix();
      renderer.setSize(targetW, targetH, false);
      if (composer) composer.setSize(targetW, targetH);

      // Render high-res pass
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      // Create composite canvas for spec sheet watermark
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(renderer.domElement, 0, 0, targetW, targetH);

        if (includeWatermark) {
          // Subtle dark vignette at bottom
          const grad = ctx.createLinearGradient(0, targetH - 240, 0, targetH);
          grad.addColorStop(0, 'rgba(7, 11, 19, 0)');
          grad.addColorStop(1, 'rgba(7, 11, 19, 0.88)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, targetH - 240, targetW, 240);

          // Top hazard bar (inspired by sci-fi images)
          const hazardH = 8;
          ctx.fillStyle = '#f97316';
          ctx.fillRect(0, 0, targetW, hazardH);

          // Left specs branding
          ctx.fillStyle = '#06b6d4';
          ctx.font = 'bold 32px "JetBrains Mono", monospace, sans-serif';
          ctx.fillText('ESP-FORGE STUDIO // HARDWARE CAD', 60, targetH - 120);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px sans-serif';
          ctx.fillText(project.name, 60, targetH - 65);

          // Right specs
          ctx.textAlign = 'right';
          ctx.fillStyle = '#94a3b8';
          ctx.font = '26px "JetBrains Mono", monospace, sans-serif';
          ctx.fillText(
            `MCU: ${project.mcu.name} | ${project.components.length} Modules | ${project.wires.length} Nets`,
            targetW - 60,
            targetH - 110
          );

          ctx.fillStyle = '#f97316';
          ctx.font = '22px "JetBrains Mono", monospace, sans-serif';
          ctx.fillText(
            `Enclosure: ${project.enclosure.material} (${project.enclosure.widthMm}x${project.enclosure.heightMm}mm) | ${renderResolution.toUpperCase()} Studio Shot`,
            targetW - 60,
            targetH - 70
          );
        }

        const dataUrl = canvas.toDataURL('image/png', 0.98);
        setRenderedImageUrl(dataUrl);
      }

      // Restore viewport
      camera.aspect = origW / origH;
      camera.updateProjectionMatrix();
      renderer.setSize(origW, origH);
      if (composer) composer.setSize(origW, origH);
      if (requestRenderRef.current) requestRenderRef.current();
    } catch (e) {
      console.error('Failed to render Blender hero shot:', e);
    } finally {
      setIsRenderingImage(false);
    }
  };

  const handleDownloadRenderedImage = () => {
    if (!renderedImageUrl) return;
    const a = document.createElement('a');
    a.href = renderedImageUrl;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-blender-${renderResolution}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyRenderedImage = async () => {
    if (!renderedImageUrl) return;
    try {
      const res = await fetch(renderedImageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      await navigator.clipboard.writeText(renderedImageUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };
  // Active selected component & helper calculations
  const selectedComponent = project.components.find((c) => c.id === selectedComponentId);
  const isMcuSelected = selectedComponentId === 'mcu';
  const isBatterySelected = selectedComponentId === 'battery';
  const isEnclosureSelected = selectedComponentId === 'enclosure';

  // Default CAD coordinates for categories
  const getDefaultCadPos = (comp: ComponentModule) => {
    if (comp.category === 'display') return { x: 0, y: 0.8, z: -1.6 };
    if (comp.category === 'input') {
      if (comp.typeId.includes('rotary')) return { x: 2.8, y: 0.4, z: 2.2 };
      return { x: 0, y: 0.6, z: 2.2 };
    }
    if (comp.category === 'connectivity') return { x: -2.8, y: 0.3, z: -0.2 };
    if (comp.category === 'audio') return { x: 2.7, y: 0.3, z: -0.6 };
    if (comp.category === 'actuator') return { x: 0, y: 0.3, z: 1.8 };
    if (comp.category === 'sensor') return { x: -2.5, y: 0.25, z: 2.2 };
    return { x: 0, y: 0.3, z: 0 };
  };

  const handleMoveComponent = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedComponent || !onUpdateComponentTransform) return;
    const def = getDefaultCadPos(selectedComponent);
    const curX = selectedComponent.cadX !== undefined ? selectedComponent.cadX : def.x;
    const curY = selectedComponent.cadY !== undefined ? selectedComponent.cadY : def.y;
    const curZ = selectedComponent.cadZ !== undefined ? selectedComponent.cadZ : def.z;

    const newX = axis === 'x' ? Math.round((curX + delta) * 10) / 10 : curX;
    const newY = axis === 'y' ? Math.round((curY + delta) * 10) / 10 : curY;
    const newZ = axis === 'z' ? Math.round((curZ + delta) * 10) / 10 : curZ;

    onUpdateComponentTransform(selectedComponent.id, { cadX: newX, cadY: newY, cadZ: newZ });
  };

  const handleSetComponentCadPos = (axis: 'x' | 'y' | 'z', val: number) => {
    if (!selectedComponent || !onUpdateComponentTransform) return;
    const def = getDefaultCadPos(selectedComponent);
    const curX = selectedComponent.cadX !== undefined ? selectedComponent.cadX : def.x;
    const curY = selectedComponent.cadY !== undefined ? selectedComponent.cadY : def.y;
    const curZ = selectedComponent.cadZ !== undefined ? selectedComponent.cadZ : def.z;

    const rounded = Math.round(val * 10) / 10;
    const newX = axis === 'x' ? rounded : curX;
    const newY = axis === 'y' ? rounded : curY;
    const newZ = axis === 'z' ? rounded : curZ;

    onUpdateComponentTransform(selectedComponent.id, { cadX: newX, cadY: newY, cadZ: newZ });
  };

  const handleScaleComponent = (newScale: number) => {
    if (!selectedComponent || !onUpdateComponentTransform) return;
    onUpdateComponentTransform(selectedComponent.id, { scale: Math.round(newScale * 100) / 100 });
  };

  const handleRotateComponent = (deltaDeg: number) => {
    if (!selectedComponent || !onUpdateComponentTransform) return;
    const curRot = selectedComponent.rotation ?? 0;
    const nextRot = (curRot + deltaDeg + 360) % 360;
    onUpdateComponentTransform(selectedComponent.id, { rotation: nextRot });
  };

  const handleResetComponentTransform = () => {
    if (!selectedComponent || !onUpdateComponentTransform) return;
    onUpdateComponentTransform(selectedComponent.id, {
      cadX: undefined,
      cadY: undefined,
      cadZ: undefined,
      scale: 1.0,
      rotation: 0
    });
  };

  const handleFocusComponent = (targetId: string) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (targetId === 'mcu') {
      controls.target.set(0, 0, 0);
      camera.position.set(0, 8, 8);
    } else if (targetId === 'battery') {
      controls.target.set(0, -1.1, 0.2);
      camera.position.set(0, 4, 10);
    } else if (targetId === 'enclosure') {
      controls.target.set(0, 0, 0);
      camera.position.set(12, 14, 16);
    } else {
      const comp = project.components.find((c) => c.id === targetId);
      if (comp) {
        const def = getDefaultCadPos(comp);
        const tx = comp.cadX !== undefined ? comp.cadX : def.x;
        const ty = comp.cadY !== undefined ? comp.cadY : def.y;
        const tz = comp.cadZ !== undefined ? comp.cadZ : def.z;
        controls.target.set(tx, ty, tz);
        camera.position.set(tx, ty + 6, tz + 7);
      }
    }
    controls.update();
    if (requestRenderRef.current) requestRenderRef.current();
  };

  const handleRemoveSelectedComponent = () => {
    if (!selectedComponent || !onRemoveComponent) return;
    onRemoveComponent(selectedComponent.id);
    setSelectedComponentId(null);
  };

  // Effective position calculation for Moveable CAD Settings Window
  const getInitialHudPos = useCallback(() => {
    if (typeof window === 'undefined') return { x: 20, y: 100 };
    const w = hudSize.width;
    const h = hudSize.height;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return {
        x: Math.max(8, Math.floor((window.innerWidth - w) / 2)),
        y: Math.max(64, window.innerHeight - h - 72)
      };
    }
    return {
      x: Math.max(16, window.innerWidth - w - 24),
      y: Math.max(70, window.innerHeight - h - 72)
    };
  }, [hudSize.width, hudSize.height]);

  const effectiveHudPos = hudPos || getInitialHudPos();

  const handleHudDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, a, [role="button"]')) return;
    e.preventDefault();
    const current = effectiveHudPos;
    hudDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y
    };
    setIsDraggingHud(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleHudDragMove = (e: React.PointerEvent) => {
    if (!hudDragRef.current) return;
    const { startX, startY, origX, origY } = hudDragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxX = Math.max(10, window.innerWidth - hudSize.width - 10);
    const maxY = Math.max(50, window.innerHeight - 60);
    const newX = Math.max(8, Math.min(maxX, origX + dx));
    const newY = Math.max(54, Math.min(maxY, origY + dy));
    setHudPos({ x: newX, y: newY });
  };

  const handleHudDragEnd = (e: React.PointerEvent) => {
    hudDragRef.current = null;
    setIsDraggingHud(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleHudResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hudResizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: hudSize.width,
      origH: hudSize.height
    };
    setIsResizingHud(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleHudResizeMove = (e: React.PointerEvent) => {
    if (!hudResizeRef.current) return;
    const { startX, startY, origW, origH } = hudResizeRef.current;
    const dw = e.clientX - startX;
    const dh = e.clientY - startY;
    const minW = Math.min(320, window.innerWidth - 20);
    const maxW = Math.min(840, window.innerWidth - 16);
    const minH = 260;
    const maxH = window.innerHeight - 70;
    setHudSize({
      width: Math.round(Math.max(minW, Math.min(maxW, origW + dw))),
      height: Math.round(Math.max(minH, Math.min(maxH, origH + dh)))
    });
  };

  const handleHudResizeEnd = (e: React.PointerEvent) => {
    hudResizeRef.current = null;
    setIsResizingHud(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Effective position calculation for Moveable Touch Mirror PIP Window
  const getInitialPipPos = useCallback(() => {
    if (typeof window === 'undefined') return { x: 20, y: 70 };
    return {
      x: Math.max(12, window.innerWidth - pipWidth - 20),
      y: 70
    };
  }, [pipWidth]);

  const effectivePipPos = pipPos || getInitialPipPos();

  const handlePipDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, canvas')) return;
    e.preventDefault();
    const current = effectivePipPos;
    pipDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y
    };
    setIsDraggingPip(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePipDragMove = (e: React.PointerEvent) => {
    if (!pipDragRef.current) return;
    const { startX, startY, origX, origY } = pipDragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxX = Math.max(10, window.innerWidth - pipWidth - 10);
    const maxY = Math.max(50, window.innerHeight - 60);
    setPipPos({
      x: Math.max(8, Math.min(maxX, origX + dx)),
      y: Math.max(54, Math.min(maxY, origY + dy))
    });
  };

  const handlePipDragEnd = (e: React.PointerEvent) => {
    pipDragRef.current = null;
    setIsDraggingPip(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePipResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pipResizeRef.current = {
      startX: e.clientX,
      origW: pipWidth
    };
    setIsResizingPip(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePipResizeMove = (e: React.PointerEvent) => {
    if (!pipResizeRef.current) return;
    const { startX, origW } = pipResizeRef.current;
    const dw = e.clientX - startX;
    const minW = 200;
    const maxW = Math.min(500, window.innerWidth - 20);
    setPipWidth(Math.round(Math.max(minW, Math.min(maxW, origW + dw))));
  };

  const handlePipResizeEnd = (e: React.PointerEvent) => {
    pipResizeRef.current = null;
    setIsResizingPip(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="relative w-full h-full bg-[#070b13] overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {/* Zen Mode / Restore Button (Shows when Zen Mode is Active) */}
      {isZenMode ? (
        <div className="absolute top-4 right-4 z-40">
          <button
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/50 px-3.5 py-2 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur transition-all cursor-pointer"
            title="Exit Zen Mode & Show Windows"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Open Controls</span>
          </button>
        </div>
      ) : (
        <>
          {/* Top Left Spec Badge */}
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-xl max-w-xs text-xs pointer-events-none hidden sm:block">
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
              <span>Click 3D phone screen to interact</span>
            </div>
          </div>

          {/* Top Right Controls Toolbar */}
          <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Blender Studio Render Modal Button */}
            <button
              onClick={() => setIsRenderModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xl transition-all cursor-pointer"
              title="Render Blender-grade high-res device photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Blender 4K Render</span>
            </button>

            {/* Direct Focus on Phone Screen */}
            <button
              onClick={() => setCameraPreset('screen')}
              className="flex items-center gap-1.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xl transition-all cursor-pointer"
              title="Focus camera straight on phone display screen"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>Focus Screen</span>
            </button>

            {/* Quick Wireframe Mode Toggle */}
            <button
              onClick={() => setRenderStyle(renderStyle === 'all-wireframe' ? 'textured' : 'all-wireframe')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border shadow-xl transition-all cursor-pointer ${
                renderStyle === 'all-wireframe'
                  ? 'bg-purple-950/90 border-purple-400 text-purple-200'
                  : 'bg-slate-900/90 backdrop-blur border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Full CAD Wireframe Mode"
            >
              <Grid className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Wireframe</span>
            </button>

            {/* Camera Presets Menu */}
            <div className="flex items-center gap-0.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-xl shadow-xl text-xs">
              <button
                onClick={() => setCameraPreset('iso')}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer text-[11px]"
                title="Isometric Perspective"
              >
                ISO
              </button>
              <button
                onClick={() => setCameraPreset('top')}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer text-[11px]"
                title="Top-Down 90° Faceplate View"
              >
                Top
              </button>
              <button
                onClick={() => setCameraPreset('front')}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer text-[11px]"
                title="Front View"
              >
                Front
              </button>
              <button
                onClick={() => setCameraPreset('macro')}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer text-[11px]"
                title="Macro Close-Up"
              >
                Macro
              </button>
            </div>

            {/* Auto-Rotate Toggle */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-xl text-xs border shadow-xl transition-all cursor-pointer ${
                autoRotate
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900/90 backdrop-blur border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Auto-Rotation Demo"
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Touchscreen Glass Mirror (PIP) Toggle Button */}
            <button
              onClick={() => setShowTouchPip(!showTouchPip)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border shadow-xl transition-all cursor-pointer ${
                showTouchPip
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900/90 backdrop-blur border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle interactive 2D phone screen glass overlay"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{showTouchPip ? 'Hide Screen Glass' : 'Phone Glass'}</span>
            </button>

            {/* Toggle CAD Settings & Inspector Window */}
            <button
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border shadow-xl transition-all cursor-pointer ${
                !isHudCollapsed
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                  : 'bg-slate-900/90 backdrop-blur border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle CAD Render Settings & Inspector Window"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">CAD Settings</span>
            </button>

            {/* Zen Mode Button (Maximizes 3D View for Mobile & Fullscreen) */}
            <button
              onClick={() => setIsZenMode(true)}
              className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xl transition-all cursor-pointer"
              title="Zen Mode: Hide all panels for maximum 3D view"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zen View</span>
            </button>
          </div>

          {/* Moveable & Scalable Floating Picture-in-Picture Touchscreen Glass Overlay */}
          {showTouchPip && (
            <div
              style={{
                position: 'absolute',
                left: effectivePipPos.x,
                top: effectivePipPos.y,
                width: Math.min(pipWidth, typeof window !== 'undefined' ? window.innerWidth - 16 : pipWidth),
                zIndex: 38
              }}
              className="bg-slate-950/95 backdrop-blur border border-cyan-500/40 rounded-2xl shadow-2xl p-2.5 space-y-2 select-none ring-1 ring-cyan-500/20"
            >
              <div
                onPointerDown={handlePipDragStart}
                onPointerMove={handlePipDragMove}
                onPointerUp={handlePipDragEnd}
                className="flex items-center justify-between text-xs cursor-grab active:cursor-grabbing touch-none select-none border-b border-slate-800 pb-1.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 shrink-0" />
                  <span className="font-bold text-white text-[11px] truncate flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    Screen Mirror
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPipWidth(220)}
                    className={`px-1.5 py-0.5 text-[9px] rounded cursor-pointer ${pipWidth <= 230 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    title="Small (220px)"
                  >
                    S
                  </button>
                  <button
                    onClick={() => setPipWidth(260)}
                    className={`px-1.5 py-0.5 text-[9px] rounded cursor-pointer ${pipWidth > 230 && pipWidth <= 300 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    title="Medium (260px)"
                  >
                    M
                  </button>
                  <button
                    onClick={() => setPipWidth(340)}
                    className={`px-1.5 py-0.5 text-[9px] rounded cursor-pointer ${pipWidth > 300 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    title="Large (340px)"
                  >
                    L
                  </button>
                  <button
                    onClick={() => setPipPos(null)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                    title="Reset Mirror Position"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setShowTouchPip(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                    title="Close Screen Mirror"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
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

              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono px-0.5">
                <span>Tap dialer / apps</span>
                <span className="text-cyan-400 font-semibold">OLED Active</span>
              </div>

              {/* Corner resize handle */}
              <div
                onPointerDown={handlePipResizeStart}
                onPointerMove={handlePipResizeMove}
                onPointerUp={handlePipResizeEnd}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-ew-resize flex items-end justify-end p-0.5 text-slate-500 hover:text-cyan-400 touch-none select-none z-10"
                title="Drag to resize screen mirror"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 6 6" fill="currentColor">
                  <circle cx="5" cy="5" r="0.8" />
                  <circle cx="3" cy="5" r="0.8" />
                  <circle cx="5" cy="3" r="0.8" />
                </svg>
              </div>
            </div>
          )}

          {/* Bottom Dock: Module Selector Strip & CAD Settings Launcher */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-1.5 max-w-[94vw] pointer-events-auto select-none">
            {/* Quick Module Selector Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full px-2 py-1 scrollbar-none bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
              <button
                onClick={() => {
                  setSelectedComponentId('mcu');
                  setActiveHudTab('inspector');
                  setIsHudCollapsed(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedComponentId === 'mcu'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{project.mcu.name.split(' ')[0]}</span>
              </button>

              {project.components.map((c) => {
                const isSel = selectedComponentId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedComponentId(c.id);
                      setActiveHudTab('inspector');
                      setIsHudCollapsed(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-amber-400" />
                    <span>{c.name}</span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setSelectedComponentId('battery');
                  setActiveHudTab('inspector');
                  setIsHudCollapsed(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedComponentId === 'battery'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>Battery</span>
              </button>
            </div>

            {/* Floating Dock Toggle Button for CAD Settings Window */}
            <button
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-xl transition-all cursor-pointer backdrop-blur-md ${
                !isHudCollapsed
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-950/60 ring-2 ring-cyan-500/30'
                  : 'bg-slate-900/95 border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-white hover:scale-105 active:scale-95'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{!isHudCollapsed ? 'Hide CAD Settings Window' : 'CAD Render Settings & Inspector'}</span>
              {!isHudCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-cyan-200" /> : <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>

          {/* Moveable & Scalable CAD Render Settings & Inspector Window */}
          {!isHudCollapsed && (
            <div
              style={{
                position: 'absolute',
                left: effectiveHudPos.x,
                top: effectiveHudPos.y,
                width: Math.min(hudSize.width, typeof window !== 'undefined' ? window.innerWidth - 16 : hudSize.width),
                height: Math.min(hudSize.height, typeof window !== 'undefined' ? window.innerHeight - 70 : hudSize.height),
                zIndex: 35
              }}
              className="flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-xs text-slate-200 select-none ring-1 ring-white/10 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
            >
              {/* Moveable Window Header Bar */}
              <div
                onPointerDown={handleHudDragStart}
                onPointerMove={handleHudDragMove}
                onPointerUp={handleHudDragEnd}
                className="flex items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-slate-800 cursor-grab active:cursor-grabbing touch-none select-none rounded-t-2xl shrink-0"
              >
                {/* Left: Drag Grip & Title */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripHorizontal className="w-4 h-4 text-slate-500 hover:text-cyan-400 shrink-0" />
                  <span className="font-bold text-white text-[11px] tracking-tight truncate flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    CAD Settings & Inspector
                  </span>
                  {selectedComponentId && (
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-cyan-800 shrink-0 hidden sm:inline">
                      {selectedComponentId === 'mcu' ? 'MCU' : selectedComponentId === 'battery' ? 'Battery' : selectedComponentId === 'enclosure' ? 'Case' : (selectedComponent?.name || selectedComponentId).slice(0, 10)}
                    </span>
                  )}
                </div>

                {/* Right: Scale Presets, Reset Pos, Collapse */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Width scale presets */}
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 text-[10px]">
                    <button
                      onClick={() => setHudSize((prev) => ({ ...prev, width: 360 }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${hudSize.width <= 380 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                      title="Compact (360px)"
                    >
                      S
                    </button>
                    <button
                      onClick={() => setHudSize((prev) => ({ ...prev, width: 440 }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${hudSize.width > 380 && hudSize.width <= 520 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                      title="Default (440px)"
                    >
                      M
                    </button>
                    <button
                      onClick={() => setHudSize((prev) => ({ ...prev, width: Math.min(620, window.innerWidth - 20) }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${hudSize.width > 520 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                      title="Wide (620px)"
                    >
                      L
                    </button>
                  </div>

                  {/* Reset Position & Size */}
                  <button
                    onClick={() => {
                      setHudPos(null);
                      setHudSize({ width: Math.min(440, window.innerWidth - 24), height: 480 });
                    }}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                    title="Reset Window Position & Size"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>

                  {/* Collapse / Close Window */}
                  <button
                    onClick={() => setIsHudCollapsed(true)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    title="Minimize Window"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Horizontally Scrollable Tab Selector Bar */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-950/80 border-b border-slate-800 overflow-x-auto scrollbar-none shrink-0">
                <button
                  onClick={() => setActiveHudTab('inspector')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    activeHudTab === 'inspector'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                      : selectedComponentId
                      ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspector</span>
                  {selectedComponentId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveHudTab('exploded')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    activeHudTab === 'exploded' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Exploded</span>
                </button>
                <button
                  onClick={() => setActiveHudTab('styles')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    activeHudTab === 'styles' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Styles</span>
                </button>
                <button
                  onClick={() => setActiveHudTab('render')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    activeHudTab === 'render' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Lighting</span>
                </button>
                <button
                  onClick={() => setActiveHudTab('camera')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    activeHudTab === 'camera' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Camera</span>
                </button>
              </div>

              {/* Scrollable Window Body */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 min-h-0">

              {/* TAB 0: Module Inspector, Move, Scale & Specs */}
              {activeHudTab === 'inspector' && (
                <div className="space-y-3">
                  {/* Module Selector Bar & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold text-xs">Selected Element:</span>
                      <select
                        value={selectedComponentId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          setSelectedComponentId(val);
                        }}
                        className="bg-slate-900 border border-slate-700 text-cyan-300 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none focus:border-cyan-400"
                      >
                        <option value="">-- Click 3D part or select --</option>
                        <option value="mcu">⚡ SoC Board: {project.mcu.name}</option>
                        {project.components.map((c) => (
                          <option key={c.id} value={c.id}>
                            📦 {c.name} ({c.category})
                          </option>
                        ))}
                        <option value="battery">🔋 LiPo Battery ({project.batteryCapacityMah} mAh)</option>
                        <option value="enclosure">🛡️ Enclosure ({project.enclosure.material})</option>
                      </select>
                    </div>

                    {selectedComponentId && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFocusComponent(selectedComponentId)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-300 text-[11px] font-medium cursor-pointer transition-all"
                          title="Zoom & frame camera onto this element"
                        >
                          <Focus className="w-3.5 h-3.5" />
                          <span>Focus</span>
                        </button>

                        {selectedComponent && (
                          <button
                            onClick={handleResetComponentTransform}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium cursor-pointer transition-all"
                            title="Reset 3D position, scale and rotation to defaults"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reset</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedComponentId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
                          title="Deselect"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Component Inspector & Transform Panels */}
                  {selectedComponent ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Sub-Panel 1: 3D CAD Move Coordinates */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5 text-cyan-400" />
                            3D Position (mm)
                          </span>
                          <button
                            onClick={() => handleSetComponentCadPos('x', 0)}
                            className="text-[10px] text-cyan-400 hover:underline font-mono cursor-pointer"
                          >
                            Center X
                          </button>
                        </div>

                        {/* X Coordinate */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300">X (Lateral Left/Right)</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              {(selectedComponent.cadX ?? getDefaultCadPos(selectedComponent).x).toFixed(1)} mm
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveComponent('x', -0.5)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              -0.5
                            </button>
                            <input
                              type="range"
                              min="-10"
                              max="10"
                              step="0.2"
                              value={selectedComponent.cadX ?? getDefaultCadPos(selectedComponent).x}
                              onChange={(e) => handleSetComponentCadPos('x', parseFloat(e.target.value))}
                              className="flex-1 accent-cyan-500 cursor-pointer"
                            />
                            <button
                              onClick={() => handleMoveComponent('x', 0.5)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>

                        {/* Y Coordinate */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300">Y (Elevation Height)</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              {(selectedComponent.cadY ?? getDefaultCadPos(selectedComponent).y).toFixed(1)} mm
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveComponent('y', -0.2)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              -0.2
                            </button>
                            <input
                              type="range"
                              min="-1"
                              max="8"
                              step="0.1"
                              value={selectedComponent.cadY ?? getDefaultCadPos(selectedComponent).y}
                              onChange={(e) => handleSetComponentCadPos('y', parseFloat(e.target.value))}
                              className="flex-1 accent-cyan-500 cursor-pointer"
                            />
                            <button
                              onClick={() => handleMoveComponent('y', 0.2)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              +0.2
                            </button>
                          </div>
                        </div>

                        {/* Z Coordinate */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300">Z (Front / Back)</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              {(selectedComponent.cadZ ?? getDefaultCadPos(selectedComponent).z).toFixed(1)} mm
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveComponent('z', -0.5)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              -0.5
                            </button>
                            <input
                              type="range"
                              min="-15"
                              max="15"
                              step="0.2"
                              value={selectedComponent.cadZ ?? getDefaultCadPos(selectedComponent).z}
                              onChange={(e) => handleSetComponentCadPos('z', parseFloat(e.target.value))}
                              className="flex-1 accent-cyan-500 cursor-pointer"
                            />
                            <button
                              onClick={() => handleMoveComponent('z', 0.5)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono cursor-pointer"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 2: Scale & Rotation */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-amber-400" />
                            Scale & Rotation
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">
                            {Math.round((selectedComponent.scale ?? 1.0) * 100)}%
                          </span>
                        </div>

                        {/* Scale Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-300">Scale Factor</span>
                            <span className="font-mono text-slate-400 text-[10px]">0.5x - 2.5x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.5"
                            step="0.05"
                            value={selectedComponent.scale ?? 1.0}
                            onChange={(e) => handleScaleComponent(parseFloat(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[0.75, 1.0, 1.25, 1.5].map((s) => (
                              <button
                                key={s}
                                onClick={() => handleScaleComponent(s)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                                  (selectedComponent.scale ?? 1.0) === s
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rotation */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300">Rotation Angle</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-amber-400 font-bold">
                                {selectedComponent.rotation ?? 0}°
                              </span>
                              <button
                                onClick={() => handleRotateComponent(90)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 cursor-pointer"
                                title="Rotate 90 degrees clockwise"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>+90°</span>
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={selectedComponent.rotation ?? 0}
                            onChange={(e) => onUpdateComponentTransform && onUpdateComponentTransform(selectedComponent.id, { rotation: parseInt(e.target.value, 10) })}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 3: Electrical Info & Connected Nets */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-emerald-400" />
                            Hardware Specs
                          </span>
                          <span className="text-[10px] bg-slate-900 border border-slate-700 text-emerald-400 font-mono px-2 py-0.5 rounded">
                            {selectedComponent.operatingVoltage}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Protocol</span>
                            <strong className="text-white font-mono">{selectedComponent.protocol}</strong>
                          </div>
                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Active Draw</span>
                            <strong className="text-amber-300 font-mono">{selectedComponent.powerCurrentActiveMa} mA</strong>
                          </div>
                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Standby</span>
                            <strong className="text-slate-300 font-mono">{selectedComponent.powerCurrentStandbyMa} mA</strong>
                          </div>
                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Unit Cost</span>
                            <strong className="text-emerald-400 font-mono">${selectedComponent.estimatedCostUsd.toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* Connected Nets Count */}
                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Pins: <strong className="text-white font-mono">{selectedComponent.pins.length}</strong></span>
                          <span>Nets: <strong className="text-cyan-400 font-mono">
                            {project.wires.filter((w) => w.fromComponentId === selectedComponent.id || w.toComponentId === selectedComponent.id).length} Connected
                          </strong></span>
                        </div>

                        {onRemoveComponent && (
                          <button
                            onClick={handleRemoveSelectedComponent}
                            className="w-full mt-1 py-1.5 px-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Component from CAD</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isMcuSelected ? (
                    /* MCU Board Info */
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-cyan-400" />
                          <div>
                            <h4 className="font-bold text-white text-sm">{project.mcu.name}</h4>
                            <p className="text-[11px] text-slate-400">{project.mcu.tagline}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2.5 py-1 rounded-full font-mono font-bold">
                          {project.mcu.family}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">CPU Architecture</span>
                          <strong className="text-white font-mono">{project.mcu.cpuArchitecture}</strong>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Frequency / Cores</span>
                          <strong className="text-cyan-300 font-mono">{project.mcu.clockSpeedMhz} MHz ({project.mcu.cores}c)</strong>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Flash & PSRAM</span>
                          <strong className="text-amber-300 font-mono">{project.mcu.flashSizeMb}MB / {project.mcu.psramSizeMb}MB</strong>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Active Draw</span>
                          <strong className="text-emerald-400 font-mono">{project.mcu.typicalCurrentActiveMa} mA</strong>
                        </div>
                      </div>
                    </div>
                  ) : isBatterySelected ? (
                    /* Battery Pack Info */
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Battery className="w-5 h-5 text-emerald-400" />
                          <div>
                            <h4 className="font-bold text-white text-sm">Lithium-Polymer Rechargeable Battery</h4>
                            <p className="text-[11px] text-slate-400">3.7V Nominal, Integrated PCM Protection Circuit</p>
                          </div>
                        </div>
                        <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full font-mono font-bold">
                          {project.batteryCapacityMah} mAh
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Nominal Voltage</span>
                          <strong className="text-white font-mono">3.7V (4.2V Max)</strong>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Capacity Energy</span>
                          <strong className="text-emerald-300 font-mono">
                            {((project.batteryCapacityMah * 3.7) / 1000).toFixed(1)} Wh
                          </strong>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Mounting Bay</span>
                          <strong className="text-slate-300 font-mono">Internal Underboard Bay</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Empty Selection State */
                    <div className="bg-slate-950/60 p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center mx-auto">
                        <MousePointer className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-white text-xs">No Component Selected in 3D CAD</h4>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        Click directly on any 3D component (Screen, Keyboard, Modem, Camera, Sensors, MCU, Battery) or select from the module chips above to adjust position, scale, rotation, and view full electrical specs.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1: Exploded CAD Assembly & Shell Opacity */}
              {activeHudTab === 'exploded' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
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
                        <button onClick={() => setExplodedFactor(0)} className="hover:text-cyan-400 cursor-pointer">0% Assembled</button>
                        <button onClick={() => setExplodedFactor(0.25)} className="hover:text-cyan-400 cursor-pointer">25%</button>
                        <button onClick={() => setExplodedFactor(0.5)} className="hover:text-cyan-400 cursor-pointer">50%</button>
                        <button onClick={() => setExplodedFactor(1.0)} className="hover:text-cyan-400 cursor-pointer">100% Teardown</button>
                      </div>
                    </div>

                    {/* Shell Opacity Slider */}
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
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={caseOpacity}
                        onChange={(e) => setCaseOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <button onClick={() => setCaseOpacity(0.0)} className="hover:text-cyan-400 cursor-pointer">Ghost (0%)</button>
                        <button onClick={() => setCaseOpacity(0.45)} className="hover:text-cyan-400 cursor-pointer">Smoked (45%)</button>
                        <button onClick={() => setCaseOpacity(1.0)} className="hover:text-cyan-400 cursor-pointer">Solid (100%)</button>
                      </div>
                    </div>

                    {/* Casing Material & Color */}
                    <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-semibold text-white block mb-1">Casing Finish & Material</span>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Casing Material"
                          value={project.enclosure.material}
                          onChange={(e) => onUpdateEnclosure({ material: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-1.5 outline-none focus:border-cyan-500 cursor-pointer flex-1"
                        >
                          <option value="Anodized Aluminum">Anodized Aluminum</option>
                          <option value="CNC Polycarbonate">CNC Polycarbonate (Glass)</option>
                          <option value="3D-Printed PETG">3D-Printed PETG</option>
                        </select>
                        <input
                          aria-label="Casing Color"
                          type="color"
                          value={project.enclosure.colorHex}
                          onChange={(e) => onUpdateEnclosure({ colorHex: e.target.value })}
                          className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Layer Checkboxes */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showShell}
                        onChange={(e) => setShowShell(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>Top Bezel & Chassis</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showModules}
                        onChange={(e) => setShowModules(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>Displays & Peripherals</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showWires}
                        onChange={(e) => setShowWires(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>3D Wire Harness</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showBattery}
                        onChange={(e) => setShowBattery(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>LiPo Battery Pack</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={showGuideLines}
                        onChange={(e) => setShowGuideLines(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>Alignment Vectors</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Wireframe & Shading Modes */}
              {activeHudTab === 'styles' && (
                <div className="space-y-3">
                  {/* Style Mode Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'textured', name: '🎨 Photoreal PBR', desc: 'Full textures & reflections' },
                      { id: 'all-wireframe', name: '🕸️ All Wireframe', desc: 'Full CAD mesh geometry' },
                      { id: 'wireframe-shell', name: '🔲 Shell Wireframe', desc: 'See-through chassis' },
                      { id: 'xray-cad', name: '🩻 X-Ray Teardown', desc: 'Translucent internals' },
                      { id: 'clay-sculpt', name: '🏛️ Clay Sculpt', desc: 'Industrial design matte' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setRenderStyle(style.id as RenderStyleMode)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          renderStyle === style.id
                            ? 'bg-purple-950/80 border-purple-400 text-white shadow-lg shadow-purple-950/50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white">{style.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{style.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    {/* Display Screen Emissive Intensity Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5 text-cyan-400" />
                          Phone Screen Backlight Intensity
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {Math.round(screenBrightness * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={screenBrightness}
                        onChange={(e) => setScreenBrightness(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Dim (50%)</span>
                        <button onClick={() => setScreenBrightness(1.25)} className="text-cyan-400 hover:underline cursor-pointer">125% (Vivid)</button>
                        <span>Max (250%)</span>
                      </div>
                    </div>

                    {/* PCB Solder Mask Color Selection */}
                    <div className="space-y-1">
                      <span className="font-semibold text-white block mb-1">PCB Solder Mask Finish</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: 'black', label: 'Matte Black', hex: '#18181b' },
                          { id: 'green', label: 'Classic Green', hex: '#15803d' },
                          { id: 'blue', label: 'Royal Blue', hex: '#1d4ed8' },
                          { id: 'purple', label: 'OSH Purple', hex: '#7e22ce' },
                          { id: 'cyan', label: 'Cyber Cyan', hex: '#0891b2' },
                          { id: 'white', label: 'Signal White', hex: '#e2e8f0' },
                          { id: 'red', label: 'Cherry Red', hex: '#b91c1c' }
                        ].map((mask) => (
                          <button
                            key={mask.id}
                            onClick={() => setPcbColor(mask.id as any)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                              pcbColor === mask.id
                                ? 'border-cyan-400 text-white bg-cyan-950/70 shadow'
                                : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: mask.hex }} />
                            <span>{mask.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Lighting & Studio Profiles */}
              {activeHudTab === 'render' && (
                <div className="space-y-3">
                  {/* Preset Studio Profiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {[
                      { id: 'scifi-diorama', name: '🚀 Sci-Fi Diorama', desc: 'Warm Amber & Matte Slate' },
                      { id: 'clean-lab', name: '🔬 Clean Lab', desc: 'Daylight Precision' },
                      { id: 'unreal-studio', name: '🌟 Unreal Studio', desc: 'Cinematic Warm GI' },
                      { id: 'cyberpunk-neon', name: '⚡ Cyberpunk Neon', desc: 'Shadertoy Electric' },
                      { id: 'stealth-noir', name: '🖤 Stealth Noir', desc: 'High Contrast Dark' },
                      { id: 'outdoor-daylight', name: '☀️ Outdoor Daylight', desc: '5500K Crisp Sunlight' },
                      { id: 'blueprint-cad', name: '📐 CAD Blueprint', desc: 'Electric Cyan Technical' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setRenderPreset(p.id as RenderPreset)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          renderPreset === p.id
                            ? 'bg-amber-950/80 border-amber-400 text-white shadow-lg shadow-amber-950/50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* SSAO (Screen Space Ambient Occlusion) & GI Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Panel 1: SSAO Contact Shadows */}
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-white">
                          <input
                            type="checkbox"
                            checked={enableAO}
                            onChange={(e) => setEnableAO(e.target.checked)}
                            className="rounded accent-amber-500"
                          />
                          <span className="flex items-center gap-1 text-amber-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            SSAO Contact Occlusion
                          </span>
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">
                          {enableAO ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      {enableAO && (
                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                          {/* Kernel Radius */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300">SSAO Kernel Radius</span>
                              <span className="font-mono text-amber-400 font-semibold">{ssaoKernelRadius} px</span>
                            </div>
                            <input
                              type="range"
                              min="4"
                              max="48"
                              step="2"
                              value={ssaoKernelRadius}
                              onChange={(e) => setSsaoKernelRadius(parseInt(e.target.value, 10))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>Sharp (4px)</span>
                              <span>Medium (16px)</span>
                              <span>Ultra Soft (48px)</span>
                            </div>
                          </div>

                          {/* Max Distance */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300">Occlusion Max Distance</span>
                              <span className="font-mono text-amber-400 font-semibold">{ssaoMaxDistance.toFixed(2)}</span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="0.45"
                              step="0.01"
                              value={ssaoMaxDistance}
                              onChange={(e) => setSsaoMaxDistance(parseFloat(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>

                          {/* SSAO Buffer Output Selector */}
                          <div className="pt-1">
                            <span className="text-[10px] text-slate-400 block mb-1">SSAO Pass Output View:</span>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { id: 'default', label: 'Composite' },
                                { id: 'ssao', label: 'AO Mask' },
                                { id: 'depth', label: 'Depth' },
                                { id: 'normal', label: 'Normals' }
                              ].map((mode) => (
                                <button
                                  key={mode.id}
                                  onClick={() => setSsaoOutput(mode.id as any)}
                                  className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer text-center ${
                                    ssaoOutput === mode.id
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {mode.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Panel 2: GI (Global Illumination) Warm Bounce & Environment */}
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-white">
                          <input
                            type="checkbox"
                            checked={enableGI}
                            onChange={(e) => setEnableGI(e.target.checked)}
                            className="rounded accent-orange-500"
                          />
                          <span className="flex items-center gap-1 text-orange-400">
                            <Sun className="w-3.5 h-3.5" />
                            GI (Global Radiosity Bounce)
                          </span>
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">
                          {enableGI ? `${giIntensity.toFixed(1)}x Radiosity` : 'Disabled'}
                        </span>
                      </div>

                      {enableGI && (
                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                          {/* GI Intensity Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300">Bounce Light Radiosity</span>
                              <span className="font-mono text-orange-400 font-semibold">{giIntensity.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="2.5"
                              step="0.05"
                              value={giIntensity}
                              onChange={(e) => setGiIntensity(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>Subtle (0.2x)</span>
                              <span>Natural (1.1x)</span>
                              <span>High Bounce (2.5x)</span>
                            </div>
                          </div>

                          {/* Bounce Color Swatches (Sci-Fi diorama warm orange, cyber cyan, etc.) */}
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Pedestal Bounce Tint:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { hex: '#f97316', label: 'Sci-Fi Orange' },
                                { hex: '#ea580c', label: 'Amber Industrial' },
                                { hex: '#06b6d4', label: 'Cyber Cyan' },
                                { hex: '#ffffff', label: 'Daylight White' },
                                { hex: '#a855f7', label: 'Neon Violet' }
                              ].map((c) => (
                                <button
                                  key={c.hex}
                                  onClick={() => setGiBounceColor(c.hex)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                    giBounceColor === c.hex
                                      ? 'border-orange-400 bg-orange-950/60 text-white'
                                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                                  <span>{c.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exposure, Bloom, Grid and Render 4K Action */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 items-center">
                    {/* Bloom Glow Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300">
                          <input
                            type="checkbox"
                            checked={enableBloom}
                            onChange={(e) => setEnableBloom(e.target.checked)}
                            className="rounded accent-cyan-500"
                          />
                          <span>Bloom Glow</span>
                        </label>
                        <span className="font-mono text-cyan-400 text-[11px]">
                          {enableBloom ? `${Math.round(bloomStrength * 100)}%` : 'Off'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={bloomStrength}
                        onChange={(e) => setBloomStrength(parseFloat(e.target.value))}
                        disabled={!enableBloom}
                        className="w-full accent-cyan-500 cursor-pointer disabled:opacity-30"
                      />
                    </div>

                    {/* Floor CAD Grid Toggle */}
                    <div className="flex items-center justify-between sm:justify-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300">
                        <input
                          type="checkbox"
                          checked={showFloorGrid}
                          onChange={(e) => setShowFloorGrid(e.target.checked)}
                          className="rounded accent-cyan-500"
                        />
                        <span>Studio Grid Pedestal</span>
                      </label>
                    </div>

                    {/* Exposure Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">Exposure</span>
                        <span className="font-mono text-cyan-400 text-[11px]">{exposure.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.8"
                        step="0.05"
                        value={exposure}
                        onChange={(e) => setExposure(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Button to Render Device like Blender */}
                    <div>
                      <button
                        onClick={() => setIsRenderModalOpen(true)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 cursor-pointer transition-all"
                      >
                        <Camera className="w-4 h-4 text-white" />
                        <span>Blender 4K Render...</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Camera & Display Focus */}
              {activeHudTab === 'camera' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      onClick={() => setCameraPreset('screen')}
                      className="p-2.5 rounded-xl text-left border bg-cyan-950/90 border-cyan-400 text-white shadow-lg cursor-pointer hover:bg-cyan-900 transition-all"
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-300">
                        <Tv className="w-3.5 h-3.5" />
                        Focus Phone Screen
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5">Direct 3D OLED Touch View</div>
                    </button>

                    <button
                      onClick={() => setCameraPreset('iso')}
                      className="p-2.5 rounded-xl text-left border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="font-semibold text-xs text-white">📐 Isometric 3D</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Classic 45° CAD Angle</div>
                    </button>

                    <button
                      onClick={() => setCameraPreset('top')}
                      className="p-2.5 rounded-xl text-left border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="font-semibold text-xs text-white">📱 Top Faceplate</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">90° Orthogonal Layout</div>
                    </button>

                    <button
                      onClick={() => setCameraPreset('front')}
                      className="p-2.5 rounded-xl text-left border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="font-semibold text-xs text-white">↔️ Front Profile</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Elevation & Thickness</div>
                    </button>

                    <button
                      onClick={() => setCameraPreset('macro')}
                      className="p-2.5 rounded-xl text-left border bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="font-semibold text-xs text-white">🔍 Macro Close-Up</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Silicon Die & Components</div>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        autoRotate
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{autoRotate ? 'Pause Turntable' : 'Turntable Auto-Rotate'}</span>
                    </button>

                    <button
                      onClick={() => setShowTouchPip(!showTouchPip)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        showTouchPip
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{showTouchPip ? 'Hide Interactive Mirror HUD' : 'Open Interactive Mirror HUD'}</span>
                    </button>

                    <div className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <MousePointer className="w-3 h-3 text-emerald-400" />
                      <span>Click directly on 3D OLED screen to launch apps & dial numbers</span>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Corner Drag Resize Handle */}
              <div
                onPointerDown={handleHudResizeStart}
                onPointerMove={handleHudResizeMove}
                onPointerUp={handleHudResizeEnd}
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-1 text-slate-500 hover:text-cyan-400 touch-none select-none z-10"
                title="Drag corner to scale window size"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 6 6" fill="currentColor">
                  <circle cx="5" cy="5" r="0.8" />
                  <circle cx="3" cy="5" r="0.8" />
                  <circle cx="5" cy="3" r="0.8" />
                  <circle cx="1" cy="5" r="0.8" />
                  <circle cx="3" cy="3" r="0.8" />
                  <circle cx="5" cy="1" r="0.8" />
                </svg>
              </div>
            </div>
          )}

          {/* Blender-Quality Studio Render Modal */}
          {isRenderModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                        <span>Blender-Grade Studio Device Render</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                          PBR RAYCAST
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Export ultra high-fidelity presentation shots with SSAO contact shadows & GI radiosity
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsRenderModalOpen(false);
                      setRenderedImageUrl(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Resolution & Watermark Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Resolution Choice */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Export Resolution</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: '1080p', label: '1080p', sub: '1920×1080' },
                        { id: '2k', label: '2K QHD', sub: '2560×1440' },
                        { id: '4k', label: '4K UHD', sub: '3840×2160' }
                      ].map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => setRenderResolution(res.id as any)}
                          className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                            renderResolution === res.id
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="font-bold text-xs">{res.label}</div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">{res.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Watermark & Spec Banner Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Spec Sheet Overlay</label>
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeWatermark}
                        onChange={(e) => setIncludeWatermark(e.target.checked)}
                        className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="text-xs">
                        <div className="font-medium text-white">Include Hardware Spec Banner</div>
                        <div className="text-[10px] text-slate-400">Adds MCU board, dimensions, and hazard accent strip</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Render Button */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Lighting: <strong className="text-amber-300 font-semibold">{renderPreset}</strong> | SSAO:{' '}
                    <strong className="text-amber-300 font-semibold">{enableAO ? `${ssaoKernelRadius}px` : 'Off'}</strong> | GI:{' '}
                    <strong className="text-orange-400 font-semibold">{enableGI ? `${giIntensity}x` : 'Off'}</strong>
                  </div>

                  <button
                    onClick={handleRenderBlenderHeroShot}
                    disabled={isRenderingImage}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-orange-950/50 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isRenderingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Rendering PBR Frame...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Render Device Hero Shot</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Render Preview & Download Section */}
                {renderedImageUrl && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-in fade-in duration-300">
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                      <img
                        src={renderedImageUrl}
                        alt="Rendered Studio Device"
                        className="w-full h-auto max-h-80 object-contain mx-auto block"
                      />
                      <div className="absolute top-2 right-2 bg-black/75 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 border border-amber-500/30">
                        {renderResolution.toUpperCase()} READY
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Render complete ({renderResolution.toUpperCase()})
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyRenderedImage}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copySuccess ? 'Copied Image!' : 'Copy to Clipboard'}</span>
                        </button>

                        <button
                          onClick={handleDownloadRenderedImage}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 cursor-pointer transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
