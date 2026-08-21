import { api, timetableApi } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

export const useDeleteTimetable = (timetableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return timetableApi.deleteTimetable(api, timetableId);
    },
    onSuccess: (data) => {
      console.log("Timetable deleted successfully:", data);
      Toast.show({
        type: "success",
        text1: "Timetable Deleted",
        position: "bottom",
      });
      queryClient.invalidateQueries({
        queryKey: ["userTimetables"],
      });
      router.replace("/timetable");
    },
    onError: (error) => {
      let message = "Timetable Deletion failed";

      if(isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      }
      
      Toast.show({
        type: "error",
        text1: "Timetable Deletion Failed",
        text2: message,
        position: "bottom",
      });
    },
  });
};
