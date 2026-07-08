import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  Eye,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { ClinicianLayout } from "../../components/shared/Layout/ClinicianLayout";
import api from "../../lib/axios";
import { useToast } from "../../hooks/useToast";

interface Patient {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  child_id: string;
  child_name: string;
  child_dob: string;
  assigned_at: string;
}

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

export default function Patients() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");

  // Fetch GET /api/clinician/patients
  const {
    data: patientsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["clinician-patients"],
    queryFn: async () => {
      const res = await api.get("/api/clinician/patients");
      return res.data?.data as Patient[];
    },
  });

  // POST /api/clinician/patients/:parentId/assign
  const assignMutation = useMutation({
    mutationFn: async (emailOrId: string) => {
      const res = await api.post(`/api/clinician/patients/${emailOrId}/assign`);
      return res.data;
    },
    onSuccess: (res) => {
      toast(res?.message || "Patient assigned successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["clinician-patients"] });
      setIsModalOpen(false);
      setAssignEmail("");
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to assign patient.";
      toast(errMsg, "error");
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmail.trim()) {
      toast("Please enter a parent email address.", "error");
      return;
    }
    assignMutation.mutate(assignEmail.trim());
  };

  const patients = patientsData || [];

  // Client-side filter by name (parent or child)
  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.parent_name.toLowerCase().includes(query) ||
      p.child_name.toLowerCase().includes(query) ||
      p.parent_email.toLowerCase().includes(query)
    );
  });

  return (
    <ClinicianLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Patients</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your assigned parent accounts and view child records.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          >
            <UserPlus className="w-4 h-4" />
            Assign patient
          </button>
        </div>

        {/* Error State */}
        {isError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  Failed to load patients. Try again.
                </h3>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by parent or child name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Parent
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Child
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Age
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Assigned
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {/* Loading Skeleton */}
                {isLoading &&
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-150 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="inline-block h-8 bg-gray-250 rounded w-16"></div>
                      </td>
                    </tr>
                  ))}

                {/* Empty State */}
                {!isLoading && filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="max-w-md mx-auto">
                        <p className="text-base font-semibold text-gray-900">
                          No patients assigned yet
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Patients are assigned when a parent completes signup and their case is routed to you.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Table Data */}
                {!isLoading &&
                  filteredPatients.map((patient) => (
                    <tr key={patient.child_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {patient.parent_name}
                        </div>
                        <div className="text-xs text-gray-500">{patient.parent_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.child_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateAge(patient.child_dob)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(patient.assigned_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/clinician/patients/${patient.parent_id}`)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-semibold transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Assign Patient Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Body */}
            <div className="flex items-center justify-center min-h-screen p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 z-10"
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-gray-900 font-serif mb-2">
                  Assign Patient
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the email address of the parent account you would like to assign to yourself.
                </p>

                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Parent Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={assignMutation.isPending}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assignMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Assigning…
                        </>
                      ) : (
                        "Assign"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </ClinicianLayout>
  );
}
