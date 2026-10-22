import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/context/app";
import { Button, LoadingBlock, Notice } from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatRelative, formatTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import type { Conversation, Message } from "@/types";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { api, profile } = useApp();
  const listRef = useRef<FlatList<Message>>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!conversationId) {
        setLoading(false);
        return;
      }
      if (!api) return;
      if (!silent) setLoading(true);
      try {
        const [nextConversation, nextMessages] = await Promise.all([
          api.getConversation(conversationId),
          api.getConversationMessages(conversationId),
        ]);
        setConversation(nextConversation);
        setMessages(nextMessages);
        setError("");
        if (!silent) {
          void api.markConversationRead(conversationId).catch(() => {});
        }
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api, conversationId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    const client = supabase;
    if (!conversationId || !client) return;
    const channel = client
      .channel(`messages:${conversationId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [...current, incoming]
          );
          requestAnimationFrame(() =>
            listRef.current?.scrollToEnd({ animated: true })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((current) =>
            current.map((item) =>
              item.id === updated.id
                ? { ...item, read_at: updated.read_at }
                : item
            )
          );
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [conversationId]);

  const send = async () => {
    if (!api || !conversationId || sending || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      const message = await api.sendMessage(conversationId, text);
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message]
      );
      setText("");
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true })
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const peerName =
    profile?.role === "nurse"
      ? conversation?.institution?.name
      : conversation?.nurse?.full_name;

  if (loading && !conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <LoadingBlock label="Cargando conversación..." />
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <View style={styles.notFound}>
          <Notice tone="danger" icon="alert-circle-outline">
            {error || "No encontramos esta conversación."}
          </Notice>
          <Button
            label="Volver"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          title: peerName ?? "Chat",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={22} color={colors.navy} />
              <Text style={styles.headerBackText}>Volver</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.chatNavBanner}>
        <Pressable
          style={styles.chatNavAction}
          onPress={() => router.navigate("/(tabs)/messages")}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
          <Text style={styles.chatNavActionText}>Bandeja</Text>
        </Pressable>
        {conversation?.shift ? (
          <Pressable
            style={styles.chatNavAction}
            onPress={() => router.push(`/shift/${conversation.shift?.id}`)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.chatNavActionText}>Detalles turno</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.chatNavAction}
          onPress={() => router.navigate("/(tabs)")}
        >
          <Ionicons name="home-outline" size={16} color={colors.primary} />
          <Text style={styles.chatNavActionText}>Inicio</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListHeaderComponent={
            <View style={styles.context}>
              <View style={styles.contextIcon}>
                <Ionicons
                  name={
                    profile?.role === "nurse"
                      ? "business-outline"
                      : "person-outline"
                  }
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.contextText}>
                <Text style={styles.contextName}>
                  {peerName ?? "Conversación NURSELINK"}
                </Text>
                <Text style={styles.contextShift}>
                  {conversation.shift
                    ? `${formatDate(conversation.shift.starts_at)} · ${formatTime(
                        conversation.shift.starts_at
                      )} – ${formatTime(conversation.shift.ends_at)}`
                    : "Turno aceptado"}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbubbles-outline"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.emptyTitle}>Conversación abierta</Text>
              <Text style={styles.emptyText}>
                Escribe el primer mensaje para coordinar los detalles del turno.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            return (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                <Text
                  style={[styles.message, mine ? styles.messageMine : null]}
                >
                  {item.body}
                </Text>
                <View style={styles.bubbleFooter}>
                  <Text style={[styles.time, mine ? styles.timeMine : null]}>
                    {formatRelative(item.created_at)}
                  </Text>
                  {mine ? (
                    <View style={styles.receiptRow}>
                      <Ionicons
                        name={item.read_at ? "checkmark-done" : "checkmark"}
                        size={13}
                        color={
                          item.read_at
                            ? "#A7F0E2"
                            : "rgba(255,255,255,0.75)"
                        }
                      />
                      <Text
                        style={[
                          styles.receiptText,
                          !item.read_at && styles.receiptTextMuted,
                        ]}
                      >
                        {item.read_at ? "Visto" : "Enviado"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {error ? (
          <Text style={styles.error} numberOfLines={2}>
            {error}
          </Text>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            maxLength={4000}
            returnKeyType="send"
            onSubmitEditing={() => void send()}
            blurOnSubmit={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            onPress={() => void send()}
            disabled={sending || !text.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              (sending || !text.trim()) && styles.sendButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  notFound: { padding: spacing.xl, gap: spacing.md },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contextText: { flex: 1 },
  contextName: { fontSize: 13, fontWeight: "800", color: colors.navy },
  contextShift: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.navy },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },
  message: { fontSize: 13, lineHeight: 19, color: colors.text },
  messageMine: { color: colors.white },
  time: { fontSize: 9, color: colors.textSoft },
  timeMine: { color: "rgba(255,255,255,0.72)" },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  receiptRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  receiptText: { fontSize: 9, color: "#A7F0E2", fontWeight: "700" },
  receiptTextMuted: { color: "rgba(255,255,255,0.75)" },
  error: {
    color: colors.danger,
    fontSize: 11,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: { opacity: 0.45 },
  headerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  chatNavBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  chatNavAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  chatNavActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
