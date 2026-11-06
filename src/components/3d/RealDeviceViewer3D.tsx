import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
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
  Smartphone,
  Settings2,
  Sun,
  Gauge,
  Grid3x3,
  Camera,
  Film,
  PanelTop,
  X,
  Play,
  Pause,
  ScanLine,
  MonitorPlay,
  Hand
} from 'lucide-react';
import {
  DeviceProject,
  DeviceEnclosureSpecs,
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
  createEnclosure3dMesh,
  getDisplayDimensions,
  EnclosureDisplayCutout
} from './module-models';
import {
  createStudioEnvironmentTexture,
  createStudioFloorTexture,
  createContactShadowTexture
} from './textures';
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
  uiHidden?: boolean;
  onToggleUi?: () => void;
}

type QualityPreset = 'cinematic' | 'balanced' | 'performance';
type DockTab = 'cad' | 'render' | 'layers';
type CameraPreset = 'iso' | 'front' | 'screen' | 'top' | 'macro';

const CINEMATIC_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.024 },
    uAberration: { value: 0.0016 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      vec2 dir = uv - 0.5;
      float d = length(dir);
      float ca = uAberration * d * d;

      vec3 color;
      color.r = texture2D(tDiffuse, uv + dir * ca).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - dir * ca).b;

      // Filmic teal / amber grade
      color.rgb = mix(color.rgb, color.rgb * vec3(1.03, 1.0, 0.98), 0.35);
      color.b = mix(color.b, color.b * 1.04 + 0.002, 0.45);

      // Soft lens vignette
      color *= 1.0 - uVignette * smoothstep(0.22, 0.9, d);

      // Fine animated film grain
      float grain = hash(uv * 1024.0 + uTime * 60.0) - 0.5;
      color += grain * uGrain;

      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }
  `
};

export const RealDeviceViewer3D: React.FC<RealDeviceViewer3DProps> = ({
  project,
  onUpdateEnclosure,
  virtualState,
  onUpdateVirtualState,
  onAddLog,
  uiHidden = false,
  onToggleUi
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------
  // Studio / CAD controls
  // ---------------------------------------------------------------
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [caseOpacity, setCaseOpacity] = useState(0.82);
  const [showShell, setShowShell] = useState(true);
  const [showWires, setShowWires] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showModules, setShowModules] = useState(true);
  const [showFloor, setShowFloor] = useState(true);
  const [showTouchPip, setShowTouchPip] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [dockTab, setDockTab] = useState<DockTab>('cad');

  // ---------------------------------------------------------------
  // Rendering settings
  // ---------------------------------------------------------------
  const [quality, setQuality] = useState<QualityPreset>(() =>
    typeof window !== 'undefined' && window.innerWidth < 900 ? 'performance' : 'balanced'
  );
  const [exposure, setExposure] = useState(1.18);
  const [enableBloom, setEnableBloom] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.52);
  const [enableAO, setEnableAO] = useState(true);
  const [enableShadows, setEnableShadows] = useState(true);
  const [cinematicFx, setCinematicFx] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [enableParticles, setEnableParticles] = useState(true);
  const [screenGlow, setScreenGlow] = useState(1.35);

  // 3D references -------------------------------------------------
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const gtaoPassRef = useRef<GTAOPass | null>(null);
  const cinematicPassRef = useRef<ShaderPass | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const backdropRef = useRef<THREE.Mesh | null>(null);
  const screenGlowLightRef = useRef<THREE.PointLight | null>(null);

  const shellTopGroupRef = useRef<THREE.Group | null>(null);
  const shellBottomGroupRef = useRef<THREE.Group | null>(null);
  const mcuGroupRef = useRef<THREE.Group | null>(null);
  const displayGroupRef = useRef<THREE.Group | null>(null);
  const keyboardGroupRef = useRef<THREE.Group | null>(null);
  const peripheralModulesRef = useRef<Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number }>>([]);
  const batteryGroupRef = useRef<THREE.Group | null>(null);
  const wiresGroupRef = useRef<THREE.Group | null>(null);
  const shellMaterialsRef = useRef<THREE.Material[]>([]);
  const displayBaseYRef = useRef(0.8);
  const keyboardBaseYRef = useRef(0.6);
  const deviceCenterYRef = useRef(4);
  const framedProjectRef = useRef<string>('');
  const softwareGlRef = useRef(false);

  // Dynamic touchscreen texture
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const requestRenderRef = useRef<(() => void) | null>(null);
  const explodeAnimRef = useRef<number | null>(null);

  // Live settings consumed by the animation loop without re-initialising it.
  const settingsRef = useRef({
    autoRotate,
    enableParticles,
    cinematicFx,
    screenGlow,
    exposure,
    enableBloom,
    bloomStrength,
    enableAO,
    enableShadows,
    showFloor,
    quality
  });
  settingsRef.current = {
    autoRotate,
    enableParticles,
    cinematicFx,
    screenGlow,
    exposure,
    enableBloom,
    bloomStrength,
    enableAO,
    enableShadows,
    showFloor,
    quality
  };

  // Sound feedback for display touches
  const playTone = useCallback((freq: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio may be blocked before a user gesture.
    }
  }, []);

  // 1. Offscreen display canvas + texture
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

  // 2. Repaint display whenever firmware state changes
  useEffect(() => {
    if (!screenCanvasRef.current || !screenTextureRef.current) return;
    if (virtualState) {
      renderDisplayToCanvas(screenCanvasRef.current, virtualState, project);
      screenTextureRef.current.needsUpdate = true;
      if (pipCanvasRef.current) {
        renderDisplayToCanvas(pipCanvasRef.current, virtualState, project);
      }
      requestRenderRef.current?.();
    }
  }, [virtualState, project]);

  useEffect(() => {
    if (showTouchPip && pipCanvasRef.current && virtualState) {
      renderDisplayToCanvas(pipCanvasRef.current, virtualState, project);
    }
  }, [showTouchPip, virtualState, project]);

  const dispatchTouch = useCallback(
    (touchX: number, touchY: number) => {
      if (!virtualState || !onUpdateVirtualState) return;
      const { updatedState, serialEvent, audioFreq } = handleDisplayTouch(
        virtualState,
        touchX,
        touchY,
        project
      );

      if (audioFreq) playTone(audioFreq);
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
    [virtualState, onUpdateVirtualState, onAddLog, project, playTone]
  );

  // Keep the latest callback out of the renderer lifecycle effect.
  const dispatchTouchRef = useRef(dispatchTouch);
  useEffect(() => {
    dispatchTouchRef.current = dispatchTouch;
  }, [dispatchTouch]);

  // 3. Build renderer / studio environment / postprocessing once
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 640;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();
    softwareGlRef.current = isSoftwareGl;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050a);
    scene.fog = new THREE.FogExp2(0x03050a, 0.0075);
    sceneRef.current = scene;

    // Procedural studio IBL
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envSource = createStudioEnvironmentTexture();
    const envTarget = pmremGenerator.fromEquirectangular(envSource);
    scene.environment = envTarget.texture;
    envSource.dispose();
    pmremGenerator.dispose();

    // Camera / controls
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 150);
    camera.position.set(12, 12, 26);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.minPolarAngle = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.autoRotateSpeed = 0.7;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;

    // Cinematic backdrop dome
    const backdropMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#071225') },
        uBottom: { value: new THREE.Color('#010205') },
        uGlow: { value: new THREE.Color('#0e7490') },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldDirection = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uGlow;
        uniform float uTime;
        varying vec3 vWorldDirection;

        void main() {
          vec3 dir = normalize(vWorldDirection);
          float h = smoothstep(-0.45, 1.0, dir.y);
          vec3 color = mix(uBottom, uTop, h);

          float band1 = sin(dir.x * 3.4 + dir.z * 2.1 + uTime * 0.08) * 0.5 + 0.5;
          float band2 = sin(dir.z * 5.8 - dir.x * 2.4 - uTime * 0.05) * 0.5 + 0.5;
          float aurora = pow(band1 * band2, 4.0);
          color += uGlow * aurora * 0.24;

          float horizon = pow(1.0 - abs(dir.y), 6.0);
          color += vec3(0.02, 0.12, 0.18) * horizon;

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), backdropMaterial);
    backdrop.name = 'STUDIO_BACKDROP';
    scene.add(backdrop);
    backdropRef.current = backdrop;

    // Lights
    const hemi = new THREE.HemisphereLight(0x9fd8ff, 0x04060b, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff3df, 3.1);
    keyLight.position.set(11, 20, 15);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1536;
    keyLight.shadow.mapSize.height = 1536;
    keyLight.shadow.bias = -0.00035;
    keyLight.shadow.normalBias = 0.035;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLightRef.current = keyLight;

    const fill = new THREE.DirectionalLight(0x38bdf8, 1.3);
    fill.position.set(-14, 10, 12);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xa855f7, 1.65);
    rim.position.set(2, 9, -16);
    scene.add(rim);

    const floorGlow = new THREE.PointLight(0x22d3ee, 9, 18, 2);
    floorGlow.position.set(0, 0.6, 5);
    scene.add(floorGlow);

    const screenGlowLight = new THREE.PointLight(0x67e8f9, 5, 10, 2);
    screenGlowLight.position.set(0, 5, 4);
    scene.add(screenGlowLight);
    screenGlowLightRef.current = screenGlowLight;

    // Reflective floor, pedestal, light rings and contact shadow
    const floorGroup = new THREE.Group();
    floorGroup.name = 'STUDIO_FLOOR';
    scene.add(floorGroup);

    const floorTexture = createStudioFloorTexture();
    floorTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: floorTexture,
      metalness: 0.62,
      roughness: 0.24,
      clearcoat: 0.8,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.25
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floorGroup.add(floor);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.7, 0.32, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0x050a12,
        metalness: 0.9,
        roughness: 0.18,
        clearcoat: 0.8,
        envMapIntensity: 1.5
      })
    );
    pedestal.position.y = -0.17;
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    floorGroup.add(pedestal);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5.86, 5.96, 160),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    floorGroup.add(ring);
    ringRef.current = ring;

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.24, 128),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.03;
    floorGroup.add(innerRing);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.012;
    floorGroup.add(contactShadow);

    floorGroupRef.current = floorGroup;

    // Floating atmosphere motes
    const particleCount = 260;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 3 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = Math.random() * 20;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x7dd3fc,
        size: 0.055,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    particles.name = 'STUDIO_MOTES';
    scene.add(particles);
    particlesRef.current = particles;

    // Postprocessing (skipped on software GL for legibility / performance)
    if (!isSoftwareGl) {
      try {
        const composer = new EffectComposer(renderer);
        composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        composer.setSize(width, height);
        composer.addPass(new RenderPass(scene, camera));

        const gtaoPass = new GTAOPass(scene, camera, width, height);
        gtaoPass.output = GTAOPass.OUTPUT.Default;
        gtaoPass.blendIntensity = 0.72;
        gtaoPass.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1.4, thickness: 0.4 });
        composer.addPass(gtaoPass);
        gtaoPassRef.current = gtaoPass;

        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.52,
          0.34,
          0.82
        );
        composer.addPass(bloomPass);
        bloomPassRef.current = bloomPass;

        const cinematicPass = new ShaderPass(CINEMATIC_SHADER);
        cinematicPass.uniforms.uVignette.value = 0.34;
        cinematicPass.uniforms.uGrain.value = 0.024;
        cinematicPass.uniforms.uAberration.value = 0.0016;
        composer.addPass(cinematicPass);
        cinematicPassRef.current = cinematicPass;

        composer.addPass(new OutputPass());
        composerRef.current = composer;
      } catch (error) {
        console.warn('Postprocessing unavailable, falling back to direct render:', error);
        composerRef.current = null;
      }
    }

    requestRenderRef.current = () => {
      // The studio loop is continuous; retained for API compatibility.
    };

    // 3D screen raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        if (hit.object.name === 'TOUCH_DISPLAY_SCREEN' && hit.uv) {
          const touchX = Math.round(hit.uv.x * 512);
          const touchY = Math.round((1 - hit.uv.y) * 384);
          dispatchTouchRef.current(touchX, touchY);
          event.stopPropagation();
          break;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composerRef.current?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Continuous cinematic loop
    let frameId = 0;
    let elapsed = 0;
    let previousTime = performance.now();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      elapsed += delta;
      const settings = settingsRef.current;

      controls.autoRotate = settings.autoRotate;
      controls.update();

      if (backdropRef.current) {
        const material = backdropRef.current.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = elapsed;
      }
      if (ringRef.current) {
        ringRef.current.rotation.z = elapsed * 0.06;
      }
      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsed * 0.012;
        particlesRef.current.position.y = Math.sin(elapsed * 0.24) * 0.3;
      }
      if (floorGroupRef.current) {
        floorGroupRef.current.visible = settings.showFloor;
      }
      if (particlesRef.current) {
        particlesRef.current.visible = settings.enableParticles;
      }
      if (screenGlowLightRef.current) {
        screenGlowLightRef.current.intensity = 3.5 + settings.screenGlow * 1.5;
      }
      if (cinematicPassRef.current) {
        cinematicPassRef.current.enabled = settings.cinematicFx;
        cinematicPassRef.current.uniforms.uTime.value = elapsed;
      }
      if (bloomPassRef.current) {
        bloomPassRef.current.enabled = settings.enableBloom;
        bloomPassRef.current.strength = settings.bloomStrength;
      }
      if (gtaoPassRef.current) {
        gtaoPassRef.current.enabled =
          settings.enableAO && settings.quality !== 'performance';
      }
      renderer.toneMappingExposure = settings.exposure;

      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      if (explodeAnimRef.current) cancelAnimationFrame(explodeAnimRef.current);
      controls.dispose();
      composerRef.current?.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 4. Build / rebuild the device CAD assembly
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const previous = scene.getObjectByName('DEVICE_ROOT');
    if (previous) scene.remove(previous);

    shellTopGroupRef.current = null;
    shellBottomGroupRef.current = null;
    mcuGroupRef.current = null;
    displayGroupRef.current = null;
    keyboardGroupRef.current = null;
    peripheralModulesRef.current = [];
    batteryGroupRef.current = null;
    wiresGroupRef.current = null;
    shellMaterialsRef.current = [];

    const deviceRoot = new THREE.Group();
    deviceRoot.name = 'DEVICE_ROOT';

    const width = project.enclosure.widthMm / 10;
    const panelHeight = project.enclosure.heightMm / 10;
    const depth = project.enclosure.depthMm / 10;
    const rootY = panelHeight / 2 + 0.56;

    // Stand the device upright like a phone on a studio plinth.
    // Local Z (device length) becomes world Y; local Y (depth) becomes world Z.
    deviceRoot.rotation.x = Math.PI / 2;
    deviceRoot.position.set(0, rootY, 0);
    deviceCenterYRef.current = rootY;

    // Enclosure + real display cut-out
    if (showShell) {
      const displayComp = project.components.find((comp) => comp.category === 'display');
      let cutout: EnclosureDisplayCutout | undefined;
      if (displayComp) {
        const dimensions = getDisplayDimensions(displayComp);
        cutout = {
          width: dimensions.width * 0.94,
          length: dimensions.length * 0.9,
          centerZ: -1.6
        };
      }

      const shell = createEnclosure3dMesh(project.enclosure, caseOpacity, cutout);
      const topGroup = shell.getObjectByName('ENCLOSURE_TOP') as THREE.Group | null;
      const bottomGroup = shell.getObjectByName('ENCLOSURE_BOTTOM') as THREE.Group | null;
      shellTopGroupRef.current = topGroup;
      shellBottomGroupRef.current = bottomGroup;

      shell.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        const materials = Array.isArray(material) ? material : material ? [material] : [];
        materials.forEach((entry) => {
          if (entry.userData?.isShellMaterial) {
            shellMaterialsRef.current.push(entry);
            entry.transparent = caseOpacity < 0.999;
            entry.opacity = caseOpacity;
            entry.depthWrite = caseOpacity > 0.92;
            entry.needsUpdate = true;
          }
        });
      });

      deviceRoot.add(shell);
    }

    // MCU board
    const mcuMesh = createMcuBoardMesh(project.mcu);
    mcuMesh.position.set(0, 0, 0);
    mcuMesh.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    mcuGroupRef.current = mcuMesh;
    deviceRoot.add(mcuMesh);

    const modulesToTrack: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; baseY: number }> = [];
    const displayBaseY = Math.max(0.58, depth / 2 - 0.14);
    const keyboardBaseY = Math.max(0.58, depth / 2 + 0.02);
    displayBaseYRef.current = displayBaseY;
    keyboardBaseYRef.current = keyboardBaseY;

    // Peripheral modules
    project.components.forEach((comp) => {
      let compMesh: THREE.Group | null = null;
      let baseX = 0;
      let baseY = Math.max(0.26, depth / 2 - 0.42);
      let baseZ = 0;

      if (comp.category === 'display') {
        compMesh = createDisplayMesh(comp, screenTextureRef.current ?? undefined);
        baseX = 0;
        baseY = displayBaseY;
        baseZ = -1.6;
        compMesh.position.set(baseX, baseY, baseZ);
        displayGroupRef.current = compMesh;
        if (showModules) deviceRoot.add(compMesh);
      } else if (comp.category === 'input') {
        if (comp.typeId.includes('rotary')) {
          compMesh = createRotaryMesh(comp);
          baseX = 2.8;
          baseY = keyboardBaseY;
          baseZ = 2.2;
        } else {
          compMesh = createKeyboardMesh(comp);
          baseX = 0;
          baseY = keyboardBaseY;
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
        baseY = Math.max(0.3, depth / 2 - 0.55);
        baseZ = -0.2;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'audio') {
        compMesh = createAudioMesh(comp);
        baseX = 2.7;
        baseY = Math.max(0.3, depth / 2 - 0.55);
        baseZ = -0.6;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'actuator') {
        compMesh = createRelayMesh(comp);
        baseX = 0;
        baseY = Math.max(0.3, depth / 2 - 0.55);
        baseZ = 1.8;
        compMesh.position.set(baseX, baseY, baseZ);
        if (showModules) {
          deviceRoot.add(compMesh);
          modulesToTrack.push({ mesh: compMesh, baseX, baseZ, baseY });
        }
      } else if (comp.category === 'sensor') {
        compMesh = createSensorMesh(comp);
        baseX = -2.5;
        baseY = Math.max(0.26, depth / 2 - 0.55);
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
          compMesh.scale.setScalar(comp.scale);
        }
        compMesh.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
      }
    });

    peripheralModulesRef.current = modulesToTrack;

    // Battery
    if (showBattery && project.batteryCapacityMah > 0) {
      const battery = createBatteryMesh(project.batteryCapacityMah);
      battery.position.set(0, -Math.max(0.55, depth / 2 - 0.5), 0.2);
      batteryGroupRef.current = battery;
      deviceRoot.add(battery);
    }

    // 3D wire harness
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
        wiresGroup.add(create3dWireMesh(start, end, wire.color, wire.gauge));
      });
      wiresGroupRef.current = wiresGroup;
      deviceRoot.add(wiresGroup);
    }

    scene.add(deviceRoot);

    // Frame the camera once per project / preset, never while editing parts.
    if (framedProjectRef.current !== project.id && cameraRef.current && controlsRef.current) {
      framedProjectRef.current = project.id;
      const frameScale = Math.max(panelHeight, width, 9);
      cameraRef.current.position.set(
        frameScale * 0.52,
        rootY * 0.92 + 1.4,
        frameScale * 1.35 + 5
      );
      controlsRef.current.target.set(0, rootY * 0.88, 0.5);
      controlsRef.current.update();
    }

    requestRenderRef.current?.();
  }, [project, showShell, showWires, showBattery, showModules]);

  // 5. Live opacity updates (no geometry rebuild while dragging)
  useEffect(() => {
    shellMaterialsRef.current.forEach((material) => {
      material.transparent = caseOpacity < 0.999;
      material.opacity = caseOpacity;
      material.depthWrite = caseOpacity > 0.92;
      material.needsUpdate = true;
    });
  }, [caseOpacity]);

  // 6. Mechanical exploded view
  useEffect(() => {
    const factor = explodedFactor;
    const depth = project.enclosure.depthMm / 10.0;
    const wall = (project.enclosure.wallThicknessMm || 2.0) / 10.0;

    if (shellTopGroupRef.current) {
      shellTopGroupRef.current.position.y = depth / 2 - wall / 2 + factor * 8.2;
      shellTopGroupRef.current.rotation.z = factor * 0.035;
    }

    if (displayGroupRef.current) {
      displayGroupRef.current.position.y = displayBaseYRef.current + factor * 5.5;
      displayGroupRef.current.rotation.x = factor * -0.06;
    }

    if (keyboardGroupRef.current) {
      keyboardGroupRef.current.position.y = keyboardBaseYRef.current + factor * 3.2;
    }

    peripheralModulesRef.current.forEach(({ mesh, baseX, baseZ, baseY }) => {
      const radialX = baseX > 0 ? baseX + factor * 2.2 : baseX - factor * 2.2;
      const radialZ = baseZ > 0 ? baseZ + factor * 1.9 : baseZ - factor * 1.9;
      mesh.position.set(radialX, baseY + factor * 2.6, radialZ);
      mesh.rotation.y += 0;
    });

    if (mcuGroupRef.current) {
      mcuGroupRef.current.position.y = 0;
    }

    if (wiresGroupRef.current) {
      wiresGroupRef.current.position.y = factor * 1.8;
    }

    if (batteryGroupRef.current) {
      batteryGroupRef.current.position.y =
        -Math.max(0.55, depth / 2 - 0.5) - factor * 4.6;
      batteryGroupRef.current.rotation.x = factor * 0.05;
    }

    if (shellBottomGroupRef.current) {
      shellBottomGroupRef.current.position.y = -depth / 2 + wall / 2 - factor * 7.4;
      shellBottomGroupRef.current.rotation.z = factor * -0.02;
    }

    requestRenderRef.current?.();
  }, [explodedFactor, project.enclosure.depthMm, project.enclosure.wallThicknessMm]);

  // 7. Quality / render settings
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const pixelRatio =
      quality === 'cinematic'
        ? Math.min(window.devicePixelRatio, 2)
        : quality === 'balanced'
          ? Math.min(window.devicePixelRatio, 1.5)
          : 1;
    renderer.setPixelRatio(softwareGlRef.current ? 1 : pixelRatio);
    composerRef.current?.setPixelRatio(softwareGlRef.current ? 1 : pixelRatio);
    if (mountRef.current) {
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      composerRef.current?.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    }
  }, [quality]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) renderer.toneMappingExposure = exposure;
  }, [exposure]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = enableBloom;
      bloomPassRef.current.strength = bloomStrength;
    }
  }, [enableBloom, bloomStrength]);

  useEffect(() => {
    if (gtaoPassRef.current) {
      gtaoPassRef.current.enabled = enableAO && quality !== 'performance';
    }
    if (keyLightRef.current) {
      keyLightRef.current.castShadow = enableShadows && quality !== 'performance';
    }
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = enableShadows && quality !== 'performance';
    }
  }, [enableAO, enableShadows, quality]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    if (floorGroupRef.current) floorGroupRef.current.visible = showFloor;
  }, [showFloor]);

  useEffect(() => {
    if (particlesRef.current) particlesRef.current.visible = enableParticles;
  }, [enableParticles]);

  useEffect(() => {
    if (screenGlowLightRef.current) {
      screenGlowLightRef.current.intensity = 3.5 + screenGlow * 1.5;
    }
  }, [screenGlow]);

  // 8. Camera presets
  const setCameraPreset = useCallback(
    (preset: CameraPreset) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const centerY = deviceCenterYRef.current;
      const displayPosition = new THREE.Vector3();
      if (displayGroupRef.current) {
        displayGroupRef.current.getWorldPosition(displayPosition);
      } else {
        displayPosition.set(0, centerY, 0.8);
      }

      switch (preset) {
        case 'iso':
          camera.position.set(11, centerY + 3.4, 24);
          controls.target.set(0, centerY * 0.92, 0.4);
          break;
        case 'front':
          camera.position.set(0, centerY * 0.98, 27);
          controls.target.set(0, centerY * 0.94, 0.5);
          break;
        case 'screen':
          camera.position.set(displayPosition.x, displayPosition.y + 0.2, displayPosition.z + 12.5);
          controls.target.set(displayPosition.x, displayPosition.y, displayPosition.z);
          break;
        case 'top':
          camera.position.set(0.1, centerY + 22, 10);
          controls.target.set(0, centerY * 0.5, 0);
          break;
        case 'macro':
          camera.position.set(
            displayPosition.x + 3.4,
            displayPosition.y + 1.3,
            displayPosition.z + 7.2
          );
          controls.target.set(displayPosition.x, displayPosition.y, displayPosition.z);
          break;
      }
      controls.update();
    },
    []
  );

  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const height = project.enclosure.heightMm / 10;
    const frameScale = Math.max(height, project.enclosure.widthMm / 10, 9);
    const rootY = height / 2 + 0.56;
    camera.position.set(frameScale * 0.52, rootY * 0.92 + 1.4, frameScale * 1.35 + 5);
    controls.target.set(0, rootY * 0.88, 0.5);
    controls.update();
  }, [project.enclosure.heightMm, project.enclosure.widthMm]);

  const animateExplodeTo = useCallback(
    (target: number) => {
      if (explodeAnimRef.current) cancelAnimationFrame(explodeAnimRef.current);
      const from = explodedFactor;
      const start = performance.now();
      const duration = 620;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setExplodedFactor(from + (target - from) * eased);
        if (t < 1) {
          explodeAnimRef.current = requestAnimationFrame(tick);
        } else {
          explodeAnimRef.current = null;
        }
      };
      explodeAnimRef.current = requestAnimationFrame(tick);
    },
    [explodedFactor]
  );

  const handlePipPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = Math.max(0, Math.min(512, ((event.clientX - rect.left) / rect.width) * 512));
    const touchY = Math.max(0, Math.min(384, ((event.clientY - rect.top) / rect.height) * 384));
    dispatchTouch(touchX, touchY);
  };

  const renderEnabled = !uiHidden;

  return (
    <div className="relative w-full h-full bg-[#03050a] overflow-hidden select-none">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />

      {renderEnabled && (
        <>
          {/* Spec card */}
          {showInfo && (
            <div className="absolute top-3 left-3 z-20 max-w-[calc(100vw-1.5rem)] bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-xs overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  <h3 className="font-bold text-white tracking-tight text-xs truncate">{project.name}</h3>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 cursor-pointer shrink-0"
                  aria-label="Hide device info"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-3 py-2 space-y-0.5">
                <p className="text-[11px] text-slate-400">
                  Board: <strong className="text-cyan-300 font-mono">{project.mcu.name}</strong>
                </p>
                <p className="hidden sm:block text-[10px] text-slate-500 font-mono">
                  {project.enclosure.widthMm} × {project.enclosure.heightMm} × {project.enclosure.depthMm} mm
                  {' · '}
                  {project.enclosure.material}
                </p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-emerald-400 font-mono">
                  <MousePointer className="w-3 h-3 shrink-0" />
                  <span className="truncate">Tap the glass display to interact</span>
                </div>
              </div>
            </div>
          )}

          {/* Camera / overlay toolbar */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 max-w-[calc(100vw-1.5rem)]">
            <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-2xl overflow-x-auto max-w-full">
              {[
                { id: 'iso' as const, label: 'Iso', icon: Box },
                { id: 'front' as const, label: 'Front', icon: Smartphone },
                { id: 'screen' as const, label: 'Screen', icon: MonitorPlay },
                { id: 'macro' as const, label: 'Macro', icon: Camera },
                { id: 'top' as const, label: 'Top', icon: Grid3x3 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCameraPreset(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    id === 'screen'
                      ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`${label} camera`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
              <span className="w-px h-5 bg-slate-700/80 mx-0.5" />
              <button
                onClick={resetCamera}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Reset camera"
                aria-label="Reset camera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setAutoRotate((value) => !value)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  autoRotate ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={autoRotate ? 'Stop turntable' : 'Start turntable'}
                aria-label="Toggle turntable"
              >
                {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowTouchPip((value) => !value)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold border shadow-xl transition-all cursor-pointer ${
                  showTouchPip
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-950/80 backdrop-blur-md border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                title="Toggle interactive screen mirror"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Screen</span>
              </button>
              {!showInfo && (
                <button
                  onClick={() => setShowInfo(true)}
                  className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white shadow-xl cursor-pointer"
                  title="Show device info"
                  aria-label="Show device info"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onToggleUi?.()}
                className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white shadow-xl cursor-pointer"
                title="Hide all UI windows"
                aria-label="Hide all UI"
              >
                <PanelTop className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Picture-in-picture interactive display mirror */}
          {showTouchPip && (
            <div className="absolute top-20 right-3 z-30 w-[min(20rem,calc(100vw-1.5rem))] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-cyan-400" />
                  Live Display Surface
                </span>
                <button
                  onClick={() => setShowTouchPip(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  aria-label="Close live screen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-[#040810]">
                <canvas
                  ref={pipCanvasRef}
                  width={512}
                  height={384}
                  onPointerDown={handlePipPointerDown}
                  className="w-full h-auto aspect-[4/3] cursor-pointer touch-none block"
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono px-0.5">
                <span>Tap to interact</span>
                <span className="text-cyan-400">Live 3D mirror</span>
              </div>
            </div>
          )}

          {/* Dock */}
          <div
            className="fixed bottom-16 lg:bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center w-[min(960px,96vw)]"
            style={{ bottom: 64 }}
          >
            <button
              onClick={() => setIsHudCollapsed((value) => !value)}
              className="flex items-center gap-1.5 bg-slate-950/95 border-t border-x border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold px-4 py-1.5 rounded-t-xl shadow-lg cursor-pointer transition-colors"
            >
              {isHudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{isHudCollapsed ? 'Show 3D Studio' : 'Hide 3D Studio'}</span>
              <span className="hidden sm:inline text-slate-500 font-mono">
                {Math.round(explodedFactor * 100)}% exploded
              </span>
            </button>

            {!isHudCollapsed && (
            <div className="w-full max-h-[62vh] overflow-y-auto bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xl space-y-3 text-xs text-slate-200">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'cad' as const, label: 'Exploded CAD', icon: Layers },
                  { id: 'render' as const, label: 'Rendering', icon: Settings2 },
                  { id: 'layers' as const, label: 'Layers', icon: Box }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setDockTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      dockTab === id
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-900/50 text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {dockTab === 'cad' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        Exploded Assembly
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {Math.round(explodedFactor * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={explodedFactor}
                      onChange={(event) => {
                        if (explodeAnimRef.current) cancelAnimationFrame(explodeAnimRef.current);
                        setExplodedFactor(parseFloat(event.target.value));
                      }}
                      className="w-full accent-cyan-500 cursor-pointer touch-manipulation"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Assembled', value: 0 },
                        { label: 'Half', value: 0.5 },
                        { label: 'Teardown', value: 1 }
                      ].map(({ label, value }) => (
                        <button
                          key={label}
                          onClick={() => animateExplodeTo(value)}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                            Math.abs(explodedFactor - value) < 0.02
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
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
                      min="0.08"
                      max="1"
                      step="0.01"
                      value={caseOpacity}
                      onChange={(event) => setCaseOpacity(parseFloat(event.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer touch-manipulation"
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'X-Ray', value: 0.2 },
                        { label: 'Ghost', value: 0.5 },
                        { label: 'Frost', value: 0.78 },
                        { label: 'Solid', value: 1 }
                      ].map(({ label, value }) => (
                        <button
                          key={label}
                          onClick={() => setCaseOpacity(value)}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                            Math.abs(caseOpacity - value) < 0.015
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Casing Finish
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={project.enclosure.material}
                        onChange={(event) => onUpdateEnclosure({ material: event.target.value as any })}
                        className="bg-slate-950/80 border border-slate-700 text-slate-200 text-[11px] rounded-lg p-1.5 outline-none focus:border-cyan-500 cursor-pointer flex-1 min-w-0"
                      >
                        <option value="Anodized Aluminum">Anodized Aluminum</option>
                        <option value="CNC Polycarbonate">CNC Polycarbonate</option>
                        <option value="3D-Printed PETG">3D-Printed PETG</option>
                      </select>
                      <input
                        type="color"
                        value={project.enclosure.colorHex}
                        onChange={(event) => onUpdateEnclosure({ colorHex: event.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
                        aria-label="Casing colour"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      Material changes reflections, roughness and clear-coat in real time.
                    </p>
                  </div>
                </div>
              )}

              {dockTab === 'render' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        Quality
                      </label>
                      <select
                        value={quality}
                        onChange={(event) => setQuality(event.target.value as QualityPreset)}
                        className="mt-1.5 w-full bg-slate-950/80 border border-slate-700 text-slate-200 text-[11px] rounded-lg p-1.5 outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="cinematic">Cinematic (max detail)</option>
                        <option value="balanced">Balanced</option>
                        <option value="performance">Performance</option>
                      </select>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3 h-3 text-amber-400" />
                          Exposure
                        </span>
                        <span className="text-cyan-300">{exposure.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.55"
                        max="1.9"
                        step="0.01"
                        value={exposure}
                        onChange={(event) => setExposure(parseFloat(event.target.value))}
                        className="mt-2 w-full accent-amber-400 cursor-pointer touch-manipulation"
                      />
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Film className="w-3 h-3 text-fuchsia-400" />
                          Bloom
                        </span>
                        <span className="text-cyan-300">{bloomStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.4"
                        step="0.01"
                        value={bloomStrength}
                        onChange={(event) => setBloomStrength(parseFloat(event.target.value))}
                        className="mt-2 w-full accent-fuchsia-400 cursor-pointer touch-manipulation"
                      />
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <ScanLine className="w-3 h-3 text-cyan-400" />
                          Screen Glow
                        </span>
                        <span className="text-cyan-300">{screenGlow.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={screenGlow}
                        onChange={(event) => setScreenGlow(parseFloat(event.target.value))}
                        className="mt-2 w-full accent-cyan-400 cursor-pointer touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    {[
                      { label: 'Bloom', checked: enableBloom, set: setEnableBloom },
                      { label: 'Ambient Occlusion', checked: enableAO, set: setEnableAO },
                      { label: 'Soft Shadows', checked: enableShadows, set: setEnableShadows },
                      { label: 'Cinematic Grade', checked: cinematicFx, set: setCinematicFx },
                      { label: 'Studio Floor', checked: showFloor, set: setShowFloor },
                      { label: 'Atmosphere', checked: enableParticles, set: setEnableParticles },
                      { label: 'Turntable', checked: autoRotate, set: setAutoRotate }
                    ].map(({ label, checked, set }) => (
                      <label
                        key={label}
                        className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => set(event.target.checked)}
                          className="rounded accent-cyan-500"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {dockTab === 'layers' && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-slate-300 text-[11px]">Display Layers:</span>
                  {[
                    { label: 'Faceplate & Chassis', checked: showShell, set: setShowShell, icon: Box },
                    { label: 'Displays & Modules', checked: showModules, set: setShowModules, icon: Cpu },
                    { label: '3D Wiring Harness', checked: showWires, set: setShowWires, icon: Cable },
                    { label: 'LiPo Battery', checked: showBattery, set: setShowBattery, icon: Battery }
                  ].map(({ label, checked, set, icon: Icon }) => (
                    <label
                      key={label}
                      className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => set(event.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <Icon className="w-3 h-3 text-slate-500" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
