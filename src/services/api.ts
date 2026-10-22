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

export interface AppApi {
  getProfile(): Promise<Profile>;
  updateProfile(input: {
    fullName: string;
    phone: string;
    city: string;
  }): Promise<Profile>;
  getCredentials(): Promise<NurseCredentials | null>;
  saveCredentials(input: CredentialsInput): Promise<NurseCredentials>;
  getAvailableShifts(): Promise<Shift[]>;
  getShift(id: string): Promise<Shift>;
  getMyApplications(): Promise<Application[]>;
  applyToShift(shiftId: string, note: string): Promise<Application>;
  withdrawApplication(applicationId: string): Promise<void>;
  getMyInstitution(): Promise<Institution | null>;
  createInstitution(input: InstitutionInput): Promise<Institution>;
  getInstitutionShifts(institutionId: string): Promise<Shift[]>;
  publishShift(input: ShiftInput): Promise<Shift>;
  getApplicants(shiftId: string): Promise<Applicant[]>;
  respondToApplication(
    applicationId: string,
    decision: "reviewing" | "accepted" | "rejected"
  ): Promise<void>;
  getAdminData(): Promise<AdminData>;
  setInstitutionVerification(
    institutionId: string,
    status: VerificationStatus
  ): Promise<void>;
  setCredentialVerification(
    userId: string,
    status: VerificationStatus
  ): Promise<void>;
  setUserRole(userId: string, role: Role): Promise<void>;
  getMyDocuments(): Promise<CredentialDocument[]>;
  getAllDocuments(): Promise<CredentialDocument[]>;
  getDocumentUrl(storagePath: string): Promise<string>;
  uploadDocument(file: {
    name: string;
    mimeType: string | null;
    uri: string;
  }): Promise<CredentialDocument>;
  deleteDocument(documentId: string): Promise<void>;
  getNotifications(): Promise<Notification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  getMyConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
  getUnreadMessageCount(): Promise<number>;
  markConversationRead(conversationId: string): Promise<void>;
}
