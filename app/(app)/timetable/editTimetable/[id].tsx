import LoadingScreen from "@/components/Loading";
import { PatternArt } from "@/components/PatternArt";
import { useDeleteTimetable } from "@/hooks/useDeleteTimetable";
import { useRemoveSubjectsFromTimetable } from "@/hooks/useEditTimetableSubjects";
import { useGetTimetableById } from "@/hooks/useGetTimetableById";
import { useUpdateTimetableById } from "@/hooks/useUpdateTimetableById";
import { SubjectInterface } from "@/types/subjectTypes";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function EditTimetable() {
  const id = useLocalSearchParams().id as string;

  const { data: timetableData, isLoading: isTimetableLoading } =
    useGetTimetableById(id);
  const { mutate: deleteTimetable } = useDeleteTimetable(id);
  const { mutate: removeSubjectsFromTimetable } =
    useRemoveSubjectsFromTimetable(id);
  const { mutate: updateTimetable } = useUpdateTimetableById(id);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Component State
  const [timetableName, setTimetableName] = useState<string>("");
  const [semester, setSemester] = useState<number>(0);

  // New state specifically for tracking selected items
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const handleDelete = () => {

    if (Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Delete Timetable",
      "Are you sure you want to delete this timetable? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTimetable(),
        },
      ],
    );
  };

  const toggleSubject = (id: string) => {

    if (Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(5);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedSubjectIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        // Remove ID if it's already selected
        return prevSelected.filter((selectedId) => selectedId !== id);
      } else {
        // Add ID if it's not selected
        return [...prevSelected, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSubjectIds.length === timetableData?.subjects.length) {
      return setSelectedSubjectIds([]);
    }

    setSelectedSubjectIds(
      timetableData?.subjects.map((subject: SubjectInterface) => subject._id),
    );
  };

  const handleRemoveSubjects = () => {

    if (Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(10);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Remove Subjects",
      `Are you sure you want to remove ${selectedSubjectIds.length} subject(s) from this timetable?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeSubjectsFromTimetable(selectedSubjectIds),
        },
      ],
    );
  };

  const handleUpdate = () => {
    if (Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateTimetable({ name: timetableName, semester });
  };

  const selectedCount = selectedSubjectIds.length;

  useEffect(() => {
    if (timetableData) {
      setTimetableName(timetableData.name || "");
      setSemester(timetableData.semester || 0);
    }
  }, [timetableData]);

  if (isTimetableLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-background-light/90 dark:bg-background-dark/90">
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onPress={() => {
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
            color={isDark ? "#cbd5e1" : "#475569"}
          />
        </TouchableOpacity>

        <Text className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Edit Timetable
        </Text>

        <TouchableOpacity
          className="h-10 px-2 items-center justify-center rounded-full"
          onPress={handleUpdate}
        >
          <Text className="text-green-600 font-bold text-md">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Banner Section */}
        <View className="rounded-2xl overflow-hidden relative h-40 mb-6 bg-slate-800">
          <PatternArt
            seed={timetableData?._id ?? ""}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            className="absolute inset-0 w-full h-full"
          />
          <View className="flex-1 justify-end p-5">
            <Text className="text-primary font-semibold text-xs uppercase tracking-wider mb-1">
              Editing
            </Text>
            <Text className="text-white text-2xl font-bold leading-tight mb-1">
              {timetableData?.name || "Spring 2024"}
            </Text>
            <Text className="text-slate-300 text-sm">
              Semester {timetableData?.semester}
            </Text>
          </View>
        </View>

        {/* General Details Section */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-3">
            General Details
          </Text>
          <View className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Timetable Name
              </Text>
              <TextInput
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white h-12 px-4"
                value={timetableName}
                onChangeText={(text) => setTimetableName(text)}
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              />
            </View>
            <View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Semester
              </Text>
              <TextInput
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white h-12 px-4"
                value={semester.toString()}
                onChangeText={(text) => setSemester(Number(text))}
                keyboardType="numeric"
                placeholder="e.g. 6"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              />
            </View>
          </View>
        </View>

        {/* Subjects Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mx-1 mb-3">
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Subjects
            </Text>
            <TouchableOpacity onPress={handleSelectAll}>
              <Text className="text-xs text-primary font-medium">
                Select All
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Subject List */}
            {timetableData?.subjects.map(
              (subject: SubjectInterface, index: number) => {
                const isSelected = selectedSubjectIds.includes(subject._id);

                return (
                  <TouchableOpacity
                    key={subject._id}
                    onPress={() => toggleSubject(subject._id)}
                    className={`flex-row items-center p-4 ${index !== 0 ? "border-t border-slate-100 dark:border-slate-700/50" : ""}`}
                    activeOpacity={0.7}
                  >
                    {/* Custom Checkbox */}
                    <View
                      className={`w-5 h-5 mr-4 items-center justify-center rounded-md light ${isSelected
                          ? "bg-red-600"
                          : "bg-transparent border border-slate-300 dark:border-slate-600"
                        }`}
                    >
                      {isSelected && (
                        <MaterialIcons name="check" size={14} color="white" />
                      )}
                    </View>

                    {/* Subject Info */}
                    <View className="flex-1 flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-medium text-slate-900 dark:text-white">
                          {subject.name}
                        </Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {subject.code} • {subject.credits} Credits
                        </Text>
                      </View>

                      <TouchableOpacity className="p-2">
                        <MaterialIcons
                          name="edit"
                          size={20}
                          color={isDark ? "#e2e8f0" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}

            {/* Action Buttons */}
            <View className="bg-slate-50 dark:bg-slate-800/80 p-3 flex-row items-center gap-3 border-t border-slate-100 dark:border-slate-700/50">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 h-10 rounded-lg bg-red-600"
                onPress={handleRemoveSubjects}
              >
                <MaterialIcons name="delete" size={18} color="white" />
                <Text className="text-white font-medium text-sm">
                  Remove ({selectedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 h-10 rounded-lg bg-green-600 "
                onPress={() =>
                  router.push({
                    pathname: "/timetable/addSubjectToTimetable/[id]",
                    params: { id: id },
                  })
                }
              >
                <MaterialIcons name="add" size={18} color="white" />
                <Text className="text-white font-medium text-sm">Add More</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <View className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-4 gap-4">
            <View>
              <Text className="text-red-700 dark:text-red-400 font-semibold text-sm">
                Danger Zone
              </Text>
              <Text className="text-red-600/70 dark:text-red-400/70 text-xs mt-1 leading-5">
                This action cannot be undone. This will permanently delete your
                timetable and all associated attendance data.
              </Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 h-11 rounded-lg bg-red-600 active:bg-red-700"
              onPress={handleDelete}
            >
              <MaterialIcons name="delete-forever" size={20} color="white" />
              <Text className="text-white font-medium text-sm">
                Delete Timetable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
