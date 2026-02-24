import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRecordingSession } from '../hooks/useRecordingSession';

const BAR_HEIGHT = 18;
const BAR_GAP = 4;
const RISE_DELAY_MS = 60;
const FRAME_COLOR = '#3d3d3d';
const POLARITY_COLOR = '#ffd54f';
const FILL_COLOR = '#c00';

export function LaughterScreen() {
  const { height, width } = useWindowDimensions();
  const batteryWidth = width - 48;
  const triangleBase = batteryWidth * 0.33;
  const triangleHeight = triangleBase * 0.6;
  const {
    handleMicPress,
    recordingState,
    laughterLevel,
    permissionStatus,
  } = useRecordingSession();

  const segmentHeight = BAR_HEIGHT + BAR_GAP;
  // Only create bars that fit inside the battery (between + and - signs)
  const batteryContentHeight = height * 0.7;
  const segmentCount = Math.max(4, Math.floor(batteryContentHeight / segmentHeight));
  const targetFilledCount = Math.round(laughterLevel * segmentCount);
  const [displayedFilledCount, setDisplayedFilledCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef(targetFilledCount);
  targetRef.current = targetFilledCount;

  useEffect(() => {
    const target = targetFilledCount;
    if (target === 0) {
      setDisplayedFilledCount(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    if (target <= displayedFilledCount) {
      return;
    }
    const scheduleNext = () => {
      setDisplayedFilledCount((prev) => {
        const t = targetRef.current;
        if (prev >= t) return prev;
        const next = prev + 1;
        if (next < t) {
          timeoutRef.current = setTimeout(scheduleNext, RISE_DELAY_MS);
        }
        return next;
      });
    };
    timeoutRef.current = setTimeout(scheduleNext, RISE_DELAY_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [targetFilledCount]);

  const filledCount = displayedFilledCount;

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
      {/* Meter: programmatic battery-style frame */}
      <View style={styles.meterWrapper}>
        <View style={styles.meterFrame}>
          <View style={[styles.sideBar, styles.sideBarLeft]} />
          <View style={[styles.sideBar, styles.sideBarRight]} />
          <View style={styles.header}>
            <Text style={styles.polarity}>+</Text>
          </View>
          <View style={styles.barsWrapper}>
            <View style={styles.barsContainer}>
              {Array.from({ length: segmentCount }, (_, i) => {
                const isFilled = i < filledCount;
                return (
                  <View
                    key={i}
                    style={[
                      styles.meterBar,
                      { height: BAR_HEIGHT, marginBottom: i < segmentCount - 1 ? BAR_GAP : 0 },
                      isFilled && styles.meterBarFilled,
                    ]}
                  />
                );
              })}
            </View>
            <View style={[styles.trianglesLeft, { width: triangleBase }]} pointerEvents="none">
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.triangleSlot}>
                  <View
                    style={[
                      styles.triangle,
                      styles.triangleRight,
                      {
                        borderLeftWidth: triangleBase,
                        borderTopWidth: triangleHeight,
                        borderBottomWidth: triangleHeight,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={[styles.trianglesRight, { width: triangleBase }]} pointerEvents="none">
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.triangleSlot}>
                  <View
                    style={[
                      styles.triangle,
                      styles.triangleLeft,
                      {
                        borderRightWidth: triangleBase,
                        borderTopWidth: triangleHeight,
                        borderBottomWidth: triangleHeight,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.polarity}>−</Text>
          </View>
        </View>
      </View>
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
  meterWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ffeb3b',
  },
  meterFrame: {
    width: '100%',
    flex: 1,
    borderWidth: 6,
    borderColor: FRAME_COLOR,
    borderRadius: 20,
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  sideBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: FRAME_COLOR,
    zIndex: 2,
  },
  sideBarLeft: {
    left: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  sideBarRight: {
    right: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  header: {
    backgroundColor: FRAME_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -8,
    marginTop: -12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: FRAME_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  polarity: {
    fontSize: 28,
    fontWeight: '700',
    color: POLARITY_COLOR,
    textAlign: 'center',
  },
  barsWrapper: {
    flex: 1,
    marginBottom: 56,
  },
  trianglesLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  trianglesRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  triangleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  triangleRight: {
    borderLeftColor: FRAME_COLOR,
  },
  triangleLeft: {
    borderRightColor: FRAME_COLOR,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'column-reverse',
    overflow: 'hidden',
    width: '100%',
  },
  meterBar: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  meterBarFilled: {
    backgroundColor: FILL_COLOR,
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
