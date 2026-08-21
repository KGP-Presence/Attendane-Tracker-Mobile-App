import { ClassSession } from "@/hooks/scheduleLogic";
import { useAttendanceSounds } from "@/hooks/useAttendanceSound";
import { useCreateAttendance } from "@/hooks/useCreateAttendance";
import { api, attendanceApi } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Activity,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  MapPin,
  Pencil,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AttendanceEditPopup, AttendanceStatus } from "./AttendanceEditPopup";
import { StatusButton } from "./StatusButton";

// --- JUICY PHYSICS-BASED ANIMATION OVERLAY ---
const StatusAnimation = ({
  status,
  onComplete,
}: {
  status: string;
  onComplete: () => void;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Reanimated Shared Values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  // Ring/Burst effect shared values
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);

  // Dynamic Colors for Light/Dark modes
  const colors: Record<string, string> = {
    PRESENT: isDark ? "#34d399" : "#10b981", // Emerald
    ABSENT: isDark ? "#fb7185" : "#f43f5e", // Rose
    MEDICAL: isDark ? "#fbbf24" : "#f59e0b", // Amber
    CANCELLED: isDark ? "#94a3b8" : "#64748b", // Slate
  };
  const color = colors[status] || colors.PRESENT;

  const Icons: Record<string, any> = {
    PRESENT: CheckCircle,
    ABSENT: XCircle,
    MEDICAL: Activity,
    CANCELLED: Ban,
  };
  const Icon = Icons[status] || CheckCircle;

  useEffect(() => {
    // 1. Fade in the background blur/dim instantly
    bgOpacity.value = withTiming(1, { duration: 150 });

    // 2. Trigger the specific bouncy animation for ALL statuses
    // THE INSTAGRAM POP: Extreme pop with overshoot and a burst ring
    scale.value = withSpring(1, { mass: 1, damping: 5, stiffness: 350 });

    // Ring burst effect
    ringScale.value = withTiming(2, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    ringOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.in(Easing.quad),
    });

    // 3. Exit Animation & Cleanup (Reanimated v4 friendly: pure JS timeouts)
    // Start exit animation at 750ms
    const exitTimeout = setTimeout(() => {
      // Shrink back down dynamically (the "reverse pop")
      scale.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.back(2)),
      });
      opacity.value = withTiming(0, { duration: 200 });
      bgOpacity.value = withTiming(0, { duration: 250 });
    }, 750);

    // Completely unmount and trigger the actual mutation at 1000ms
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(completeTimeout);
    };
  }, [status]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: "center", alignItems: "center", zIndex: 100 },
      ]}
      pointerEvents="box-none"
    >
      {/* Background Dimming (Subtle overlay) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(15, 23, 42, 0.45)"
              : "rgba(255, 255, 255, 0.65)",
            borderRadius: 24,
          },
          useAnimatedStyle(() => ({ opacity: bgOpacity.value })),
        ]}
        pointerEvents="auto"
      />

      {/* Burst Ring (Now active for ALL statuses) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: 45,
            borderWidth: 4,
            borderColor: color,
          },
          animatedRingStyle,
        ]}
        pointerEvents="none"
      />

      {/* Main Bouncing Icon */}
      <Animated.View
        style={[
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            padding: 18,
            borderRadius: 100,
            shadowColor: color,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.8 : 0.4,
            shadowRadius: 15,
            elevation: 12,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent",
          },
          animatedIconStyle,
        ]}
        pointerEvents="none"
      >
        <Icon size={64} color={color} strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
};
// --- END ANIMATION COMPONENT ---

export const ClassCard = ({
  item,
  timetableId,
  selectedDate,
  playSound,
}: {
  item: ClassSession;
  timetableId: string;
  selectedDate: string;
  playSound: (status: string) => void;
}) => {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [pendingAnimation, setPendingAnimation] = useState<string | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, string>
  >({});
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { mutate } = useCreateAttendance({ timetableId, date: selectedDate });

  // Clear optimistic statuses when real API data updates
  useEffect(() => {
    setOptimisticStatuses((prev) => {
      const updated = { ...prev };
      let changed = false;
      (item.slotDetails || []).forEach((slot) => {
        if (slot.status !== "UNMARKED" && updated[slot.timeSlot]) {
          delete updated[slot.timeSlot];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [item.slotDetails]);

  const editMutation = useMutation({
    mutationFn: async ({
      attendanceId,
      type,
    }: {
      attendanceId: string;
      type: string;
    }) => {
      return await attendanceApi.editAttendanceStatus(api, attendanceId, type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      console.error("Failed to update attendance:", error);
    },
  });

  const getSlotDisplayStatus = (slot: { timeSlot: string; status: string }) =>
    optimisticStatuses[slot.timeSlot] || slot.status;

  const handleOpenSubjectDetails = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    router.push(`/subject/details/${item.subjectId}`);
  };

  const applyOptimisticStatusForSlots = (
    slots: { timeSlot: string }[],
    statusName: string,
  ) => {
    const optimisticUpdate = slots.reduce<Record<string, string>>(
      (acc, slot) => {
        acc[slot.timeSlot] = statusName;
        return acc;
      },
      {},
    );
    setOptimisticStatuses((prev) => ({ ...prev, ...optimisticUpdate }));
  };

  const handleMarkAttendance = (status: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(40);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }

    // Play custom sound
    playSound(status);

    // 1. Optimistically update all unmarked slots
    const newOptimistic: Record<string, string> = {};
    item.slotDetails.forEach((slot) => {
      if (getSlotDisplayStatus(slot) === "UNMARKED") {
        newOptimistic[slot.timeSlot] = status;
      }
    });
    setOptimisticStatuses((prev) => ({ ...prev, ...newOptimistic }));

    // 2. Trigger animation
    setPendingAnimation(status);

    // 3. Fire one API call per unmarked slot (hourly basis)
    console.log(item);
    item.slotDetails.forEach((slot) => {
      if (slot.status === "UNMARKED") {
        mutate(
          {
            subjectId: item.subjectId,
            day: item.day,
            type: status,
            timeSlot: slot.timeSlot,
            date: selectedDate,
            semester: item.semester,
          },
          {
            onError: (error) => {
              console.error("Attendance mutation failed:", error);
              setOptimisticStatuses((prev) => {
                const updated = { ...prev };
                delete updated[slot.timeSlot];
                return updated;
              });
              Alert.alert(
                "Update Failed",
                "Couldn't save attendance for " +
                  slot.timeSlot +
                  ". Please try again.",
              );
            },
          },
        );
      }
    });
  };

  const handleMarkSingleSlot = (
    slot: {
      attendanceId?: string;
      status: string;
      timeSlot: string;
    },
    statusName: string,
  ) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(30);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }

    // Play custom sound
    playSound(statusName);

    applyOptimisticStatusForSlots([slot], statusName);
    setPendingAnimation(statusName);

    if (slot.attendanceId) {
      editMutation.mutate(
        {
          attendanceId: slot.attendanceId,
          type: statusName,
        },
        {
          onError: () => {
            setOptimisticStatuses((prev) => {
              const updated = { ...prev };
              delete updated[slot.timeSlot];
              return updated;
            });
            Alert.alert(
              "Update Failed",
              `Couldn't save attendance for ${slot.timeSlot}. Please try again.`,
            );
          },
        },
      );
      return;
    }

    mutate(
      {
        subjectId: item.subjectId,
        day: item.day,
        type: statusName,
        timeSlot: slot.timeSlot,
        date: selectedDate,
        semester: item.semester,
      },
      {
        onError: () => {
          setOptimisticStatuses((prev) => {
            const updated = { ...prev };
            delete updated[slot.timeSlot];
            return updated;
          });
          Alert.alert(
            "Update Failed",
            `Couldn't save attendance for ${slot.timeSlot}. Please try again.`,
          );
        },
      },
    );
  };

  const mapStatusForEditor = (status: string): AttendanceStatus | undefined => {
    switch (status.toUpperCase()) {
      case "PRESENT":
        return "P";
      case "ABSENT":
        return "A";
      case "MEDICAL":
        return "M";
      case "CANCELLED":
        return "C";
      default:
        return undefined;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status.toUpperCase()) {
      case "PRESENT":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          text: "text-emerald-700 dark:text-emerald-400",
        };
      case "ABSENT":
        return {
          bg: "bg-rose-50 dark:bg-rose-500/10",
          text: "text-rose-700 dark:text-rose-400",
        };
      case "MEDICAL":
        return {
          bg: "bg-amber-50 dark:bg-amber-500/10",
          text: "text-amber-700 dark:text-amber-400",
        };
      case "CANCELLED":
        return {
          bg: "bg-slate-50 dark:bg-slate-700/40",
          text: "text-slate-600 dark:text-slate-300",
        };
      default:
        return {
          bg: "bg-green-500/10",
          text: "text-green-600 dark:text-green-400",
        };
    }
  };

  // Per-slot display status helpers
  const isMultiSlot = item.slotDetails.length > 1;
  const slotDisplayStatuses = item.slotDetails.map((s) =>
    getSlotDisplayStatus(s),
  );
  const allUnmarked = slotDisplayStatuses.every((s) => s === "UNMARKED");
  const allSameStatus =
    !allUnmarked &&
    slotDisplayStatuses.every((s) => s === slotDisplayStatuses[0]);
  const displayStatus = allUnmarked ? "UNMARKED" : slotDisplayStatuses[0];
  const statusColors = getStatusColors(displayStatus);

  return (
    <View className="relative mb-6 ml-2">
      <View className="absolute -left-[26px] top-4 bottom-[-24px] w-[2px] bg-slate-200 dark:bg-slate-800" />
      <View className="absolute -left-[32px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900 shadow-lg shadow-blue-500/50" />

      <View className="flex-row justify-between mb-3 items-center">
        <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
          <Clock size={12} color="#3b82f6" />
          <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 ml-1.5">
            {item.time}
          </Text>
        </View>
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {item.slotDetails.length === 1
            ? "1 SLOT"
            : `${item.slotDetails.length} SLOTS`}
        </Text>
      </View>

      <View
        className="bg-white dark:bg-slate-800 p-5 rounded-[24px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-700/50 relative overflow-hidden"
        style={{ elevation: 4 }}
      >
        <View className="flex-row justify-between items-start">
          <TouchableOpacity
            className="flex-1 pr-2"
            activeOpacity={0.8}
            onPress={handleOpenSubjectDetails}
          >
            <Text className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest mb-1">
              {item.subjectCode}
            </Text>
            <Text className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
              {item.subjectName}
            </Text>

            <View className="flex-row items-center justify-between mt-3 opacity-70">
              <View className="flex-row items-center">
                <View className="flex-row items-center mr-4">
                  <MapPin size={14} color="#64748b" strokeWidth={2.5} />
                  <Text className="text-slate-600 dark:text-slate-400 text-xs font-semibold ml-1">
                    {item.location}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Code size={14} color="#64748b" strokeWidth={2.5} />
                  <Text className="text-slate-600 dark:text-slate-400 text-xs font-semibold ml-1">
                    Semester {item.semester}
                  </Text>
                </View>
              </View>

              {isMultiSlot && (
                <TouchableOpacity
                  onPress={() => {
                    setIsExpanded((prev) => !prev);
                  }}
                  className="p-2 -mr-2"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isExpanded ? (
                    <ChevronUp size={16} color="#94a3b8" />
                  ) : (
                    <ChevronDown size={16} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          {!allUnmarked && !(isMultiSlot && isExpanded) && (
            <TouchableOpacity
              className="p-2 -mr-2"
              onPress={() => {
                setIsBulkEditing(true);
              }}
            >
              <Pencil size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {allUnmarked && !(isMultiSlot && isExpanded) ? (
          <View className="flex-row justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/50">
            <StatusButton
              icon={CheckCircle}
              color="#10b981"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
              text="PRESENT"
              textColor="text-emerald-700 dark:text-emerald-400"
              onSubmit={handleMarkAttendance}
            />
            <StatusButton
              icon={XCircle}
              color="#f43f5e"
              bg="bg-rose-50 dark:bg-rose-500/10"
              text="ABSENT"
              textColor="text-rose-700 dark:text-rose-400"
              onSubmit={handleMarkAttendance}
            />
            <StatusButton
              icon={Activity}
              color="#f59e0b"
              bg="bg-amber-50 dark:bg-amber-500/10"
              text="MEDICAL"
              textColor="text-amber-700 dark:text-amber-400"
              onSubmit={handleMarkAttendance}
            />
            <StatusButton
              icon={Ban}
              color="#94a3b8"
              bg="bg-slate-50 dark:bg-slate-700/40"
              text="CANCELLED"
              textColor="text-slate-600 dark:text-slate-300"
              onSubmit={handleMarkAttendance}
            />
          </View>
        ) : isMultiSlot && !isExpanded && allSameStatus ? (
          <View className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex-row items-center justify-between">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Attendance Logged
            </Text>
            <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
              <Text
                className={`text-xs font-black uppercase ${statusColors.text}`}
              >
                {displayStatus}
              </Text>
            </View>
          </View>
        ) : !isMultiSlot ? (
          <View className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex-row items-center justify-between">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Attendance Logged
            </Text>
            <View className={`px-3 py-1 rounded-full ${statusColors.bg}`}>
              <Text
                className={`text-xs font-black uppercase ${statusColors.text}`}
              >
                {displayStatus}
              </Text>
            </View>
          </View>
        ) : null}

        {isMultiSlot && isExpanded && (
          <View className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              Individual Slot Marking
            </Text>
            <View className="gap-3">
              {item.slotDetails.map((slot, index) => {
                const slotStatus = getSlotDisplayStatus(slot);
                const colors = getStatusColors(slotStatus);

                return (
                  <View
                    key={slot.timeSlot}
                    className="rounded-xl border border-slate-100 dark:border-slate-700/60 p-3"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {slot.timeSlot}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`px-2 py-0.5 rounded-full ${colors.bg}`}
                        >
                          <Text
                            className={`text-[10px] font-bold uppercase ${colors.text}`}
                          >
                            {slotStatus}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setEditingSlotIndex(index)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {slotStatus === "UNMARKED" && (
                      <View className="flex-row justify-between gap-2">
                        <TouchableOpacity
                          onPress={() => handleMarkSingleSlot(slot, "PRESENT")}
                          className="flex-1 items-center py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10"
                        >
                          <CheckCircle size={14} color="#10b981" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleMarkSingleSlot(slot, "ABSENT")}
                          className="flex-1 items-center py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10"
                        >
                          <XCircle size={14} color="#f43f5e" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleMarkSingleSlot(slot, "MEDICAL")}
                          className="flex-1 items-center py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10"
                        >
                          <Activity size={14} color="#f59e0b" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            handleMarkSingleSlot(slot, "CANCELLED")
                          }
                          className="flex-1 items-center py-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                        >
                          <Ban size={14} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* NEW: onComplete now just clears the animation overlay */}
        {pendingAnimation && (
          <StatusAnimation
            status={pendingAnimation}
            onComplete={() => setPendingAnimation(null)}
          />
        )}
      </View>

      {(editingSlotIndex !== null || isBulkEditing) && (
        <AttendanceEditPopup
          scheduleId={item.subjectId}
          timetableId={timetableId}
          selectedDate={selectedDate}
          initialStatus={
            isBulkEditing
              ? allSameStatus
                ? mapStatusForEditor(displayStatus)
                : undefined
              : mapStatusForEditor(
                  getSlotDisplayStatus(item.slotDetails[editingSlotIndex!]),
                )
          }
          onClose={() => {
            setEditingSlotIndex(null);
            setIsBulkEditing(false);
          }}
          onSave={async (statusName) => {
            if (Platform.OS === "android") {
              Vibration.vibrate(40);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            }

            // Play custom sound on edit/save as well
            playSound(statusName);

            if (isBulkEditing) {
              const editableSlots = item.slotDetails.filter(
                (slot) => !!slot.attendanceId,
              );
              if (!editableSlots.length) return;

              applyOptimisticStatusForSlots(editableSlots, statusName);

              const results = await Promise.allSettled(
                editableSlots.map((slot) =>
                  editMutation.mutateAsync({
                    attendanceId: slot.attendanceId!,
                    type: statusName,
                  }),
                ),
              );

              const failedSlots = editableSlots.filter(
                (_, index) => results[index].status === "rejected",
              );

              if (failedSlots.length > 0) {
                setOptimisticStatuses((prev) => {
                  const updated = { ...prev };
                  failedSlots.forEach((slot) => {
                    delete updated[slot.timeSlot];
                  });
                  return updated;
                });
                Alert.alert(
                  "Partial Update Failed",
                  `Couldn't update ${failedSlots.length} slot(s). Please try again.`,
                );
              }
              return;
            }

            const slot = item.slotDetails[editingSlotIndex!];
            if (!slot) return;

            applyOptimisticStatusForSlots([slot], statusName);

            if (slot.attendanceId) {
              await editMutation.mutateAsync({
                attendanceId: slot.attendanceId,
                type: statusName,
              });
              return;
            }

            await new Promise<void>((resolve, reject) => {
              mutate(
                {
                  subjectId: item.subjectId,
                  day: item.day,
                  type: statusName,
                  timeSlot: slot.timeSlot,
                  date: selectedDate,
                  semester: item.semester,
                },
                {
                  onSuccess: () => resolve(),
                  onError: (error) => reject(error),
                },
              );
            });
          }}
          onSuccessCallback={(status) => {
            console.log("Updated successfully to:", status);
          }}
        />
      )}
    </View>
  );
};
