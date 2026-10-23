import { requireSupabase } from "@/lib/supabase";
import type {
  AdminData,
  Applicant,
  Application,
  Conversation,
  CredentialDocument,
  CredentialsInput,
  Institution,
  InstitutionInput,
  Message,
  Notification,
  NurseCredentials,
  Profile,
  Role,
  Shift,
  ShiftInput,
  VerificationStatus,
} from "@/types";
import type { AppApi } from "./api";

function db() {
  return requireSupabase();
}

async function currentUserId(): Promise<string> {
  const { data, error } = await db().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Debes iniciar sesión.");
  return data.user.id;
}

function normalizeInstitution(value: unknown): Institution | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as Institution) ?? null;
  }
  return value as Institution;
}

function normalizeOne<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

const conversationSelect = `
  id,
  shift_id,
  nurse_id,
  institution_id,
  created_at,
  shift:shifts(id, institution_id, title, city, starts_at, ends_at, status),
  nurse:profiles!conversations_nurse_id_fkey(id, full_name, phone, city, role),
  institution:institutions!conversations_institution_id_fkey(
    id, name, city, verification_status
  )
`;

function normalizeShift(row: Record<string, unknown>): Shift {
  const shift = row as unknown as Shift;
  const institution = normalizeInstitution(row.institution);
  return { ...shift, institution };
}

async function getProfileOnce(userId: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from("profiles")
    .select("id, full_name, phone, city, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export const supabaseApi: AppApi = {
  async getProfile() {
    const userId = await currentUserId();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const profile = await getProfileOnce(userId);
      if (profile) return profile;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
      "Tu perfil aún no está disponible. Ejecuta el SQL de Supabase y vuelve a iniciar sesión."
    );
  },

  async updateProfile(input) {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("profiles")
      .update({
        full_name: input.fullName.trim(),
        phone: input.phone.trim() || null,
        city: input.city.trim() || null,
      })
      .eq("id", userId)
      .select("id, full_name, phone, city, role, created_at")
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async getCredentials() {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("nurse_credentials")
      .select(
        "user_id, professional_type, education, experience_years, professional_registration, verification_status, availability_notes, updated_at"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as NurseCredentials | null) ?? null;
  },

  async saveCredentials(input: CredentialsInput) {
    const { data, error } = await db().rpc("save_my_credentials", {
      p_professional_type: input.professionalType,
      p_education: input.education.trim() || null,
      p_experience_years: input.experienceYears,
      p_professional_registration: input.professionalRegistration.trim() || null,
      p_availability_notes: input.availabilityNotes.trim() || null,
    });

    if (error) throw error;
    return data as NurseCredentials;
  },

  async getAvailableShifts() {
    const { data, error } = await db()
      .from("shifts")
      .select(
        "*, institution:institutions!inner(id, name, city, verification_status)"
      )
      .eq("status", "open")
      .eq("institution.verification_status", "verified")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) =>
      normalizeShift(row as Record<string, unknown>)
    );
  },

  async getShift(id: string) {
    const { data, error } = await db()
      .from("shifts")
      .select(
        "*, institution:institutions(id, name, city, verification_status)"
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return normalizeShift(data as Record<string, unknown>);
  },

  async getMyApplications() {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("applications")
      .select(
        "*, shift:shifts(*, institution:institutions(id, name, city, verification_status))"
      )
      .eq("nurse_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const rawShift = record.shift as Record<string, unknown> | null;
      return {
        ...(record as unknown as Application),
        shift: rawShift ? normalizeShift(rawShift) : null,
      };
    });
  },

  async applyToShift(shiftId: string, note: string) {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("applications")
      .insert({
        shift_id: shiftId,
        nurse_id: userId,
        note: note.trim() || null,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ya tienes una postulación para este turno.");
      }
      throw error;
    }
    return data as Application;
  },

  async withdrawApplication(applicationId: string) {
    const { error } = await db().rpc("withdraw_application", {
      p_application_id: applicationId,
    });
    if (error) throw error;
  },

  async getMyInstitution() {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("institution_members")
      .select("institution:institutions(*)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return normalizeInstitution(
      (data as Record<string, unknown> | null)?.institution
    );
  },

  async createInstitution(input: InstitutionInput) {
    const { data, error } = await db().rpc("create_institution", {
      p_name: input.name.trim(),
      p_nit: input.nit.trim() || null,
      p_type: input.institutionType.trim() || null,
      p_city: input.city.trim(),
      p_address: input.address.trim() || null,
    });

    if (error) throw error;
    return data as Institution;
  },

  async getInstitutionShifts(institutionId: string) {
    const { data, error } = await db()
      .from("shifts")
      .select(
        "*, institution:institutions(id, name, city, verification_status)"
      )
      .eq("institution_id", institutionId)
      .order("starts_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) =>
      normalizeShift(row as Record<string, unknown>)
    );
  },

  async publishShift(input: ShiftInput) {
    const userId = await currentUserId();
    const start = new Date(input.startsAt);
    const end = new Date(input.endsAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      throw new Error("Comprueba la fecha y la hora de inicio y fin.");
    }
    if (start <= new Date()) {
      throw new Error("El turno debe comenzar en el futuro.");
    }
    if (!Number.isFinite(input.paymentAmount) || input.paymentAmount < 0) {
      throw new Error("La remuneración no es válida.");
    }
    if (
      !input.title.trim() ||
      !input.service.trim() ||
      !input.city.trim()
    ) {
      throw new Error("Completa el título, el servicio y la ciudad.");
    }

    const { data: institution, error: institutionError } = await db()
      .from("institutions")
      .select("id, verification_status")
      .eq("id", input.institutionId)
      .single();

    if (institutionError) throw institutionError;
    if (institution.verification_status !== "verified") {
      throw new Error(
        "La institución debe estar verificada para publicar turnos."
      );
    }

    const { data, error } = await db()
      .from("shifts")
      .insert({
        institution_id: input.institutionId,
        created_by: userId,
        title: input.title.trim(),
        service: input.service.trim(),
        city: input.city.trim(),
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        payment_amount: input.paymentAmount,
        payment_currency: "COP",
        fulfillment_mode: input.fulfillmentMode,
        status: "open",
        requirements: input.requirements.trim() || null,
      })
      .select(
        "*, institution:institutions(id, name, city, verification_status)"
      )
      .single();

    if (error) throw error;
    return normalizeShift(data as Record<string, unknown>);
  },

  async getApplicants(shiftId: string) {
    const { data, error } = await db()
      .from("applications")
      .select(
        "*, nurse:profiles!applications_nurse_id_fkey(id, full_name, phone, city, role)"
      )
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const applications = (data ?? []) as unknown as Application[];
    const nurseIds = applications.map((application) => application.nurse_id);

    if (nurseIds.length === 0) return [];

    const { data: credentialsData, error: credentialsError } = await db()
      .from("nurse_credentials")
      .select(
        "user_id, professional_type, education, experience_years, professional_registration, verification_status, availability_notes, updated_at"
      )
      .in("user_id", nurseIds);

    if (credentialsError) throw credentialsError;

    const credentialsByUser = new Map(
      ((credentialsData ?? []) as NurseCredentials[]).map((credentials) => [
        credentials.user_id,
        credentials,
      ])
    );

    return applications.map((application) => ({
      application,
      nurse: application.nurse ?? null,
      credentials: credentialsByUser.get(application.nurse_id) ?? null,
    })) as Applicant[];
  },

  async respondToApplication(applicationId, decision) {
    const { error } = await db().rpc("respond_to_application", {
      p_application_id: applicationId,
      p_decision: decision,
    });
    if (error) throw error;
  },

  async getAdminData() {
    const [institutionsResult, credentialsResult, usersResult] =
      await Promise.all([
        db()
          .from("institutions")
          .select("*")
          .order("created_at", { ascending: false }),
        db()
          .from("nurse_credentials")
          .select(
            "*, profile:profiles!nurse_credentials_user_id_fkey(id, full_name, city, role)"
          )
          .order("updated_at", { ascending: false }),
        db()
          .from("profiles")
          .select("id, full_name, phone, city, role, created_at")
          .order("created_at", { ascending: true }),
      ]);

    if (institutionsResult.error) throw institutionsResult.error;
    if (credentialsResult.error) throw credentialsResult.error;
    if (usersResult.error) throw usersResult.error;

    const credentials = (credentialsResult.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const profileValue = record.profile;
      const profile = Array.isArray(profileValue)
        ? ((profileValue[0] as Profile) ?? null)
        : ((profileValue as Profile | null) ?? null);
      return {
        ...(record as unknown as NurseCredentials),
        profile,
      };
    });

    return {
      institutions: (institutionsResult.data ?? []) as Institution[],
      credentials,
      users: (usersResult.data ?? []) as Profile[],
    } as AdminData;
  },

  async setInstitutionVerification(
    institutionId: string,
    status: VerificationStatus
  ) {
    const { error } = await db().rpc("admin_set_institution_verification", {
      p_institution_id: institutionId,
      p_status: status,
    });
    if (error) throw error;
  },

  async setCredentialVerification(
    userId: string,
    status: VerificationStatus
  ) {
    const { error } = await db().rpc("admin_set_credential_verification", {
      p_user_id: userId,
      p_status: status,
    });
    if (error) throw error;
  },

  async setUserRole(userId: string, role: Role) {
    const { error } = await db().rpc("admin_set_role", {
      p_user_id: userId,
      p_role: role,
    });
    if (error) throw error;
  },

  async getMyDocuments() {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("credential_documents")
      .select("id, user_id, name, storage_path, mime_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CredentialDocument[];
  },

  async getAllDocuments() {
    const { data, error } = await db()
      .from("credential_documents")
      .select("id, user_id, name, storage_path, mime_type, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CredentialDocument[];
  },

  async getDocumentUrl(storagePath: string) {
    const { data, error } = await db()
      .storage.from("documents")
      .createSignedUrl(storagePath, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  },

  async getDocumentDownloadUrl(storagePath: string, fileName: string) {
    const { data, error } = await db()
      .storage.from("documents")
      .createSignedUrl(storagePath, 60 * 10, { download: fileName });
    if (error) throw error;
    return data.signedUrl;
  },

  async uploadDocument(file: {
    name: string;
    mimeType: string | null;
    uri: string;
  }) {
    const userId = await currentUserId();
    const response = await fetch(file.uri);
    const buffer = await response.arrayBuffer();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await db()
      .storage.from("documents")
      .upload(path, buffer, {
        contentType: file.mimeType ?? "application/octet-stream",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data, error } = await db()
      .from("credential_documents")
      .insert({
        user_id: userId,
        name: file.name,
        storage_path: path,
        mime_type: file.mimeType,
      })
      .select("id, user_id, name, storage_path, mime_type, created_at")
      .single();
    if (error) throw error;
    return data as CredentialDocument;
  },

  async deleteDocument(documentId: string) {
    const userId = await currentUserId();
    const { data: existing } = await db()
      .from("credential_documents")
      .select("storage_path")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.storage_path) {
      await db().storage.from("documents").remove([existing.storage_path]);
    }
    const { error } = await db()
      .from("credential_documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async getNotifications() {
    const userId = await currentUserId();
    const { data, error } = await db()
      .from("notifications")
      .select("id, user_id, title, body, data, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async markNotificationRead(notificationId: string) {
    const { error } = await db()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    if (error) throw error;
  },

  async getMyConversations() {
    const { data, error } = await db()
      .from("conversations")
      .select(conversationSelect)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const conversations = ((data ?? []) as unknown as Record<string, unknown>[]).map(
      (row) =>
        ({
          ...(row as unknown as Conversation),
          shift: normalizeOne<NonNullable<Conversation["shift"]>>(row.shift),
          nurse: normalizeOne<NonNullable<Conversation["nurse"]>>(row.nurse),
          institution: normalizeOne<Institution>(row.institution),
        }) as Conversation
    );

    if (conversations.length === 0) return [];

    const { data: messages, error: messagesError } = await db()
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .in(
        "conversation_id",
        conversations.map((conversation) => conversation.id)
      )
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    const lastByConversation = new Map<string, Message>();
    for (const message of (messages ?? []) as Message[]) {
      lastByConversation.set(message.conversation_id, message);
    }

    return conversations.map((conversation) => ({
      ...conversation,
      last_message: lastByConversation.get(conversation.id) ?? null,
    }));
  },

  async getConversation(conversationId: string) {
    const { data, error } = await db()
      .from("conversations")
      .select(conversationSelect)
      .eq("id", conversationId)
      .single();

    if (error) throw error;

    const row = data as unknown as Record<string, unknown>;
    return {
      ...(row as unknown as Conversation),
      shift: normalizeOne<NonNullable<Conversation["shift"]>>(row.shift),
      nurse: normalizeOne<NonNullable<Conversation["nurse"]>>(row.nurse),
      institution: normalizeOne<Institution>(row.institution),
    } as Conversation;
  },

  async getConversationMessages(conversationId: string) {
    const { data, error } = await db()
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Message[];
  },

  async sendMessage(conversationId: string, body: string) {
    const userId = await currentUserId();
    const cleanBody = body.trim();
    if (!cleanBody) throw new Error("Escribe un mensaje.");
    if (cleanBody.length > 4000) {
      throw new Error("El mensaje no puede superar 4000 caracteres.");
    }

    const { data, error } = await db()
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: cleanBody,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (error) throw error;
    return data as Message;
  },

  async getUnreadMessageCount() {
    const userId = await currentUserId();
    const { count, error } = await db()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) throw error;
    return count ?? 0;
  },

  async markConversationRead(conversationId: string) {
    const userId = await currentUserId();
    const { error } = await db()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) throw error;
  },
};
