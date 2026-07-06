import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";

export interface VideoStatusResponse {
  status: "uploaded" | "processing" | "completed" | "failed";
  progress?: number;
}

/**
 * Custom hook that polls GET /api/videos/:id/status every 5 seconds.
 * Stops polling when status is "completed" or "failed".
 */
export const useVideoStatus = (videoId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["video-status", videoId],
    queryFn: async () => {
      const res = await api.get(`/api/videos/${videoId}/status`);
      return res.data?.data as VideoStatusResponse;
    },
    enabled: !!videoId,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state && (state.status === "completed" || state.status === "failed")) {
        return false;
      }
      return 5000;
    },
  });

  const status = data?.status || "uploaded";
  const progress = data?.progress ?? 0;
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  return {
    status,
    progress,
    isComplete,
    isFailed,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};

export default useVideoStatus;
