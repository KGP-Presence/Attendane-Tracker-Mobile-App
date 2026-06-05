import { getToken } from "@/utils/token";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import "../global.css";
import { setLogoutHandler } from "@/utils/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // was 3 by default — cuts retry delay dramatically
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLogoutHandler(() => {
      queryClient.clear();
      router.replace("/(auth)/login");
    });

    // Pre-loads token into memory cache before any query fires
    getToken().finally(() => setReady(true));
  }, []);

  if (!ready) return null; // or a bare splash, renders in <100ms
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Index",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{
            title: "Login",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/register-init"
          options={{
            title: "Register Init",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{
            title: "Register Main",
            headerShown: false,
          }}
        />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/forgotPassword"
          options={{ headerShown: false }}
        />
      </Stack>
      <Toast />
    </PersistQueryClientProvider>
  );
}
