import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, useColorScheme, Alert,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { isAxiosError } from 'axios';

// Hooks
import { useUpdateSubject } from '@/hooks/useUpdateSubject';
import { useGetSubjectById } from '@/hooks/useGetSubjectById'; 
import { useRemoveSubjectsFromTimetables } from '@/hooks/useEditTimetableSubjects'; // Imported your hook

import { timeSlots } from '@/constants/slotData';

export default function UpdateSubjectPage() {
  const { id } = useLocalSearchParams();
  const subjectId = Array.isArray(id) ? id[0] : id; // Ensure string ID

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayFull = {
    'Mon': 'MONDAY',
    'Tue': 'TUESDAY',
    'Wed': 'WEDNESDAY',
    'Thu': 'THURSDAY',
    'Fri': 'FRIDAY',
  };
  const TIME_LABELS = [
    '8 AM - 9 AM', '9 AM - 10 AM', '10 AM - 11 AM', '11 AM - 12 PM',
    '12 PM - 1 PM', '1 PM - 2 PM (LUNCH)', '2 PM - 3 PM', '3 PM - 4 PM', 
    '4 PM - 5 PM', '5 PM - 6 PM'
  ];
  
  const mapUiToSlotKey = (day: string, timeLabel: string) => {
    const timeRange = timeLabel.replace(/\s/g, '').replace(' (LUNCH)', '');
    return `${dayFull[day as keyof typeof dayFull]}_${timeRange}`;
  };

  // --- State ---
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [credits, setCredits] = useState(3);
  const [grading, setGrading] = useState<'ABSOLUTE' | 'RELATIVE' | 'UNKNOWN'>('UNKNOWN');
  const [professors, setProfessors] = useState<string[]>([]);
  const [currentProf, setCurrentProf] = useState('');
  const [venues, setVenues] = useState<string[]>([]);
  const [currentVenue, setCurrentVenue] = useState('');
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [type, setType] = useState<'THEORY' | 'LAB' | 'OTHER'>('OTHER');
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  // --- Queries & Mutations ---
  const { data: fetchedSubject, isFetching: isLoadingData } = useGetSubjectById(subjectId);
  const { mutate: updateSubject, isPending: isUpdating } = useUpdateSubject();
  
  // Using the refactored hook (generic, no ID passed at init)
  const { mutateAsync: removeSubjectsFromTimetable } = useRemoveSubjectsFromTimetables();

  // --- Effects ---
  useEffect(() => {
    if (fetchedSubject) {
      setSubjectCode(fetchedSubject.code || '');
      setSubjectName(fetchedSubject.name || '');
      setCredits(Number(fetchedSubject.credits) || 0);
      setGrading(fetchedSubject.grading || 'ABSOLUTE');
      setProfessors(fetchedSubject.professors || []);
      setVenues(fetchedSubject.venues || []); // Assumes standard structured array from DB
      setSelectedSlots(fetchedSubject.slots || []);
      setType(fetchedSubject.type || 'OTHER');  
    }
  }, [fetchedSubject]);

  // --- Handlers ---
  const toggleSlot = (slotKey: string) => {
    if (slotKey.includes('1-2PM')) return;
    setSelectedSlots(prev => 
      prev.includes(slotKey) ? prev.filter(s => s !== slotKey) : [...prev, slotKey]
    );
  };

  const handleResolveConflicts = async (conflictingTimetables: any[]) => {
    setIsResolvingConflicts(true);
    try {
        // We use Promise.all to remove the subject from ALL conflicting timetables in parallel
        // We use the mutateAsync from the hook you provided
        await Promise.all(
            conflictingTimetables.map((timetable) => 
                removeSubjectsFromTimetable({ 
                    timetableId: timetable._id, 
                    subjectIds: [subjectId] 
                })
            )
        );

        Toast.show({
            type: 'success',
            text1: 'Conflicts Resolved',
            text2: 'Retrying update...',
        });

        // Recursively call handleUpdate to try again immediately
        handleUpdate();

    } catch (error) {
        console.error("Error resolving conflicts", error);
        // The hook's onError will handle the toast, but we can add a specific one here if needed
    } finally {
        setIsResolvingConflicts(false);
    }
  };

  const handleUpdate = () => {
    if (venues.length === 0) {
      if (currentVenue) setVenues([currentVenue]);
      else setVenues(['Unknown']);
    }
    const payload = {
      code: subjectCode.toUpperCase(),
      name: subjectName,
      credits,
      grading,
      professors,
      venues: venues.length ? venues : (currentVenue ? [currentVenue] : ['Unknown']),
      slots: selectedSlots,
      type,
    };

    updateSubject(
      { id: subjectId, payload }, 
      {
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Subject updated successfully'
            });
            router.back();
        },
        onError: (error) => {
            if (isAxiosError(error) && error.response) {
                const { status, data } = error.response;
                console.log(data);
                
                // --- CONFLICT HANDLING LOGIC ---
                if (status === 400 && data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                    const conflictingTimetables = data.errors;
                    
                    // Format the message with timetable names
                    const timetableNames = conflictingTimetables.map((t: any) => `• ${t.name}`).join('\n');

                    Alert.alert(
                        "Slot Conflict Detected",
                        `This update clashes with the following timetables:\n\n${timetableNames}\n\nDo you want to remove this subject from these timetables and proceed with the update?`,
                        [
                            {
                                text: "Cancel",
                                style: "cancel"
                            },
                            {
                                text: "OK, Remove & Update",
                                onPress: () => handleResolveConflicts(conflictingTimetables)
                            }
                        ]
                    );
                } else {
                    // Standard Error
                    Toast.show({
                        type: 'error',
                        text1: 'Update Failed',
                        text2: data.message || 'Something went wrong'
                    });
                }
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'An unexpected error occurred'
                });
            }
        }
      }
    );
  };

  // Colors for icons based on theme
  const primaryColor = isDark ? '#60a5fa' : '#2563eb'; 
  const placeholderColor = isDark ? '#9ca3af' : '#9ca3af';

  if (isLoadingData) {
      return (
          <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 justify-center items-center">
              <ActivityIndicator size="large" color={primaryColor} />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={() => {
            Vibration.vibrate(20)
            router.back()}} className="p-1">
            <Text className="text-blue-600 dark:text-blue-400 text-lg font-medium">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Edit Subject</Text>
          <TouchableOpacity 
            onPress={handleUpdate} 
            disabled={isUpdating || isResolvingConflicts} 
            className="p-1"
          >
            <Text className={`text-lg font-semibold ${(isUpdating || isResolvingConflicts) ? 'text-gray-400 dark:text-gray-600' : 'text-blue-600 dark:text-blue-400'}`}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback>
          <ScrollView 
            className="flex-1 px-6" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 300 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Subject Code */}
            <View className="mt-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Subject Code</Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-base"
                placeholder="e.g. AE20202"
                value={subjectCode}
                onChangeText={setSubjectCode}
                autoCapitalize="characters"
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* Subject Name */}
            <View className="mt-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Subject Name</Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-base"
                placeholder="e.g. Flight Vehicle Controls"
                value={subjectName}
                onChangeText={setSubjectName}
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* Schedule Slots Section */}
            <View className="mt-8">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Schedule Slots</Text>
              
              <View className="flex-row justify-between mb-6">
                {DAYS.map(day => (
                  <TouchableOpacity 
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-full border ${selectedDay === day ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}
                  >
                    <Text className={`font-semibold ${selectedDay === day ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row flex-wrap justify-between">
                {TIME_LABELS.map((label) => {
                  const slotKey = mapUiToSlotKey(selectedDay, label);
                  const isSelected = selectedSlots.includes(slotKey);
                  const isLunch = label.includes('LUNCH');

                  const slotBg = isLunch 
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700' 
                    : isSelected 
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700' 
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';

                  const slotText = isSelected 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-500 dark:text-gray-400';

                  return (
                    <TouchableOpacity
                      key={label}
                      disabled={isLunch}
                      onPress={() => toggleSlot(slotKey)}
                      className={`w-[48%] mb-3 p-4 rounded-xl items-center border 
                        ${slotBg} ${isLunch ? 'border-dashed opacity-50' : ''}`}
                    >
                      <Text className={`text-xs font-bold ${slotText}`}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selection Chips */}
            {selectedSlots.length > 0 && (
              <View className="mt-4 flex-row flex-wrap">
                {selectedSlots.map(slot => (
                  <View key={slot} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex-row items-center px-3 py-1 rounded-md mr-2 mb-2">
                    <Text className="text-blue-700 dark:text-blue-300 text-[10px] font-medium mr-1">{slot.replace('_', ' ')}</Text>
                    <TouchableOpacity onPress={() => toggleSlot(slot)}>
                      <Ionicons name="close-circle" size={14} color={isDark ? '#93c5fd' : '#2563eb'} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View className="h-[1px] bg-gray-100 dark:bg-gray-800 my-8" />

            {/* Credits and Grading */}
            <View className="flex-row justify-between h-14 mb-6">
              <View className="w-[45%]">
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Credits</Text>
                <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2">
                  <TouchableOpacity onPress={() => setCredits(Math.max(0, credits - 1))} className="p-2">
                    <Ionicons name="remove" size={20} color={primaryColor} />
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">{credits}</Text>
                  <TouchableOpacity onPress={() => setCredits(credits + 1)} className="p-2">
                    <Ionicons name="add" size={20} color={primaryColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="w-[45%]">
                <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Grading</Text>
                <View className="flex-row bg-gray-50 dark:bg-gray-800 rounded-xl p-1 h-full items-center">
                  {(['ABSOLUTE', 'RELATIVE'] as const).map((gradeType) => {
                    const isActive = grading === gradeType;
                    return (
                      <TouchableOpacity
                        key={gradeType}
                        onPress={() => grading === gradeType ? setGrading('UNKNOWN') : setGrading(gradeType)}
                        className={`flex-1 py-[13px] rounded-lg items-center ${isActive ? 'bg-white dark:bg-gray-700' : 'bg-transparent'}`}
                        style={isActive ? { shadowColor: '#000', shadowOpacity: 0.1 } : {}}
                      >
                        <Text className={isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}>
                          {gradeType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Subject Type */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Subject Type</Text>
              <View className="flex-row bg-gray-50 dark:bg-gray-800 rounded-xl p-1 h-14 items-center">
                {(['THEORY', 'LAB', 'OTHER'] as const).map((subjectType) => {
                  const isActive = type === subjectType;
                  return (
                    <TouchableOpacity
                      key={subjectType}
                      onPress={() => setType(subjectType)}
                      className={`flex-1 py-[13px] rounded-lg items-center ${isActive ? 'bg-white dark:bg-gray-700' : 'bg-transparent'}`}
                      style={isActive ? { shadowColor: '#000', shadowOpacity: 0.1 } : {}}
                    >
                      <Text className={isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}>
                        {subjectType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Professors */}
            <View className="mt-2 mb-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Professors</Text>
              <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 mb-4">
                <TextInput
                  className="flex-1 py-4 text-base text-gray-900 dark:text-white"
                  placeholder="Add Professor..."
                  value={currentProf}
                  onChangeText={setCurrentProf}
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity 
                  onPress={() => {
                    if (currentProf && !professors.includes(currentProf.trim())) {
                      setProfessors([...professors, currentProf.trim()]);
                      setCurrentProf('');
                    }
                  }}
                  className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2"
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {professors.map((prof, index) => (
                <View key={index} className="flex-row items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl p-3 mb-2">
                  <Text className="text-gray-700 dark:text-gray-200 font-medium">{prof}</Text>
                  <TouchableOpacity onPress={() => setProfessors(professors.filter((_, i) => i !== index))}>
                    <Ionicons name="close" size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Venues */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Venues</Text>
              <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 mb-4">
                <TextInput
                  className="flex-1 py-4 text-base text-gray-900 dark:text-white"
                  placeholder="Add Venue..."
                  value={currentVenue}
                  onChangeText={setCurrentVenue}
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (currentVenue && !venues.includes(currentVenue.trim())) {
                      setVenues([...venues, currentVenue.trim()]);
                      setCurrentVenue('');
                    }
                  }}
                  className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2"
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {venues.map((venue, index) => (
                <View key={index} className="flex-row items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl p-3 mb-2">
                  <Text className="text-gray-700 dark:text-gray-200 font-medium">{venue}</Text>
                  <TouchableOpacity onPress={() => setVenues(venues.filter((_, i) => i !== index))}>
                    <Ionicons name="close" size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              onPress={handleUpdate}
              disabled={isUpdating || isResolvingConflicts}
              className={`py-5 rounded-2xl items-center mb-10 ${(isUpdating || isResolvingConflicts) ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-600 dark:bg-blue-500 shadow-lg shadow-blue-200 dark:shadow-none'}`}
            >
              {(isUpdating || isResolvingConflicts) ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Update Subject</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}