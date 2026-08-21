import { Audio } from "expo-av";
import { useCallback, useEffect, useRef } from "react";
import { Vibration } from "react-native";

/**
 * Sound + vibration for the timetable scan screen.
 *
 * Deliberately not tied to the `sounds_enabled` flag: that switch is labelled
 * "Play a sound when marking attendance" and belongs to the attendance screen,
 * so honouring it here muted these cues for reasons nobody could see.
 *
 * Call this from a screen that is mounted before the scan starts, so the clips
 * are ready by the time the first cue fires.
 */

const CLIPS = {
  pop: require("@/assets/sounds/scan/pop.wav"),
  skip: require("@/assets/sounds/scan/skip.wav"),
  complete: require("@/assets/sounds/scan/complete.wav"),
};

export type ScanCue = keyof typeof CLIPS;

// Clips are normalised to ~0.9 peak, so these sit close to full scale.
const VOLUMES: Record<ScanCue, number> = {
  pop: 1,
  skip: 1,
  complete: 1,
};

/** Vibration patterns, kept short so a long report doesn't buzz constantly. */
const PATTERNS: Record<ScanCue, number | number[]> = {
  pop: 12,
  skip: [0, 22, 45, 22],
  complete: [0, 30, 55, 30, 55, 60],
};

export const useScanFeedback = () => {
  const sounds = useRef<Partial<Record<ScanCue, Audio.Sound>>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    (async () => {
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
          sounds.current[key] = sound;
        } catch (error) {
          console.warn(`[scan] could not load ${key}:`, error);
        }
      }

      console.log(
        `[scan] cues ready: ${Object.keys(sounds.current).join(", ") || "none"}`,
      );
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

  /** Last resort: load and play the clip on the spot, then throw it away. */
  const playOnDemand = useCallback(async (cue: ScanCue) => {
    try {
      const { sound } = await Audio.Sound.createAsync(CLIPS[cue], {
        volume: VOLUMES[cue],
        shouldPlay: true,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn(`[scan] could not play ${cue}:`, error);
    }
  }, []);

  return useCallback(
    (cue: ScanCue) => {
      Vibration.vibrate(PATTERNS[cue]);

      const sound = sounds.current[cue];

      // Preloading may not have finished yet, so fall back rather than
      // silently dropping the cue.
      if (!sound) {
        playOnDemand(cue);
        return;
      }

      // replayAsync rewinds first, so rapid repeats don't get swallowed.
      sound.replayAsync().catch(() => playOnDemand(cue));
    },
    [playOnDemand],
  );
};
