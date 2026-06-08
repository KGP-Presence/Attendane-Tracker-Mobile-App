import { useLogout } from "@/hooks/useLogout";
import { useMe } from "@/hooks/useMe";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { ChevronLeft, Edit } from "lucide-react-native";
import { Switch } from "react-native";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticate,
  getBiometricType,
} from "@/utils/biometric";
import CgpaSimulator from "@/components/CgpaSimulator";

export default function UserProfile() {
  const { data, refetch } = useMe(); // Added refetch if your hook supports it

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {mutate} = useLogout();

  // Refresh Control State
  const [refreshing, setRefreshing] = React.useState(false);
  const [biometricAvailable, setBiometricAvailable] = React.useState(false);
  const [biometricEnabled, setBiometricEnabledState] = React.useState(false);
  const [biometricType, setBiometricType] = React.useState("Biometrics");


  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refetch) {
        await refetch();
      } else {
        // Fallback delay if refetch isn't available from useMe
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  React.useEffect(() => {
    Promise.all([
      isBiometricAvailable(),
      isBiometricEnabled(),
      getBiometricType(),
    ]).then(([avail, enabled, type]) => {
      setBiometricAvailable(avail);
      setBiometricEnabledState(enabled);
      setBiometricType(type);
    });
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Require auth before enabling — prevent someone else turning it on
      const success = await authenticate();
      if (!success) return;
    }
    await setBiometricEnabled(value);
    setBiometricEnabledState(value);
  };

  const handleLogout = () =>{
    if(Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    mutate();
  }
  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#101622" : "#f6f6f8"}
      />

      {/* Top App Bar - Sticky Effect by placing outside ScrollView */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#f6f6f8]/90 dark:bg-[#101622]/90 border-b border-transparent z-50">
        <TouchableOpacity
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          onPress={() => {
            if (Platform.OS === "android") {
              // Forces the motor to spin up and stop in exactly 20 milliseconds.
              // This creates a sharp "tick" rather than a soft buzz.
              Vibration.vibrate(20);
            } else {
              // iOS handles impacts much better natively, so stick to Expo here
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.back();
          }}
        >
          <ChevronLeft size={28} color={isDark ? "#e5e7eb" : "#111318"} />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-[#111318] dark:text-white">
          Profile
        </Text>

        <TouchableOpacity
          className="flex h-10 w-10 items-center justify-center rounded-full"
          onPress={() => {
            if (Platform.OS === "android") {
              // Forces the motor to spin up and stop in exactly 20 milliseconds.
              // This creates a sharp "tick" rather than a soft buzz.
              Vibration.vibrate(20);
            } else {
              // iOS handles impacts much better natively, so stick to Expo here
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push("/profile/EditProfile");
          }}
        >
          <Edit size={24} color={isDark ? "#e5e7eb" : "#111318"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#e5e7eb" : "#111318"} // iOS spinner color
            colors={["#135bec"]} // Android spinner color
          />
        }
      >
        {/* Profile Header */}
        <View className="flex-col items-center pt-6 pb-6 px-4">
          <View className="relative">
            <Image
              source={{
                uri: `https://picsum.photos/seed/${data._id}/400/200`,
              }} // Placeholder for Google Image
              className="h-28 w-28 rounded-full border-4 border-white dark:border-gray-800"
            />
            <View className="absolute bottom-1 right-1 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
              <MaterialIcons name="check-circle" size={16} color="#22c55e" />
            </View>
          </View>

          <View className="mt-4 flex-col items-center gap-2">
            <Text className="text-2xl font-bold text-[#111318] dark:text-white text-center">
              {data.firstName + " " + data.lastName}
            </Text>
            <View className="rounded-full bg-[#135bec]/10 px-3 py-1 border border-[#135bec]/20">
              <Text className="text-sm font-medium text-[#135bec]">
                {data.role === "normal" ? "Student" : "admin"}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Academic Details */}
        <View className="px-4 mt-2">
          <Text className="text-[#616f89] dark:text-gray-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Academic Details
          </Text>

          <View className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <View className="flex-col">
              {/* Row 1: Institute ID (Full Width for maximum space) */}
              <View className="w-full p-4 border-b border-gray-100 dark:border-gray-700">
                <View className="flex-row items-center gap-2 mb-1">
                  <MaterialIcons name="badge" size={20} color="#135bec" />
                  <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                    Institute ID
                  </Text>
                </View>
                <Text className="text-[#111318] dark:text-white text-base font-semibold">
                  {data.instituteId}
                </Text>
              </View>

              {/* Row 2: Roll No (Full Width for maximum space) */}
              <View className="w-full p-4 border-b border-gray-100 dark:border-gray-700">
                <View className="flex-row items-center gap-2 mb-1">
                  <MaterialIcons name="push-pin" size={20} color="#135bec" />
                  <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                    Roll Number
                  </Text>
                </View>
                <Text className="text-[#111318] dark:text-white text-base font-semibold">
                  {data.rollNo}
                </Text>
              </View>

              {/* Row 3: Department & Year (Split 50/50 horizontally) */}
              <View className="flex-row w-full">
                <View className="w-1/2 p-4 border-r border-gray-100 dark:border-gray-700">
                  <View className="flex-row items-center gap-2 mb-1">
                    <MaterialIcons name="school" size={20} color="#135bec" />
                    <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                      Department
                    </Text>
                  </View>
                  <Text className="text-[#111318] dark:text-white text-base font-semibold">
                    {data.department}
                  </Text>
                </View>

                <View className="w-1/2 p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <MaterialIcons
                      name="history-edu"
                      size={20}
                      color="#135bec"
                    />
                    <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                      Graduation Year
                    </Text>
                  </View>
                  <Text className="text-[#111318] dark:text-white text-base font-semibold">
                    {data.graduationYear}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* CGPA Simulator */}
        <CgpaSimulator />

        {/* Section: Academic Management */}
        <View className="px-4 mt-6">
          <Text className="text-[#616f89] dark:text-gray-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Academic Management
          </Text>
          <View className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* List Item 1 */}
            <TouchableOpacity
              className="flex-row items-center w-full p-4 border-b border-gray-100 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-800"
              onPress={() => {
                Vibration.vibrate(20);
                router.push("/timetable");
              }}
            >
              <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#135bec]/10 mr-4">
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#135bec"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[#111318] dark:text-white text-base font-medium">
                  My Timetables
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            {/* List Item 2 */}
            <TouchableOpacity
              className="flex-row items-center w-full p-4 active:bg-gray-50 dark:active:bg-gray-800"
              onPress={() => {
                Vibration.vibrate(20);
                router.push("/subject/getAllSubjects");
              }}
            >
              <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#135bec]/10 mr-4">
                <MaterialIcons name="book" size={20} color="#135bec" />
              </View>
              <View className="flex-1">
                <Text className="text-[#111318] dark:text-white text-base font-medium">
                  Enrolled Subjects
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {/* <View className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                  <Text className="text-gray-600 dark:text-gray-300 text-xs font-bold">
                    6
                  </Text>
                </View> */}
                <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Account Security */}
        <View className="px-4 mt-6 mb-4">
          <Text className="text-[#616f89] dark:text-gray-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Account Security
          </Text>
          <View className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Change Password */}
            <TouchableOpacity
              className="flex-row items-center w-full p-4 border-b border-gray-100 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-800"
              onPress={() => {
                Vibration.vibrate(20);
                router.push("/password/changePassword");
              }}
            >
              <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 mr-4">
                <MaterialIcons name="lock" size={20} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text className="text-[#111318] dark:text-white text-base font-medium">
                  Change Password
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            {/* Biometric Lock — only shown if device supports it */}
            {biometricAvailable && (
              <View className="flex-row items-center w-full p-4">
                <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 mr-4">
                  <MaterialIcons name="fingerprint" size={20} color="#4b5563" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#111318] dark:text-white text-base font-medium">
                    {biometricType} Lock
                  </Text>
                  <Text className="text-[#616f89] dark:text-gray-400 text-xs mt-0.5">
                    Require {biometricType} on app open
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: "#d1d5db", true: "#135bec" }}
                  thumbColor={biometricEnabled ? "#ffffff" : "#f3f4f6"}
                />
              </View>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <View className="px-4 mt-2">
          <TouchableOpacity
            className="w-full bg-white dark:bg-[#1a2230] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex-row items-center justify-center gap-2 active:scale-95 active:bg-red-50 dark:active:bg-red-900/10 transition-transform"
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={20} color="#dc2626" />
            <Text className="text-red-600 dark:text-red-400 font-semibold">
              Log Out
            </Text>
          </TouchableOpacity>
          <Text className="text-center text-gray-400 text-xs mt-6 mb-8">
            Version 0.8
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}