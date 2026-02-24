import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRecordingSession } from '../hooks/useRecordingSession';

export function LaughterScreen() {
  const { height } = useWindowDimensions();
  const {
    handleMicPress,
    recordingState,
    laughterLevel,
    permissionStatus,
  } = useRecordingSession();

  const meterHeight = Math.max(0, laughterLevel * height);

  // Minimal fallback UI when microphone permission is denied
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.permissionFallback}>
          <Text style={styles.permissionText}>
            Microphone access is required to measure laughter.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.micButtonPressed,
            ]}
            onPress={() => Linking.openSettings()}
            accessibilityLabel="Open app settings"
            accessibilityRole="button"
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  settingsButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
