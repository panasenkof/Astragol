import {
  detectDeviceLocale,
  isLocaleSetting,
  mapLanguageTag,
  resolveLocale,
} from "./locales";
import { interpolate, translations } from "./messages";

const cases: [string, ReturnType<typeof mapLanguageTag>][] = [
  ["en-US", "en"],
  ["zh-CN", "zh"],
  ["zh-TW", "zh"],
  ["hi-IN", "hi"],
  ["es-MX", "es"],
  ["fr-CA", "fr"],
  ["ar-SA", "ar"],
  ["ru-RU", "ru"],
  ["pt-BR", null],
  ["ja-JP", null],
  ["EN", "en"],
];

for (const [tag, expected] of cases) {
  const got = mapLanguageTag(tag);
  if (got !== expected) {
    throw new Error(`mapLanguageTag(${tag}): expected ${expected}, got ${got}`);
  }
}

if (detectDeviceLocale(["ja-JP", "ru-RU"]) !== "ru") {
  throw new Error("detectDeviceLocale should skip unsupported tags");
}
if (detectDeviceLocale(["pt-BR"]) !== "en") {
  throw new Error("detectDeviceLocale should fall back to English");
}
if (resolveLocale("auto") !== detectDeviceLocale()) {
  throw new Error("resolveLocale(auto) should match the device locale");
}
if (resolveLocale("zh") !== "zh") {
  throw new Error("resolveLocale should honour a locked locale");
}
if (!isLocaleSetting("auto") || !isLocaleSetting("ru") || isLocaleSetting("de")) {
  throw new Error("isLocaleSetting rejected a valid setting");
}
if (interpolate("vs CPU · {difficulty}", { difficulty: "Hard" }) !== "vs CPU · Hard") {
  throw new Error("interpolate failed");
}

const removedKeys = ["disableDown", "disableDownHint", "controls"];
for (const dict of Object.values(translations)) {
  for (const key of removedKeys) {
    if (key in dict) {
      throw new Error(`removed i18n key still present: ${key}`);
    }
  }
}

console.log("i18n locale checks passed");
