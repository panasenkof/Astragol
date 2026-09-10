import StarField from "./StarField";
import { NeonButton, Panel, SectionTitle, Slider, Toggle } from "./ui";
import { audio } from "@/game/audio";
import { AI_DIFFICULTY_OPTIONS, type Settings } from "@/game/types";

const P1_PRESETS = ["#38bdf8", "#22d3ee", "#a78bfa", "#34d399", "#facc15"];
const P2_PRESETS = ["#fb5a4b", "#f472b6", "#f97316", "#ef4444", "#e879f9"];

function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (c: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="h-9 w-9 rounded-full border-2 transition"
            style={{
              background: c,
              borderColor: value.toLowerCase() === c ? "#fff" : "transparent",
              boxShadow:
                value.toLowerCase() === c ? `0 0 16px -1px ${c}` : "none",
            }}
          />
        ))}
        <label
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/30"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

export default function SettingsScreen({
  settings,
  onChange,
  onBack,
  onResetDefaults,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onResetDefaults: () => void;
}) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <StarField />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-5 px-5 pt-[max(2rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(2rem,calc(env(safe-area-inset-bottom)+5.5rem))]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-[0.2em] text-cyan-100">
            SETTINGS
          </h1>
          <NeonButton variant="soft" onClick={onBack}>
            ← Back
          </NeonButton>
        </div>

        <Panel className="p-6">
          <SectionTitle>Audio</SectionTitle>
          <div className="grid gap-5">
            <Slider
              label="Music volume"
              value={settings.musicMuted ? 0 : settings.musicVolume}
              min={0}
              max={1}
              disabled={settings.musicMuted}
              display={
                settings.musicMuted
                  ? "muted"
                  : `${Math.round(settings.musicVolume * 100)}%`
              }
              accent="#a78bfa"
              onChange={(v) => onChange({ musicVolume: v })}
            />
            <Toggle
              label="Mute cosmic soundtrack"
              checked={settings.musicMuted}
              accent="#a78bfa"
              onChange={(v) => onChange({ musicMuted: v })}
            />
            <Slider
              label="Sound effects volume"
              value={settings.sfxMuted ? 0 : settings.sfxVolume}
              min={0}
              max={1}
              disabled={settings.sfxMuted}
              display={
                settings.sfxMuted
                  ? "muted"
                  : `${Math.round(settings.sfxVolume * 100)}%`
              }
              onChange={(v) => onChange({ sfxVolume: v })}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Toggle
                  label="Mute sound effects"
                  checked={settings.sfxMuted}
                  onChange={(v) => onChange({ sfxMuted: v })}
                />
              </div>
              <NeonButton
                variant="soft"
                disabled={settings.sfxMuted}
                onClick={() => {
                  audio.resume();
                  audio.goal();
                }}
              >
                ♪ Test
              </NeonButton>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>CPU opponent</SectionTitle>
          <p className="mb-4 text-sm text-slate-400">
            Used in 1 Player matches. Harder opponents turn faster, aim
            cleaner, and cover their own gate.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {AI_DIFFICULTY_OPTIONS.map((opt) => {
              const active = settings.aiDifficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange({ aiDifficulty: opt.id });
                    audio.click();
                  }}
                  className="rounded-2xl border px-3 py-3 text-center transition"
                  style={{
                    borderColor: active
                      ? "rgba(56,189,248,0.7)"
                      : "rgba(255,255,255,0.1)",
                    background: active
                      ? "rgba(56,189,248,0.16)"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: active
                      ? "0 0 22px -6px rgba(56,189,248,0.7)"
                      : "none",
                  }}
                >
                  <span
                    className={`block text-sm font-bold tracking-wide ${
                      active ? "text-cyan-100" : "text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {
              AI_DIFFICULTY_OPTIONS.find(
                (o) => o.id === settings.aiDifficulty
              )?.blurb
            }
          </p>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>Physics</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Slider
              label="Ship weight"
              value={settings.shipWeight}
              min={1}
              max={6}
              step={0.1}
              display={`${settings.shipWeight.toFixed(1)} t`}
              onChange={(v) => onChange({ shipWeight: v })}
            />
            <Slider
              label="Ball weight"
              value={settings.ballWeight}
              min={0.3}
              max={4}
              step={0.1}
              display={`${settings.ballWeight.toFixed(1)} t`}
              accent="#facc15"
              onChange={(v) => onChange({ ballWeight: v })}
            />
            <div className="sm:col-span-2">
              <Slider
                label="Collision elasticity (bounciness)"
                value={settings.restitution}
                min={0.4}
                max={1}
                step={0.01}
                display={`${Math.round(settings.restitution * 100)}%`}
                accent="#34d399"
                onChange={(v) => onChange({ restitution: v })}
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Heavier ships shove the ball harder. Higher elasticity makes every
            bounce and deflection snappier.
          </p>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>Controls</SectionTitle>
          <Toggle
            label="Disable the 'down' key (thrust only in arrow direction)"
            checked={settings.downDisabled}
            onChange={(v) => onChange({ downDisabled: v })}
          />
          <p className="mt-3 text-xs text-slate-500">
            When enabled, pressing ↓ / S does nothing — handy if you keep
            back-thrusting by accident.
          </p>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>Team colours</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <ColorPicker
              label="Player 1 (left) glow"
              value={settings.p1Color}
              presets={P1_PRESETS}
              onChange={(c) => onChange({ p1Color: c })}
            />
            <ColorPicker
              label="Player 2 (right) glow"
              value={settings.p2Color}
              presets={P2_PRESETS}
              onChange={(c) => onChange({ p2Color: c })}
            />
          </div>
        </Panel>

        <div className="flex justify-between pb-4">
          <NeonButton
            variant="ghost"
            onClick={() => {
              onResetDefaults();
              audio.click();
            }}
          >
            ↺ Reset to defaults
          </NeonButton>
          <NeonButton onClick={onBack}>Done</NeonButton>
        </div>
      </div>
    </div>
  );
}
