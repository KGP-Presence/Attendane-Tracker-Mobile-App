import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

const APP_VERSION = Constants.expoConfig?.version ?? "unknown";
const PLATFORM = Platform.OS;

/**
 * Google Forms programmatic submission.
 *
 * How it works:
 * 1. Create a Google Form at https://forms.google.com
 * 2. Inspect the form to find entry IDs (entry.XXXXXXXXXX)
 * 3. POST to https://docs.google.com/forms/d/e/FORM_ID/formResponse
 * 4. Responses auto-log to a linked Google Sheet
 *
 * Truly free & unlimited — no API key, no vendor lock-in.
 * Users never see the Google Form — it's a blind POST from the native modal.
 */

// These come from .env
const FEEDBACK_FORM_URL =
  process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL ?? "";
const BUG_REPORT_FORM_URL =
  process.env.EXPO_PUBLIC_BUG_REPORT_FORM_URL ?? "";

// Entry IDs from your Google Forms (found from the pre-filled URLs)
const FEEDBACK_ENTRIES = {
  rating: process.env.EXPO_PUBLIC_FEEDBACK_ENTRY_RATING ?? "entry.0",
  feedback: process.env.EXPO_PUBLIC_FEEDBACK_ENTRY_TEXT ?? "entry.1",
  appVersion: process.env.EXPO_PUBLIC_FEEDBACK_ENTRY_VERSION ?? "entry.2",
  platform: process.env.EXPO_PUBLIC_FEEDBACK_ENTRY_PLATFORM ?? "entry.3",
};

const BUG_ENTRIES = {
  description:
    process.env.EXPO_PUBLIC_BUG_ENTRY_DESCRIPTION ?? "entry.0",
  appVersion: process.env.EXPO_PUBLIC_BUG_ENTRY_VERSION ?? "entry.1",
  platform: process.env.EXPO_PUBLIC_BUG_ENTRY_PLATFORM ?? "entry.2",
};

interface FeedbackPayload {
  rating: string; // emoji character or "none"
  feedback: string;
}

interface BugReportPayload {
  description: string;
  screenshotUri?: string | null;
}

/**
 * Submit feedback to Google Forms.
 * The POST goes directly to the formResponse endpoint.
 */
export const submitFeedback = async (
  payload: FeedbackPayload
): Promise<void> => {
  if (!FEEDBACK_FORM_URL) {
    console.warn("[FEEDBACK] No form URL configured. Skipping submission.");
    return;
  }

  const formData = new FormData();
  formData.append(FEEDBACK_ENTRIES.rating, payload.rating);
  formData.append(FEEDBACK_ENTRIES.feedback, payload.feedback);
  formData.append(FEEDBACK_ENTRIES.appVersion, APP_VERSION);
  formData.append(FEEDBACK_ENTRIES.platform, PLATFORM);

  try {
    await axios.post(FEEDBACK_FORM_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      validateStatus: (status) => status < 500,
    });
  } catch (error) {
    console.error("[FEEDBACK] Submission failed:", error);
    throw error;
  }
};

/**
 * Submit bug report to Google Forms.
 */
export const submitBugReport = async (
  payload: BugReportPayload
): Promise<void> => {
  if (!BUG_REPORT_FORM_URL) {
    console.warn("[BUG REPORT] No form URL configured. Skipping submission.");
    return;
  }

  let descriptionWithMeta = payload.description;
  if (payload.screenshotUri) {
    descriptionWithMeta += `\n\n[Screenshot attached - URI: ${payload.screenshotUri}]`;
  }

  const formData = new FormData();
  formData.append(BUG_ENTRIES.description, descriptionWithMeta);
  formData.append(BUG_ENTRIES.appVersion, APP_VERSION);
  formData.append(BUG_ENTRIES.platform, PLATFORM);

  try {
    await axios.post(BUG_REPORT_FORM_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      validateStatus: (status) => status < 500,
    });
  } catch (error) {
    console.error("[BUG REPORT] Submission failed:", error);
    throw error;
  }
};
