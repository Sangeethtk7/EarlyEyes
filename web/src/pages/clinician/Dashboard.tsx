import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Users,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ClinicianLayout } from "../../components/shared/Layout/ClinicianLayout";
import api from "../../lib/axios";
import { formatRelativeDate } from "../../lib/utils";

interface QueueItem {
  id: string; // Report ID
  child_name: string;
  child_date_of_birth: string;
  parent_name: string;
  uploaded_at: string;
  status: string;
  risk_level?: "low" | "moderate" | "high";
}

const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  low: {
    label: "Low Concern",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-100",
  },
  moderate: {
    label: "Worth Discussing",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-100",
  },
  high: {
    label: "We Recommend Follow-up",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-100",
  },
};

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
    return `${months}m`;
  }
  return `${years}y ${months}m`;
}

export default function ClinicianDashboard() {
  // Fetch Queue list
  const { data: queueData, isLoading: isLoadingQueue, error: queueError } = useQuery({
    queryKey: ["clinician-queue"],
    queryFn: async () => {
      const res = await api.get("/api/clinician/queue");
      return res.data?.data as QueueItem[];
    },
  });

  // Fetch Patients for Count
  const { data: patientsData, isLoading: isLoadingPatients } = useQuery({
    queryKey: ["clinician-patients"],
    queryFn: async () => {
      const res = await api.get("/api/clinician/patients");
      return res.data?.data as any[];
    },
  });

  const rawQueue = queueData || [];
  // Sort oldest upload first (most urgent)
  const queue = [...rawQueue].sort(
    (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
  );

  const patientsCount = patientsData?.length ?? "—";

  return (
    <ClinicianLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="font-sans font-bold text-2xl text-[#1E293B]">
            Clinical Review Dashboard
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Manage your patient review queue and inspect pending developmental reports.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Stats Card 1: Pending Reviews */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Pending Reviews
              </span>
              <span className="block text-3xl font-bold text-amber-800 mt-2">
                {isLoadingQueue ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                ) : (
                  queue.length
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100/60 flex items-center justify-center text-amber-700">
              <Inbox className="w-6 h-6" />
            </div>
          </div>

          {/* Stats Card 2: Reviewed This Week */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Reviewed This Week
              </span>
              <span className="block text-3xl font-bold text-emerald-800 mt-2">
                —
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100/60 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Stats Card 3: Total Patients */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Total Patients
              </span>
              <span className="block text-3xl font-bold text-indigo-800 mt-2">
                {isLoadingPatients ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                ) : (
                  patientsCount
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100/60 flex items-center justify-center text-indigo-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <h3 className="font-sans font-bold text-base text-[#1E293B]">
              Review Queue
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Prioritized by oldest submission first.
            </p>
          </div>

          {isLoadingQueue ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : queueError ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{queueError.message}</span>
              </div>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 bg-white">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-sans font-semibold text-sm text-[#1E293B]">
                Queue is clear ✓
              </h4>
              <p className="text-xs text-[#64748B] mt-1">No pending reviews found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFC] text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                    <th className="px-6 py-4">Child</th>
                    <th className="px-6 py-4">Age</th>
                    <th className="px-6 py-4">Parent</th>
                    <th className="px-6 py-4">Uploaded</th>
                    <th className="px-6 py-4">AI Risk</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {queue.map((item) => {
                    const risk = item.risk_level || "low";
                    const rCfg = RISK_LEVEL_CONFIG[risk] || RISK_LEVEL_CONFIG.low;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Child info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                              {item.child_name.charAt(0)}
                            </div>
                            <span className="font-sans font-semibold text-sm text-[#1E293B]">
                              {item.child_name}
                            </span>
                          </div>
                        </td>

                        {/* Age */}
                        <td className="px-6 py-4 text-sm text-[#475569]">
                          {calculateAge(item.child_date_of_birth)}
                        </td>

                        {/* Parent */}
                        <td className="px-6 py-4 text-sm text-[#475569]">
                          {item.parent_name}
                        </td>

                        {/* Upload date */}
                        <td className="px-6 py-4 text-sm text-[#475569] whitespace-nowrap">
                          {formatRelativeDate(item.uploaded_at)}
                        </td>

                        {/* AI Risk level */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${rCfg.bgClass} ${rCfg.textClass} ${rCfg.borderClass}`}
                          >
                            {rCfg.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                            {item.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Action link */}
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/clinician/review/${item.id}`}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Review <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClinicianLayout>
  );
}
