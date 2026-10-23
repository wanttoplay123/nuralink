import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import { useApp } from "@/context/app";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import {
  Avatar,
  Button,
  Card,
  Field,
  LoadingBlock,
  Notice,
  Screen,
  SectionTitle,
  VerificationBadge,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { confirm } from "@/lib/confirm";
import { downloadDocumentUrl } from "@/lib/documentPreview";
import {
  professionalTypeLabel,
  roleLabel,
  formatRelative,
} from "@/lib/format";
import { colors, gradients, radius, spacing } from "@/lib/theme";
import type {
  CredentialDocument,
  Institution,
  NurseCredentials,
  ProfessionalType,
} from "@/types";

export default function ProfileScreen() {
  const { profile, api, refreshProfile, signOut } = useApp();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [credentials, setCredentials] = useState<NurseCredentials | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [documents, setDocuments] = useState<CredentialDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewDocument, setPreviewDocument] =
    useState<CredentialDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [professionalType, setProfessionalType] =
    useState<ProfessionalType>("nurse");
  const [education, setEducation] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [registration, setRegistration] = useState("");
  const [availability, setAvailability] = useState("");
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [nit, setNit] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [institutionCity, setInstitutionCity] = useState("");
  const [institutionAddress, setInstitutionAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savingInstitution, setSavingInstitution] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api || !profile) return;
    setError("");
    try {
      if (profile.role === "nurse") {
        const [nextCredentials, nextInstitution] = await Promise.all([
          api.getCredentials(),
          api.getMyInstitution(),
        ]);
        setCredentials(nextCredentials);
        setInstitution(nextInstitution);
        if (nextCredentials) {
          setProfessionalType(nextCredentials.professional_type);
          setEducation(nextCredentials.education ?? "");
          setExperienceYears(String(nextCredentials.experience_years));
          setRegistration(nextCredentials.professional_registration ?? "");
          setAvailability(nextCredentials.availability_notes ?? "");
        }
      } else if (profile.role === "institution") {
        setInstitution(await api.getMyInstitution());
      }
      if (profile.role !== "admin") {
        api.getMyDocuments().then(setDocuments).catch(() => setDocuments([]));
      }
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

  if (!profile) return null;

  const saveProfile = async () => {
    if (!api) return;
    if (!fullName.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setSavingProfile(true);
    setError("");
    try {
      await api.updateProfile({ fullName, phone, city });
      await refreshProfile();
      Alert.alert("Perfil actualizado", "Tus datos personales fueron guardados.");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCredentials = async () => {
    if (!api) return;
    const years = Number(experienceYears);
    if (!Number.isFinite(years) || years < 0) {
      setError("Los años de experiencia deben ser un número válido.");
      return;
    }
    setSavingCredentials(true);
    setError("");
    try {
      const saved = await api.saveCredentials({
        professionalType,
        education,
        experienceYears: years,
        professionalRegistration: registration,
        availabilityNotes: availability,
      });
      setCredentials(saved);
      Alert.alert(
        "Perfil profesional enviado",
        "Tu información quedó en revisión. Un administrador verificará las credenciales."
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSavingCredentials(false);
    }
  };

  const createInstitution = async () => {
    if (!api) return;
    if (!institutionName.trim() || !institutionCity.trim()) {
      setError("Ingresa el nombre y la ciudad de la institución.");
      return;
    }
    setSavingInstitution(true);
    setError("");
    try {
      const created = await api.createInstitution({
        name: institutionName,
        nit,
        institutionType,
        city: institutionCity,
        address: institutionAddress,
      });
      setInstitution(created);
      setShowInstitutionForm(false);
      await refreshProfile();
      Alert.alert(
        "Institución registrada",
        "Quedó pendiente de verificación. Un administrador revisará la solicitud antes de habilitar la publicación de turnos."
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSavingInstitution(false);
    }
  };

  const pickAndUpload = async () => {
    if (!api) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setUploading(true);
      setError("");
      const uploaded = await api.uploadDocument({
        name: asset.name,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
      });
      setDocuments((current) => [uploaded, ...current]);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (document: CredentialDocument) => {
    if (!api) return;
    setPreviewDocument(document);
    setPreviewUrl(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      setPreviewUrl(await api.getDocumentUrl(document.storage_path));
    } catch (caught) {
      setPreviewError(getErrorMessage(caught));
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewUrl(null);
    setPreviewError("");
    setPreviewLoading(false);
  };

  const downloadPreview = async () => {
    if (!api || !previewDocument) return;
    const url = await api.getDocumentDownloadUrl(
      previewDocument.storage_path,
      previewDocument.name
    );
    await downloadDocumentUrl(url);
  };

  const removeDocument = async (documentId: string) => {
    if (!api) return;
    const ok = await confirm({
      title: "Eliminar documento",
      message: "¿Deseas eliminar este documento?",
      confirmText: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(documentId);
    setError("");
    try {
      await api.deleteDocument(documentId);
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId)
      );
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmSignOut = async () => {
    const ok = await confirm({
      title: "Cerrar sesión",
      message: "¿Deseas cerrar la sesión de NURSELINK?",
      confirmText: "Salir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <>
      <Screen refreshing={loading} onRefresh={load}>
        <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHero}
      >
        <View pointerEvents="none" style={styles.profileHeroOrb} />
        <View style={styles.profileHeroTop}>
          <View style={styles.avatarRing}>
            <Avatar name={profile.full_name} size={64} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {profile.full_name || "Tu perfil"}
            </Text>
            <Text style={styles.role}>{roleLabel(profile.role)}</Text>
            <View style={styles.headerBadges}>
              <View style={styles.cityPill}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color="rgba(255,255,255,0.72)"
                />
                <Text style={styles.cityPillText}>
                  {profile.city || "Ciudad sin definir"}
                </Text>
              </View>
              {profile.role === "nurse" && credentials ? (
                <VerificationBadge status={credentials.verification_status} />
              ) : null}
              {profile.role === "institution" && institution ? (
                <VerificationBadge
                  status={institution.verification_status}
                />
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.profileHeroFoot}>
          <View style={styles.heroFootIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color="#B7F0E3"
            />
          </View>
          <Text style={styles.profileHeroFootText}>
            Tus datos están protegidos y solo se comparten con instituciones
            verificadas.
          </Text>
        </View>
      </LinearGradient>

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      <Card style={styles.card}>
        <SectionTitle
          title="Datos personales"
          subtitle="Esta información ayuda a que las instituciones te contacten."
        />
        <Field
          label="Nombre completo"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          required
        />
        <Field
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+57 300 000 0000"
        />
        <Field
          label="Ciudad"
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
          placeholder="Cartagena"
        />
        <Button
          label="Guardar datos personales"
          icon="save-outline"
          onPress={saveProfile}
          loading={savingProfile}
        />
      </Card>

      {profile.role === "nurse" && (
        <Card style={styles.card}>
          <SectionTitle
            title="Perfil profesional"
            subtitle="Completa tus credenciales para poder postularte a los turnos."
            action={
              credentials ? (
                <VerificationBadge
                  status={credentials.verification_status}
                />
              ) : undefined
            }
          />

          {credentials?.verification_status === "verified" ? (
            <Notice tone="success" icon="checkmark-circle-outline">
              Tu perfil está verificado. Ya puedes postularte a turnos.
            </Notice>
          ) : credentials?.verification_status === "pending" ? (
            <Notice tone="info" icon="time-outline">
              Tu perfil está en revisión. Si actualizas tus datos, volverá a
              quedar pendiente.
            </Notice>
          ) : credentials?.verification_status === "rejected" ? (
            <Notice tone="danger" icon="close-circle-outline">
              Tu verificación fue rechazada. Corrige tus datos y vuelve a
              enviarlos.
            </Notice>
          ) : (
            <Notice tone="warning" icon="id-card-outline">
              Aún no has registrado tus credenciales profesionales.
            </Notice>
          )}

          <View style={styles.typeRow}>
            {(["nurse", "nursing_assistant"] as ProfessionalType[]).map(
              (type) => {
                const active = professionalType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setProfessionalType(type)}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {professionalTypeLabel(type)}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <Field
            label="Formación"
            value={education}
            onChangeText={setEducation}
            placeholder="Enfermería profesional · Universidad..."
          />
          <Field
            label="Años de experiencia"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="number-pad"
          />
          <Field
            label="Registro profesional / REVOE"
            value={registration}
            onChangeText={setRegistration}
            placeholder="Número de registro"
          />
          <Field
            label="Disponibilidad"
            value={availability}
            onChangeText={setAvailability}
            placeholder="Turnos diurnos, nocturnos, fines de semana..."
            multiline
          />

          <Button
            label="Enviar perfil a verificación"
            icon="shield-checkmark-outline"
            onPress={saveCredentials}
            loading={savingCredentials}
          />
          <Text style={styles.disclaimer}>
            La verificación de títulos y habilitación profesional debe realizarla
            un administrador autorizado. NURSELINK no asigna permisos desde el
            celular.
          </Text>
        </Card>
      )}

      {profile.role !== "admin" && (
        <Card style={styles.card}>
          <SectionTitle
            title="Documentos"
            subtitle={
              profile.role === "institution"
                ? "Sube RUT, cámara de comercio y documentos de representación para la verificación."
                : "Sube cédula, título y registro profesional para la verificación."
            }
          />
          <Button
            label="Subir documento"
            icon="cloud-upload-outline"
            variant="secondary"
            onPress={pickAndUpload}
            loading={uploading}
          />
          {documents.length === 0 ? (
            <Text style={styles.disclaimer}>
              Aún no has subido documentos. Un administrador podrá revisarlos.
            </Text>
          ) : (
            documents.map((document) => (
              <View key={document.id} style={styles.documentRow}>
                <View style={styles.documentIcon}>
                  <Ionicons
                    name="document-attach-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.documentText}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {document.name}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {formatRelative(document.created_at)}
                  </Text>
                </View>
                <View style={styles.documentActions}>
                  <Pressable
                    onPress={() => void openDocument(document)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${document.name}`}
                    style={styles.documentAction}
                  >
                    <Ionicons
                      name="eye-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => void removeDocument(document.id)}
                    disabled={deletingId === document.id}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${document.name}`}
                    style={styles.documentAction}
                  >
                    {deletingId === document.id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.danger}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>
      )}

      {profile.role === "institution" && (
        <Card style={styles.card}>
          <SectionTitle
            title="Mi institución"
            subtitle="Datos de la entidad que representas."
            action={
              institution ? (
                <VerificationBadge status={institution.verification_status} />
              ) : undefined
            }
          />
          {institution ? (
            <>
              <InfoLine label="Nombre" value={institution.name} />
              <InfoLine label="NIT" value={institution.nit || "Sin registrar"} />
              <InfoLine
                label="Tipo"
                value={institution.institution_type || "Sin registrar"}
              />
              <InfoLine label="Ciudad" value={institution.city} />
              <InfoLine
                label="Dirección"
                value={institution.address || "Sin registrar"}
              />
              {institution.verification_status !== "verified" ? (
                <Notice tone="warning" icon="time-outline">
                  La institución debe ser verificada por un administrador antes
                  de publicar turnos.
                </Notice>
              ) : null}
              <Button
                label="Ir al panel institucional"
                icon="business-outline"
                onPress={() => router.push("/(tabs)/institution")}
              />
            </>
          ) : (
            <Notice tone="warning" icon="business-outline">
              No encontramos una institución asociada a tu cuenta.
            </Notice>
          )}
        </Card>
      )}

      {profile.role === "nurse" && !institution && (
        <Card style={styles.card}>
          <SectionTitle
            title="¿Representas una institución?"
            subtitle="Registra la entidad para publicar turnos. La solicitud queda pendiente de verificación."
            action={
              <Button
                label={showInstitutionForm ? "Cerrar" : "Registrar"}
                variant="ghost"
                small
                onPress={() => setShowInstitutionForm((current) => !current)}
              />
            }
          />
          {showInstitutionForm ? (
            <>
              <Field
                label="Nombre de la institución"
                value={institutionName}
                onChangeText={setInstitutionName}
                placeholder="Clínica del Caribe"
                required
              />
              <Field
                label="NIT"
                value={nit}
                onChangeText={setNit}
                placeholder="900.123.456-7"
              />
              <Field
                label="Tipo de institución"
                value={institutionType}
                onChangeText={setInstitutionType}
                placeholder="Clínica, hospital, centro médico..."
              />
              <Field
                label="Ciudad"
                value={institutionCity}
                onChangeText={setInstitutionCity}
                placeholder="Cartagena"
                required
              />
              <Field
                label="Dirección"
                value={institutionAddress}
                onChangeText={setInstitutionAddress}
                placeholder="Dirección principal"
              />
              <Notice tone="info" icon="information-circle-outline">
                Al registrar una institución, tu cuenta pasará a rol
                institucional. El cambio lo realiza una función segura del
                servidor.
              </Notice>
              <Button
                label="Registrar institución"
                icon="business-outline"
                onPress={createInstitution}
                loading={savingInstitution}
              />
            </>
          ) : (
            <Text style={styles.disclaimer}>
              Podrás publicar turnos solo después de que la institución sea
              verificada por NURSELINK.
            </Text>
          )}
        </Card>
      )}

      {profile.role === "admin" && (
        <Notice tone="info" icon="shield-checkmark-outline">
          Tienes permisos de administración. Desde la pestaña Admin puedes
          verificar instituciones y credenciales profesionales.
        </Notice>
      )}

      <Card style={styles.card}>
        <SectionTitle
          title="Privacidad y seguridad"
          subtitle="La sesión se guarda de forma segura en este dispositivo."
        />
        <View style={styles.infoRow}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            No compartas claves de servicio ni documentos sensibles por chat.
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Los permisos se validan en Supabase con políticas RLS, no solo en la
            interfaz.
          </Text>
        </View>
      </Card>

      {loading ? <LoadingBlock label="Actualizando perfil..." /> : null}

      <Button
        label="Cerrar sesión"
        variant="danger"
        icon="log-out-outline"
        onPress={confirmSignOut}
      />
      </Screen>
      <DocumentPreviewModal
        key={previewDocument?.id ?? "closed"}
        visible={Boolean(previewDocument)}
        document={previewDocument}
        url={previewUrl}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
        onDownload={downloadPreview}
      />
    </>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    overflow: "hidden",
  },
  profileHeroOrb: {
    position: "absolute",
    top: -86,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(143, 227, 212, 0.1)",
  },
  profileHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerText: { flex: 1, gap: 3 },
  name: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.45,
  },
  role: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  headerBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  cityPillText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "700",
  },
  profileHeroFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: spacing.md,
  },
  heroFootIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeroFootText: {
    flex: 1,
    color: "rgba(255,255,255,0.56)",
    fontSize: 10.5,
    lineHeight: 15.5,
  },
  card: { gap: spacing.md },
  typeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  typeChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  typeChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  typeChipTextActive: { color: colors.primaryDark },
  disclaimer: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
  },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 4,
  },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
  },
  documentIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  documentText: { flex: 1 },
  documentName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.1,
  },
  documentMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  documentActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  documentAction: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
