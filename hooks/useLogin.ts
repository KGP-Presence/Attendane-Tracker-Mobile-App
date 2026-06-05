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
