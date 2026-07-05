import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Clock, Mail } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const SPECIALTIES = [
    "Developmental Pediatrics", "Child Psychiatry", "Clinical Psychology",
    "Occupational Therapy", "Speech-Language Pathology", "Behavioral Analysis",
    "Neurology", "Other",
];

const schema = z.object({
    full_name: z.string().min(2, "Full name required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Include uppercase").regex(/[0-9]/, "Include a number"),
    confirm_password: z.string(),
    medical_license: z.string().min(4, "License number required"),
    specialty: z.string().min(1, "Select a specialty"),
    institution: z.string().min(2, "Institution name required"),
    agreed_to_disclaimer: z.literal(true, { errorMap: () => ({ message: "You must agree to continue" }) }),
}).refine((d) => d.password === d.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

type FormData = z.infer<typeof schema>;

/**
 * Clinician signup — requires license, specialty, and institution.
 * After submission shows a warm pending-verification screen.
 */
export default function SignupClinician() {
    const { signupClinician, isSigningUpClinician, isClinicianSignupSuccess } = useAuth();
    const [showPw, setShowPw] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = (data: FormData) => {
        setApiError(null);
        signupClinician(data, { onError: (err: any) => setApiError(err.message) });
    };

    if (isClinicianSignupSuccess) {
        return (
            <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
                    <div className="w-20 h-20 bg-[#4F46E5]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-[#4F46E5]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1E293B] mb-3">Credentials under review</h2>
                    <p className="text-[#475569] mb-2">Your application has been submitted. Our team will verify your medical credentials within <strong>24–48 hours</strong>.</p>
                    <p className="text-[#475569] text-sm mb-8 flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> We'll email you once your account is approved.</p>
                    <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-xl font-semibold text-sm hover:bg-[#4338CA] transition-colors">
                        Back to sign in
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#4F46E5] mb-4">
                        <span className="text-white font-bold text-xl">EE</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#1E293B]">Clinician registration</h1>
                    <p className="text-[#475569] text-sm mt-1">Your credentials will be verified before access is granted</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-[#E2E8F0] p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Full name</label>
                                <input {...register("full_name")} placeholder="Dr. Jane Smith" className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Email address</label>
                                <input {...register("email")} type="email" placeholder="doctor@hospital.com" className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Password</label>
                            <div className="relative">
                                <input {...register("password")} type={showPw ? "text" : "password"} placeholder="••••••••" className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Confirm password</label>
                            <input {...register("confirm_password")} type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                            {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                        </div>

                        <div className="border-t border-[#E2E8F0] pt-4">
                            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Professional details</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Medical license number</label>
                                    <input {...register("medical_license")} placeholder="e.g. MH-12345" className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                                    {errors.medical_license && <p className="text-red-500 text-xs mt-1">{errors.medical_license.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Specialty</label>
                                    <select {...register("specialty")} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]">
                                        <option value="">Select your specialty</option>
                                        {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {errors.specialty && <p className="text-red-500 text-xs mt-1">{errors.specialty.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#1E293B] mb-1.5">Institution / Hospital</label>
                                    <input {...register("institution")} placeholder="e.g. AIIMS Delhi" className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]" />
                                    {errors.institution && <p className="text-red-500 text-xs mt-1">{errors.institution.message}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#F8FAFC] rounded-xl p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input {...register("agreed_to_disclaimer")} type="checkbox" className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] accent-[#4F46E5]" />
                                <span className="text-xs text-[#475569] leading-relaxed">I confirm that <strong className="text-[#1E293B]">EarlyEyes is a screening tool, not a diagnostic instrument</strong>, and I will apply my clinical judgment to all AI-generated results.</span>
                            </label>
                            {errors.agreed_to_disclaimer && <p className="text-red-500 text-xs mt-2">{errors.agreed_to_disclaimer.message}</p>}
                        </div>

                        {apiError && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{apiError}</div>}

                        <button type="submit" disabled={isSigningUpClinician} className="w-full py-3 rounded-xl font-bold text-white text-sm bg-[#4F46E5] hover:bg-[#4338CA] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {isSigningUpClinician ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit for verification"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[#475569] mt-6">
                        Already registered? <Link to="/login" className="text-[#4F46E5] font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}