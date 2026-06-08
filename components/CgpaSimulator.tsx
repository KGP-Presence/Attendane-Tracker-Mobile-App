import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import {
  CgpaData,
  loadCgpaData,
  saveCgpaData,
  calculateProjectedCGPA,
  calculateRequiredSG,
} from "@/utils/cgpaStorage";

type SimMode = "whatif" | "target";

export default function CgpaSimulator() {
  const [data, setData] = useState<CgpaData>({
    currentCGPA: "",
    totalCredits: "",
    semCredits: "",
  });
  const [mode, setMode] = useState<SimMode>("whatif");
  const [sgValue, setSgValue] = useState(7.5);
  const [targetCG, setTargetCG] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    loadCgpaData().then((saved) => {
      setData(saved);
      setLoaded(true);
    });
  }, []);

  // Auto-save whenever inputs change (debounced by dependency)
  useEffect(() => {
    if (loaded) {
      saveCgpaData(data);
    }
  }, [data, loaded]);

  const hapticFeedback = () => {
    if (Platform.OS === "android") {
      Vibration.vibrate(20);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateField = (field: keyof CgpaData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Parse inputs for calculations
  const prevCG = parseFloat(data.currentCGPA) || 0;
  const prevCredits = parseInt(data.totalCredits, 10) || 0;
  const semCredits = parseInt(data.semCredits, 10) || 0;
  const inputsValid =
    prevCG > 0 && prevCG <= 10 && prevCredits > 0 && semCredits > 0;

  // What-if mode result
  const projectedCGPA = inputsValid
    ? calculateProjectedCGPA(prevCG, prevCredits, sgValue, semCredits)
    : null;

  // Target mode result
  const targetCGValue = parseFloat(targetCG) || 0;
  const requiredSG =
    inputsValid && targetCGValue > 0 && targetCGValue <= 10
      ? calculateRequiredSG(prevCG, prevCredits, targetCGValue, semCredits)
      : null;

  return (
    <View className="px-4 mt-6">
      <Text className="text-[#616f89] dark:text-gray-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
        CGPA Simulator
      </Text>

      <View className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Input Fields */}
        <View className="p-4">
          {/* Current CGPA */}
          <View className="mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <MaterialIcons name="grade" size={18} color="#135bec" />
              <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                Current CGPA (till last sem)
              </Text>
            </View>
            <TextInput
              className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[#111318] dark:text-white text-base"
              placeholder="e.g. 7.85"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={data.currentCGPA}
              onChangeText={(v) => updateField("currentCGPA", v)}
              maxLength={5}
            />
          </View>

          {/* Total Credits */}
          <View className="mb-3">
            <View className="flex-row items-center gap-2 mb-1">
              <MaterialIcons
                name="account-balance"
                size={18}
                color="#135bec"
              />
              <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                Total Credits (till last sem)
              </Text>
            </View>
            <TextInput
              className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[#111318] dark:text-white text-base"
              placeholder="e.g. 120"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={data.totalCredits}
              onChangeText={(v) => updateField("totalCredits", v)}
              maxLength={3}
            />
          </View>

          {/* Semester Credits */}
          <View className="mb-1">
            <View className="flex-row items-center gap-2 mb-1">
              <MaterialIcons name="event-note" size={18} color="#135bec" />
              <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                Credits This Semester
              </Text>
            </View>
            <TextInput
              className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[#111318] dark:text-white text-base"
              placeholder="e.g. 24"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={data.semCredits}
              onChangeText={(v) => updateField("semCredits", v)}
              maxLength={2}
            />
          </View>
        </View>

        {/* Mode Toggle */}
        <View className="flex-row mx-4 mb-3 bg-gray-100 dark:bg-[#0f1520] rounded-lg p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${
              mode === "whatif" ? "bg-[#135bec]" : ""
            }`}
            onPress={() => {
              hapticFeedback();
              setMode("whatif");
            }}
          >
            <Text
              className={`text-sm font-semibold ${
                mode === "whatif"
                  ? "text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              What-If SG
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${
              mode === "target" ? "bg-[#135bec]" : ""
            }`}
            onPress={() => {
              hapticFeedback();
              setMode("target");
            }}
          >
            <Text
              className={`text-sm font-semibold ${
                mode === "target"
                  ? "text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Target CGPA
            </Text>
          </TouchableOpacity>
        </View>

        {/* What-If Mode: SG Slider */}
        {mode === "whatif" && (
          <View className="px-4 pb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                Semester Grade (SG)
              </Text>
              <Text className="text-[#135bec] text-lg font-bold">
                {sgValue.toFixed(1)}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Text className="text-gray-400 text-xs">5.0</Text>
              <View className="flex-1">
                <Slider
                  minimumValue={5}
                  maximumValue={10}
                  step={0.1}
                  value={sgValue}
                  onValueChange={setSgValue}
                  minimumTrackTintColor="#135bec"
                  maximumTrackTintColor="#374151"
                  thumbTintColor="#135bec"
                />
              </View>
              <Text className="text-gray-400 text-xs">10.0</Text>
            </View>

            {/* Result */}
            {inputsValid && projectedCGPA !== null && (
              <View className="mt-3 bg-[#135bec]/10 border border-[#135bec]/20 rounded-lg p-3">
                <Text className="text-[#135bec] text-xs font-medium mb-1">
                  Projected CGPA
                </Text>
                <Text className="text-[#111318] dark:text-white text-2xl font-bold">
                  {projectedCGPA.toFixed(2)}
                </Text>
              </View>
            )}

            {!inputsValid && (
              <Text className="text-gray-400 text-xs mt-2 text-center">
                Fill in all fields above to see results
              </Text>
            )}
          </View>
        )}

        {/* Target Mode: Desired CGPA Input */}
        {mode === "target" && (
          <View className="px-4 pb-4">
            <View className="flex-row items-center gap-2 mb-1">
              <MaterialIcons name="flag" size={18} color="#135bec" />
              <Text className="text-[#616f89] dark:text-gray-400 text-xs font-medium">
                Desired CGPA
              </Text>
            </View>
            <TextInput
              className="bg-gray-50 dark:bg-[#0f1520] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[#111318] dark:text-white text-base mb-3"
              placeholder="e.g. 8.50"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={targetCG}
              onChangeText={setTargetCG}
              maxLength={5}
            />

            {/* Result */}
            {inputsValid && targetCGValue > 0 && targetCGValue <= 10 && (
              <View
                className={`border rounded-lg p-3 ${
                  requiredSG !== null
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                {requiredSG !== null ? (
                  <>
                    <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                      Required SG This Semester
                    </Text>
                    <Text className="text-[#111318] dark:text-white text-2xl font-bold">
                      {requiredSG.toFixed(2)}
                    </Text>
                    {requiredSG < 5 && (
                      <Text className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                        🎉 Easily achievable! Even a low SG works.
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text className="text-red-500 text-xs font-medium mb-1">
                      Not Achievable
                    </Text>
                    <Text className="text-red-400 text-sm">
                      This target CGPA requires an SG above 10 or is impossible
                      with current credits.
                    </Text>
                  </>
                )}
              </View>
            )}

            {!inputsValid && (
              <Text className="text-gray-400 text-xs mt-2 text-center">
                Fill in all fields above to see results
              </Text>
            )}
          </View>
        )}

        {/* Privacy Badge */}
        <View className="flex-row items-center justify-center gap-1 py-3 border-t border-gray-100 dark:border-gray-700">
          <MaterialIcons name="lock" size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-[10px]">
            Stored only on your device
          </Text>
        </View>
      </View>
    </View>
  );
}
