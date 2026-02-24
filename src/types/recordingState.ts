/**
 * Mic button / recording session state model.
 * - Idle: mic button visible, meter shows previous value until next tap.
 * - Recording: 5s session in progress, meter resets to 0 and fills during recording.
 * - Completed: recording auto-stopped at 5s, final fill remains until next tap.
 */
export type RecordingState = 'idle' | 'recording' | 'completed';
