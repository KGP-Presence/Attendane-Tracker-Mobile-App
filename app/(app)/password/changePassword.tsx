import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useChangePassword } from '@/hooks/useChangePassword';
import { router } from 'expo-router';

interface PasswordInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  iconName: keyof typeof MaterialIcons.glyphMap;
}

const PasswordInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  iconName,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-col mb-5">
      <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2">
        {label}
      </Text>
      <View className="flex-row items-center w-full border border-slate-200 dark:border-[#2a3241] bg-slate-50 dark:bg-[#0e121a] rounded-xl px-4 h-14 focus:border-blue-500">
        <MaterialIcons name={iconName} size={20} color="#3b82f6" />
        <TextInput
          className="flex-1 px-3 text-slate-900 dark:text-white font-normal text-base"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          secureTextEntry={!showPassword}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoFocus={label === "Old Password"}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="p-1"
          activeOpacity={0.7}
        >
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

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const { mutate: changePassword, isPending } = useChangePassword();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSave = () => {
    changePassword({
      currentPassword: oldPassword,
      newPassword: newPassword,
      confirmNewPassword: confirmNewPassword,
    });
  };

  const isFormValid = oldPassword && newPassword && confirmNewPassword;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0e121a]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled">
          
          {/* Header */}
          <View className="flex-row items-center justify-between py-2 mb-8 mt-2">
            <TouchableOpacity 
              className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 dark:bg-[#181d27]"
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? "white" : "#0f172a"} />
            </TouchableOpacity>
            <Text className="text-lg font-normal flex-1 text-center pr-10 text-slate-900 dark:text-white">
              Change Password
            </Text>
          </View>

          {/* Section Title */}
          <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
            Account Security
          </Text>

          {/* Main Card */}
          <View className="w-full bg-white dark:bg-[#181d27] rounded-2xl border border-slate-200 dark:border-[#2a3241] p-5 mb-6">
            
            <PasswordInput
              label="Old Password"
              placeholder="Enter old password"
              value={oldPassword}
              onChangeText={setOldPassword}
              iconName="lock"
            />

            <View className="mb-1">
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                iconName="lock-reset"
              />
              <View className="flex-row items-center mt-[-10px] mb-4">
                <MaterialIcons name="info-outline" size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                  Your new password must be at least 8 characters long.
                </Text>
              </View>
            </View>

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              iconName="check-circle"
            />

          </View>

          {/* Submit Button */}
          <View className="pt-2">
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isFormValid || isPending}
              activeOpacity={0.8}
              className={`w-full flex-row items-center justify-center gap-2 py-4 px-6 rounded-xl ${
                !isFormValid || isPending ? 'bg-blue-600/50' : 'bg-blue-600'
              }`}
            >
              {isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium text-base">
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}