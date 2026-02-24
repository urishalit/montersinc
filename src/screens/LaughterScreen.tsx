import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAudioRecorder } from '../audio/useAudioRecorder';
import { createHeuristicLaughterDetector } from '../detection/heuristicLaughterDetector';
import type { RecordingState } from '../types/recordingState';

export function LaughterScreen() {
  const { height } = useWindowDimensions();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  // Meter fill 0..1. Idle/Completed: holds previous; Recording: fills during session.
  const [laughterLevel, setLaughterLevel] = useState(0);

  const detectorRef = useRef(createHeuristicLaughterDetector());
  const { startRecording } = useAudioRecorder();

  const handleStartSession = useCallback(() => {
    setLaughterLevel(0);
    setRecordingState('recording');
    detectorRef.current.reset();
    startRecording({
      onLevel: (level) => {
        const score = detectorRef.current.processLevel(level);
        setLaughterLevel(score);
      },
      onComplete: () => setRecordingState('completed'),
      onError: () => setRecordingState('idle'),
    });
  }, [startRecording]);

  const handleMicPress = () => {
    if (recordingState === 'idle' || recordingState === 'completed') {
      handleStartSession();
    } else if (recordingState === 'recording') {
      // Tap during recording: stop immediately, start fresh 5s session
      handleStartSession();
    }
  };

  const meterHeight = Math.max(0, laughterLevel * height);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Red vertical fill from bottom to top */}
      <View style={[styles.meter, { height: meterHeight }]} />
      {/* Centered mic button */}
      <Pressable
        style={({ pressed }) => [
          styles.micButton,
          recordingState === 'recording' && styles.micButtonRecording,
          pressed && styles.micButtonPressed,
        ]}
        onPress={handleMicPress}
        accessibilityLabel="Record"
        accessibilityRole="button"
      >
        <MaterialIcons
          name="mic"
          size={48}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#c00',
    minHeight: 0,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  micButtonRecording: {
    backgroundColor: '#a00',
  },
  micButtonPressed: {
    opacity: 0.8,
  },
});
