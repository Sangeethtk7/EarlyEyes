import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import api from "../../lib/axios";

/**
 * Forgot password — sends a reset link to the user's email.
 */
export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setError(null);
        try {
            await api.post("/api/auth/forgot-password", { email });
            setSent(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#2C2C2C] mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>

                {sent ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-[#E8E5E0] p-8 text-center">
                        <div className="w-16 h-16 bg-[#7C9E87]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-[#7C9E87]" />
                        </div>
                        <h2 className="font-serif text-xl font-semibold text-[#2C2C2C] mb-2">Check your inbox</h2>
                        <p className="text-[#6B7280] text-sm">We sent a reset link to <strong className="text-[#2C2C2C]">{email}</strong>. It expires in 1 hour.</p>
                        <Link to="/login" className="inline-block mt-6 text-sm text-[#7C9E87] font-medium hover:underline">Return to sign in</Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-[#E8E5E0] p-8">
                        <h2 className="font-serif text-xl font-semibold text-[#2C2C2C] mb-2">Reset your password</h2>
                        <p className="text-[#6B7280] text-sm mb-6">Enter your email and we'll send you a reset link.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-[#FAFAF7] text-[#2C2C2C] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9E87]/40 focus:border-[#7C9E87]"
                                />
                            </div>
                            {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>}
                            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#7C9E87] hover:bg-[#6B8D76] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send reset link"}
                            </button>
                        </form>
                    </div>
                )}
            </motion.div>
        </div>
    );
}