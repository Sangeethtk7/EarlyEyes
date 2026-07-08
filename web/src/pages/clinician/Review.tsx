import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import { ClinicianLayout } from "../../components/shared/Layout/ClinicianLayout";
import api from "../../lib/axios";
import { useToast } from "../../hooks/useToast";
import type { Report } from "../../types";

function calculateAge(dobStr?: string) {
  if (!dobStr) return "—";
  const birthDate = new Date(dobStr);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (years === 0) {
    return `${months} months`;
  }
  return `${years} years, ${months} months`;
}

function formatScore(score?: number) {
  if (score === undefined) return "0%";
  if (score <= 1) return `${Math.round(score * 100)}%`;
  return `${score}%`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const RISK_BADGES: Record<string, { label: string; textClass: string; bgClass: string }> = {
  low: { label: "Low Concern", textClass: "text-emerald-700", bgClass: "bg-emerald-50 border border-emerald-100" },
  moderate: { label: "Worth Discussing", textClass: "text-amber-700", bgClass: "bg-amber-50 border border-amber-100" },
  high: { label: "We Recommend Follow-up", textClass: "text-rose-700", bgClass: "bg-rose-50 border border-rose-100" },
};

export default function ClinicianReview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clinicianNotes, setClinicianNotes] = useState("");
  const [riskOverride, setRiskOverride] = useState<"confirm" | "low" | "moderate" | "high">("confirm");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch Report details
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["clinician-report", reportId],
    queryFn: async () => {
      const res = await api.get(`/api/reports/${reportId}`);
      return res.data?.data as Report;
    },
    enabled: !!reportId,
  });

  const report = reportData;
  const analysis = report?.analysis;

  // Initialize fields once report loads
  useEffect(() => {
    if (report) {
      setClinicianNotes(report.clinician_notes || "");
      if (report.clinician_risk_override) {
        setRiskOverride(report.clinician_risk_override as any);
      } else {
        setRiskOverride("confirm");
      }
    }
  }, [report]);

  const handleSendReport = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const notesPayload = {
        clinician_notes: clinicianNotes.trim(),
        risk_override: riskOverride === "confirm" ? null : riskOverride,
      };

      // 1. PATCH review notes
      await api.patch(`/api/reports/${reportId}/review`, notesPayload);

      // 2. POST send report to parent
      await api.post(`/api/reports/${reportId}/send`);

      toast("Report review completed and shared with parent.", "success");
      setIsModalOpen(false);
      navigate("/clinician/dashboard");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ClinicianLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-6 bg-slate-100 rounded w-24 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-[400px] bg-slate-50 rounded-2xl animate-pulse" />
            <div className="h-[400px] bg-slate-50 rounded-2xl animate-pulse" />
          </div>
        </div>
      </ClinicianLayout>
    );
  }

  if (error || !report) {
    return (
      <ClinicianLayout>
        <div className="max-w-6xl mx-auto py-16 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-sans font-bold text-lg text-slate-800">
            Failed to load clinical report
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {error ? (error as Error).message : "No report details were returned by the server."}
          </p>
          <Link
            to="/clinician/dashboard"
            className="inline-flex items-center gap-1.5 text-[#4F46E5] text-sm font-bold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </ClinicianLayout>
    );
  }

  const childDob = (report as any).child_date_of_birth;
  const parentName = (report as any).parent_name;

  // Video source setup
  const s3Key = (report as any).video_s3_key || (report as any).s3_key;
  const videoSrc = s3Key
    ? (s3Key.startsWith("http") ? s3Key : `http://localhost:8000/api/videos/stream/${s3Key}`)
    : "/placeholder-video.mp4";

  return (
    <ClinicianLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div>
          <Link
            to="/clinician/dashboard"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#4F46E5] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Two Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT PANEL */}
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <h1 className="font-sans font-bold text-2xl text-[#1E293B]">
                {report.child_name || "Child Profile"}
              </h1>
              <p className="text-xs text-[#64748B] flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                Age: {calculateAge(childDob)}
                <span className="text-slate-300">|</span>
                <Clock className="w-4 h-4 text-slate-400" />
                Uploaded: {formatDate(report.created_at)}
              </p>
            </div>

            {/* HTML5 Video Player */}
            <div className="bg-[#0B0F19] rounded-2xl overflow-hidden border border-slate-200 aspect-video flex items-center justify-center relative shadow-sm">
              <video
                src={videoSrc}
                controls
                className="w-full h-full object-contain"
                poster="/placeholder-video-poster.jpg"
              >
                Your browser does not support playing S3 video streams.
              </video>
            </div>

            {/* Child and Parent Details Info Card */}
            <div className="bg-[#FAFAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
              <h3 className="font-sans font-bold text-sm text-[#1E293B] border-b border-[#E2E8F0] pb-2">
                Patient Demographics
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[#64748B] font-semibold uppercase tracking-wider">
                    Parent Contact
                  </span>
                  <span className="block text-slate-800 font-medium mt-0.5">
                    {parentName || "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[#64748B] font-semibold uppercase tracking-wider">
                    Date of Birth
                  </span>
                  <span className="block text-slate-800 font-medium mt-0.5">
                    {formatDate(childDob)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-6">
            {/* Disclaimer Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Your clinical judgment takes precedence over AI findings. Use this tool
                as screening support, not a diagnostic verdict.
              </p>
            </div>

            {/* AI Findings Section */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="font-sans font-bold text-sm text-[#1E293B]">
                  AI Screening Findings
                </h3>
                {analysis?.risk_level && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      RISK_BADGES[analysis.risk_level]?.bgClass || ""
                    } ${RISK_BADGES[analysis.risk_level]?.textClass || ""}`}
                  >
                    AI: {RISK_BADGES[analysis.risk_level]?.label}
                  </span>
                )}
              </div>

              {analysis ? (
                <div className="space-y-4">
                  {/* Gaze & Eye Contact score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-[#1E293B]">
                      <span>Gaze & Eye Contact</span>
                      <span>{formatScore(analysis.gaze_score)}</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
                        style={{ width: formatScore(analysis.gaze_score) }}
                      />
                    </div>
                  </div>

                  {/* Movement patterns score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-[#1E293B]">
                      <span>Movement Patterns</span>
                      <span>{formatScore(analysis.pose_score)}</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
                        style={{ width: formatScore(analysis.pose_score) }}
                      />
                    </div>
                  </div>

                  {/* Facial expressions score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-[#1E293B]">
                      <span>Facial Expressions</span>
                      <span>{formatScore(analysis.expression_score)}</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
                        style={{ width: formatScore(analysis.expression_score) }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500">
                    <span>Fusion confidence score</span>
                    <span className="font-bold text-slate-700">
                      {formatScore(analysis.confidence)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No automated quantitative results available.
                </div>
              )}

              {/* AI summary text */}
              {report.ai_summary && (
                <div className="pt-2 border-t border-[#E2E8F0]/60 space-y-1.5">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    AI Automated Summary
                  </span>
                  <p className="text-xs text-[#475569] leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    "{report.ai_summary}"
                  </p>
                </div>
              )}
            </div>

            {/* Clinician Review Form */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
              <h3 className="font-sans font-bold text-sm text-[#1E293B] border-b border-[#E2E8F0] pb-3">
                Clinician Evaluation & Notes
              </h3>

              {/* Notes input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Your Clinical Notes
                </label>
                <textarea
                  rows={5}
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  placeholder="Enter observations on child engagement, response indicators, motor traits, or gaze behaviors..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#FAFAFC] text-sm text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all resize-y"
                />
              </div>

              {/* Risk Assessment Button row */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Risk Override / Assessment Verdict
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setRiskOverride("confirm")}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      riskOverride === "confirm"
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Confirm AI
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskOverride("low")}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      riskOverride === "low"
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Override: Low
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskOverride("moderate")}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      riskOverride === "moderate"
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Override: Mod
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskOverride("high")}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      riskOverride === "high"
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Override: High
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm mt-4"
              >
                Send report to parent
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isSubmitting) setIsModalOpen(false);
                }}
                className="fixed inset-0 bg-black/60"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-[#4F46E5]">
                  <FileText className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-sans font-bold text-base text-slate-800">
                    Send report to {parentName || "Parent"}?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This action will share the clinician notes and finalized risk verdict with the parent immediately. This action cannot be undone.
                  </p>
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-xs text-left">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSendReport}
                    className="flex-1 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-bold text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ClinicianLayout>
  );
}
