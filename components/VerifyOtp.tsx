import React, { useState, useRef } from "react";
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
import { ArrowLeft, LockKeyhole } from "lucide-react-native";

const VerifyOTPScreen = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<any[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
          {/* Header */}
          <View className="flex-row items-center py-4">
            <TouchableOpacity className="size-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm">
              <ArrowLeft
                size={20}
                color="#111318"
                className="dark:text-white"
              />
            </TouchableOpacity>
          </View>

          {/* Icon & Text */}
          <View className="items-center mt-10 mb-8">
            <View className="h-16 w-16 bg-[#135bec]/10 rounded-2xl items-center justify-center mb-6">
              <LockKeyhole size={32} color="#135bec" />
            </View>
            <Text className="text-[#111318] dark:text-white text-2xl font-bold tracking-tight mb-3">
              Enter Verification Code
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm text-center leading-5 px-10">
              A 6-digit code has been sent to{"\n"}
              <Text className="text-[#111318] dark:text-white font-medium">
                alex.j****@email.com
              </Text>
            </Text>
          </View>

          {/* OTP Inputs */}
          <View className="flex-row justify-between mb-8">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => { inputs.current[index] = el; }}
                className="w-[14%] aspect-[4/5] text-center text-xl font-bold bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-700 rounded-xl text-[#111318] dark:text-white shadow-sm"
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {/* Timer */}
          <View className="flex-row items-center justify-center gap-2 mb-8">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              Resend code in
            </Text>
            <View className="bg-[#135bec]/10 px-2 py-0.5 rounded">
              <Text className="text-[#135bec] font-bold text-sm">00:55</Text>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-auto pb-10">
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full bg-[#135bec] p-4 rounded-xl shadow-lg shadow-[#135bec]/30 items-center justify-center mb-4"
            >
              <Text className="text-white font-semibold text-lg">Verify</Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-full p-3 items-center justify-center">
              <Text className="text-gray-500 dark:text-gray-400 font-medium">
                Change Email
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VerifyOTPScreen;
