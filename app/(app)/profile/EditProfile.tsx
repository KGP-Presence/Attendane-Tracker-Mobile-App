import { useEditProfile } from "@/hooks/useEditProfile";
import { useMe } from "@/hooks/useMe";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { use, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Pressable,
  Platform,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useDepartments } from "@/hooks/useDepartments";

export default function EditProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: meData, isLoading } = useMe();
  const { mutate: updateProfile, isPending } = useEditProfile();

  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rollNo: "",
    graduationYear: 2024,
    department: "", // stores the ObjectId or empty string
    departmentCode: "", // stores the shortCode for display
  });

  useEffect(() => {
    if (meData) {
      setFormData({
        firstName: meData.firstName || "",
        lastName: meData.lastName || "",
        rollNo: meData.rollNo || "",
        graduationYear: meData.graduationYear || 2024,
        department: typeof meData.department === "object" ? meData.department?._id : (meData.department || ""),
        departmentCode: typeof meData.department === "object" ? meData.department?.shortCode : (meData.department || ""),
      });
    }
  }, [meData]);

  const handleUpdate = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateProfile(formData);
  };

  const selectDepartment = (deptId: string, deptCode: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    handleUpdate("department", deptId);
    handleUpdate("departmentCode", deptCode);
    setIsDeptModalVisible(false);
  };

  const { data: departmentsData } = useDepartments();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color="#0fbd2c" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Top App Bar */}
      <View className="flex-row items-center bg-white dark:bg-slate-900/50 p-4 border-b border-primary/10">
        <TouchableOpacity className="w-12 h-12 justify-center items-start" onPress={() => {
          if (Platform.OS === "android") {
            // Forces the motor to spin up and stop in exactly 20 milliseconds.
            // This creates a sharp "tick" rather than a soft buzz.
            Vibration.vibrate(20);
          } else {
            // iOS handles impacts much better natively, so stick to Expo here
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.back()}}>
          <ChevronLeft size={28} color={isDark ? "#f1f5f9" : "#0f172a"} />
        </TouchableOpacity>

        <Text className="flex-1 text-slate-900 dark:text-slate-100 text-2xl font-bold text-center tracking-tight">
          Edit Profile
        </Text>

        <TouchableOpacity
          className="w-12 items-end justify-center"
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#0fbd2c" />
          ) : (
            <Text className="text-primary text-base font-bold tracking-tight">
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Photo Section */}
        <View className="p-8 items-center">
          <View className="gap-4 items-center">
            <View className="relative">
              <Image
                source={{ uri: "https://picsum.photos/seed/123/400/200" }} // Replace with actual Google user profile pic URL
                className="w-32 h-32 rounded-full border-4 border-primary/20"
              />
              <TouchableOpacity className="absolute bottom-0 right-0 bg-primary p-2 rounded-full shadow-lg">
                <MaterialIcons name="photo-camera" size={20} color="white" />
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Form Fields */}
        <View className="px-6 w-full max-w-2xl mx-auto gap-6">
          <View className="flex-col md:flex-row gap-6">
            {/* First Name */}
            <View className="w-full">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2 ml-1">
                First Name
              </Text>
              <TextInput
                value={formData.firstName}
                onChangeText={(text) => handleUpdate("firstName", text)}
                placeholder="e.g. Rahul"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                className="w-full rounded-xl border border-primary/20 bg-white dark:bg-slate-900 h-14 px-4 text-slate-900 dark:text-slate-100 text-base"
              />
            </View>

            {/* Last Name */}
            <View className="w-full">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2 ml-1">
                Last Name
              </Text>
              <TextInput
                value={formData.lastName}
                onChangeText={(text) => handleUpdate("lastName", text)}
                placeholder="e.g. Sharma"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                className="w-full rounded-xl border border-primary/20 bg-white dark:bg-slate-900 h-14 px-4 text-slate-900 dark:text-slate-100 text-base"
              />
            </View>
          </View>

          {/* Roll Number */}
          <View className="w-full">
            <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2 ml-1">
              Roll Number
            </Text>
            <View className="relative justify-center">
              <View className="absolute left-4 z-10">
                <MaterialIcons
                  name="badge"
                  size={20}
                  color={
                    isDark ? "rgba(15, 189, 44, 0.6)" : "rgba(15, 189, 44, 0.6)"
                  }
                />
              </View>
              <TextInput
                value={formData.rollNo}
                onChangeText={(text) => handleUpdate("rollNo", text)}
                placeholder="e.g. 21CS100XX"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                className="w-full rounded-xl border border-primary/20 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-slate-900 dark:text-slate-100 text-base"
              />
            </View>
          </View>

          <View className="flex-col md:flex-row gap-6">
            {/* Graduation Year */}
            <View className="w-full">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2 ml-1">
                Graduation Year
              </Text>
              <TextInput
                value={formData.graduationYear.toString()}
                onChangeText={(text) => handleUpdate("graduationYear", text)}
                placeholder="2025"
                keyboardType="numeric"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                className="w-full rounded-xl border border-primary/20 bg-white dark:bg-slate-900 h-14 px-4 text-slate-900 dark:text-slate-100 text-base"
              />
            </View>

            {/* Department Dropdown Trigger */}
            <View className="w-full">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2 ml-1">
                Department
              </Text>
              <TouchableOpacity
                onPress={() => setIsDeptModalVisible(true)}
                className="w-full rounded-xl border border-primary/20 bg-white dark:bg-slate-900 h-14 px-4 flex-row items-center justify-between"
              >
                <Text
                  className={
                    formData.departmentCode
                      ? "text-slate-900 dark:text-slate-100 text-base"
                      : "text-slate-400 text-base"
                  }
                >
                  {formData.departmentCode ? formData.departmentCode : "Select Dept"}
                </Text>
                <MaterialIcons name="expand-more" size={24} color="#0fbd2c" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mobile Action Button */}
          <TouchableOpacity
            className="mt-4 w-full bg-primary py-4 rounded-xl shadow-lg shadow-primary/20 active:opacity-80"
            onPress={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-base">
                Update Profile
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Department Selection Modal */}
      <Modal
        visible={isDeptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDeptModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsDeptModalVisible(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl h-[60%] w-full">
            <View className="p-4 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Select Department
              </Text>
              <TouchableOpacity onPress={() => setIsDeptModalVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={isDark ? "#f1f5f9" : "#0f172a"}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={departmentsData || []}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`p-4 border-b border-slate-100 dark:border-slate-800/50 flex-row justify-between items-center ${
                    formData.department === item._id ? "bg-primary/5" : ""
                  }`}
                  onPress={() => selectDepartment(item._id, item.shortCode)}
                >
                  <Text
                    className={`text-base ${
                      formData.department === item._id
                        ? "text-primary font-bold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.shortCode} - {item.longName}
                  </Text>
                  {formData.department === item._id && (
                    <MaterialIcons name="check" size={20} color="#0fbd2c" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
