import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Video,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Heart,
  FileText,
} from "lucide-react";
import { ParentLayout } from "../../components/shared/Layout/ParentLayout";
import api from "../../lib/axios";
import { useToast } from "../../hooks/useToast";
import type { Child } from "../../types";

function calculateAge(dobStr: string) {
  const birthDate = new Date(dobStr);
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const yearsText = years > 0 ? `${years} year${years !== 1 ? "s" : ""}` : "";
  const monthsText = months > 0 ? `${months} month${months !== 1 ? "s" : ""}` : "";

  if (yearsText && monthsText) {
    return `${yearsText}, ${monthsText}`;
  } else if (yearsText) {
    return yearsText;
  } else if (monthsText) {
    return monthsText;
  } else {
    return "0 months";
  }
}

export default function Children() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch children
  const { data: childrenData, isLoading, error } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const res = await api.get("/api/children");
      return res.data?.data as Child[];
    },
  });

  const children = childrenData || [];

  // Open slide-over for adding child
  const handleOpenAdd = () => {
    setEditingChild(null);
    setFullName("");
    setDob("");
    setGender("");
    setNotes("");
    setErrorMsg(null);
    setPanelOpen(true);
  };

  // Open slide-over for editing child
  const handleOpenEdit = (child: Child) => {
    setEditingChild(child);
    setFullName(child.name);
    setDob(child.date_of_birth);
    setGender(child.gender || "");
    setNotes(child.notes || "");
    setErrorMsg(null);
    setPanelOpen(true);
  };

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/children", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      toast("Child profile created successfully!", "success");
      setPanelOpen(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create profile. Please try again.");
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (payload: { id: string; data: any }) => {
      const res = await api.patch(`/api/children/${payload.id}`, payload.data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      toast("Child profile updated successfully!", "success");
      setPanelOpen(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save changes. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!dob) {
      setErrorMsg("Date of birth is required.");
      return;
    }

    const payload = {
      name: fullName.trim(),
      date_of_birth: dob,
      gender: gender || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingChild) {
      editMutation.mutate({ id: editingChild.id, data: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  return (
    <ParentLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#2C2C2C]">
              My Children
            </h1>
            <p className="text-[#6B7280] mt-1">Manage child profiles for screening.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7C9E87] text-white rounded-xl text-sm font-semibold hover:bg-[#6B8D76] transition-colors shadow-sm"
          >
            <Plus className="w-4.5 h-4.5" /> Add child
          </button>
        </div>

        {/* List of profiles */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E8E5E0] p-6 animate-pulse space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-10 bg-gray-50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E5E0] border-dashed">
            <div className="w-16 h-16 bg-[#7C9E87]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👶</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-2">
              No child profiles yet
            </h3>
            <p className="text-[#6B7280] text-sm mb-6 max-w-xs mx-auto">
              Add your child's profile to get started with our development screenings.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C9E87] text-white rounded-xl text-sm font-semibold hover:bg-[#6B8D76] transition-colors"
            >
              Add your first child
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map((child) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-[#E8E5E0] p-6 hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar initials */}
                      <div className="w-12 h-12 rounded-full bg-[#7C9E87] text-white flex items-center justify-center font-serif text-lg font-bold select-none">
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-[#2C2C2C]">
                          {child.name}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {calculateAge(child.date_of_birth)}
                        </p>
                      </div>
                    </div>
                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(child)}
                      className="p-2 text-gray-400 hover:text-[#7C9E87] hover:bg-gray-50 rounded-lg transition-all"
                      aria-label="Edit Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 border-t border-[#E8E5E0]/60 pt-4 mb-6">
                    {child.gender && (
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="capitalize">{child.gender}</span>
                      </div>
                    )}
                    {child.notes && (
                      <div className="flex items-start gap-2 text-xs text-[#6B7280]">
                        <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                        <span className="italic line-clamp-2">{child.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTAs */}
                <Link
                  to="/parent/upload"
                  className="w-full py-2.5 bg-[#7C9E87]/10 hover:bg-[#7C9E87] hover:text-white text-[#7C9E87] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Video className="w-4 h-4" /> Upload screening video
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Slide-over panel */}
        <AnimatePresence>
          {panelOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isSaving) setPanelOpen(false);
                }}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              />

              {/* Drawer Container */}
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 220 }}
                  className="w-screen max-w-md bg-white shadow-xl flex flex-col h-full"
                >
                  <div className="px-6 py-5 border-b border-[#E8E5E0] flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#2C2C2C]">
                      {editingChild ? "Edit Child Profile" : "Add Child Profile"}
                    </h3>
                    <button
                      disabled={isSaving}
                      onClick={() => setPanelOpen(false)}
                      className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col justify-between overflow-y-auto"
                  >
                    <div className="p-6 space-y-6">
                      {/* Error Banner */}
                      {errorMsg && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-600 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2C2C2C] mb-1.5 uppercase tracking-wider">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Tommy Smith"
                          className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all"
                        />
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2C2C2C] mb-1.5 uppercase tracking-wider">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all"
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2C2C2C] mb-1.5 uppercase tracking-wider">
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all"
                        >
                          <option value="">Select Gender</option>
                          <option value="Boy">Boy</option>
                          <option value="Girl">Girl</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-[#2C2C2C] mb-1.5 uppercase tracking-wider">
                          Notes / Milestones observed
                        </label>
                        <textarea
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any developmental milestones or observations you would like to share with the clinician..."
                          className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-[#E8E5E0] bg-gray-50 flex gap-3">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setPanelOpen(false)}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-[2] py-3 bg-[#7C9E87] hover:bg-[#6B8D76] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving…
                          </>
                        ) : editingChild ? (
                          "Save changes"
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ParentLayout>
  );
}
