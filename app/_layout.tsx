import { getToken } from "@/utils/token";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { LogBox } from "react-native";
import Toast from "react-native-toast-message";

LogBox.ignoreLogs([
  'Unsupported top level event type "topSvgLayout" dispatched',
]);
import "../global.css";
import { setLogoutHandler } from "@/utils/api";

// ──────────────────────────────────────────────────────────────
// Suppress the "topSvgLayout" error from react-native-svg@15
// on React Native 0.81 (Fabric / New Architecture).
//
// react-native-svg dispatches a custom "topSvgLayout" event
// that Fabric's event plugin doesn't recognise. The error is
// entirely cosmetic — SVGs render correctly — but it floods
// the console every time any layout change happens near an SVG.
// ──────────────────────────────────────────────────────────────
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout" dispatched']);

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('topSvgLayout')
  ) {
    return; // swallow silently
  }
  // Also catch the Error object variant
  if (
    args[0] instanceof Error &&
    args[0].message?.includes('topSvgLayout')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Patch the global error handler so the red-screen / LogBox
// error dialog never fires for this specific issue.
const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();
if (originalHandler) {
  (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    if (error?.message?.includes('topSvgLayout')) {
      return; // swallow — non-fatal, cosmetic only
    }
    originalHandler(error, isFatal);
  });
}

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
