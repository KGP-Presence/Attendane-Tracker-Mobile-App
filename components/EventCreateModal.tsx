import { useAddEvent } from "@/hooks/useAddEvent";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import CustomAlertModal from "./CustomAlertModal";

const EVENT_TYPES = ["Exam", "Assignment", "Test", "Other"];

interface EventCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateSuccess?: () => void;
}

export const EventCreateModal = ({
  visible,
  onClose,
  onCreateSuccess,
}: EventCreateModalProps) => {
  const { mutateAsync: addEvent, isPending } = useAddEvent();
  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);

  // Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("kgp");
  const [type, setType] = useState("Other");
  const [description, setDescription] = useState("");

  // Date & Time State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Dropdown State
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [initialDateMs, setInitialDateMs] = useState<number>(date.getTime());

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info",
    mode: "single" as "single" | "confirm",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirmAction: () => {},
    onCancelAction: () => {},
  });

  // Helper function to easily show the alert
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info",
    onConfirmAction = () => {},
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      mode: "single",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirmAction,
      onCancelAction: () => {},
    });
  };

  const showDiscardAlert = () => {
    setAlertConfig({
      visible: true,
      title: "Discard changes?",
      message:
        "You have unsaved changes. Continue to go back and discard this event draft?",
      type: "error",
      mode: "confirm",
      confirmText: "Continue",
      cancelText: "Cancel",
      onConfirmAction: handleClose,
      onCancelAction: () => {},
    });
  };

  const closeAlert = () => {
    const onConfirm = alertConfig.onConfirmAction;
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    onConfirm();
  };

  const cancelAlert = () => {
    const onCancel = alertConfig.onCancelAction;
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    onCancel();
  };

  const resetForm = () => {
    const nextDate = new Date();
    setName("");
    setLocation("kgp");
    setType("Other");
    setDescription("");
    setDate(nextDate);
    setInitialDateMs(nextDate.getTime());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const hasUnsavedChanges = () => {
    return (
      name.trim().length > 0 ||
      location.trim() !== "kgp" ||
      type.trim() !== "Other" ||
      description.trim().length > 0 ||
      Math.abs(date.getTime() - initialDateMs) > 1000
    );
  };

  const handleModalBack = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    if (showTypeMenu) {
      setShowTypeMenu(false);
      return;
    }

    if (showDatePicker) {
      setShowDatePicker(false);
      return;
    }

    if (showTimePicker) {
      setShowTimePicker(false);
      return;
    }

    if (alertConfig.visible) {
      cancelAlert();
      return;
    }

    if (hasUnsavedChanges()) {
      showDiscardAlert();
      return;
    }

    handleClose();
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;

    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleModalBack();
      return true;
    });

    return () => backSub.remove();
  }, [
    visible,
    isKeyboardVisible,
    showTypeMenu,
    showDatePicker,
    showTimePicker,
    alertConfig.visible,
    name,
    location,
    type,
    description,
    date,
    initialDateMs,
  ]);

  useEffect(() => {
    if (!visible) return;

    const focusTimeout = setTimeout(
      () => {
        nameInputRef.current?.focus();
      },
      Platform.OS === "android" ? 250 : 150,
    );

    return () => clearTimeout(focusTimeout);
  }, [visible]);

  const handleDateChange = (event: any, selectedDate: any) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      setDate((prevDate) => {
        const newDate = new Date(prevDate);
        newDate.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );
        return newDate;
      });
    }
  };

  const handleTimeChange = (event: any, selectedTime: any) => {
    // 1. Close picker immediately on Android
    if (Platform.OS === "android") setShowTimePicker(false);

    if (selectedTime) {
      const now = new Date();
      const newDate = new Date(date); // Use current date state

      // 2. Map the selected time to our date object
      newDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0,
      );

      // 3. Validation: Is the selected time in the past?
      if (newDate < now) {
        const message = "Please select a future time";

        if (Platform.OS === "android") {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          // iOS doesn't have a native Toast; Alert is the standard fallback
          Alert.alert("Invalid Time", message);
        }

        // Optional: Reset to current time so the state isn't "stuck" in the past
        setDate(new Date());
      } else {
        // 4. Valid time: Update the state
        setDate(newDate);
      }
    }
  };

  // const handleCreateEvent = async () => {
  //   if (!name || !location || !type) {
  //     Alert.alert("Error", "Please fill out all required fields.");
  //     return;
  //   }

  //   try {
  //     await addEvent({
  //       name,
  //       location,
  //       type,
  //       date: date.toISOString(), // Send the exact ISO string
  //       description,
  //     });

  //     Alert.alert("Success", "Event created successfully!");
  //     handleClose();
  //   } catch (error) {
  //     Alert.alert("Error", "Failed to create event. Please try again.");
  //   }
  // };

  const handleCreateEvent = async () => {
    if (!name || !location || !type) {
      showAlert("Error", "Please fill out all required fields.", "error");
      return;
    }

    try {
      await addEvent({
        name,
        location,
        type,
        date: date.toISOString(),
        description,
      });
      handleClose();
      onCreateSuccess?.();
    } catch (error) {
      showAlert("Error", "Failed to create event. Please try again.", "error");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleModalBack}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-zinc-50 dark:bg-zinc-950 rounded-t-3xl max-h-[90%] overflow-hidden shadow-2xl">
            {/* Top Bar with Close Button */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                Add New Event
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color="#64748B"
                  className="dark:text-zinc-400"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              {/* Event Name */}
              <View className="mb-4">
                <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                  Event Name
                </Text>
                <TextInput
                  ref={nameInputRef}
                  value={name}
                  onChangeText={setName}
                  autoFocus={false}
                  placeholder="e.g. Advanced Calculus Class Test"
                  placeholderTextColor="#94a3b8"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-14 px-4 text-base text-zinc-900 dark:text-zinc-100 focus:border-sky-500"
                />
              </View>

              {/* Location */}
              <View className="mb-4">
                <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                  Location
                </Text>
                <View className="relative justify-center">
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color="#94a3b8"
                    style={{ position: "absolute", left: 16, zIndex: 10 }}
                  />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Enter location or room number"
                    placeholderTextColor="#94a3b8"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-14 pl-12 pr-4 text-base text-zinc-900 dark:text-zinc-100 focus:border-sky-500"
                  />
                </View>
              </View>

              {/* Type Dropdown */}
              <View className="mb-4">
                <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                  Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTypeMenu(true)}
                  activeOpacity={0.7}
                  className="w-full flex-row items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-14 px-4"
                >
                  <Text
                    className={`text-base ${type ? "text-zinc-900 dark:text-zinc-100" : "text-slate-400"}`}
                  >
                    {type || "Select event type"}
                  </Text>
                  <MaterialIcons name="expand-more" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Date & Time Row */}
              <View className="flex-row gap-4 mb-4">
                {/* Date Picker Button */}
                <View className="flex-1">
                  <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                    Date
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                    className="w-full flex-row items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                  >
                    <View className="flex-1 justify-center h-14 px-4">
                      <Text className="text-base text-zinc-900 dark:text-zinc-100">
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View className="h-14 w-12 items-center justify-center bg-sky-500/10 border-l border-zinc-200 dark:border-zinc-800">
                      <MaterialIcons
                        name="calendar-today"
                        size={20}
                        color="#0ea5e9"
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Time Picker Button */}
                <View className="flex-1">
                  <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                    Time
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                    className="w-full flex-row items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                  >
                    <View className="flex-1 justify-center h-14 px-4">
                      <Text className="text-base text-zinc-900 dark:text-zinc-100">
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View className="h-14 w-12 items-center justify-center bg-sky-500/10 border-l border-zinc-200 dark:border-zinc-800">
                      <MaterialIcons
                        name="access-time"
                        size={20}
                        color="#0ea5e9"
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Render Native Date/Time Pickers */}
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
              {Platform.OS === "ios" && showDatePicker && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  className="mb-4 items-end pr-2"
                >
                  <Text className="text-sky-500 font-bold">Done</Text>
                </TouchableOpacity>
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                  minimumDate={new Date()}
                />
              )}
              {Platform.OS === "ios" && showTimePicker && (
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  className="mb-4 items-end pr-2"
                >
                  <Text className="text-sky-500 font-bold">Done</Text>
                </TouchableOpacity>
              )}

              {/* Description */}
              <View className="mb-8 mt-2">
                <Text className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold mb-2 ml-1">
                  Description{" "}
                  <Text className="text-zinc-400 font-normal">(Optional)</Text>
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  autoFocus={false}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }}
                  placeholder="Add additional details about the event..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[140px] p-4 text-base text-zinc-900 dark:text-zinc-100 focus:border-sky-500"
                />
              </View>

              {/* Action Button */}
              <TouchableOpacity
                onPress={handleCreateEvent}
                disabled={isPending}
                activeOpacity={0.8}
                className={`w-full h-14 rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-sky-500/20 ${isPending ? "bg-sky-400" : "bg-sky-500"}`}
              >
                {isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="add-circle-outline"
                      size={24}
                      color="#ffffff"
                    />
                    <Text className="text-white text-base font-bold">
                      Create Event
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Type Selection Nested Modal */}
      <Modal
        visible={showTypeMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypeMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPress={() => setShowTypeMenu(false)}
          className="justify-center items-center p-6"
        >
          <View className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden p-2">
            <Text className="text-zinc-500 dark:text-zinc-400 font-semibold px-4 py-3 text-sm border-b border-zinc-100 dark:border-zinc-800">
              Select Event Type
            </Text>
            {EVENT_TYPES.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => {
                  setType(item);
                  setShowTypeMenu(false);
                }}
                className={`flex-row items-center justify-between p-4 rounded-xl ${type === item ? "bg-sky-500/10" : ""}`}
              >
                <Text
                  className={`text-base ${type === item ? "text-sky-600 dark:text-sky-400 font-bold" : "text-zinc-800 dark:text-zinc-200"}`}
                >
                  {item}
                </Text>
                {type === item && (
                  <MaterialIcons name="check" size={20} color="#0ea5e9" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        mode={alertConfig.mode}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={closeAlert}
        onCancel={cancelAlert}
        onClose={closeAlert}
      />
    </Modal>
  );
};
