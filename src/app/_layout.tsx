import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "@/context/app";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="shift/[id]"
            options={{
              headerShown: true,
              title: "Detalle del turno",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: "800" },
            }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerShown: true,
              title: "Chat",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: "800" },
              headerBackTitle: "Atrás",
            }}
          />
          <Stack.Screen
            name="reset-password"
            options={{
              headerShown: true,
              title: "Restablecer contraseña",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: "800" },
            }}
          />
          <Stack.Screen
            name="terms"
            options={{
              headerShown: true,
              title: "Términos y condiciones",
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: "800" },
            }}
          />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
