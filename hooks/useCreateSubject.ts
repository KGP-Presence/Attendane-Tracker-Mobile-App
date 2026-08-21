import { api, subjectApi } from '@/utils/api';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { CreateSubjectPayload } from "../types/subjectTypes";

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubjectPayload) => {
      // Pass both the axios instance and the form data
      console.log(data);
      return subjectApi.createSubject(api, data);
    },
    onSuccess: async (data) => {
      // 🔄 Invalidate 'subjects' cache so the UI updates automatically
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });

      Toast.show({
        type: "success",
        text1: "Subject created successfully",
        text2: `${data.name} has been added to your list.`,
        position: "bottom",
      });

      // if (router.canGoBack()) {
      //   router.back();
      // }
    },
    onError: (error) => {
      let message = "Failed to create subject";

      if (axios.isAxiosError(error)) {
        // Extract the custom error message from your ApiError class on the backend
        message = error.response?.data?.message || error.message;

        // A duplicate code isn't a real failure: the backend hands back the
        // subject the student already owns and the caller reuses it.
        if (error.response?.status === 409) {
          Toast.show({
            type: "info",
            text1: "Subject already exists",
            text2: "Using the one already in your list.",
            position: "bottom",
          });
          return;
        }
      }

      console.log("Subject creation error:", error);

      Toast.show({
        type: "error",
        text1: "Creation Failed",
        text2: message,
        position: "bottom",
      });
    },
  });
};