import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const COPILOT_KEY = "@kgp_presence_copilot_done";

export const useCopilot = () => {
  const [isReady, setIsReady] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COPILOT_KEY).then((value) => {
      setShouldShow(value === null); // null means never seen
      setIsReady(true);
    });
  }, []);

  const markComplete = useCallback(async () => {
    await AsyncStorage.setItem(COPILOT_KEY, "done");
    setShouldShow(false);
  }, []);

  const resetCopilot = useCallback(async () => {
    await AsyncStorage.removeItem(COPILOT_KEY);
    setShouldShow(true);
  }, []);

  return { isReady, shouldShow, markComplete, resetCopilot };
};
