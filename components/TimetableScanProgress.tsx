import {
  formatSlot,
  ScanResult,
  TimetableScanResponse,
} from "@/types/timetableScan";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCANNING_MESSAGES = [
  "Uploading your timetable",
  "Reading the grid",
  "Matching subject codes",
  "Working out your slots",
];

/** How long each subject row lingers before the next one appears. */
const ROW_INTERVAL_MS = 320;

type StatusStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
};

const statusStyles = (result: ScanResult): StatusStyle => {
  switch (result.status) {
    case "created":
      return { icon: "checkmark-circle", color: "#10b981", label: "Created" };
    case "updated":
      return { icon: "sync-circle", color: "#3b82f6", label: "Slots updated" };
    case "reused":
      return { icon: "checkmark-circle-outline", color: "#64748b", label: "Already yours" };
    default:
      return { icon: "alert-circle", color: "#f59e0b", label: "Skipped" };
  }
};

const skipExplanation = (result: ScanResult) => {
  if (result.reason === "conflict") {
    const clash = result.conflicts?.[0];
    if (!clash) return "Clashes with another subject";
    return `${formatSlot(clash.slot)} clashes with ${clash.with.join(", ")}`;
  }
  if (result.reason === "no-slots") return "No time slots could be read for this code";
  return result.detail || "Could not be created";
};

/** One subject line, fading and sliding in as the replay reaches it. */
const ResultRow = ({ result }: { result: ScanResult }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const style = statusStyles(result);
  const isSkipped = result.status === "skipped";

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
      className="flex-row items-start py-3 border-b border-slate-100 dark:border-slate-800"
    >
      <Ionicons name={style.icon} size={20} color={style.color} style={{ marginTop: 1 }} />

      <View className="flex-1 ml-3">
        <Text
          className="text-sm font-semibold text-slate-900 dark:text-white"
          numberOfLines={1}
        >
          {result.code}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
          {result.name !== result.code ? result.name : "Not in the subject catalogue"}
        </Text>

        {isSkipped ? (
          <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {skipExplanation(result)}
          </Text>
        ) : (
          <Text className="text-[11px] text-slate-400 dark:text-slate-500 mt-1" numberOfLines={2}>
            {result.slots.map(formatSlot).join(" · ")}
          </Text>
        )}
      </View>

      <Text className="text-[11px] font-semibold ml-2" style={{ color: style.color }}>
        {style.label}
      </Text>
    </Animated.View>
  );
};

type Props = {
  visible: boolean;
  phase: "scanning" | "reporting" | "error";
  data?: TimetableScanResponse;
  errorMessage?: string;
  onViewTimetable: (timetableId: string) => void;
  onCreateManually: (codes: string[], timetableId: string) => void;
  onDismiss: () => void;
};

export const TimetableScanProgress = ({
  visible,
  phase,
  data,
  errorMessage,
  onViewTimetable,
  onCreateManually,
  onDismiss,
}: Props) => {
  const results = data?.results ?? [];

  const [revealed, setRevealed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Reset whenever a fresh upload starts.
  useEffect(() => {
    if (phase === "scanning") {
      setRevealed(0);
      progress.setValue(0);
    }
  }, [phase, progress]);

  // Cycle the reassuring copy while the scan is in flight.
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(
      () => setMessageIndex((i) => (i + 1) % SCANNING_MESSAGES.length),
      1600,
    );
    return () => clearInterval(id);
  }, [phase]);

  // Indeterminate sweep for the scanning bar.
  useEffect(() => {
    if (phase !== "scanning") return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmer.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [phase, shimmer]);

  // Walk the report one subject at a time so the student can follow along.
  useEffect(() => {
    if (phase !== "reporting" || revealed >= results.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), ROW_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [phase, revealed, results.length]);

  useEffect(() => {
    if (phase !== "reporting" || results.length === 0) return;
    Animated.timing(progress, {
      toValue: revealed / results.length,
      duration: ROW_INTERVAL_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [revealed, results.length, phase, progress]);

  const finished = phase === "reporting" && revealed >= results.length;
  const skipped = results.filter((r) => r.status === "skipped");
  const attached = results.length - skipped.length;
  const timetableId = data?.timetable?._id ?? "";

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onDismiss}>
      <SafeAreaView className="flex-1 bg-white dark:bg-[#101622]">
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {phase === "error"
              ? "Upload failed"
              : finished
                ? "Timetable ready"
                : "Building your timetable"}
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {phase === "error"
              ? errorMessage || "Something went wrong reading that image."
              : phase === "scanning"
                ? SCANNING_MESSAGES[messageIndex]
                : finished
                  ? `${attached} subject${attached === 1 ? "" : "s"} added${
                      skipped.length ? ` · ${skipped.length} skipped` : ""
                    }`
                  : `Adding subject ${Math.min(revealed + 1, results.length)} of ${results.length}`}
          </Text>
        </View>

        {/* Progress track */}
        {phase !== "error" && (
          <View className="px-6">
            <View className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              {phase === "scanning" ? (
                <Animated.View
                  className="h-full w-1/3 rounded-full bg-[#135bec]"
                  style={{
                    transform: [
                      {
                        translateX: shimmer.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-120, 320],
                        }),
                      },
                    ],
                  }}
                />
              ) : (
                <Animated.View
                  className="h-full rounded-full bg-[#135bec]"
                  style={{
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  }}
                />
              )}
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1 px-6 mt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {phase === "scanning" && (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#135bec" />
              <Text className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                This usually takes a few seconds
              </Text>
            </View>
          )}

          {phase === "reporting" &&
            results
              .slice(0, revealed)
              .map((result) => <ResultRow key={result.code} result={result} />)}

          {phase === "reporting" && results.length === 0 && (
            <View className="items-center py-16 px-4">
              <Ionicons name="scan-outline" size={40} color="#94a3b8" />
              <Text className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
                No subject codes could be read from that image. Your timetable was
                created — you can add subjects to it manually.
              </Text>
            </View>
          )}

          {/* What was skipped, and why */}
          {finished && skipped.length > 0 && (
            <View className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                <Text className="text-sm font-bold text-amber-800 dark:text-amber-300 ml-2">
                  {skipped.length} subject{skipped.length === 1 ? "" : "s"} skipped
                </Text>
              </View>
              <Text className="text-xs text-amber-700 dark:text-amber-400 leading-4 mb-3">
                These were left off because their slots clash. Create them yourself and
                pick the slots you actually attend.
              </Text>
              {skipped.map((result) => (
                <View key={result.code} className="mt-2">
                  <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    {result.code}
                    {result.name !== result.code ? ` · ${result.name}` : ""}
                  </Text>
                  <Text className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {skipExplanation(result)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View className="px-6 pb-6 pt-2 gap-3">
          {phase === "error" ? (
            <TouchableOpacity
              onPress={onDismiss}
              className="h-14 rounded-xl items-center justify-center bg-[#135bec]"
            >
              <Text className="text-white font-bold text-base">Back</Text>
            </TouchableOpacity>
          ) : (
            <>
              {finished && skipped.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    onCreateManually(
                      skipped.map((result) => result.code),
                      timetableId,
                    )
                  }
                  className="h-14 rounded-xl items-center justify-center bg-[#135bec]"
                >
                  <Text className="text-white font-bold text-base">
                    Create the skipped subjects
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                disabled={!finished}
                onPress={() => onViewTimetable(timetableId)}
                className={`h-14 rounded-xl items-center justify-center ${
                  !finished
                    ? "bg-slate-200 dark:bg-slate-800"
                    : skipped.length > 0
                      ? "bg-slate-100 dark:bg-slate-800"
                      : "bg-[#135bec]"
                }`}
              >
                <Text
                  className={`font-bold text-base ${
                    !finished
                      ? "text-slate-400 dark:text-slate-600"
                      : skipped.length > 0
                        ? "text-slate-700 dark:text-slate-200"
                        : "text-white"
                  }`}
                >
                  {finished ? "View timetable" : "Please wait…"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TimetableScanProgress;
