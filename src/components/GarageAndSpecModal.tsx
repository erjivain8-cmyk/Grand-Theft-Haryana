import { useState } from 'react';
import { Car, Check, Compass, Cpu, MapPin, Sliders, Users, X } from 'lucide-react';
import {
  GraphicsQuality,
  LanguageMode,
  PAINT_SWATCHES,
  PLAYABLE_CHARACTERS,
  PlayableCharacterId,
  TimeOfDay,
  VEHICLE_CATALOG,
  VehicleCustomization,
  VehicleType,
  WeatherMode,
} from '../game/types';

interface GarageAndSpecModalProps {
  open: boolean;
  onClose: () => void;
  lang: LanguageMode;
  characterId: PlayableCharacterId;
  onSelectCharacter: (id: PlayableCharacterId) => void;
  selectedVehicle: VehicleType;
  customization: VehicleCustomization;
  onSummonVehicle: (type: VehicleType, cust: VehicleCustomization) => void;
  graphics: GraphicsQuality;
  onGraphicsChange: (q: GraphicsQuality) => void;
  timeOfDay: TimeOfDay;
  onTimeChange: (t: TimeOfDay) => void;
  weather: WeatherMode;
  onWeatherChange: (w: WeatherMode) => void;
  showTouch: boolean;
  onToggleTouch: (v: boolean) => void;
  onTeleport: (loc: 'village' | 'dhaba' | 'cyber' | 'sarovar' | 'morni') => void;
}

const STORAGE_BUDGET = [
  { cat: 'Map and terrain', mb: 650 },
  { cat: 'Buildings and environment', mb: 900 },
  { cat: 'Vehicles', mb: 450 },
  { cat: 'Characters and animations', mb: 400 },
  { cat: 'Textures', mb: 800 },
  { cat: 'Audio and music', mb: 300 },
  { cat: 'Missions and UI', mb: 250 },
  { cat: 'Effects and lighting', mb: 250 },
  { cat: 'Shared systems', mb: 150 },
  { cat: 'Additional reserve', mb: 650 },
];

const HARYANA_REGIONS = [
  { name: 'Gurugram', desc: 'Cyber City, malls & expressways', inPrototype: true },
  { name: 'Kheri Kalan Village', desc: 'Chaupal, brick havelis & mustard farms', inPrototype: true },
  { name: 'Kurukshetra', desc: 'Brahma Sarovar inspired ghat & pavilion', inPrototype: true },
  { name: 'Morni Hills', desc: 'Winding mountain road & ridge', inPrototype: true },
  { name: 'Sonipat / NH-48', desc: 'Highways, Tau Da Dhaba & villages', inPrototype: true },
  { name: 'Faridabad', desc: 'Industrial zones & residential sectors', inPrototype: false },
  { name: 'Rohtak', desc: 'Markets & college campuses', inPrototype: false },
  { name: 'Panipat', desc: 'Historical & textile industrial belt', inPrototype: false },
  { name: 'Hisar', desc: 'Agricultural grain markets', inPrototype: false },
  { name: 'Karnal', desc: 'Farms & highway dhabas', inPrototype: false },
  { name: 'Panchkula', desc: 'Planned sectors', inPrototype: false },
  { name: 'Rewari & Jhajjar', desc: 'Traditional markets & rural plains', inPrototype: false },
];

export function GarageAndSpecModal({
  open,
  onClose,
  lang,
  characterId,
  onSelectCharacter,
  selectedVehicle,
  customization,
  onSummonVehicle,
  graphics,
  onGraphicsChange,
  timeOfDay,
  onTimeChange,
  weather,
  onWeatherChange,
  showTouch,
  onToggleTouch,
  onTeleport,
}: GarageAndSpecModalProps) {
  const [tab, setTab] = useState<'garage' | 'world' | 'spec'>('garage');
  const [draftVehicle, setDraftVehicle] = useState<VehicleType>(selectedVehicle);
  const [draftCust, setDraftCust] = useState<VehicleCustomization>(customization);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-white/15 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-white">
              {lang === 'hi' ? 'जीटीएच गैराज एवं सेटिंग्स' : 'GTH Garage, Travel & Specification'}
            </h2>
            <p className="text-xs text-zinc-400">
              Grand Theft Haryanvi · Apna Area, Apna Rule
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-300"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setTab('garage')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === 'garage' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Vehicles & Characters
          </button>
          <button
            type="button"
            onClick={() => setTab('world')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === 'world' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            World, Fast Travel & Graphics
          </button>
          <button
            type="button"
            onClick={() => setTab('spec')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === 'spec' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Android Spec & Map Blueprint
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {tab === 'garage' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Select & Summon Vehicle</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VEHICLE_CATALOG.map((v) => {
                    const active = draftVehicle === v.type;
                    return (
                      <button
                        key={v.type}
                        type="button"
                        onClick={() => {
                          setDraftVehicle(v.type);
                          setDraftCust((prev) => ({ ...prev, paintColor: v.defaultColor }));
                        }}
                        className={`text-left p-3.5 rounded-lg border transition-colors ${
                          active
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-white/10 bg-zinc-900/70 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-white">
                            {lang === 'hi' ? v.nameHi : v.name}
                          </span>
                          <span className="text-xs text-zinc-400">{v.category}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400 font-mono-tabular">
                          <span>Top {v.topSpeedKmh} km/h</span>
                          <span>·</span>
                          <span>Handling {v.handling.toFixed(1)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-white/10">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2.5">Paint Finish</h4>
                  <div className="flex flex-wrap gap-2">
                    {PAINT_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() => setDraftCust((c) => ({ ...c, paintColor: sw.hex }))}
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-transform ${
                          draftCust.paintColor === sw.hex
                            ? 'border-amber-400 scale-105'
                            : 'border-white/20'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                        title={sw.name}
                      >
                        {draftCust.paintColor === sw.hex && (
                          <Check className="w-4 h-4 text-amber-400 drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2.5">Upgrades</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraftCust((c) => ({ ...c, lightbar: !c.lightbar }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                        draftCust.lightbar
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-white/10 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      Roof LED Lightbar: {draftCust.lightbar ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftCust((c) => ({ ...c, liftKit: !c.liftKit }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                        draftCust.liftKit
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-white/10 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      4x4 Lift Kit: {draftCust.liftKit ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSummonVehicle(draftVehicle, draftCust);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-sm font-bold transition-colors"
                >
                  Apply & Drive Now
                </button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Playable Characters (3 Originals)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLAYABLE_CHARACTERS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onSelectCharacter(ch.id)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        characterId === ch.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-white/10 bg-zinc-900/70 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="font-display font-bold text-sm text-white">
                        {lang === 'hi' ? ch.nameHi : ch.name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {lang === 'hi' ? ch.roleHi : ch.role}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">{ch.hometown}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'world' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-2.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Fast Travel Across Haryana Prototype Map
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'village' as const, label: 'Kheri Kalan Village' },
                    { id: 'dhaba' as const, label: 'Tau Da Dhaba · NH-48' },
                    { id: 'cyber' as const, label: 'Gurugram Cyber City' },
                    { id: 'sarovar' as const, label: 'Kurukshetra Sarovar' },
                    { id: 'morni' as const, label: 'Morni Hills Ridge' },
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onTeleport(loc.id);
                        onClose();
                      }}
                      className="px-3 py-2.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-left text-xs font-medium text-zinc-100 flex items-center gap-2"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">Time of Day</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['morning', 'noon', 'dusk', 'night'] as TimeOfDay[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onTimeChange(t)}
                        className={`px-2.5 py-2 rounded-lg text-xs capitalize border ${
                          timeOfDay === t
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                            : 'border-white/10 bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">Weather</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(['clear', 'dust', 'rain'] as WeatherMode[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onWeatherChange(w)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs capitalize border ${
                          weather === w
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                            : 'border-white/10 bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {w === 'dust' ? 'Haryana Dust Haze' : w === 'rain' ? 'Monsoon Rain' : 'Clear Sky'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">Graphics Preset</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onGraphicsChange(q)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs capitalize border ${
                          graphics === q
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                            : 'border-white/10 bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {q} (Target {q === 'low' ? '30' : '60'} FPS)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-200">On-Screen Mobile Touch Controls</div>
                  <div className="text-xs text-zinc-400">Show Android virtual thumbstick and gas/brake/horn buttons</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleTouch(!showTouch)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                    showTouch
                      ? 'border-amber-500 bg-amber-500 text-zinc-950'
                      : 'border-white/15 bg-zinc-900 text-zinc-300'
                  }`}
                >
                  {showTouch ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {tab === 'spec' && (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div className="text-zinc-400">Primary Target</div>
                  <div className="font-display font-bold text-sm text-white mt-0.5">Android (Unity URP / C#)</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div className="text-zinc-400">Installed Size Cap</div>
                  <div className="font-display font-bold text-sm text-amber-400 mt-0.5">4,800 MB (4.8 GB)</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div className="text-zinc-400">Camera & Modes</div>
                  <div className="font-display font-bold text-sm text-white mt-0.5">3rd-Person · 3 Modes</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div className="text-zinc-400">Languages</div>
                  <div className="font-display font-bold text-sm text-white mt-0.5">Hindi · Haryanvi · EN</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">Haryana Open-World Map Regions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {HARYANA_REGIONS.map((r) => (
                    <div key={r.name} className="p-2.5 rounded-lg bg-zinc-900/70 border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100">{r.name}</span>
                        <span className={r.inPrototype ? 'text-emerald-400' : 'text-zinc-500'}>
                          {r.inPrototype ? 'Playable Now' : 'Roadmap'}
                        </span>
                      </div>
                      <div className="text-zinc-400 mt-0.5">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">Android 4,800 MB Storage Budget</h4>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-400 border-b border-white/10">
                        <th className="px-3 py-2 font-medium">Asset Category</th>
                        <th className="px-3 py-2 font-medium text-right">Budget</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {STORAGE_BUDGET.map((row) => (
                        <tr key={row.cat} className="bg-zinc-950/60">
                          <td className="px-3 py-1.5 text-zinc-200">{row.cat}</td>
                          <td className="px-3 py-1.5 text-right font-mono-tabular text-zinc-300">
                            {row.mb} MB
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-900 font-semibold text-amber-400">
                        <td className="px-3 py-2">Total Installed Target</td>
                        <td className="px-3 py-2 text-right font-mono-tabular">4,800 MB</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
