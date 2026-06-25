import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@expo/vector-icons/MaterialIcons";
import { useColorScheme } from "nativewind";

const VerifyEmailScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [email, setEmail] = useState("");

  // Color constants based on theme for Icons
  const iconColor = isDark ? "#ffffff" : "#111318";
  const placeholderColor = "#9ca3af"; // gray-400

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-4 max-w-md w-full mx-auto self-center">
            {/* Header / Back Button */}
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full hover:bg-gray-200/50 active:bg-gray-200 dark:active:bg-gray-800">
                <Icon name="arrow-back" size={24} color={iconColor} />
              </TouchableOpacity>
            </View>

            {/* Main Content Container */}
            <View className="flex-1 items-center pt-4">
              {/* Hero Icon Section */}
              <View className="relative mb-8 items-center">
                <View className="h-32 w-32 items-center justify-center rounded-full bg-white dark:bg-dark-card shadow-lg shadow-primary/5 ring-4 ring-white dark:ring-gray-800 elevation-5">
                  {/* Using lock-reset or lock-open as closest MaterialIcon match */}
                  <Icon name="lock-open" size={64} color="#135bec" />
                </View>

                {/* Verified Badge */}
                <View className="absolute bottom-0 -right-2 bg-primary p-2 rounded-full border-[3px] border-background-light dark:border-background-dark shadow-md items-center justify-center">
                  <Icon name="verified-user" size={16} color="white" />
                </View>
              </View>

              {/* Text Section */}
              <View className="w-full items-center mb-10 px-2">
                <Text className="text-[#111318] dark:text-white text-2xl font-bold leading-tight tracking-tight mb-3 text-center font-display">
                  Verify your Email
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-relaxed text-center font-display">
                  We will send a 6-digit verification code to your email.
                </Text>
              </View>

              {/* Form Section */}
              <View className="w-full mt-4">
                <View className="relative w-full">
                  {/* Leading Icon - Ensure z-index and pointerEvents */}
                  <View
                    pointerEvents="none"
                    style={{ zIndex: 1 }}
                    className="absolute left-4 top-0 bottom-0 justify-center"
                  >
                    <Icon
                      name="mail"
                      size={24}
                      color={email ? "#135bec" : placeholderColor}
                    />
                  </View>

                  {/* Input Field */}
                  <TextInput
                    className="w-full rounded-2xl py-4 pl-14 pr-4 text-[#111318] dark:text-white bg-white dark:bg-dark-card shadow-sm text-base"
                    placeholder="Enter your email address"
                    placeholderTextColor={placeholderColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    style={{
                      elevation: 2,
                      textAlignVertical: "center", // Ensures text is centered on Android
                    }}
                  />
                </View>
              </View>

              {/* Spacer */}
              <View className="flex-1" />

              {/* Action Button */}
              <View className="w-full mt-8 mb-4">
                <TouchableOpacity
                  className="w-full rounded-xl bg-primary py-4 px-4 shadow-lg shadow-primary/30 active:opacity-90 flex-row items-center justify-center gap-2"
                  style={{ elevation: 5 }}
                >
                  <Text className="text-base font-semibold text-white font-display">
                    Send OTP
                  </Text>
                  <Icon name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;
