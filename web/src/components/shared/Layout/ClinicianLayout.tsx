import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

interface ClinicianLayoutProps {
  children: React.ReactNode;
}

/**
 * Sidebar and top header layout for all Clinician Portal views.
 * Employs a professional, clean indigo-on-white aesthetic (Linear meets Epic).
 */
export const ClinicianLayout = ({ children }: ClinicianLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard Queue", path: "/clinician/dashboard", icon: LayoutDashboard },
    { name: "Manage Patients", path: "/clinician/patients", icon: Users },
    { name: "My Profile", path: "/clinician/profile", icon: UserCircle },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAFAFC] border-r border-[#E2E8F0] px-4 py-6">
      {/* Brand logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-sans font-bold text-lg select-none">
          EE
        </div>
        <div>
          <span className="font-sans font-bold text-base text-[#1E293B] tracking-tight">
            EarlyEyes Clinical
          </span>
          <span className="block text-[10px] text-[#4F46E5] font-semibold uppercase tracking-wider">
            Medical Screening
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-[#4F46E5]/10 text-[#4F46E5]"
                  : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-[#4F46E5]" : "text-[#94A3B8]"}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="border-t border-[#E2E8F0] pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5] font-bold text-sm select-none">
            {user?.full_name?.charAt(0) || "C"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-[#1E293B] truncate">
              {user?.full_name}
            </span>
            <span className="block text-xs text-[#64748B] truncate">
              {user?.email}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Verification Status Badge */}
            {user?.is_verified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 select-none">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Verified Practitioner
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100 select-none animate-pulse">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Pending Credentials Check
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-xs text-[#64748B]">Signed in as</span>
              <span className="text-xs font-semibold text-[#1E293B]">
                Clinician
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-bold text-xs select-none">
              {user?.full_name?.charAt(0) || "C"}
            </div>
          </div>
        </header>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black"
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                className="relative w-64 max-w-xs flex-1 flex flex-col h-full bg-[#FAFAFC]"
              >
                {/* Close Button overlay */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 text-[#94A3B8] hover:bg-gray-100 rounded-xl"
                    aria-label="Close sidebar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {sidebarContent}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic page contents wrapper with fade-in on mount */}
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto bg-[#FFFFFF]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default ClinicianLayout;
