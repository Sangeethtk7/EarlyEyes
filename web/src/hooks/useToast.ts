import { useUIStore } from "../store/uiStore";

/**
 * Custom hook to trigger user-friendly global toast messages.
 */
export const useToast = () => {
  const addToast = useUIStore((state) => state.addToast);

  const toast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    addToast(message, type);
  };

  return {
    toast,
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };
};

export default useToast;
