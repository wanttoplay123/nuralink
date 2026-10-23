import { useCallback, useState, type ComponentProps } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
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
import { downloadDocumentUrl } from "@/lib/documentPreview";
import {
  formatRelative,
  professionalTypeLabel,
  roleLabel,
} from "@/lib/format";
import { colors, shadow, spacing } from "@/lib/theme";
import type {
  AdminData,
  CredentialDocument,
  Institution,
  NurseCredentials,
  Profile,
  Role,
  VerificationStatus,
} from "@/types";

type IconName = ComponentProps<typeof Ionicons>["name"];
type AdminTab = "pending" | "institutions" | "professionals" | "users" | "documents";
type VerificationFilter = "all" | VerificationStatus;
type UserFilter = "all" | Role;
type DocumentFilter = "all" | "pdf" | "image" | "other";
type PendingFilter = "all" | "institutions" | "professionals";
type AdminCredential = NurseCredentials & { profile?: Profile | null };

type FilterOption = {
  key: string;
  label: string;
  count?: number;
};

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
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const [activeTab, setActiveTab] = useState<AdminTab>("pending");
  const [search, setSearch] = useState("");
  const [institutionFilter, setInstitutionFilter] =
    useState<VerificationFilter>("all");
  const [professionalFilter, setProfessionalFilter] =
    useState<VerificationFilter>("all");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>("all");
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>("all");

  const [data, setData] = useState<AdminData | null>(null);
  const [documents, setDocuments] = useState<CredentialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] =
    useState<CredentialDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
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
      void load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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

  const confirmInstitutionVerification = (
    institution: Institution,
    status: "verified" | "rejected"
  ) => {
    void confirmAction(
      status === "verified" ? "Verificar institución" : "Rechazar institución",
      status === "verified"
        ? `${institution.name} podrá publicar turnos. ¿Confirmas la verificación?`
        : `La institución ${institution.name} no podrá publicar turnos.`,
      () => verifyInstitution(institution.id, status)
    );
  };

  const confirmCredentialVerification = (
    credential: AdminCredential,
    status: "verified" | "rejected"
  ) => {
    const name = credential.profile?.full_name ?? "El profesional";
    void confirmAction(
      status === "verified"
        ? "Verificar credenciales"
        : "Rechazar credenciales",
      status === "verified"
        ? `${name} podrá postularse a turnos. ¿Confirmas la verificación?`
        : `${name} deberá corregir y reenviar su perfil.`,
      () => verifyCredential(credential.user_id, status)
    );
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

  if (loading) {
    return (
      <Screen>
        <LoadingBlock label="Cargando administración..." />
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
  const pendingTotal = pendingInstitutions.length + pendingCredentials.length;

  const query = search.trim().toLowerCase();
  const matchesQuery = (values: (string | null | undefined)[]) =>
    !query ||
    values.some((value) => (value ?? "").toLowerCase().includes(query));

  const filteredInstitutions = institutions.filter((institution) => {
    const statusMatches =
      institutionFilter === "all" ||
      institution.verification_status === institutionFilter;
    return (
      statusMatches &&
      matchesQuery([
        institution.name,
        institution.nit,
        institution.city,
        institution.institution_type,
        institution.address,
      ])
    );
  });

  const filteredCredentials = credentials.filter((credential) => {
    const statusMatches =
      professionalFilter === "all" ||
      credential.verification_status === professionalFilter;
    return (
      statusMatches &&
      matchesQuery([
        credential.profile?.full_name,
        credential.profile?.city,
        credential.profile?.phone,
        credential.education,
        credential.professional_registration,
        professionalTypeLabel(credential.professional_type),
      ])
    );
  });

  const filteredUsers = users.filter((user) => {
    const roleMatches = userFilter === "all" || user.role === userFilter;
    return (
      roleMatches &&
      matchesQuery([
        user.full_name,
        user.phone,
        user.city,
        roleLabel(user.role),
      ])
    );
  });

  const filteredDocuments = documents.filter((document) => {
    const kindMatches =
      documentFilter === "all" || documentKind(document) === documentFilter;
    const owner = users.find((user) => user.id === document.user_id);
    return (
      kindMatches &&
      matchesQuery([
        document.name,
        owner?.full_name,
        owner?.city,
        owner ? roleLabel(owner.role) : "",
        documentTypeLabel(document),
      ])
    );
  });

  const filteredPendingInstitutions = pendingInstitutions.filter(
    (institution) =>
      matchesQuery([
        institution.name,
        institution.nit,
        institution.city,
        institution.institution_type,
      ])
  );

  const filteredPendingCredentials = pendingCredentials.filter((credential) =>
    matchesQuery([
      credential.profile?.full_name,
      credential.profile?.city,
      credential.profile?.phone,
      credential.education,
      credential.professional_registration,
    ])
  );

  const hasActiveFilters =
    query.length > 0 ||
    (activeTab === "pending" && pendingFilter !== "all") ||
    (activeTab === "institutions" && institutionFilter !== "all") ||
    (activeTab === "professionals" && professionalFilter !== "all") ||
    (activeTab === "users" && userFilter !== "all") ||
    (activeTab === "documents" && documentFilter !== "all");

  const clearActiveFilters = () => {
    setSearch("");
    if (activeTab === "pending") setPendingFilter("all");
    if (activeTab === "institutions") setInstitutionFilter("all");
    if (activeTab === "professionals") setProfessionalFilter("all");
    if (activeTab === "users") setUserFilter("all");
    if (activeTab === "documents") setDocumentFilter("all");
  };

  const selectTab = (next: AdminTab) => {
    if (next !== activeTab) setSearch("");
    setActiveTab(next);
  };

  const institutionFilterOptions: FilterOption[] = [
    { key: "all", label: "Todas", count: institutions.length },
    { key: "pending", label: "Pendientes", count: pendingInstitutions.length },
    {
      key: "verified",
      label: "Verificadas",
      count: institutions.filter((item) => item.verification_status === "verified")
        .length,
    },
    {
      key: "rejected",
      label: "Rechazadas",
      count: institutions.filter((item) => item.verification_status === "rejected")
        .length,
    },
  ];

  const professionalFilterOptions: FilterOption[] = [
    { key: "all", label: "Todos", count: credentials.length },
    { key: "pending", label: "Pendientes", count: pendingCredentials.length },
    {
      key: "verified",
      label: "Verificados",
      count: credentials.filter((item) => item.verification_status === "verified")
        .length,
    },
    {
      key: "rejected",
      label: "Rechazados",
      count: credentials.filter((item) => item.verification_status === "rejected")
        .length,
    },
  ];

  const userFilterOptions: FilterOption[] = [
    { key: "all", label: "Todos", count: users.length },
    {
      key: "nurse",
      label: "Enfermeras",
      count: users.filter((user) => user.role === "nurse").length,
    },
    {
      key: "institution",
      label: "Instituciones",
      count: users.filter((user) => user.role === "institution").length,
    },
    {
      key: "admin",
      label: "Admins",
      count: users.filter((user) => user.role === "admin").length,
    },
  ];

  const documentFilterOptions: FilterOption[] = [
    { key: "all", label: "Todos", count: documents.length },
    {
      key: "pdf",
      label: "PDF",
      count: documents.filter((document) => documentKind(document) === "pdf")
        .length,
    },
    {
      key: "image",
      label: "Imágenes",
      count: documents.filter((document) => documentKind(document) === "image")
        .length,
    },
    {
      key: "other",
      label: "Otros",
      count: documents.filter((document) => documentKind(document) === "other")
        .length,
    },
  ];

  const pendingFilterOptions: FilterOption[] = [
    { key: "all", label: "Todo", count: pendingTotal },
    {
      key: "institutions",
      label: "Instituciones",
      count: pendingInstitutions.length,
    },
    {
      key: "professionals",
      label: "Profesionales",
      count: pendingCredentials.length,
    },
  ];

  const activeFilterOptions =
    activeTab === "institutions"
      ? institutionFilterOptions
      : activeTab === "professionals"
        ? professionalFilterOptions
        : activeTab === "users"
          ? userFilterOptions
          : activeTab === "documents"
            ? documentFilterOptions
            : pendingFilterOptions;

  const activeFilterValue =
    activeTab === "institutions"
      ? institutionFilter
      : activeTab === "professionals"
        ? professionalFilter
        : activeTab === "users"
          ? userFilter
          : activeTab === "documents"
            ? documentFilter
            : pendingFilter;

  const setActiveFilter = (key: string) => {
    if (activeTab === "institutions") {
      setInstitutionFilter(key as VerificationFilter);
    } else if (activeTab === "professionals") {
      setProfessionalFilter(key as VerificationFilter);
    } else if (activeTab === "users") {
      setUserFilter(key as UserFilter);
    } else if (activeTab === "documents") {
      setDocumentFilter(key as DocumentFilter);
    } else {
      setPendingFilter(key as PendingFilter);
    }
  };

  const searchPlaceholder =
    activeTab === "pending"
      ? "Buscar pendientes por nombre..."
      : activeTab === "institutions"
        ? "Buscar institución, NIT o ciudad..."
        : activeTab === "professionals"
          ? "Buscar profesional, registro o ciudad..."
          : activeTab === "users"
            ? "Buscar nombre, teléfono o ciudad..."
            : "Buscar documento o profesional...";

  const emptyAction = hasActiveFilters ? (
    <Button
      label="Limpiar filtros"
      icon="refresh-outline"
      variant="ghost"
      small
      onPress={clearActiveFilters}
    />
  ) : undefined;

  const tabs: {
    key: AdminTab;
    label: string;
    icon: IconName;
    count: number;
  }[] = [
    {
      key: "pending",
      label: "Pendientes",
      icon: "time-outline",
      count: pendingTotal,
    },
    {
      key: "institutions",
      label: "Instituciones",
      icon: "business-outline",
      count: institutions.length,
    },
    {
      key: "professionals",
      label: "Profesionales",
      icon: "id-card-outline",
      count: credentials.length,
    },
    {
      key: "users",
      label: "Usuarios",
      icon: "people-outline",
      count: users.length,
    },
    {
      key: "documents",
      label: "Documentos",
      icon: "folder-open-outline",
      count: documents.length,
    },
  ];

  const renderInstitutionCards = (items: Institution[]) => (
    <View style={styles.grid}>
      {items.map((institution) => (
        <View
          key={institution.id}
          style={[styles.gridItem, compact && styles.gridItemCompact]}
        >
          <InstitutionCard
            institution={institution}
            documents={documents.filter(
              (document) => document.user_id === institution.created_by
            )}
            busy={busy === institution.id}
            onVerify={() =>
              confirmInstitutionVerification(institution, "verified")
            }
            onReject={() =>
              confirmInstitutionVerification(institution, "rejected")
            }
            onOpenDocument={openDocument}
          />
        </View>
      ))}
    </View>
  );

  const renderCredentialCards = (items: AdminCredential[]) => (
    <View style={styles.grid}>
      {items.map((credential) => (
        <View
          key={credential.user_id}
          style={[styles.gridItem, compact && styles.gridItemCompact]}
        >
          <CredentialCard
            credential={credential}
            documents={documents.filter(
              (document) => document.user_id === credential.user_id
            )}
            busy={busy === credential.user_id}
            onVerify={() =>
              confirmCredentialVerification(credential, "verified")
            }
            onReject={() =>
              confirmCredentialVerification(credential, "rejected")
            }
            onOpenDocument={openDocument}
          />
        </View>
      ))}
    </View>
  );

  const renderUserCards = (items: Profile[]) => (
    <View style={styles.grid}>
      {items.map((user) => (
        <View
          key={user.id}
          style={[styles.gridItem, compact && styles.gridItemCompact]}
        >
          <UserCard
            user={user}
            busy={busyRole === user.id}
            onChangeRole={(role) =>
              confirmRoleChange(user.id, role, user.full_name)
            }
          />
        </View>
      ))}
    </View>
  );

  const renderDocumentCards = (items: CredentialDocument[]) => (
    <View style={styles.grid}>
      {items.map((document) => {
        const owner = users.find((user) => user.id === document.user_id);
        return (
          <View
            key={document.id}
            style={[styles.gridItem, compact && styles.gridItemCompact]}
          >
            <DocumentCard
              document={document}
              owner={owner}
              onOpen={openDocument}
            />
          </View>
        );
      })}
    </View>
  );

  const renderActiveSection = () => {
    if (activeTab === "pending") {
      const pendingCount =
        pendingFilter === "institutions"
          ? filteredPendingInstitutions.length
          : pendingFilter === "professionals"
            ? filteredPendingCredentials.length
            : filteredPendingInstitutions.length +
              filteredPendingCredentials.length;
      const showInstitutions =
        (pendingFilter === "all" || pendingFilter === "institutions") &&
        filteredPendingInstitutions.length > 0;
      const showProfessionals =
        (pendingFilter === "all" || pendingFilter === "professionals") &&
        filteredPendingCredentials.length > 0;

      return (
        <View style={styles.contentSection}>
          <ResultsHeader
            title="Pendientes"
            subtitle="Instituciones y profesionales que esperan tu revisión."
            count={pendingCount}
          />
          {pendingCount === 0 ? (
            <EmptyState
              icon={pendingTotal === 0 ? "checkmark-done-outline" : "search-outline"}
              title={pendingTotal === 0 ? "Todo al día" : "Sin coincidencias"}
              description={
                pendingTotal === 0
                  ? "No hay instituciones ni profesionales pendientes de verificación."
                  : "Ajusta la búsqueda o los filtros para encontrar lo que buscas."
              }
              action={emptyAction}
            />
          ) : (
            <>
              {showInstitutions ? (
                <View style={styles.group}>
                  <GroupHeader
                    icon="business-outline"
                    title="Instituciones pendientes"
                    count={filteredPendingInstitutions.length}
                  />
                  {renderInstitutionCards(filteredPendingInstitutions)}
                </View>
              ) : null}
              {showProfessionals ? (
                <View style={styles.group}>
                  <GroupHeader
                    icon="id-card-outline"
                    title="Profesionales pendientes"
                    count={filteredPendingCredentials.length}
                  />
                  {renderCredentialCards(filteredPendingCredentials)}
                </View>
              ) : null}
            </>
          )}
        </View>
      );
    }

    if (activeTab === "institutions") {
      return (
        <View style={styles.contentSection}>
          <ResultsHeader
            title="Instituciones"
            subtitle="Revisa los datos de la entidad antes de habilitar publicaciones."
            count={filteredInstitutions.length}
          />
          {filteredInstitutions.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title={
                institutions.length === 0 ? "Sin instituciones" : "Sin coincidencias"
              }
              description={
                institutions.length === 0
                  ? "Cuando una cuenta registre una institución aparecerá aquí."
                  : "Ajusta la búsqueda o los filtros para encontrar la institución."
              }
              action={emptyAction}
            />
          ) : (
            renderInstitutionCards(filteredInstitutions)
          )}
        </View>
      );
    }

    if (activeTab === "professionals") {
      return (
        <View style={styles.contentSection}>
          <ResultsHeader
            title="Profesionales"
            subtitle="Comprueba formación, registro y experiencia antes de aprobar."
            count={filteredCredentials.length}
          />
          {filteredCredentials.length === 0 ? (
            <EmptyState
              icon="id-card-outline"
              title={
                credentials.length === 0
                  ? "Sin credenciales"
                  : "Sin coincidencias"
              }
              description={
                credentials.length === 0
                  ? "Los profesionales que completen su perfil aparecerán aquí."
                  : "Ajusta la búsqueda o los filtros para encontrar al profesional."
              }
              action={emptyAction}
            />
          ) : (
            renderCredentialCards(filteredCredentials)
          )}
        </View>
      );
    }

    if (activeTab === "users") {
      return (
        <View style={styles.contentSection}>
          <ResultsHeader
            title="Usuarios y roles"
            subtitle="Administra las cuentas registradas y sus permisos."
            count={filteredUsers.length}
          />
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title={users.length === 0 ? "Sin usuarios" : "Sin coincidencias"}
              description={
                users.length === 0
                  ? "Las cuentas registradas aparecerán aquí."
                  : "Ajusta la búsqueda o los filtros para encontrar la cuenta."
              }
              action={emptyAction}
            />
          ) : (
            renderUserCards(filteredUsers)
          )}
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <ResultsHeader
          title="Documentos"
          subtitle="Previsualiza los archivos que subieron las cuentas."
          count={filteredDocuments.length}
        />
        {filteredDocuments.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title={
              documents.length === 0 ? "Sin documentos" : "Sin coincidencias"
            }
            description={
              documents.length === 0
                ? "Los documentos cargados por las cuentas aparecerán aquí."
                : "Ajusta la búsqueda o los filtros para encontrar el archivo."
            }
            action={emptyAction}
          />
        ) : (
          renderDocumentCards(filteredDocuments)
        )}
      </View>
    );
  };

  return (
    <>
      <Screen
        contentStyle={styles.adminContent}
        refreshing={refreshing}
        onRefresh={refresh}
      >
        <ScreenHeader
          eyebrow="CENTRO DE ADMINISTRACIÓN"
          title="Administración"
          subtitle="Verificaciones, roles y documentos organizados en un solo lugar."
          right={
            <Badge
              label={pendingTotal === 0 ? "Al día" : `${pendingTotal} pendientes`}
              tone={pendingTotal === 0 ? "success" : "warning"}
            />
          }
        />

        {error ? (
          <Notice tone="danger" icon="alert-circle-outline">
            {error}
          </Notice>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryTile
            compact={compact}
            icon="time-outline"
            label="Pendientes"
            value={pendingTotal}
            hint={pendingTotal === 0 ? "Todo al día" : "Requieren revisión"}
            iconColor={colors.warning}
            iconBackground={colors.warningSoft}
            active={activeTab === "pending"}
            onPress={() => selectTab("pending")}
          />
          <SummaryTile
            compact={compact}
            icon="business-outline"
            label="Instituciones"
            value={institutions.length}
            hint={`${pendingInstitutions.length} por verificar`}
            iconColor={colors.primary}
            iconBackground={colors.primarySoft}
            active={activeTab === "institutions"}
            onPress={() => selectTab("institutions")}
          />
          <SummaryTile
            compact={compact}
            icon="id-card-outline"
            label="Profesionales"
            value={credentials.length}
            hint={`${pendingCredentials.length} por verificar`}
            iconColor={colors.info}
            iconBackground={colors.infoSoft}
            active={activeTab === "professionals"}
            onPress={() => selectTab("professionals")}
          />
          <SummaryTile
            compact={compact}
            icon="folder-open-outline"
            label="Documentos"
            value={documents.length}
            hint={documents.length === 1 ? "1 archivo cargado" : "Archivos cargados"}
            iconColor={colors.success}
            iconBackground={colors.successSoft}
            active={activeTab === "documents"}
            onPress={() => selectTab("documents")}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => selectTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={active ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, active && styles.tabCountActive]}>
                  {tab.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.toolbar}>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />
          <FilterChips
            options={activeFilterOptions}
            value={activeFilterValue}
            onChange={setActiveFilter}
          />
        </View>

        {renderActiveSection()}

        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={colors.textSoft}
          />
          <Text style={styles.securityText}>
            Permisos protegidos con RLS. Los roles solo se cambian desde este
            panel mediante funciones seguras de Supabase.
          </Text>
        </View>
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

function SummaryTile({
  compact,
  icon,
  label,
  value,
  hint,
  iconColor,
  iconBackground,
  active,
  onPress,
}: {
  compact: boolean;
  icon: IconName;
  label: string;
  value: number;
  hint: string;
  iconColor: string;
  iconBackground: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.summaryCard,
        { width: compact ? "48%" : "23.5%" },
        active && styles.summaryCardActive,
        pressed && styles.summaryCardPressed,
      ]}
    >
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Ionicons
          name="arrow-forward"
          size={13}
          color={active ? colors.primary : colors.textSoft}
        />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryHint}>{hint}</Text>
    </Pressable>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.searchBox, focused && styles.searchBoxFocused]}>
      <Ionicons
        name="search-outline"
        size={17}
        color={focused ? colors.primary : colors.textSoft}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
        >
          <Ionicons name="close-circle" size={17} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterChips({
  options,
  value,
  onChange,
}: {
  options: FilterOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterRow}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.filterChip, active && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
            {typeof option.count === "number" ? (
              <Text
                style={[
                  styles.filterChipCount,
                  active && styles.filterChipCountActive,
                ]}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ResultsHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <SectionTitle
      title={title}
      subtitle={subtitle}
      action={
        <Badge
          label={`${count} ${count === 1 ? "resultado" : "resultados"}`}
          tone="neutral"
        />
      }
    />
  );
}

function GroupHeader({
  icon,
  title,
  count,
}: {
  icon: IconName;
  title: string;
  count: number;
}) {
  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupHeaderLeft}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={styles.groupHeaderText}>{title}</Text>
      </View>
      <Badge label={String(count)} tone="neutral" />
    </View>
  );
}

function InstitutionCard({
  institution,
  documents,
  busy,
  onVerify,
  onReject,
  onOpenDocument,
}: {
  institution: Institution;
  documents: CredentialDocument[];
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
  onOpenDocument: (document: CredentialDocument) => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.icon}>
          <Ionicons name="business-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{institution.name}</Text>
          <Text style={styles.cardMeta}>
            {institution.institution_type || "Tipo sin registrar"} ·{" "}
            {institution.city}
          </Text>
        </View>
        <VerificationBadge status={institution.verification_status} />
      </View>

      <View style={styles.metaGrid}>
        <MetaItem label="NIT" value={institution.nit || "Sin registrar"} />
        <MetaItem
          label="Tipo"
          value={institution.institution_type || "Sin registrar"}
        />
        <MetaItem label="Ciudad" value={institution.city} />
        <MetaItem
          label="Dirección"
          value={institution.address || "Sin registrar"}
          wide
        />
      </View>

      <DocumentList documents={documents} onOpen={onOpenDocument} />

      {institution.verification_status === "pending" ? (
        <View style={styles.actions}>
          <Button
            label="Verificar"
            icon="checkmark-outline"
            onPress={onVerify}
            loading={busy}
            small
            style={styles.action}
          />
          <Button
            label="Rechazar"
            variant="danger"
            icon="close-outline"
            onPress={onReject}
            disabled={busy}
            small
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );
}

function CredentialCard({
  credential,
  documents,
  busy,
  onVerify,
  onReject,
  onOpenDocument,
}: {
  credential: AdminCredential;
  documents: CredentialDocument[];
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
  onOpenDocument: (document: CredentialDocument) => void;
}) {
  return (
    <Card style={styles.card}>
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
        <VerificationBadge status={credential.verification_status} />
      </View>

      <View style={styles.metaGrid}>
        <MetaItem
          label="Formación"
          value={credential.education || "Sin registrar"}
          wide
        />
        <MetaItem
          label="Registro"
          value={credential.professional_registration || "Sin registrar"}
        />
        <MetaItem
          label="Experiencia"
          value={`${credential.experience_years} año${
            credential.experience_years === 1 ? "" : "s"
          }`}
        />
        <MetaItem
          label="Disponibilidad"
          value={credential.availability_notes || "Sin registrar"}
          wide
        />
      </View>

      {credential.profile?.phone ? (
        <View style={styles.badges}>
          <Badge
            label={credential.profile.phone}
            tone="info"
            icon="call-outline"
          />
        </View>
      ) : null}

      <DocumentList documents={documents} onOpen={onOpenDocument} />

      {credential.verification_status === "pending" ? (
        <View style={styles.actions}>
          <Button
            label="Verificar"
            icon="checkmark-outline"
            onPress={onVerify}
            loading={busy}
            small
            style={styles.action}
          />
          <Button
            label="Rechazar"
            variant="danger"
            icon="close-outline"
            onPress={onReject}
            disabled={busy}
            small
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );
}

function UserCard({
  user,
  busy,
  onChangeRole,
}: {
  user: Profile;
  busy: boolean;
  onChangeRole: (role: Role) => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={user.full_name || "Usuario"} size={40} />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{user.full_name || "Usuario"}</Text>
          <Text style={styles.cardMeta}>
            {user.city || "Ciudad no registrada"}
            {user.phone ? ` · ${user.phone}` : ""}
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
              disabled={active || busy}
              onPress={() => onChangeRole(role)}
              style={styles.roleButton}
            />
          );
        })}
      </View>
    </Card>
  );
}

function DocumentCard({
  document,
  owner,
  onOpen,
}: {
  document: CredentialDocument;
  owner?: Profile;
  onOpen: (document: CredentialDocument) => void;
}) {
  const kind = documentKind(document);

  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.icon}>
          <Ionicons
            name={documentIconName(document)}
            size={19}
            color={colors.primary}
          />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {document.name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {owner
              ? `${owner.full_name} · ${roleLabel(owner.role)}`
              : "Cuenta sin identificar"}
          </Text>
        </View>
        <Badge
          label={documentTypeLabel(document)}
          tone={kind === "pdf" ? "info" : kind === "image" ? "success" : "neutral"}
        />
      </View>

      <View style={styles.docFooter}>
        <Text style={styles.docDate}>
          {formatRelative(document.created_at)}
        </Text>
        <Button
          label="Previsualizar"
          icon="eye-outline"
          variant="secondary"
          small
          onPress={() => onOpen(document)}
        />
      </View>
    </Card>
  );
}

function MetaItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.metaItem, wide && styles.metaItemWide]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function DocumentList({
  documents,
  onOpen,
}: {
  documents: CredentialDocument[];
  onOpen: (document: CredentialDocument) => void;
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
                name={documentIconName(document)}
                size={16}
                color={colors.primary}
              />
            </View>
            <View style={styles.documentText}>
              <Text style={styles.documentName} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.documentMeta} numberOfLines={1}>
                {formatRelative(document.created_at)}
              </Text>
            </View>
            <Pressable
              onPress={() => onOpen(document)}
              style={({ pressed }) => [
                styles.documentOpen,
                pressed && styles.documentOpenPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${document.name}`}
            >
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function documentKind(
  document: CredentialDocument
): "pdf" | "image" | "other" {
  if (
    document.mime_type === "application/pdf" ||
    /\.pdf$/i.test(document.name)
  ) {
    return "pdf";
  }
  if (
    document.mime_type?.startsWith("image/") === true ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(document.name)
  ) {
    return "image";
  }
  return "other";
}

function documentTypeLabel(document: CredentialDocument) {
  const kind = documentKind(document);
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "Imagen";
  return "Archivo";
}

function documentIconName(document: CredentialDocument): IconName {
  const kind = documentKind(document);
  if (kind === "pdf") return "document-text-outline";
  if (kind === "image") return "image-outline";
  return "document-attach-outline";
}

const styles = StyleSheet.create({
  adminContent: { maxWidth: 1040 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    minHeight: 132,
    gap: 3,
    ...shadow,
  },
  summaryCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F7FCFA",
  },
  summaryCardPressed: { opacity: 0.86 },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.7,
    lineHeight: 29,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.1,
  },
  summaryHint: { fontSize: 9.5, color: colors.textMuted, lineHeight: 13 },
  tabsScroll: { flexGrow: 0 },
  tabsRow: { gap: 8, paddingRight: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadow,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.white },
  tabCount: {
    minWidth: 18,
    textAlign: "center",
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: "hidden",
  },
  tabCountActive: {
    color: colors.white,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  toolbar: {
    gap: 9,
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow,
  },
  searchBox: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    paddingVertical: 0,
  },
  filterScroll: { flexGrow: 0 },
  filterRow: { gap: 6, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textMuted,
  },
  filterChipTextActive: { color: colors.white },
  filterChipCount: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.textSoft,
  },
  filterChipCountActive: { color: "rgba(255,255,255,0.72)" },
  contentSection: { gap: 12 },
  group: { gap: 9 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: 2,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupHeaderText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    alignItems: "stretch",
  },
  gridItem: { width: "48.5%" },
  gridItemCompact: { width: "100%" },
  card: { gap: 12, padding: 16 },
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
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.1,
  },
  cardMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    width: "48%",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 2,
  },
  metaItemWide: { width: "100%" },
  metaLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 15,
  },
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
  docFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  docDate: { fontSize: 10, color: colors.textMuted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: { flexGrow: 1 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  roleButton: { flexGrow: 1 },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSoft,
  },
});
