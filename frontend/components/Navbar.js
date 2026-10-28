"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function NavbarContent() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isSuperAdmin = (user.role || "").toUpperCase() === "SUPERADMIN";

  return (
    <nav className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Nav Links */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Link
                href="/dashboard"
                className="text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition"
              >
                Team Task Tracker
              </Link>
            </div>

            <div className="hidden sm:flex items-center space-x-1 pl-4 border-l border-slate-200">
              <Link
                href="/dashboard"
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  pathname === "/dashboard"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Dashboard
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/superadmin"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    pathname === "/superadmin"
                      ? "bg-purple-50 text-purple-700 font-bold"
                      : "text-slate-600 hover:text-purple-700 hover:bg-purple-50/50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Superadmin Portal</span>
                </Link>
              )}
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {user.name}
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium tracking-wide border ${
                  (user.role || "").toUpperCase() === "SUPERADMIN"
                    ? "bg-purple-50 text-purple-700 border-purple-200/70"
                    : (user.role || "").toUpperCase() === "ADMIN"
                    ? "bg-blue-50 text-blue-700 border-blue-200/70"
                    : "bg-slate-100 text-slate-700 border-slate-200/70"
                }`}
              >
                {(user.role || "").toUpperCase()}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<div className="w-full h-16 bg-white border-b border-slate-200/80" />}>
      <NavbarContent />
    </Suspense>
  );
}
