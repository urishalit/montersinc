/**
 * Contract for laughter detection implementations.
 * Allows swapping heuristic (v1) with remote/ML detector (future) without changing UI/session code.
 */
export interface LaughterDetector {
  /**
   * Process a new audio level sample (0..1).
   * Returns current laughter score in 0..1.
   */
  processLevel(level: number): number;

  /**
   * Reset internal state for a new recording session.
   */
  reset(): void;
}
