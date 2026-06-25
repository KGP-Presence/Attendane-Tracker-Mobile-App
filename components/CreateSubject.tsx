import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  useColorScheme,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreateSubject } from "@/hooks/useCreateSubject";
import { useGetSubjectByCode } from "@/hooks/useGetSubjectByCode";
import { useAddSubjectsToTimetable } from "@/hooks/useEditTimetableSubjects"; 
import { timeSlots } from "@/constants/slotData";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const dayMap = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export default function CreateSubjectPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- BATCH & TIMETABLE LOGIC ---
  const { batchCodes, timetableId } = useLocalSearchParams<{
    batchCodes?: string;
    timetableId?: string;
  }>();
  const codesArray = batchCodes ? batchCodes.split(",") : [];
  const isBatchMode = codesArray.length > 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [createdSubjectIds, setCreatedSubjectIds] = useState<string[]>([]); // Track successfully created IDs

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const dayFull = {
    Mon: "MONDAY",
    Tue: "TUESDAY",
    Wed: "WEDNESDAY",
    Thu: "THURSDAY",
    Fri: "FRIDAY",
  };
  const TIME_LABELS = [
    "8 AM - 9 AM",
    "9 AM - 10 AM",
    "10 AM - 11 AM",
    "11 AM - 12 PM",
    "12 PM - 1 PM",
    "1 PM - 2 PM (LUNCH)",
    "2 PM - 3 PM",
    "3 PM - 4 PM",
    "4 PM - 5 PM",
    "5 PM - 6 PM",
  ];

  const mapUiToSlotKey = (day: string, timeLabel: string) => {
    const timeRange = timeLabel.replace(/\s/g, "").replace(" (LUNCH)", "");
    return `${dayFull[day as keyof typeof dayFull]}_${timeRange}`;
  };

  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [credits, setCredits] = useState(3);
  const [grading, setGrading] = useState<"ABSOLUTE" | "RELATIVE" | "UNKNOWN">(
    "UNKNOWN",
  );
  const [professors, setProfessors] = useState<string[]>([]);
  const [currentProf, setCurrentProf] = useState("");
  const [venues, setVenues] = useState<string[]>([]);
  const [currentVenue, setCurrentVenue] = useState("");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [type, setType] = useState<"THEORY" | "LAB" | "OTHER">("OTHER");

  const { mutate: createSubject, isPending: isCreating } = useCreateSubject();
  // Initialize timetable hook (fallback to empty string if not provided so React Query doesn't complain)
  const { mutate: addToTimetable, isPending: isAddingToTimetable } =
    useAddSubjectsToTimetable(timetableId || "");

  const { data: fetchedSubject, isFetching: isSearching } = useGetSubjectByCode(
    subjectCode.toUpperCase(),
  );

  useEffect(() => {
    if (isBatchMode && currentIndex < codesArray.length) {
      setSubjectCode(codesArray[currentIndex]);
    }
  }, [currentIndex, isBatchMode]);

  useEffect(() => {
    if (fetchedSubject) {
      setSubjectName(fetchedSubject.subjectName);
      setCredits(Number(fetchedSubject.credits) || 0);

      const parsedProfessors = fetchedSubject.professors
        ? fetchedSubject.professors
            .split(",")
            .map((prof: string) => prof.trim())
        : [];
      setProfessors(parsedProfessors);

      const parsedVenues: string[] = fetchedSubject.venue
        ? fetchedSubject.venue.split(",").map((v: string) => v.trim())
        : [];
      setVenues([...new Set(parsedVenues)]);

      if (fetchedSubject.slots) {
        const slots = fetchedSubject.slots.split(/[ ,]+/);
        let mappedTimeBlocks: string[] = [];
        (slots as string[]).map((slot: string) => {
          if (slot.length === 1)
            mappedTimeBlocks = [...mappedTimeBlocks, ...timeSlots[slot]];
          else
            mappedTimeBlocks = [
              ...mappedTimeBlocks,
              timeSlots[slot.substring(0, 2)][Number(slot.substring(2)) - 1],
            ];
        });
        mappedTimeBlocks.sort((a, b) => {
          const dayA = dayMap[a.split("_")[0] as keyof typeof dayMap],
            dayB = dayMap[b.split("_")[0] as keyof typeof dayMap];
          if (dayA === dayB) return a < b ? -1 : 1;
          return dayA < dayB ? -1 : 1;
        });
        setSelectedSlots(mappedTimeBlocks);

        let count = 0;
        slots.forEach((slot: string) => {
          if (slot.length === 1) count++;
        });
        if (count === 0) setType("THEORY");
        else if (count === slots.length) setType("LAB");
      }
    } else {
      setSubjectName("");
      setCredits(3);
      setProfessors([]);
      setVenues([]);
      setSelectedSlots([]);
      setGrading("UNKNOWN");
      setType("OTHER");
    }
  }, [fetchedSubject, subjectCode]);

  const toggleSlot = (slotKey: string) => {
    if (Platform.OS === "android") Vibration.vibrate(20);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (slotKey.includes("1-2PM")) return;
    setSelectedSlots((prev) =>
      prev.includes(slotKey)
        ? prev.filter((s) => s !== slotKey)
        : [...prev, slotKey],
    );
  };

  // Centralized navigation/completion handler
  const handleNextStep = (newlyCreatedId?: string) => {
    // Combine existing IDs with the one we just created (if any)
    const finalIdsToSubmit = newlyCreatedId
      ? [...createdSubjectIds, newlyCreatedId]
      : createdSubjectIds;

    if (newlyCreatedId) {
      setCreatedSubjectIds(finalIdsToSubmit);
    }

    if (isBatchMode && currentIndex < codesArray.length - 1) {
      // Move to next subject in the queue
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop is finished (or we only had one subject)!
      if (timetableId && finalIdsToSubmit.length > 0) {
        router.replace(`/timetable/addSubjectToTimetable/${timetableId}`);
      } else {
        if (router.canGoBack()) router.back();
      }
    }
  };

  const handleCreate = () => {
    if (Platform.OS === "android") Vibration.vibrate(20);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (venues.length === 0) setVenues(["Unknown"]);

    createSubject(
      {
        code: subjectCode.toUpperCase(),
        name: subjectName,
        credits,
        grading,
        professors,
        venues: venues.length ? venues : ["Unknown"],
        slots: selectedSlots,
        type,
      },
      {
        onSuccess: (data: any) => {
          // IMPORTANT: Extract the new subject's ID from your backend response.
          // Change `data.id` to `data._id` if you use MongoDB!
          const newSubjectId = data.id || data._id;
          handleNextStep(newSubjectId);
        },
      },
    );
  };

  const primaryColor = isDark ? "#60a5fa" : "#2563eb";
  const placeholderColor = isDark ? "#9ca3af" : "#9ca3af";

  // Determine if we are loading either creation or assignment
  const isLoading = isCreating || isAddingToTimetable;

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-gray-900"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === "android") Vibration.vibrate(20);
              else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            className="p-1"
          >
            <Text className="text-blue-600 dark:text-blue-400 text-lg font-medium">
              Cancel
            </Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              New Subject
            </Text>
            {isBatchMode && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {currentIndex + 1} of {codesArray.length}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading}
            className="p-1"
          >
            <Text
              className={`text-lg font-semibold ${isLoading ? "text-gray-400 dark:text-gray-600" : "text-blue-600 dark:text-blue-400"}`}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback>
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 300 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Subject Code */}
            <View className="mt-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Subject Code
              </Text>
              <View className="relative">
                <TextInput
                  className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-base"
                  placeholder="e.g. AE20202"
                  value={subjectCode}
                  onChangeText={setSubjectCode}
                  autoCapitalize="characters"
                  placeholderTextColor={placeholderColor}
                  editable={!isBatchMode}
                />
                {isSearching && (
                  <View className="absolute right-4 top-4">
                    <ActivityIndicator size="small" color={primaryColor} />
                  </View>
                )}
              </View>
            </View>

            {/* Subject Name */}
            <View className="mt-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Subject Name
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-base"
                placeholder="e.g. Flight Vehicle Controls"
                value={subjectName}
                onChangeText={setSubjectName}
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* Schedule Slots Section */}
            <View className="mt-8">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Schedule Slots</Text>
              
              {/* Conditionally rendered informational message */}
              {fetchedSubject && (
                <View className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-4 flex-row items-start">
                  <Ionicons name="information-circle" size={18} color={isDark ? '#93c5fd' : '#2563eb'} style={{ marginTop: 1 }} />
                  <Text className="text-blue-700 dark:text-blue-300 text-xs ml-2 flex-1 leading-tight">
                    Slot details are auto-fetched based on the subject code. Please verify them with your official timetable before proceeding.
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between mb-6">
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-full border ${selectedDay === day ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500" : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"}`}
                  >
                    <Text
                      className={`font-semibold ${selectedDay === day ? "text-white" : "text-gray-600 dark:text-gray-300"}`}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row flex-wrap justify-between">
                {TIME_LABELS.map((label) => {
                  const slotKey = mapUiToSlotKey(selectedDay, label);
                  const isSelected = selectedSlots.includes(slotKey);
                  const isLunch = label.includes("LUNCH");

                  const slotBg = isLunch
                    ? "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                    : isSelected
                      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700";

                  const slotText = isSelected
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400";

                  return (
                    <TouchableOpacity
                      key={label}
                      disabled={isLunch}
                      onPress={() => toggleSlot(slotKey)}
                      className={`w-[48%] mb-3 p-4 rounded-xl items-center border 
                        ${slotBg} ${isLunch ? "border-dashed opacity-50" : ""}`}
                    >
                      <Text className={`text-xs font-bold ${slotText}`}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selection Chips */}
            {selectedSlots.length > 0 && (
              <View className="mt-4 flex-row flex-wrap">
                {selectedSlots.map((slot) => (
                  <View
                    key={slot}
                    className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex-row items-center px-3 py-1 rounded-md mr-2 mb-2"
                  >
                    <Text className="text-blue-700 dark:text-blue-300 text-[10px] font-medium mr-1">
                      {slot.replace("_", " ")}
                    </Text>
                    <TouchableOpacity onPress={() => toggleSlot(slot)}>
                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={isDark ? "#93c5fd" : "#2563eb"}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View className="h-[1px] bg-gray-100 dark:bg-gray-800 my-8" />

            {/* Credits and Grading */}
            <View className="flex-row justify-between h-14 mb-6">
              <View className="w-[45%]">
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Credits
                </Text>
                <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2">
                  <TouchableOpacity
                    onPress={() => setCredits(Math.max(0, credits - 1))}
                    className="p-2"
                  >
                    <Ionicons name="remove" size={20} color={primaryColor} />
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {credits}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCredits(credits + 1)}
                    className="p-2"
                  >
                    <Ionicons name="add" size={20} color={primaryColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="w-[45%]">
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Grading
                </Text>
                <View className="flex-row bg-gray-50 dark:bg-gray-800 rounded-xl p-1 h-full items-center">
                  {(["ABSOLUTE", "RELATIVE"] as const).map((gradeType) => {
                    const isActive = grading === gradeType;
                    return (
                      <TouchableOpacity
                        key={gradeType}
                        onPress={() =>
                          grading === gradeType
                            ? setGrading("UNKNOWN")
                            : setGrading(gradeType)
                        }
                        className={`flex-1 py-[13px] rounded-lg items-center ${isActive ? "bg-white dark:bg-gray-700" : "bg-transparent"}`}
                        style={
                          isActive
                            ? { shadowColor: "#000", shadowOpacity: 0.1 }
                            : {}
                        }
                      >
                        <Text
                          className={
                            isActive
                              ? "text-blue-600 dark:text-blue-400 font-semibold"
                              : "text-gray-400 dark:text-gray-500"
                          }
                        >
                          {gradeType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Subject Type */}
            <View className="my-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Subject Type
              </Text>
              <View className="flex-row bg-gray-50 dark:bg-gray-800 rounded-xl p-1 h-14 items-center">
                {(["THEORY", "LAB", "OTHER"] as const).map((subjectType) => {
                  const isActive = type === subjectType;
                  return (
                    <TouchableOpacity
                      key={subjectType}
                      onPress={() => setType(subjectType)}
                      className={`flex-1 py-[13px] rounded-lg items-center ${isActive ? "bg-white dark:bg-gray-700" : "bg-transparent"}`}
                      style={
                        isActive
                          ? { shadowColor: "#000", shadowOpacity: 0.1 }
                          : {}
                      }
                    >
                      <Text
                        className={
                          isActive
                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-gray-400 dark:text-gray-500"
                        }
                      >
                        {subjectType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Professors */}
            <View className="mt-2 mb-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Professors
              </Text>
              <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 mb-4">
                <TextInput
                  className="flex-1 py-4 text-base text-gray-900 dark:text-white"
                  placeholder="Add Professor..."
                  value={currentProf}
                  onChangeText={setCurrentProf}
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (
                      currentProf &&
                      !professors.includes(currentProf.trim())
                    ) {
                      setProfessors([...professors, currentProf.trim()]);
                      setCurrentProf("");
                    }
                  }}
                  className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2"
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {professors.map((prof, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl p-3 mb-2"
                >
                  <Text className="text-gray-700 dark:text-gray-200 font-medium">
                    {prof}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setProfessors(professors.filter((_, i) => i !== index))
                    }
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={isDark ? "#9ca3af" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Venues */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Venues
              </Text>
              <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 mb-4">
                <TextInput
                  className="flex-1 py-4 text-base text-gray-900 dark:text-white"
                  placeholder="Add Venue..."
                  value={currentVenue}
                  onChangeText={setCurrentVenue}
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (currentVenue && !venues.includes(currentVenue.trim())) {
                      setVenues([...venues, currentVenue.trim()]);
                      setCurrentVenue("");
                    }
                  }}
                  className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2"
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {venues.map((venue, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl p-3 mb-2"
                >
                  <Text className="text-gray-700 dark:text-gray-200 font-medium">
                    {venue}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setVenues(venues.filter((_, i) => i !== index))
                    }
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={isDark ? "#9ca3af" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading}
              className={`py-5 mt-4 rounded-2xl items-center ${isLoading ? "bg-gray-300 dark:bg-gray-700" : "bg-blue-600 dark:bg-blue-500 shadow-lg shadow-blue-200 dark:shadow-none"}`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  {isBatchMode && currentIndex < codesArray.length - 1
                    ? "Create & Next"
                    : "Create Subject"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Skip Option for Batch Mode */}
            {isBatchMode && (
              <TouchableOpacity
                onPress={() => handleNextStep()} // Calling without an ID skips saving to the array
                disabled={isLoading}
                className="py-5 items-center mb-10"
              >
                <Text className="text-gray-500 dark:text-gray-400 text-base font-semibold">
                  Skip this subject
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
