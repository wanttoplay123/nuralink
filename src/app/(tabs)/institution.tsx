import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useApp } from "@/context/app";
import {
  ApplicationStatusBadge,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingBlock,
  Notice,
  Screen,
  ScreenHeader,
  SectionTitle,
  ShiftStatusBadge,
  VerificationBadge,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { confirm } from "@/lib/confirm";
import {
  combineDateTime,
  formatCurrency,
  formatDate,
  formatTime,
  professionalTypeLabel,
  splitDateTime,
} from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import type {
  Applicant,
  FulfillmentMode,
  Institution,
  Shift,
} from "@/types";

function defaultStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(7, 0, 0, 0);
  return splitDateTime(date.toISOString());
}

function defaultEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return splitDateTime(date.toISOString());
}

export default function InstitutionScreen() {
  const { profile, api } = useApp();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applicants, setApplicants] = useState<Record<string, Applicant[]>>({});
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [busyApplication, setBusyApplication] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const initialStart = defaultStart();
  const initialEnd = defaultEnd();
  const [title, setTitle] = useState("");
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [payment, setPayment] = useState("180000");
  const [mode, setMode] = useState<FulfillmentMode>("direct");
  const [requirements, setRequirements] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      const nextInstitution = await api.getMyInstitution();
      setInstitution(nextInstitution);
      if (nextInstitution) {
        setCity((current) => current || nextInstitution.city);
        setShifts(await api.getInstitutionShifts(nextInstitution.id));
      }
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
    return <Redirect href="/(tabs)/admin" />;
  }

  const publish = async () => {
    if (!api || !institution) return;
    const start = combineDateTime(startDate, startTime);
    const end = combineDateTime(endDate, endTime);

    if (!title.trim() || !service.trim() || !city.trim()) {
      setError("Completa el título, el servicio y la ciudad.");
      return;
    }
    if (!start || !end) {
      setError("Usa el formato AAAA-MM-DD para la fecha y HH:MM para la hora.");
      return;
    }
    if (end <= start) {
      setError("La fecha y hora de fin deben ser posteriores al inicio.");
      return;
    }
    const amount = Number(payment.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("La remuneración no es válida.");
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await api.publishShift({
        institutionId: institution.id,
        title,
        service,
        city,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        paymentAmount: amount,
        fulfillmentMode: mode,
        requirements,
      });
      setTitle("");
      setService("");
      setRequirements("");
      setNotice("Turno publicado. Ya está visible para los profesionales.");
      setShifts(await api.getInstitutionShifts(institution.id));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPublishing(false);
    }
  };

  const toggleApplicants = async (shift: Shift) => {
    if (!api) return;
    if (expandedShift === shift.id) {
      setExpandedShift(null);
      return;
    }
    setExpandedShift(shift.id);
    if (applicants[shift.id]) return;
    setApplicantsLoading(shift.id);
    setError("");
    try {
      const next = await api.getApplicants(shift.id);
      setApplicants((current) => ({ ...current, [shift.id]: next }));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setApplicantsLoading(null);
    }
  };

  const respond = async (
    applicationId: string,
    decision: "reviewing" | "accepted" | "rejected"
  ) => {
    if (decision === "accepted") {
      const ok = await confirm({
        title: "Aceptar candidata/o",
        message:
          "El turno se marcará como cubierto y las demás postulaciones serán rechazadas. ¿Deseas continuar?",
        confirmText: "Aceptar",
      });
      if (!ok) return;
    }

    if (!api || !institution) return;
    setBusyApplication(applicationId);
    setError("");
    try {
      await api.respondToApplication(applicationId, decision);
      const [nextShifts, nextApplicants] = await Promise.all([
        api.getInstitutionShifts(institution.id),
        expandedShift
          ? api.getApplicants(expandedShift)
          : Promise.resolve([] as Applicant[]),
      ]);
      setShifts(nextShifts);
      if (expandedShift) {
        setApplicants((current) => ({
          ...current,
          [expandedShift]: nextApplicants,
        }));
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyApplication(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingBlock label="Cargando panel institucional..." />
      </Screen>
    );
  }

  if (!institution) {
    return (
      <Screen>
        <ScreenHeader eyebrow="PANEL INSTITUCIONAL" title="Mi institución" />
        <Notice tone="warning" icon="business-outline">
          No encontramos una institución asociada a tu cuenta. Puedes registrarla
          desde tu perfil.
        </Notice>
        <Button
          label="Ir a mi perfil"
          icon="person-circle-outline"
          onPress={() => router.push("/(tabs)/profile")}
        />
      </Screen>
    );
  }

  const verified = institution.verification_status === "verified";
  const openShifts = shifts.filter((shift) => shift.status === "open");

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        eyebrow="PANEL INSTITUCIONAL"
        title={institution.name}
        subtitle={`${institution.city} · ${openShifts.length} turno${
          openShifts.length === 1 ? "" : "s"
        } abierto${openShifts.length === 1 ? "" : "s"}`}
        right={
          <VerificationBadge status={institution.verification_status} />
        }
      />

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice tone="success" icon="checkmark-circle-outline">
          {notice}
        </Notice>
      ) : null}

      {!verified && (
        <Notice
          tone={
            institution.verification_status === "rejected" ? "danger" : "warning"
          }
          title={
            institution.verification_status === "rejected"
              ? "Verificación rechazada"
              : "Institución pendiente de verificación"
          }
          icon="time-outline"
        >
          {institution.verification_status === "rejected"
            ? "La institución no fue aprobada. Contacta a administración para revisar el caso."
            : "Un administrador debe verificar la institución antes de que puedas publicar turnos."}
        </Notice>
      )}

      {verified && (
        <Card style={styles.card}>
          <SectionTitle
            title="Publicar un turno"
            subtitle="Define las condiciones y el perfil que necesitas."
          />
          <Field
            label="Título del turno"
            value={title}
            onChangeText={setTitle}
            placeholder="Enfermero(a) para urgencias"
            required
          />
          <View style={styles.fieldRow}>
            <View style={styles.flex}>
              <Field
                label="Servicio"
                value={service}
                onChangeText={setService}
                placeholder="Urgencias"
                required
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Ciudad"
                value={city}
                onChangeText={setCity}
                placeholder="Cartagena"
                required
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.flex}>
              <Field
                label="Fecha inicio"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Hora inicio"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="07:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.flex}>
              <Field
                label="Fecha fin"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Hora fin"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="19:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <Field
            label="Remuneración (COP)"
            value={payment}
            onChangeText={setPayment}
            keyboardType="number-pad"
            placeholder="180000"
          />
          <Text style={styles.label}>Modalidad de cobertura</Text>
          <View style={styles.modeRow}>
            {(
              [
                ["direct", "Conexión directa"],
                ["managed", "Intermediación NURSELINK"],
              ] as [FulfillmentMode, string][]
            ).map(([value, label]) => {
              const active = mode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      active && styles.modeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Requisitos"
            value={requirements}
            onChangeText={setRequirements}
            placeholder="Experiencia, cursos, documentación..."
            multiline
          />
          <Button
            label="Publicar turno"
            icon="add-circle-outline"
            onPress={publish}
            loading={publishing}
          />
          <Text style={styles.hint}>
            La institución debe permanecer verificada. La aceptación de una
            postulación se realiza de forma atómica para evitar dobles
            asignaciones.
          </Text>
        </Card>
      )}

      <View style={styles.list}>
        <SectionTitle
          title="Turnos publicados"
          subtitle="Revisa candidatos y confirma la cobertura."
        />
        {shifts.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Aún no hay turnos"
            description={
              verified
                ? "Publica tu primer turno para recibir postulaciones."
                : "Cuando la institución sea verificada podrás publicar turnos."
            }
          />
        ) : (
          shifts.map((shift) => {
            const isExpanded = expandedShift === shift.id;
            const shiftApplicants = applicants[shift.id];
            return (
              <Card key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftTop}>
                  <View style={styles.shiftTopText}>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <Text style={styles.shiftMeta}>
                      {shift.service} · {formatDate(shift.starts_at)} ·{" "}
                      {formatTime(shift.starts_at)} – {formatTime(shift.ends_at)}
                    </Text>
                  </View>
                  <ShiftStatusBadge status={shift.status} />
                </View>

                <View style={styles.shiftFooter}>
                  <Text style={styles.shiftPay}>
                    {formatCurrency(shift.payment_amount)}
                  </Text>
                  <Button
                    label={isExpanded ? "Ocultar candidatos" : "Ver candidatos"}
                    variant="secondary"
                    icon={isExpanded ? "chevron-up-outline" : "people-outline"}
                    onPress={() => void toggleApplicants(shift)}
                    loading={applicantsLoading === shift.id}
                    small
                  />
                </View>

                {isExpanded && (
                  <View style={styles.applicants}>
                    {applicantsLoading === shift.id ? (
                      <LoadingBlock label="Cargando candidatos..." />
                    ) : !shiftApplicants || shiftApplicants.length === 0 ? (
                      <Text style={styles.emptyApplicants}>
                        Aún no hay postulaciones para este turno.
                      </Text>
                    ) : (
                      shiftApplicants.map((applicant) => (
                        <ApplicantCard
                          key={applicant.application.id}
                          applicant={applicant}
                          shift={shift}
                          busy={busyApplication === applicant.application.id}
                          onRespond={respond}
                        />
                      ))
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function ApplicantCard({
  applicant,
  shift,
  busy,
  onRespond,
}: {
  applicant: Applicant;
  shift: Shift;
  busy: boolean;
  onRespond: (
    applicationId: string,
    decision: "reviewing" | "accepted" | "rejected"
  ) => void;
}) {
  const { application, nurse, credentials } = applicant;
  const canReview = ["pending", "reviewing"].includes(application.status);
  return (
    <View style={styles.applicant}>
      <View style={styles.applicantHeader}>
        <Avatar name={nurse?.full_name ?? "Profesional"} size={40} />
        <View style={styles.applicantText}>
          <Text style={styles.applicantName}>
            {nurse?.full_name ?? "Profesional de enfermería"}
          </Text>
          <Text style={styles.applicantMeta}>
            {nurse?.city ?? "Ciudad no registrada"}
            {credentials
              ? ` · ${professionalTypeLabel(credentials.professional_type)}`
              : ""}
          </Text>
        </View>
        <ApplicationStatusBadge status={application.status} />
      </View>

      {credentials ? (
        <View style={styles.credentialRow}>
          <Badge
            label={`${credentials.experience_years} año${
              credentials.experience_years === 1 ? "" : "s"
            } de experiencia`}
            tone="neutral"
          />
          <VerificationBadge status={credentials.verification_status} />
        </View>
      ) : (
        <Text style={styles.noCredentials}>Sin credenciales registradas.</Text>
      )}

      {application.note ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>Nota de la postulación</Text>
          <Text style={styles.noteText}>{application.note}</Text>
        </View>
      ) : null}

      {canReview && shift.status === "open" ? (
        <View style={styles.actions}>
          <Button
            label="Aceptar"
            icon="checkmark-outline"
            onPress={() => onRespond(application.id, "accepted")}
            loading={busy}
            small
            style={styles.actionButton}
          />
          {application.status === "pending" ? (
            <Button
              label="En revisión"
              variant="secondary"
              icon="time-outline"
              onPress={() => onRespond(application.id, "reviewing")}
              disabled={busy}
              small
              style={styles.actionButton}
            />
          ) : null}
          <Button
            label="Rechazar"
            variant="danger"
            icon="close-outline"
            onPress={() => onRespond(application.id, "rejected")}
            disabled={busy}
            small
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: 18 },
  fieldRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  flex: { flex: 1, minWidth: 140 },
  label: {
    color: colors.navy,
    fontWeight: "700",
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  modeText: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted },
  modeTextActive: { color: colors.primaryDark },
  hint: { fontSize: 10.5, color: colors.textSoft, lineHeight: 16 },
  list: { gap: 10 },
  shiftCard: { gap: spacing.md, padding: 16 },
  shiftTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  shiftTopText: { flex: 1 },
  shiftTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.15,
  },
  shiftMeta: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 15.5,
  },
  shiftFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  shiftPay: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  applicants: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  emptyApplicants: { color: colors.textMuted, fontSize: 11.5 },
  applicant: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: spacing.sm,
  },
  applicantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  applicantText: { flex: 1 },
  applicantName: { fontSize: 12.5, fontWeight: "800", color: colors.navy },
  applicantMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  credentialRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  noCredentials: { fontSize: 10.5, color: colors.textSoft },
  note: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
  },
  noteLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  noteText: { fontSize: 10.5, color: colors.textMuted, lineHeight: 15.5, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionButton: { flexGrow: 1 },
});
