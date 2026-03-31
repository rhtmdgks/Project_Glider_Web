export function toSpeechFriendlyText(raw: string): string {
  if (!raw) return ""

  return raw
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/[*_#>\[\]\(\)\{\}]/g, " ")
    .replace(/https?:\/\/\S+/g, "링크")
    .replace(/\b(\d+)\)\s*/g, "$1번 ")
    .replace(/[:;|]/g, ", ")
    .replace(/[“”"'`]/g, "")
    .replace(/[~^]/g, " ")
    .replace(/\s*-\s*/g, ", ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
}
