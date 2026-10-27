"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Root entry point: automatically redirects visitors to the dashboard
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
