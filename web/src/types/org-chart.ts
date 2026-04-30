export interface OrgRole {
  id: number
  code: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface OrgMember {
  id: number
  site_id: number
  name: string
  rank: string | null
  phone: string | null
  email: string | null
  org_type: "OWN" | "JV" | "SUB"
  company_name: string | null
  employee_type: string | null
  role_id: number
  role_code: string
  role_name: string
  role_sort_order: number
  department_id: number | null
  department_name: string | null
  department_sort_order: number | null
  specialty: string | null
  parent_id: number | null
  sort_order: number
  is_active: boolean
  assigned_from: string | null
  assigned_to: string | null
  note: string | null
  // profile columns
  birth_date?: string | null
  address?: string | null
  phone_work?: string | null
  photo_url?: string | null
  job_category?: string | null
  skills?: string | null
  hobby?: string | null
  entry_type?: string | null
  task_detail?: string | null
  resume_data?: Record<string, unknown> | null
}

export type OrgTreeNode = OrgMember & {
  children: OrgTreeNode[]
}

export interface Department {
  id: number
  site_id: number
  name: string
  sort_order: number
  required_count: number
}

// ── Employee (public schema) ──

export interface Employee {
  id: number
  name: string
  nameEn: string
  email: string
  phone: string
  phoneWork: string
  emailWork: string
  position: string
  role: string
  teamId: number
  resumePath: string | null
  photoUrl: string | null
  joinDate: string | null
  resumeData: string | null
  status: string
  userId: number | null
  createdAt: string
  updatedAt: string
  birthDate: string | null
  address: string | null
  jobCategory: string | null
  jobRole: string | null
  employmentType: string | null
  entryType: string | null
  specialty: string | null
  hobby: string | null
  taskDetail: string | null
  skills: string | null
}

export interface TeamInfo {
  id: number
  name: string
  description: string | null
  category: string | null
  locationId: number | null
}

export interface LocationInfo {
  id: number
  company: string
  name: string
  type: string
}

export interface ResumeEducation {
  period?: string
  startDate?: string
  endDate?: string
  school_name: string
  major: string
  degree: string
  location?: string
}

export interface ResumeCertification {
  name: string
  acquisition_date: string
  issuer: string
  license_number?: string
}

export interface ResumeExperience {
  company: string
  position: string
  period?: string
  startDate?: string
  endDate?: string
  task: string
  description: string
}

export interface ResumeAppointment {
  date: string
  department?: string
  position: string
  grade?: string
  duty?: string
  job_role?: string
  description: string
  type?: string
}

export interface ResumeData {
  education: ResumeEducation[]
  certifications: ResumeCertification[]
  experience: ResumeExperience[]
  familyRelations?: { relation: string; name: string; birth_date: string; occupation: string }[]
  appointmentHistory: ResumeAppointment[]
}

export interface EmployeeProfileData {
  employee: Employee
  team: TeamInfo | null
  location: LocationInfo | null
  resume: ResumeData
}

export interface TeamMember {
  id: number
  name: string
  position: string
  role: string
  photoUrl: string | null
  phone: string | null
  email: string | null
  status: string
  jobCategory: string | null
}
