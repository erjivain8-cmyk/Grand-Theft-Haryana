export type GameMode = 'story' | 'freeroam' | 'multiplayer';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type TimeOfDay = 'morning' | 'noon' | 'dusk' | 'night';
export type WeatherMode = 'clear' | 'dust' | 'rain';
export type LanguageMode = 'en' | 'hi';
export type PlayableCharacterId = 'veer' | 'ritu' | 'baljeet';
export type VehicleType = 'suv' | 'bike' | 'tractor' | 'auto';
export type RadioStationId = 'off' | 'ragni' | 'desi_bass' | 'cyber_lofi';
export type CameraPreset = 'chase' | 'far' | 'hood';

export interface VehicleCustomization {
  paintColor: string;
  accentColor: string;
  lightbar: boolean;
  liftKit: boolean;
}

export interface CharacterInfo {
  id: PlayableCharacterId;
  name: string;
  nameHi: string;
  role: string;
  roleHi: string;
  hometown: string;
}

export interface VehicleCatalogItem {
  type: VehicleType;
  name: string;
  nameHi: string;
  category: string;
  topSpeedKmh: number;
  acceleration: number;
  handling: number;
  defaultColor: string;
}

export interface MinimapEntity {
  id: string;
  x: number;
  z: number;
  kind: 'vehicle' | 'traffic' | 'npc' | 'racer' | 'landmark';
  label?: string;
}

export interface MissionState {
  id: string;
  title: string;
  titleHi: string;
  stageIndex: number;
  totalStages: number;
  objectiveText: string;
  objectiveTextHi: string;
  targetX: number | null;
  targetZ: number | null;
  targetRadius: number;
  completed: boolean;
  rewardInr: number;
  dialogueSpeaker?: string;
  dialogueLine?: string;
  dialogueLineHi?: string;
}

export interface HudSnapshot {
  mode: GameMode;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  speedKmh: number;
  rpmRatio: number;
  inVehicle: boolean;
  activeVehicleType: VehicleType | null;
  activeVehicleName: string | null;
  nearbyVehicleType: VehicleType | null;
  nearbyVehicleName: string | null;
  district: string;
  districtHi: string;
  cashInr: number;
  respectPoints: number;
  mission: MissionState;
  minimapEntities: MinimapEntity[];
  racePosition?: number;
  raceLapProgress?: string;
  fpsEstimate: number;
}

export interface TouchInputState {
  steerX: number; // -1 to 1
  moveY: number;  // -1 to 1
  sprint: boolean;
  brake: boolean;
  horn: boolean;
}

export const PLAYABLE_CHARACTERS: CharacterInfo[] = [
  {
    id: 'veer',
    name: 'Veer Hooda',
    nameHi: 'वीर हुड्डा',
    role: 'Rohtak Transporter & Driver',
    roleHi: 'रोहतक ट्रांसपोर्टर एवं ड्राइवर',
    hometown: 'Kheri Kalan',
  },
  {
    id: 'ritu',
    name: 'Ritu Dahiya',
    nameHi: 'ऋतु दहिया',
    role: 'Gurugram Cyber Fixer',
    roleHi: 'गुरुग्राम साइबर फिक्सर',
    hometown: 'Gurugram Sector 29',
  },
  {
    id: 'baljeet',
    name: 'Tau Baljeet Sangwan',
    nameHi: 'ताऊ बलजीत सांगवान',
    role: 'Sarpanch & Logistics Veteran',
    roleHi: 'सरपंच एवं गाँव मुखिया',
    hometown: 'Charkhi Dadri / Kheri',
  },
];

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  {
    type: 'suv',
    name: 'Garuda 4x4 SUV',
    nameHi: 'गरुड़ 4x4 एसयूवी',
    category: 'Heavy SUV',
    topSpeedKmh: 145,
    acceleration: 28,
    handling: 2.3,
    defaultColor: '#16181d',
  },
  {
    type: 'bike',
    name: 'Sher-e-Haryana 500',
    nameHi: 'शेर-ए-हरियाणा 500 बुलेट',
    category: 'Cruiser Bike',
    topSpeedKmh: 130,
    acceleration: 34,
    handling: 3.1,
    defaultColor: '#1e3a2f',
  },
  {
    type: 'tractor',
    name: 'Sarpanch 750 Tractor',
    nameHi: 'सरपंच 750 ट्रैक्टर',
    category: 'Farm Tractor',
    topSpeedKmh: 68,
    acceleration: 18,
    handling: 1.9,
    defaultColor: '#c83e2b',
  },
  {
    type: 'auto',
    name: 'Haryana Tuk-Tuk',
    nameHi: 'हरियाणा ऑटो रिक्शा',
    category: 'Auto-Rickshaw',
    topSpeedKmh: 84,
    acceleration: 24,
    handling: 2.9,
    defaultColor: '#eab308',
  },
];

export const PAINT_SWATCHES = [
  { name: 'Obsidian Black', hex: '#16181d' },
  { name: 'Sarpanch White', hex: '#e5e7eb' },
  { name: 'Mustard Gold', hex: '#d97706' },
  { name: 'Tractor Red', hex: '#c83e2b' },
  { name: 'Army Olive', hex: '#365314' },
  { name: 'Cyber Cobalt', hex: '#1d4ed8' },
];
