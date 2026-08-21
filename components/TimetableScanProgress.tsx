import { useScanFeedback } from "@/hooks/useScanFeedback";
import {
  formatSlot,
  ScanResult,
  TimetableScanResponse,
} from "@/types/timetableScan";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  Vibration,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  SharedValue,
  useAnimatedProps,
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

/** Animated text without React re-renders: the value is written on the UI thread. */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/* ─── palette ─────────────────────────────────────────────────────────────── */

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

/** Gap between subject cards landing. Paced to the length of the cue that
 *  plays with each one, so the sound and the card land together. */
const ROW_INTERVAL_MS = 600;

/** Playing a clip costs a JS->native round trip, so the cue is fired slightly
 *  ahead of the card's animation to make the two coincide. */
const AUDIO_LEAD_MS = 90;

/** Matches the beam sweep in ScannerArt, so the tick reads as the beam passing. */
const SCAN_TICK_MS = 1600;

/**
 * The bar climbs steadily to 99% over 20s while the scan runs — about how long
 * a scan takes — then the reveal carries it to 100%. It stops just short so it
 * never claims to be done before the subjects are actually in.
 */
const SCAN_CEILING = 0.99;
const SCAN_CREEP_MS = 20000;

/* ─── chunky button ───────────────────────────────────────────────────────── */

const ChunkyButton = ({
  label,
  color,
  edge,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  color: string;
  edge: string;
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
        press.value = withTiming(1, { duration: 55 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 13, stiffness: 340 });
      }}
      onPress={() => {
        Vibration.vibrate(15);
        onPress();
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{ backgroundColor: edge, borderRadius: 16, paddingBottom: 4 }}
      >
        <Animated.View
          style={[{ backgroundColor: color, borderRadius: 16 }, faceStyle]}
          className="h-14 items-center justify-center flex-row"
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text className="text-white font-extrabold text-base tracking-wide">
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

/* ─── confetti ────────────────────────────────────────────────────────────── */

const PIECE_COLORS = [C.green, C.blue, C.amber, C.brand, "#FFC800", "#CE82FF"];
const PIECE_COUNT = 14;

const ConfettiPiece = React.memo(({ index }: { index: number }) => {
  const t = useSharedValue(0);

  // Deterministic spread so the burst looks designed rather than random noise.
  const angle = (index / PIECE_COUNT) * Math.PI * 2;
  const distance = 95 + (index % 4) * 28;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance * 0.65;
  const spin = index % 2 ? 460 : -380;
  const color = PIECE_COLORS[index % PIECE_COLORS.length];
  const isCircle = index % 3 === 0;

  useEffect(() => {
    t.value = withDelay(
      index * 16,
      withTiming(1, { duration: 1150, easing: Easing.out(Easing.cubic) }),
    );
  }, [t, index]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: t.value * dx },
      // Arc outward, then let gravity take over.
      { translateY: t.value * dy + interpolate(t.value, [0, 1], [0, 170]) },
      { rotate: `${t.value * spin}deg` },
      { scale: interpolate(t.value, [0, 0.18, 1], [0.3, 1, 0.65]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: isCircle ? 10 : 7,
          height: isCircle ? 10 : 14,
          borderRadius: isCircle ? 5 : 2,
          backgroundColor: color,
        },
      ]}
    />
  );
});
ConfettiPiece.displayName = "ConfettiPiece";

const Confetti = () => (
  <View
    className="absolute inset-0 items-center justify-center"
    pointerEvents="none"
  >
    {Array.from({ length: PIECE_COUNT }, (_, i) => (
      <ConfettiPiece key={i} index={i} />
    ))}
  </View>
);

/* ─── scanning illustration ───────────────────────────────────────────────── */

/**
 * One filled halo rather than several stroked rings — a solid layer composites
 * far more cheaply than an animated border, which has to re-rasterise.
 */
const Halo = () => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.25, 1], [0, 0.22, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.75, 1.75]) }],
  }));

  return (
    <Animated.View
      style={style}
      className="absolute w-48 h-48 rounded-full bg-[#135bec]"
    />
  );
};

const ScannerArt = () => {
  const float = useSharedValue(0);
  const beam = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    beam.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [float, beam]);

  // Translate and scale only. Rotating this subtree forced a re-raster every
  // frame, which is what made the old version stutter.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-8, 8]) },
      { scale: interpolate(float.value, [0, 1], [0.98, 1.02]) },
    ],
  }));

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(beam.value, [0, 1], [0, 104]) }],
  }));

  return (
    <View className="h-52 items-center justify-center">
      <Halo />

      <Animated.View
        style={cardStyle}
        className="w-40 h-32 rounded-2xl bg-white dark:bg-[#1c2433] border-2 border-slate-200 dark:border-white/10 overflow-hidden"
      >
        <View className="flex-row px-3 pt-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-1 h-3 rounded bg-[#135bec]/70" />
          ))}
        </View>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row px-3 pt-2.5 gap-1.5">
            {[0, 1, 2].map((col) => (
              <View
                key={col}
                className={`flex-1 h-4 rounded ${
                  (row + col) % 3 === 0
                    ? "bg-slate-300 dark:bg-slate-600"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              />
            ))}
          </View>
        ))}

        <Animated.View style={beamStyle} className="absolute left-0 right-0">
          <View className="h-7 bg-[#1CB0F6]/20" />
          <View className="h-[3px] bg-[#1CB0F6]" />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/* ─── progress bar ────────────────────────────────────────────────────────── */

const ProgressBar = ({ progress }: { progress: SharedValue<number> }) => {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value * 100, 2)}%`,
  }));

  const percentProps = useAnimatedProps(
    () => ({ text: `${Math.round(progress.value * 100)}%` }) as any,
  );

  return (
    <View>
      <View className="h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <Animated.View
          style={fillStyle}
          className="h-full rounded-full bg-[#58CC02]"
        >
          {/* the highlight that makes the fill read as glossy */}
          <View className="h-1.5 mx-2 mt-1 rounded-full bg-white/40" />
        </Animated.View>
      </View>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        defaultValue="0%"
        animatedProps={percentProps}
        style={{
          padding: 0,
          marginTop: 6,
          textAlign: "right",
          fontSize: 12,
          fontWeight: "800",
          color: C.green,
        }}
      />
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

/**
 * Rows all mount at once and stagger themselves on the UI thread. The old
 * version mounted them from a chained JS timer, so every card cost a React
 * render of the whole list and the cadence drifted whenever JS was busy.
 */
const ResultRow = React.memo(
  ({ result, index }: { result: ScanResult; index: number }) => {
    const isDark = useColorScheme() === "dark";
    const pop = useSharedValue(0);
    const badge = useSharedValue(0);
    const style = statusStyles(result);
    const isSkipped = result.status === "skipped";
    const delay = index * ROW_INTERVAL_MS;

    useEffect(() => {
      // Heavier spring: the card takes ~300ms to settle, matching the cue.
      pop.value = withDelay(
        delay,
        withSpring(1, { damping: 15, stiffness: 170, mass: 0.85 }),
      );
      // Badge lands a beat after the card, so the tick reads as a reaction.
      badge.value = withDelay(
        delay + 150,
        withSpring(1, { damping: 9, stiffness: 260 }),
      );
    }, [pop, badge, delay]);

    const cardStyle = useAnimatedStyle(() => ({
      opacity: pop.value,
      transform: [
        { scale: interpolate(pop.value, [0, 1], [0.9, 1]) },
        { translateY: interpolate(pop.value, [0, 1], [24, 0]) },
      ],
    }));

    const badgeStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: badge.value },
        { rotate: `${interpolate(badge.value, [0, 1], [-60, 0])}deg` },
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
              {result.name !== result.code
                ? result.name
                : "Not in the catalogue"}
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
  },
);
ResultRow.displayName = "ResultRow";

/* ─── celebration ─────────────────────────────────────────────────────────── */

/** Counts up on the UI thread — the old JS interval re-rendered every 45ms. */
const CountUp = ({ to, color }: { to: number; color: string }) => {
  const n = useSharedValue(0);

  useEffect(() => {
    n.value = withTiming(to, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });
  }, [n, to]);

  const props = useAnimatedProps(
    () => ({ text: `${Math.round(n.value)}` }) as any,
  );

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue="0"
      animatedProps={props}
      style={{
        padding: 0,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "800",
        color,
      }}
    />
  );
};

const TrophyBadge = () => {
  const pop = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    pop.value = withSequence(
      withSpring(1.18, { damping: 7, stiffness: 220 }),
      withSpring(1, { damping: 10, stiffness: 250 }),
    );
    // A slow sweep keeps the finished state from feeling frozen.
    shine.value = withDelay(
      420,
      withRepeat(withTiming(1, { duration: 2600 }), -1, false),
    );
  }, [pop, shine]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.1, 0.35, 1], [0, 0.45, 0, 0]),
    transform: [
      { rotate: "24deg" },
      { translateX: interpolate(shine.value, [0, 0.35], [-70, 70]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: C.green,
          borderBottomWidth: 6,
          borderBottomColor: C.greenEdge,
        },
      ]}
      className="w-24 h-24 rounded-full items-center justify-center overflow-hidden"
    >
      <Animated.View
        style={shineStyle}
        className="absolute w-6 h-40 bg-white"
        pointerEvents="none"
      />
      <Ionicons name="trophy" size={46} color="white" />
    </Animated.View>
  );
};

/* ─── screen ──────────────────────────────────────────────────────────────── */

type Props = {
  visible: boolean;
  phase: "scanning" | "reporting" | "error";
  data?: TimetableScanResponse;
  errorMessage?: string;
  onViewTimetables: () => void;
  onRetry: () => void;
  onDismiss: () => void;
};

export const TimetableScanProgress = ({
  visible,
  phase,
  data,
  errorMessage,
  onViewTimetables,
  onRetry,
  onDismiss,
}: Props) => {
  const isDark = useColorScheme() === "dark";
  const feedback = useScanFeedback();

  // Stable identity: this feeds timer effects, and a fresh array every render
  // would restart them on any incidental re-render.
  const results = useMemo(() => data?.results ?? [], [data]);

  const [finished, setFinished] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const progress = useSharedValue(0);
  const msgFade = useSharedValue(1);

  /* One bar for the whole flow: it creeps while the scan runs, then finishes
     as the subjects land. It never goes backwards and never sits at 100%. */
  useEffect(() => {
    if (phase !== "scanning") return;
    setFinished(false);
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(SCAN_CEILING, {
      duration: SCAN_CREEP_MS,
      easing: Easing.linear,
    });
  }, [phase, progress]);

  useEffect(() => {
    if (phase !== "reporting") return;

    const total = results.length;
    cancelAnimation(progress);

    if (total === 0) {
      progress.value = withTiming(1, { duration: 400 });
      setFinished(true);
      feedback("complete");
      return;
    }

    const runFor = total * ROW_INTERVAL_MS;
    progress.value = withTiming(1, { duration: runFor, easing: Easing.linear });

    // Scheduled up front from one origin, so the cues stay in step with the
    // card animations instead of drifting the way a chained timer does.
    const timers = results.map((result, i) =>
      setTimeout(
        () => feedback(result.status === "skipped" ? "skip" : "pop"),
        Math.max(0, i * ROW_INTERVAL_MS - AUDIO_LEAD_MS),
      ),
    );
    const done = setTimeout(() => {
      setFinished(true);
      feedback("complete");
    }, runFor + 120);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [phase, results, progress, feedback]);

  // A quiet tick each time the beam sweeps, so the wait has a pulse to it.
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => feedback("scan"), SCAN_TICK_MS);
    return () => clearInterval(id);
  }, [phase, feedback]);

  // Cycle the copy with a soft cross-fade rather than a hard swap.
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => {
      msgFade.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 300 }),
      );
      setTimeout(
        () => setMessageIndex((i) => (i + 1) % SCANNING_MESSAGES.length),
        200,
      );
    }, 2200);
    return () => clearInterval(id);
  }, [phase, msgFade]);

  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgFade.value,
    transform: [{ translateY: interpolate(msgFade.value, [0, 1], [10, 0]) }],
  }));

  const skipped = results.filter((r) => r.status === "skipped");
  const added = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const reused = results.filter((r) => r.status === "reused").length;
  // The timetable is created either way — a clash only means a subject was
  // left off it — so the finish always reads as a success.
  const scannedAnything = results.length > 0;

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
                <ProgressBar progress={progress} />
              </View>
            </View>
          )}

          {/* ── reporting / done ── */}
          {phase === "reporting" && (
            <>
              {finished ? (
                <View className="items-center pt-4 pb-2">
                  {scannedAnything && (
                    <>
                      <View className="h-28 items-center justify-center">
                        <Confetti />
                        <TrophyBadge />
                      </View>
                      <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mt-5 text-center">
                        Timetable ready!
                      </Text>
                    </>
                  )}

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
                          style={{ borderColor: s.color, minWidth: 74 }}
                          className="rounded-2xl border-2 bg-white dark:bg-[#1c2433] px-3 py-2 items-center"
                        >
                          <CountUp to={s.n} color={s.color} />
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
                    {results.length} found on your timetable
                  </Text>
                </View>
              )}

              <View className="mb-5 mt-1">
                <ProgressBar progress={progress} />
              </View>

              {results.map((result, index) => (
                <ResultRow key={result.code} result={result} index={index} />
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

              {finished && skipped.length > 0 && (
                <LinearGradient
                  colors={
                    isDark ? ["#3a2a05", "#2a1f08"] : ["#FFF7E6", "#FFEFD0"]
                  }
                  className="rounded-2xl p-4 mt-2 border-2 border-[#FF9600]/40"
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="alert-circle" size={20} color={C.amber} />
                    <Text className="text-sm font-extrabold text-[#E08600] ml-2">
                      {skipped.length} subject{skipped.length === 1 ? "" : "s"} not added
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-[#B36B00] dark:text-amber-300 leading-4">
                    Your timetable was created without them. Their slots clash with
                    each other, so we left them out rather than guess which one you
                    actually attend.
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
            <ChunkyButton
              label={finished ? "SEE MY TIMETABLES" : "HANG TIGHT…"}
              color={finished ? C.green : C.grey}
              edge={finished ? C.greenEdge : C.greyEdge}
              disabled={!finished}
              onPress={onViewTimetables}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TimetableScanProgress;
