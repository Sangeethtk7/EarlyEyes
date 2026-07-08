import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import { ClinicianLayout } from "../../components/shared/Layout/ClinicianLayout";
import { useAuthStore } from "../../store/authStore";

export default function Profile() {
  const user = useAuthStore((state) => state.user);

  // Extract initials
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CL";

  // Format created_at or default to recent date
  const memberSince = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : "July 2026";

  // Clinician details fall back to mock/standard values if not present on user object
  const specialty = (user as any)?.specialty || "Pediatric Neurology";
  const institution = (user as any)?.institution || "Children's National Hospital";
  const medicalLicense = (user as any)?.medical_license || "LIC-98234-MD";

  return (
    <ClinicianLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center"
      >
        <div className="w-full max-w-[600px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-8">
          {/* Avatar & Basic Info */}
          <div className="flex flex-col items-center text-center pb-8 border-b border-gray-100">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-md shadow-indigo-100">
              {initials}
            </div>
            <h1 className="text-2xl font-bold text-[#1E293B] font-serif">
              {user?.full_name || "Clinician Account"}
            </h1>
            <p className="text-sm text-[#475569] mt-1">{user?.email}</p>
          </div>

          {/* Info Grid */}
          <div className="py-6 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Professional Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Specialty
                </span>
                <span className="block text-sm font-semibold text-[#1E293B] mt-1">
                  {specialty}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Institution
                </span>
                <span className="block text-sm font-semibold text-[#1E293B] mt-1">
                  {institution}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Medical License
                </span>
                <span className="block text-[#1E293B] text-sm font-mono font-semibold mt-1">
                  {medicalLicense}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Member since
                </span>
                <span className="block text-sm font-semibold text-[#1E293B] mt-1">
                  {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Status Badge */}
          <div className="pt-6 pb-4">
            {user?.is_verified ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Account verified</h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Your credentials have been reviewed and approved.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3.5">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Verification pending</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Our team is reviewing your credentials. You'll receive an email once approved (24–48 hours).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Support Note */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              Need to update your credentials? Contact{" "}
              <a
                href="mailto:support@earlyeyes.app"
                className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
              >
                support@earlyeyes.app
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </ClinicianLayout>
  );
}
