import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface RiskScoreRingProps {
    score: number;        // 0-100
    label: string;
    size?: number;
    strokeWidth?: number;
    delay?: number;
}

function getColor(score: number) {
    if (score >= 70) return "#7C9E87"; // green — positive
    if (score >= 40) return "#D4A853"; // amber — moderate
    return "#C4714F";                   // terracotta — flag
}

function getBackground(score: number) {
    if (score >= 70) return "#F0F5F1";
    if (score >= 40) return "#FBF5E8";
    return "#FAF0EB";
}

/**
 * Animated circular score ring — fills on mount using framer-motion.
 * Color shifts green → amber → terracotta based on score.
 */
export default function RiskScoreRing({
    score,
    label,
    size = 120,
    strokeWidth = 10,
    delay = 0,
}: RiskScoreRingProps) {
    const [animated, setAnimated] = useState(false);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const color = getColor(score);
    const bgColor = getBackground(score);
    const offset = circumference - (animated ? score / 100 : 0) * circumference;

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), delay * 1000 + 200);
        return () => clearTimeout(t);
    }, [delay]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="relative flex items-center justify-center rounded-full"
                style={{ width: size, height: size, background: bgColor }}
            >
                <svg width={size} height={size} className="absolute inset-0 -rotate-90">
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#E8E5E0"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: animated ? offset : circumference }}
                        transition={{ duration: 1.2, ease: "easeOut", delay }}
                    />
                </svg>
                {/* Score text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: delay + 0.6 }}
                    className="relative text-center"
                >
                    <span className="block text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
                    <span className="block text-[10px] text-[#9CA3AF] font-medium">/ 100</span>
                </motion.div>
            </div>
            <span className="text-sm font-medium text-[#2C2C2C] text-center leading-tight">{label}</span>
        </div>
    );
}