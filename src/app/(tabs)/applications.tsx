import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  ApplicationStatusBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { confirm } from "@/lib/confirm";
import {
  formatDate,
  formatTime,
} from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import type { Application } from "@/types";

export default function ApplicationsScreen() {
  const { profile, api } = useApp();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      setApplications(await api.getMyApplications());
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
  if (profile.role !== "nurse") {
    return <Redirect href="/(tabs)" />;
  }

  const withdraw = async (application: Application) => {
    const ok = await confirm({
      title: "Retirar postulación",
      message:
        "Tu postulación dejará de estar disponible para la institución. ¿Deseas continuar?",
      confirmText: "Retirar",
      destructive: true,
    });
    if (!ok || !api) return;
    setBusyId(application.id);
    setError("");
    try {
      await api.withdrawApplication(application.id);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  const active = applications.filter((application) =>
    ["pending", "reviewing", "accepted"].includes(application.status)
  );
  const history = applications.filter((application) =>
    ["rejected", "withdrawn"].includes(application.status)
  );

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        eyebrow="MI ACTIVIDAD"
        title="Mis postulaciones"
        subtitle="Sigue el estado de cada solicitud y revisa el turno al que te postulaste."
      />

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      {loading && applications.length === 0 ? (
        <LoadingBlock label="Cargando postulaciones..." />
      ) : applications.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Aún no tienes postulaciones"
          description="Explora los turnos disponibles y envía tu primera solicitud."
          action={
            <Button
              label="Buscar turnos"
              icon="search-outline"
              onPress={() => router.push("/(tabs)/shifts")}
            />
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>En curso</Text>
              {active.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  busy={busyId === application.id}
                  onWithdraw={
                    ["pending", "reviewing"].includes(application.status)
                      ? () => withdraw(application)
                      : undefined
                  }
                />
              ))}
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Historial</Text>
              {history.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function ApplicationCard({
  application,
  busy,
  onWithdraw,
}: {
  application: Application;
  busy?: boolean;
  onWithdraw?: () => void;
}) {
  const shift = application.shift;
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.icon}>
          <Ionicons name="medkit-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.cardTopText}>
          <Text style={styles.institution} numberOfLines={1}>
            {shift?.institution?.name ?? "Institución"}
          </Text>
          <Text style={styles.shiftTitle} numberOfLines={2}>
            {shift?.title ?? "Turno"}
          </Text>
        </View>
        <ApplicationStatusBadge status={application.status} />
      </View>

      {shift ? (
        <View style={styles.meta}>
          <Badge label={shift.service} tone="neutral" />
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.metaText}>{formatDate(shift.starts_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.metaText}>{shift.city}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.metaText}>
              {formatTime(shift.starts_at)} – {formatTime(shift.ends_at)}
            </Text>
          </View>
        </View>
      ) : null}

      {application.note ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>Tu nota</Text>
          <Text style={styles.noteText}>{application.note}</Text>
        </View>
      ) : null}

      {application.status === "accepted" ? (
        <Notice tone="success" icon="checkmark-circle-outline">
          La institución aceptó tu postulación. Coordina los detalles del turno
          directamente con ella.
        </Notice>
      ) : null}

      {onWithdraw ? (
        <Button
          label="Retirar postulación"
          variant="ghost"
          icon="close-outline"
          onPress={onWithdraw}
          loading={busy}
          small
        />
      ) : null}

      {shift ? (
        <Button
          label="Ver turno"
          variant="secondary"
          icon="arrow-forward-outline"
          onPress={() => router.push(`/shift/${shift.id}`)}
          small
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.navy },
  card: { gap: spacing.md },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopText: { flex: 1 },
  institution: { fontSize: 12, color: colors.textMuted },
  shiftTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 2,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  note: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 3,
  },
  noteLabel: { fontSize: 10, fontWeight: "800", color: colors.textSoft },
  noteText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
});
