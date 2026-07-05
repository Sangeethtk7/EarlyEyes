import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Video,
  History,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

interface ParentLayoutProps {
  children: React.ReactNode;
}

/**
 * Sidebar and top header shell for all Parent Portal routes.
 * Employs a warm, calming sage/slate aesthetic (Apple Health meets Calm).
 */
export const ParentLayout = ({ children }: ParentLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/parent/dashboard", icon: LayoutDashboard },
    { name: "My Children", path: "/parent/children", icon: Users },
    { name: "Upload Video", path: "/parent/upload", icon: Video },
    { name: "History", path: "/parent/history", icon: History },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#E8E5E0] px-4 py-6">
      {/* Brand logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#7C9E87] flex items-center justify-center text-white font-serif font-bold text-lg select-none">
          E
        </div>
        <div>
          <span className="font-serif font-semibold text-lg text-[#2C2C2C] tracking-tight">
            EarlyEyes
          </span>
          <span className="block text-[10px] text-[#7C9E87] font-medium uppercase tracking-wider">
            Parent Portal
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#7C9E87]/10 text-[#7C9E87]"
                  : "text-gray-500 hover:bg-[#FAFAF7] hover:text-[#2C2C2C]"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-[#7C9E87]" : "text-gray-400"}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="border-t border-[#E8E5E0] pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-[#7C9E87]/20 flex items-center justify-center text-[#7C9E87] font-bold text-sm select-none">
            {user?.full_name?.charAt(0) || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-[#2C2C2C] truncate">
              {user?.full_name}
            </span>
            <span className="block text-xs text-gray-400 truncate">
              {user?.email}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-[#FAFAF7]/80 backdrop-blur-md border-b border-[#E8E5E0]/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-[#E8E5E0]/40 rounded-xl"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold bg-[#7C9E87]/15 text-[#7C9E87] px-2.5 py-1 rounded-full select-none">
              <Sparkles className="w-3.5 h-3.5" />
              Empathetic AI screening
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-xs text-gray-400">Signed in as</span>
              <span className="text-xs font-medium text-[#2C2C2C]">
                Parent
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#7C9E87] text-white flex items-center justify-center font-bold text-xs select-none">
              {user?.full_name?.charAt(0) || "P"}
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
                className="relative w-64 max-w-xs flex-1 flex flex-col h-full bg-[#FFFFFF]"
              >
                {/* Close Button overlay */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl"
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
        <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
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

export default ParentLayout;
