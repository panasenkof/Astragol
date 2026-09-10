import { useCallback, useEffect, useState } from "react";
import {
  FULLSCREEN_EVENTS,
  isFullscreenActive,
  isFullscreenSupported,
  toggleAppFullscreen,
} from "@/utils/fullscreen";

export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(isFullscreenSupported());
    const sync = () => setActive(isFullscreenActive());
    sync();
    for (const event of FULLSCREEN_EVENTS) {
      document.addEventListener(event, sync);
    }
    return () => {
      for (const event of FULLSCREEN_EVENTS) {
        document.removeEventListener(event, sync);
      }
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      await toggleAppFullscreen();
    } catch {
      /* user dismissed the prompt, or the browser blocked it */
    }
  }, []);

  return { supported, active, toggle };
}
