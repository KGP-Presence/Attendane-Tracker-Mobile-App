import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

export const useCopilot = (storageKey: string) => {
  const [shouldShow, setShouldShow] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // DEV MODE: Reset to true every time the screen comes into focus
      // This means you can just switch tabs to re-trigger the copilot, no reload/login needed!
      // Remember to revert this back to value === null once we're done drilling!
      setShouldShow(true);
    }, [])
  );

  const markComplete = useCallback(async () => {
    // DEV MODE: Don't persist the 'done' state so it shows up again on reload/focus.
    // await AsyncStorage.setItem(storageKey, "done");
    setShouldShow(false);
  }, [storageKey]);

  const resetCopilot = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
    setShouldShow(true);
  }, [storageKey]);

  return { isReady: true, shouldShow, markComplete, resetCopilot };
};
