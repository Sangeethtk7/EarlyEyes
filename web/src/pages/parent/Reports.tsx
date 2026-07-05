import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ParentLayout } from "../../components/shared/Layout/ParentLayout";
import RiskScoreRing from "../../components/parent/RiskScoreRing";
import api from "../../lib/axios";
import { formatDate } from "../../lib/utils";
import type { Report } from "../../types";

const RISK_BADGE: Record<string, { label: string; bg: string; text: string }> = {
    low: { label: "Low Concern", bg: "bg-[#7C9E87]/10", text: "text-[#7C9E87]" },
    moderate: { label: "Worth Discussing", bg: "bg-[#D4A853]/10", text: "text-[#D4A853]" },
    high: { label: "We Recommend Follow-up", bg: "bg-[#C4714F]/10", text: "text-[#C4714F]" },
};

const EXPLANATIONS: Record<string, Record<string, string>> = {
    gaze: {
        low: "Your child's gaze patterns showed frequent eye contact and social engagement — a positive developmental sign.",
        moderate: "Your child's eye contact was present but varied. This is worth exploring further with a clinician.",
        high: "Our AI noticed reduced eye contact patterns. A clinician should review this in context of your child's full development.",
    },
    pose: {
        low: "Your child's movement patterns looked typical — relaxed, varied, and age-appropriate.",
        moderate: "Some movement patterns were noted as worth monitoring. This alone is not cause for concern.",
        high: "Our AI noted some repetitive movement patterns. A clinician will help put this in full context.",
    },
    expression: {
        low: "Your child showed a healthy range of facial expressions and social smiling — great signs.",
        moderate: "Facial expressions were present but the range was narrower than typical. Worth discussing with your paediatrician.",
        high: "Our AI observed reduced variety in facial expressions. This can have many explanations — a clinician will review.",
    },
};

const NEXT_STEPS: Record<string, string[]> = {
    low: ["Continue regular well-child visits with your paediatrician", "Keep track of your child's developmental milestones", "You can upload another video in 3–6 months"],
    moderate: ["Book a developmental check with your paediatrician", "Ask about an M-CHAT-R screening at your next visit", "Our clinician will review this report and reach out"],
    high: ["Book a developmental paediatrician appointment as soon as possible", "Request a formal M-CHAT-R or ADOS screening", "Bring this report to your next appointment — you can download it below"],
};

const OVERALL_TEXT: Record<string, string> = {
    low: "Based on what we observed, your child's developmental indicators look reassuring. Every child develops at their own pace, and this screening is just one data point. A clinician will review this and reach out if there's anything to discuss.",
    moderate: "Our AI flagged some patterns worth exploring. This doesn't mean anything is wrong — many children show variable patterns at different ages. We recommend discussing these findings with a developmental paediatrician who can provide proper context.",
    high: "Our AI identified several indicators that our clinical team will review carefully. We want to be honest with you while also reminding you that a screening tool is just the first step. A qualified clinician will reach out to walk you through these findings and recommend the right next steps.",
};

function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white rounded-2xl border border-[#E8E5E0]">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-semibold text-[#2C2C2C]">{title}</span>
                {open ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
            </button>
            {open && <div className="px-5 pb-5 text-sm text-[#6B7280] leading-relaxed border-t border-[#E8E5E0] pt-4">{children}</div>}
        </div>
    );
}

/**
 * The main report page — warm, empathetic, never uses "autism" or "diagnosis".
 */
export default function ReportPage() {
    const { reportId } = useParams<{ reportId: string }>();

    const { data, isLoading, error } = useQuery({
        queryKey: ["report", reportId],
        queryFn: async () => {
            const res = await api.get(`/api/reports/${reportId}`);
            return res.data?.data as Report;
        },
        enabled: !!reportId,
    });

    if (isLoading) {
        return (
            <ParentLayout>
                <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
                    <div className="h-8 bg-[#E8E5E0] rounded-xl w-1/3" />
                    <div className="h-48 bg-[#E8E5E0] rounded-2xl" />
                    <div className="h-32 bg-[#E8E5E0] rounded-2xl" />
                </div>
            </ParentLayout>
        );
    }

    if (error || !data) {
        return (
            <ParentLayout>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="font-serif text-xl font-semibold text-[#2C2C2C] mb-2">Report not found</h2>
                    <Link to="/parent/dashboard" className="text-[#7C9E87] text-sm hover:underline">← Back to dashboard</Link>
                </div>
            </ParentLayout>
        );
    }

    const analysis = data.analysis;
    const riskLevel = (analysis?.risk_level || "low") as "low" | "moderate" | "high";
    const badge = RISK_BADGE[riskLevel];

    return (
        <ParentLayout>
            <div className="max-w-2xl mx-auto">
                <Link to="/parent/dashboard" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#2C2C2C] mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </Link>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">

                    {/* Header */}
                    <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="font-serif text-2xl font-semibold text-[#2C2C2C]">{data.child_name || "Child"}'s Screening Report</h1>
                                <p className="text-[#9CA3AF] text-sm mt-1">{formatDate(data.created_at)}</p>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
                                {badge.label}
                            </span>
                        </div>

                        {/* Three rings */}
                        {analysis ? (
                            <div className="flex justify-around py-6">
                                <RiskScoreRing score={analysis.gaze_score ?? 0} label="Gaze & Eye Contact" delay={0} />
                                <RiskScoreRing score={analysis.pose_score ?? 0} label="Movement Patterns" delay={0.2} />
                                <RiskScoreRing score={analysis.expression_score ?? 0} label="Expressions" delay={0.4} />
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[#9CA3AF] text-sm">Analysis is still being processed…</div>
                        )}
                    </div>

                    {/* What this means */}
                    <div className="bg-[#FAFAF7] rounded-2xl border border-[#E8E5E0] p-6">
                        <h2 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-3">What this means</h2>
                        <p className="text-[#6B7280] text-sm leading-relaxed">{OVERALL_TEXT[riskLevel]}</p>
                    </div>

                    {/* Per-module explanations */}
                    {analysis && (
                        <div className="space-y-3">
                            <h2 className="font-serif text-lg font-semibold text-[#2C2C2C]">Detailed findings</h2>
                            <CollapsibleCard title="👁️ Gaze & Eye Contact">
                                {EXPLANATIONS.gaze[riskLevel]}
                            </CollapsibleCard>
                            <CollapsibleCard title="🤸 Movement Patterns">
                                {EXPLANATIONS.pose[riskLevel]}
                            </CollapsibleCard>
                            <CollapsibleCard title="😊 Facial Expressions">
                                {EXPLANATIONS.expression[riskLevel]}
                            </CollapsibleCard>
                        </div>
                    )}

                    {/* Recommended next steps */}
                    <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6">
                        <h2 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-4">Recommended next steps</h2>
                        <ul className="space-y-3">
                            {NEXT_STEPS[riskLevel].map((step, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-[#6B7280]">
                                    <div className="w-5 h-5 rounded-full bg-[#7C9E87]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-[#7C9E87] text-xs font-bold">{i + 1}</span>
                                    </div>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Clinician notes */}
                    {data.clinician_notes && (
                        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6">
                            <h2 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-[#4F46E5] flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">MD</span>
                                </div>
                                Clinician's note
                            </h2>
                            <p className="text-[#475569] text-sm leading-relaxed">{data.clinician_notes}</p>
                        </div>
                    )}

                    {/* Download */}
                    <button
                        onClick={() => window.open(`/api/reports/${reportId}/pdf`, "_blank")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E8E5E0] text-[#6B7280] text-sm font-medium hover:bg-[#F5F4F0] transition-colors"
                    >
                        <Download className="w-4 h-4" /> Download PDF report
                    </button>

                    {/* Legal disclaimer */}
                    <div className="text-center pb-4">
                        <p className="text-xs text-[#C0BDB8] leading-relaxed max-w-md mx-auto">
                            EarlyEyes is a screening tool, not a diagnostic instrument. Results must be reviewed by a qualified clinician. This report does not constitute a medical diagnosis.
                        </p>
                    </div>
                </motion.div>
            </div>
        </ParentLayout>
    );
}