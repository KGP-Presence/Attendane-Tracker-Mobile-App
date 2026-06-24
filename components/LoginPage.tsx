import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { ChevronLeft, Eye, EyeOff, LogIn } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLogin } from "@/hooks/useLogin";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Vibration } from "react-native";
// import { styled } from "nativewind";

// const StyledView = styled(View);
// const StyledText = styled(Text);

export default function LoginScreen() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [instituteId, setInstituteId] = useState("");

  const {mutate, isPending} = useLogin();
  const scrollRef = useRef<ScrollView>(null);

  const handleSubmit = () => {
    Keyboard.dismiss();

    if(Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    console.log("Submitting:", { instituteId, password });
    mutate({ instituteId, password });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 py-4">
            <TouchableOpacity className="p-2">
              <ChevronLeft
                color={Platform.OS === "ios" ? "#111318" : "#111318"}
                size={28}
              />
            </TouchableOpacity>
            <Text className="text-[#111318] dark:text-white text-lg font-bold flex-1 text-center pr-10">
              Login
            </Text>
          </View>

          {/* Logo Placeholder */}
          <View className="items-center pt-8">
            <View className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden items-center justify-center">
              <Image
                source={{ uri: "https://via.placeholder.com/128" }}
                className="w-full h-full"
              />
            </View>
          </View>

          {/* Headline */}
          <View className="px-6 pt-6 pb-3">
            <Text className="text-[#111318] dark:text-white text-3xl font-extrabold text-center">
              Welcome Back
            </Text>
            <Text className="text-slate-500 dark:text-slate-300 text-base text-center mt-2">
              Sign in to your attendance tracker
            </Text>
          </View>

          {/* Form Section */}
          <View className="px-4 gap-y-4 pt-4">
            {/* Institute ID */}
            <View>
              <Text className="text-[#111318] dark:text-white text-base font-medium mb-2">
                Institute Email ID
              </Text>
              <TextInput
                placeholder="Enter your institute email ID"
                placeholderTextColor="#616f89"
                className="w-full h-14 bg-white dark:bg-slate-800 border border-[#dbdfe6] dark:border-slate-700 rounded-xl px-4 text-[#111318] dark:text-white focus:border-[#135bec]"
                value={instituteId}
                onChangeText={setInstituteId}
                textContentType="username"
                autoComplete="email"
                importantForAutofill="yes"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View>
              <Text className="text-[#111318] dark:text-white text-base font-medium mb-2">
                Password
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor="#616f89"
                  secureTextEntry={!passwordVisible}
                  className="w-full h-14 bg-white dark:bg-slate-800 border border-[#dbdfe6] dark:border-slate-700 rounded-xl px-4 pr-12 text-[#111318] dark:text-white focus:border-[#135bec]"
                  value={password}
                  onChangeText={setPassword}
                  textContentType="password"
                  autoComplete="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-4"
                >
                  {passwordVisible ? (
                    <EyeOff size={20} color="#616f89" />
                  ) : (
                    <Eye size={20} color="#616f89" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              className="items-end"
              onPress={() => router.push('/forgotPassword')}
            >
              <Text className="text-[#135bec] text-sm font-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full bg-[#135bec] h-14 rounded-xl flex-row items-center justify-center shadow-lg mt-4"
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-bold text-lg mr-2">Login</Text>
                  <LogIn size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View className="mt-auto py-10 items-center">
            <View className="flex-row">
              <Text className="text-[#616f89] text-sm">
                Don{`'`}t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push('/register-init')}>
                <Text className="text-[#135bec] text-sm font-bold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
