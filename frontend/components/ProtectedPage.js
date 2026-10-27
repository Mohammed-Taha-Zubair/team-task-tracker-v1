"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Route protection wrapper: guards pages against unauthenticated access
export default function ProtectedPage({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Once loading completes, redirect unauthenticated visitors to /login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // While checking auth status, show "Loading..."
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-600 font-medium text-base">
        Loading...
      </div>
    );
  }

  // If not authenticated, render nothing while redirect takes effect
  if (!user) {
    return null;
  }

  // Render protected child components
  return <>{children}</>;
}
