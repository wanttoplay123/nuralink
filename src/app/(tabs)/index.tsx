import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/context/app";
import {
  Avatar,
  Button,
  Card,
  Divider,
  LoadingBlock,
  Notice,
  Screen,
  SectionTitle,
  VerificationBadge,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative, roleLabel } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import type {
  AdminData,
  Application,
  Institution,
  Notification,
  NurseCredentials,
  Shift,
} from "@/types";

export default function HomeScreen() {
  const { profile, api } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [credentials, setCredentials] = useState<NurseCredentials | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [institutionShifts, setInstitutionShifts] = useState<Shift[]>([]);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!profile || !api) return;
    setError("");
    try {
      const tasks: Promise<unknown>[] = [
        api.getNotifications().then(setNotifications),
      ];

      if (profile.role === "nurse") {
        tasks.push(api.getCredentials().then(setCredentials));
        tasks.push(api.getMyApplications().then(setApplications));
      }

      if (profile.role === "institution") {
        tasks.push(
          api.getMyInstitution().then(async (nextInstitution) => {
            setInstitution(nextInstitution);
            if (nextInstitution) {
              const shifts = await api.getInstitutionShifts(nextInstitution.id);
              setInstitutionShifts(shifts);
            }
          })
        );
      }

      if (profile.role === "admin") {
        tasks.push(api.getAdminData().then(setAdminData));
      }

      await Promise.all(tasks);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [api, profile]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  useEffect(() => {
    const client = supabase;
    if (!profile || !client) return;
    const channel = client
      .channel(`notifications:${profile.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [incoming, ...current]
          );
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [profile]);

  if (!profile) return null;

  const unread = notifications.filter((notification) => !notification.read_at);
  const openApplications = applications.filter((application) =>
    ["pending", "reviewing"].includes(application.status)
  );
  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted"
  );
  const openShifts = institutionShifts.filter(
    (shift) => shift.status === "open"
  );
  const pendingInstitutions =
    adminData?.institutions.filter(
      (item) => item.verification_status === "pending"
    ).length ?? 0;
  const pendingCredentials =
    adminData?.credentials.filter(
      (item) => item.verification_status === "pending"
    ).length ?? 0;

  const hero = heroContent(profile.role, {
    openApplications: openApplications.length,
    openShifts: openShifts.length,
    pending: pendingInstitutions + pendingCredentials,
  });

  const stats = statContent(profile.role, {
    openApplications: openApplications.length,
    accepted: acceptedApplications.length,
    openShifts: openShifts.length,
    published: institutionShifts.length,
    pendingInstitutions,
    pendingCredentials,
    unread: unread.length,
  });

  const markRead = async (notification: Notification) => {
    if (notification.read_at || !api) return;
    try {
      await api.markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch {
      // No bloqueamos la pantalla por una notificación.
    }
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.hello}>Hola, {firstName(profile.full_name)}</Text>
          <Text style={styles.role}>{roleLabel(profile.role)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Avatar name={profile.full_name || "NURSELINK"} size={46} />
        </View>
      </View>

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      <LinearGradient
        colors={["#FFFFFF", "#EDF7F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>{hero.eyebrow}</Text>
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroBody}>{hero.body}</Text>
        <Button
          label={hero.cta}
          onPress={() => router.push(hero.ctaRoute)}
          style={styles.heroButton}
        />
      </LinearGradient>

      {profile.role === "nurse" && (
        <>
          {!credentials ? (
            <Notice
              tone="warning"
              title="Completa tu perfil profesional"
              icon="id-card-outline"
            >
              Agrega tu formación y registro profesional para que las
              instituciones conozcan tu experiencia.
            </Notice>
          ) : credentials.verification_status === "pending" ? (
            <Notice tone="info" title="Perfil en revisión" icon="time-outline">
              Un administrador verificará tus credenciales. Mientras tanto,
              puedes explorar los turnos disponibles.
            </Notice>
          ) : credentials.verification_status === "rejected" ? (
            <Notice
              tone="danger"
              title="Verificación rechazada"
              icon="close-circle-outline"
            >
              Actualiza tus datos profesionales y vuelve a enviarlos para
              revisión.
            </Notice>
          ) : null}
        </>
      )}

      {profile.role === "institution" && institution && (
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusText}>
              <Text style={styles.statusName}>{institution.name}</Text>
              <Text style={styles.statusCity}>{institution.city}</Text>
            </View>
            <VerificationBadge status={institution.verification_status} />
          </View>
          {institution.verification_status === "pending" && (
            <Text style={styles.statusHint}>
              Pendiente de verificación por un administrador antes de publicar
              turnos.
            </Text>
          )}
        </Card>
      )}

      <Card style={styles.statsCard}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={styles.statWrap}>
            {index > 0 ? <View style={styles.statDivider} /> : null}
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.section}>
        <SectionTitle title="Accesos rápidos" />
        <Card style={styles.actionCard}>
          {quickActions(profile.role).map((action, index) => (
            <View key={action.title}>
              {index > 0 ? <Divider /> : null}
              <ActionRow {...action} />
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Actividad reciente"
          subtitle={
            unread.length > 0
              ? `${unread.length} sin leer`
              : "Estás al día."
          }
        />
        {loading && notifications.length === 0 ? (
          <LoadingBlock label="Cargando actividad..." />
        ) : notifications.length === 0 ? (
          <Text style={styles.emptyText}>
            Aquí verás las novedades de tus turnos y postulaciones.
          </Text>
        ) : (
          notifications.slice(0, 4).map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => void markRead(notification)}
              style={styles.notification}
            >
              <View
                style={[
                  styles.notificationDot,
                  notification.read_at && styles.notificationDotRead,
                ]}
              />
              <View style={styles.notificationBody}>
                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationText}>{notification.body}</Text>
                <Text style={styles.notificationTime}>
                  {formatRelative(notification.created_at)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "bienvenido/a";
}

function heroContent(
  role: "nurse" | "institution" | "admin",
  counts: { openApplications: number; openShifts: number; pending: number }
) {
  if (role === "nurse") {
    return {
      eyebrow: "OPORTUNIDADES",
      title:
        counts.openApplications > 0
          ? `${counts.openApplications} postulación${
              counts.openApplications === 1 ? "" : "es"
            } en curso.`
          : "Encuentra tu próximo turno.",
      body: "Turnos verificados por ciudad, servicio y horario.",
      cta: "Ver turnos",
      ctaRoute: "/(tabs)/shifts" as const,
    };
  }
  if (role === "institution") {
    return {
      eyebrow: "TU PANEL",
      title:
        counts.openShifts > 0
          ? `${counts.openShifts} turno${
              counts.openShifts === 1 ? "" : "s"
            } esperando cobertura.`
          : "Publica tu próxima vacante.",
      body: "Gestiona turnos y candidatos desde un solo lugar.",
      cta: "Abrir panel",
      ctaRoute: "/(tabs)/institution" as const,
    };
  }
  return {
    eyebrow: "VERIFICACIONES",
    title:
      counts.pending > 0
        ? `${counts.pending} pendientes de revisión.`
        : "Todo al día.",
    body: "Revisa instituciones y credenciales profesionales.",
    cta: "Revisar",
    ctaRoute: "/(tabs)/admin" as const,
  };
}

function statContent(
  role: "nurse" | "institution" | "admin",
  counts: {
    openApplications: number;
    accepted: number;
    openShifts: number;
    published: number;
    pendingInstitutions: number;
    pendingCredentials: number;
    unread: number;
  }
): { value: string; label: string }[] {
  if (role === "nurse") {
    return [
      { value: String(counts.openApplications), label: "Postulaciones activas" },
      { value: String(counts.accepted), label: "Turnos aceptados" },
      { value: String(counts.unread), label: "Sin leer" },
    ];
  }
  if (role === "institution") {
    return [
      { value: String(counts.openShifts), label: "Turnos abiertos" },
      { value: String(counts.published), label: "Publicados" },
      { value: String(counts.unread), label: "Sin leer" },
    ];
  }
  return [
    { value: String(counts.pendingInstitutions), label: "Instituciones" },
    { value: String(counts.pendingCredentials), label: "Credenciales" },
    { value: String(counts.unread), label: "Sin leer" },
  ];
}

function quickActions(
  role: "nurse" | "institution" | "admin"
): { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }[] {
  const list = [
    {
      icon: "calendar-outline" as const,
      title: "Ver turnos",
      subtitle: "Oportunidades disponibles",
      onPress: () => router.push("/(tabs)/shifts"),
    },
    role === "nurse"
      ? {
          icon: "document-text-outline" as const,
          title: "Mis postulaciones",
          subtitle: "Revisa sus estados",
          onPress: () => router.push("/(tabs)/applications"),
        }
      : role === "institution"
        ? {
            icon: "add-circle-outline" as const,
            title: "Publicar turno",
            subtitle: "Nueva vacante",
            onPress: () => router.push("/(tabs)/institution"),
          }
        : {
            icon: "shield-checkmark-outline" as const,
            title: "Verificaciones",
            subtitle: "Aprueba o rechaza",
            onPress: () => router.push("/(tabs)/admin"),
          },
    {
      icon: "person-outline" as const,
      title: "Mi perfil",
      subtitle: "Datos y credenciales",
      onPress: () => router.push("/(tabs)/profile"),
    },
  ];
  return list;
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.primaryDark} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color={colors.textSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerText: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hello: { fontSize: 24, fontWeight: "700", color: colors.navy },
  role: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: colors.navy,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
  },
  heroBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  heroButton: { alignSelf: "flex-start", paddingHorizontal: 24 },
  statusCard: { gap: spacing.sm },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statusText: { flex: 1 },
  statusName: { fontSize: 15, fontWeight: "700", color: colors.navy },
  statusCity: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  statsCard: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  statWrap: { flex: 1, flexDirection: "row", alignItems: "stretch" },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.navy },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
  },
  section: { gap: spacing.md },
  actionCard: { padding: spacing.xs },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  actionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  notificationDotRead: { backgroundColor: colors.borderStrong },
  notificationBody: { flex: 1, gap: 2 },
  notificationTitle: { fontSize: 13, fontWeight: "700", color: colors.navy },
  notificationText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  notificationTime: { fontSize: 10, color: colors.textSoft, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
