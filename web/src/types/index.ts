/**
 * TypeScript definitions matching backend API schemas.
 */

export interface User {
  id: string;
  email: string;
  role: "parent" | "clinician";
  full_name: string;
  is_verified: boolean;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  gender?: string;
  notes?: string;
  created_at: string;
}

export type VideoStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Video {
  id: string;
  child_id: string;
  child_name?: string; // Loaded on video queries
  status: VideoStatus;
  uploaded_at: string;
  processed_at?: string;
}

export type RiskLevel = "low" | "moderate" | "high";

export interface AnalysisResult {
  id?: string;
  video_id: string;
  gaze_score?: number;
  pose_score?: number;
  expression_score?: number;
  fusion_risk_score?: number;
  risk_level?: RiskLevel;
  confidence?: number;
  gaze_details?: Record<string, any>;
  pose_details?: Record<string, any>;
  expression_details?: Record<string, any>;
}

export type ReportStatus = "pending_review" | "reviewed" | "sent_to_parent";

export interface Report {
  id: string;
  video_id: string;
  child_name?: string; // Hydrated by reports service
  analysis?: AnalysisResult;
  status: ReportStatus;
  ai_summary?: string;
  clinician_notes?: string;
  clinician_risk_override?: RiskLevel | string;
  created_at: string;
  reviewed_at?: string;
  sent_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
}
