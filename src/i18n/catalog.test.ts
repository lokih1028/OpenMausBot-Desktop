import { describe, expect, it } from "vitest";
import { interpolate, translate } from "./catalog";
import { en, type Messages } from "./en";
import { zh } from "./zh";

/** Walk every leaf of the English tree and report the dot-path. */
function leafPaths(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafPaths(value, path);
  });
}

/** Brand/technical tokens allowed to stay Latin inside a Chinese value
 * (product names, protocols, units). Anything else with a Latin run of
 * two or more letters and no Han character is an untranslated leak. */
const LATIN_TOKENS = [
  "OpenMausBot",
  "ElevenLabs",
  "AssemblyAI",
  "OpenCode",
  "OpenAI",
  "Composio",
  "Gmail",
  "GitHub",
  "Slack",
  "Notion",
  "Linear",
  "Box",
  "Wayland",
  "Xorg",
  "GNOME",
  "Apple",
  "Android",
  "Linux",
  "Ubuntu",
  "macOS",
  "Docker",
  "SSH",
  "Tailscale",
  "HTTP",
  "API",
  "URL",
  "USB",
  "ADB",
  "PNG",
  "JPEG",
  "GIF",
  "WebP",
  "Authorization",
  "Bearer",
  "VPS",
  "Token",
  "Webhook",
  "MAUS",
  "ACP",
  "NDJSON",
  "SSE",
  "Cua",
  "English",
  "Grok",
  "xAI",
  "Go",
  "ak",
];

/** The Chinese leaf must read as Chinese. Placeholders and known Latin
 * tokens are stripped first; whatever remains must not carry a Latin
 * word of two or more letters. */
function untranslatedChineseLeaves(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      if (/\p{Script=Han}/u.test(value)) return [];
      if (/^https?:\/\//.test(value)) return []; // URLs stay URLs
      let stripped = value.replace(/\{(\w+)\}/g, " ");
      for (const token of LATIN_TOKENS) {
        stripped = stripped.replaceAll(token, " ");
      }
      return /[A-Za-z]{2,}/.test(stripped) ? [path] : [];
    }
    return untranslatedChineseLeaves(value, path);
  });
}

describe("i18n catalog", () => {
  it("interpolates named placeholders", () => {
    expect(interpolate("Hello {name}", { name: "Maus" })).toBe("Hello Maus");
  });

  it("translates nested Chinese keys", () => {
    expect(translate("zh", "settings.title")).toBe("设置");
    expect(translate("zh", "sidebar.newBot")).toBe("新建机器人");
  });

  it("falls back to the key when missing", () => {
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });

  it("fills version placeholders", () => {
    expect(translate("zh", "settings.updates.available", { version: "0.1.38" })).toBe("0.1.38 可更新");
  });

  it("keeps the zh catalog complete against en", () => {
    const enLeaves = leafPaths(en).sort();
    const zhLeaves = leafPaths(zh).sort();
    expect(zhLeaves).toEqual(enLeaves);
  });

  it("keeps variable names consistent between locales", () => {
    for (const path of leafPaths(en)) {
      // The one plural-pipe key ("one|other") carries count twice by design.
      const enVars = [...new Set(varsOf(pick(en, path)))].sort();
      const zhVars = [...new Set(varsOf(pick(zh, path)))].sort();
      if (enVars.join(",") !== zhVars.join(",")) {
        throw new Error(`variable mismatch at ${path}: en=[${enVars}] zh=[${zhVars}]`);
      }
      expect(true).toBe(true);
    }
  });

  it("leaves no obvious English behind in the zh catalog", () => {
    const leaked = untranslatedChineseLeaves(zh);
    expect(leaked).toEqual([]);
  });
});

function pick(tree: Messages, path: string): string {
  let cur: unknown = tree;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") throw new Error(`missing ${path}`);
    cur = (cur as Record<string, unknown>)[part];
  }
  if (typeof cur !== "string") throw new Error(`missing ${path}`);
  return cur;
}

function varsOf(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}
