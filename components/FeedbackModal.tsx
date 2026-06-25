import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import Toast from "react-native-toast-message";
import { submitFeedback } from "@/utils/feedbackApi";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOJIS = [
  { emoji: "😡", label: "Terrible" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😊", label: "Good" },
  { emoji: "🤩", label: "Amazing" },
];

export default function FeedbackModal({
  visible,
  onClose,
}: FeedbackModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const canSubmit = feedbackText.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;

    Vibration.vibrate(20);

    // Save variables for background API submission
    const ratingToSend = selectedEmoji ?? "none";
    const feedbackToSend = feedbackText.trim();

    // Reset UI state and close modal optimistically
    setSelectedEmoji(null);
    setFeedbackText("");
    onClose();

    // Show instant success Toast
    Toast.show({
      type: "success",
      text1: "Thank you! 🎉",
      text2: "Your feedback is being submitted.",
    });

    // Fire API request in background
    submitFeedback({
      rating: ratingToSend,
      feedback: feedbackToSend,
    }).catch((error) => {
      console.error("[FEEDBACK] Background submission failed:", error);
      // Show failure Toast in background if it fails
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: "Your feedback couldn't be sent. Please check your network.",
      });
    });
  };

  const handleClose = () => {
    setSelectedEmoji(null);
    setFeedbackText("");
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
                Send Feedback
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
              {/* Emoji Rating */}
              <Text className="text-[#616f89] dark:text-gray-400 text-sm font-medium mb-3">
                How's your experience? (optional)
              </Text>
              <View className="flex-row justify-around mb-5">
                {EMOJIS.map(({ emoji, label }) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      Vibration.vibrate(15);
                      setSelectedEmoji(selectedEmoji === emoji ? null : emoji);
                    }}
                    className={`items-center p-3 rounded-xl ${
                      selectedEmoji === emoji
                        ? "bg-[#135bec]/15 border-2 border-[#135bec]"
                        : "bg-gray-50 dark:bg-[#0f1520] border-2 border-transparent"
                    }`}
                  >
                    <Text className="text-3xl">{emoji}</Text>
                    <Text
                      className={`text-[10px] mt-1 font-medium ${
                        selectedEmoji === emoji
                          ? "text-[#135bec]"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Text Input */}
              <Text className="text-[#616f89] dark:text-gray-400 text-sm font-medium mb-2">
                Tell us what you think
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[#111318] dark:text-white text-base mb-2"
                placeholder="Share your thoughts... (min 10 characters)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
                value={feedbackText}
                onChangeText={setFeedbackText}
                maxLength={1000}
              />
              <Text className="text-gray-400 text-xs text-right mb-4">
                {feedbackText.length}/1000
              </Text>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                className={`py-3.5 rounded-xl items-center ${
                  canSubmit ? "bg-[#135bec]" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <Text className="text-white font-bold text-base">
                  Submit Feedback
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
