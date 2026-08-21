import {
  formatSlot,
  ScanResult,
  TimetableScanResponse,
} from "@/types/timetableScan";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  Vibration,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

cssInterop(LinearGradient, { className: { target: "style" } });

/* ─── palette ──────────────────────────────────────────────────────────────
   Saturated fills with a darker "edge" underneath — the chunky, tactile look
   the rest of this screen is built on. */
const C = {
  green: "#58CC02",
  greenEdge: "#46A302",
  blue: "#1CB0F6",
  blueEdge: "#1899D6",
  brand: "#135bec",
  brandEdge: "#0e46b8",
  amber: "#FF9600",
  amberEdge: "#E08600",
  red: "#FF4B4B",
  redEdge: "#EA2B2B",
  grey: "#AFAFAF",
  greyEdge: "#8F8F8F",
};

const SCANNING_MESSAGES = [
  "Reading your timetable",
  "Finding subject codes",
  "Working out your slots",
  "Checking the rooms",
];

/** How long each subject card stays on screen before the next pops in. */
const ROW_INTERVAL_MS = 420;

const tick = (strong = false) => {
  if (Platform.OS === "android") Vibration.vibrate(strong ? 18 : 8);
  else
    Haptics.impactAsync(
      strong
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
};

/* ─── chunky button ───────────────────────────────────────────────────────── */

const ChunkyButton = ({
  label,
  color,
  edge,
  textColor = "white",
  onPress,
  disabled,
  icon,
}: {
  label: string;
  color: string;
  edge: string;
  textColor?: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) => {
  const press = useSharedValue(0);

  // The face rides on a 4px lip of the darker edge colour and sinks onto it
  // when pressed, the way a real key travels.
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 4 }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 320 });
      }}
      onPress={() => {
        tick(true);
        onPress();
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ backgroundColor: edge, borderRadius: 16, paddingBottom: 4 }}>
        <Animated.View
          style={[{ backgroundColor: color, borderRadius: 16 }, faceStyle]}
          className="h-14 items-center justify-center flex-row"
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={textColor}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={{ color: textColor }}
            className="font-extrabold text-base tracking-wide"
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

/* ─── confetti ────────────────────────────────────────────────────────────── */

const PIECE_COLORS = [C.green, C.blue, C.amber, C.brand, "#FFC800", "#CE82FF"];

const ConfettiPiece = ({ index }: { index: number }) => {
  const t = useSharedValue(0);

  // Deterministic spread so the burst looks designed rather than random noise.
  const angle = (index / 18) * Math.PI * 2;
  const distance = 90 + (index % 5) * 26;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance * 0.7;
  const color = PIECE_COLORS[index % PIECE_COLORS.length];
  const isCircle = index % 3 === 0;

  useEffect(() => {
    t.value = withDelay(
      index * 18,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
  }, [t, index]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: t.value * dx },
      // Arc outward, then let gravity take it down.
      { translateY: t.value * dy + interpolate(t.value, [0, 1], [0, 160]) },
      { rotate: `${t.value * (index % 2 ? 540 : -420)}deg` },
      { scale: interpolate(t.value, [0, 0.2, 1], [0.4, 1, 0.7]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: isCircle ? 10 : 8,
          height: isCircle ? 10 : 14,
          borderRadius: isCircle ? 5 : 2,
          backgroundColor: color,
        },
      ]}
    />
  );
};

const Confetti = () => (
  <View
    className="absolute inset-0 items-center justify-center"
    pointerEvents="none"
  >
    {Array.from({ length: 18 }, (_, i) => (
      <ConfettiPiece key={i} index={i} />
    ))}
  </View>
);

/* ─── scanning illustration ───────────────────────────────────────────────── */

const PulseRing = ({ delay }: { delay: number }) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.3, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.7, 1.9]) }],
  }));

  return (
    <Animated.View
      style={style}
      className="absolute w-44 h-44 rounded-full border-4 border-[#135bec]"
    />
  );
};

const ScannerArt = () => {
  const bob = useSharedValue(0);
  const beam = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    beam.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bob, beam]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [-7, 7]) },
      { rotate: `${interpolate(bob.value, [0, 1], [-2.5, 2.5])}deg` },
    ],
  }));

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(beam.value, [0, 1], [6, 106]) }],
    opacity: interpolate(beam.value, [0, 0.5, 1], [0.5, 1, 0.5]),
  }));

  return (
    <View className="h-56 items-center justify-center">
      <PulseRing delay={0} />
      <PulseRing delay={700} />
      <PulseRing delay={1400} />

      <Animated.View
        style={cardStyle}
        className="w-44 h-32 rounded-2xl bg-white dark:bg-[#1c2433] border-2 border-slate-200 dark:border-white/10 overflow-hidden"
      >
        {/* faux timetable grid */}
        <View className="flex-row px-3 pt-3 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="flex-1 h-3 rounded bg-[#135bec]/70" />
          ))}
        </View>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row px-3 pt-2 gap-1.5">
            {[0, 1, 2, 3].map((col) => (
              <View
                key={col}
                className={`flex-1 h-3.5 rounded ${
                  (row + col) % 3 === 0
                    ? "bg-slate-300 dark:bg-slate-600"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              />
            ))}
          </View>
        ))}

        {/* sweeping beam */}
        <Animated.View style={beamStyle} className="absolute left-0 right-0">
          <View className="h-6 bg-[#1CB0F6]/25" />
          <View className="h-1 bg-[#1CB0F6]" />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/* ─── progress bar ────────────────────────────────────────────────────────── */

const ProgressBar = ({
  value,
  indeterminate,
}: {
  value: number;
  indeterminate?: boolean;
}) => {
  const fill = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (indeterminate) {
      sweep.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    }
  }, [indeterminate, sweep]);

  useEffect(() => {
    if (!indeterminate) {
      fill.value = withSpring(value, { damping: 16, stiffness: 110, mass: 0.8 });
    }
  }, [value, indeterminate, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(fill.value * 100, 3)}%`,
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-140, 340]) }],
  }));

  return (
    <View className="h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
      {indeterminate ? (
        <Animated.View
          style={sweepStyle}
          className="h-full w-32 rounded-full bg-[#135bec]"
        >
          <View className="h-1.5 mx-2 mt-1 rounded-full bg-white/40" />
        </Animated.View>
      ) : (
        <Animated.View
          style={fillStyle}
          className="h-full rounded-full bg-[#58CC02]"
        >
          {/* the highlight that makes the fill read as glossy */}
          <View className="h-1.5 mx-2 mt-1 rounded-full bg-white/40" />
        </Animated.View>
      )}
    </View>
  );
};

/* ─── result row ──────────────────────────────────────────────────────────── */

type StatusStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  edge: string;
  label: string;
};

const statusStyles = (result: ScanResult): StatusStyle => {
  switch (result.status) {
    case "created":
      return {
        icon: "checkmark",
        color: C.green,
        edge: C.greenEdge,
        label: "Added",
      };
    case "updated":
      return { icon: "sync", color: C.blue, edge: C.blueEdge, label: "Updated" };
    case "reused":
      return {
        icon: "checkmark",
        color: C.grey,
        edge: C.greyEdge,
        label: "Already had it",
      };
    default:
      return {
        icon: "alert",
        color: C.amber,
        edge: C.amberEdge,
        label: "Skipped",
      };
  }
};

const skipExplanation = (result: ScanResult) => {
  if (result.reason === "conflict") {
    const clash = result.conflicts?.[0];
    if (!clash) return "Clashes with another subject";
    return `${formatSlot(clash.slot)} clashes with ${clash.with.join(", ")}`;
  }
  if (result.reason === "no-slots") return "Couldn't read its time slots";
  return result.detail || "Couldn't be created";
};

const ResultRow = ({ result }: { result: ScanResult }) => {
  const isDark = useColorScheme() === "dark";
  const pop = useSharedValue(0);
  const badge = useSharedValue(0);
  const style = statusStyles(result);
  const isSkipped = result.status === "skipped";

  useEffect(() => {
    pop.value = withSpring(1, { damping: 13, stiffness: 190, mass: 0.7 });
    // Badge lands a beat after the card, so the tick reads as a reaction.
    badge.value = withDelay(90, withSpring(1, { damping: 9, stiffness: 260 }));
  }, [pop, badge]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { scale: interpolate(pop.value, [0, 1], [0.86, 1]) },
      { translateY: interpolate(pop.value, [0, 1], [26, 0]) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(badge.value, [0, 1], [0, 1]) },
      { rotate: `${interpolate(badge.value, [0, 1], [-70, 0])}deg` },
    ],
  }));

  return (
    <Animated.View style={cardStyle} className="mb-3">
      <View
        style={{
          borderBottomWidth: 4,
          borderBottomColor: isSkipped
            ? isDark
              ? "#7A4E00"
              : "#FFE0B2"
            : isDark
              ? "#0b1017"
              : "#E5E7EB",
        }}
        className="flex-row items-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2433] p-3"
      >
        <Animated.View
          style={[
            badgeStyle,
            {
              backgroundColor: style.color,
              borderBottomWidth: 3,
              borderBottomColor: style.edge,
            },
          ]}
          className="w-11 h-11 rounded-full items-center justify-center"
        >
          <Ionicons name={style.icon} size={22} color="white" />
        </Animated.View>

        <View className="flex-1 ml-3">
          <Text
            className="text-base font-extrabold text-slate-900 dark:text-white"
            numberOfLines={1}
          >
            {result.code}
          </Text>
          <Text
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
            numberOfLines={1}
          >
            {result.name !== result.code ? result.name : "Not in the catalogue"}
          </Text>

          {isSkipped ? (
            <Text
              className="text-xs font-bold text-[#E08600] mt-1"
              numberOfLines={2}
            >
              {skipExplanation(result)}
            </Text>
          ) : (
            <View className="flex-row flex-wrap mt-1.5">
              {result.slots.slice(0, 3).map((slot) => (
                <View
                  key={slot}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 mr-1 mb-1"
                >
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {formatSlot(slot)}
                  </Text>
                </View>
              ))}
              {result.slots.length > 3 && (
                <View className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 mb-1">
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    +{result.slots.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text
          style={{ color: style.color }}
          className="text-[10px] font-extrabold uppercase ml-2"
        >
          {style.label}
        </Text>
      </View>
    </Animated.View>
  );
};

/* ─── celebration ─────────────────────────────────────────────────────────── */

const CountUp = ({ to }: { to: number }) => {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (to === 0) return;
    let current = 0;
    const id = setInterval(
      () => {
        current += 1;
        setN(current);
        if (current >= to) clearInterval(id);
      },
      Math.max(320 / to, 45),
    );
    return () => clearInterval(id);
  }, [to]);

  return <>{n}</>;
};

const TrophyBadge = ({ tone }: { tone: "win" | "warn" }) => {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 11, stiffness: 240 }),
    );
  }, [pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: tone === "win" ? C.green : C.amber,
          borderBottomWidth: 6,
          borderBottomColor: tone === "win" ? C.greenEdge : C.amberEdge,
        },
      ]}
      className="w-24 h-24 rounded-full items-center justify-center"
    >
      <Ionicons
        name={tone === "win" ? "trophy" : "construct"}
        size={46}
        color="white"
      />
    </Animated.View>
  );
};

/* ─── screen ──────────────────────────────────────────────────────────────── */

type Props = {
  visible: boolean;
  phase: "scanning" | "reporting" | "error";
  data?: TimetableScanResponse;
  errorMessage?: string;
  onViewTimetable: (timetableId: string) => void;
  onCreateManually: (skipped: ScanResult[], timetableId: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
};

export const TimetableScanProgress = ({
  visible,
  phase,
  data,
  errorMessage,
  onViewTimetable,
  onCreateManually,
  onRetry,
  onDismiss,
}: Props) => {
  const isDark = useColorScheme() === "dark";
  // Stable identity: this feeds a timer effect, and a fresh array every
  // render would restart the reveal on any incidental re-render.
  const results = useMemo(() => data?.results ?? [], [data]);

  const [revealed, setRevealed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const msgFade = useSharedValue(1);

  useEffect(() => {
    if (phase === "scanning") setRevealed(0);
  }, [phase]);

  // Cycle the copy with a soft cross-fade rather than a hard swap.
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => {
      msgFade.value = withSequence(
        withTiming(0, { duration: 220 }),
        withTiming(1, { duration: 320 }),
      );
      setTimeout(
        () => setMessageIndex((i) => (i + 1) % SCANNING_MESSAGES.length),
        220,
      );
    }, 2000);
    return () => clearInterval(id);
  }, [phase, msgFade]);

  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgFade.value,
    transform: [{ translateY: interpolate(msgFade.value, [0, 1], [8, 0]) }],
  }));

  // Walk the report one subject at a time, with a tick on each.
  useEffect(() => {
    if (phase !== "reporting" || revealed >= results.length) return;
    const id = setTimeout(() => {
      setRevealed((n) => n + 1);
      tick(results[revealed]?.status === "skipped");
    }, ROW_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [phase, revealed, results]);

  const finished = phase === "reporting" && revealed >= results.length;

  useEffect(() => {
    if (finished) tick(true);
  }, [finished]);

  const skipped = results.filter((r) => r.status === "skipped");
  const added = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const reused = results.filter((r) => r.status === "reused").length;
  const timetableId = data?.timetable?._id ?? "";
  const allGood = finished && skipped.length === 0 && results.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── error ── */}
          {phase === "error" && (
            <View className="items-center pt-16">
              <View
                style={{
                  backgroundColor: C.red,
                  borderBottomWidth: 6,
                  borderBottomColor: C.redEdge,
                }}
                className="w-24 h-24 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={48} color="white" />
              </View>
              <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mt-6 text-center">
                That didn&apos;t work
              </Text>
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 text-center px-4">
                {errorMessage || "Something went wrong reading that image."}
              </Text>
            </View>
          )}

          {/* ── scanning ── */}
          {phase === "scanning" && (
            <View className="pt-6">
              <ScannerArt />
              <Text className="text-2xl font-extrabold text-slate-900 dark:text-white text-center mt-4">
                Building your timetable
              </Text>
              <Animated.View style={msgStyle}>
                <Text className="text-base font-bold text-[#135bec] text-center mt-2">
                  {SCANNING_MESSAGES[messageIndex]}
                </Text>
              </Animated.View>
              <View className="mt-8">
                <ProgressBar value={0} indeterminate />
              </View>
              <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500 text-center mt-4">
                Hang tight — this can take up to a minute
              </Text>
            </View>
          )}

          {/* ── reporting / done ── */}
          {phase === "reporting" && (
            <>
              {finished ? (
                <View className="items-center pt-4 pb-2">
                  <View className="h-28 items-center justify-center">
                    {allGood && <Confetti />}
                    <TrophyBadge tone={skipped.length ? "warn" : "win"} />
                  </View>
                  <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mt-5 text-center">
                    {skipped.length ? "Almost there!" : "Timetable ready!"}
                  </Text>

                  {/* stat pills */}
                  <View className="flex-row justify-center mt-4 gap-2">
                    {[
                      { n: added, label: "added", color: C.green },
                      { n: updated, label: "updated", color: C.blue },
                      { n: reused, label: "kept", color: C.grey },
                      { n: skipped.length, label: "skipped", color: C.amber },
                    ]
                      .filter((s) => s.n > 0)
                      .map((s) => (
                        <View
                          key={s.label}
                          style={{ borderColor: s.color }}
                          className="rounded-2xl border-2 bg-white dark:bg-[#1c2433] px-3 py-2 items-center"
                        >
                          <Text
                            style={{ color: s.color }}
                            className="text-xl font-extrabold"
                          >
                            <CountUp to={s.n} />
                          </Text>
                          <Text className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                            {s.label}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              ) : (
                <View className="pb-4">
                  <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Adding your subjects
                  </Text>
                  <Text className="text-sm font-bold text-[#135bec] mt-1">
                    {Math.min(revealed + 1, results.length)} of {results.length}
                  </Text>
                </View>
              )}

              <View className="mb-5 mt-1">
                <ProgressBar
                  value={results.length ? revealed / results.length : 1}
                />
              </View>

              {results.slice(0, revealed).map((result) => (
                <ResultRow key={result.code} result={result} />
              ))}

              {results.length === 0 && (
                <View className="items-center py-14 px-6">
                  <View
                    style={{
                      backgroundColor: C.amber,
                      borderBottomWidth: 5,
                      borderBottomColor: C.amberEdge,
                    }}
                    className="w-20 h-20 rounded-full items-center justify-center"
                  >
                    <Ionicons name="scan" size={38} color="white" />
                  </View>
                  <Text className="text-lg font-extrabold text-slate-900 dark:text-white mt-5 text-center">
                    Nothing readable in that image
                  </Text>
                  <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Your timetable was created — you can add subjects to it
                    yourself.
                  </Text>
                </View>
              )}

              {/* skipped detail */}
              {finished && skipped.length > 0 && (
                <LinearGradient
                  colors={isDark ? ["#3a2a05", "#2a1f08"] : ["#FFF7E6", "#FFEFD0"]}
                  className="rounded-2xl p-4 mt-2 border-2 border-[#FF9600]/40"
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="alert-circle" size={20} color={C.amber} />
                    <Text className="text-sm font-extrabold text-[#E08600] ml-2">
                      {skipped.length} left out
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-[#B36B00] dark:text-amber-300 leading-4">
                    Their slots clash, so we didn&apos;t guess. Add them yourself
                    and pick the slots you actually attend.
                  </Text>
                </LinearGradient>
              )}
            </>
          )}
        </ScrollView>

        {/* ── actions ── */}
        <View className="px-5 pb-5 pt-3 gap-3 bg-[#f6f6f8] dark:bg-[#101622]">
          {phase === "error" ? (
            <>
              <ChunkyButton
                label="TRY AGAIN"
                icon="refresh"
                color={C.brand}
                edge={C.brandEdge}
                onPress={onRetry}
              />
              <ChunkyButton
                label="GO BACK"
                color={C.grey}
                edge={C.greyEdge}
                onPress={onDismiss}
              />
            </>
          ) : (
            <>
              {finished && skipped.length > 0 && (
                <ChunkyButton
                  label="ADD THE REST"
                  icon="add-circle"
                  color={C.amber}
                  edge={C.amberEdge}
                  onPress={() => onCreateManually(skipped, timetableId)}
                />
              )}
              <ChunkyButton
                label={finished ? "SEE MY TIMETABLE" : "HANG TIGHT…"}
                color={
                  finished ? (skipped.length ? C.grey : C.green) : C.grey
                }
                edge={
                  finished
                    ? skipped.length
                      ? C.greyEdge
                      : C.greenEdge
                    : C.greyEdge
                }
                disabled={!finished}
                onPress={() => onViewTimetable(timetableId)}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TimetableScanProgress;
