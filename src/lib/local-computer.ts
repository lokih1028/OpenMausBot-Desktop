import type { Bot, InstanceInfo } from "@/state/store";
import { readLocale, translate } from "@/i18n/catalog";

/** Localized user-facing string; lib code cannot use React context, so it
 * resolves the persisted locale directly. */
function lib(key: string, vars?: Record<string, string | number>): string {
  return translate(readLocale(), key, vars);
}

export function instanceSupportsLocalComputer(
  instances: InstanceInfo[],
  bot: Pick<Bot, "modelSelection">,
): boolean {
  const capabilities = instances.find(
    (instance) => instance.instanceId === bot.modelSelection.instanceId,
  )?.capabilities;
  return capabilities?.localComputerMcp === true || capabilities?.computerMcp === true;
}

/** Whether the Runs-on “This computer” control should be clickable.
 *  macOS keeps the destination available even before CUA has a grant, so
 *  the user can pick it and then approve Accessibility / Screen Recording
 *  instead of finding a grayed-out button. */
export function localComputerSelectable({
  capabilities,
  providerSupportsLocal,
}: {
  capabilities: DesktopCapabilities;
  providerSupportsLocal: boolean;
}): boolean {
  if (!providerSupportsLocal) return false;
  if (capabilities.localComputer.available) return true;
  return capabilities.host.platform === "darwin";
}

export function localComputerDisabledReason({
  capabilities,
  providerSupportsLocal,
}: {
  capabilities: DesktopCapabilities;
  providerSupportsLocal: boolean;
}): string | null {
  if (!providerSupportsLocal) {
    return lib("lib.localComputerProvider");
  }
  if (capabilities.localComputer.available) return null;
  if (capabilities.host.platform === "linux") {
    if (capabilities.localComputer.reasonCode === "linux-wayland-seat-safety-blocked") {
      return lib("lib.waylandBlocked");
    }
    if (capabilities.localComputer.reasonCode === "wayland-compositor-unsupported") {
      return lib("lib.waylandGnome");
    }
    if (!capabilities.localComputer.enabled) {
      return lib("lib.enableBetaFirst");
    }
    return capabilities.localComputer.message ?? lib("lib.cuaNotReady");
  }
  if (capabilities.host.label === "Browser") {
    return lib("lib.needsDesktopApp");
  }
  return lib("lib.cuaNotReadyLocal");
}

export function linuxAutoDescription(): string {
  return lib("lib.linuxAuto");
}

export function autoSelectsLocalComputer({
  platform,
  computer,
  capabilitiesReady,
  localSelectable,
}: {
  platform: DesktopCapabilities["host"]["platform"];
  computer: Bot["computer"];
  capabilitiesReady: boolean;
  localSelectable: boolean;
}): boolean {
  return platform !== "linux" && computer !== "cloud" && capabilitiesReady && localSelectable;
}
