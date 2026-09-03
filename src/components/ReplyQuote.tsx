import { MessageSquareReply, X } from "lucide-react";

import { replyAuthor, replySnippet } from "@/lib/replies";
import type { Message } from "@/state/store";
import { useT } from "@/i18n";

export function ReplyQuote({
  message,
  fallbackName,
  onJump,
  onClear,
  compact = false,
}: {
  message: Message;
  fallbackName?: string;
  onJump?: () => void;
  onClear?: () => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const body = (
    <>
      <MessageSquareReply size={compact ? 12 : 14} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-medium text-accent">{t("misc.replyQuote.replyingTo", { name: replyAuthor(message, fallbackName) })}</span>
        <span className="block truncate text-[11.5px] text-ink-secondary">{replySnippet(message.text ?? "")}</span>
      </span>
    </>
  );
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border-l-2 border-accent/60 bg-inset/70 px-2.5 py-1.5">
      {onJump ? (
        <button type="button" onClick={onJump} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={t("misc.replyQuote.jumpToOriginal")}>
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">{body}</div>
      )}
      {onClear && (
        <button type="button" onClick={onClear} aria-label={t("misc.replyQuote.cancelReply")} className="shrink-0 rounded p-0.5 text-ink-secondary hover:bg-raised hover:text-ink">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
