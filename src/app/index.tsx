import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "@/context/app";
import { Logo } from "@/components/ui";
import { colors } from "@/lib/theme";

export default function IndexScreen() {
  const { loading, profile } = useApp();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const { search, hash } = window.location;
    const isRecoveryLink =
      hash.includes("type=recovery") ||
      new URLSearchParams(search).get("type") === "recovery";

    if (isRecoveryLink) {
      window.location.replace(`/reset-password${search}${hash}`);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Logo />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={profile ? "/(tabs)" : "/sign-in"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    backgroundColor: colors.background,
  },
});
