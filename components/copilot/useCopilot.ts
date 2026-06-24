import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

export const useCopilot = (storageKey: string) => {
  const [isReady, setIsReady] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const checkStatus = async () => {
        try {
          const value = await AsyncStorage.getItem(storageKey);
          if (isMounted) {
            setShouldShow(value !== "done");
            setIsReady(true);
          }
        } catch (error) {
          console.error("Failed to read copilot status:", error);
          if (isMounted) {
            setIsReady(true);
          }
        }
      };

      checkStatus();
      return () => {
        isMounted = false;
      };
    }, [storageKey])
  );

  const markComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(storageKey, "done");
      setShouldShow(false);
    } catch (error) {
      console.error("Failed to save copilot status:", error);
    }
  }, [storageKey]);

  const resetCopilot = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      setShouldShow(true);
    } catch (error) {
      console.error("Failed to reset copilot status:", error);
    }
  }, [storageKey]);

  return { isReady, shouldShow, markComplete, resetCopilot };
};
