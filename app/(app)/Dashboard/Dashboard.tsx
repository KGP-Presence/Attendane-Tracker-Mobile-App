import {
  useGetAttendanceStatsBySemester,
  useGetDashboardInit
} from "@/hooks/useDashboardStats";
import { useMe } from "@/hooks/useMe";
import { scheduleClassReminders } from "@/utils/notificationHelper";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Headphones, User } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DashboardCopilot } from "@/components/copilot/DashboardCopilot";
import { TabBarCopilot } from "@/components/copilot/TabBarCopilot";

// 1. Setup Icons for NativeWind
const Icon = ({ name, size = 24, color, className }: any) => (
  <MaterialIcons name={name} size={size} color={color} className={className} />
);

export default function Dashboard() {
  const { data } = useMe();

  // Refs for Copilot spotlight
  const profileRef = React.useRef<View>(null);
  const helpRef = React.useRef<View>(null);
  const scheduleRef = React.useRef<View>(null);
  const attendanceBlockRef = React.useRef<View>(null);
  const eventsBlockRef = React.useRef<View>(null);
  const tab1Ref = React.useRef<View>(null);
  const tab2Ref = React.useRef<View>(null);
  const tab3Ref = React.useRef<View>(null);
  const tab4Ref = React.useRef<View>(null);
  const tab5Ref = React.useRef<View>(null);

  const [showTabBarCopilot, setShowTabBarCopilot] = useState(false);

  // Measure screen for ghost tab bar
  const { width: screenWidth } = useWindowDimensions();
  const TOTAL_BAR_WIDTH = Math.min(screenWidth - 32, 400);
  const TAB_COUNT = 5;
  const TAB_WIDTH_EXPANDED = 130;
  const TAB_WIDTH_COLLAPSED = (TOTAL_BAR_WIDTH - TAB_WIDTH_EXPANDED - 20) / (TAB_COUNT - 1);

  // 1. Trigger the single Init call
  const {
    data: dashboardData,
    isLoading: isInitLoading,
    refetch: refetchDashboard,
  } = useGetDashboardInit();

  const upcomingClasses = dashboardData?.upcomingClasses || [];
  const allEvents = dashboardData?.events || [];
  
  const defaultStats = useMemo(() => ({
    semester: dashboardData?.semester,
    topAttended: dashboardData?.topAttended || [],
    leastAttended: dashboardData?.leastAttended || [],
  }), [dashboardData]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Semester selector state
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);

  // Initialize semester from default stats
  useEffect(() => {
    if (defaultStats?.semester && selectedSemester === 0) {
      setSelectedSemester(defaultStats.semester);
    }
  }, [defaultStats?.semester]);

  // Fetch semester-specific stats when user picks a different semester
  const { data: semesterStats, isFetched: isSemesterFetched } =
    useGetAttendanceStatsBySemester(selectedSemester);

  // Use semester-specific stats when fetched; show empty if no data for that semester
  const isDefaultSemester = selectedSemester === defaultStats?.semester;
  const attendstats = isDefaultSemester
    ? defaultStats
    : isSemesterFetched
      ? (semesterStats ?? { topAttended: [], leastAttended: [] })
      : { topAttended: [], leastAttended: [] };

  // Schedule notifications for upcoming classes
  useEffect(() => {
    if (upcomingClasses && upcomingClasses.length > 0) {
      scheduleClassReminders(upcomingClasses);
    }
  }, [upcomingClasses]);

  // --- New State for Schedule and Refresh ---
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async() => {
    setRefreshing(true);
    // Force the unified endpoint to run again and update all caches
    await refetchDashboard();

    // Simulating a network delay for the UI
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, [refetchDashboard]);

  

  const today = new Date();

  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    today,
  );
  
  const dateNumber = today.getDate();
  const shortMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(today);

  // Helper function to extract time and AM/PM from the slot string
  const parseSlotTime = (slotString: string) => {
    if (!slotString) return { time: "--:--", ampm: "" };
    try {
      const timePart = slotString.split("_")[1];
      if (!timePart) return { time: "--:--", ampm: "" };
      const startTime = timePart.split("-")[0];
      const match = startTime.match(/(\d+)(AM|PM)/i);
      if (match) {
        return {
          time: `${match[1]}:00`,
          ampm: match[2].toUpperCase(),
        };
      }
      return { time: startTime, ampm: "" };
    } catch (error) {
      return { time: "--:--", ampm: "" };
    }
  };

  // Determine how many classes to show
  const hasMoreThanTwo = upcomingClasses && upcomingClasses.length > 2;
  const displayedClasses = isExpanded
    ? upcomingClasses
    : upcomingClasses?.slice(0, 2);

  // Events tab state and filtering
  const EVENT_TABS = [
    { id: "All", icon: "dashboard" },
    { id: "Exam", icon: "menu-book" },
    { id: "Assignment", icon: "assignment" },
    { id: "Test", icon: "quiz" },
    { id: "Other", icon: "event" },
  ] as const;

  const [activeEventTab, setActiveEventTab] = useState<string>("All");

  const filteredEvents = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return [];
    const sorted = [...allEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    if (activeEventTab === "All") return sorted.slice(0, 5);
    return sorted.filter((e) => e.type === activeEventTab).slice(0, 5);
  }, [allEvents, activeEventTab]);

  const getEventColor = (type: string) => {
    switch (type) {
      case "Exam":
        return {
          color: "bg-red-50 dark:bg-red-900/20",
          textColor: "text-red-500",
        };
      case "Assignment":
        return {
          color: "bg-indigo-50 dark:bg-indigo-900/20",
          textColor: "text-indigo-500",
        };
      case "Test":
        return {
          color: "bg-amber-50 dark:bg-amber-900/20",
          textColor: "text-amber-500",
        };
      default:
        return {
          color: "bg-purple-50 dark:bg-purple-900/20",
          textColor: "text-purple-500",
        };
    }
  };


  // if (isInitLoading && !refreshing) {
  //   return (
  //     <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
  //       {/* Replace with your custom ActivityIndicator or Skeleton Loader */}
  //       <Text className="dark:text-white">Loading Dashboard...</Text>
  //     </View>
  //   );
  // }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <SafeAreaView className="flex-1">
        <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#ffffff" : "#000000"} // Loading spinner color
          />
        }
      >
        {/* Header Section */}
        <View className="pt-4 pb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {dayName}, {shortMonth} {dateNumber}
            </Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Hello, {data?.firstName}
            </Text>
          </View>
          <View className="flex-row gap-4">
            <TouchableOpacity ref={helpRef} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Headphones
                size={24}
                color="#135bec"
                onLayout={() => {}}
                onPress={() => {
                  if (Platform.OS === "android") {
                    // Forces the motor to spin up and stop in exactly 20 milliseconds.
                    // This creates a sharp "tick" rather than a soft buzz.
                    Vibration.vibrate(20);
                  } else {
                    // iOS handles impacts much better natively, so stick to Expo here
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push("/contactUs/contactPage");
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity ref={profileRef} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <User
                size={24}
                color="#135bec"
                strokeWidth={2.5}
                onLayout={() => {}}
                onPress={() => {
                  if (Platform.OS === "android") {
                    // Forces the motor to spin up and stop in exactly 20 milliseconds.
                    // This creates a sharp "tick" rather than a soft buzz.
                    Vibration.vibrate(20);
                  } else {
                    // iOS handles impacts much better natively, so stick to Expo here
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push("/profile/profile");
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

      {/* Blue Schedule Card */}
        <View ref={scheduleRef} className="bg-primary rounded-xl shadow-lg shadow-primary/20 overflow-hidden relative mb-6">
          {/* Background Decorative Circles */}
          <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <View className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-8 -mb-8" />

          <View className="p-5 z-10">
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center gap-2">
                <Icon name="schedule" size={20} color="rgba(255,255,255,0.8)" />
                <Text className="text-lg font-semibold text-white">
                  Schedule at a Glance
                </Text>
              </View>
              {/* Only show the button if there are more than 2 classes */}
              {hasMoreThanTwo && (
                <TouchableOpacity
                  onPress={() => setIsExpanded(!isExpanded)}
                  className="bg-white/20 px-3 py-1.5 rounded-lg active:bg-white/30"
                >
                  <Text className="text-xs font-medium text-white">
                    {isExpanded ? "View Less" : "View Full"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="gap-4">
              {displayedClasses && displayedClasses.length > 0 ? (
                displayedClasses.map((item: any, index: number) => {
                  const { time, ampm } = parseSlotTime(item.slot);

                  return (
                    <ScheduleItem
                      key={`${item.subjectCode}-${index}`}
                      time={time}
                      ampm={ampm}
                      subject={item.subjectName}
                      room={
                        item.venue
                          ? `${item.venue} • ${item.subjectCode}`
                          : `${item.subjectCode} • ${item.credits} Credits`
                      }
                    />
                  );
                })
              ) : (
                <Text className="text-white text-center opacity-80 py-2">
                  No upcoming classes scheduled.
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Attendance Block Wrapper for Copilot */}
        <View ref={attendanceBlockRef}>
          {/* Semester Selector */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Attendance Stats
            </Text>
            <TouchableOpacity
              onPress={() => setShowSemesterDropdown(true)}
            className="flex-row items-center gap-1.5 bg-white dark:bg-[#151c2b] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <Icon
              name="school"
              size={16}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Sem {selectedSemester || "-"}
            </Text>
            <Icon
              name="arrow-drop-down"
              size={20}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </TouchableOpacity>
        </View>

        {/* Semester Dropdown Modal */}
        <Modal
          visible={showSemesterDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSemesterDropdown(false)}
        >
          <Pressable
            className="flex-1 justify-center items-center bg-black/40"
            onPress={() => setShowSemesterDropdown(false)}
          >
            <Pressable className="bg-white dark:bg-[#151c2b] rounded-xl p-4 w-64 shadow-xl border border-slate-200 dark:border-slate-700">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-3 text-center">
                Select Semester
              </Text>
              <View className="flex-row flex-wrap gap-2 justify-center">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <TouchableOpacity
                    key={sem}
                    onPress={() => {
                      if (Platform.OS === "android") {
                        Vibration.vibrate(20);
                      } else {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setSelectedSemester(sem);
                      setShowSemesterDropdown(false);
                    }}
                    className={`w-12 h-12 rounded-lg items-center justify-center ${
                      selectedSemester === sem
                        ? "bg-primary"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        selectedSemester === sem
                          ? "text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {sem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Stats Grid (Top Attendance & Needs Focus) */}
        <View className="flex-col gap-4 mb-6">
          {/* Card 1: Top Attendance */}
          <View className="bg-white dark:bg-[#151c2b] rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2 mb-4">
              <Icon name="trending-up" size={20} color="#22c55e" />
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                Top Attendance
              </Text>
            </View>

            <View className="gap-3">
              {attendstats?.topAttended?.map((item: any, index: any) => {
                const barOpacity =
                  index === 0
                    ? "bg-primary"
                    : index === 1
                      ? "bg-primary/60"
                      : "bg-primary/40";
                const isTopTwo = index < 2;

                const safeSubjectName =
                  item.subjectName?.length > 18
                    ? `${item.subjectName.substring(0, 18)}...`
                    : item.subjectName;

                return (
                  <StatRow
                    key={index}
                    label={safeSubjectName}
                    color={barOpacity}
                    score={`${Math.round(item.attendancePercentage)}%`}
                    scoreColor={
                      isTopTwo
                        ? "text-green-700 dark:text-green-400"
                        : "text-blue-700 dark:text-blue-400"
                    }
                    scoreBg={
                      isTopTwo
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-blue-100 dark:bg-blue-900/30"
                    }
                    onPress={() => {
                      if (item.subjectId) {
                        Vibration.vibrate(20);
                        router.push(`/subject/details/${item.subjectId}`);
                      }
                    }}
                  />
                );
              })}

              {attendstats?.topAttended?.length === 0 && (
                <Text className="text-slate-400 text-center py-2">
                  No attendance data available
                </Text>
              )}
            </View>
          </View>

          {/* Card 2: Needs Focus */}
          <View className="bg-white dark:bg-[#151c2b] rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2 mb-4">
              <Icon name="trending-down" size={20} color="#ef4444" />
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                Needs Focus
              </Text>
            </View>

            <View className="gap-3">
              {attendstats?.leastAttended?.map((item: any, index: any) => {
                const isLowest = index === 0;
                const barColor = isLowest
                  ? "bg-red-400"
                  : index === 1
                    ? "bg-orange-400"
                    : "bg-orange-300";

                const safeSubjectName =
                  item.subjectName?.length > 18
                    ? `${item.subjectName.substring(0, 18)}...`
                    : item.subjectName;

                return (
                  <StatRow
                    key={index}
                    label={safeSubjectName}
                    color={barColor}
                    score={`${Math.round(item.attendancePercentage)}%`}
                    scoreColor={
                      isLowest
                        ? "text-red-700 dark:text-red-400"
                        : "text-orange-700 dark:text-orange-400"
                    }
                    scoreBg={
                      isLowest
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-orange-100 dark:bg-orange-900/30"
                    }
                    onPress={() => {
                      if (item.subjectId) {
                        Vibration.vibrate(20);
                        router.push(`/subject/details/${item.subjectId}`);
                      }
                    }}
                  />
                );
              })}

              {attendstats?.leastAttended?.length === 0 && (
                <Text className="text-slate-400 text-center py-2">
                  No attendance data available
                </Text>
              )}
            </View>
          </View>
        </View>
        {/* End of Attendance Block Wrapper */}
        </View>

        

        {/* Events Block Wrapper for Copilot */}
        <View ref={eventsBlockRef}>
          {/* Horizontal Tabs */}
          <ScrollView
            horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row pb-2 mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {EVENT_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              title={tab.id}
              iconName={tab.icon}
              active={activeEventTab === tab.id}
              onPress={() => {
                if (Platform.OS === "android") {
                  // Forces the motor to spin up and stop in exactly 20 milliseconds.
                  // This creates a sharp "tick" rather than a soft buzz.
                  Vibration.vibrate(20);
                } else {
                  // iOS handles impacts much better natively, so stick to Expo here
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setActiveEventTab(tab.id);
              }}
              isDark={isDark}
            />
          ))}
          </ScrollView>

          {/* Event List Items */}
          <View className="gap-3 mt-2">
            {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const eventDate = new Date(event.date);
              const day = String(eventDate.getDate()).padStart(2, "0");
              const month = new Intl.DateTimeFormat("en-US", { month: "short" })
                .format(eventDate)
                .toUpperCase();
              const { color, textColor } = getEventColor(event.type);
              return (
                <ExamCard
                  key={event._id}
                  date={day}
                  month={month}
                  title={event.name}
                  detail={`${event.type} • ${event.location}`}
                  color={color}
                  textColor={textColor}
                />
              );
            })
          ) : (
              <Text className="text-slate-400 text-center py-4">
                No events found.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>

      {/* Dashboard Copilot */}
      <DashboardCopilot 
        profileRef={profileRef}
        helpRef={helpRef} 
        scheduleRef={scheduleRef}
        attendanceBlockRef={attendanceBlockRef}
        eventsBlockRef={eventsBlockRef}
        onDone={() => setShowTabBarCopilot(true)}
      />

      <TabBarCopilot 
        tab1Ref={tab1Ref}
        tab2Ref={tab2Ref}
        tab3Ref={tab3Ref}
        tab4Ref={tab4Ref}
        tab5Ref={tab5Ref}
        enabled={showTabBarCopilot}
      />
      
      {/* Ghost Views matching the CustomTabBar dimensions/placement to get accurate measurements */}
      <View 
        pointerEvents="none" 
        className="flex-row items-center justify-start px-2"
        style={{ 
          position: 'absolute', 
          bottom: 25, 
          alignSelf: 'center', 
          height: 75, 
          width: TOTAL_BAR_WIDTH,
        }}
      >
        <View ref={tab1Ref} style={{ width: 130, height: 60 }} />
        <View ref={tab2Ref} style={{ width: TAB_WIDTH_COLLAPSED, height: 60 }} />
        <View ref={tab3Ref} style={{ width: TAB_WIDTH_COLLAPSED, height: 60 }} />
        <View ref={tab4Ref} style={{ width: TAB_WIDTH_COLLAPSED, height: 60 }} />
        <View ref={tab5Ref} style={{ width: TAB_WIDTH_COLLAPSED, height: 60 }} />
      </View>
    </View>
  );
}

// --- Helper Components ---

const StatRow = ({
  label,
  color,
  score,
  scoreColor,
  scoreBg,
  onPress,
}: any) => (
  <TouchableOpacity
    className="flex-row items-center justify-between"
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <View className="flex-row items-center gap-3">
      <View className={`w-2 h-2 rounded-full ${color}`} />
      <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </Text>
    </View>
    <View className="flex-row items-center gap-2">
      <View className={`px-2 py-1 rounded-lg ${scoreBg}`}>
        <Text className={`text-xs font-bold ${scoreColor}`}>{score}</Text>
      </View>
      {onPress && (
        <MaterialIcons name="chevron-right" size={16} color="#94A3B8" />
      )}
    </View>
  </TouchableOpacity>
);

const ScheduleItem = ({ time, ampm, subject, room }: any) => (
  <View className="flex-row items-start gap-4">
    <View className="flex-col items-center w-10 pt-1">
      <Text className="text-sm font-bold text-white/90">{time}</Text>
      <Text className="text-xs text-white/60">{ampm}</Text>
      <View className="h-8 w-[1px] bg-white/20 mt-2" />
    </View>
    <View className="bg-white/10 p-3 rounded-lg flex-1 border border-white/10">
      <Text className="font-bold text-sm text-white">{subject}</Text>
      <View className="flex-row items-center gap-1 mt-1">
        <Icon name="location-on" size={10} color="rgba(255,255,255,0.7)" />
        <Text className="text-xs text-white/70">{room}</Text>
      </View>
    </View>
  </View>
);

const TabButton = ({ title, active, onPress, iconName, isDark }: any) => {
  // Define colors based on theme and active state
  const activeBg = "#2563EB"; // Blue-600
  const inactiveBg = isDark ? "#1E293B" : "#ffffff"; // Slate-800 or White
  const activeBorder = "#2563EB";
  const inactiveBorder = isDark ? "#334155" : "#e2e8f0"; // Slate-700 or Slate-200
  const activeContent = "#ffffff";
  const inactiveContent = isDark ? "#94A3B8" : "#64748B"; // Slate-400 or Slate-500

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999, // Full pill shape
        borderWidth: 1,
        backgroundColor: active ? activeBg : inactiveBg,
        borderColor: active ? activeBorder : inactiveBorder,
        gap: 6, // Space between icon and text (Works in RN 0.71+)
      }}
    >
      <MaterialIcons
        name={iconName}
        size={16}
        color={active ? activeContent : inactiveContent}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: active ? activeContent : inactiveContent,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const ExamCard = ({ date, month, title, detail, color, textColor }: any) => (
  <TouchableOpacity className="bg-white dark:bg-[#151c2b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
    <View className="flex-row items-center gap-4">
      <View
        className={`w-12 h-12 rounded-lg ${color} items-center justify-center flex-col`}
      >
        <Text className={`text-[10px] font-bold ${textColor}`}>{month}</Text>
        <Text className={`text-lg font-bold leading-none ${textColor}`}>
          {date}
        </Text>
      </View>
      <View>
        <Text className="font-semibold text-slate-800 dark:text-white">
          {title}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {detail}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);
