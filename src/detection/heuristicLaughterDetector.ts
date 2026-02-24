import type { LaughterDetector } from './laughterDetector';

/** Default number of recent samples for variability (fewer = lower latency). */
const DEFAULT_WINDOW_SIZE = 4;

/** Smoothing factor for moving average (0..1, higher = more responsive). */
const SMOOTHING_ALPHA = 0.85;

/** Weight for energy vs variability in final score (0..1). */
const ENERGY_WEIGHT = 0.7;
const VARIABILITY_WEIGHT = 0.3;

/**
 * Normalized level threshold below which we treat as silence (noise gate).
 * 0 = -30 dB floor; we use full 0..1 range from recorder.
 */
const NOISE_FLOOR = 0;

/** Consecutive samples above floor required before passing sound (filters speech peaks). */
const CONSECUTIVE_ABOVE_FLOOR_REQUIRED = 3;

/** Gated level above this = "active" (counting toward sustained ratio). */
const ACTIVE_THRESHOLD = 0.2;

/** Raw score above this = "very loud" (unlocks 50%+ without sustained time). */
const VERY_LOUD_THRESHOLD = 0.78;

/** Fraction of session with sound required to unlock 50%+ (when not very loud). */
const SUSTAINED_RATIO_REQUIRED = 0.75;

/**
 * Maps level through noise gate: below threshold → 0, above → rescaled to 0..1.
 */
function applyNoiseGate(level: number, floor: number): number {
  if (level <= floor) return 0;
  return (level - floor) / (1 - floor);
}

/**
 * Heuristic laughter detector (v1).
 * Uses RMS-like energy (loudness) + short-term variability proxy.
 * Laughter typically has both high energy and higher variability than steady speech or silence.
 */
export function createHeuristicLaughterDetector(
  options?: {
    windowSize?: number;
    smoothingAlpha?: number;
    energyWeight?: number;
    variabilityWeight?: number;
    noiseFloor?: number;
  }
): LaughterDetector {
  const windowSize = options?.windowSize ?? DEFAULT_WINDOW_SIZE;
  const smoothingAlpha = options?.smoothingAlpha ?? SMOOTHING_ALPHA;
  const energyWeight = options?.energyWeight ?? ENERGY_WEIGHT;
  const variabilityWeight = options?.variabilityWeight ?? VARIABILITY_WEIGHT;
  const noiseFloor = options?.noiseFloor ?? NOISE_FLOOR;

  let levelBuffer: number[] = [];
  let smoothedScore = 0;
  let peakScore = 0;
  let totalSamples = 0;
  let activeSamples = 0;
  let consecutiveAboveFloor = 0;

  return {
    processLevel(level: number): number {
      const aboveFloor = level > noiseFloor;
      if (aboveFloor) {
        consecutiveAboveFloor += 1;
      } else {
        consecutiveAboveFloor = 0;
      }

      const sustainedLoud = consecutiveAboveFloor >= CONSECUTIVE_ABOVE_FLOOR_REQUIRED;
      const gatedLevel = sustainedLoud ? applyNoiseGate(level, noiseFloor) : 0;

      levelBuffer.push(gatedLevel);
      if (levelBuffer.length > windowSize) {
        levelBuffer.shift();
      }

      totalSamples += 1;
      if (gatedLevel > ACTIVE_THRESHOLD) activeSamples += 1;

      // Energy: weight current level heavily for immediate response to sound
      const recentMean = levelBuffer.reduce((a, b) => a + b, 0) / levelBuffer.length;
      const energy = 0.7 * gatedLevel + 0.3 * recentMean;

      // Variability: standard deviation of recent levels (short-term variability proxy)
      let variability = 0;
      if (levelBuffer.length >= 2) {
        const mean = energy;
        const variance =
          levelBuffer.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
          levelBuffer.length;
        variability = Math.min(1, Math.sqrt(variance) * 4);
      }

      const rawScore =
        energyWeight * energy + variabilityWeight * variability;

      smoothedScore =
        smoothingAlpha * rawScore + (1 - smoothingAlpha) * smoothedScore;

      peakScore = Math.max(peakScore, smoothedScore);

      // Unlock 50%+ only if very loud OR sound sustained 75%+ of the session
      const veryLoud = rawScore > VERY_LOUD_THRESHOLD;
      const sustainedRatio = totalSamples > 0 ? activeSamples / totalSamples : 0;
      const unlocked = veryLoud || sustainedRatio >= SUSTAINED_RATIO_REQUIRED;

      const cappedScore = unlocked ? peakScore : Math.min(peakScore, 0.5);

      return Math.min(1, Math.max(0, cappedScore));
    },

    reset(): void {
      levelBuffer = [];
      smoothedScore = 0;
      peakScore = 0;
      totalSamples = 0;
      activeSamples = 0;
      consecutiveAboveFloor = 0;
    },
  };
}
