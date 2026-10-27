"use client";

import ProtectedPage from "@/components/ProtectedPage";
import { useAuth } from "@/context/AuthContext";

// Dashboard placeholder view, protected from unauthenticated access
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user?.name}!
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                You are currently logged in as a{" "}
                <span className="font-semibold text-indigo-600 capitalize">
                  {user?.role}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <h2 className="text-lg font-semibold text-gray-800">
              Dashboard Overview Placeholder
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Your teams, assigned tasks, and real-time team activities will appear here in the upcoming phases.
            </p>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
