export const lib = {
  costSubscription: "equivalent — on your subscription, not billed",
  costMetered: "billed to your API key",
  costReported: "as reported by the engine",
  costTokenUnit: "tok",
  localComputerProvider: "The selected provider cannot request approvals for local computer actions.",
  waylandBlocked: "Local computer control is not available on Wayland yet. Sign out and choose Ubuntu on Xorg to use This computer.",
  waylandGnome: "Wayland local control is currently limited to GNOME. Xorg remains available on supported desktops.",
  enableBetaFirst: "Enable the local control beta and complete the Cua Driver checks first.",
  cuaNotReady: "Cua Driver is not ready for local control.",
  needsDesktopApp: "Local computer control requires the desktop app.",
  cuaNotReadyLocal: "CUA Driver is not ready for local computer control.",
  linuxAuto: "Auto uses a cloud box when one is configured; otherwise computer use stays off.",
  groupDmHint: "Reply here to continue the bot-to-bot conversation.",
  groupEveryoneHint: "Everyone responds unless you @mention specific bots.",
  groupMentionsHint: "Mention a bot with @ to bring them in.",
  groupLeadFallback: "The lead bot",
  groupLeadHint: "{name} responds by default — @mention someone else to choose them instead.",
  groupDmComposer: "continue the conversation",
  groupEveryoneComposer: "everyone responds",
  groupMentionsComposer: "@ to bring a bot in",
  groupLeadComposer: "{name} responds",
  conversationGone: "That conversation is no longer available.",
  transcriptionStream: "Could not open the AssemblyAI transcription stream.",
  serverRejectedSetting: "The server rejected this setting.",
  turnLimitSaveFailed: "Could not save the channel turn limit.",
  pairingDidNotOpen: "Phone pairing did not open",
} as const;

/** Literal strings widened to `string` so localized catalogs can satisfy it. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type LibSection = Widen<typeof lib>;
