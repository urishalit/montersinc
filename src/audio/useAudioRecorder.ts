import { Audio } from 'expo-av';
import { useCallback, useRef, useState } from 'react';

/** dB range we care about: -30 dB maps to 0, 0 dB maps to 1. */
const METERING_MIN_DB = -30;
const METERING_RANGE_DB = 30;

/**
 * Normalizes metering from dB (-30 to 0) to 0..1.
 * Values below -30 dB map to 0. When metering is undefined, returns 0.
 */
function normalizeMetering(metering: number | undefined): number {
  if (metering === undefined) return 0;
  return Math.min(1, Math.max(0, (metering - METERING_MIN_DB) / METERING_RANGE_DB));
}

export interface RecordingOptions {
  /** Callback fired periodically with normalized level 0..1 during recording. */
  onLevel?: (level: number) => void;
  /** Recording duration in ms. Default 5000. */
  durationMs?: number;
  /** Status callback fired when recording completes (success or stop). */
  onComplete?: () => void;
  /** Error callback. */
  onError?: (error: Error) => void;
}

export interface UseAudioRecorderReturn {
  /** Start a new 5-second recording. Stops any in-progress session first. */
  startRecording: (options?: RecordingOptions) => Promise<void>;
  /** Stop the current recording immediately. */
  stopRecording: () => Promise<void>;
  /** Whether a recording session is currently active. */
  isRecording: boolean;
}

const DEFAULT_DURATION_MS = 5000;
const LEVEL_UPDATE_INTERVAL_MS = 50;

export function useAudioRecorder(): UseAudioRecorderReturn {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef<RecordingOptions | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const stopCurrentRecording = useCallback(
    async (notifyComplete = true): Promise<void> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const rec = recordingRef.current;
      const opts = optionsRef.current;
      recordingRef.current = null;
      optionsRef.current = null;
      setIsRecording(false);

      if (rec) {
        try {
          await rec.stopAndUnloadAsync();
        } catch {
          // Ignore - recorder may already be unloaded
        }
        if (notifyComplete) opts?.onComplete?.();
      }
    },
    []
  );

  const startRecording = useCallback(
    async (options: RecordingOptions = {}): Promise<void> => {
      // Stop any in-progress session first (don't notify - we're restarting)
      await stopCurrentRecording(false);

      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          options.onError?.(new Error('Microphone permission denied'));
          return;
        }
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
        optionsRef.current = options;

        const onStatus = (status: Audio.RecordingStatus) => {
          const level = normalizeMetering(status.metering);
          optionsRef.current?.onLevel?.(level);
        };

        const { recording } = await Audio.Recording.createAsync(
          {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          },
          onStatus,
          LEVEL_UPDATE_INTERVAL_MS
        );

        recordingRef.current = recording;
        setIsRecording(true);

        timeoutRef.current = setTimeout(async () => {
          timeoutRef.current = null;
          await stopCurrentRecording();
        }, durationMs);
      } catch (err) {
        setIsRecording(false);
        options.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [stopCurrentRecording]
  );

  const stopRecording = useCallback(async (): Promise<void> => {
    await stopCurrentRecording(true);
  }, [stopCurrentRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording,
  };
}
