// The Box / Self-hosted VPS segmented control shown under the "Runs on"
// picker whenever a bot can end up on a cloud computer. One component, two
// homes (ComputerPanel and SettingsPanel), so the copy and the disabled
// rules can never drift apart.
import type { CloudBackend } from "../../server/contracts.ts";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";

export function CloudBackendPicker({
  value,
  vpsSupported,
  onChange,
}: {
  value: CloudBackend;
  vpsSupported: boolean;
  onChange: (backend: CloudBackend) => void;
}) {
  const { t } = useT();
  return (
    <div className="mt-3 rounded-lg bg-inset p-3">
      <div className="text-[12px] font-medium text-ink">{t("misc.cloudBackendPicker.title")}</div>
      <div className="mt-0.5 text-[11.5px] text-ink-secondary">
        {value === "vps"
          ? t("misc.cloudBackendPicker.autoHint")
          : t("misc.cloudBackendPicker.boxHint")}
      </div>
      <div className="mt-2 flex overflow-hidden rounded-lg border border-hairline/40">
        {(["box", "vps"] as const).map((backend, i) => {
          const disabled = backend === "vps" && !vpsSupported;
          return (
            <button
              key={backend}
              disabled={disabled}
              title={disabled ? t("misc.cloudBackendPicker.vpsDisabled") : undefined}
              onClick={() => onChange(backend)}
              className={cn(
                "flex-1 py-1.5 text-[12px]",
                i > 0 && "border-l border-hairline/40",
                disabled && "cursor-not-allowed opacity-40",
                value === backend ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60 hover:text-ink",
              )}
            >
              {backend === "vps" ? t("misc.cloudBackendPicker.vpsTitle") : t("misc.cloudBackendPicker.boxTitle")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
