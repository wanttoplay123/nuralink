export type Role = "nurse" | "institution" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type ShiftStatus = "draft" | "open" | "covered" | "cancelled";
export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "withdrawn";
export type FulfillmentMode = "direct" | "managed";
export type ProfessionalType = "nurse" | "nursing_assistant";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  role: Role;
  created_at?: string;
};

export type Institution = {
  id: string;
  name: string;
  nit: string | null;
  institution_type: string | null;
  city: string;
  address: string | null;
  verification_status: VerificationStatus;
  created_by: string;
  created_at?: string;
};

export type InstitutionMember = {
  institution_id: string;
  user_id: string;
  member_role: "owner" | "recruiter";
};

export type NurseCredentials = {
  user_id: string;
  professional_type: ProfessionalType;
  education: string | null;
  experience_years: number;
  professional_registration: string | null;
  verification_status: VerificationStatus;
  availability_notes: string | null;
  updated_at?: string;
};

export type Shift = {
  id: string;
  institution_id: string;
  created_by: string;
  title: string;
  service: string;
  city: string;
  starts_at: string;
  ends_at: string;
  payment_amount: number | null;
  payment_currency: string;
  fulfillment_mode: FulfillmentMode;
  status: ShiftStatus;
  requirements: string | null;
  created_at?: string;
  institution?: {
    id: string;
    name: string;
    city?: string;
    verification_status: VerificationStatus;
  } | null;
};

export type Application = {
  id: string;
  shift_id: string;
  nurse_id: string;
  status: ApplicationStatus;
  note: string | null;
  created_at: string;
  updated_at?: string;
  shift?: Shift | null;
  nurse?: Profile | null;
};

export type Applicant = {
  application: Application;
  nurse: Profile | null;
  credentials: NurseCredentials | null;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export type Conversation = {
  id: string;
  shift_id: string;
  nurse_id: string;
  institution_id: string;
  created_at: string;
  shift?: Shift | null;
  nurse?: Profile | null;
  institution?: Institution | null;
  last_message?: Message | null;
};

export type CredentialDocument = {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
};

export type AdminData = {
  institutions: Institution[];
  credentials: (NurseCredentials & { profile?: Profile | null })[];
  users: Profile[];
};

export type InstitutionInput = {
  name: string;
  nit: string;
  institutionType: string;
  city: string;
  address: string;
};

export type ShiftInput = {
  institutionId: string;
  title: string;
  service: string;
  city: string;
  startsAt: string;
  endsAt: string;
  paymentAmount: number;
  fulfillmentMode: FulfillmentMode;
  requirements: string;
};

export type CredentialsInput = {
  professionalType: ProfessionalType;
  education: string;
  experienceYears: number;
  professionalRegistration: string;
  availabilityNotes: string;
};
