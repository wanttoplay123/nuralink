import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  ApplicationStatusBadge,
  Badge,
  Button,
  Card,
  Field,
  LoadingBlock,
  Notice,
  Screen,
  ShiftStatusBadge,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCurrency,
  formatDate,
  formatTime,
  isFutureDate,
} from "@/lib/format";
import { colors, spacing } from "@/lib/theme";
import type {
  Application,
  NurseCredentials,
  Shift,
} from "@/types";

export default function ShiftDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { api, profile } = useApp();
  const role = profile?.role;
  const [shift, setShift] = useState<Shift | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [credentials, setCredentials] = useState<NurseCredentials | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api || !id) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [nextShift, applications] = await Promise.all([
        api.getShift(id),
        role === "nurse"
          ? api.getMyApplications()
          : Promise.resolve([] as Application[]),
      ]);
      setShift(nextShift);
      const existing =
        applications.find(
          (item) =>
            item.shift_id === nextShift.id && item.status !== "withdrawn"
        ) ?? null;
      setApplication(existing);
      if (role === "nurse") {
        setCredentials(await api.getCredentials());
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [api, id, role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const apply = async () => {
    if (!api || !shift) return;
    setBusy(true);
    setError("");
    try {
      const created = await api.applyToShift(shift.id, note);
      setApplication(created);
      Alert.alert(
        "Postulación enviada",
        "La institución podrá revisar tu perfil y comunicarse contigo."
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <LoadingBlock label="Cargando turno..." />
      </Screen>
    );
  }

  if (!shift) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <Notice tone="danger" icon="alert-circle-outline">
          {error || "No encontramos este turno."}
        </Notice>
        <Button
          label="Volver a turnos"
          variant="secondary"
          onPress={() => router.replace("/(tabs)/shifts")}
        />
      </Screen>
    );
  }

  const isOpen = shift.status === "open" && isFutureDate(shift.starts_at);
  const nurseVerified = credentials?.verification_status === "verified";

  return (
    <Screen
      edges={["bottom", "left", "right"]}
      contentStyle={styles.content}
    >
      <View style={styles.topNavRow}>
        <Button
          label="Volver a Turnos"
          icon="arrow-back-outline"
          variant="light"
          small
          onPress={() => router.navigate("/(tabs)/shifts")}
        />
        <Button
          label="Inicio"
          icon="home-outline"
          variant="secondary"
          small
          onPress={() => router.navigate("/(tabs)")}
        />
      </View>

      <Card style={styles.headerCard}>
        <View style={styles.institutionRow}>
          <View style={styles.institutionIcon}>
            <Ionicons
              name="business-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.institutionText}>
            <Text style={styles.institutionName}>
              {shift.institution?.name ?? "Institución de salud"}
            </Text>
            <Text style={styles.city}>
              <Ionicons name="location-outline" size={12} /> {shift.city}
            </Text>
          </View>
          <ShiftStatusBadge status={shift.status} />
        </View>

        <Text style={styles.title}>{shift.title}</Text>
        <View style={styles.badges}>
          <Badge label={shift.service} tone="neutral" icon="medkit-outline" />
          <Badge
            label={
              shift.fulfillment_mode === "managed"
                ? "Intermediación NURSELINK"
                : "Conexión directa"
            }
            tone={shift.fulfillment_mode === "managed" ? "info" : "success"}
          />
        </View>

        <Text style={styles.pay}>{formatCurrency(shift.payment_amount)}</Text>
        <Text style={styles.payCaption}>Remuneración estimada del turno</Text>
      </Card>

      <Card style={styles.infoCard}>
        <InfoRow
          icon="calendar-outline"
          label="Fecha"
          value={formatDate(shift.starts_at)}
        />
        <InfoRow
          icon="time-outline"
          label="Horario"
          value={`${formatTime(shift.starts_at)} – ${formatTime(shift.ends_at)}`}
        />
        <InfoRow
          icon="location-outline"
          label="Ciudad"
          value={shift.city}
        />
        <InfoRow
          icon="briefcase-outline"
          label="Modalidad"
          value={
            shift.fulfillment_mode === "managed"
              ? "NURSELINK coordina la cobertura"
              : "La institución selecciona al profesional"
          }
        />
      </Card>

      {shift.requirements ? (
        <Card style={styles.requirements}>
          <Text style={styles.sectionLabel}>Requisitos</Text>
          <Text style={styles.requirementsText}>{shift.requirements}</Text>
        </Card>
      ) : null}

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      {profile?.role !== "nurse" ? (
        <Notice tone="info" icon="information-circle-outline">
          Solo las cuentas de profesionales de enfermería pueden postularse a
          los turnos.
        </Notice>
      ) : application ? (
        <Card style={styles.appliedCard}>
          <View style={styles.appliedHeader}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={colors.success}
            />
            <View style={styles.appliedText}>
              <Text style={styles.appliedTitle}>Ya enviaste tu postulación</Text>
              <Text style={styles.appliedBody}>
                La institución revisará tu perfil profesional.
              </Text>
            </View>
            <ApplicationStatusBadge status={application.status} />
          </View>
          <Button
            label="Ver mis postulaciones"
            variant="secondary"
            icon="document-text-outline"
            onPress={() => router.push("/(tabs)/applications")}
          />
        </Card>
      ) : !isOpen ? (
        <Notice tone="warning" icon="time-outline">
          {shift.status === "covered"
            ? "Este turno ya fue cubierto."
            : shift.status === "cancelled"
              ? "Este turno fue cancelado."
              : "Este turno ya comenzó o no está disponible."}
        </Notice>
      ) : !nurseVerified ? (
        <Notice
          tone="warning"
          title="Perfil pendiente de verificación"
          icon="id-card-outline"
        >
          Un administrador debe verificar tus credenciales antes de que puedas
          postularte.
        </Notice>
      ) : (
        <Card style={styles.applyCard}>
          <Text style={styles.sectionLabel}>Postularme a este turno</Text>
          <Text style={styles.applyHint}>
            Puedes dejar una nota breve para la institución. Tu perfil y
            credenciales se compartirán con ella.
          </Text>
          <Field
            value={note}
            onChangeText={setNote}
            placeholder="Ej. Tengo experiencia en urgencias y disponibilidad inmediata."
            multiline
            maxLength={500}
          />
          <Button
            label="Enviar postulación"
            icon="paper-plane-outline"
            onPress={apply}
            loading={busy}
          />
        </Card>
      )}
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  headerCard: { gap: spacing.sm },
  institutionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  institutionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  institutionText: { flex: 1 },
  institutionName: { fontSize: 14, fontWeight: "800", color: colors.navy },
  city: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.navy,
    marginTop: spacing.sm,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pay: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  payCaption: { fontSize: 11, color: colors.textSoft },
  infoCard: { gap: spacing.md },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 10, color: colors.textSoft, fontWeight: "700" },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: "600", marginTop: 2 },
  requirements: { gap: spacing.sm },
  sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.navy },
  requirementsText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  appliedCard: { gap: spacing.md },
  appliedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  appliedText: { flex: 1 },
  appliedTitle: { fontSize: 14, fontWeight: "800", color: colors.navy },
  appliedBody: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  applyCard: { gap: spacing.md },
  applyHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
});
