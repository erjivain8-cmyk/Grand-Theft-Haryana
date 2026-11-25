import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HaryanaAudioEngine } from './audio';
import { buildCharacterModel, buildVehicleModel, CharacterRig, VehicleRig } from './models';
import { createWorldTextures, WorldTextures } from './textures';
import {
  CameraPreset,
  GameMode,
  GraphicsQuality,
  HudSnapshot,
  MinimapEntity,
  MissionState,
  PlayableCharacterId,
  RadioStationId,
  TimeOfDay,
  TouchInputState,
  VEHICLE_CATALOG,
  VehicleCustomization,
  VehicleType,
  WeatherMode,
} from './types';
import { buildHaryanaWorld, ColliderBox, getDistrictAt, groundHeightAt, TrafficWaypoint, WorldRefs } from './world';

// Pre-allocated math helpers outside render loop (Zero GC)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _skyColor = new THREE.Color();

interface SpawnedVehicle {
  id: string;
  type: VehicleType;
  name: string;
  rig: VehicleRig;
  x: number;
  z: number;
  heading: number;
  speed: number;
  steerAngle: number;
  customization: VehicleCustomization;
}

interface TrafficActor {
  rig: VehicleRig;
  loop: TrafficWaypoint[];
  wpIndex: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
}

interface PedestrianActor {
  rig: CharacterRig;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  heading: number;
  phase: number;
  radius: number;
}

interface RacerActor {
  id: string;
  rig: VehicleRig;
  x: number;
  z: number;
  heading: number;
  speed: number;
  cpIndex: number;
  lap: number;
}

const RACE_CHECKPOINTS: TrafficWaypoint[] = [
  { x: 115, z: 0 },
  { x: 115, z: -155 },
  { x: -85, z: -155 },
  { x: -85, z: 0 },
];

export class HaryanaEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: WorldTextures;
  private world: WorldRefs;
  private audio = new HaryanaAudioEngine();

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private headSpotLight: THREE.SpotLight;
  private headSpotTarget: THREE.Object3D;

  private playerRig: CharacterRig;
  private playerX = -85;
  private playerY = 0;
  private playerZ = 62;
  private playerHeading = 0;
  private playerVelY = 0;
  private walkCycle = 0;

  private vehicles: SpawnedVehicle[] = [];
  private activeVehicle: SpawnedVehicle | null = null;
  private traffic: TrafficActor[] = [];
  private pedestrians: PedestrianActor[] = [];
  private racers: RacerActor[] = [];

  private waypointGroup: THREE.Group;
  private waypointRing: THREE.Mesh;
  private waypointBeam: THREE.Mesh;

  // Game & Settings State
  private started = false;
  private mode: GameMode = 'story';
  private graphics: GraphicsQuality = 'medium';
  private timeOfDay: TimeOfDay = 'morning';
  private weather: WeatherMode = 'clear';
  private characterId: PlayableCharacterId = 'veer';
  private cameraPreset: CameraPreset = 'chase';

  private cashInr = 5000;
  private respectPoints = 50;
  private missionStage = 0;
  private missionDone = false;
  private raceCpIndex = 0;
  private raceLap = 1;
  private raceFinished = false;

  // Controls
  private keys = new Set<string>();
  private touchInput: TouchInputState = { steerX: 0, moveY: 0, sprint: false, brake: false, horn: false };
  private cameraYawOffset = 0;
  private cameraPitchOffset = 0.28;
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Loop & Telemetry
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private hudTimer = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsEstimate = 60;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onContextLostCb: (lost: boolean) => void;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundResize: () => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: () => void;
  private boundContextLost: (e: Event) => void;
  private boundContextRestored: () => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onContextLost: (lost: boolean) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostCb = onContextLost;

    // 1. Software WebGL Guard (per Three.js skill specification)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.className = 'w-full h-full block touch-none-canvas';
    container.appendChild(this.renderer.domElement);

    // 2. Scene, Camera & Studio RoomEnvironment
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.3,
      900
    );

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. 3-Point Warm/Cool Lighting Rig (<= 3 shadow casters)
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x78553a, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.sunLight.position.set(70, 95, 55);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 280;
    const d = 85;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Vehicle night headlight spotlight
    this.headSpotLight = new THREE.SpotLight(0xfef9c3, 0, 55, Math.PI / 5, 0.45, 1.4);
    this.headSpotTarget = new THREE.Object3D();
    this.scene.add(this.headSpotLight, this.headSpotTarget);
    this.headSpotLight.target = this.headSpotTarget;

    // 4. Procedural Textures & World
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createWorldTextures(maxAniso);
    this.world = buildHaryanaWorld(this.textures);
    this.scene.add(this.world.root);

    // 5. Player Character & 4 Iconic Vehicles
    this.playerRig = buildCharacterModel(this.characterId, this.textures.contactShadow);
    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.playerRig.root);

    this.spawnInitialVehicles();
    this.spawnTrafficAndPedestrians();
    this.spawnRacers();

    // 6. Glowing 3D Mission Waypoint Beacon
    this.waypointGroup = new THREE.Group();
    this.waypointRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.6, 28),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.waypointRing.rotation.x = -Math.PI / 2;
    this.waypointRing.position.y = 0.14;
    this.waypointBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.4, 34, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.waypointBeam.position.y = 17;
    this.waypointGroup.add(this.waypointRing, this.waypointBeam);
    this.scene.add(this.waypointGroup);

    // Apply initial atmosphere
    this.applyAtmosphere();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 7. Listeners
    this.boundKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (this.started) {
        this.audio.unlock();
        if (e.code === 'KeyF' || e.code === 'Enter') {
          this.toggleEnterExitVehicle();
        } else if (e.code === 'KeyH') {
          this.triggerHorn();
        } else if (e.code === 'KeyC') {
          this.cycleCameraPreset();
        }
      }
    };
    this.boundKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this.boundResize = () => this.handleResize();
    this.boundPointerDown = (e) => {
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };
    this.boundPointerMove = (e) => {
      if (!this.isPointerDown || !this.started) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.cameraYawOffset -= dx * 0.006;
      this.cameraPitchOffset = THREE.MathUtils.clamp(this.cameraPitchOffset + dy * 0.004, 0.08, 0.85);
    };
    this.boundPointerUp = () => {
      this.isPointerDown = false;
    };
    this.boundContextLost = (e) => {
      e.preventDefault();
      this.onContextLostCb(true);
    };
    this.boundContextRestored = () => {
      this.onContextLostCb(false);
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('resize', this.boundResize);
    this.renderer.domElement.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.boundContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.boundContextRestored);

    this.pushHudSnapshot();
    this.tick();
  }

  private spawnInitialVehicles(): void {
    const placements: { type: VehicleType; x: number; z: number; heading: number; color?: string }[] = [
      { type: 'suv', x: -80, z: 58, heading: Math.PI, color: '#16181d' },
      { type: 'bike', x: -72, z: 78, heading: -Math.PI / 2, color: '#1e3a2f' },
      { type: 'tractor', x: -112, z: 56, heading: 0.4, color: '#c83e2b' },
      { type: 'auto', x: -12, z: 10, heading: Math.PI / 2, color: '#eab308' },
    ];

    placements.forEach((p, idx) => {
      const cat = VEHICLE_CATALOG.find((v) => v.type === p.type)!;
      const custom: VehicleCustomization = {
        paintColor: p.color ?? cat.defaultColor,
        accentColor: '#f59e0b',
        lightbar: p.type === 'suv',
        liftKit: false,
      };
      const rig = buildVehicleModel(p.type, custom, this.textures.contactShadow, this.isSoftwareGl);
      rig.root.position.set(p.x, groundHeightAt(p.x, p.z), p.z);
      rig.root.rotation.y = p.heading;
      this.scene.add(rig.root);

      this.vehicles.push({
        id: `veh_${idx}_${p.type}`,
        type: p.type,
        name: cat.name,
        rig,
        x: p.x,
        z: p.z,
        heading: p.heading,
        speed: 0,
        steerAngle: 0,
        customization: custom,
      });
    });
  }

  private spawnTrafficAndPedestrians(): void {
    const trafficSpecs: { type: VehicleType; color: string; loop: TrafficWaypoint[]; wp: number; speed: number }[] = [
      { type: 'suv', color: '#e5e7eb', loop: this.world.trafficLoopA, wp: 1, speed: 16 },
      { type: 'auto', color: '#eab308', loop: this.world.trafficLoopA, wp: 2, speed: 13 },
      { type: 'bike', color: '#1d4ed8', loop: this.world.trafficLoopA, wp: 3, speed: 18 },
      { type: 'tractor', color: '#15803d', loop: this.world.trafficLoopB, wp: 1, speed: 10 },
      { type: 'suv', color: '#334155', loop: this.world.trafficLoopB, wp: 2, speed: 17 },
    ];

    trafficSpecs.forEach((spec) => {
      const startWp = spec.loop[spec.wp % spec.loop.length];
      const rig = buildVehicleModel(
        spec.type,
        { paintColor: spec.color, accentColor: '#f59e0b', lightbar: false, liftKit: false },
        this.textures.contactShadow,
        this.isSoftwareGl
      );
      rig.root.position.set(startWp.x, 0, startWp.z);
      this.scene.add(rig.root);
      this.traffic.push({
        rig,
        loop: spec.loop,
        wpIndex: (spec.wp + 1) % spec.loop.length,
        x: startWp.x,
        z: startWp.z,
        heading: 0,
        speed: spec.speed,
      });
    });

    // Wandering NPCs in Kheri Kalan Village, Dhaba & Cyber City
    const pedLocations: [number, number, PlayableCharacterId][] = [
      [-68, 76, 'baljeet'],
      [-74, 84, 'veer'],
      [-92, 92, 'ritu'],
      [-80, 96, 'baljeet'],
      [-6, 15, 'veer'],
      [6, 15, 'baljeet'],
      [126, -86, 'ritu'],
      [134, -98, 'veer'],
      [128, -112, 'ritu'],
      [-115, -88, 'baljeet'],
    ];

    pedLocations.forEach(([px, pz, cid], idx) => {
      const rig = buildCharacterModel(cid, this.textures.contactShadow);
      rig.root.position.set(px, 0, pz);
      this.scene.add(rig.root);
      this.pedestrians.push({
        rig,
        homeX: px,
        homeZ: pz,
        x: px,
        z: pz,
        heading: idx * 1.1,
        phase: idx * 0.9,
        radius: 4.5 + (idx % 3) * 2,
      });
    });
  }

  private spawnRacers(): void {
    const specs: { id: string; type: VehicleType; color: string; offset: number; speed: number }[] = [
      { id: 'racer_1', type: 'suv', color: '#c83e2b', offset: -3.5, speed: 25 },
      { id: 'racer_2', type: 'bike', color: '#1d4ed8', offset: 3.5, speed: 23.5 },
    ];
    specs.forEach((s) => {
      const rig = buildVehicleModel(
        s.type,
        { paintColor: s.color, accentColor: '#ffffff', lightbar: true, liftKit: false },
        this.textures.contactShadow,
        this.isSoftwareGl
      );
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.racers.push({
        id: s.id,
        rig,
        x: -20,
        z: s.offset,
        heading: Math.PI / 2,
        speed: s.speed,
        cpIndex: 0,
        lap: 1,
      });
    });
  }

  public startGame(mode?: GameMode): void {
    if (mode) this.setGameMode(mode);
    this.started = true;
    this.audio.unlock();
    this.pushHudSnapshot();
  }

  public setGameMode(mode: GameMode): void {
    this.mode = mode;
    if (mode === 'multiplayer') {
      // Position player at NH-48 starting grid in SUV if on foot
      const suv = this.vehicles.find((v) => v.type === 'suv') ?? this.vehicles[0];
      if (!this.activeVehicle && suv) {
        this.enterVehicle(suv);
      }
      if (this.activeVehicle) {
        this.activeVehicle.x = -25;
        this.activeVehicle.z = 0;
        this.activeVehicle.heading = Math.PI / 2;
        this.activeVehicle.speed = 0;
      }
      this.raceCpIndex = 0;
      this.raceLap = 1;
      this.raceFinished = false;
      this.racers.forEach((r, idx) => {
        r.x = -22;
        r.z = idx === 0 ? -4.2 : 4.2;
        r.heading = Math.PI / 2;
        r.cpIndex = 0;
        r.lap = 1;
        r.rig.root.visible = true;
      });
    } else {
      this.racers.forEach((r) => {
        r.rig.root.visible = false;
      });
    }
    this.pushHudSnapshot();
  }

  public restartMission(): void {
    this.mode = 'story';
    this.missionStage = 0;
    this.missionDone = false;
    this.racers.forEach((r) => {
      r.rig.root.visible = false;
    });
    this.pushHudSnapshot();
  }

  public setCharacter(id: PlayableCharacterId): void {
    if (this.characterId === id) return;
    this.characterId = id;
    const wasVisible = this.playerRig.root.visible;
    this.scene.remove(this.playerRig.root);
    this.playerRig = buildCharacterModel(id, this.textures.contactShadow);
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.rotation.y = this.playerHeading;
    this.playerRig.root.visible = wasVisible;
    this.scene.add(this.playerRig.root);
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphics = quality;
    if (this.isSoftwareGl) return;

    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.camera.far = 420;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.camera.far = 700;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.camera.far = 950;
    }
    this.camera.updateProjectionMatrix();
  }

  public setTimeOfDay(tod: TimeOfDay): void {
    this.timeOfDay = tod;
    this.applyAtmosphere();
  }

  public setWeather(weather: WeatherMode): void {
    this.weather = weather;
    this.applyAtmosphere();
  }

  public setRadioStation(station: RadioStationId): void {
    this.audio.setRadioStation(station);
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  public triggerHorn(): void {
    this.audio.playHorn(this.activeVehicle?.type ?? null);
  }

  public cycleCameraPreset(): CameraPreset {
    const order: CameraPreset[] = ['chase', 'far', 'hood'];
    this.cameraPreset = order[(order.indexOf(this.cameraPreset) + 1) % order.length];
    return this.cameraPreset;
  }

  public setTouchInput(partial: Partial<TouchInputState>): void {
    Object.assign(this.touchInput, partial);
    if (partial.horn) {
      this.triggerHorn();
    }
  }

  public summonAndCustomizeVehicle(type: VehicleType, customization: VehicleCustomization): void {
    let target = this.vehicles.find((v) => v.type === type);
    if (!target) return;

    // Rebuild vehicle rig with updated paint / lift / lightbar
    const wasActive = this.activeVehicle?.id === target.id;
    const oldX = wasActive ? target.x : this.playerX + 4.5;
    const oldZ = wasActive ? target.z : this.playerZ + 4.5;
    const oldH = wasActive ? target.heading : this.playerHeading;

    this.scene.remove(target.rig.root);
    const newRig = buildVehicleModel(type, customization, this.textures.contactShadow, this.isSoftwareGl);
    newRig.root.position.set(oldX, groundHeightAt(oldX, oldZ), oldZ);
    newRig.root.rotation.y = oldH;
    this.scene.add(newRig.root);

    target.rig = newRig;
    target.customization = { ...customization };
    target.x = oldX;
    target.z = oldZ;
    target.heading = oldH;
    target.speed = 0;

    if (!wasActive && this.activeVehicle) {
      this.exitVehicle();
    }
    this.enterVehicle(target);
    this.applyAtmosphere();
    this.pushHudSnapshot();
  }

  public teleportToDistrict(district: 'village' | 'dhaba' | 'cyber' | 'sarovar' | 'morni'): void {
    const coords: Record<typeof district, [number, number]> = {
      village: [-85, 62],
      dhaba: [0, 8],
      cyber: [115, -75],
      sarovar: [-100, -90],
      morni: [135, 95],
    };
    const [nx, nz] = coords[district];
    if (this.activeVehicle) {
      this.activeVehicle.x = nx;
      this.activeVehicle.z = nz;
      this.activeVehicle.speed = 0;
    } else {
      this.playerX = nx;
      this.playerZ = nz;
      this.playerY = groundHeightAt(nx, nz);
    }
    this.pushHudSnapshot();
  }

  public toggleEnterExitVehicle(): void {
    if (this.activeVehicle) {
      this.exitVehicle();
    } else {
      const near = this.findNearestVehicle(6.5);
      if (near) {
        this.enterVehicle(near);
      }
    }
    this.pushHudSnapshot();
  }

  private enterVehicle(veh: SpawnedVehicle): void {
    this.activeVehicle = veh;
    this.playerRig.root.visible = false;
    this.cameraYawOffset = 0;
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) return;
    const veh = this.activeVehicle;
    const sideX = Math.cos(veh.heading) * 2.2;
    const sideZ = -Math.sin(veh.heading) * 2.2;
    this.playerX = veh.x - sideX;
    this.playerZ = veh.z - sideZ;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerHeading = veh.heading;
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.visible = true;
    this.activeVehicle = null;
    this.audio.updateEngine(false, null, 0, false);
  }

  private findNearestVehicle(maxDist: number): SpawnedVehicle | null {
    let best: SpawnedVehicle | null = null;
    let bestD2 = maxDist * maxDist;
    for (const v of this.vehicles) {
      const dx = v.x - this.playerX;
      const dz = v.z - this.playerZ;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = v;
      }
    }
    return best;
  }

  private applyAtmosphere(): void {
    const todSettings: Record<TimeOfDay, { sky: number; sun: number; sunInt: number; sunPos: [number, number, number]; hemiSky: number; hemiGround: number; hemiInt: number; nightEmissive: number }> = {
      morning: {
        sky: 0xdbeafe,
        sun: 0xffe8c2,
        sunInt: 1.5,
        sunPos: [85, 65, 65],
        hemiSky: 0x93c5fd,
        hemiGround: 0x8a6a4b,
        hemiInt: 0.72,
        nightEmissive: 0.2,
      },
      noon: {
        sky: 0x7dd3fc,
        sun: 0xfffbeb,
        sunInt: 1.75,
        sunPos: [25, 130, 35],
        hemiSky: 0xbae6fd,
        hemiGround: 0x856d4f,
        hemiInt: 0.8,
        nightEmissive: 0.1,
      },
      dusk: {
        sky: 0xfb923c,
        sun: 0xfdba74,
        sunInt: 1.35,
        sunPos: [-95, 28, -55],
        hemiSky: 0xfda4af,
        hemiGround: 0x4b3832,
        hemiInt: 0.65,
        nightEmissive: 1.2,
      },
      night: {
        sky: 0x0b1120,
        sun: 0x93c5fd,
        sunInt: 0.48,
        sunPos: [-40, 85, -40],
        hemiSky: 0x1e3a8a,
        hemiGround: 0x18181b,
        hemiInt: 0.45,
        nightEmissive: 2.2,
      },
    };

    const cfg = todSettings[this.timeOfDay];
    _skyColor.setHex(cfg.sky);

    let fogDensity = 0.0021;
    if (this.weather === 'dust') {
      _skyColor.lerp(new THREE.Color(0xd9b382), 0.55);
      fogDensity = 0.0062;
    } else if (this.weather === 'rain') {
      _skyColor.lerp(new THREE.Color(0x475569), 0.62);
      fogDensity = 0.0052;
    }

    this.scene.background = _skyColor.clone();
    this.scene.fog = new THREE.FogExp2(_skyColor.getHex(), fogDensity);

    this.sunLight.color.setHex(cfg.sun);
    this.sunLight.intensity = this.weather === 'rain' ? cfg.sunInt * 0.6 : cfg.sunInt;
    this.sunLight.position.set(...cfg.sunPos);
    this.hemiLight.color.setHex(cfg.hemiSky);
    this.hemiLight.groundColor.setHex(cfg.hemiGround);
    this.hemiLight.intensity = cfg.hemiInt;

    this.world.nightEmissiveMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && 'emissiveIntensity' in mat) {
        mat.emissiveIntensity = cfg.nightEmissive;
      }
    });

    const isNightOrDusk = this.timeOfDay === 'night' || this.timeOfDay === 'dusk';
    this.vehicles.forEach((v) => {
      v.rig.headlights.forEach((hl) => {
        const mat = hl.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isNightOrDusk ? 2.4 : 0.4;
      });
    });

    this.world.rainSystem.visible = this.weather === 'rain';
  }

  private resolveCollisions(x: number, z: number, radius: number): [number, number, boolean] {
    let rx = THREE.MathUtils.clamp(x, -295, 295);
    let rz = THREE.MathUtils.clamp(z, -245, 245);
    let hit = false;

    const colliders: ColliderBox[] = this.world.colliders;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq) || 0.001;
        const push = radius - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      }
    }
    return [rx, rz, hit];
  }

  private getCurrentMissionState(): MissionState {
    if (this.mode === 'freeroam') {
      return {
        id: 'freeroam',
        title: 'Free Roam · Haryana Explorer',
        titleHi: 'फ्री रोम · हरियाणा भ्रमण',
        stageIndex: 0,
        totalStages: 1,
        objectiveText: 'Explore Kheri Kalan, Tau Da Dhaba, Kurukshetra Sarovar, Gurugram Cyber City & Morni Hills.',
        objectiveTextHi: 'खेड़ी कलां, ताऊ दा ढाबा, कुरुक्षेत्र सरोवर, गुरुग्राम साइबर सिटी व मोरनी हिल्स घूमो।',
        targetX: null,
        targetZ: null,
        targetRadius: 0,
        completed: false,
        rewardInr: 0,
      };
    }

    if (this.mode === 'multiplayer') {
      const cp = RACE_CHECKPOINTS[this.raceCpIndex % RACE_CHECKPOINTS.length];
      return {
        id: 'mp_convoy',
        title: 'NH-48 Convoy Race (2 Laps)',
        titleHi: 'NH-48 काफिला रेस (2 लैप)',
        stageIndex: this.raceCpIndex,
        totalStages: RACE_CHECKPOINTS.length * 2,
        objectiveText: this.raceFinished
          ? 'Convoy Race Finished! Switch mode or drive on.'
          : `Lap ${this.raceLap}/2 — Drive through Checkpoint ${this.raceCpIndex + 1}/4`,
        objectiveTextHi: this.raceFinished
          ? 'काफिला रेस पूरी! ₹20,000 इनाम मिला।'
          : `लैप ${this.raceLap}/2 — चेकपॉइंट ${this.raceCpIndex + 1}/4 से निकलें`,
        targetX: this.raceFinished ? null : cp.x,
        targetZ: this.raceFinished ? null : cp.z,
        targetRadius: 11,
        completed: this.raceFinished,
        rewardInr: 20000,
      };
    }

    // Story Mode: Mission 1 "Mitti Te Cyber Tak"
    const stages: Omit<MissionState, 'id' | 'title' | 'titleHi' | 'totalStages' | 'rewardInr'>[] = [
      {
        stageIndex: 0,
        objectiveText: 'Walk or drive to Kheri Kalan Chaupal (under the Banyan tree) to collect the Sarpanch papers.',
        objectiveTextHi: 'सरपंच के कागज़ लेने खेड़ी कलां चौपाल (बरगद के पेड़ नीचे) जाएँ।',
        targetX: -72,
        targetZ: 72,
        targetRadius: 8,
        completed: false,
        dialogueSpeaker: 'Tau Baljeet',
        dialogueLine: 'Veer! Pick up the land registry file from the Chaupal and take the Garuda SUV to Cyber City.',
        dialogueLineHi: 'वीर! चौपाल से ज़मीन की फाइल उठा और गरुड़ SUV लेके साइबर सिटी जा।',
      },
      {
        stageIndex: 1,
        objectiveText: 'Take NH-48 East to Gurugram Cyber City Plaza and deliver the file.',
        objectiveTextHi: 'NH-48 पूर्व से गुरुग्राम साइबर सिटी प्लाज़ा पहुँचें और फाइल दें।',
        targetX: 120,
        targetZ: -95,
        targetRadius: 11,
        completed: false,
        dialogueSpeaker: 'Ritu Dahiya',
        dialogueLine: 'Traffic on NH-48 is picking up — keep the Garuda steady and meet me by Cyber Tower!',
        dialogueLineHi: 'NH-48 पे ट्रैफिक बढ़ रहा है — सीधा साइबर टावर प्लाज़ा आ जा!',
      },
      {
        stageIndex: 2,
        objectiveText: 'Head back to Tau Da Dhaba on NH-48 for garam chai & your ₹15,000 payout.',
        objectiveTextHi: 'चाय और ₹15,000 इनाम के लिए NH-48 पर ताऊ दा ढाबा लौटें।',
        targetX: 0,
        targetZ: 9,
        targetRadius: 10,
        completed: false,
        dialogueSpeaker: 'Tau Baljeet',
        dialogueLine: 'Shabash sher! Come back to Tau Da Dhaba — hot parathe and your cut are waiting.',
        dialogueLineHi: 'शाबाश शेर! ताऊ दा ढाबा पे आ जा, गरम परांठे और तेरा हिस्सा तैयार है।',
      },
      {
        stageIndex: 3,
        objectiveText: 'Mission Complete: "Mitti Te Cyber Tak" — ₹15,000 & +250 Respect earned!',
        objectiveTextHi: 'मिशन पूरा: "मिट्टी से साइबर तक" — ₹15,000 व +250 सम्मान मिला!',
        targetX: null,
        targetZ: null,
        targetRadius: 0,
        completed: true,
        dialogueSpeaker: 'GTH Story',
        dialogueLine: 'Apna Area, Apna Rule! Explore Haryana in Free Roam or replay anytime.',
        dialogueLineHi: 'अपना एरिया, अपना रूल! अब पूरा हरियाणा घूमो।',
      },
    ];

    const s = stages[Math.min(this.missionStage, stages.length - 1)];
    return {
      id: 'story_m1',
      title: 'Mission 1: Mitti Te Cyber Tak',
      titleHi: 'मिशन 1: मिट्टी से साइबर तक',
      totalStages: 3,
      rewardInr: 15000,
      ...s,
    };
  }

  private updateMissionAndRace(dt: number): void {
    const px = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const pz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
    const mission = this.getCurrentMissionState();

    if (mission.targetX !== null && mission.targetZ !== null) {
      this.waypointGroup.visible = true;
      const gy = groundHeightAt(mission.targetX, mission.targetZ);
      this.waypointGroup.position.set(mission.targetX, gy, mission.targetZ);
      this.waypointRing.rotation.z += dt * 1.4;

      const dx = px - mission.targetX;
      const dz = pz - mission.targetZ;
      if (dx * dx + dz * dz <= mission.targetRadius * mission.targetRadius) {
        if (this.mode === 'story' && !this.missionDone) {
          this.missionStage++;
          if (this.missionStage >= 3) {
            this.missionDone = true;
            this.cashInr += 15000;
            this.respectPoints += 250;
            this.audio.playMissionChime(true);
          } else {
            this.audio.playMissionChime(false);
          }
          this.pushHudSnapshot();
        } else if (this.mode === 'multiplayer' && !this.raceFinished) {
          this.raceCpIndex++;
          if (this.raceCpIndex >= RACE_CHECKPOINTS.length) {
            this.raceCpIndex = 0;
            this.raceLap++;
            if (this.raceLap > 2) {
              this.raceFinished = true;
              this.cashInr += 20000;
              this.respectPoints += 350;
              this.audio.playMissionChime(true);
              this.pushHudSnapshot();
              return;
            }
          }
          this.audio.playMissionChime(false);
          this.pushHudSnapshot();
        }
      }
    } else {
      this.waypointGroup.visible = false;
    }
  }

  private updateGameplay(dt: number): void {
    const forward =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) +
      this.touchInput.moveY;
    const clampedForward = THREE.MathUtils.clamp(forward, -1, 1);

    const steer =
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      this.touchInput.steerX;
    const clampedSteer = THREE.MathUtils.clamp(steer, -1, 1);

    const sprintOrBrake = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchInput.sprint;
    const spaceKey = this.keys.has('Space') || this.touchInput.brake;

    if (this.activeVehicle) {
      const veh = this.activeVehicle;
      const spec = VEHICLE_CATALOG.find((v) => v.type === veh.type)!;
      const maxSpeedMs = spec.topSpeedKmh / 3.6;

      if (Math.abs(clampedForward) > 0.05) {
        const accel = clampedForward > 0 ? spec.acceleration : spec.acceleration * 0.72;
        veh.speed += clampedForward * accel * dt;
      } else {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 1.8, dt);
      }

      if (spaceKey) {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 6.5, dt);
      }

      veh.speed = THREE.MathUtils.clamp(veh.speed, -maxSpeedMs * 0.42, maxSpeedMs);

      const targetSteer = clampedSteer * 0.42;
      veh.steerAngle = THREE.MathUtils.damp(veh.steerAngle, targetSteer, 9, dt);

      if (Math.abs(veh.speed) > 0.35) {
        const dirSign = veh.speed >= 0 ? 1 : -1;
        const speedFactor = Math.min(1, Math.abs(veh.speed) / 8);
        veh.heading += veh.steerAngle * spec.handling * speedFactor * dirSign * dt;
      }

      const nextX = veh.x + Math.sin(veh.heading) * veh.speed * dt;
      const nextZ = veh.z + Math.cos(veh.heading) * veh.speed * dt;
      const [rx, rz, hit] = this.resolveCollisions(nextX, nextZ, veh.rig.width * 0.75);
      if (hit) veh.speed *= -0.25;

      veh.x = rx;
      veh.z = rz;
      const gy = groundHeightAt(veh.x, veh.z);

      veh.rig.root.position.set(veh.x, gy, veh.z);
      veh.rig.root.rotation.y = veh.heading;

      // Bike lean & SUV body roll
      const targetRoll =
        veh.type === 'bike'
          ? -veh.steerAngle * Math.min(1, Math.abs(veh.speed) / 14) * 0.75
          : veh.steerAngle * Math.min(1, Math.abs(veh.speed) / 18) * 0.12;
      veh.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(veh.rig.bodyGroup.rotation.z, targetRoll, 8, dt);

      // Spin wheels & steer front pivots
      const wheelSpin = (veh.speed / veh.rig.wheelRadius) * dt;
      for (const w of veh.rig.wheels) {
        w.rotation.x += wheelSpin;
      }
      for (const p of veh.rig.frontSteerPivots) {
        p.rotation.y = veh.steerAngle;
      }

      // Update brake lights
      veh.rig.taillights.forEach((tl) => {
        const m = tl.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = spaceKey || clampedForward < -0.1 ? 2.4 : 0.45;
      });

      // Keep hidden player synced to vehicle
      this.playerX = veh.x;
      this.playerZ = veh.z;
      this.playerY = gy;
      this.playerHeading = veh.heading;

      // Headlight SpotLight during dusk/night
      const isNight = this.timeOfDay === 'night' || this.timeOfDay === 'dusk';
      this.headSpotLight.intensity = isNight ? 18 : 0;
      if (isNight) {
        this.headSpotLight.position.set(
          veh.x + Math.sin(veh.heading) * 1.8,
          gy + 1.2,
          veh.z + Math.cos(veh.heading) * 1.8
        );
        this.headSpotTarget.position.set(
          veh.x + Math.sin(veh.heading) * 24,
          gy + 0.2,
          veh.z + Math.cos(veh.heading) * 24
        );
      }

      this.audio.updateEngine(true, veh.type, Math.abs(veh.speed) / maxSpeedMs, Math.abs(clampedForward) > 0.1);
    } else {
      // On-foot character movement relative to camera yaw
      this.headSpotLight.intensity = 0;
      this.audio.updateEngine(false, null, 0, false);

      const moveForward = clampedForward;
      const moveStrafe = -clampedSteer;
      const mag = Math.hypot(moveForward, moveStrafe);

      if (mag > 0.08) {
        const speed = sprintOrBrake ? 10.5 : 5.4;
        const moveAngle = Math.atan2(moveStrafe, moveForward) + this.playerHeading + this.cameraYawOffset;
        // Compute camera-relative direction smoothly
        const camDirX = Math.sin(this.playerHeading + this.cameraYawOffset);
        const camDirZ = Math.cos(this.playerHeading + this.cameraYawOffset);
        const rightX = Math.cos(this.playerHeading + this.cameraYawOffset);
        const rightZ = -Math.sin(this.playerHeading + this.cameraYawOffset);

        const vx = (camDirX * moveForward - rightX * moveStrafe) / Math.max(1, mag);
        const vz = (camDirZ * moveForward - rightZ * moveStrafe) / Math.max(1, mag);

        const nextX = this.playerX + vx * speed * dt;
        const nextZ = this.playerZ + vz * speed * dt;
        const [rx, rz] = this.resolveCollisions(nextX, nextZ, 0.55);
        this.playerX = rx;
        this.playerZ = rz;

        const targetHeading = Math.atan2(vx, vz);
        let diff = targetHeading - this.playerHeading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (!this.isPointerDown && Math.abs(moveForward) > 0.1) {
          this.playerHeading += diff * Math.min(1, dt * 6);
        } else if (Math.abs(moveStrafe) > 0.1) {
          void moveAngle;
        }

        // Limb swing animation
        this.walkCycle += dt * (sprintOrBrake ? 14 : 9);
        const swing = Math.sin(this.walkCycle) * 0.65;
        this.playerRig.leftLeg.rotation.x = swing;
        this.playerRig.rightLeg.rotation.x = -swing;
        this.playerRig.leftArm.rotation.x = -swing * 0.75;
        this.playerRig.rightArm.rotation.x = swing * 0.75;
      } else {
        this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.leftLeg.rotation.x, 0, 10, dt);
        this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.rightLeg.rotation.x, 0, 10, dt);
        this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, 0, 10, dt);
        this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, 0, 10, dt);
      }

      // Jump & ground snap
      const gy = groundHeightAt(this.playerX, this.playerZ);
      if (spaceKey && Math.abs(this.playerY - gy) < 0.05) {
        this.playerVelY = 6.2;
      }
      this.playerVelY -= 18 * dt;
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= gy) {
        this.playerY = gy;
        this.playerVelY = 0;
      }

      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.playerRig.root.rotation.y = this.playerHeading;
    }

    // Move shadow light target with player so shadows stay crisp across entire Haryana map
    const px = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const pz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
    this.sunLight.target.position.set(px, 0, pz);
    if (this.timeOfDay === 'morning') this.sunLight.position.set(px + 85, 65, pz + 65);
    else if (this.timeOfDay === 'noon') this.sunLight.position.set(px + 25, 130, pz + 35);
    else if (this.timeOfDay === 'dusk') this.sunLight.position.set(px - 95, 28, pz - 55);
    else this.sunLight.position.set(px - 40, 85, pz - 40);
  }

  private updateAmbientActors(dt: number, elapsed: number): void {
    // AI Traffic along highway loops
    for (const t of this.traffic) {
      const wp = t.loop[t.wpIndex];
      const dx = wp.x - t.x;
      const dz = wp.z - t.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4.5) {
        t.wpIndex = (t.wpIndex + 1) % t.loop.length;
      } else {
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - t.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        t.heading += diff * Math.min(1, dt * 4.5);

        t.x += Math.sin(t.heading) * t.speed * dt;
        t.z += Math.cos(t.heading) * t.speed * dt;
        t.rig.root.position.set(t.x, groundHeightAt(t.x, t.z), t.z);
        t.rig.root.rotation.y = t.heading;
        for (const w of t.rig.wheels) w.rotation.x += (t.speed / t.rig.wheelRadius) * dt;
      }
    }

    // Wandering NPCs
    for (const p of this.pedestrians) {
      p.phase += dt * 0.55;
      const tx = p.homeX + Math.cos(p.phase) * p.radius;
      const tz = p.homeZ + Math.sin(p.phase * 0.8) * p.radius;
      const dx = tx - p.x;
      const dz = tz - p.z;
      p.heading = Math.atan2(dx, dz);
      p.x += dx * dt * 1.4;
      p.z += dz * dt * 1.4;
      p.rig.root.position.set(p.x, groundHeightAt(p.x, p.z), p.z);
      p.rig.root.rotation.y = p.heading;
      const swing = Math.sin(elapsed * 5 + p.phase) * 0.42;
      p.rig.leftLeg.rotation.x = swing;
      p.rig.rightLeg.rotation.x = -swing;
    }

    // Multiplayer Convoy Racers
    if (this.mode === 'multiplayer' && !this.raceFinished) {
      for (const r of this.racers) {
        const cp = RACE_CHECKPOINTS[r.cpIndex % RACE_CHECKPOINTS.length];
        const dx = cp.x - r.x;
        const dz = cp.z - r.z;
        if (Math.hypot(dx, dz) < 7) {
          r.cpIndex++;
          if (r.cpIndex >= RACE_CHECKPOINTS.length) {
            r.cpIndex = 0;
            r.lap++;
          }
        } else {
          const targetH = Math.atan2(dx, dz);
          let diff = targetH - r.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          r.heading += diff * Math.min(1, dt * 5);
          r.x += Math.sin(r.heading) * r.speed * dt;
          r.z += Math.cos(r.heading) * r.speed * dt;
          r.rig.root.position.set(r.x, groundHeightAt(r.x, r.z), r.z);
          r.rig.root.rotation.y = r.heading;
          for (const w of r.rig.wheels) w.rotation.x += (r.speed / r.rig.wheelRadius) * dt;
        }
      }
    }

    // Monsoon Rain Animation centered around camera
    if (this.weather === 'rain') {
      const pos = this.world.rainSystem.geometry.attributes.position as THREE.BufferAttribute;
      const cx = this.activeVehicle ? this.activeVehicle.x : this.playerX;
      const cz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
      this.world.rainSystem.position.set(cx, 0, cz);
      for (let i = 0; i < pos.count; i++) {
        let ry = pos.getY(i) - dt * 36;
        if (ry < 0) ry = 46;
        pos.setY(i, ry);
      }
      pos.needsUpdate = true;
    }
  }

  private updateCamera(dt: number, elapsed: number): void {
    if (!this.started) {
      // Gentle scenic showcase orbit over Kheri Kalan & NH-48 before player hits Play
      const angle = elapsed * 0.12;
      _camTarget.set(-80 + Math.cos(angle) * 28, 13, 62 + Math.sin(angle) * 28);
      _lookTarget.set(-80, 2.2, 62);
      this.camera.position.lerp(_camTarget, Math.min(1, dt * 3));
      this.camera.lookAt(_lookTarget);
      return;
    }

    const px = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const py = this.activeVehicle ? groundHeightAt(px, this.activeVehicle.z) : this.playerY;
    const pz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
    const heading = this.activeVehicle ? this.activeVehicle.heading : this.playerHeading;

    const totalYaw = heading + this.cameraYawOffset;
    let dist = this.activeVehicle ? 9.5 : 5.4;
    let height = this.activeVehicle ? 3.8 : 2.6;

    if (this.cameraPreset === 'far') {
      dist = this.activeVehicle ? 14.5 : 8.0;
      height = this.activeVehicle ? 5.8 : 3.8;
    } else if (this.cameraPreset === 'hood' && this.activeVehicle) {
      dist = -0.35;
      height = 1.95;
    }

    if (this.cameraPreset === 'hood' && this.activeVehicle) {
      _camTarget.set(
        px + Math.sin(heading) * 0.7,
        py + height,
        pz + Math.cos(heading) * 0.7
      );
      _lookTarget.set(
        px + Math.sin(heading) * 18,
        py + 1.5,
        pz + Math.cos(heading) * 18
      );
    } else {
      const pitchOffset = this.cameraPitchOffset * 5.2;
      _camTarget.set(
        px - Math.sin(totalYaw) * dist,
        py + height + pitchOffset,
        pz - Math.cos(totalYaw) * dist
      );
      _lookTarget.set(
        px + Math.sin(heading) * 2.5,
        py + (this.activeVehicle ? 1.3 : 1.45),
        pz + Math.cos(heading) * 2.5
      );
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTarget.x, 7.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTarget.y, 7.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTarget.z, 7.5, dt);

    // Dynamic speed FOV widening
    const speedNorm = this.activeVehicle ? Math.min(1, Math.abs(this.activeVehicle.speed) / 36) : 0;
    const targetFov = 62 + speedNorm * 13;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(_lookTarget);
  }

  private pushHudSnapshot(): void {
    const px = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const pz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
    const heading = this.activeVehicle ? this.activeVehicle.heading : this.playerHeading;
    const district = getDistrictAt(px, pz);
    const nearVeh = this.activeVehicle ? null : this.findNearestVehicle(6.5);
    const mission = this.getCurrentMissionState();

    const minimapEntities: MinimapEntity[] = [
      ...this.world.landmarkMarkers,
      ...this.vehicles.map((v) => ({
        id: v.id,
        x: v.x,
        z: v.z,
        kind: 'vehicle' as const,
        label: v.name,
      })),
      ...this.traffic.map((t, i) => ({
        id: `tr_${i}`,
        x: t.x,
        z: t.z,
        kind: 'traffic' as const,
      })),
    ];

    if (this.mode === 'multiplayer') {
      this.racers.forEach((r) => {
        minimapEntities.push({ id: r.id, x: r.x, z: r.z, kind: 'racer' });
      });
    }

    const activeSpec = this.activeVehicle
      ? VEHICLE_CATALOG.find((c) => c.type === this.activeVehicle!.type)
      : null;

    let racePos: number | undefined;
    if (this.mode === 'multiplayer') {
      const playerScore = this.raceLap * 10 + this.raceCpIndex;
      let ahead = 0;
      this.racers.forEach((r) => {
        if (r.lap * 10 + r.cpIndex > playerScore) ahead++;
      });
      racePos = 1 + ahead;
    }

    this.onHudUpdate({
      mode: this.mode,
      playerX: px,
      playerZ: pz,
      playerHeading: heading,
      speedKmh: this.activeVehicle ? Math.round(Math.abs(this.activeVehicle.speed) * 3.6) : 0,
      rpmRatio:
        this.activeVehicle && activeSpec
          ? Math.min(1, (Math.abs(this.activeVehicle.speed) * 3.6) / activeSpec.topSpeedKmh)
          : 0,
      inVehicle: Boolean(this.activeVehicle),
      activeVehicleType: this.activeVehicle?.type ?? null,
      activeVehicleName: this.activeVehicle?.name ?? null,
      nearbyVehicleType: nearVeh?.type ?? null,
      nearbyVehicleName: nearVeh?.name ?? null,
      district: district.en,
      districtHi: district.hi,
      cashInr: this.cashInr,
      respectPoints: this.respectPoints,
      mission,
      minimapEntities,
      racePosition: racePos,
      raceLapProgress: this.mode === 'multiplayer' ? `${Math.min(2, this.raceLap)}/2` : undefined,
      fpsEstimate: this.fpsEstimate,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.elapsedTime;

    if (this.started) {
      this.updateGameplay(dt);
      this.updateMissionAndRace(dt);
    }
    this.updateAmbientActors(dt, elapsed);
    this.updateCamera(dt, elapsed);

    this.renderer.render(this.scene, this.camera);

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.8) {
      this.fpsEstimate = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    this.hudTimer += dt;
    if (this.hudTimer >= 0.08) {
      this.hudTimer = 0;
      this.pushHudSnapshot();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('resize', this.boundResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.boundContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.boundContextRestored);

    this.audio.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
