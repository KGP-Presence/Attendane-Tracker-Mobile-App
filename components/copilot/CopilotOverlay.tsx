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
  useColorScheme,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export interface CopilotStep {
  title: string;
  description: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  // Which corner to anchor the tooltip card
  tooltipPosition?: "top" | "bottom" | "center";
}

interface CopilotOverlayProps {
  visible: boolean;
  onDone: () => void;
  steps: CopilotStep[];
  spotlightMeasurements?: Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>;
  onStepChange?: (step: number) => void;
}

export const CopilotOverlay: React.FC<CopilotOverlayProps> = ({
  visible,
  onDone,
  steps,
  spotlightMeasurements = {},
  onStepChange,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Theme colors
  const overlayBg = "rgba(0,0,0,0.78)";
  const spotlightBorder = isDark ? "#3B82F6" : "#135bec";
  const spotlightBg = isDark ? "rgba(19,91,236,0.18)" : "rgba(19,91,236,0.1)";
  const cardBg = isDark ? "#101622" : "#ffffff";
  const cardBorder = isDark ? "rgba(19,91,236,0.35)" : "rgba(19,91,236,0.15)";
  const cardShadow = "#135bec";
  const iconBadgeBg = isDark ? "rgba(19,91,236,0.2)" : "rgba(19,91,236,0.1)";
  const iconColor = isDark ? "#60A5FA" : "#135bec";
  const titleColor = isDark ? "#ffffff" : "#0f172a";
  const descColor = isDark ? "#CBD5E1" : "#475569";
  const activeDot = isDark ? "#3B82F6" : "#135bec";
  const inactiveDot = isDark ? "#1E3A5F" : "#E2E8F0";
  const skipText = isDark ? "#3B82F6" : "#135bec";
  const nextBg = "#135bec";
  const nextText = "#ffffff";

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const spotlightAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef(new Animated.Value(0)).current;

  const currentStep = steps[step];

  // Resolve active spotlight from the mapped measurements
  const activeSpotlight = React.useMemo(() => {
    return spotlightMeasurements[step] || null;
  }, [step, spotlightMeasurements]);
  const isLast = step === steps.length - 1;

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
      onStepChange?.(0);
      animateIn();
    }
  }, [visible, onStepChange]);

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
      setStep((s) => {
        const next = s + 1;
        onStepChange?.(next);
        return next;
      });
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

  // Compute dynamic styles for the tooltip card
  const getTooltipStyle = () => {
    if (currentStep.tooltipPosition === "bottom") {
      const topPos = activeSpotlight ? activeSpotlight.cy + activeSpotlight.height / 2 + 16 : SCREEN_H * 0.55;
      return { top: Math.min(topPos, SCREEN_H - 280) };
    } else if (currentStep.tooltipPosition === "top") {
      const bottomPos = activeSpotlight ? SCREEN_H - activeSpotlight.cy + activeSpotlight.height / 2 + 16 : SCREEN_H * 0.55;
      return { bottom: Math.min(bottomPos, SCREEN_H - 280) };
    } else {
      // center
      return { top: SCREEN_H * 0.3 };
    }
  };

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
          opacity: fadeAnim,
        }}
        pointerEvents="auto"
      >
        {/* Exact Huge Border Spotlight Trick (No SVG needed) */}
        {activeSpotlight ? (
          (() => {
            // Calculate exact maximum distance from center to any screen corner
            const distTL = Math.hypot(activeSpotlight.cx, activeSpotlight.cy);
            const distTR = Math.hypot(SCREEN_W - activeSpotlight.cx, activeSpotlight.cy);
            const distBL = Math.hypot(activeSpotlight.cx, SCREEN_H - activeSpotlight.cy);
            const distBR = Math.hypot(SCREEN_W - activeSpotlight.cx, SCREEN_H - activeSpotlight.cy);
            // Minimum radius needed to cover the entire screen
            const R_MAX = Math.ceil(Math.max(distTL, distTR, distBL, distBR));

            return (
              <View
                style={{
                  position: "absolute",
                  left: activeSpotlight.cx - activeSpotlight.width / 2 - R_MAX,
                  top: activeSpotlight.cy - activeSpotlight.height / 2 - R_MAX,
                  width: activeSpotlight.width + R_MAX * 2,
                  height: activeSpotlight.height + R_MAX * 2,
                  borderRadius: R_MAX + activeSpotlight.borderRadius,
                  borderWidth: R_MAX,
                  borderColor: overlayBg,
                  backgroundColor: "transparent",
                }}
                pointerEvents="auto"
              />
            );
          })()
        ) : (
          <View
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backgroundColor: overlayBg,
            }}
          />
        )}

          {/* Spotlight animated ring */}
          {activeSpotlight && (
            <Animated.View
              style={{
                position: "absolute",
                left: activeSpotlight.cx - activeSpotlight.width / 2 - 4,
                top: activeSpotlight.cy - activeSpotlight.height / 2 - 4,
                width: activeSpotlight.width + 8,
                height: activeSpotlight.height + 8,
                borderRadius: activeSpotlight.borderRadius + 4,
                borderWidth: 2.5,
                borderColor: spotlightBorder,
                opacity: glowLoop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
                transform: [
                  {
                    scale: glowLoop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  },
                ],
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
            ...getTooltipStyle(),
            transform: [{ translateY: cardSlide }],
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 24,
              padding: 24,
              shadowColor: cardShadow,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 30,
              elevation: 25,
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            {/* Icon badge */}
            {currentStep.icon && (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: iconBadgeBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <MaterialIcons
                  name={currentStep.icon}
                  size={28}
                  color={iconColor}
                />
              </View>
            )}

            {/* Title */}
            <Text
              style={{
                color: titleColor,
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
                color: descColor,
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
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === step ? activeDot : inactiveDot,
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
                        color: skipText,
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
                    backgroundColor: nextBg,
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
                      color: nextText,
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
                      color={nextText}
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
