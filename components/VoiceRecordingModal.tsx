import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface VoiceRecordingModalProps {
  visible: boolean;
  meteringAnims: Animated.Value[];
  durationMs: number;
  isUploading: boolean;
  onStop: () => void;
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  visible,
  meteringAnims,
  durationMs,
  isUploading,
  onStop,
}) => {
  // Pulsing glow ring animation
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Fade-in animation for the whole modal content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // "Tap to stop" hint pulsing
  const hintAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Glow ring looping pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Hint text subtle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(hintAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(hintAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      glowAnim.stopAnimation();
      hintAnim.stopAnimation();
    }
  }, [visible]);

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.65, 0.15],
  });

  const BAR_COUNT = 28;
  // Distribute the 5 metering anims across 28 bars
  const getBarAnim = (index: number) => {
    const bucket = Math.floor((index / BAR_COUNT) * meteringAnims.length);
    return meteringAnims[Math.min(bucket, meteringAnims.length - 1)];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onStop}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.82)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            alignItems: "center",
            width: "100%",
            paddingHorizontal: 32,
          }}
        >
          {/* Title */}
          <Text
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 48,
              opacity: 0.6,
            }}
          >
            AI Listening
          </Text>

          {/* Glow Ring + Mic Button */}
          <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 44 }}>
            {/* Outer glow ring */}
            <Animated.View
              style={{
                position: "absolute",
                width: 136,
                height: 136,
                borderRadius: 68,
                backgroundColor: "#6366f1",
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              }}
            />
            {/* Second softer ring */}
            <Animated.View
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "#818cf8",
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.45],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              }}
            />
            {/* Core button */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === "android") Vibration.vibrate(30);
                else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onStop();
              }}
              activeOpacity={0.85}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#4f46e5",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#6366f1",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.7,
                shadowRadius: 20,
                elevation: 20,
              }}
            >
              <MaterialIcons name="mic" size={44} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Live Waveform — wide, expressive bars */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              height: 64,
              gap: 3,
              marginBottom: 36,
              width: "100%",
            }}
          >
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const anim = getBarAnim(i);
              const isMid = i > BAR_COUNT * 0.25 && i < BAR_COUNT * 0.75;
              // Alternate colors for visual richness
              const color =
                i % 3 === 0 ? "#818cf8" : i % 3 === 1 ? "#a78bfa" : "#c4b5fd";
              return (
                <Animated.View
                  key={i}
                  style={{
                    width: 4,
                    height: isMid ? 20 : 12,
                    backgroundColor: color,
                    borderRadius: 3,
                    transform: [
                      {
                        scaleY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.15, isMid ? 3.2 : 2.2],
                        }),
                      },
                    ],
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  }}
                />
              );
            })}
          </View>

          {/* Duration */}
          <Text
            style={{
              color: "#e0e7ff",
              fontSize: 28,
              fontWeight: "300",
              letterSpacing: 4,
              marginBottom: 12,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatDuration(durationMs)}
          </Text>

          {/* "Tap mic to stop" hint */}
          <Animated.Text
            style={{
              color: "#a5b4fc",
              fontSize: 13,
              fontWeight: "500",
              opacity: hintAnim,
              marginBottom: 52,
            }}
          >
            {isUploading ? "Processing..." : "Tap mic to stop & create event"}
          </Animated.Text>

          {/* Tip row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "rgba(99,102,241,0.15)",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(99,102,241,0.3)",
            }}
          >
            <MaterialIcons name="info-outline" size={15} color="#818cf8" />
            <Text
              style={{
                color: "#a5b4fc",
                fontSize: 12,
                flex: 1,
                lineHeight: 18,
              }}
            >
              Auto-stops after silence · 15s max · Describe your event naturally
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
