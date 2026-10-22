import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  Screen,
  ScreenHeader,
  SectionTitle,
  VerificationBadge,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { confirm } from "@/lib/confirm";
import {
  professionalTypeLabel,
  roleLabel,
} from "@/lib/format";
import { colors, spacing } from "@/lib/theme";
import type { AdminData, Role } from "@/types";

const roleShort: Record<Role, string> = {
  nurse: "Enfermera",
  institution: "Institución",
  admin: "Admin",
};

const roleTone: Record<Role, "neutral" | "info" | "success"> = {
  nurse: "neutral",
  institution: "info",
  admin: "success",
};

export default function AdminScreen() {
  const { profile, api } = useApp();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      setData(await api.getAdminData());
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
  if (profile.role !== "admin") {
    return <Redirect href="/(tabs)" />;
  }

  const verifyInstitution = async (
    id: string,
    status: "verified" | "rejected"
  ) => {
    if (!api) return;
    setBusy(id);
    setError("");
    try {
      await api.setInstitutionVerification(id, status);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const verifyCredential = async (
    id: string,
    status: "verified" | "rejected"
  ) => {
    if (!api) return;
    setBusy(id);
    setError("");
    try {
      await api.setCredentialVerification(id, status);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  const confirmAction = async (
    title: string,
    message: string,
    action: () => Promise<void>
  ) => {
    const ok = await confirm({ title, message, confirmText: "Confirmar" });
    if (!ok) return;
    await action();
  };

  const changeRole = async (userId: string, role: Role) => {
    if (!api) return;
    setBusyRole(userId);
    setError("");
    try {
      await api.setUserRole(userId, role);
      await load();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyRole(null);
    }
  };

  const confirmRoleChange = (userId: string, role: Role, name: string) => {
    void confirmAction(
      "Cambiar rol",
      `${name} pasará a "${roleShort[role]}". ¿Confirmas el cambio?`,
      () => changeRole(userId, role)
    );
  };

  if (loading) {
    return (
      <Screen>
        <LoadingBlock label="Cargando verificaciones..." />
      </Screen>
    );
  }

  const institutions = data?.institutions ?? [];
  const credentials = data?.credentials ?? [];
  const users = data?.users ?? [];
  const pendingInstitutions = institutions.filter(
    (item) => item.verification_status === "pending"
  );
  const pendingCredentials = credentials.filter(
    (item) => item.verification_status === "pending"
  );

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        eyebrow="ADMINISTRACIÓN"
        title="Verificaciones"
        subtitle="Revisa instituciones y credenciales profesionales antes de habilitar su participación. Las decisiones quedan registradas en la base de datos."
      />

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      <Notice tone="info" icon="shield-checkmark-outline">
        Este panel requiere el rol administrador. El rol se asigna únicamente
        con un proceso seguro en Supabase, nunca desde la app.
      </Notice>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Ionicons name="business-outline" size={20} color={colors.primary} />
          <Text style={styles.summaryValue}>{pendingInstitutions.length}</Text>
          <Text style={styles.summaryLabel}>Instituciones pendientes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="id-card-outline" size={20} color={colors.primary} />
          <Text style={styles.summaryValue}>{pendingCredentials.length}</Text>
          <Text style={styles.summaryLabel}>Credenciales pendientes</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Usuarios y roles"
          subtitle="Asigna o cambia el rol de las cuentas registradas."
        />
        {users.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Sin usuarios"
            description="Las cuentas registradas aparecerán aquí para gestionar su rol."
          />
        ) : (
          users.map((user) => (
            <Card key={user.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar name={user.full_name || "Usuario"} size={40} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    {user.full_name || "Usuario"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {user.city || "Ciudad no registrada"}
                  </Text>
                </View>
                <Badge label={roleShort[user.role]} tone={roleTone[user.role]} />
              </View>
              <View style={styles.roleRow}>
                {(["nurse", "institution", "admin"] as Role[]).map((role) => {
                  const active = user.role === role;
                  return (
                    <Button
                      key={role}
                      label={roleShort[role]}
                      variant={active ? "soft" : "secondary"}
                      small
                      disabled={active || busyRole === user.id}
                      onPress={() =>
                        confirmRoleChange(user.id, role, user.full_name)
                      }
                      style={styles.roleButton}
                    />
                  );
                })}
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Instituciones"
          subtitle="Verifica los datos de la entidad antes de permitir publicaciones."
        />
        {institutions.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="Sin instituciones"
            description="Cuando una cuenta registre una institución aparecerá aquí."
          />
        ) : (
          institutions.map((institution) => (
            <Card key={institution.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons
                    name="business-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{institution.name}</Text>
                  <Text style={styles.cardMeta}>
                    {institution.institution_type || "Tipo sin registrar"} ·{" "}
                    {institution.city}
                  </Text>
                </View>
                <VerificationBadge
                  status={institution.verification_status}
                />
              </View>
              <Text style={styles.detail}>
                NIT: {institution.nit || "Sin registrar"} · Dirección:{" "}
                {institution.address || "Sin registrar"}
              </Text>
              {institution.verification_status === "pending" ? (
                <View style={styles.actions}>
                  <Button
                    label="Verificar"
                    icon="checkmark-outline"
                    onPress={() =>
                      confirmAction(
                        "Verificar institución",
                        `${institution.name} podrá publicar turnos. ¿Confirmas la verificación?`,
                        () => verifyInstitution(institution.id, "verified")
                      )
                    }
                    loading={busy === institution.id}
                    small
                    style={styles.action}
                  />
                  <Button
                    label="Rechazar"
                    variant="danger"
                    icon="close-outline"
                    onPress={() =>
                      confirmAction(
                        "Rechazar institución",
                        `La institución ${institution.name} no podrá publicar turnos.`,
                        () => verifyInstitution(institution.id, "rejected")
                      )
                    }
                    disabled={busy === institution.id}
                    small
                    style={styles.action}
                  />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Credenciales profesionales"
          subtitle="Comprueba formación, registro y experiencia antes de aprobar."
        />
        {credentials.length === 0 ? (
          <EmptyState
            icon="id-card-outline"
            title="Sin credenciales"
            description="Los profesionales que completen su perfil aparecerán aquí."
          />
        ) : (
          credentials.map((credential) => (
            <Card key={credential.user_id} style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar
                  name={credential.profile?.full_name ?? "Profesional"}
                  size={40}
                />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    {credential.profile?.full_name ?? "Profesional"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {professionalTypeLabel(credential.professional_type)} ·{" "}
                    {credential.profile?.city ?? "Ciudad no registrada"}
                  </Text>
                </View>
                <VerificationBadge
                  status={credential.verification_status}
                />
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detail}>
                  Formación: {credential.education || "Sin registrar"}
                </Text>
                <Text style={styles.detail}>
                  Registro: {credential.professional_registration || "Sin registrar"}
                </Text>
                <Text style={styles.detail}>
                  Experiencia: {credential.experience_years} año
                  {credential.experience_years === 1 ? "" : "s"}
                </Text>
                {credential.availability_notes ? (
                  <Text style={styles.detail}>
                    Disponibilidad: {credential.availability_notes}
                  </Text>
                ) : null}
              </View>

              <View style={styles.badges}>
                <Badge
                  label={roleLabel(credential.profile?.role ?? "nurse")}
                  tone="neutral"
                />
                {credential.profile?.phone ? (
                  <Badge
                    label={credential.profile.phone}
                    tone="info"
                    icon="call-outline"
                  />
                ) : null}
              </View>

              {credential.verification_status === "pending" ? (
                <View style={styles.actions}>
                  <Button
                    label="Verificar"
                    icon="checkmark-outline"
                    onPress={() =>
                      confirmAction(
                        "Verificar credenciales",
                        "El profesional podrá postularse a turnos. ¿Confirmas la verificación?",
                        () =>
                          verifyCredential(credential.user_id, "verified")
                      )
                    }
                    loading={busy === credential.user_id}
                    small
                    style={styles.action}
                  />
                  <Button
                    label="Rechazar"
                    variant="danger"
                    icon="close-outline"
                    onPress={() =>
                      confirmAction(
                        "Rechazar credenciales",
                        "El profesional deberá corregir y reenviar su perfil.",
                        () =>
                          verifyCredential(credential.user_id, "rejected")
                      )
                    }
                    disabled={busy === credential.user_id}
                    small
                    style={styles.action}
                  />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", gap: spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  summaryValue: { fontSize: 27, fontWeight: "800", color: colors.navy },
  summaryLabel: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  section: { gap: spacing.md },
  card: { gap: spacing.md },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.navy },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  detail: { fontSize: 11, color: colors.textMuted, lineHeight: 17 },
  detailBlock: { gap: 3 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: { flexGrow: 1 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  roleButton: { flexGrow: 1 },
});
