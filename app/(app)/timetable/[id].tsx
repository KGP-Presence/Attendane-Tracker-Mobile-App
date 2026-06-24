import { useGetAttendanceStatByTimetable } from "@/hooks/useDetails";
import { SubjectInterface } from "@/types/subjectTypes";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  Platform,
  Vibration
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics"

// const apiResponse = {
//   statusCode: 200,
//   data: {
//     timetable: {
//       name: "Tarun first Sample Timetable Edited",
//       semester: 6,
//       subjects: [
//         {
//           _id: "6985b0dcd0828b0f76a43e0e",
//           name: "PROJECT ENGINEERING AND MANAGEMENT",
//           code: "CH62028",
//           professor: "Suverna Trivedi",
//           totalClasses: 15,
//           classesAttended: 9,
//         },
//         {
//           _id: "6985b11bf4dd50714332897f",
//           name: "GRAVITY AND MAGNETIC METHODS OF PROSPECTING",
//           code: "GG31204",
//           professor: "William Kumar Mohanty",
//           totalClasses: 18,
//           classesAttended: 10,
//         },
//         {
//           _id: "6985b131f4dd507143328984",
//           name: "GEOPHYSICAL INVERSE THEORY",
//           code: "GG31202",
//           professor: "Chandrani Singh",
//           totalClasses: 11,
//           classesAttended: 10,
//         },
//       ],
//     },
//     totalClasses: 82,
//     attendedClasses: 49,
//     absentClasses: 17,
//     medicalClasses: 5,
//     cancelledClasses: 11,
//     attendancePercentage: 74.24242424242425,
//     attendanceRecords: [
//       {
//         _id: "69a032aa58b10e9e697a13ac",
//         subject: "6985b14cf4dd507143328989",
//         date: "2026-02-26T00:00:00.000Z",
//         type: "CANCELLED",
//         timeSlot: "THURSDAY_5PM-6PM",
//       },
//       {
//         _id: "69a032a758b10e9e697a13a2",
//         subject: "6985b11bf4dd50714332897f",
//         date: "2026-02-26T00:00:00.000Z",
//         type: "PRESENT",
//         timeSlot: "THURSDAY_4PM-5PM",
//       },
//       {
//         _id: "699d95cb34dd84c058282ad1",
//         subject: "6985b0dcd0828b0f76a43e0e",
//         date: "2026-02-24T00:00:00.000Z",
//         type: "MEDICAL",
//         timeSlot: "TUESDAY_9AM-10AM",
//       },
//       {
//         _id: "699eb6b6a079eab05be1033d",
//         subject: "6985b11bf4dd50714332897f",
//         date: "2026-02-24T00:00:00.000Z",
//         type: "ABSENT",
//         timeSlot: "TUESDAY_11AM-12PM",
//       },
//     ],
//   },
// };

const getSubjectDetails = (subjectId: string, subjects: any[]) => {
  return (
    subjects.find((s) => s._id === subjectId) || {
      name: "Unknown Subject",
      professor: "Unknown",
    }
  );
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTimeSlot = (slot: string) => {
  if (!slot) return "";
  const timePart = slot.split("_")[1]; // e.g., "8AM-9AM"
  return timePart ? timePart.split("-")[0] : ""; // e.g., "8AM"
};

const PRIMARY_COLOR = "#0fbd2c";

export default function TimetableScreen() {
  const { id } = useLocalSearchParams() as { id: string };

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data } = useGetAttendanceStatByTimetable(id);
  const percentage = Math.round(data?.attendancePercentage || 0);

  // Card Theme Palette for Subjects
  const subjectThemes = [
    {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      fill: "bg-blue-500",
      text: "text-blue-600 dark:text-blue-400",
      icon: "code",
    },
    {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      fill: "bg-purple-500",
      text: "text-purple-600 dark:text-purple-400",
      icon: "calculate",
    },
    {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      fill: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-400",
      icon: "storage",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#f6f8f6] dark:bg-[#070824]">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#0fbd2c]/10 dark:border-[#0fbd2c]/20 bg-[#f6f8f6]/95 dark:bg-[#070824]">
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full hover:bg-[#070824]/10" onPress={() => {
          if (Platform.OS === "android") {
            // Forces the motor to spin up and stop in exactly 20 milliseconds.
            // This creates a sharp "tick" rather than a soft buzz.
            Vibration.vibrate(20);
          } else {
            // iOS handles impacts much better natively, so stick to Expo here
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.back()
        }}>
          <MaterialIcons
            name="chevron-left"
            size={28}
            color={isDark ? "#f1f5f9" : "#070824"}
          />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-1 text-center">
          Timetable Details
        </Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center" onPress={() => {
          if (Platform.OS === "android") {
            // Forces the motor to spin up and stop in exactly 20 milliseconds.
            // This creates a sharp "tick" rather than a soft buzz.
            Vibration.vibrate(20);
          } else {
            // iOS handles impacts much better natively, so stick to Expo here
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.push(`/timetable/editTimetable/${id}`)
        }}>
          <MaterialIcons
            name="edit"
            size={24}
            color={isDark ? "#f1f5f9" : "#070824"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Title & Semester Info */}
        <View className="px-5 pt-6 pb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Semester {data?.timetable?.semester || "Unknown"} Schedule
            </Text>
            <View className="bg-[#0fbd2c]/10 px-2 py-1 rounded">
              <Text className="text-sm font-medium text-[#0fbd2c]">Active</Text>
            </View>
          </View>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {data?.timetable?.name || "Unknown Timetable"}
          </Text>
        </View>

        {/* Attendance Overview Section */}
        <View className="px-5 py-4">
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex-row items-center justify-between">
            {/* Circular Gauge */}
            <View className="w-32 h-32 relative items-center justify-center mr-4">
              <Svg
                onLayout={() => {}}
                width="100%"
                height="100%"
                viewBox="0 0 36 36"
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                {/* Background Circle */}
                <Path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={isDark ? "#334155" : "#f1f5f9"}
                  strokeWidth="3.5"
                />
                {/* Progress Circle */}
                <Path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={PRIMARY_COLOR}
                  strokeDasharray={`${percentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </Svg>
              <View className="absolute items-center justify-center">
                <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {percentage}%
                </Text>
                <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                  Overall
                </Text>
              </View>
            </View>

            {/* Legend/Breakdown */}
            <View className="flex-1 flex-row flex-wrap">
              <View className="w-1/2 mb-4">
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Present
                </Text>
                <Text className="text-lg font-bold text-[#0fbd2c]">
                  {data?.attendedClasses || 0}
                </Text>
              </View>
              <View className="w-1/2 mb-4 pl-2">
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Absent
                </Text>
                <Text className="text-lg font-bold text-red-500">
                  {data?.absentClasses || 0}
                </Text>
              </View>
              <View className="w-1/2">
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Medical
                </Text>
                <Text className="text-lg font-bold text-amber-500">
                  {data?.medicalClasses || 0}
                </Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Total
                </Text>
                <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {data?.totalClasses || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Enrolled Subjects Carousel */}
        <View className="py-2">
          <View className="px-5 mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enrolled Subjects
            </Text>
            {/* <TouchableOpacity>
              <Text className="text-sm font-semibold text-[#0fbd2c]">
                View All
              </Text>
            </TouchableOpacity> */}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {data?.timetable?.subjects.map(
              (subject: SubjectInterface, index: number) => {
                const theme = subjectThemes[index % subjectThemes.length];
                const progressWidth = Math.min(
                  (subject.classesAttended / subject.totalClasses) * 100,
                  100,
                );

                return (
                  <TouchableOpacity
                    key={subject._id}
                    className="w-36 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex-col justify-between"
                    style={{ minHeight: 110 }}
                    onPress={() => {
                      Vibration.vibrate(20)
                      router.push(`/subject/details/${subject._id}`)
                    }}
                  >
                    <View
                      className={`w-8 h-8 rounded-lg items-center justify-center mb-2 ${theme.bg}`}
                    >
                      <MaterialIcons
                        name={theme.icon as any}
                        size={18}
                        color={isDark ? "#60a5fa" : "#2563eb"}
                      />
                    </View>
                    <View className="mb-3">
                      <Text
                        className="font-semibold text-sm text-slate-900 dark:text-slate-100"
                        numberOfLines={1}
                      >
                        {subject.name}
                      </Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {subject.code}
                      </Text>
                    </View>
                    <View className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${theme.fill}`}
                        style={{ width: `${progressWidth}%` }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        </View>

        {/* Attendance Journey (Timeline) */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">
            Attendance Journey
          </Text>

          {/* Timeline Container */}
          <View className="pl-2">
            {/* Today Badge */}
            <View className="absolute top-[-14px] left-[-2px] bg-[#0fbd2c] px-2 py-0.5 rounded-full z-20 shadow-sm">
              <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                Today
              </Text>
            </View>

            {data?.attendanceRecords.map((record: any, index: number) => {
              const isLast = index === data.attendanceRecords.length - 1;
              const subjectInfo = getSubjectDetails(
                record.subject,
                data.timetable.subjects,
              );
              const formattedDate = formatDate(record.date);
              const formattedTime = formatTimeSlot(record.timeSlot);

              let typeStyles = {
                border: "border-slate-200",
                bg: "bg-slate-100",
                text: "text-slate-500",
                dot: "border-slate-300",
              };

              if (record.type === "PRESENT")
                typeStyles = {
                  border: "border-[#0fbd2c]",
                  bg: "bg-[#0fbd2c]/10",
                  text: "text-[#0fbd2c]",
                  dot: "border-[#0fbd2c]",
                };
              if (record.type === "MEDICAL")
                typeStyles = {
                  border: "border-amber-500",
                  bg: "bg-amber-500/10",
                  text: "text-amber-500",
                  dot: "border-amber-500",
                };
              if (record.type === "ABSENT")
                typeStyles = {
                  border: "border-red-500",
                  bg: "bg-red-500/10",
                  text: "text-red-500",
                  dot: "border-red-500",
                };
              if (record.type === "CANCELLED")
                typeStyles = {
                  border: "border-slate-400 dark:border-slate-500",
                  bg: "bg-slate-200 dark:bg-slate-700",
                  text: "text-slate-500 dark:text-slate-300",
                  dot: "border-slate-400",
                };

              return (
                <View key={record._id} className="flex-row mb-6">
                  {/* Left Timeline Guide */}
                  <View className="w-8 items-center justify-start relative pt-4">
                    {/* Vertical Line */}
                    {!isLast && (
                      <View className="absolute top-4 bottom-[-32px] w-[2px] bg-slate-200 dark:bg-slate-700" />
                    )}
                    {/* Status Dot */}
                    <View
                      className={`w-4 h-4 rounded-full border-[3px] bg-[#f6f8f6] dark:bg-[#102213] z-10 ${typeStyles.dot}`}
                    />
                  </View>

                  {/* Timeline Card */}
                  <View
                    className={`flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 ${record.type === "CANCELLED" ? "opacity-70" : ""}`}
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {formattedDate} • {formattedTime}
                      </Text>
                      <View className={`px-2 py-0.5 rounded ${typeStyles.bg}`}>
                        <Text
                          className={`text-[10px] font-bold uppercase ${typeStyles.text}`}
                        >
                          {record.type}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1"
                      numberOfLines={1}
                    >
                      {subjectInfo.name}
                    </Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {subjectInfo?.professors?.join(", ") || "Unknown Prof."}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
