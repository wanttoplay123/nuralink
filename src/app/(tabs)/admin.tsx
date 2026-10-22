import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  openDocumentUrl,
  prepareDocumentWindow,
} from "@/lib/documentPreview";
import {
  formatRelative,
  professionalTypeLabel,
  roleLabel,
} from "@/lib/format";
import { colors, shadow, spacing } from "@/lib/theme";
import type { AdminData, CredentialDocument, Role } from "@/types";

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
  const [documents, setDocuments] = useState<CredentialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      const [nextData, nextDocuments] = await Promise.all([
        api.getAdminData(),
        api.getAllDocuments(),
      ]);
      setData(nextData);
      setDocuments(nextDocuments);
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

  const openDocument = async (document: CredentialDocument) => {
    if (!api) return;
    const preview = prepareDocumentWindow();
    setOpeningId(document.id);
    setError("");
    try {
      const url = await api.getDocumentUrl(document.storage_path);
      await openDocumentUrl(url, preview);
    } catch (caught) {
      preview?.close();
      setError(getErrorMessage(caught));
    } finally {
      setOpeningId(null);
    }
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
  const credentialUserIds = new Set(
    credentials.map((credential) => credential.user_id)
  );
  const institutionOwnerIds = new Set(
    institutions.map((institution) => institution.created_by)
  );
  const otherDocuments = documents.filter(
    (document) =>
      !credentialUserIds.has(document.user_id) &&
      !institutionOwnerIds.has(document.user_id)
  );
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
        subtitle="Revisa instituciones y credenciales profesionales antes de habilitar su participación."
        right={
          <Badge
            label={
              pendingInstitutions.length + pendingCredentials.length === 0
                ? "Al día"
                : `${
                    pendingInstitutions.length + pendingCredentials.length
                  } pendientes`
            }
            tone={
              pendingInstitutions.length + pendingCredentials.length === 0
                ? "success"
                : "warning"
            }
          />
        }
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
          <View
            style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons
              name="business-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={styles.summaryValue}>{pendingInstitutions.length}</Text>
          <Text style={styles.summaryLabel}>Instituciones pendientes</Text>
        </View>
        <View style={styles.summaryCard}>
          <View
            style={[styles.summaryIcon, { backgroundColor: colors.infoSoft }]}
          >
            <Ionicons
              name="id-card-outline"
              size={18}
              color={colors.info}
            />
          </View>
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
              <DocumentList
                documents={documents.filter(
                  (document) => document.user_id === institution.created_by
                )}
                openingId={openingId}
                onOpen={openDocument}
              />
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

              <DocumentList
                documents={documents.filter(
                  (document) => document.user_id === credential.user_id
                )}
                openingId={openingId}
                onOpen={openDocument}
              />

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

      {otherDocuments.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle
            title="Otros documentos"
            subtitle="Archivos de cuentas que aún no completaron su perfil profesional."
          />
          <Card style={styles.card}>
            <DocumentList
              documents={otherDocuments}
              openingId={openingId}
              onOpen={openDocument}
              subtitleForDocument={(document) => {
                const owner = users.find((user) => user.id === document.user_id);
                return owner
                  ? `${owner.full_name} · ${roleLabel(owner.role)}`
                  : "Cuenta sin identificar";
              }}
            />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function DocumentList({
  documents,
  openingId,
  onOpen,
  subtitleForDocument,
}: {
  documents: CredentialDocument[];
  openingId: string | null;
  onOpen: (document: CredentialDocument) => void;
  subtitleForDocument?: (document: CredentialDocument) => string;
}) {
  return (
    <View style={styles.documents}>
      <View style={styles.documentsHeading}>
        <View style={styles.documentsHeadingLeft}>
          <Ionicons name="folder-open-outline" size={14} color={colors.primary} />
          <Text style={styles.documentsTitle}>Documentos</Text>
        </View>
        <Text style={styles.documentsCount}>{documents.length}</Text>
      </View>
      {documents.length === 0 ? (
        <Text style={styles.noDocuments}>Sin documentos adjuntos.</Text>
      ) : (
        documents.map((document) => (
          <View key={document.id} style={styles.documentRow}>
            <View style={styles.documentIcon}>
              <Ionicons
                name="document-attach-outline"
                size={16}
                color={colors.primary}
              />
            </View>
            <View style={styles.documentText}>
              <Text style={styles.documentName} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.documentMeta} numberOfLines={1}>
                {subtitleForDocument
                  ? `${subtitleForDocument(document)} · `
                  : ""}
                {formatRelative(document.created_at)}
              </Text>
            </View>
            <Pressable
              onPress={() => onOpen(document)}
              disabled={openingId === document.id}
              style={({ pressed }) => [
                styles.documentOpen,
                pressed && styles.documentOpenPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${document.name}`}
            >
              {openingId === document.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="eye-outline" size={16} color={colors.primary} />
              )}
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", gap: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
    minHeight: 122,
    ...shadow,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.6,
  },
  summaryLabel: { fontSize: 10.5, color: colors.textMuted, lineHeight: 14 },
  section: { gap: 10 },
  card: { gap: spacing.md, padding: 16 },
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
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.1,
  },
  cardMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  detail: { fontSize: 11, color: colors.textMuted, lineHeight: 17 },
  detailBlock: { gap: 3 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  documents: {
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  documentsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  documentsHeadingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  documentsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  documentsCount: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  noDocuments: {
    fontSize: 10.5,
    color: colors.textSoft,
    lineHeight: 16,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 8,
  },
  documentIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  documentText: { flex: 1 },
  documentName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.navy,
  },
  documentMeta: { fontSize: 9.5, color: colors.textMuted, marginTop: 1 },
  documentOpen: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  documentOpenPressed: { opacity: 0.6 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: { flexGrow: 1 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  roleButton: { flexGrow: 1 },
});
