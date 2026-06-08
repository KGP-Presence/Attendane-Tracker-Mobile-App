import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  ScrollView,
} from "react-native";
import { X, Camera, Trash2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { submitBugReport } from "@/utils/feedbackApi";

interface BugReportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BugReportModal({
  visible,
  onClose,
}: BugReportModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [description, setDescription] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  const canSubmit = description.trim().length >= 10;

  const pickScreenshot = async () => {
    Vibration.vibrate(20);

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please grant photo library access to attach a screenshot.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5, // Compress for faster upload
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    Vibration.vibrate(20);

    // Save variables for background API submission
    const descriptionToSend = description.trim();
    const screenshotToSend = screenshotUri;

    // Reset UI state and close modal optimistically
    setDescription("");
    setScreenshotUri(null);
    onClose();

    // Show instant success Toast
    Toast.show({
      type: "success",
      text1: "Bug Reported 🐛",
      text2: "Thank you! Submission is in progress.",
    });

    // Fire API request in background
    submitBugReport({
      description: descriptionToSend,
      screenshotUri: screenshotToSend,
    }).catch((error) => {
      console.error("[BUG REPORT] Background submission failed:", error);
      // Show failure Toast in background if it fails
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: "We couldn't submit your bug report. Please try again.",
      });
    });
  };

  const handleClose = () => {
    setDescription("");
    setScreenshotUri(null);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-[#1a2230] rounded-t-3xl px-5 pt-4 pb-8 max-h-[90%]">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Text className="text-xl font-bold text-[#111318] dark:text-white">
                Report a Bug
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <X size={18} color={isDark ? "#e5e7eb" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Description Input */}
              <Text className="text-[#616f89] dark:text-gray-400 text-sm font-medium mb-2">
                Describe the bug
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[#111318] dark:text-white text-base mb-2"
                placeholder="What happened? What did you expect? (min 10 chars)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
                value={description}
                onChangeText={setDescription}
                maxLength={2000}
              />
              <Text className="text-gray-400 text-xs text-right mb-4">
                {description.length}/2000
              </Text>

              {/* Screenshot Attachment */}
              <Text className="text-[#616f89] dark:text-gray-400 text-sm font-medium mb-2">
                Attach screenshot (optional)
              </Text>

              {screenshotUri ? (
                <View className="relative mb-4">
                  <Image
                    source={{ uri: screenshotUri }}
                    className="w-full h-40 rounded-xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      Vibration.vibrate(15);
                      setScreenshotUri(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-full"
                  >
                    <Trash2 size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickScreenshot}
                  className="flex-row items-center justify-center gap-2 py-4 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl"
                >
                  <Camera size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
                  <Text className="text-gray-500 dark:text-gray-400 font-medium">
                    Tap to add screenshot
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                className={`py-3.5 rounded-xl items-center ${
                  canSubmit ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <Text className="text-white font-bold text-base">
                  Submit Bug Report
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
