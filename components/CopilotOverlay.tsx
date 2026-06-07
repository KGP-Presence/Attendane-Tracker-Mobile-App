import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface CopilotStep {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  // Approximate position of the spotlight (center x, center y from top, radius)
  spotlight?: { cx: number; cy: number; r: number };
  // Which corner to anchor the tooltip card
  tooltipPosition?: "top" | "bottom" | "center";
}

const STEPS: CopilotStep[] = [
  {
    title: "Welcome to Events! 🎉",
    description:
      "This is your events hub. Keep track of exams, assignments, tests, and more — all in one place.",
    icon: "event",
    tooltipPosition: "center",
  },
  {
    title: "Voice-Create Events 🎙️",
    description:
      'Tap the purple mic button and just speak — "Maths exam on Friday at 2 PM in LBS". Our AI will create the event for you instantly.',
    icon: "mic",
    spotlight: { cx: SCREEN_W - 48, cy: SCREEN_H - 230, r: 42 },
    tooltipPosition: "top",
  },
  {
    title: "Manual Create ✍️",
    description:
      "Prefer typing? Tap the blue + button to fill in event details yourself — name, location, type, date and time.",
    icon: "add-circle-outline",
    spotlight: { cx: SCREEN_W - 48, cy: SCREEN_H - 150, r: 42 },
    tooltipPosition: "top",
  },
  {
    title: "Filter by Type 🔍",
    description:
      "Use the Type filter to quickly see only Exams, Assignments, Tests or Others. Pull down to refresh.",
    icon: "filter-list",
    tooltipPosition: "bottom",
  },
  {
    title: "Long-press to Multi-Select 🗑️",
    description:
      "Long-press any event card to enter multi-select mode. Then delete several events at once.",
    icon: "select-all",
    tooltipPosition: "center",
  },
];

interface CopilotOverlayProps {
  visible: boolean;
  onDone: () => void;
  micCoords?: { cx: number; cy: number; r: number } | null;
  addCoords?: { cx: number; cy: number; r: number } | null;
}

export const CopilotOverlay: React.FC<CopilotOverlayProps> = ({
  visible,
  onDone,
  micCoords,
  addCoords,
}) => {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const spotlightAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef(new Animated.Value(0)).current;

  const currentStep = STEPS[step];

  // Resolve active spotlight (prefer dynamic measurements over hardcoded fallback coordinates)
  const activeSpotlight = React.useMemo(() => {
    if (step === 1 && micCoords) return micCoords;
    if (step === 2 && addCoords) return addCoords;
    return currentStep.spotlight;
  }, [step, currentStep, micCoords, addCoords]);
  const isLast = step === STEPS.length - 1;

  const haptic = () => {
    if (Platform.OS === "android") Vibration.vibrate(18);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animateIn = () => {
    cardSlide.setValue(40);
    fadeAnim.setValue(0);
    spotlightAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(spotlightAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Glow pulse on spotlight
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowLoop, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowLoop, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setStep(0);
      animateIn();
    }
  }, [visible]);

  const goNext = () => {
    haptic();
    if (isLast) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDone());
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setStep((s) => s + 1);
      animateIn();
    });
  };

  const skip = () => {
    haptic();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  const tooltipTop =
    currentStep.tooltipPosition === "bottom"
      ? SCREEN_H * 0.55
      : currentStep.tooltipPosition === "center"
        ? SCREEN_H * 0.3
        : activeSpotlight
          ? activeSpotlight.cy - activeSpotlight.r - 180
          : SCREEN_H * 0.3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={skip}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.78)",
          opacity: fadeAnim,
        }}
        pointerEvents="auto"
      >
        {/* Spotlight ring */}
        {activeSpotlight && (
          <Animated.View
            style={{
              position: "absolute",
              left: activeSpotlight.cx - activeSpotlight.r - 8,
              top: activeSpotlight.cy - activeSpotlight.r - 8,
              width: (activeSpotlight.r + 8) * 2,
              height: (activeSpotlight.r + 8) * 2,
              borderRadius: activeSpotlight.r + 8,
              borderWidth: 2.5,
              borderColor: "#3B82F6",
              opacity: glowLoop.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
              transform: [
                {
                  scale: glowLoop.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            }}
            pointerEvents="none"
          />
        )}
        {activeSpotlight && (
          <View
            style={{
              position: "absolute",
              left: activeSpotlight.cx - activeSpotlight.r,
              top: activeSpotlight.cy - activeSpotlight.r,
              width: activeSpotlight.r * 2,
              height: activeSpotlight.r * 2,
              borderRadius: activeSpotlight.r,
              backgroundColor: "rgba(19,91,236,0.18)",
            }}
            pointerEvents="none"
          />
        )}

        {/* Tooltip card */}
        <Animated.View
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            top: Math.max(60, tooltipTop),
            transform: [{ translateY: cardSlide }],
          }}
        >
          <View
            style={{
              backgroundColor: "#101622",
              borderRadius: 24,
              padding: 24,
              shadowColor: "#135bec",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 30,
              elevation: 25,
              borderWidth: 1,
              borderColor: "rgba(19,91,236,0.35)",
            }}
          >
            {/* Icon badge */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "rgba(19,91,236,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <MaterialIcons
                name={currentStep.icon}
                size={28}
                color="#60A5FA"
              />
            </View>

            {/* Title */}
            <Text
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 10,
                lineHeight: 26,
              }}
            >
              {currentStep.title}
            </Text>

            {/* Description */}
            <Text
              style={{
                color: "#CBD5E1",
                fontSize: 14,
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {currentStep.description}
            </Text>

            {/* Progress dots + buttons */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Dots */}
              <View style={{ flexDirection: "row", gap: 6 }}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === step ? "#3B82F6" : "#1E3A5F",
                    }}
                  />
                ))}
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {!isLast && (
                  <TouchableOpacity onPress={skip} activeOpacity={0.7}>
                    <Text
                      style={{
                        color: "#3B82F6",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Skip
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={goNext}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#135bec",
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {isLast ? "Got it!" : "Next"}
                  </Text>
                  {!isLast && (
                    <MaterialIcons
                      name="arrow-forward"
                      size={16}
                      color="#ffffff"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
