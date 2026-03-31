export const VOICE_STYLES = ["차분한 음성", "명확한 음성", "밝은 음성"] as const

export type VoiceStyle = (typeof VOICE_STYLES)[number]

export const VOICE_RATE: Record<VoiceStyle, number> = {
  "차분한 음성": 0.95,
  "명확한 음성": 0.9,
  "밝은 음성": 1.05,
}

export const VOICE_PITCH: Record<VoiceStyle, number> = {
  "차분한 음성": 0.9,
  "명확한 음성": 1.0,
  "밝은 음성": 1.1,
}
