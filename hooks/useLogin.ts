import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, userApi } from "@/utils/api";
import { saveToken } from "@/utils/token";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({
      instituteId,
      password,
    }: {
      instituteId: string;
      password: string;
    }) => {
      return userApi.login(api, instituteId, password);
    },

    onSuccess: async (data) => {
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;

      await saveToken(accessToken, refreshToken);
      console.log("JWT and Refresh Token saved successfully");

      try {
        const justRegistered = await AsyncStorage.getItem("@kgp_presence_just_registered");
        if (justRegistered === "true") {
          await AsyncStorage.removeItem("@kgp_presence_just_registered");
        } else {
          // If they just logged in without registering on this device, skip copilots
          const keys = [
            "@kgp_presence_dashboard_copilot_done",
            "@kgp_presence_timetable_copilot_done",
            "@kgp_presence_subject_copilot_done",
            "@kgp_presence_event_copilot_done",
            "@kgp_presence_details_copilot_done",
            "@kgp_presence_tabbar_copilot_done"
          ];
          await Promise.all(keys.map(key => AsyncStorage.setItem(key, "done")));
        }
      } catch (e) {
        console.error("Failed to handle copilot keys during login:", e);
      }

      Toast.show({
        type: "success",
        text1: "Login Successful",
        position: "bottom",
      });
      router.replace("/dashboard");
    },

    onError: (error) => {
      let title = "Login Failed";
      let message = "Something went wrong. Please try again.";

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const backendMessage: string =
          error.response?.data?.message || error.message;

        if (
          status === 401 ||
          backendMessage.toLowerCase().includes("wrong") ||
          backendMessage.toLowerCase().includes("credential")
        ) {
          title = "Incorrect Password";
          message = "The password you entered is incorrect. Please try again.";
        } else if (
          status === 404 ||
          backendMessage.toLowerCase().includes("not registered") ||
          backendMessage.toLowerCase().includes("not found")
        ) {
          title = "Account Not Found";
          message = "No account found with this institute email ID.";
        } else if (status === 400) {
          title = "Missing Fields";
          message = backendMessage;
        } else {
          message = backendMessage;
        }
      }

      console.error("Login failed:", error);

      Toast.show({
        type: "error",
        text1: title,
        text2: message,
        position: "bottom",
      });
    },
  });
};
