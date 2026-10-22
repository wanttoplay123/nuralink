import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { colors, spacing } from "@/lib/theme";
import type { Conversation } from "@/types";

export default function MessagesScreen() {
  const { profile, api } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      setConversations(await api.getMyConversations());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  if (!profile) return null;
  if (profile.role === "admin") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        eyebrow="COMUNICACIÓN"
        title="Conversaciones"
        subtitle="Coordina los detalles de los turnos aceptados."
      />

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      {loading && conversations.length === 0 ? (
        <LoadingBlock label="Cargando conversaciones..." />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Aún no tienes conversaciones"
          description="El chat se abre cuando una institución acepta una postulación. Mientras tanto, explora los turnos disponibles."
          action={
            <Button
              label="Explorar turnos"
              variant="secondary"
              icon="calendar-outline"
              onPress={() => router.push("/(tabs)/shifts")}
            />
          }
        />
      ) : (
        conversations.map((conversation) => {
          const peerName =
            profile.role === "nurse"
              ? conversation.institution?.name
              : conversation.nurse?.full_name;
          const lastMessage = conversation.last_message;
          const preview = lastMessage
            ? `${lastMessage.sender_id === profile.id ? "Tú: " : ""}${
                lastMessage.body
              }`
            : "Sin mensajes todavía. Escribe el primero.";

          return (
            <Card
              key={conversation.id}
              onPress={() => router.push(`/chat/${conversation.id}`)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Avatar name={peerName || "NURSELINK"} size={44} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {peerName || "Conversación"}
                  </Text>
                  <Text style={styles.cardShift} numberOfLines={1}>
                    {conversation.shift?.title ?? "Turno"}
                  </Text>
                </View>
                <View style={styles.cardMeta}>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color={colors.textSoft}
                  />
                  {lastMessage ? (
                    <Text style={styles.cardTime}>
                      {formatRelative(lastMessage.created_at)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.previewRow}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text style={styles.preview} numberOfLines={2}>
                  {preview}
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.15,
  },
  cardShift: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  cardMeta: { alignItems: "flex-end", gap: 4 },
  cardTime: { fontSize: 9, color: colors.textSoft },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  preview: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16.5,
  },
});
