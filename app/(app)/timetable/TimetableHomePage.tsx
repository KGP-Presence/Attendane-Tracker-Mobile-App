import LoadingScreen from "@/components/Loading";
import { TimetableCard } from "@/components/TimetableCard";
import { useGetUserTimetables } from "@/hooks/useGetUserTimetables";
import { TimetableCardType } from "@/types/timetableTypes";
import { router } from "expo-router";
import { ArrowBigLeft, ArrowLeft, ChevronLeft, Menu, Plus, Search, User, UserCircle, Filter } from "lucide-react-native";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Vibration,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import ErrorScreen from "@/components/ErrorPage";
import * as Haptics from "expo-haptics";
import { TimetableCopilot } from "@/components/copilot/TimetableCopilot";

export default function TimetableScreen() {
  // Destructure refetch from your custom hook
  const { data, isLoading, isError, refetch } = useGetUserTimetables();
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for semester filtering
  const [selectedSemester, setSelectedSemester] = useState<number | "All" | null>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Refs for Copilot spotlight
  const searchRef = React.useRef<View>(null);
  const filterRef = React.useRef<View>(null);
  const addRef = React.useRef<View>(null);

  // Extract unique semesters and sort them descending (highest first)
  const uniqueSemesters = useMemo(() => {
    if (!data) return [];
    // Assuming timetable.semester is a number. Filter out undefined/null values
    const semesters = data.map((t: any) => t.semester).filter((s: any) => s != null);
    return [...new Set(semesters)].sort((a: unknown, b: unknown) => (b as number) - (a as number));
  }, [data]);

  // Set the highest semester as default when data loads
  useEffect(() => {
    if (uniqueSemesters.length > 0 && selectedSemester === null) {
      setSelectedSemester(uniqueSemesters[0] as number);
    }
  }, [uniqueSemesters, selectedSemester]);

  const filteredData = data?.filter((timetable: TimetableCardType) => {
    const matchesSearch = timetable.name.toLowerCase().includes(searchQuery.toLowerCase());
    // @ts-ignore - Assuming semester exists on TimetableCardType
    const matchesSemester = selectedSemester === "All" || selectedSemester === null ? true : timetable.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  });

  // State for the pull-to-refresh spinner
  const [refreshing, setRefreshing] = useState(false);

  // Function to handle the pull-down action
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Only show the full-screen loading if we aren't already doing a pull-to-refresh
  if (isLoading && !refreshing) {
    return <LoadingScreen />;
  }

  if(isError){
    return <ErrorScreen/>
  }

  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#101622" : "#f6f6f8"}
      />

      {/* Header */}
      <View className="bg-white/80 dark:bg-slate-900/80 px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <ChevronLeft size={24} color="#135bec" onPress={() => {
              if (Platform.OS === "android") {
                // Forces the motor to spin up and stop in exactly 20 milliseconds.
                // This creates a sharp "tick" rather than a soft buzz.
                Vibration.vibrate(20);
              } else {
                // iOS handles impacts much better natively, so stick to Expo here
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.back()}}/>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            My Timetables
          </Text>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <User size={24} color="#135bec" onPress={() => {
              if (Platform.OS === "android") {
                // Forces the motor to spin up and stop in exactly 20 milliseconds.
                // This creates a sharp "tick" rather than a soft buzz.
                Vibration.vibrate(20);
              } else {
                // iOS handles impacts much better natively, so stick to Expo here
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push("/profile/profile")}}/>
          </TouchableOpacity>
        </View>

        {/* Search Bar & Filter Button */}
        <View className="mb-2 flex-row items-center space-x-2">
          <View ref={searchRef} className="flex-1 flex-row items-center rounded-xl bg-slate-100 dark:bg-slate-800 px-4 h-12 mr-2">
            <Search size={20} color="#616f89" />
            <TextInput
              placeholder="Search timetables"
              placeholderTextColor="#616f89"
              className="flex-1 ml-3 text-base text-slate-900 dark:text-white"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            ref={filterRef}
            className="h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
            onPress={() => setFilterModalVisible(true)}
          >
            <Filter size={20} color="#616f89" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#135bec" // iOS spinner color
            colors={["#135bec"]} // Android spinner color
            progressBackgroundColor={isDark ? "#1e293b" : "#ffffff"}
          />
        }
      >
        {filteredData && filteredData.length > 0 ? (
          filteredData.map((timetable: TimetableCardType) => (
            <TimetableCard key={timetable._id} {...timetable} />
          ))
        ) : (
          <View className="mt-20 items-center">
            <Text className="text-slate-500 dark:text-slate-400 text-center">
              {isError
                ? "Failed to load timetables. Pull down to try again."
                : "No timetables found. Create your first timetable!"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        ref={addRef}
        style={{
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
        }}
        className="absolute bottom-32 right-6 h-16 w-16 items-center justify-center rounded-full bg-blue-600 z-50"
        onPress={() =>{
          if(Platform.OS === "android") {
            // Forces the motor to spin up and stop in exactly 20 milliseconds.
            // This creates a sharp "tick" rather than a soft buzz.
            Vibration.vibrate(20);
          } else {
            // iOS handles impacts much better natively, so stick to Expo here
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
           router.push("/timetable/createTimetablePage");
        }}
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>

      {/* Semester Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-black/50"
          activeOpacity={1}
          onPressOut={() => setFilterModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View className="w-4/5 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl">
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Filter by Semester
              </Text>
              
              <ScrollView className="max-h-64">
                {/* "All" Option */}
                <TouchableOpacity
                  className={`py-3 px-4 rounded-xl mb-2 ${selectedSemester === "All" ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
                  onPress={() => {
                    setSelectedSemester("All");
                    setFilterModalVisible(false);
                  }}
                >
                  <Text className={`text-base ${selectedSemester === "All" ? "text-blue-600 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                    All Semesters
                  </Text>
                </TouchableOpacity>

                {/* Individual Semesters */}
                {uniqueSemesters.map((semester) => (
                  <TouchableOpacity
                    key={semester as number}
                    className={`py-3 px-4 rounded-xl mb-2 ${selectedSemester === semester ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
                    onPress={() => {
                      setSelectedSemester(semester as number);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text className={`text-base ${selectedSemester === semester ? "text-blue-600 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                      Semester {semester as number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Timetable Page Copilot */}
      <TimetableCopilot searchRef={searchRef} filterRef={filterRef} addRef={addRef} />
    </SafeAreaView>
  );
}