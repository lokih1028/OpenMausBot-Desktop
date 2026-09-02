import { describe, expect, it } from "vitest";
import { interpolate, translate } from "./catalog";

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
});
