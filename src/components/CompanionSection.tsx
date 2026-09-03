import { useRef } from "react";
import {
  Cloud,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
} from "lucide-react";
import {
  PhoneSetupFlowView,
  companionAccountActionError,
  companionBridge,
  loadCompanionBridgeState,
  shouldHydrateCompanionEmail,
  type CompanionState,
  type PhoneSetupController,
  usePhoneSetupController,
} from "./PhoneSetupFlow";
import { companionPairingMode } from "../lib/phone-setup";
import { ConnectionDetail } from "./ConnectionDetail";
import { Card, Switch } from "./SettingsPrimitives";
import { useT } from "@/i18n";

export {
  companionAccountActionError,
  companionPairingMode,
  loadCompanionBridgeState,
  shouldHydrateCompanionEmail,
};

export interface CompanionPanelStatus {
  label: string;
  good: boolean;
}

export interface TailscalePairingStatus {
  kind: "unchecked" | "unavailable" | "magicdns" | "ready" | "error";
  title: string;
  detail: string;
}

export function deriveTailscalePairingStatus(
  state: Pick<CompanionState, "enabled" | "tailscale" | "tailnetName" | "error">,
  routeAvailable: boolean,
): TailscalePairingStatus {
  if (state.error) {
    return {
      kind: "error",
      title: "Phone access needs attention",
      detail: state.error,
    };
  }
  if (routeAvailable && state.tailnetName) {
    return {
      kind: "ready",
      title: `Ready on ${state.tailnetName}`,
      detail: "Keep Tailscale connected on this computer and your phone while they pair.",
    };
  }
  if (state.tailscale) {
    return {
      kind: "magicdns",
      title: "Tailscale found — MagicDNS is still needed",
      detail: "Turn on MagicDNS in Tailscale, then check again so the iPhone gets a secure tailnet name.",
    };
  }
  if (state.enabled) {
    return {
      kind: "unavailable",
      title: "Tailscale is not connected yet",
      detail: "Open Tailscale on both devices, sign in to the same tailnet, then check again.",
    };
  }
  return {
    kind: "unchecked",
    title: "Already use Tailscale?",
    detail: "Connect both devices to the same tailnet. Checking turns on Phone access so your phone can reach this computer.",
  };
}

export function pairingSurfaceCopy(
  route: Pick<PhoneSetupController, "localFallback" | "tailscaleFallback">,
): { title: string; subtitle: string } {
  if (route.tailscaleFallback) {
    return {
      title: "Tailscale pairing",
      subtitle: "Private pairing through the tailnet shared by this computer and your phone.",
    };
  }
  if (route.localFallback) {
    return {
      title: "Direct Wi-Fi pairing",
      subtitle: "Use only on a trusted network where both devices can see each other.",
    };
  }
  return {
    title: "Secure HTTPS pairing",
    subtitle: "Recommended — the simplest setup, and it keeps working when your phone leaves this Wi-Fi.",
  };
}

export function deriveCompanionPanelStatus(
  state: Pick<CompanionState, "enabled" | "devices" | "error">,
  t: (key: string, vars?: Record<string, string | number>) => string,
): CompanionPanelStatus | null {
  if (state.error) return { label: t("misc.phone.statusAttention"), good: false };
  if (!state.enabled) return { label: t("misc.phone.statusAccessOff"), good: false };
  const pairedCount = state.devices.length;
  if (!pairedCount) return null;
  return {
    label: pairedCount === 1 ? t("misc.phone.phonePaired") : t("misc.phone.phonesPaired", { count: pairedCount }),
    good: true,
  };
}

const relative = (at: number, t: (key: string, vars?: Record<string, string | number>) => string) => {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 90) return t("misc.phone.justNow");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("misc.phone.minAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("misc.phone.hoursAgo", { count: hours });
  return t("misc.phone.daysAgo", { count: Math.round(hours / 24) });
};

const endpointHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export function CompanionSection({ profileEmail = "" }: { profileEmail?: string }) {
  const c = usePhoneSetupController(profileEmail);
  const state = c.state;
  const pairingFlow = useRef<HTMLDivElement>(null);
  const { t } = useT();

  if (!companionBridge()) {
    return (
      <Card
        title={t("misc.phone.introTitle")}
        subtitle={t("misc.phone.desktopCardSubtitle")}
      />
    );
  }

  if (!state) {
    return (
      <Card title={t("misc.phone.sectionTitle")} subtitle={t("misc.phone.checking")}>
        <Loader2 size={15} className="animate-spin text-ink-secondary" />
      </Card>
    );
  }

  const pairedCount = state.devices.length;
  const panelStatus = deriveCompanionPanelStatus(state, t);
  const accountActionError = companionAccountActionError(c.account, c.accountError);
  const pairingCopy = pairingSurfaceCopy(c);
  const tailscaleStatus = deriveTailscalePairingStatus(state, c.tailscaleAvailable);
  const hosted = state.endpoints?.find((endpoint) => endpoint.kind === "hosted");
  const localRoutes = [
    state.tailnetName ? { label: "Tailscale", value: `${state.tailnetName}:${state.port}` } : null,
    state.lan ? { label: "Wi-Fi", value: `${state.lan}:${state.port}` } : null,
    state.discovery?.name
      ? { label: "Nearby discovery", value: `${state.discovery.name}:${state.port}` }
      : null,
    ...(state.addresses ?? [])
      .filter((address) => address !== state.lan && address !== state.tailscale)
      .map((address, index) => ({ label: `Local route ${index + 1}`, value: `${address}:${state.port}` })),
  ].filter((route): route is { label: string; value: string } => Boolean(route));

  return (
    <div className="flex flex-col gap-4">
      <div ref={pairingFlow} tabIndex={-1} className="scroll-mt-4 focus:outline-none">
        <Card title={pairingCopy.title} subtitle={pairingCopy.subtitle}>
          {(panelStatus || (pairedCount > 0 && c.hostedReady)) && (
            <div className="mb-4 flex items-center justify-between gap-3">
              {panelStatus && (
                <div
                  className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] ${
                    panelStatus.good ? "bg-success/10 text-success" : "bg-control text-ink-secondary"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${panelStatus.good ? "bg-success" : "bg-ink-secondary/50"}`} />
                  {panelStatus.label}
                </div>
              )}
              {pairedCount > 0 && c.hostedReady && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
                  <ShieldCheck size={13} className="text-accent" /> Works away from home
                </div>
              )}
            </div>
          )}
          <PhoneSetupFlowView controller={c} variant="settings" />
        </Card>
      </div>

      <Card
        title="Tailscale pairing"
        subtitle="Optional — for people who already use Tailscale. Secure HTTPS above remains the recommended setup."
      >
        <div className="rounded-xl bg-inset px-3 py-3" aria-live="polite">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              size={16}
              className={`mt-0.5 shrink-0 ${tailscaleStatus.kind === "ready" ? "text-success" : "text-ink-secondary"}`}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-ink">{tailscaleStatus.title}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                {tailscaleStatus.detail}
              </div>
            </div>
            {pairedCount > 0 && c.hostedReady && (
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
                <ShieldCheck size={13} className="text-accent" /> {t("misc.phone.worksAway")}
              </div>
            )}
          </div>
        </div>
        {tailscaleStatus.kind === "ready" ? (
          <button
            disabled={c.busy || c.accountBusy}
            onClick={() => {
              c.useTailscale();
              window.requestAnimationFrame(() => {
                pairingFlow.current?.scrollIntoView({ block: "start" });
                pairingFlow.current?.focus({ preventScroll: true });
              });
            }}
            className="mt-3 rounded-lg border border-hairline/40 px-3 py-1.5 text-[12px] text-ink hover:bg-control disabled:opacity-40"
          >
            {t("misc.phone.pairOverTailscale")}
          </button>
        ) : (
          <button
            disabled={c.busy || c.accountBusy}
            onClick={c.refreshTailscale}
            className="mt-3 rounded-lg border border-hairline/40 px-3 py-1.5 text-[12px] text-ink hover:bg-control disabled:opacity-40"
          >
            {c.busy ? t("common.checking") : state.enabled ? t("common.checkAgain") : "开启手机访问并检查"}
          </button>
        )}
      </Card>

      <Card
        title={t("misc.phone.pairedPhones")}
        subtitle={pairedCount ? t("misc.phone.managePhones") : t("misc.phone.noPhonesYet")}
      >
        {pairedCount > 0 && (
          <ul className="flex flex-col gap-2">
            {state.devices.map((device) => (
              <li key={device.id} className="rounded-xl bg-inset px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control text-ink-secondary">
                    <Smartphone size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">{device.name}</div>
                    <div className="text-[11.5px] text-ink-secondary">{t("misc.phone.lastSeen", { when: relative(device.lastSeenAt, t) })}</div>
                  </div>
                  <button
                    disabled={c.busy}
                    onClick={() => void c.act((companion) => companion.revoke(device.id))}
                    aria-label={t("misc.phone.removeAria", { name: device.name })}
                    className="shrink-0 rounded p-1.5 text-ink-secondary hover:bg-control hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline/30 pt-3">
                  <div>
                    <div className="text-[12px] text-ink">{t("misc.phone.computerView")}</div>
                    <div className="mt-0.5 text-[11px] text-ink-secondary">{t("misc.phone.computerViewHint")}</div>
                  </div>
                  <Switch
                    checked={device.cloudDesktopAccess}
                    aria-label={t("misc.phone.computerViewAria", { name: device.name })}
                    disabled={c.busy}
                    onClick={() =>
                      void c.act((companion) =>
                        companion.cloudDesktop(device.id, !device.cloudDesktopAccess),
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <details className="rounded-xl border border-hairline/40 bg-card">
        <summary className="cursor-pointer px-4 py-3.5 text-[13px] font-medium text-ink">
          {t("misc.phone.advanced")}
        </summary>
        <div className="flex flex-col gap-4 border-t border-hairline/30 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] text-ink">{t("misc.phone.accessToggle")}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                {t("misc.phone.accessToggleHint")}
              </div>
            </div>
            <Switch
              checked={state.enabled}
              aria-label={t("misc.phone.accessAria")}
              disabled={c.busy}
              onClick={() => void c.act((companion) => (state.enabled ? companion.stop() : companion.start()))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-hairline/30 pt-4">
            <div className="min-w-0">
              <div className="text-[13px] text-ink">{t("misc.phone.keepAwakeTitle")}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                {t("misc.phone.keepAwakeTitleHint")}
              </div>
            </div>
            <Switch
              checked={state.keepAwake}
              aria-label={t("misc.phone.keepAwakeAria")}
              disabled={c.busy || !state.enabled}
              onClick={() => void c.act((companion) => companion.keepAwake(!state.keepAwake))}
            />
          </div>

          <div className="border-t border-hairline/30 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Cloud size={15} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <div className="text-[13px] text-ink">{t("misc.phone.secureAccount")}</div>
                  <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                    {c.account?.status === "ready"
                      ? t("misc.phone.signedInAsNoPeriod", { email: c.account.email ?? t("misc.phone.yourAccount") })
                      : c.account?.status === "connecting"
                        ? t("misc.phone.finishingSecure")
                        : c.account?.status === "error"
                          ? c.account.message ?? t("misc.phone.secureAttentionShort")
                          : t("misc.phone.willAskSignIn")}
                  </div>
                </div>
              </div>
              {(c.account?.status === "ready" || c.account?.status === "connecting" || c.account?.status === "error") && (
                <button
                  disabled={c.accountBusy}
                  onClick={() => void c.accountAct((remote) => remote.signOut())}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline/40 px-2.5 py-1.5 text-[11.5px] text-ink-secondary hover:bg-control hover:text-ink disabled:opacity-40"
                >
                  <LogOut size={12} /> {t("misc.phone.signOut")}
                </button>
              )}
            </div>
            {c.account?.status === "error" && (
              <button
                disabled={c.accountBusy}
                onClick={c.retryAccount}
                className="mt-3 rounded-lg border border-hairline/40 px-3 py-1.5 text-[12px] text-ink hover:bg-control disabled:opacity-40"
              >
                {c.accountBusy ? t("misc.phone.tryingAgain") : t("misc.phone.retryAccess")}
              </button>
            )}
            {accountActionError && <div className="mt-2 text-[12px] text-danger">{accountActionError}</div>}
          </div>

          <div className="border-t border-hairline/30 pt-4">
            <div className="text-[13px] text-ink">{t("misc.phone.connectionDetails")}</div>
            <div className="mt-0.5 text-[11.5px] text-ink-secondary">
              {t("misc.phone.revealHint")}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {hosted && <ConnectionDetail label={t("misc.phone.secureRoute")} value={endpointHost(hosted.url)} />}
              {localRoutes.map((route) => <ConnectionDetail key={`${route.label}:${route.value}`} {...route} />)}
              {!hosted && localRoutes.length === 0 && (
                <div className="text-[12px] text-ink-secondary">{t("misc.phone.noAddress")}</div>
              )}
            </div>
          </div>

          <div className="border-t border-hairline/30 pt-4">
            {c.tailscaleAvailable && (
              <div className="mb-4 border-b border-hairline/30 pb-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <div className="text-[13px] text-ink">{t("misc.phone.tailscalePairing")}</div>
                    <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                      {t("misc.phone.tailnetKeep")}
                    </div>
                  </div>
                </div>
                <button
                  disabled={c.busy || c.accountBusy}
                  onClick={c.useTailscale}
                  className="mt-3 rounded-lg border border-hairline/40 px-3 py-1.5 text-[12px] text-ink hover:bg-control disabled:opacity-40"
                >
                  {t("misc.phone.pairOverTailscale")}
                </button>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <Wifi size={15} className="mt-0.5 shrink-0 text-ink-secondary" />
              <div>
                <div className="text-[13px] text-ink">{t("misc.phone.directWifi")}</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-secondary">
                  {t("misc.phone.wifiOnlyHint")}
                </div>
              </div>
            </div>
            <button
              disabled={c.busy || c.accountBusy}
              onClick={c.useLocal}
              className="mt-3 rounded-lg border border-hairline/40 px-3 py-1.5 text-[12px] text-ink hover:bg-control disabled:opacity-40"
            >
              {t("misc.phone.pairThisWifiShort")}
            </button>
          </div>

          {state.enabled && !hosted && state.tailscale && !state.tailnetName && (
            <div className="rounded-lg bg-warning/10 px-3 py-2 text-[11.5px] leading-relaxed text-ink-secondary">
              {t("misc.phone.tailnetNameWarning")}
            </div>
          )}
          {state.enabled && !hosted && !state.tailscale && (
            <div className="rounded-lg bg-inset px-3 py-2 text-[11.5px] leading-relaxed text-ink-secondary">
              {t("misc.phone.localOnlyWarning")}
            </div>
          )}
          {(c.error || state.error) && <div className="text-[12px] text-danger">{c.error ?? state.error}</div>}
        </div>
      </details>
    </div>
  );
}
