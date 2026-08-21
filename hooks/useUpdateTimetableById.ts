import { api, timetableApi } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";

export const useUpdateTimetableById = (timetableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      semester,
    }: {
      name: string;
      semester: number;
    }) => {
      const res = await timetableApi.updateTimetable(
        api,
        timetableId,
        name,
        semester,
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable", timetableId] });
      queryClient.invalidateQueries({ queryKey: ["userTimetables"] });

      Toast.show({
        type: "success",
        text1: "Timetable updated successfully",
      });
    },
    onError: (error: any) => {
      let message = "An error occurred while updating the timetable";

      if (isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      Toast.show({
        type: "error",
        text1: "Failed to update timetable",
        text2: message,
        position: "bottom",
      });
    },
  });
};
