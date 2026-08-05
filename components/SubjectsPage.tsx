import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Hooks (Assuming these are exported from your hooks folder)
import { useDeleteSubject } from "@/hooks/useDeleteSubject";
import { useGetAllSubjects } from "@/hooks/useGetAllSubjects";
import { useGetAllTimetablesOfUser } from "@/hooks/useGetAllTimetablesOfUser";
import { useGetSubjectsBySemester } from "@/hooks/useGetSubjectBySemester";
import { useGetSubjectsByTimetableId } from "@/hooks/useGetSubjectByTimetable";
import { SubjectInterface } from "@/types/subjectTypes";
import { TimetableInterface } from "@/types/timetableTypes";
import { Platform } from "react-native";
import { SubjectCopilot } from "./copilot/SubjectCopilot";

interface FilterOptions {
  Semester: string[];
  Timetable: string[];
  Type: string[];
}
type FilterCategory = keyof FilterOptions;

export default function SubjectsPage() {
  // --- Dark Mode Setup ---
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Extract refetch from hooks for the pull-to-refresh functionality
  const {
    data: subjectsData,
    isLoading,
    refetch: refetchSubjects,
  } = useGetAllSubjects();
  const {
    data: timetablesData,
    isLoading: timetablesLoading,
    refetch: refetchTimetables,
  } = useGetAllTimetablesOfUser();
  const { mutate: deleteSubject, isPending: isDeleting } = useDeleteSubject();

  const [searchQuery, setSearchQuery] = useState("");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  console.log("Selected IDs:", selectedIds);
  const [isManualSelectionMode, setIsManualSelectionMode] = useState(false);
  const isSelectionMode = selectedIds.length > 0 || isManualSelectionMode;

  // Refs for Copilot spotlight
  const searchRef = React.useRef<View>(null);
  const filterRef = React.useRef<View>(null);
  const menuRef = React.useRef<View>(null);
  const addRef = React.useRef<View>(null);

  // Menus State
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  console.log("Active Card Menu ID:", activeCardMenuId);

  const [selectedFilters, setSelectedFilters] = useState<
    Record<FilterCategory, string>
  >({
    Semester: "Semester",
    Timetable: "Timetable",
    Type: "Type",
  });
  const [activeFilter, setActiveFilter] = useState<FilterCategory | null>(null);
  console.log("Selected Filters:", selectedFilters);

  const sortByOptions: string[] = [
    "Name (A-Z)",
    "Name (Z-A)",
    "Latest",
    "Oldest",
    "Last Modified",
  ];
  const [sortByOption, setSortByOption] = useState<string>("");

  const selectedTimetableId =
    selectedFilters.Timetable !== "Timetable"
      ? timetablesData?.find(
        (t: TimetableInterface) => t.name === selectedFilters.Timetable,
      )?._id
      : null;
  const selectedSemesterNumber =
    selectedFilters.Semester !== "Semester"
      ? parseInt(selectedFilters.Semester.replace("Semester ", ""))
      : null;
  const selectedType =
    selectedFilters.Type !== "Type" ? selectedFilters.Type : null;

  // Extract refetch for filtered data as well
  const {
    data: timetableSubjectsData,
    isLoading: timetableSubjectsLoading,
    refetch: refetchTimetableSubjects,
  } = useGetSubjectsByTimetableId(selectedTimetableId || "");
  const {
    data: subjectsBySemesterData,
    isLoading: subjectsBySemesterLoading,
    refetch: refetchSemesterSubjects,
  } = useGetSubjectsBySemester(selectedSemesterNumber || 0);

  // --- Refreshing State & Callback ---
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Execute all available refetch functions concurrently
      await Promise.all([
        refetchSubjects && refetchSubjects(),
        refetchTimetables && refetchTimetables(),
        selectedTimetableId && refetchTimetableSubjects
          ? refetchTimetableSubjects()
          : Promise.resolve(),
        selectedSemesterNumber && refetchSemesterSubjects
          ? refetchSemesterSubjects()
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("Error refreshing subjects data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchSubjects,
    refetchTimetables,
    refetchTimetableSubjects,
    refetchSemesterSubjects,
    selectedTimetableId,
    selectedSemesterNumber,
  ]);

  const filteredSubjects = useMemo(() => {
    let baseData: SubjectInterface[] = subjectsData || [];

    if (selectedTimetableId) baseData = timetableSubjectsData || [];
    else if (selectedSemesterNumber) baseData = subjectsBySemesterData || [];

    const filteredData = baseData.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedType || s.type === selectedType;
      return matchesSearch && matchesType;
    });

    if (sortByOption) {
      if (sortByOption === "Name (A-Z)") {
        filteredData.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortByOption === "Name (Z-A)") {
        filteredData.sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortByOption === "Latest") {
        filteredData.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else if (sortByOption === "Oldest") {
        filteredData.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      } else if (sortByOption === "Last Modified") {
        filteredData.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      }
    }
    return filteredData;
  }, [
    selectedTimetableId,
    selectedSemesterNumber,
    selectedType,
    searchQuery,
    subjectsData,
    timetableSubjectsData,
    subjectsBySemesterData,
    sortByOption,
  ]);

  const filterOptions: FilterOptions = {
    Semester:
      [
        ...new Set<number>(
          timetablesData?.map((t: TimetableInterface) => t.semester),
        ),
      ]
        .sort()
        .map((s) => `Semester ${s}`) || [],
    Timetable:
      timetablesData
        ?.filter(
          (t: TimetableInterface) =>
            !selectedSemesterNumber || t.semester === selectedSemesterNumber,
        )
        .map((t: TimetableInterface) => t.name) || [],
    Type: ["THEORY", "LAB", "OTHER"],
  };

  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const openMenu = (id: string, event: any) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const { pageY, pageX } = event.nativeEvent;
    setMenuPosition({ top: pageY - 50, right: 60 });
    setActiveCardMenuId(id);
  };

  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        clearSelection();
        setIsManualSelectionMode(false);
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [isSelectionMode]);

  // --- Actions ---

  const handleLongPress = (id: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelection = (id: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const clearSelection = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const allIds = filteredSubjects.map((s) => s._id);
    const areAllSelected = allIds.every((id) => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleDeleteSelected = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Delete Subjects",
      "Are you sure you want to delete the selected subject(s)?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            selectedIds.forEach((id) => deleteSubject(id));
            clearSelection();
          },
        },
      ],
    );
  };

  const handleEdit = (id: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/subject/update/${id}`);
    clearSelection();
    setActiveCardMenuId(null);
  };

  const handleDeleteSingle = (id: string) => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Delete Subject",
      "Are you sure you want to delete this subject?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSubject(id),
        },
      ],
    );
    setActiveCardMenuId(null);
  };

  // --- Render Helpers ---

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "THEORY":
        return "bg-green-100 text-green-700";
      case "LAB":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const renderFilterDropdown = () => {
    if (!activeFilter) return null;

    const options = filterOptions[activeFilter];

    return (
      <Modal
        transparent={true}
        visible={!!activeFilter}
        animationType="fade"
        onRequestClose={() => setActiveFilter(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveFilter(null)}>
          <View className="flex-1 bg-black/10 dark:bg-black/50 justify-end">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-xl border-t border-gray-100 dark:border-slate-800">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Select {activeFilter}
                </Text>
                <TouchableOpacity onPress={() => setActiveFilter(null)}>
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={isDark ? "#94a3b8" : "#9ca3af"}
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFilters((prev) => ({
                      ...prev,
                      [activeFilter]: activeFilter,
                    }));
                    if (activeFilter === "Semester")
                      setSelectedFilters((prev) => ({
                        ...prev,
                        Timetable: "Timetable",
                      }));
                    setActiveFilter(null);
                  }}
                  className={`mr-2 mb-2 px-4 py-2 rounded-full border ${selectedFilters[activeFilter] === activeFilter
                      ? "bg-blue-600 border-blue-600"
                      : "bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                    }`}
                >
                  <Text
                    className={
                      selectedFilters[activeFilter] === activeFilter
                        ? "text-white font-bold"
                        : "text-gray-600 dark:text-gray-300"
                    }
                  >
                    All
                  </Text>
                </TouchableOpacity>

                {options.map((option, index) => {
                  const label = option;
                  const isSelected = selectedFilters[activeFilter] === label;

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedFilters((prev) => ({
                          ...prev,
                          [activeFilter]: label,
                        }));
                        if (activeFilter === "Semester")
                          setSelectedFilters((prev) => ({
                            ...prev,
                            Timetable: "Timetable",
                          }));
                        setActiveFilter(null);
                      }}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full border ${isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                        }`}
                    >
                      <Text
                        className={`${isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderSortModal = () => {
    return (
      <Modal
        transparent={true}
        visible={sortMenuVisible}
        animationType="fade"
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSortMenuVisible(false)}>
          <View className="flex-1 bg-black/20 dark:bg-black/60 justify-end">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-xl border-t border-gray-100 dark:border-slate-800">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Sort Subjects
                </Text>
                <TouchableOpacity onPress={() => setSortMenuVisible(false)}>
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={isDark ? "#94a3b8" : "#9ca3af"}
                  />
                </TouchableOpacity>
              </View>

              {/* Sort Options List */}
              <View className="space-y-2">
                {sortByOptions.map((option) => {
                  const isSelected = sortByOption === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setSortByOption(option);
                        setSortMenuVisible(false);
                      }}
                      className={`flex-row justify-between items-center p-4 rounded-xl border ${isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-gray-50 dark:bg-slate-800 border-transparent"
                        }`}
                    >
                      <Text
                        className={`text-base ${isSelected ? "text-blue-700 dark:text-blue-400 font-bold" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {option}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-sharp"
                          size={20}
                          color={isDark ? "#60a5fa" : "#2563eb"}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Clear Sort Button */}
              <TouchableOpacity
                onPress={() => {
                  setSortByOption("");
                  setSortMenuVisible(false);
                }}
                className="mt-4 py-3 items-center"
              >
                <Text className="text-gray-400 dark:text-gray-500 font-medium">
                  Reset to Default
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderSubjectCard = ({ item }: { item: SubjectInterface }) => {
    const isSelected = selectedIds.includes(item._id || "");

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleLongPress(item._id || "")}
        onPress={() => {
          if (Platform.OS === "android") {
            Vibration.vibrate(20);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          if (isSelectionMode) toggleSelection(item._id || "");
          else router.push(`/subject/details/${item._id}`);
        }}
        className={`bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 border ${isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-100 dark:border-slate-700"
          }`}
        style={{
          shadowColor: "#000",
          shadowOpacity: isDark ? 0 : 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        {/* Header Row: Title & Card Menu */}
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1 pr-4">
            {item.name}
          </Text>

          {!isSelectionMode && (
            <TouchableOpacity
              onPress={(e) => openMenu(item._id || "", e)}
              className="p-1"
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={isDark ? "#94a3b8" : "#6b7280"}
              />
            </TouchableOpacity>
          )}

          {/* Card Menu Dropdown */}
          {activeCardMenuId === item._id && (
            <Modal
              transparent={true}
              visible={activeCardMenuId === item._id}
              animationType="none"
              onRequestClose={() => setActiveCardMenuId(null)}
            >
              <TouchableWithoutFeedback
                onPress={() => setActiveCardMenuId(null)}
              >
                <View className="flex-1">
                  <View
                    style={{
                      position: "absolute",
                      top: menuPosition.top,
                      right: menuPosition.right,
                    }}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 w-20 overflow-hidden"
                  >
                    <TouchableOpacity
                      onPress={() => handleEdit(item._id || "")}
                      className="px-4 py-3 border-b border-gray-100 dark:border-slate-700"
                    >
                      <Text className="text-gray-700 dark:text-gray-200">
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteSingle(item._id || "")}
                      className="px-4 py-3"
                    >
                      <Text className="text-red-600 dark:text-red-400">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          )}
        </View>

        {/* CONSTRAINT: Subject Code and Type on the same line */}
        <View className="flex-row items-center mb-1">
          <View
            className={`px-2 py-0.5 rounded-md mr-2 ${getTypeStyles(item.type)}`}
          >
            <Text className={`text-[10px] font-bold uppercase`}>
              {item.type}
            </Text>
          </View>
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
            {item.code}
          </Text>
        </View>

        {/* View Details Indicator */}
        <View className="flex-row items-center justify-end mt-3 border-t border-gray-100 dark:border-slate-700/60 pt-3">
          <Text className="text-sm font-medium text-blue-600 dark:text-blue-400 mr-1">
            View Details
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={isDark ? "#60a5fa" : "#3b82f6"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-slate-950"
      edges={["top", "left", "right"]}
    >
      {/* Global Touchable to dismiss menus */}
      {(headerMenuVisible || activeCardMenuId) && (
        <Modal transparent visible animationType="fade">
          <TouchableWithoutFeedback
            onPress={() => {
              setHeaderMenuVisible(false);
              setActiveCardMenuId(null);
            }}
          >
            <View className="flex-1" />
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Dynamic Header */}
      {isSelectionMode ? (
        <View className="flex-row justify-between items-center px-6 py-4 bg-blue-50 dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                clearSelection();
                setIsManualSelectionMode(false);
              }}
              className="mr-4 p-1"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#e2e8f0" : "#1f2937"}
              />
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedIds.length} Selected
              </Text>
              <TouchableOpacity onPress={handleSelectAll}>
                <Text className="text-blue-600 dark:text-blue-400 font-semibold text-xs">
                  {selectedIds.length === filteredSubjects.length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center">
            {selectedIds.length === 1 && (
              <TouchableOpacity
                onPress={() => handleEdit(selectedIds[0])}
                className="p-2 mr-2"
              >
                <Ionicons
                  name="pencil"
                  size={22}
                  color={isDark ? "#94a3b8" : "#4b5563"}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDeleteSelected} className="p-2">
              <Ionicons
                name="trash"
                size={22}
                color={isDark ? "#ef4444" : "#ef4444"}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-row justify-between items-center px-3 py-4 bg-gray-50 dark:bg-slate-950">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === "android") {
                  Vibration.vibrate(20);
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.back();
              }}
              className="mr-4 p-1"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? "#3b82f6" : "#2563eb"}
              />
            </TouchableOpacity>
            <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Subjects
            </Text>
          </View>

          <View>
            <TouchableOpacity
              ref={menuRef}
              onPress={() => {
                if (Platform.OS === "android") {
                  Vibration.vibrate(20);
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setHeaderMenuVisible(true)
              }}
              className="p-1"
            >
              <Ionicons
                name="ellipsis-vertical"
                size={24}
                color={isDark ? "#f1f5f9" : "#1f2937"}
              />
            </TouchableOpacity>

            {/* Global Header Menu using Modal */}
            <Modal
              transparent={true}
              visible={headerMenuVisible}
              animationType="fade"
              onRequestClose={() => setHeaderMenuVisible(false)}
            >
              <TouchableWithoutFeedback
                onPress={() => setHeaderMenuVisible(false)}
              >
                <View className="flex-1 bg-black/5 dark:bg-black/50">
                  <View
                    style={{ position: "absolute", top: 60, right: 20 }}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 w-40 overflow-hidden"
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setHeaderMenuVisible(false);
                        setIsManualSelectionMode(true);
                      }}
                      className="flex-row items-center px-4 py-4 border-b border-gray-50 dark:border-slate-700 active:bg-gray-50 dark:active:bg-slate-700"
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={isDark ? "#94a3b8" : "#4b5563"}
                        className="mr-3"
                      />
                      <Text className="text-gray-700 dark:text-gray-200 font-medium ml-2">
                        Select
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setHeaderMenuVisible(false);
                        setSortMenuVisible(true);
                      }}
                      className="flex-row items-center px-4 py-4 active:bg-gray-50 dark:active:bg-slate-700"
                    >
                      <Ionicons
                        name="swap-vertical"
                        size={20}
                        color={isDark ? "#94a3b8" : "#4b5563"}
                        className="mr-3"
                      />
                      <Text className="text-gray-700 dark:text-gray-200 font-medium ml-2">
                        Sort By
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        </View>
      )}
      {renderSortModal()}

      {/* Search & Filters */}
      <View className="px-3 pb-4 bg-gray-50 dark:bg-slate-950">
        <View ref={searchRef} className="flex-row items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-1 mb-4">
          <Ionicons
            name="search"
            size={20}
            color={isDark ? "#94a3b8" : "#9ca3af"}
          />
          <TextInput
            placeholder="Search by name or code"
            placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
          />
        </View>

        {/* Horizontal Scroll Filters */}
        <View ref={filterRef}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={Object.keys(filterOptions) as FilterCategory[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = selectedFilters[item] !== item;
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item)}
                className={`flex-row items-center px-4 py-2 rounded-full border mr-3 ${isActive
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  }`}
              >
                <Text
                  className={`font-semibold mr-1 ${isActive ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {isActive ? item : selectedFilters[item]}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={isActive ? "white" : isDark ? "#94a3b8" : "#6b7280"}
                />
              </TouchableOpacity>
            );
          }}
        />
        </View>
        {renderFilterDropdown()}
      </View>

      {/* Subjects List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={filteredSubjects}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderSubjectCard}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
              tintColor={isDark ? "#60a5fa" : "#2563eb"}
              title="Pull to refresh"
              titleColor={isDark ? "#94a3b8" : "#6b7280"}
            />
          }
        />
      )}

      {/* Floating Action Button (FAB) - Hide when selecting items */}
      {!isSelectionMode && (
        <TouchableOpacity
          ref={addRef}
          onPress={() => {
            if (Platform.OS === "android") {
              Vibration.vibrate(20);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push("/subject/create")
          }}
          className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-blue-300 dark:shadow-none z-10"
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* Subject Page Copilot */}
      <SubjectCopilot searchRef={searchRef} filterRef={filterRef} menuRef={menuRef} addRef={addRef} />
    </SafeAreaView>
  );
}