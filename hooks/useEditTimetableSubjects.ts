import {useMutation, useQueryClient} from "@tanstack/react-query";
import { api, timetableApi } from "@/utils/api";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { router } from "expo-router";

export const useAddSubjectsToTimetable = (timetableId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (subjectIds: string[]) => {
            return timetableApi.AddSubjectsToTimetable(api, timetableId, subjectIds);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId, 'subjects'],
            });
            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId, 'subjects', 'notInTimetable'],
            });
            queryClient.invalidateQueries({
                queryKey: ['subjects', 'semester'],
            });

            const skipped = data?.skipped ?? [];

            Toast.show({
                type: skipped.length ? "info" : "success",
                text1: skipped.length
                    ? `${data?.added?.length ?? 0} added, ${skipped.length} skipped`
                    : "Subjects added to timetable successfully",
                text2: skipped.length
                    ? `Slot clash: ${skipped.map((s: any) => s.code).join(", ")}`
                    : undefined,
            });
            router.replace(`/timetable/editTimetable/${timetableId}`);
        },
        onError: (error) => {

            let message = "Failed to add subjects to timetable";

            if(isAxiosError(error)) {
                message = error.response?.data?.message || error.message;
            }

            console.error("Failed to add subjects to timetable:", error);

            Toast.show({
                type: "error",
                text1: "Failed to add subjects to timetable",
                text2: message,
            });
        }

    });

}

export const useRemoveSubjectsFromTimetable = (timetableId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (subjectIds: string[]) => {
            return timetableApi.removeSubjectsFromTimetable(api, timetableId, subjectIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId],
            });
            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId, 'subjects', 'notInTimetable'],
            });
            Toast.show({
                type: "success",
                text1: "Subjects removed from timetable successfully",
            });
        },
        onError: (error) => {
            let message = "Failed to remove subjects from timetable";

            if(isAxiosError(error)) {
                message = error.response?.data?.message || error.message;
            }

            console.error("Failed to remove subjects from timetable:", error);

            Toast.show({
                type: "error",
                text1: "Failed to remove subjects from timetable",
                text2: message,
            });
        }
    });
}

export const useRemoveSubjectsFromTimetables = () => {
    const queryClient = useQueryClient();

    return useMutation({
        // The mutation function now accepts the ID as part of the payload
        mutationFn: async ({ timetableId, subjectIds }: { timetableId: string, subjectIds: string[] }) => {
            return timetableApi.removeSubjectsFromTimetable(api, timetableId, subjectIds);
        },
        onSuccess: (_, variables) => {
            // We get the timetableId from the variables passed to the mutation
            const { timetableId } = variables;

            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId],
            });
            queryClient.invalidateQueries({
                queryKey: ['timetable', timetableId, 'subjects', 'notInTimetable'],
            });
            Toast.show({
                type: "success",
                text1: "Subjects removed from timetable successfully",
            });
        },
        onError: (error) => {
            let message = "Failed to remove subjects from timetable";

            if (isAxiosError(error)) {
                message = error.response?.data?.message || error.message;
            }

            console.error("Failed to remove subjects from timetable:", error);

            Toast.show({
                type: "error",
                text1: "Failed to remove subjects from timetable",
                text2: message,
            });
        }
    });
}