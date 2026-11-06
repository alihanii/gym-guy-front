/** Short vibration patterns. No-ops where the Vibration API is missing (iOS Safari). */
export const haptic = {
  tap: () => navigator.vibrate?.(8),
  success: () => navigator.vibrate?.(18),
  alarm: () => navigator.vibrate?.([60, 80, 60, 80, 120]),
  record: () => navigator.vibrate?.([30, 50, 30, 50, 90]),
}

let ctx: AudioContext | null = null

/** Two quick tones for the end of a rest period. */
export function beep() {
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.17)
    }
  } catch {
    /* audio blocked; vibration still fires */
  }
}
