import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import { Logo } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { loading, profile, api } = useApp();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!api || profile?.role === "admin") {
      setUnread(0);
      return;
    }
    try {
      setUnread(await api.getUnreadMessageCount());
    } catch {
      setUnread(0);
    }
  }, [api, profile]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnread();
    }, [refreshUnread])
  );

  useEffect(() => {
    const client = supabase;
    if (!profile || !client) return;
    const channel = client
      .channel(`unread:${profile.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void refreshUnread()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [profile, refreshUnread]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Logo />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/sign-in" />;
  }

  const isNurse = profile.role === "nurse";
  const isInstitution = profile.role === "institution";
  const isAdmin = profile.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          height: 74,
          paddingTop: 7,
          paddingBottom: 9,
          width: "100%",
          maxWidth: 820,
          alignSelf: "center",
          shadowColor: "#092D2B",
          shadowOpacity: 0.07,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.05,
          marginTop: 1,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: "Turnos",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "calendar" : "calendar-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Postulaciones",
          href: isNurse ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "document-text" : "document-text-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mensajes",
          href: isNurse || isInstitution ? undefined : null,
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: colors.white,
            fontSize: 9,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="institution"
        options={{
          title: "Institución",
          href: isInstitution ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "business" : "business-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person-circle" : "person-circle-outline"}
              color={typeof color === "string" ? color : colors.primaryDark}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: colors.background,
  },
  tabIcon: {
    width: 38,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: { backgroundColor: colors.primarySoft },
});
