import { useEffect, useRef, useState } from 'react';
import { GarageAndSpecModal } from './components/GarageAndSpecModal';
import { GameHud } from './components/GameHud';
import { HaryanaEngine } from './game/HaryanaEngine';
import {
  CameraPreset,
  GameMode,
  GraphicsQuality,
  HudSnapshot,
  LanguageMode,
  PlayableCharacterId,
  RadioStationId,
  TimeOfDay,
  TouchInputState,
  VehicleCustomization,
  VehicleType,
  WeatherMode,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  mode: 'story',
  playerX: -85,
  playerZ: 62,
  playerHeading: 0,
  speedKmh: 0,
  rpmRatio: 0,
  inVehicle: false,
  activeVehicleType: null,
  activeVehicleName: null,
  nearbyVehicleType: 'suv',
  nearbyVehicleName: 'Garuda 4x4 SUV',
  district: 'Kheri Kalan Village',
  districtHi: 'खेड़ी कलां गाँव',
  cashInr: 5000,
  respectPoints: 50,
  mission: {
    id: 'story_m1',
    title: 'Mission 1: Mitti Te Cyber Tak',
    titleHi: 'मिशन 1: मिट्टी से साइबर तक',
    stageIndex: 0,
    totalStages: 3,
    objectiveText: 'Walk or drive to Kheri Kalan Chaupal (under the Banyan tree) to collect the Sarpanch papers.',
    objectiveTextHi: 'सरपंच के कागज़ लेने खेड़ी कलां चौपाल (बरगद के पेड़ नीचे) जाएँ।',
    targetX: -72,
    targetZ: 72,
    targetRadius: 8,
    completed: false,
    rewardInr: 15000,
  },
  minimapEntities: [],
  fpsEstimate: 60,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HaryanaEngine | null>(null);

  const [started, setStarted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [lang, setLang] = useState<LanguageMode>('en');
  const [radioStation, setRadioStation] = useState<RadioStationId>('ragni');
  const [muted, setMuted] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [garageOpen, setGarageOpen] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const [characterId, setCharacterId] = useState<PlayableCharacterId>('veer');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('suv');
  const [customization, setCustomization] = useState<VehicleCustomization>({
    paintColor: '#16181d',
    accentColor: '#f59e0b',
    lightbar: true,
    liftKit: false,
  });
  const [graphics, setGraphics] = useState<GraphicsQuality>('medium');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [weather, setWeather] = useState<WeatherMode>('clear');
  const [showTouch, setShowTouch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new HaryanaEngine(
      container,
      (snapshot) => setHud(snapshot),
      (lost) => setContextLost(lost)
    );
    engineRef.current = engine;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') setGarageOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = (mode: GameMode) => {
    setStarted(true);
    engineRef.current?.startGame(mode);
    engineRef.current?.setRadioStation(radioStation);
  };

  const handleCycleRadio = () => {
    const order: RadioStationId[] = ['ragni', 'desi_bass', 'cyber_lofi', 'off'];
    const next = order[(order.indexOf(radioStation) + 1) % order.length];
    setRadioStation(next);
    engineRef.current?.setRadioStation(next);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  };

  const handleCycleCamera = () => {
    if (!engineRef.current) return;
    setCameraPreset(engineRef.current.cycleCameraPreset());
  };

  const handleSelectMode = (mode: GameMode) => {
    engineRef.current?.setGameMode(mode);
  };

  const handleTouchUpdate = (partial: Partial<TouchInputState>) => {
    engineRef.current?.setTouchInput(partial);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-6 text-center">
          <div className="max-w-md rounded-xl border border-white/15 bg-zinc-900 p-6">
            <h2 className="font-display text-lg font-bold text-white">Graphics Context Interrupted</h2>
            <p className="text-xs text-zinc-400 mt-2">
              Your browser paused WebGL rendering. Waiting to restore the 3D Haryana scene automatically.
            </p>
          </div>
        </div>
      )}

      <GameHud
        started={started}
        hud={hud}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
        radioStation={radioStation}
        onCycleRadio={handleCycleRadio}
        muted={muted}
        onToggleMute={handleToggleMute}
        cameraPreset={cameraPreset}
        onCycleCamera={handleCycleCamera}
        onSelectMode={handleSelectMode}
        onRestartMission={() => engineRef.current?.restartMission()}
        onOpenGarage={() => setGarageOpen(true)}
        onStartGame={handleStartGame}
        showTouch={showTouch}
        onEnterExitVehicle={() => engineRef.current?.toggleEnterExitVehicle()}
        onHorn={() => engineRef.current?.triggerHorn()}
        onTouchUpdate={handleTouchUpdate}
        hudCollapsed={hudCollapsed}
        onToggleHudCollapsed={() => setHudCollapsed((c) => !c)}
      />

      <GarageAndSpecModal
        open={garageOpen}
        onClose={() => setGarageOpen(false)}
        lang={lang}
        characterId={characterId}
        onSelectCharacter={(id) => {
          setCharacterId(id);
          engineRef.current?.setCharacter(id);
        }}
        selectedVehicle={selectedVehicle}
        customization={customization}
        onSummonVehicle={(type, cust) => {
          setSelectedVehicle(type);
          setCustomization(cust);
          engineRef.current?.summonAndCustomizeVehicle(type, cust);
        }}
        graphics={graphics}
        onGraphicsChange={(q) => {
          setGraphics(q);
          engineRef.current?.setGraphicsQuality(q);
        }}
        timeOfDay={timeOfDay}
        onTimeChange={(t) => {
          setTimeOfDay(t);
          engineRef.current?.setTimeOfDay(t);
        }}
        weather={weather}
        onWeatherChange={(w) => {
          setWeather(w);
          engineRef.current?.setWeather(w);
        }}
        showTouch={showTouch}
        onToggleTouch={setShowTouch}
        onTeleport={(loc) => engineRef.current?.teleportToDistrict(loc)}
      />
    </main>
  );
}
