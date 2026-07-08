import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const schema = z.object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
    role: z.enum(["parent", "clinician"]),
});

type FormData = z.infer<typeof schema>;

/**
 * Login page — role toggle selects whether to authenticate as a Parent or Clinician.
 * On success the useAuth hook redirects to the appropriate dashboard.
 */
export default function Login() {
    const { login, isLoggingIn } = useAuth();
    const [showPw, setShowPw] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { role: "parent" },
    });

    const selectedRole = watch("role");

    const onSubmit = (data: FormData) => {
        setApiError(null);
        login(data, { onError: (err: any) => setApiError(err.message) });
    };

    return (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Logo + Headline */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7C9E87] mb-4">
                        <span className="text-white font-serif font-bold text-2xl">E</span>
                    </div>
                    <h1 className="font-serif text-3xl font-semibold text-[#2C2C2C]">
                        Welcome back
                    </h1>
                    <p className="text-[#6B7280] text-sm mt-1">
                        Sign in to your EarlyEyes account
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-[#E8E5E0] p-8">
                    {/* Role Toggle */}
                    <div className="flex gap-2 p-1 bg-[#F5F4F0] rounded-xl mb-6">
                        {(["parent", "clinician"] as const).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setValue("role", r)}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                    selectedRole === r
                                        ? "bg-white shadow-sm text-[#2C2C2C]"
                                        : "text-[#9CA3AF] hover:text-[#6B7280]"
                                }`}
                            >
                                {r === "parent" ? "Parent / Guardian" : "Clinician"}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Hidden role field */}
                        <input type="hidden" {...register("role")} />

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
                                Email address
                            </label>
                            <input
                                {...register("email")}
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-[#2C2C2C]">
                                    Password
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-[#7C9E87] hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    {...register("password")}
                                    type={showPw ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {apiError && (
                            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
                                {apiError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#7C9E87] hover:bg-[#6B8D76] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>

                    {/* Footer links */}
                    <div className="mt-6 space-y-2 text-center text-sm text-[#6B7280]">
                        <p>
                            New parent?{" "}
                            <Link
                                to="/signup/parent"
                                className="text-[#7C9E87] font-medium hover:underline"
                            >
                                Create an account
                            </Link>
                        </p>
                        <p>
                            Are you a clinician?{" "}
                            <Link
                                to="/signup/clinician"
                                className="text-[#7C9E87] font-medium hover:underline"
                            >
                                Request access
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
