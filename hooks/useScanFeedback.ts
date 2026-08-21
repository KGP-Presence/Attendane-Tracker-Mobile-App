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

/** Continuous sweep played under the scanning phase, not a one-shot. */
const AMBIENT = require("@/assets/sounds/scan/scanloop.wav");
const AMBIENT_VOLUME = 0.45;

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

export type ScanFeedback = {
  /** Fire a one-shot cue. */
  cue: (cue: ScanCue) => void;
  /** Start or stop the continuous scanning sweep. */
  setAmbient: (on: boolean) => void;
};

export const useScanFeedback = (): ScanFeedback => {
  const sounds = useRef<Partial<Record<ScanCue, Audio.Sound>>>({});
  const ambient = useRef<Audio.Sound | null>(null);
  const ambientWanted = useRef(false);
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

      try {
        const { sound } = await Audio.Sound.createAsync(AMBIENT, {
          volume: AMBIENT_VOLUME,
          isLooping: true,
        });
        if (!mounted.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        ambient.current = sound;
        // The scan may already have started while this was loading.
        if (ambientWanted.current) await sound.playAsync();
      } catch (error) {
        console.warn("[scan] could not load ambient:", error);
      }

      console.log(
        `[scan] cues ready: ${Object.keys(sounds.current).join(", ") || "none"}` +
          `${ambient.current ? " + ambient" : " (no ambient)"}`,
      );
    })();

    return () => {
      mounted.current = false;
      ambientWanted.current = false;

      const loaded = sounds.current;
      sounds.current = {};
      Object.values(loaded).forEach((sound) => {
        sound?.unloadAsync().catch(() => {});
      });

      const loop = ambient.current;
      ambient.current = null;
      loop?.unloadAsync().catch(() => {});
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

  const cue = useCallback(
    (which: ScanCue) => {
      Vibration.vibrate(PATTERNS[which]);

      const sound = sounds.current[which];

      // Preloading may not have finished yet, so fall back rather than
      // silently dropping the cue.
      if (!sound) {
        playOnDemand(which);
        return;
      }

      // replayAsync rewinds first, so rapid repeats don't get swallowed.
      sound.replayAsync().catch(() => playOnDemand(which));
    },
    [playOnDemand],
  );

  const setAmbient = useCallback((on: boolean) => {
    ambientWanted.current = on;

    const loop = ambient.current;
    if (!loop) return; // still loading; the loader will start it if wanted

    if (on) loop.playAsync().catch(() => {});
    else loop.stopAsync().catch(() => {});
  }, []);

  return { cue, setAmbient };
};
