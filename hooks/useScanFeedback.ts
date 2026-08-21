import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef } from "react";
import { Vibration } from "react-native";

/**
 * Sound + vibration for the timetable scan screen.
 *
 * Clips are preloaded once so playback at cue time is instant, and the app-wide
 * `sounds_enabled` switch is honoured — the same flag the attendance sounds
 * use. Vibration is independent of it.
 */

const CLIPS = {
  scan: require("@/assets/sounds/scan/scan.wav"),
  pop: require("@/assets/sounds/scan/pop.wav"),
  skip: require("@/assets/sounds/scan/skip.wav"),
  complete: require("@/assets/sounds/scan/complete.wav"),
};

export type ScanCue = keyof typeof CLIPS;

const VOLUMES: Record<ScanCue, number> = {
  scan: 0.3,
  pop: 0.55,
  skip: 0.55,
  complete: 0.8,
};

/**
 * Vibration patterns, kept short so a long report doesn't buzz constantly.
 * `scan` repeats every couple of seconds while waiting, so it stays silent on
 * the motor — a 20s buzz would be maddening.
 */
const PATTERNS: Partial<Record<ScanCue, number | number[]>> = {
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
      } catch {
        enabled.current = true;
      }

      if (!enabled.current) return;

      try {
        // Let the cues play even with the iOS ringer switch off — they're
        // feedback on an action the user just took, not media.
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        // Not fatal: the clips can still play under the default audio mode.
        console.warn("[scan] audio mode:", error);
      }

      for (const key of Object.keys(CLIPS) as ScanCue[]) {
        // Each clip loads independently — one failure must not cost the rest.
        try {
          const { sound } = await Audio.Sound.createAsync(CLIPS[key], {
            volume: VOLUMES[key],
          });

          if (!mounted.current) {
            await sound.unloadAsync().catch(() => {});
            return;
          }

          // Register before warming up. The warm-up is an optimisation, and
          // anything it throws must not stop the clip being playable.
          sounds.current[key] = sound;

          try {
            // First playback of a clip is slower than the rest, which would put
            // the opening cue behind its card. One silent pass primes it.
            await sound.setVolumeAsync(0);
            await sound.playAsync();
            await sound.pauseAsync();
            await sound.setPositionAsync(0);
          } catch {
            /* priming is best-effort */
          } finally {
            await sound.setVolumeAsync(VOLUMES[key]).catch(() => {});
          }
        } catch (error) {
          console.warn(`[scan] could not load ${key}:`, error);
        }
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
    const pattern = PATTERNS[cue];
    if (pattern !== undefined) Vibration.vibrate(pattern);

    const sound = sounds.current[cue];
    if (!sound || !enabled.current) return;
    // replayAsync rewinds first, so rapid repeats don't get swallowed.
    sound.replayAsync().catch(() => {});
  }, []);
};
