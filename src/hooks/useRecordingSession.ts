import { useCallback, useRef, useState } from 'react';
import {
  useAudioRecorder,
  type PermissionStatus,
} from '../audio/useAudioRecorder';
import { createHeuristicLaughterDetector } from '../detection/heuristicLaughterDetector';
import type { RecordingState } from '../types/recordingState';

const SESSION_DURATION_MS = 5000;

export interface UseRecordingSessionReturn {
  /** Tap handler: resets meter, starts/restarts 5s session. Tap during recording restarts fresh. */
  handleMicPress: () => void;
  /** Recording state: idle, recording, or completed. */
  recordingState: RecordingState;
  /** Meter fill level 0..1. Resets to 0 on tap, updates progressively during recording. */
  laughterLevel: number;
  /** Microphone permission status. */
  permissionStatus: PermissionStatus;
}

/**
 * Session controller: tap-to-reset/restart, 5-second timer, progressive meter updates.
 * Wires useAudioRecorder and heuristic laughter detector into a single cohesive flow.
 */
export function useRecordingSession(): UseRecordingSessionReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [laughterLevel, setLaughterLevel] = useState(0);
  const detectorRef = useRef(createHeuristicLaughterDetector());
  const { startRecording, permissionStatus } = useAudioRecorder();

  const handleStartSession = useCallback(() => {
    setLaughterLevel(0);
    setRecordingState('recording');
    detectorRef.current.reset();

    startRecording({
      durationMs: SESSION_DURATION_MS,
      onLevel: (level) => {
        const score = detectorRef.current.processLevel(level);
        setLaughterLevel(score);
      },
      onComplete: () => setRecordingState('completed'),
      onError: () => setRecordingState('idle'),
    });
  }, [startRecording]);

  const handleMicPress = useCallback(() => {
    // Idle or completed: start new session
    // Recording: stop immediately, start fresh 5s session (tap-to-restart)
    handleStartSession();
  }, [handleStartSession]);

  return {
    handleMicPress,
    recordingState,
    laughterLevel,
    permissionStatus,
  };
}
