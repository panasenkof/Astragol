import { useCallback, useEffect, useState } from "react";
import StartScreen from "@/components/StartScreen";
import SettingsScreen from "@/components/SettingsScreen";
import GameScreen from "@/components/GameScreen";
import InstallHint from "@/components/InstallHint";
import { audio } from "@/game/audio";
import { loadScores, loadSettings, saveSettings } from "@/game/storage";
import { useFullscreen } from "@/hooks/useFullscreen";
import {
  DEFAULT_SETTINGS,
  type GameMode,
  type ScoreEntry,
  type Settings,
} from "@/game/types";

type Screen = "start" | "settings" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<GameMode>("1p");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const fullscreen = useFullscreen();

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // keep the audio engine in sync with settings
  useEffect(() => {
    audio.setMusicVolume(settings.musicVolume);
    audio.setMusicMuted(settings.musicMuted);
    audio.setSfxVolume(settings.sfxVolume);
    audio.setSfxMuted(settings.sfxMuted);
    if (settings.musicMuted) audio.stopMusic();
    else if (audio.ready) audio.startMusic();
  }, [settings]);

  // unlock the AudioContext on the first user gesture (browser requirement)
  useEffect(() => {
    const unlock = () => {
      audio.resume();
      if (!settings.musicMuted) audio.startMusic();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyF") return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!fullscreen.supported) return;
      e.preventDefault();
      void fullscreen.toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen.supported, fullscreen.toggle]);

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const refreshScores = useCallback(() => {
    setScores(loadScores());
  }, []);

  const startGame = useCallback((m: GameMode) => {
    audio.resume();
    if (!settings.musicMuted) audio.startMusic();
    setMode(m);
    setScreen("game");
  }, [settings.musicMuted]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#04030d] text-slate-100 antialiased">
      {screen === "start" && (
        <StartScreen
          onStart={startGame}
          onSettings={() => {
            audio.click();
            setScreen("settings");
          }}
          scores={scores}
          aiDifficulty={settings.aiDifficulty}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={patchSettings}
          onBack={() => setScreen("start")}
          onResetDefaults={() => {
            setSettings({ ...DEFAULT_SETTINGS });
            audio.setMusicMuted(DEFAULT_SETTINGS.musicMuted);
            audio.setSfxMuted(DEFAULT_SETTINGS.sfxMuted);
          }}
        />
      )}
      {screen === "game" && (
        <GameScreen
          settings={settings}
          mode={mode}
          onExit={() => setScreen("start")}
          onScoresChanged={refreshScores}
        />
      )}
      {screen !== "game" && <InstallHint />}
    </div>
  );
}
