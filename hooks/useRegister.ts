import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, userApi } from '@/utils/api'
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosInstance } from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { UserInterface } from '@/types/userTypes';

export interface RegisterPayload extends Pick<UserInterface, 'firstName' | 'lastName' | 'instituteId' | 'rollNo' | 'password'> {
  confirmPassword: string;
}

export const useRegister = () => {
    return useMutation({
        mutationFn: async (data: RegisterPayload) => {
            return userApi.register({ api, ...data });
        },
        onSuccess: async (data) => {
            try {
                await AsyncStorage.setItem("@kgp_presence_just_registered", "true");
            } catch (e) {
                console.error("Failed to set register flag:", e);
            }
            Toast.show({
                type: "success",
                text1: "Registration successful",
                position: "bottom",
            });
            router.replace("/login");
        },
        onError: (error) => {
            let message = "Registration failed";
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.message; // 👈 backend message // fallback
            }

            console.error("Registration failed:", error);

            Toast.show({
                type: "error",
                text1: "Registration Failed",
                text2: message,
                position: "bottom",
            });
        },
    });
}