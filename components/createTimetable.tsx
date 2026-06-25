import { useCreateTimetable, useCreateTimetableByImage } from "@/hooks/useCreateTimetable";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, ChevronLeft, Info, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function CreateTimetable() {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const { mutate: createTimetable, isPending: isCreatingTimetable } = useCreateTimetable();
  const { mutate: createTimetableByImage, isPending: isCreatingTimetableByImage } = useCreateTimetableByImage();

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to upload your timetable.",
      );
      return;
    }

    // Launch gallery
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Updated: Using array of strings/MediaTypes
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setImage(null);

  const handleSubmit = () => {

    if(Platform.OS === "android") {
      // Forces the motor to spin up and stop in exactly 20 milliseconds.
      // This creates a sharp "tick" rather than a soft buzz.
      Vibration.vibrate(20);
    } else {
      // iOS handles impacts much better natively, so stick to Expo here
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!image) {
      createTimetable({ name, semester });
    } else {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("semester", semester);

      const filename = image.split("/").pop() || "timetable.jpg";

      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("image", {
        uri: image,
        name: filename,
        type: type,
      } as unknown as Blob);

      createTimetableByImage(formData);
    }
  };

  const { colorScheme } = useColorScheme();

  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#101622" : "#f6f6f8"}
      />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-white dark:bg-[#101622] border-b border-[#dbdfe6] dark:border-white/10">
        <TouchableOpacity className="w-10" onPress={() => router.back()}>
          <ChevronLeft
            color={Platform.OS === "ios" ? "#111318" : "#135bec"}
            size={24}
          />
        </TouchableOpacity>
        <Text className="text-[#111318] dark:text-white text-lg font-bold">
          Create Timetable
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="max-w-[480px] w-full mx-auto p-4">
          {/* Basic Info */}
          <View className="gap-y-6 py-6">
            <View>
              <Text className="text-[#111318] dark:text-white/90 text-xs font-bold uppercase tracking-widest mb-2">
                Timetable Name
              </Text>
              <TextInput
                className="w-full rounded-xl border border-[#dbdfe6] dark:border-white/10 bg-white dark:bg-[#1c2433] h-14 px-4 text-base text-[#111318] dark:text-white"
                placeholder="e.g. Fall 2024 - CS Dept"
                placeholderTextColor="#616f89"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text className="text-[#111318] dark:text-white/90 text-xs font-bold uppercase tracking-widest mb-2">
                Semester
              </Text>
              <TextInput
                className="w-full rounded-xl border border-[#dbdfe6] dark:border-white/10 bg-white dark:bg-[#1c2433] h-14 px-4 text-base text-[#111318] dark:text-white"
                placeholder="Semester number"
                placeholderTextColor="#616f89"
                keyboardType="numeric"
                value={semester}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "");
                  if (cleaned === "") {
                    setSemester("");
                    return;
                  }
                  const num = parseInt(cleaned, 10);
                  if (num >= 1 && num <= 10) {
                    setSemester(num.toString());
                  } else {
                    Alert.alert("Invalid Semester", "Please enter a valid semester between 1 and 10.");
                  }
                }}
              />
            </View>
          </View>

          <View className="flex-row items-center gap-x-4 py-4">
            <View className="h-[1px] flex-1 bg-[#dbdfe6] dark:bg-white/10" />
            <Text className="text-[10px] font-bold text-[#616f89] dark:text-white/40 uppercase">
              OPTIONAL
            </Text>
            <View className="h-[1px] flex-1 bg-[#dbdfe6] dark:bg-white/10" />
          </View>

          {/* Image Picker Section */}
          <View className="py-4">
            <Text className="text-[#111318] dark:text-white text-lg font-bold mb-1">
              Auto-Create via Image
            </Text>
            <Text className="text-[#616f89] dark:text-white/60 text-sm mb-6">
              Upload a clear photo of your timetable for AI extraction.
            </Text>

            {image ? (
              <View className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[#dbdfe6] dark:border-white/10">
                <Image
                  source={{ uri: image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={removeImage}
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                >
                  <X color="white" size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                activeOpacity={0.7}
                className="items-center justify-center rounded-2xl border-2 border-dashed border-[#135bec]/30 bg-[#135bec]/5 dark:bg-[#135bec]/10 py-10"
              >
                <View className="size-16 items-center justify-center rounded-full bg-[#135bec] shadow-lg mb-4">
                  <Camera color="white" size={30} />
                </View>
                <Text className="text-[#111318] dark:text-white text-base font-bold">
                  Upload Timetable Image
                </Text>
                <Text className="text-[#616f89] dark:text-white/50 text-xs mt-1 mb-6">
                  Supports JPG or PNG
                </Text>
                <View className="rounded-full bg-white dark:bg-[#1c2433] px-6 py-2 border border-[#135bec]/20">
                  <Text className="text-[#135bec] font-bold text-sm">
                    Select from Gallery
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row items-start gap-x-3 p-4 mt-6 rounded-xl bg-gray-100 dark:bg-[#1c2433] border border-[#dbdfe6] dark:border-white/10">
            <Info color="#135bec" size={20} />
            <Text className="flex-1 text-[#616f89] dark:text-white/60 text-xs leading-4">
              Our AI will scan for course codes and time slots. You&apos;ll be able
              to review everything before saving.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-4 left-0 right-0 p-4 bg-white/80 dark:bg-[#101622]/80 border-t border-[#dbdfe6] dark:border-white/10">
        <TouchableOpacity
          activeOpacity={0.8}
          className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${
            name ? "bg-[#135bec] shadow-[#135bec]/40" : "bg-gray-400"
          }`}
          disabled={(!name && !image) || isCreatingTimetable || isCreatingTimetableByImage}
          onPress={handleSubmit}
          
        >
          {isCreatingTimetable || isCreatingTimetableByImage ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {image ? "Upload & Create" : "Proceed to Add Subjects"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
