import { api, dashboardApi } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";

export const useGetDashboardInit = () => {
  return useQuery({
    queryKey: ["dashboard", "init"],
    queryFn: async () => {
      // 1. Call your API function correctly
      const dashboardData = await dashboardApi.getDashBoardInit(api);

      return dashboardData;
    },
    // Prevent this route from automatically refetching in the background.
    // It will only run on mount or when we explicitly call refetch() (like Pull-to-Refresh)
    staleTime: Infinity, 
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// export const useGetAttendanceStats = () => {
//   return useQuery({
//     queryKey: ["attendanceStats"],
//     queryFn: async () => {
//       return dashboardApi.getAttendanceStats(api);
//     },
//   });
// };

    
export const useGetAttendanceStatsBySemester = (semester: number) => {
  return useQuery({
    queryKey: ["attendanceStats", "semester", semester],
    queryFn: async () => {
      return dashboardApi.getAttendanceStatsBySemester(api, semester);
    },
    enabled: !!semester,
  });
};

export const useGetUpcomingClassesBySemester = (semester: number) => {
  return useQuery({
    queryKey: ["upcomingClasses", "semester", semester],
    queryFn: async () => {
      return dashboardApi.getUpcomingClassesBySemester(api, semester);
    },
    enabled: !!semester,
  });
};

// export const useGetUpcomingClasses = () => {
//   return useQuery({
//     queryKey: ["userUpcomingClasses"],
//     queryFn: async () => {
//       return dashboardApi.getUpcomingClasses(api);
//     },
//   });
// };
