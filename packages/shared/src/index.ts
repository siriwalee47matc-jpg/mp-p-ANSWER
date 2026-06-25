export enum UserRole {
  ADMIN = 'ADMIN',
  INSPECTOR = 'INSPECTOR',
  REVIEWER = 'REVIEWER',
  LEGAL_OFFICER = 'LEGAL_OFFICER',
  EXECUTIVE = 'EXECUTIVE'
}

export enum CaseStatus {
  PENDING = 'PENDING',                     // For newly submitted consumer tips (CONSUMER_TIP)
  UNDER_REVIEW = 'UNDER_REVIEW',           // Under inspection (created by Officer or updated from Tip)
  APPROVED_BLOCKED = 'APPROVED_BLOCKED',   // Approved by reviewer and domain blocked
  REJECTED = 'REJECTED'                    // Rejected/dismissed
}

export enum ProductType {
  FOOD = 'FOOD',
  DRUG = 'DRUG',
  COSMETIC = 'COSMETIC',
  MEDICAL_DEVICE = 'MEDICAL_DEVICE',
  HERBAL = 'HERBAL',
  CLINIC = 'CLINIC',
  HAZARDOUS = 'HAZARDOUS',
  NARCOTIC = 'NARCOTIC'
}

/** ระดับการจัดการความเสี่ยง (Multi-Level Risk Management) */
export enum RiskLevel {
  MANUAL = 'MANUAL',           // ตรวจเมื่อสั่งเท่านั้น
  AUTO_DETECT = 'AUTO_DETECT', // สแกนและแจ้งเตือนอัตโนมัติ
  AUTO_BLOCK = 'AUTO_BLOCK'    // ปิดกั้นอัตโนมัติเมื่อเสี่ยงสูง
}

/** สถานะการปิดกั้นเคส */
export enum BlockStatus {
  NONE = 'NONE',
  BLOCKED = 'BLOCKED'
}

export type ReporterRole = 'CONSUMER' | 'INSPECTOR' | 'SYSTEM';

export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface LawRuleDto {
  id: number;
  section: string;
  lawName: string;
  description: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BlockedDomainDto {
  id: number;
  domain: string;
  reason: string;
  blockedAt: string;
  addedByUserId?: number | null;
}

export interface CaseDto {
  id: string;
  title: string;
  url: string;
  domain: string;
  productType: ProductType;
  productLicenseNumber?: string | null;
  licenseStatus?: string | null;
  whoisInfo?: any | null;
  aiRiskScore?: number | null;
  aiAnalysis?: string | null;
  evidenceImage?: string | null;
  evidenceText?: string | null;
  status: CaseStatus;
  reporterRole: ReporterRole;
  reporterId?: number | null;
  lawRulesConfirmed: LawRuleDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDto {
  id: number;
  caseId?: string | null;
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  details: string;
  createdAt: string;
}

/** Log สแกนจากระบบ Auto-Detect (SYSTEM reporter) */
export interface RiskLogDto {
  id: string;              // caseId
  title: string;
  url: string;
  domain: string;
  score: number;           // aiRiskScore
  level: RiskLevel;        // riskLevel ที่ใช้ตอนสแกน
  analysis: string;        // aiAnalysis
  timestamp: string;       // createdAt
  blockStatus: BlockStatus;
}

/** การตั้งค่าระบบส่วนกลาง */
export interface GlobalConfigDto {
  id: number;
  riskLevel: RiskLevel;
}
