import {
  Camera,
  ChevronDown,
  ChevronUp,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CameraPreset,
  GameMode,
  HudSnapshot,
  LanguageMode,
  RadioStationId,
  TouchInputState,
  VEHICLE_CATALOG,
} from '../game/types';
import { MiniMap } from './MiniMap';
import { TouchControls } from './TouchControls';

interface GameHudProps {
  started: boolean;
  hud: HudSnapshot;
  lang: LanguageMode;
  onToggleLang: () => void;
  radioStation: RadioStationId;
  onCycleRadio: () => void;
  muted: boolean;
  onToggleMute: () => void;
  cameraPreset: CameraPreset;
  onCycleCamera: () => void;
  onSelectMode: (mode: GameMode) => void;
  onRestartMission: () => void;
  onOpenGarage: () => void;
  onStartGame: (mode: GameMode) => void;
  showTouch: boolean;
  onEnterExitVehicle: () => void;
  onHorn: () => void;
  onTouchUpdate: (partial: Partial<TouchInputState>) => void;
  hudCollapsed: boolean;
  onToggleHudCollapsed: () => void;
}

const RADIO_LABELS: Record<RadioStationId, string> = {
  off: 'Radio Off',
  ragni: 'Ragni Folk FM',
  desi_bass: 'Desi Bass 104.2',
  cyber_lofi: 'Cyber Lo-Fi',
};

export function GameHud({
  started,
  hud,
  lang,
  onToggleLang,
  radioStation,
  onCycleRadio,
  muted,
  onToggleMute,
  cameraPreset,
  onCycleCamera,
  onSelectMode,
  onRestartMission,
  onOpenGarage,
  onStartGame,
  showTouch,
  onEnterExitVehicle,
  onHorn,
  onTouchUpdate,
  hudCollapsed,
  onToggleHudCollapsed,
}: GameHudProps) {
  if (!started) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
        <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-zinc-950/92 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-medium text-amber-400 tracking-wide">
                Haryana Open-World 3D Prototype
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1 text-balance">
                Grand Theft Haryanvi
              </h1>
              <p className="text-sm text-zinc-300 mt-1">
                Apna Area, Apna Rule · Kheri Kalan Village to Gurugram Cyber City
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleLang}
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 whitespace-nowrap shrink-0"
            >
              {lang === 'en' ? 'EN / हिं' : 'हिं / EN'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <button
              type="button"
              onClick={() => onStartGame('story')}
              className="text-left p-4 rounded-lg border border-amber-500/60 bg-amber-500/15 hover:bg-amber-500/25 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-amber-300">Story Mode</span>
                <Play className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                Mission 1: Mitti Te Cyber Tak. Collect papers at Kheri Kalan Chaupal & deliver to Cyber City.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onStartGame('freeroam')}
              className="text-left p-4 rounded-lg border border-white/15 bg-zinc-900/80 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-white">Free Roam</span>
                <Play className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Drive Garuda SUV, Bullet Bike, Sarpanch Tractor & Tuk-Tuk across 5 districts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onStartGame('multiplayer')}
              className="text-left p-4 rounded-lg border border-white/15 bg-zinc-900/80 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-white">Convoy Race</span>
                <Play className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                2-Lap NH-48 Expressway & Cyber City loop race against rival drivers.
              </p>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>WASD / Arrows: Move & Drive</span>
              <span>·</span>
              <span>F: Enter / Exit Vehicle</span>
              <span>·</span>
              <span>Shift: Sprint</span>
              <span>·</span>
              <span>H: Horn</span>
              <span>·</span>
              <span>Drag: Look</span>
            </div>
            <button
              type="button"
              onClick={() => onStartGame('story')}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-sm font-bold transition-colors whitespace-nowrap"
            >
              Play Prototype
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nearVehicleItem = hud.nearbyVehicleType
    ? VEHICLE_CATALOG.find((v) => v.type === hud.nearbyVehicleType)
    : null;

  return (
    <>
      {/* Top Bar: Left MiniMap + Center Objective + Right Compact Controls */}
      {!hudCollapsed && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-20 p-3 sm:p-4 flex items-start justify-between gap-3">
          {/* Top-Left: Minimap + District & Cash */}
          <div className="pointer-events-auto flex items-start gap-3">
            <MiniMap hud={hud} />
            <div className="hidden sm:block rounded-lg border border-white/12 bg-zinc-950/88 px-3.5 py-2.5 max-w-[230px]">
              <div className="text-[11px] font-medium text-amber-400 truncate">
                {lang === 'hi' ? hud.districtHi : hud.district}
              </div>
              <div className="mt-1 flex items-center gap-2.5 text-sm font-mono-tabular font-semibold text-white">
                <span>₹{hud.cashInr.toLocaleString('en-IN')}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-300">{hud.respectPoints} REP</span>
              </div>
              {hud.mode === 'multiplayer' && hud.racePosition && (
                <div className="mt-1 text-xs font-display font-bold text-emerald-400">
                  Pos {hud.racePosition}/3 · Lap {hud.raceLapProgress}
                </div>
              )}
            </div>
          </div>

          {/* Top-Center: Compact Mission Strip */}
          <div className="pointer-events-auto hidden md:flex flex-col items-center max-w-md">
            <div className="rounded-lg border border-white/12 bg-zinc-950/88 px-4 py-2 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-display font-bold text-amber-400">
                <span>{lang === 'hi' ? hud.mission.titleHi : hud.mission.title}</span>
                {hud.mission.completed && hud.mode === 'story' && (
                  <button
                    type="button"
                    onClick={onRestartMission}
                    className="ml-2 inline-flex items-center gap-1 text-[11px] text-zinc-200 hover:text-white underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Replay
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-200 mt-0.5 leading-snug">
                {lang === 'hi' ? hud.mission.objectiveTextHi : hud.mission.objectiveText}
              </p>
              {hud.mission.dialogueSpeaker && hud.mission.dialogueLine && (
                <p className="text-[11px] text-zinc-400 mt-1">
                  <span className="text-amber-300 font-medium">{hud.mission.dialogueSpeaker}:</span>{' '}
                  {lang === 'hi' ? hud.mission.dialogueLineHi : hud.mission.dialogueLine}
                </p>
              )}
            </div>

            {/* Enter Vehicle Prompt */}
            {!hud.inVehicle && nearVehicleItem && (
              <button
                type="button"
                onClick={onEnterExitVehicle}
                className="mt-2 px-3.5 py-1.5 rounded-lg border border-amber-400/50 bg-zinc-950/92 text-xs font-semibold text-amber-300 hover:bg-zinc-900"
              >
                Press F to drive {lang === 'hi' ? nearVehicleItem.nameHi : nearVehicleItem.name}
              </button>
            )}
          </div>

          {/* Top-Right: Mode Switcher + Garage & Spec */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-zinc-950/88 p-1">
              {(['story', 'freeroam', 'multiplayer'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectMode(m)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    hud.mode === m
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
                  }`}
                >
                  {m === 'story' ? 'Story' : m === 'freeroam' ? 'Free Roam' : 'Convoy'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleLang}
                className="h-9 px-2.5 rounded-lg border border-white/12 bg-zinc-950/88 hover:bg-zinc-900 text-xs font-semibold text-zinc-200 whitespace-nowrap"
              >
                {lang === 'en' ? 'EN' : 'हिं'}
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="w-9 h-9 rounded-lg border border-white/12 bg-zinc-950/88 hover:bg-zinc-900 flex items-center justify-center text-zinc-200"
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label="Toggle audio mute"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onOpenGarage}
                className="h-9 px-3 rounded-lg border border-amber-500/40 bg-zinc-950/90 hover:bg-zinc-900 text-xs font-semibold text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Garage & Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Mission Strip (below top bar on small viewports) */}
      {!hudCollapsed && (
        <div className="pointer-events-none fixed top-[168px] left-3 right-3 z-20 md:hidden">
          <div className="rounded-lg border border-white/12 bg-zinc-950/88 px-3 py-2 text-xs">
            <div className="flex items-center justify-between text-amber-400 font-semibold">
              <span className="truncate">{lang === 'hi' ? hud.districtHi : hud.district}</span>
              <span className="font-mono-tabular text-white ml-2">₹{hud.cashInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-zinc-200 mt-0.5 line-clamp-2">
              {lang === 'hi' ? hud.mission.objectiveTextHi : hud.mission.objectiveText}
            </div>
          </div>
        </div>
      )}

      {/* Touch Controls Overlay (when enabled) */}
      {showTouch && !hudCollapsed && (
        <TouchControls
          inVehicle={hud.inVehicle}
          canEnterVehicle={Boolean(hud.nearbyVehicleType)}
          onTouchUpdate={onTouchUpdate}
          onEnterExit={onEnterExitVehicle}
          onHorn={onHorn}
        />
      )}

      {/* Unified Collapsible Bottom Control Dock (Centered, Never Occludes Center Viewport) */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-200 ${
          hudCollapsed ? 'bottom-2 translate-y-[calc(100%-34px)]' : showTouch ? 'bottom-36 sm:bottom-4' : 'bottom-4'
        }`}
      >
        <button
          type="button"
          onClick={onToggleHudCollapsed}
          className="px-3 py-1 rounded-t-lg border border-b-0 border-white/15 bg-zinc-950/90 text-[11px] font-medium text-zinc-300 hover:text-white flex items-center gap-1"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show HUD
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide HUD
            </>
          )}
        </button>

        <div className="rounded-xl border border-white/15 bg-zinc-950/90 px-4 py-2.5 flex items-center gap-4 shadow-xl">
          {/* Speedometer */}
          <div className="flex items-baseline gap-1.5 min-w-[76px]">
            <span className="font-display text-2xl font-bold text-white tabular-nums">
              {hud.inVehicle ? hud.speedKmh : '—'}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">km/h</span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Vehicle Status / Action */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200 whitespace-nowrap">
              {hud.inVehicle ? hud.activeVehicleName : 'On Foot'}
            </span>
            {(hud.inVehicle || hud.nearbyVehicleName) && (
              <button
                type="button"
                onClick={onEnterExitVehicle}
                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold whitespace-nowrap"
              >
                {hud.inVehicle ? 'Exit (F)' : `Drive ${hud.nearbyVehicleName} (F)`}
              </button>
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-white/10" />

          {/* Radio & Camera Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onCycleRadio}
              className="px-2.5 py-1.5 rounded-md border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              {RADIO_LABELS[radioStation]}
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              className="px-2.5 py-1.5 rounded-md border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-1.5 whitespace-nowrap capitalize"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              {cameraPreset}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
