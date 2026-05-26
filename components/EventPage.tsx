import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  SectionList,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
  useColorScheme,
  Animated,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { EventCard } from "../components/EventCard";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { ChevronLeft, User } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useAddEventFromAudio } from "../hooks/useAddEvent";
import { useDeleteMultipleEvents, useEvents } from "../hooks/useEvents";
import { AppEvent, EventType } from "../types/event";

import CustomAlertModal from "./CustomAlertModal";
import { CopilotOverlay } from "./CopilotOverlay";
import { EventCreateModal } from "./EventCreateModal";
import { VoiceRecordingModal } from "./VoiceRecordingModal";
import { useCopilot } from "../hooks/useCopilot";

// Helper to format dates for section headers
const formatDateGroup = (isoString: string) => {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const formattedDate = date.toLocaleDateString("en-US", options);

  if (isToday) return `Today, ${formattedDate}`;
  if (isTomorrow) return `Tomorrow, ${formattedDate}`;
  return formattedDate;
};

const EVENT_TYPES = ["All", "Exam", "Assignment", "Test", "Other"];

// Constants for Audio Limits and Silence Detection
const MAX_RECORDING_DURATION = 15000; // 15 seconds max length
const SILENCE_TIMEOUT = 1500; // 3 seconds of continuous silence to trigger auto-stop
const SILENCE_THRESHOLD = -40; // Decibel (dB) threshold for silence

export const EventsScreen = () => {
  const { data: events, isLoading, isError, refetch } = useEvents();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  
  const {
    mutateAsync: deleteMultipleEventsMutation,
    isPending: isDeletingMultiple,
  } = useDeleteMultipleEvents();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<EventType | "All">("All");
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [showCreateSuccessAlert, setShowCreateSuccessAlert] = useState(false);

  // First-time user copilot
  const { isReady, shouldShow, markComplete } = useCopilot();

  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

  // Refs needed for Audio progress checks
  const isStoppingRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  // Array of Animated Values for the waveform bars
  const meteringAnims = useRef([...Array(5)].map(() => new Animated.Value(0)));

  // Multi-select State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const hasEvents = events && events.length > 0;

  const sectionedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let eventsToDisplay = sortedEvents;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      eventsToDisplay = eventsToDisplay.filter(
        (event) =>
          event.name?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query),
      );
    }

    if (selectedType !== "All") {
      eventsToDisplay = eventsToDisplay.filter(
        (event) => event.type === selectedType,
      );
    }

    return eventsToDisplay.reduce(
      (acc, event) => {
        const groupTitle = formatDateGroup(event.date);
        const group = acc.find((g) => g.title === groupTitle);
        if (group) {
          group.data.push(event);
        } else {
          acc.push({ title: groupTitle, data: [event] });
        }
        return acc;
      },
      [] as { title: string; data: AppEvent[] }[],
    );
  }, [events, searchQuery, selectedType]);

  const handleBack = () => {
    if (Platform.OS === "android") Vibration.vibrate(20);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const {
    mutateAsync: addEventFromAudioMutation,
    isPending: isUploadingAudio,
  } = useAddEventFromAudio();

  const handleSelectAll = () => {
    if (!events) return;
    if (selectedEventIds.length === events.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(events.map((e) => e._id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEventIds.length === 0) return;
    Alert.alert(
      "Delete Multiple Events",
      `Are you sure you want to delete ${selectedEventIds.length} event(s)? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMultipleEventsMutation({ ids: selectedEventIds });
              setIsSelectionMode(false);
              setSelectedEventIds([]);

              Toast.show({
                type: "success",
                text1: "Events Deleted 🗑️",
                text2: "The selected events were permanently removed.",
              });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Delete Failed",
                text2: "Could not delete the selected events. Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  const ensureAudioPermission = async () => {
    const permissionResponse = await Audio.requestPermissionsAsync();
    
    if (permissionResponse.status !== 'granted') {
      Alert.alert(
        "Microphone Required",
        "Microphone access is mandatory to create events. Please enable it in your device settings to continue.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Open Settings", 
            onPress: () => Linking.openSettings() // Forces them to the OS settings
          }
        ]
      );
      return false; // Denied
    }
    return true; // Granted
  };

  const stopRecordingAndSubmit = async () => {
    if (isStoppingRef.current || !recordingRef.current) return;
    
    isStoppingRef.current = true;
    const currentRecording = recordingRef.current;

    try {
      // Clear UI state immediately
      setRecording(null);
      recordingRef.current = null;

      // FIX: Detach the listener FIRST so it doesn't fire while we are unloading
      currentRecording.setOnRecordingStatusUpdate(null);
      
      await currentRecording.stopAndUnloadAsync();

      // FIX: Give the filesystem a tiny amount of time to actually finalize the file.
      // This prevents the React Native Network Error when trying to read an unclosed file.
      await new Promise(resolve => setTimeout(resolve, 300));

      // Reset animation values and duration
      meteringAnims.current.forEach(anim => anim.setValue(0));
      setRecordingDurationMs(0);

      const uri = currentRecording.getURI();
      if (!uri) throw new Error("No recording URI");

      const fileExt = uri.split(".").pop() || "m4a";
      const normalizedUri =
        Platform.OS === "android" && !uri.startsWith("file://")
          ? `file://${uri}`
          : uri;

      const formData = new FormData();
      formData.append("audio", {
        uri: normalizedUri,
        name: `recording.${fileExt}`,
        type: `audio/${fileExt === "m4a" ? "mp4" : fileExt}`,
      } as any);

      Keyboard.dismiss();
      await addEventFromAudioMutation(formData);

      Toast.show({
        type: "success",
        text1: "Event created 🎙️",
        text2: "Your event was successfully extracted from the audio.",
      });
    } catch (error : any) {
      console.log("Upload Error Details:", error);
      
      let title = "Upload Failed";
      let message = "Could not process the audio. Is your backend reachable?";

      // Handle Backend Rate Limiting (429 Too Many Requests)
      if (error?.response?.status === 429 || error?.message?.includes('429')) {
        title = "Daily Limit Reached ⏳";
        message = "Our daily audio processing limit has been reached. Please try typing your event or try again tomorrow!";
      }

      Toast.show({
        type: "error",
        text1: title,
        text2: message,
      });

      // console.error("Upload Error Details:", error);
      // Toast.show({
      //   type: "error",
      //   text1: "Upload Failed",
      //   text2: "Could not process the audio. Is your backend reachable?",
      // });
    } finally {
      isStoppingRef.current = false;
    }
  };

  // Status Update Handler checking limit, silence, AND animating waveforms
  const onRecordingStatusUpdate = useCallback(async (status: Audio.RecordingStatus) => {
    if (!status.isRecording || isStoppingRef.current) return;

    // 1. Update the Waveform Animations based on Decibels
    const currentMetering = status.metering ?? -160;
    // Normalize metering (-60 to 0) to a value roughly between 0 and 1
    const normalizedLevel = Math.max(0, Math.min(1, (currentMetering + 60) / 60));
    
    // Animate each bar with slight phase multipliers so they wave naturally
    const waveMultipliers = [0.5, 0.8, 1.2, 0.8, 0.5];
    meteringAnims.current.forEach((anim, i) => {
      // Add slight randomness to make it feel organic
      const targetValue = Math.max(0.1, normalizedLevel * waveMultipliers[i] * (0.8 + Math.random() * 0.4));
      Animated.timing(anim, {
        toValue: targetValue,
        duration: 150, // Matches roughly the polling interval
        useNativeDriver: true,
      }).start();
    });

    // 1b. Track elapsed duration for the modal UI
    setRecordingDurationMs(status.durationMillis);

    // 2. Check Max Duration Limit
    if (status.durationMillis >= MAX_RECORDING_DURATION) {
      console.log("Maximum recording duration reached.");
      await stopRecordingAndSubmit();
      return;
    }

    // 3. Check Audio Silence (Auto-stop)
    if (currentMetering < SILENCE_THRESHOLD) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = status.durationMillis;
      } else {
        const silentDuration = status.durationMillis - silenceStartRef.current;
        if (silentDuration >= SILENCE_TIMEOUT) {
          console.log("Auto-stopping due to prolonged silence.");
          await stopRecordingAndSubmit();
        }
      }
    } else {
      silenceStartRef.current = null; // Reset silence tracker if user speaks
    }
  }, []);

  const startRecording = async () => {
    try {
      if (Platform.OS === "android") Vibration.vibrate(20);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 🛑 The Hard Gate
      const hasPermission = await ensureAudioPermission();
      if (!hasPermission) return;
      
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true, // Required for waveform and silence detection
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );

      // We set update interval to 150ms for smoother animation frames
      newRecording.setProgressUpdateInterval(150);
      newRecording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);

      setRecording(newRecording);
      recordingRef.current = newRecording;
      isStoppingRef.current = false;
      silenceStartRef.current = null;
      setRecordingDurationMs(0);
    } catch (err) {
      console.error("Failed to start recording", err);
      Toast.show({
        type: "error",
        text1: "Recording Failed",
        text2: "Could not start audio recording.",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] dark:bg-background-dark">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View className="px-5 pt-2 pb-0">
        {/* Dynamic Header */}
        {isSelectionMode ? (
          <View className="flex-row items-center justify-between mb-4 mt-2 bg-blue-50 dark:bg-slate-800 p-2 rounded-xl">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedEventIds([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="close"
                  size={26}
                  color={isDark ? "#E2E8F0" : "#1E293B"}
                />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedEventIds.length} Selected
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={handleSelectAll} className="mr-2">
                <Text className="text-[#135bec] dark:text-blue-400 font-semibold text-base">
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteSelected}
                disabled={selectedEventIds.length === 0 || isDeletingMultiple}
              >
                {isDeletingMultiple ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <MaterialIcons
                    name="delete"
                    size={26}
                    color={selectedEventIds.length === 0 ? "gray" : "#EF4444"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={28} color="#135bec" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                Events
              </Text>
            </View>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <User
                size={24}
                color="#135bec"
                onPress={() => {
                  if (Platform.OS === "android") Vibration.vibrate(20);
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/profile/profile");
                }}
              />
            </TouchableOpacity>
          </View>
        )}

        <View className="mb-3 shadow-sm">
          <View className="relative w-full justify-center">
            <MaterialIcons
              name="search"
              size={22}
              color={isDark ? "#64748B" : "#94A3B8"}
              style={{ position: "absolute", left: 16, zIndex: 10 }}
            />
            <TextInput
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-slate-100"
              placeholder="Search by name or location"
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View className="flex-row items-center gap-3 mb-0">
          <TouchableOpacity
            onPress={() => hasEvents && setIsTypeMenuOpen(true)}
            disabled={!hasEvents}
            className={`flex-row items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm ${!hasEvents ? "opacity-50" : ""}`}
          >
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {selectedType === "All" ? "Type" : selectedType}
            </Text>
            <MaterialIcons
              name="expand-more"
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-red-500 font-medium text-center">
            Failed to load events. Please try again later.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sectionedEvents}
          keyExtractor={(item) => item._id}
          onRefresh={onRefresh}
          refreshing={refreshing}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListEmptyComponent={<EmptyState />}
          ItemSeparatorComponent={() => <View className="h-1.5" />}
          renderSectionHeader={({ section: { title } }) => (
            <View className="flex-row items-center gap-3 mb-2 mt-6">
              <Text className="text-xs font-bold tracking-wider uppercase text-slate-400">
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              isSelectionMode={isSelectionMode}
              isSelected={selectedEventIds.includes(item._id)}
              onLongPress={() => {
                if (!isSelectionMode) {
                  setIsSelectionMode(true);
                  setSelectedEventIds([item._id]);
                  if (Platform.OS === "android")
                    Vibration.vibrate(40);
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }
              }}
              onPress={() => {
                if (isSelectionMode) {
                  setSelectedEventIds((prev) =>
                    prev.includes(item._id)
                      ? prev.filter((id) => id !== item._id)
                      : [...prev, item._id],
                  );
                }
              }}
            />
          )}
        />
      )}

      <Modal
        visible={isTypeMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTypeMenuOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center px-10"
          activeOpacity={1}
          onPress={() => setIsTypeMenuOpen(false)}
        >
          <View className="bg-white dark:bg-slate-900 w-full rounded-2xl overflow-hidden shadow-xl">
            <View className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
              <Text className="text-base font-bold text-slate-800 dark:text-slate-200 text-center">
                Select Event Type
              </Text>
            </View>
            {EVENT_TYPES.map((type, index) => (
              <TouchableOpacity
                key={type}
                className={`py-4 border-b border-gray-100 dark:border-slate-800 ${
                  selectedType === type
                    ? "bg-blue-50/50 dark:bg-blue-900/20"
                    : "bg-white dark:bg-slate-900"
                } ${index === EVENT_TYPES.length - 1 ? "border-b-0" : ""}`}
                onPress={() => {
                  setSelectedType(type as EventType | "All");
                  setIsTypeMenuOpen(false);
                }}
              >
                <Text
                  className={`text-center font-medium ${selectedType === type ? "text-[#135bec] dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {!isSelectionMode && (
        <>
          {/* Audio Record Button — always shows mic, modal handles the listening UI */}
          <View className="absolute bottom-60 right-6 z-10 justify-center items-center">
            <TouchableOpacity
              activeOpacity={0.9}
              className="w-14 h-14 rounded-full justify-center items-center shadow-lg bg-indigo-500 shadow-indigo-300 dark:shadow-none"
              onPress={startRecording}
              disabled={isUploadingAudio || !!recording}
            >
              {isUploadingAudio ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialIcons name="mic" size={28} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Manual Create Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-blue-300 dark:shadow-none z-10"
            onPress={() => {
              Keyboard.dismiss();
              setIsCreateModalVisible(true);
            }}
          >
            <MaterialIcons name="add" size={30} color="#ffffff" />
          </TouchableOpacity>
        </>
      )}

      <EventCreateModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreateSuccess={() => {
          setTimeout(() => {
            setShowCreateSuccessAlert(true);
          }, 120);
        }}
      />

      <CustomAlertModal
        visible={showCreateSuccessAlert}
        title="Success"
        message="Event created successfully!"
        type="success"
        onClose={() => setShowCreateSuccessAlert(false)}
      />

      {/* First-time user copilot onboarding */}
      {isReady && (
        <CopilotOverlay
          visible={shouldShow}
          onDone={markComplete}
        />
      )}

      {/* Immersive voice recording popup */}
      <VoiceRecordingModal
        visible={!!recording || isUploadingAudio}
        meteringAnims={meteringAnims.current}
        durationMs={recordingDurationMs}
        isUploading={isUploadingAudio}
        onStop={stopRecordingAndSubmit}
      />
    </SafeAreaView>
  );
};