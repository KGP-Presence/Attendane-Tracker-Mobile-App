import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef } from "react";
import { Vibration } from "react-native";

/**
 * Sound + vibration for the timetable scan screen.
 *
 * Clips are preloaded once so playback at reveal time is instant, and the
 * app-wide `sounds_enabled` switch is honoured — the same flag the attendance
 * sounds use. Vibration is independent of it.
 */

const CLIPS = {
  pop: require("@/assets/sounds/scan/pop.wav"),
  skip: require("@/assets/sounds/scan/skip.wav"),
  complete: require("@/assets/sounds/scan/complete.wav"),
};

export type ScanCue = keyof typeof CLIPS;

/** Vibration patterns, kept short so a long report doesn't buzz constantly. */
const PATTERNS: Record<ScanCue, number | number[]> = {
  pop: 12,
  skip: [0, 22, 45, 22],
  complete: [0, 30, 55, 30, 55, 60],
};

export const useScanFeedback = () => {
  const sounds = useRef<Partial<Record<ScanCue, Audio.Sound>>>({});
  const enabled = useRef(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        enabled.current =
          (await AsyncStorage.getItem("sounds_enabled")) !== "false";
        if (!enabled.current) return;

        // Let the cues play even with the iOS ringer switch off — they're
        // feedback on an action the user just took, not media.
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        for (const key of Object.keys(CLIPS) as ScanCue[]) {
          const { sound } = await Audio.Sound.createAsync(CLIPS[key], {
            volume: key === "complete" ? 0.8 : 0.55,
          });
          if (!mounted.current) {
            await sound.unloadAsync();
            return;
          }
          sounds.current[key] = sound;
        }
      } catch (error) {
        // Audio is a nicety; never let it break the screen.
        console.warn("Scan sounds unavailable:", error);
      }
    })();

    return () => {
      mounted.current = false;
      const loaded = sounds.current;
      sounds.current = {};
      Object.values(loaded).forEach((sound) => {
        sound?.unloadAsync().catch(() => {});
      });
    };
  }, []);

  return useCallback((cue: ScanCue) => {
    Vibration.vibrate(PATTERNS[cue]);

    const sound = sounds.current[cue];
    if (!sound || !enabled.current) return;
    // replayAsync rewinds first, so rapid repeats don't get swallowed.
    sound.replayAsync().catch(() => {});
  }, []);
};
