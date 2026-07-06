import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Video,
  FileText,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Upload,
} from "lucide-react";
import { ParentLayout } from "../../components/shared/Layout/ParentLayout";
import api from "../../lib/axios";
import type { Video as VideoType } from "../../types";

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; chipClass: string }
> = {
  completed: {
    label: "Ready",
    dotClass: "bg-[#7C9E87] ring-4 ring-[#7C9E87]/20",
    chipClass: "bg-[#7C9E87]/10 text-[#7C9E87] border-[#7C9E87]/20",
  },
  processing: {
    label: "Analysing",
    dotClass: "bg-amber-400 ring-4 ring-amber-400/20",
    chipClass: "bg-amber-50 text-amber-600 border-amber-100",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500 ring-4 ring-red-500/20",
    chipClass: "bg-red-50 text-red-500 border-red-100",
  },
  uploaded: {
    label: "Uploaded",
    dotClass: "bg-blue-500 ring-4 ring-blue-500/20",
    chipClass: "bg-blue-50 text-blue-600 border-blue-100",
  },
};

function formatLocalDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function groupVideosByMonth(videos: VideoType[]) {
  const groups: Record<string, VideoType[]> = {};

  // Sort: descending by upload date
  const sorted = [...videos].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );

  sorted.forEach((v) => {
    const d = new Date(v.uploaded_at);
    const monthYear = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(v);
  });

  return Object.entries(groups);
}

export default function History() {
  const { data: videosData, isLoading, error } = useQuery({
    queryKey: ["parent-videos-history"],
    queryFn: async () => {
      const res = await api.get("/api/videos");
      return res.data?.data as VideoType[];
    },
  });

  const videos = videosData || [];
  const grouped = groupVideosByMonth(videos);

  return (
    <ParentLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-semibold text-[#2C2C2C]">
            Screening history
          </h1>
          <p className="text-[#6B7280] mt-1">
            Timeline of all your submitted developmental videos and reports.
          </p>
        </div>

        {/* Contents */}
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2].map((groupKey) => (
              <div key={groupKey} className="space-y-4">
                <div className="h-6 bg-gray-100 rounded w-24 animate-pulse" />
                <div className="border-l-2 border-gray-100 pl-6 space-y-6">
                  {[1, 2].map((itemKey) => (
                    <div key={itemKey} className="relative flex gap-4 animate-pulse">
                      <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-200" />
                      <div className="w-10 h-10 bg-gray-100 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E5E0] border-dashed">
            <div className="w-16 h-16 bg-[#7C9E87]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-[#7C9E87]" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-2">
              No screenings yet
            </h3>
            <p className="text-[#6B7280] text-sm mb-6 max-w-xs mx-auto">
              You haven't submitted any screening videos yet. Submit a video to start tracking milestones.
            </p>
            <Link
              to="/parent/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C9E87] text-white rounded-xl text-sm font-semibold hover:bg-[#6B8D76] transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload first video
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-6">
                {/* Month header */}
                <h3 className="font-serif text-md font-semibold text-[#2C2C2C] bg-[#FAFAF7] sticky top-16 py-1 z-10">
                  {monthYear}
                </h3>

                {/* Timeline list */}
                <div className="relative border-l border-[#E8E5E0] ml-3 pl-6 space-y-6">
                  {items.map((video) => {
                    const cfg = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;

                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E5E0]/60 p-4 rounded-2xl hover:shadow-xs transition-shadow"
                      >
                        {/* Status timeline dot */}
                        <div
                          className={`absolute -left-[30px] top-[22px] sm:top-1/2 sm:-translate-y-1/2 w-2.5 h-2.5 rounded-full ${cfg.dotClass}`}
                        />

                        {/* Child info */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#7C9E87]/15 text-[#7C9E87] flex items-center justify-center font-serif text-sm font-bold select-none">
                            {video.child_name?.charAt(0) || "C"}
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-sm text-[#2C2C2C]">
                              {video.child_name || "Child"}
                            </h4>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatLocalDate(video.uploaded_at)}
                            </p>
                          </div>
                        </div>

                        {/* Status & CTA */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 border-gray-50 pt-2.5 sm:pt-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.chipClass}`}
                          >
                            {cfg.label}
                          </span>

                          {video.status === "completed" ? (
                            <Link
                              to={`/parent/reports/${video.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#7C9E87] hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View report
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-[#C0BDB8] italic">
                              Analyzing...
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ParentLayout>
  );
}
