import { en, type Messages } from "./en";
import { zh } from "./zh";

export type Locale = "zh" | "en";

export const STORAGE_KEY = "openmausbot.locale";
export const catalogs: Record<Locale, Messages> = { zh, en };

export function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    /* private mode / tests */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "zh").toLowerCase();
  if (nav.startsWith("en")) return "en";
  return "zh";
}

export function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function lookup(messages: Messages, key: string): string | undefined {
  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? `{${name}}` : String(vars[name]),
  );
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = lookup(catalogs[locale], key) ?? lookup(en, key) ?? key;
  return interpolate(raw, vars);
}

export function applyDocumentLang(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}
