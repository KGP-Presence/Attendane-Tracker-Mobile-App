import AsyncStorage from "@react-native-async-storage/async-storage";

const CGPA_STORAGE_KEY = "@cgpa_simulator_data";

export interface CgpaData {
  currentCGPA: string; // stored as string to preserve user's typed decimal input
  totalCredits: string;
  semCredits: string;
}

const DEFAULT_CGPA_DATA: CgpaData = {
  currentCGPA: "",
  totalCredits: "",
  semCredits: "",
};

export const loadCgpaData = async (): Promise<CgpaData> => {
  try {
    const raw = await AsyncStorage.getItem(CGPA_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as CgpaData;
    }
    return DEFAULT_CGPA_DATA;
  } catch (error) {
    console.error("[CGPA] Failed to load data:", error);
    return DEFAULT_CGPA_DATA;
  }
};

export const saveCgpaData = async (data: CgpaData): Promise<void> => {
  try {
    await AsyncStorage.setItem(CGPA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("[CGPA] Failed to save data:", error);
  }
};

/**
 * Calculate projected CGPA given an SG value.
 * Formula: newCG = (prevCG × prevCredits + SG × semCredits) / (prevCredits + semCredits)
 */
export const calculateProjectedCGPA = (
  prevCG: number,
  prevCredits: number,
  sg: number,
  semCredits: number
): number => {
  const totalCredits = prevCredits + semCredits;
  if (totalCredits === 0) return 0;
  return (prevCG * prevCredits + sg * semCredits) / totalCredits;
};

/**
 * Calculate required SG to achieve a target CGPA.
 * Formula: requiredSG = (targetCG × (prevCredits + semCredits) - prevCG × prevCredits) / semCredits
 * Returns null if the required SG is outside the 0–10 range.
 */
export const calculateRequiredSG = (
  prevCG: number,
  prevCredits: number,
  targetCG: number,
  semCredits: number
): number | null => {
  if (semCredits === 0) return null;
  const totalCredits = prevCredits + semCredits;
  const required =
    (targetCG * totalCredits - prevCG * prevCredits) / semCredits;
  if (required < 0 || required > 10) return null;
  return required;
};
