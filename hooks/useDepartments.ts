import { useQuery } from "@tanstack/react-query";
import { api, departmentApi } from "@/utils/api";

export const useDepartments = () => {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.getDepartments(api),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours, departments don't change often
  });
};
