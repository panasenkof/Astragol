import StarField from "./StarField";
import FullscreenButton from "./FullscreenButton";
import LanguageSelect from "./LanguageSelect";
import { NeonButton, Panel, SectionTitle, Slider, Toggle, FitText } from "./ui";
import { audio } from "@/game/audio";
import { AI_DIFFICULTY_OPTIONS, type Settings } from "@/game/types";
import {
  AI_BLURB_KEYS,
  AI_LABEL_KEYS,
  localeUsesWideTracking,
  useI18n,
  type LocaleSetting,
} from "@/i18n";

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
  const { t, locale, rtl } = useI18n();
  const titleTrack = localeUsesWideTracking(locale)
    ? "tracking-[0.2em]"
    : "tracking-normal";

  const setLocale = (next: LocaleSetting) => {
    onChange({ locale: next });
    audio.click();
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <StarField />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-5 px-5 pt-[max(2rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(2rem,calc(env(safe-area-inset-bottom)+5.5rem))]">
        <div className="flex items-center justify-between gap-3">
          <h1
            className={`min-w-0 text-2xl font-black text-cyan-100 ${titleTrack}`}
          >
            {t("settingsTitle")}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <FullscreenButton compact />
            <NeonButton variant="soft" className="px-3 sm:px-5" onClick={onBack}>
              {rtl ? "→" : "←"} {t("back")}
            </NeonButton>
          </div>
        </div>

        <Panel className="relative z-20 overflow-visible p-6">
          <SectionTitle>{t("language")}</SectionTitle>
          <p className="mb-4 text-sm text-slate-400">{t("languageHint")}</p>
          <LanguageSelect value={settings.locale} onChange={setLocale} />
        </Panel>

        <Panel className="p-6">
          <SectionTitle>{t("audio")}</SectionTitle>
          <div className="grid gap-5">
            <Slider
              label={t("musicVolume")}
              value={settings.musicMuted ? 0 : settings.musicVolume}
              min={0}
              max={1}
              disabled={settings.musicMuted}
              display={
                settings.musicMuted
                  ? t("muted")
                  : `${Math.round(settings.musicVolume * 100)}%`
              }
              accent="#a78bfa"
              onChange={(v) => onChange({ musicVolume: v })}
            />
            <Toggle
              label={t("muteMusic")}
              checked={settings.musicMuted}
              accent="#a78bfa"
              onChange={(v) => onChange({ musicMuted: v })}
            />
            <Slider
              label={t("sfxVolume")}
              value={settings.sfxMuted ? 0 : settings.sfxVolume}
              min={0}
              max={1}
              disabled={settings.sfxMuted}
              display={
                settings.sfxMuted
                  ? t("muted")
                  : `${Math.round(settings.sfxVolume * 100)}%`
              }
              onChange={(v) => onChange({ sfxVolume: v })}
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <Toggle
                  label={t("muteSfx")}
                  checked={settings.sfxMuted}
                  onChange={(v) => onChange({ sfxMuted: v })}
                />
              </div>
              <NeonButton
                variant="soft"
                className="shrink-0"
                disabled={settings.sfxMuted}
                onClick={() => {
                  audio.resume();
                  audio.goal();
                }}
              >
                ♪ {t("testSound")}
              </NeonButton>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>{t("cpuOpponent")}</SectionTitle>
          <p className="mb-4 text-sm text-slate-400">{t("cpuDesc")}</p>
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
                  className="@container min-w-0 rounded-2xl border px-1.5 py-3 text-center transition sm:px-2.5"
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
                  <FitText
                    className={active ? "text-cyan-100" : "text-slate-300"}
                  >
                    {t(AI_LABEL_KEYS[opt.id])}
                  </FitText>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {t(AI_BLURB_KEYS[settings.aiDifficulty])}
          </p>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>{t("physics")}</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Slider
              label={t("shipWeight")}
              value={settings.shipWeight}
              min={1}
              max={6}
              step={0.1}
              display={t("weightTonnes", { n: settings.shipWeight.toFixed(1) })}
              onChange={(v) => onChange({ shipWeight: v })}
            />
            <Slider
              label={t("ballWeight")}
              value={settings.ballWeight}
              min={0.3}
              max={4}
              step={0.1}
              display={t("weightTonnes", { n: settings.ballWeight.toFixed(1) })}
              accent="#facc15"
              onChange={(v) => onChange({ ballWeight: v })}
            />
            <div className="sm:col-span-2">
              <Slider
                label={t("elasticity")}
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
          <p className="mt-4 text-xs text-slate-500">{t("physicsHint")}</p>
        </Panel>

        <Panel className="p-6">
          <SectionTitle>{t("teamColours")}</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <ColorPicker
              label={t("p1Glow")}
              value={settings.p1Color}
              presets={P1_PRESETS}
              onChange={(c) => onChange({ p1Color: c })}
            />
            <ColorPicker
              label={t("p2Glow")}
              value={settings.p2Color}
              presets={P2_PRESETS}
              onChange={(c) => onChange({ p2Color: c })}
            />
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <NeonButton
            variant="ghost"
            onClick={() => {
              onResetDefaults();
              audio.click();
            }}
          >
            ↺ {t("resetDefaults")}
          </NeonButton>
          <NeonButton onClick={onBack}>{t("done")}</NeonButton>
        </div>
      </div>
    </div>
  );
}
