import { ClassCard } from "@/components/ClassCard";
import { ClassSession, useDailyClasses } from "@/hooks/scheduleLogic";
import { useGetAttendanceForDateByTimetable } from "@/hooks/useGetAttendanceForDateByTimetable";
import { api, attendanceApi } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Activity,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
  User,
  Volume2,
  X,
  XCircle,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  Switch,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SOUND_DICTIONARY } from "../../../../constants/sound_dict";
import { useAttendanceSounds } from "@/hooks/useAttendanceSound";

const STATUS_ICONS: Record<string, any> = {
  PRESENT: { icon: CheckCircle, color: "#10b981" },
  ABSENT: { icon: XCircle, color: "#f43f5e" },
  MEDICAL: { icon: Activity, color: "#f59e0b" },
  CANCELLED: { icon: Ban, color: "#94a3b8" },
};

const SoundSettingsModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [selectedSounds, setSelectedSounds] = useState<Record<string, string>>(
    {},
  );
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true); // NEW STATE

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load master switch state (defaults to true if nothing is saved)
        const enabledState = await AsyncStorage.getItem("sounds_enabled");
        setIsSoundEnabled(enabledState !== "false");

        const preferences: Record<string, string> = {};
        for (const status of Object.keys(SOUND_DICTIONARY)) {
          const savedId = await AsyncStorage.getItem(`sound_pref_${status}`);
          preferences[status] = savedId || SOUND_DICTIONARY[status][0]?.id;
        }
        setSelectedSounds(preferences);
      } catch (error) {
        console.error("Failed to load sound preferences", error);
      }
    };
    if (visible) loadPreferences();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (soundObject) soundObject.unloadAsync();
    };
  }, [soundObject]);

  const toggleSound = async (value: boolean) => {
    if (Platform.OS === "android") Vibration.vibrate(20);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsSoundEnabled(value);
    try {
      await AsyncStorage.setItem("sounds_enabled", value ? "true" : "false");
    } catch (error) {
      console.error("Failed to save master sound preference", error);
    }
  };

  const playSound = async (file: any) => {
    if (!isSoundEnabled) return; // Prevent preview if sounds are disabled
    try {
      if (soundObject) await soundObject.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(file);
      setSoundObject(sound);
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing preview", error);
    }
  };

  const selectSound = async (status: string, soundId: string) => {
    if (Platform.OS === "android") Vibration.vibrate(20);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updated = { ...selectedSounds, [status]: soundId };
    setSelectedSounds(updated);
    try {
      await AsyncStorage.setItem(`sound_pref_${status}`, soundId);
    } catch (error) {
      console.error("Failed to save sound preference", error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl min-h-[70%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              Attendance Sounds
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* NEW: Master Toggle Switch */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <View>
              <Text className="text-base font-bold text-slate-800 dark:text-slate-200">
                Enable Sound Effects
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Play a sound when marking attendance
              </Text>
            </View>
            <Switch
              value={isSoundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
              thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
            />
          </View>

          {/* List of Statuses - Lower opacity if sounds are disabled */}
          <ScrollView
            className="p-6"
            style={{ opacity: isSoundEnabled ? 1 : 0.4 }}
            pointerEvents={isSoundEnabled ? "auto" : "none"} // Disables tapping if turned off
          >
            {Object.keys(SOUND_DICTIONARY).map((status) => {
              const { icon: StatusIcon, color } =
                STATUS_ICONS[status] || STATUS_ICONS.PRESENT;
              const options = SOUND_DICTIONARY[status] || [];

              if (options.length === 0) return null;

              return (
                <View key={status} className="mb-8">
                  <View className="flex-row items-center mb-3">
                    <StatusIcon size={20} color={color} />
                    <Text className="text-sm font-bold ml-2 text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      {status}
                    </Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {options.map((option) => {
                      const isSelected = selectedSounds[status] === option.id;
                      return (
                        <View
                          key={option.id}
                          className={`flex-row items-center mr-3 pl-1 pr-4 py-1.5 border rounded-full ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                              : "border-slate-200 dark:border-slate-700 bg-transparent"
                          }`}
                        >
                          <TouchableOpacity
                            onPress={() => playSound(option.file)}
                            className="p-2 mr-2 bg-slate-100 dark:bg-slate-800 rounded-full"
                          >
                            <Play
                              size={14}
                              color={isSelected ? "#3b82f6" : "#64748b"}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => selectSound(status, option.id)}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                isSelected
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {option.name}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// --- MAIN SCREEN ---
const ScheduleScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const id = useLocalSearchParams().id as string;

  // STATE
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isMarkingAllPresent, setIsMarkingAllPresent] = useState(false);
  const queryClient = useQueryClient();

  const { playSound, reloadSounds } = useAttendanceSounds();

  const offsetInMs: number = selectedDate.getTimezoneOffset() * 60 * 1000;
  const localISODate: string = new Date(selectedDate.getTime() - offsetInMs)
    .toISOString()
    .split("T")[0];

  const { data } = useGetAttendanceForDateByTimetable({
    timetableId: id,
    date: localISODate,
  });

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weekDates = useMemo(() => {
    const startOfWeek = getStartOfWeek(anchorDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [anchorDate]);

  const changeWeek = (direction: "prev" | "next") => {
    const newAnchor = new Date(anchorDate);
    const dayCount = direction === "next" ? 7 : -7;
    newAnchor.setDate(newAnchor.getDate() + dayCount);
    setAnchorDate(newAnchor);
  };

  const todaysClasses: ClassSession[] = useDailyClasses(data?.classes || []);
  const morningClasses = todaysClasses.filter((c) => c.sortTime <= 1300);
  const afternoonClasses = todaysClasses.filter((c) => c.sortTime > 1300);
  const unmarkedSlots = todaysClasses.flatMap((classItem) =>
    classItem.slotDetails
      .filter((slot) => slot.status === "UNMARKED")
      .map((slot) => ({ classItem, slot })),
  );

  const markAllPresent = async () => {
    if (isMarkingAllPresent || unmarkedSlots.length === 0) return;

    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsMarkingAllPresent(true);
    const results = await Promise.allSettled(
      unmarkedSlots.map(({ classItem, slot }) =>
        attendanceApi.createAttendance(
          api,
          classItem.subjectId,
          classItem.day,
          "PRESENT",
          slot.timeSlot,
          localISODate,
          classItem.semester,
        ),
      ),
    );
    const failedCount = results.filter((result) => result.status === "rejected").length;

    await queryClient.invalidateQueries({
      queryKey: ["attendance", id, localISODate],
    });
    setIsMarkingAllPresent(false);

    if (failedCount > 0) {
      Alert.alert(
        "Some classes were not updated",
        `${failedCount} of ${unmarkedSlots.length} class slots could not be marked present.`,
      );
      return;
    }

    Alert.alert(
      "Done",
      `${unmarkedSlots.length} class ${unmarkedSlots.length === 1 ? "slot" : "slots"} marked present.`,
    );
  };

  const formatDay = (date: Date): string =>
    ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
  const formatDateNum = (date: Date): string => date.getDate().toString();
  const formatMonthYear = (date: Date): string =>
    date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const isSameDate = (d1: Date, d2: Date) =>
    d1.toDateString() === d2.toDateString();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={isDark ? "#0f172a" : "#f8fafc"}
        translucent={false}
      />

      <View className="px-4 pt-4 pb-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => {
                Vibration.vibrate(20);
                router.back();
              }}
            >
              <ChevronLeft size={28} color={"#139bec"} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              Schedule
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {/* NEW: Sound Settings Button */}
            <TouchableOpacity
              className="h-9 w-9 p-0.5 justify-center items-center"
              onPress={() => {
                Vibration.vibrate(20);
                setIsSoundModalOpen(true);
              }}
            >
              <Volume2 size={24} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              className="h-9 w-9 p-0.5 justify-center items-center"
              onPress={() => {
                Vibration.vibrate(20);
                router.push("/profile/profile");
              }}
            >
              <User size={28} color="#135bec" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => changeWeek("prev")} className="p-1">
            <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {formatMonthYear(anchorDate)}
          </Text>
          <TouchableOpacity onPress={() => changeWeek("next")} className="p-1">
            <ChevronRight size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {weekDates.map((date, index) => {
            const isActive = isSameDate(date, selectedDate);
            const isToday = isSameDate(date, new Date());
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(date)}
                className={`flex items-center justify-center w-14 py-3 rounded-2xl border ${
                  isActive
                    ? "bg-blue-500 border-blue-500"
                    : isToday
                      ? "bg-white dark:bg-slate-800 border-blue-400"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${isActive ? "text-blue-100" : "text-slate-400"}`}
                >
                  {formatDay(date)}
                </Text>
                <Text
                  className={`text-lg font-bold ${isActive ? "text-white" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {formatDateNum(date)}
                </Text>
                {!isActive && isToday && (
                  <View className="w-1 h-1 bg-blue-400 rounded-full mt-1" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <View className="bg-blue-600 rounded-2xl p-5 mb-8 shadow-lg shadow-blue-500/20">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-lg font-bold text-white">Overview</Text>
              <Text className="text-blue-100 text-sm">
                {selectedDate.toDateString()}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-blue-100 text-xs opacity-80">
                  {todaysClasses.length} classes scheduled
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isMarkingAllPresent || unmarkedSlots.length === 0}
                  onPress={markAllPresent}
                  className="ml-3 flex-row items-center"
                >
                  {isMarkingAllPresent ? (
                    <ActivityIndicator size="small" color="#bfdbfe" />
                  ) : (
                    <>
                      <CheckCircle
                        size={13}
                        color={unmarkedSlots.length === 0 ? "#93c5fd" : "#ffffff"}
                      />
                      <Text
                        className={`ml-1 text-xs font-bold ${
                          unmarkedSlots.length === 0 ? "text-blue-200/60" : "text-white"
                        }`}
                      >
                        {todaysClasses.length > 0 && unmarkedSlots.length === 0
                          ? "All marked"
                          : "Mark all present"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View className="bg-white/20 px-2 py-1 rounded-lg">
              <Text className="text-white text-[10px] font-bold">
                SPRING 2026
              </Text>
            </View>
          </View>

        </View>

        <View className="border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-8 pb-24">
          {todaysClasses.length === 0 && (
            <View className="py-10">
              <Text className="text-slate-400 text-center">
                No classes for {formatDay(selectedDate)}.
              </Text>
            </View>
          )}

          {morningClasses.map((item, index) => (
            <ClassCard
              key={`morning-${index}`}
              item={item}
              timetableId={id}
              selectedDate={localISODate}
              playSound={playSound}
            />
          ))}

          {todaysClasses.length > 0 && (
            <View className="relative my-2">
              <View className="absolute -left-[30px] top-4 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
              <View className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 p-3 rounded-xl items-center">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Lunch Break • 01:00 PM - 02:00 PM
                </Text>
              </View>
            </View>
          )}

          {afternoonClasses.map((item, index) => (
            <ClassCard
              key={`afternoon-${index}`}
              item={item}
              timetableId={id}
              selectedDate={localISODate}
              playSound={playSound}
            />
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-8 right-8 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40"
        onPress={() => {
          if (Platform.OS === "android") {
            Vibration.vibrate(20);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.push(`/timetable/addSubjectToTimetable/${id}`);
        }}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Render the modal */}
      <SoundSettingsModal
        visible={isSoundModalOpen}
        onClose={() => {
          setIsSoundModalOpen(false);
          reloadSounds(); // 3. RELOAD MEMORY WHEN MODAL CLOSES
        }}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
