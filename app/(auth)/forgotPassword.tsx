import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChangeForgotPasswordInit, useChangeForgotPassword } from '@/hooks/useChangePassword';
import { useVerifyOtp } from '@/hooks/useVerifyOtp';

// --- Reusable Components ---

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  iconName: keyof typeof MaterialIcons.glyphMap;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  maxLength?: number;
  editable?: boolean; 
  autoFocus?: boolean;
}

const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  iconName,
  keyboardType = 'default',
  maxLength,
  editable = true,
  autoFocus = false
}: InputFieldProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-col mb-5">
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2">
        {label}
      </Text>
      <View className={`flex-row items-center w-full border border-slate-200 dark:border-[#2a3241] ${editable ? 'bg-slate-50 dark:bg-[#0e121a]' : 'bg-slate-200 dark:bg-[#1f2633]'} rounded-xl px-4 h-14`}>
        <MaterialIcons name={iconName} size={20} color="#3b82f6" />
        <TextInput
          className="flex-1 px-3 text-slate-900 dark:text-white font-normal text-base"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          autoFocus={autoFocus}
        />
      </View>
    </View>
  );
};

interface PasswordInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  iconName: keyof typeof MaterialIcons.glyphMap;
}

const PasswordInput = ({ label, placeholder, value, onChangeText, iconName }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-col mb-5">
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2">
        {label}
      </Text>
      <View className="flex-row items-center w-full border border-slate-200 dark:border-[#2a3241] bg-slate-50 dark:bg-[#0e121a] rounded-xl px-4 h-14">
        <MaterialIcons name={iconName} size={20} color="#3b82f6" />
        <TextInput
          className="flex-1 px-3 text-slate-900 dark:text-white font-normal text-base"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          secureTextEntry={!showPassword}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
          <MaterialIcons
            name={showPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color={isDark ? "#64748b" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Main Screen ---

type FlowStep = 'EMAIL' | 'OTP' | 'PASSWORD';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form State
  const [step, setStep] = useState<FlowStep>('EMAIL');
  const [instituteId, setInstituteId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Hooks
  const { mutate: initForgot, isPending: isInitPending } = useChangeForgotPasswordInit();
  const { mutate: verifyOtp, isPending: isVerifyPending } = useVerifyOtp();
  const { mutate: changePassword, isPending: isChangePending } = useChangeForgotPassword();

  const handleGetOtp = () => {
    initForgot(instituteId, {
      onSuccess: () => setStep('OTP'),
    });
  };

  const handleVerifyOtp = () => {
    verifyOtp({ instituteId, otp, event: "forgot password" }, {
      // If your hook navigates away, you might need to change the hook logic 
      // to stay on this page to show the password fields.
      onSuccess: () => setStep('PASSWORD'),
    });
  };

  const handleUpdatePassword = () => {
    changePassword({
      instituteId,
      newPassword,
      confirmPassword,
    });
  };

  const isLoading = isInitPending || isVerifyPending || isChangePending;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0e121a]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between py-2 mb-8 mt-2">
            <TouchableOpacity
              className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 dark:bg-[#181d27]"
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? "white" : "#0f172a"} />
            </TouchableOpacity>
            <Text className="text-lg font-normal flex-1 text-center pr-10 text-slate-900 dark:text-white">
              Forgot Password
            </Text>
          </View>

          <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
            {step === 'EMAIL' && "Identity Verification"}
            {step === 'OTP' && "Security Code"}
            {step === 'PASSWORD' && "Set New Password"}
          </Text>

          <View className="w-full bg-white dark:bg-[#181d27] rounded-2xl border border-slate-200 dark:border-[#2a3241] p-5 mb-6">
            
            {/* Step 1: Email Input */}
            <InputField
              label="Email / Institute ID"
              placeholder="Enter your registered ID"
              value={instituteId}
              onChangeText={setInstituteId}
              iconName="email"
              editable={step === 'EMAIL'}
              autoFocus={true}
            />

            {/* Step 2: OTP Input (Visible after getting OTP) */}
            {(step === 'OTP' || step === 'PASSWORD') && (
              <InputField
                label="Verification Code"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChangeText={setOtp}
                iconName="phonelink-lock"
                keyboardType="numeric"
                maxLength={6}
                editable={step === 'OTP'}
              />
            )}

            {/* Step 3: Password Inputs (Visible after verification) */}
            {step === 'PASSWORD' && (
              <>
                <PasswordInput
                  label="New Password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  iconName="lock-reset"
                />
                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  iconName="check-circle"
                />
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View className="pt-2">
            {step === 'EMAIL' && (
              <TouchableOpacity
                onPress={handleGetOtp}
                disabled={!instituteId || isLoading}
                className={`w-full flex-row items-center justify-center py-4 rounded-xl ${!instituteId || isLoading ? 'bg-blue-600/50' : 'bg-blue-600'}`}
              >
                {isInitPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-medium text-base">Get OTP</Text>}
              </TouchableOpacity>
            )}

            {step === 'OTP' && (
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={otp.length < 6 || isLoading}
                className={`w-full flex-row items-center justify-center py-4 rounded-xl ${otp.length < 6 || isLoading ? 'bg-blue-600/50' : 'bg-blue-600'}`}
              >
                {isVerifyPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-medium text-base">Verify OTP</Text>}
              </TouchableOpacity>
            )}

            {step === 'PASSWORD' && (
              <TouchableOpacity
                onPress={handleUpdatePassword}
                disabled={!newPassword || newPassword !== confirmPassword || isLoading}
                className={`w-full flex-row items-center justify-center py-4 rounded-xl ${!newPassword || newPassword !== confirmPassword || isLoading ? 'bg-blue-600/50' : 'bg-blue-600'}`}
              >
                {isChangePending ? <ActivityIndicator color="white" /> : <Text className="text-white font-medium text-base">Update Password</Text>}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}