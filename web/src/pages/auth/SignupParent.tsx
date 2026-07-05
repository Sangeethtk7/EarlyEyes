import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const schema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z
        .string()
        .min(8, "At least 8 characters")
        .regex(/[A-Z]/, "Include at least one uppercase letter")
        .regex(/[0-9]/, "Include at least one number"),
    confirm_password: z.string(),
    agreed_to_disclaimer: z.literal(true, {
        errorMap: () => ({ message: "You must agree to continue" }),
    }),
}).refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

type FormData = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", ok: password.length >= 8 },
        { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
        { label: "Number", ok: /[0-9]/.test(password) },
    ];
    const score = checks.filter((c) => c.ok).length;
    const colors = ["bg-red-400", "bg-amber-400", "bg-[#7C9E87]"];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : "bg-[#E8E5E0]"}`} />
                ))}
            </div>
            <div className="flex gap-3">
                {checks.map((c) => (
                    <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? "text-[#7C9E87]" : "text-[#9CA3AF]"}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/**
 * Parent account signup — collects name, email, password, and disclaimer acceptance.
 * On success auto-logs in and navigates to parent dashboard.
 */
export default function SignupParent() {
    const { signupParent, isSigningUpParent } = useAuth();
    const [showPw, setShowPw] = useState(false);
    const [showCpw, setShowCpw] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const password = watch("password", "");

    const onSubmit = (data: FormData) => {
        setApiError(null);
        signupParent(data, { onError: (err: any) => setApiError(err.message) });
    };

    return (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link to="/login" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7C9E87] mb-4">
                        <span className="text-white font-serif font-bold text-2xl">E</span>
                    </Link>
                    <h1 className="font-serif text-3xl font-semibold text-[#2C2C2C]">Create your account</h1>
                    <p className="text-[#6B7280] text-sm mt-1">Start your child's developmental journey</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-[#E8E5E0] p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">Full name</label>
                            <input
                                {...register("full_name")}
                                type="text"
                                placeholder="Jane Smith"
                                className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                            />
                            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">Email address</label>
                            <input
                                {...register("email")}
                                type="email"
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    {...register("password")}
                                    type={showPw ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <PasswordStrength password={password} />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">Confirm password</label>
                            <div className="relative">
                                <input
                                    {...register("confirm_password")}
                                    type={showCpw ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] placeholder-[#C0BDB8] focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87] transition-all text-sm"
                                />
                                <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                                    {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                        </div>

                        {/* Disclaimer checkbox */}
                        <div className="bg-[#F5F4F0] rounded-xl p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    {...register("agreed_to_disclaimer")}
                                    type="checkbox"
                                    className="mt-0.5 w-4 h-4 rounded border-[#D1CEC8] accent-[#7C9E87]"
                                />
                                <span className="text-xs text-[#6B7280] leading-relaxed">
                                    I understand that <strong className="text-[#2C2C2C]">EarlyEyes is a screening tool, not a medical diagnosis</strong>. Results should be discussed with a qualified clinician.
                                </span>
                            </label>
                            {errors.agreed_to_disclaimer && (
                                <p className="text-red-500 text-xs mt-2">{errors.agreed_to_disclaimer.message}</p>
                            )}
                        </div>

                        {apiError && (
                            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{apiError}</div>
                        )}

                        <button
                            type="submit"
                            disabled={isSigningUpParent}
                            className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#7C9E87] hover:bg-[#6B8D76] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSigningUpParent ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : "Create account"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[#6B7280] mt-6">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#7C9E87] font-medium hover:underline">Sign in</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}