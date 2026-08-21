import { api, timetableApi } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { TimetableScanResponse } from "@/types/timetableScan";

export const useCreateTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      semester,
    }: {
      name: string;
      semester: string;
    }) => {
      return timetableApi.createTimetable(api, name, semester);
    },
    onSuccess: (data) => {
      console.log("Timetable created successfully:", data);
      Toast.show({
        type: "success",
        text1: "Timetable Created",
        position: "bottom",
      });
      queryClient.invalidateQueries({
        queryKey: ["userTimetables"],
      });
      router.replace(`/timetable/addSubjectToTimetable/${data._id}`);
    },
    onError: (error) => {
      let message = "Timetable Creation failed";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message; // 👈 backend message // fallback
      }

      console.error("Timetable Creation failed:", error);

      Toast.show({
        type: "error",
        text1: "Timetable Creation Failed",
        text2: message,
        position: "bottom",
      });
    },
  });
};

/**
 * Uploads the timetable image. Navigation and messaging are deliberately left
 * to the screen so it can play the per-subject progress report first.
 */
export const useCreateTimetableByImage = () => {
  const queryClient = useQueryClient();

  return useMutation<TimetableScanResponse, unknown, FormData>({
    mutationFn: async (formData: FormData) => {
      return timetableApi.createTimetableByImage(api, formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });

      const timetableId = data?.timetable?._id;
      if (timetableId) {
        queryClient.invalidateQueries({
          queryKey: ["timetable", timetableId, "subjects"],
        });
      }
    },
    onError: (error) => {
      console.error("Timetable Creation failed:", error);
    },
  });
};

export const getUploadErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return "Timetable creation failed";
};
