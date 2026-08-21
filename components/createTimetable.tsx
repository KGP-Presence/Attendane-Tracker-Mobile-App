import { TimetableScanProgress } from "@/components/TimetableScanProgress";
import {
  getUploadErrorMessage,
  useCreateTimetable,
  useCreateTimetableByImage,
} from "@/hooks/useCreateTimetable";
import { useScanFeedback } from "@/hooks/useScanFeedback";
import { TimetableScanResponse } from "@/types/timetableScan";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, ChevronLeft, Info, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function CreateTimetable() {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const { mutate: createTimetable, isPending: isCreatingTimetable } = useCreateTimetable();
  const { mutateAsync: createTimetableByImage, isPending: isCreatingTimetableByImage } =
    useCreateTimetableByImage();

  // Loaded here rather than in the modal: this screen is mounted while the
  // user fills in the form, so the clips are ready when the scan starts.
  const feedback = useScanFeedback();

  // Drives the full-screen progress report shown while the scan runs.
  const [scanPhase, setScanPhase] = useState<"idle" | "scanning" | "reporting" | "error">("idle");
  const [scanData, setScanData] = useState<TimetableScanResponse>();
  const [scanError, setScanError] = useState<string>();
  const [isUploadFlowOpen, setIsUploadFlowOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  // Kept so "try again" can resend the identical upload without rebuilding it.
  const [lastFormData, setLastFormData] = useState<FormData>();

  const runScan = (formData: FormData) => {
    setLastFormData(formData);
    setScanData(undefined);
    setScanError(undefined);
    setScanPhase("scanning");

    createTimetableByImage(formData)
      .then((data) => {
        setScanData(data);
        setScanPhase("reporting");
      })
      .catch((error) => {
        setScanError(getUploadErrorMessage(error));
        setScanPhase("error");
      });
  };

  const openGalleryPicker = async () => {
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
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const startUploadFlow = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsUploadFlowOpen(true);
  };

  const continueUploadFlow = async () => {
    setIsUploadFlowOpen(false);
    await openGalleryPicker();
  };

  const handleReplaceImage = async () => {
    setIsImagePreviewOpen(false);
    await openGalleryPicker();
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

      runScan(formData);
    }
  };

  const { colorScheme } = useColorScheme();

  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8] dark:bg-[#101622]">
      {scanPhase !== "idle" && (
      <TimetableScanProgress
        visible
        phase={scanPhase}
        data={scanData}
        errorMessage={scanError}
        feedback={feedback}
        onDismiss={() => setScanPhase("idle")}
        onRetry={() => lastFormData && runScan(lastFormData)}
        onViewTimetables={() => {
          setScanPhase("idle");
          router.replace("/(app)/(tabs)/timetable");
        }}
      />
      )}

      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#101622" : "#f6f6f8"}
      />

      <Modal
        transparent
        visible={isUploadFlowOpen}
        animationType="fade"
        onRequestClose={() => setIsUploadFlowOpen(false)}
      >
        <View className="flex-1 bg-black/55 justify-end">
          <View className="bg-white dark:bg-[#101622] rounded-t-3xl px-5 pt-5 pb-8 border-t border-[#dbdfe6] dark:border-white/10">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#111318] dark:text-white text-lg font-bold">
                Upload Timetable
              </Text>
              <TouchableOpacity
                onPress={() => setIsUploadFlowOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={16} color={isDark ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
            </View>

            <Text className="text-[#616f89] dark:text-white/60 text-sm leading-5 mb-4">
              Pick a clear timetable image. We will scan subjects and slots, then you can continue to create your timetable.
            </Text>

            <View className="rounded-2xl border border-[#dbdfe6] dark:border-white/10 bg-[#f8faff] dark:bg-[#1c2433] p-4 mb-4">
              <Text className="text-[#135bec] dark:text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">
                Best Results
              </Text>
              <Text className="text-[#334155] dark:text-white/80 text-sm">1. Keep all rows and columns visible.</Text>
              <Text className="text-[#334155] dark:text-white/80 text-sm mt-1">2. Avoid blur, glare, and shadows.</Text>
              <Text className="text-[#334155] dark:text-white/80 text-sm mt-1">3. Use screenshots or high-resolution photos.</Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl border border-[#dbdfe6] dark:border-white/10 items-center justify-center bg-white dark:bg-[#1c2433]"
                onPress={() => setIsUploadFlowOpen(false)}
              >
                <Text className="text-[#334155] dark:text-white/80 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-12 rounded-xl items-center justify-center bg-[#135bec]"
                onPress={continueUploadFlow}
              >
                <Text className="text-white font-bold">Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isImagePreviewOpen}
        animationType="fade"
        onRequestClose={() => setIsImagePreviewOpen(false)}
      >
        <View className="flex-1 bg-black/90">
          <View className="px-4 pt-5 pb-2 flex-row items-center justify-between">
            <Text className="text-white text-base font-bold">Image Preview</Text>
            <TouchableOpacity
              onPress={() => setIsImagePreviewOpen(false)}
              className="h-8 w-8 rounded-full items-center justify-center bg-white/15"
            >
              <X color="white" size={16} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center justify-center px-4">
            {image && (
              <Image
                source={{ uri: image }}
                className="w-full h-full"
                resizeMode="contain"
              />
            )}
          </View>

          <View className="p-4 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 h-12 rounded-xl border border-white/30 items-center justify-center"
              onPress={handleReplaceImage}
            >
              <Text className="text-white font-semibold">Replace Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-12 rounded-xl bg-[#135bec] items-center justify-center"
              onPress={() => setIsImagePreviewOpen(false)}
            >
              <Text className="text-white font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {SEMESTERS.map((sem) => {
                  const isSelected = semester === sem.toString();
                  return (
                    <TouchableOpacity
                      key={sem}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (Platform.OS === "android") {
                          Vibration.vibrate(20);
                        } else {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setSemester(sem.toString());
                      }}
                      style={{ width: `${100 / 5 - 2}%` }}
                      className={`h-14 rounded-xl border items-center justify-center ${
                        isSelected
                          ? "bg-[#135bec] border-[#135bec]"
                          : "bg-white dark:bg-[#1c2433] border-[#dbdfe6] dark:border-white/10"
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          isSelected ? "text-white" : "text-[#111318] dark:text-white"
                        }`}
                      >
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-x-4 py-4">
            <View className="h-[1px] flex-1 bg-[#dbdfe6] dark:bg-white/10" />
            <Text className="text-[10px] font-bold text-[#135bec] uppercase">
              RECOMMENDED
            </Text>
            <View className="h-[1px] flex-1 bg-[#dbdfe6] dark:bg-white/10" />
          </View>

          {/* Image Picker Section */}
          <View className="py-4">
            <Text className="text-[#111318] dark:text-white text-lg font-bold mb-1">
              Auto-Create via Image
            </Text>
            <Text className="text-[#616f89] dark:text-white/60 text-sm mb-6">
              Upload a clear photo of your timetable and we&apos;ll build it for you —
              subjects, slots and all.
            </Text>

            {image ? (
              <View className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[#dbdfe6] dark:border-white/10">
                <TouchableOpacity
                  activeOpacity={0.9}
                  className="w-full h-full"
                  onPress={() => setIsImagePreviewOpen(true)}
                >
                  <Image
                    source={{ uri: image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={removeImage}
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                >
                  <X color="white" size={20} />
                </TouchableOpacity>
                <View className="absolute bottom-2 left-2 bg-black/55 px-2.5 py-1 rounded-full">
                  <Text className="text-white text-[11px] font-semibold">Tap to view</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={startUploadFlow}
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
              We read the slots straight off your timetable, so each subject gets
              the classes you actually attend. Anything with a clash is skipped and
              listed for you to add yourself.
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
              {image ? "Continue to Create Timetable" : "Proceed to Add Subjects"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
