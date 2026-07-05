import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

/**
 * Toast notifications banner drawer positioned in bottom-right corner.
 * Renders lists of warnings, errors, and success states dynamically.
 */
export const Toast = () => {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm leading-relaxed ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : toast.type === "error"
                ? "bg-red-50 border-red-100 text-red-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              {toast.type === "info" && (
                <Info className="w-5 h-5 text-blue-500" />
              )}
            </div>

            <div className="flex-1 font-medium">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
