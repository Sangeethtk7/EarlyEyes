import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  UploadCloud,
  FileVideo,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
} from "lucide-react";
import { ParentLayout } from "../../components/shared/Layout/ParentLayout";
import api from "../../lib/axios";
import type { Child } from "../../types";

export default function VideoUpload() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch children profiles
  const { data: childrenData, isLoading: isLoadingChildren } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const res = await api.get("/api/children");
      return res.data?.data as Child[];
    },
  });

  const children = childrenData || [];
  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Step 3: Upload Mutation using Axios to get onUploadProgress
  const uploadMutation = useMutation({
    mutationFn: async (payload: { file: File; childId: string }) => {
      const formData = new FormData();
      formData.append("file", payload.file);
      formData.append("child_id", payload.childId);

      const res = await api.post("/api/videos/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || payload.file.size;
          const current = progressEvent.loaded;
          const percentage = Math.round((current * 100) / total);
          setUploadProgress(percentage);
        },
      });
      return res.data;
    },
    onSuccess: () => {
      setStep(4);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to upload video. Please try again.");
      setUploadProgress(0);
    },
  });

  // Drag and drop events
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/")) {
      setErrorMsg("Please select a valid video file.");
      return;
    }
    const maxBytes = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxBytes) {
      setErrorMsg("Video size exceeds the 500MB limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadSubmit = () => {
    if (!file || !selectedChildId) return;
    setErrorMsg(null);
    setUploadProgress(1);
    uploadMutation.mutate({ file, childId: selectedChildId });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Step Indicators
  const renderStepIndicators = () => {
    return (
      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-300 ${
                step > s
                  ? "bg-[#7C9E87] border-[#7C9E87] text-white"
                  : step === s
                  ? "border-[#7C9E87] text-[#7C9E87] bg-white font-bold"
                  : "border-[#E8E5E0] text-[#9CA3AF] bg-white"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 mx-1 transition-all duration-300 ${
                  step > s ? "bg-[#7C9E87]" : "bg-[#E8E5E0]"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ParentLayout>
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[#E8E5E0] p-6 md:p-8 shadow-sm">
        {/* Navigation & Title Header */}
        <div className="flex items-center justify-between mb-6">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => {
                setErrorMsg(null);
                setStep((prev) => (prev - 1) as any);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#7C9E87] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div className="w-10" />
          )}
          <h2 className="font-serif text-xl font-bold text-[#2C2C2C]">
            {step === 1 && "Select Child"}
            {step === 2 && "Video Guidelines"}
            {step === 3 && "Upload Video"}
            {step === 4 && "Video Uploaded"}
          </h2>
          <div className="w-10" />
        </div>

        {/* Step dots */}
        {step < 4 && renderStepIndicators()}

        {/* Step contents */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <p className="text-sm text-gray-500 text-center">
                Who are we screening today? Please select one child.
              </p>

              {isLoadingChildren ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-gray-50 border border-gray-100 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : children.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#E8E5E0] rounded-2xl">
                  <span className="block text-3xl mb-3">👶</span>
                  <p className="text-sm text-gray-500 mb-4">
                    Add a child profile first to upload screening videos.
                  </p>
                  <Link
                    to="/parent/children"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-[#7C9E87] hover:bg-[#6B8D76] text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add Child Profile
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {children.map((child) => {
                    const isSelected = selectedChildId === child.id;
                    const dob = new Date(child.date_of_birth);
                    const formattedDob = dob.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChildId(child.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 ${
                          isSelected
                            ? "border-2 border-[#7C9E87] bg-[#7C9E87]/5"
                            : "border border-[#E8E5E0] hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#7C9E87]/15 flex items-center justify-center text-[#7C9E87] font-semibold text-sm">
                          {child.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-[#2C2C2C] text-sm truncate">
                            {child.name}
                          </h4>
                          <p className="text-xs text-gray-400">Born {formattedDob}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-[#7C9E87] bg-[#7C9E87]"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                disabled={!selectedChildId}
                onClick={() => setStep(2)}
                className="w-full py-3 bg-[#7C9E87] hover:bg-[#6B8D76] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 mt-8 shadow-sm"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <p className="text-sm text-gray-500 text-center">
                For the best assessment results, please follow these visual recording rules:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#FAFAF7] border border-[#E8E5E0] p-4 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">🌟</span>
                  <h4 className="text-xs font-bold text-[#2C2C2C] mb-1">Good lighting</h4>
                  <p className="text-[11px] text-gray-500">Near a window or bright room</p>
                </div>

                <div className="bg-[#FAFAF7] border border-[#E8E5E0] p-4 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">📏</span>
                  <h4 className="text-xs font-bold text-[#2C2C2C] mb-1">Right distance</h4>
                  <p className="text-[11px] text-gray-500">3–6 feet away from camera</p>
                </div>

                <div className="bg-[#FAFAF7] border border-[#E8E5E0] p-4 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">⏱️</span>
                  <h4 className="text-xs font-bold text-[#2C2C2C] mb-1">2 minutes</h4>
                  <p className="text-[11px] text-gray-500">Let them play naturally</p>
                </div>

                <div className="bg-[#FAFAF7] border border-[#E8E5E0] p-4 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">👀</span>
                  <h4 className="text-xs font-bold text-[#2C2C2C] mb-1">Keep face visible</h4>
                  <p className="text-[11px] text-gray-500">Camera steady, minimal occlusion</p>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-3 bg-[#7C9E87] hover:bg-[#6B8D76] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 mt-8 shadow-sm"
              >
                I'm ready to upload <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <p className="text-sm text-gray-500 text-center">
                Select or drag a video clip of <strong>{selectedChild?.name}</strong>.
              </p>

              {/* Drag Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-all duration-200 min-h-[220px] text-center ${
                  dragActive
                    ? "border-[#7C9E87] bg-[#7C9E87]/5 scale-[1.01]"
                    : file
                    ? "border-[#7C9E87]/40 bg-emerald-50/10"
                    : "border-gray-300 hover:border-gray-400 bg-[#FAFAF7]/50"
                }`}
              >
                <input
                  type="file"
                  id="file-video-input"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadMutation.isPending}
                />

                <div className="p-3 bg-white border border-[#E8E5E0] rounded-2xl shadow-sm mb-3">
                  <UploadCloud className="w-6 h-6 text-[#7C9E87]" />
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#2C2C2C] truncate max-w-xs px-2 flex items-center gap-2 justify-center">
                      <FileVideo className="w-4 h-4 text-[#7C9E87]" />
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Size: {formatBytes(file.size)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-[#2C2C2C] mb-1">
                      Drag & drop your video here
                    </p>
                    <p className="text-xs text-gray-400">
                      or click to browse from files (Max 500MB, video files only)
                    </p>
                  </div>
                )}
              </div>

              {/* Progress and inline error */}
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-[#7C9E87]">
                    <span>Uploading Video...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#E8E5E0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C9E87] h-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Upload failed</p>
                    <p className="text-red-600/90 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {file && !uploadMutation.isPending && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setUploadProgress(0);
                      setErrorMsg(null);
                    }}
                    className="flex-1 py-3 border border-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    Clear File
                  </button>
                )}
                <button
                  onClick={handleUploadSubmit}
                  disabled={!file || uploadMutation.isPending}
                  className="flex-[2] py-3 bg-[#7C9E87] hover:bg-[#6B8D76] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    "Submit Screening Video"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-8 space-y-6"
            >
              <div className="w-16 h-16 bg-[#7C9E87]/15 rounded-full flex items-center justify-center mx-auto text-[#7C9E87]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-semibold text-[#2C2C2C]">
                  Video received! 🎉
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  We're analysing {selectedChild?.name}'s video.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This process usually takes about 10–15 minutes.
                </p>
              </div>

              <button
                onClick={() => navigate("/parent/dashboard")}
                className="inline-flex items-center justify-center px-6 py-3 bg-[#7C9E87] hover:bg-[#6B8D76] text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
              >
                Go to dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ParentLayout>
  );
}
