import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Video, FileText, Clock, CheckCircle, XCircle, Loader2, Upload } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { ParentLayout } from "../../components/shared/Layout/ParentLayout";
import api from "../../lib/axios";
import { formatRelativeDate } from "../../lib/utils";
import type { Video as VideoType } from "../../types";

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    uploaded: { label: "Uploaded", color: "bg-blue-50 text-blue-600 border-blue-100", icon: <Upload className="w-3.5 h-3.5" /> },
    processing: { label: "Analysing", color: "bg-amber-50 text-amber-600 border-amber-100", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    completed: { label: "Ready", color: "bg-[#7C9E87]/10 text-[#7C9E87] border-[#7C9E87]/20", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    failed: { label: "Failed", color: "bg-red-50 text-red-500 border-red-100", icon: <XCircle className="w-3.5 h-3.5" /> },
};

function VideoCard({ video }: { video: VideoType }) {
    const cfg = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E8E5E0] p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C9E87]/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#7C9E87]" />
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                </span>
            </div>
            <p className="text-sm font-semibold text-[#2C2C2C] mb-1">{video.child_name || "Child"}</p>
            <p className="text-xs text-[#9CA3AF] flex items-center gap-1.5 mb-4">
                <Clock className="w-3 h-3" />
                {formatRelativeDate(video.uploaded_at)}
            </p>
            {video.status === "completed" ? (
                <Link
                    to={`/parent/reports/${video.id}`}
                    className="flex items-center gap-2 text-xs font-semibold text-[#7C9E87] hover:underline"
                >
                    <FileText className="w-3.5 h-3.5" /> View report
                </Link>
            ) : (
                <p className="text-xs text-[#C0BDB8]">Report will be ready shortly</p>
            )}
        </motion.div>
    );
}

/**
 * Parent dashboard — greets by name, shows recent video cards, upload CTA.
 */
export default function ParentDashboard() {
    const user = useAuthStore((s) => s.user);

    const { data, isLoading } = useQuery({
        queryKey: ["parent-videos"],
        queryFn: async () => {
            const res = await api.get("/api/videos");
            return res.data?.data as VideoType[];
        },
    });

    const videos = data || [];

    return (
        <ParentLayout>
            <div className="max-w-4xl mx-auto">
                {/* Greeting */}
                <div className="mb-8">
                    <h1 className="font-serif text-3xl font-semibold text-[#2C2C2C]">
                        {greeting()}, {user?.full_name?.split(" ")[0]} 👋
                    </h1>
                    <p className="text-[#6B7280] mt-1">Here's what's happening with your screenings.</p>
                </div>

                {/* Upload CTA */}
                <Link
                    to="/parent/upload"
                    className="flex items-center gap-4 bg-[#7C9E87] hover:bg-[#6B8D76] text-white rounded-2xl p-5 mb-8 transition-all active:scale-[0.99] shadow-sm shadow-[#7C9E87]/30"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">Upload a new video</p>
                        <p className="text-white/70 text-sm">Takes about 2 minutes to record</p>
                    </div>
                </Link>

                {/* Recent videos */}
                <div>
                    <h2 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-4">Recent screenings</h2>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl border border-[#E8E5E0] p-5 animate-pulse">
                                    <div className="w-10 h-10 bg-[#F0F0EE] rounded-xl mb-3" />
                                    <div className="h-4 bg-[#F0F0EE] rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-[#F0F0EE] rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E5E0] border-dashed">
                            <div className="w-16 h-16 bg-[#7C9E87]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Video className="w-8 h-8 text-[#7C9E87]" />
                            </div>
                            <h3 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-2">No screenings yet</h3>
                            <p className="text-[#6B7280] text-sm mb-6 max-w-xs mx-auto">Upload your first home video to get started. Our AI will analyse it in about 15 minutes.</p>
                            <Link to="/parent/upload" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C9E87] text-white rounded-xl text-sm font-semibold hover:bg-[#6B8D76] transition-colors">
                                <Upload className="w-4 h-4" /> Upload first video
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
                        </div>
                    )}
                </div>
            </div>
        </ParentLayout>
    );
}