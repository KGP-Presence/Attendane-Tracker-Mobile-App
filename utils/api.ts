import { RegisterPayload } from "@/hooks/useRegister";
import { RecordInterface } from "@/types/recordTypes";
import { UserInterface } from "@/types/userTypes";
import {
  getRefreshToken,
  getToken,
  removeToken,
  saveToken,
} from "@/utils/token";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosInterceptorManager,
  InternalAxiosRequestConfig,
} from "axios";
import { AppEvent, CreateEventPayload } from "../types/event";
import { CreateSubjectPayload } from "../types/subjectTypes";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// State to handle multiple API calls failing simultaneously due to expired token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Helper to push queued requests through after a successful refresh
const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// ─── Logout Callback ────────────────────────────────────────────────────────
let _logoutHandler: (() => void) | null = null;

export const setLogoutHandler = (handler: () => void) => {
  _logoutHandler = handler;
};

// ─── Shared Logout Logic ────────────────────────────────────────────────────
export const performLogout = async (reason = "session expired") => {
  console.warn(`[AUTH] Logging out: ${reason}`);
  isRefreshing = false;
  failedQueue = [];
  await removeToken();

  if (_logoutHandler) {
    _logoutHandler();
  } else {
    console.error(
      "[AUTH] No logout handler registered. " +
      "Call setLogoutHandler() in your app root to enable auto-redirect to login."
    );
  }
};

export const createApiClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: API_BASE_URL,
  });

  api.interceptors.request.use(
    async (config) => {
      const token = await getToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log(`[AXIOS] ${config.method?.toUpperCase()} → ${config.url}`);

      return config;
    },
    (error) => Promise.reject(error),
  );

  // --- REFRESH TOKEN INTERCEPTOR LOGIC ---
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Only intercept 401 errors on non-refresh endpoints that haven't been retried yet.
      const should401Intercept =
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("refresh-accessToken");

      if (!should401Intercept) {
        return Promise.reject(error);
      }

      // Mark this specific request as retried so we don't loop.
      originalRequest._retry = true;

      // ── If a refresh is already in flight, queue this request ──────────
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // ── Kick off a token refresh ────────────────────────────────────────
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          throw new Error("No refresh token found in storage.");
        }

        console.log("[AUTH] Access token expired. Attempting silent refresh…");

        // Use the base axios instance (bypasses this interceptor) so a 401
        // on the refresh endpoint doesn't cause an infinite loop.
        const response = await axios.post(
          `${API_BASE_URL}/users/refresh-accessToken`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        await saveToken(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        console.log("[AUTH] Token refreshed. Replaying failed requests…");

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        await performLogout("refresh token expired or invalid");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return api;
};

export const api = createApiClient();

export const userApi = {
  login: async (
    api: AxiosInstance,
    instituteId: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await api.post("/users/login", {
      instituteId,
      password,
    });

    // Debug log
    return res.data.data; // ✅ IMPORTANT
  },
  me: async (api: AxiosInstance) => {
    return await api.get("/users/me");
  },
  register: async ({
    api,
    instituteId,
    firstName,
    lastName,
    rollNo,
    password,
    confirmPassword,
  }: RegisterPayload & { api: AxiosInstance }): Promise<{
    user: UserInterface;
  }> => {
    const res = await api.post("/users/register", {
      instituteId,
      firstName,
      lastName,
      rollNo,
      password,
      confirmPassword,
    });

    return res.data.data;
  },
  registerInit: async (api: AxiosInstance, instituteId: string) => {
    return await api.post("/users/register-init", { instituteId });
  },
  verifyOtp: async (api: AxiosInstance, instituteId: string, otp: string) => {
    return await api.post("/users/verify", { instituteId, otp });
  },
  changePassword: async (
    api: AxiosInstance,
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => {
    const res = await api.patch("/users/change-password", {
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    return res.data.data;
  },
  changeForgotPasswordInit: async (api: AxiosInstance, instituteId: string) => {
    return await api.post("/users/change-forgot-password-init", {
      instituteId,
    });
  },
  changeForgotPassword: async (
    api: AxiosInstance,
    instituteId: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => {
    const res = await api.post("/users/change-forgot-password", {
      instituteId,
      newPassword,
      confirmNewPassword,
    });
    return res.data.data;
  },
  logout: async (api: AxiosInstance) => {
    await api.post("/users/logout");
  },
  updateProfile: async (
    api: AxiosInstance,
    data: {
      firstName: string;
      lastName: string;
      rollNo: string;
      graduationYear: number;
      department: string;
    },
  ) => {
    const res = await api.patch("/users", data);
    return res.data.data;
  },
};

export const timetableApi = {
  createTimetable: async (
    api: AxiosInstance,
    name: string,
    semester: string,
  ) => {
    const res = await api.post("/timetable/create", {
      name,
      semester,
    });
    return res.data.data;
  },
  updateTimetable: async (
    api: AxiosInstance,
    timetableId: string,
    name: string,
    semester: number,
  ) => {
    const res = await api.patch(`/timetable/update/${timetableId}`, {
      name,
      semester,
    });
    return res.data.data;
  },
  createTimetableByImage: async (api: AxiosInstance, formData: FormData) => {
    const response = await api.post("/timetable/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.data;
  },
  getUserTimetables: async (api: AxiosInstance) => {
    const res = await api.get("/timetable/user");
    return res.data.data;
  },
  getTimetableById: async (api: AxiosInstance, id: string) => {
    const res = await api.get(`/timetable/${id}`);
    return res.data.data;
  },
  getSubjectsByTimetableId: async (api: AxiosInstance, id: string) => {
    const res = await api.get(`/timetable/subjects/${id}`);
    return res.data.data;
  },
  AddSubjectsToTimetable: async (
    api: AxiosInstance,
    timetableId: string,
    subjectIds: string[],
  ) => {
    const res = await api.post(`/timetable/addSubjects/${timetableId}`, {
      subjectIds,
    });
    return res.data.data;
  },
  removeSubjectsFromTimetable: async (
    api: AxiosInstance,
    timetableId: string,
    subjectIds: string[],
  ) => {
    const res = await api.post(`/timetable/removeSubjects/${timetableId}`, {
      subjectIds,
    });
    return res.data.data;
  },
  deleteTimetable: async (api: AxiosInstance, timetableId: string) => {
    const res = await api.delete(`/timetable/delete/${timetableId}`);
    return res.data.data;
  },
  getAllTimetablesOfUser: async (api: AxiosInstance) => {
    const res = await api.get(`/timetable/user`);
    return res.data.data;
  },
};

export const attendanceApi = {
  getAttendanceForDateByTimetable: async (
    api: AxiosInstance,
    timetableId: string,
    date: string,
  ) => {
    const res = await api.get(
      `/attendance/timetable/${timetableId}/date/${date}`,
    );
    return res.data.data;
  },
  createAttendance: async (
    api: AxiosInstance,
    subjectId: string,
    day: string,
    type: string,
    timeSlot: string,
    date: string,
    semester: number,
  ) => {
    const res = await api.post("/attendance", {
      subjectId,
      day,
      type,
      timeSlot,
      date,
      semester,
    });
    return res.data.data;
  },
  editAttendanceStatus: async (
    api: AxiosInstance,
    attendanceId: string,
    type: string,
  ) => {
    const res = await api.patch(`/attendance/${attendanceId}`, {
      type: type,
    });
    return res.data.data;
  },
  getAttendanceBySubject: async (
    api: AxiosInstance,
    subjectId: string,
    semester: number,
  ) => {
    const res = await api.get(
      `/attendance/subject/${subjectId}/semester/${semester}`,
    );
    return res.data.data;
  },
};

// inside your api file (e.g., subjectApi.ts)

export const subjectApi = {
  getAllSubjects: async (api: AxiosInstance) => {
    const res = await api.get("/subjects/");
    return res.data.data;
  },
  createSubject: async (api: AxiosInstance, payload: CreateSubjectPayload) => {
    const res = await api.post("/subjects/", payload);
    return res.data.data;
  },
  getSubjectByCode: async (api: AxiosInstance, code: string) => {
    // Calls the backend endpoint: GET /subjects/:code
    const res = await api.get(`/subjects/details/${code}`);
    return res.data.data;
  },
  getSubjectsBySemester: async (api: AxiosInstance, semester: number) => {
    const res = await api.get(`/subjects/semester/${semester}`);
    return res.data.data;
  },
  getSubjectsByTimetableId: async (api: AxiosInstance, id: string) => {
    const res = await api.get(`/subjects/timetable/${id}`);
    return res.data.data;
  },
  getSubjectById: async (api: AxiosInstance, id: string) => {
    const res = await api.get(`/subjects/${id}`);
    return res.data.data;
  },
  deleteSubject: async (api: AxiosInstance, id: string) => {
    const res = await api.delete(`/subjects/${id}`);
    return res.data.data;
  },
  updateSubject: async (
    api: AxiosInstance,
    id: string,
    payload: Partial<CreateSubjectPayload>, // Using Partial since updates might not require all fields
  ) => {
    const res = await api.patch(`/subjects/${id}`, payload);
    return res.data.data;
  },
  getSubjectsNotInTimetable: async (
    api: AxiosInstance,
    timetableId: string,
  ) => {
    const res = await api.get(`/subjects/notInTimetable/${timetableId}`);
    return res.data.data;
  },
};

export const recordApi = {
  createRecord: async (
    api: AxiosInstance,
    data: Omit<RecordInterface, "_id">,
  ) => {
    const res = await api.post("/records/", data);
    return res.data.data;
  },
  updateRecord: async (
    api: AxiosInstance,
    data: Omit<RecordInterface, "_id">,
    recordId: string,
  ) => {
    const res = await api.patch(`/records/${recordId}`, data);
    return res.data.data;
  },
  deleteRecord: async (api: AxiosInstance, recordId: string) => {
    const res = await api.delete(`/records/${recordId}`);
    return res.data.data;
  },
  getAllRecordsBySubjectAndSemester: async (
    api: AxiosInstance,
    subjectId: string,
    semester: number,
  ) => {
    const res = await api.get(
      `/records/subject/${subjectId}/semester/${semester}`,
    );
    return res.data.data;
  },
};

export const dashboardApi = {
  getAttendanceStats: async (api: AxiosInstance) => {
    const res = await api.get("/dashboard/stats/attendance");
    return res.data.data;
  },
  getDashBoardInit : async ( api: AxiosInstance) =>{
    const res = await api.get("/dashboard/init");
    return res.data.data;
  },
  getAttendanceStatsBySemester: async (
    api: AxiosInstance,
    semester: number,
  ) => {
    try {
      const res = await api.get(
        `/dashboard/stats/attendance/semester/${semester}`,
      );
      return res.data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getUpcomingClasses: async (api: AxiosInstance) => {
    const res = await api.get("/dashboard/upcoming/classes");
    return res.data.data;
  },
};

export const detailsApi = {
  getAttendanceStatBySemester: async (api: AxiosInstance, semester: number) => {
    const res = await api.get(`/details/attendance/semester/${semester}`);
    return res.data.data;
  },
  getAttendanceStatOfAllSubjects: async (
    api: AxiosInstance,
    semester: number,
  ) => {
    const res = await api.get(
      `/details/attendance/subjects/semester/${semester}`,
    );
    return res.data.data;
  },
  getAttendanceStatOfAllTimetables: async (
    api: AxiosInstance,
    semester: number,
  ) => {
    const res = await api.get(
      `/details/attendance/timetables/semester/${semester}`,
    );
    return res.data.data;
  },
  getAttendanceStatByTimetable: async (
    api: AxiosInstance,
    timetableId: string,
  ) => {
    const res = await api.get(`/details/attendance/timetable/${timetableId}`);
    return res.data.data;
  },
};

export const eventApi = {
  getAllEvents: async (api: AxiosInstance) => {
    const res = await api.get("/events/");
    return res.data.data;
  },
  createEvent: async (api: AxiosInstance, payload: CreateEventPayload) => {
    const res = await api.post("/events", payload);
    return res.data.data;
  },
  createEventFromAudio: async (api: AxiosInstance, formData: FormData) => {
    const res = await api.post("/events/audio", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.data;
  },
  toggleEventReminders: async (
    api: AxiosInstance,
    eventId: string,
    notificationIds: string[],
  ) => {
    const res = await api.patch(`/events/${eventId}/reminders`, {
      notificationIds,
    });
    return res.data;
  },
  updateEvent: async (
    api: AxiosInstance,
    eventId: string,
    updates: Partial<AppEvent>,
  ) => {
    const res = await api.patch(`/events/${eventId}`, updates);

    return res.data.data;
  },
  deleteEvent: async (api: AxiosInstance, eventId: string) => {
    const res = await api.delete(`/events/${eventId}`);
    return res.data;
  },
  deleteMultipleEvents: async (api: AxiosInstance, ids: string[]) => {
    const res = await api.delete("/events", {
      data: { ids },
    });
    return res.data;
  },
};
