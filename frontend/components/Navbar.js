"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// Top navigation bar displaying brand, logged-in user profile, and logout
export default function Navbar() {
  const { user, logout } = useAuth();

  // If not logged in, Navbar is not displayed per requirements
  if (!user) {
    return null;
  }

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-xl font-bold tracking-tight text-indigo-600 hover:text-indigo-700 transition"
            >
              Team Task Tracker
            </Link>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-800">
                {user.name}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="text-sm px-3.5 py-1.5 rounded-md font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 border border-gray-300 hover:border-red-200 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
