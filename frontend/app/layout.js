"use client";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Team Task Tracker</title>
        <meta
          name="description"
          content="Collaborative Team Task Tracker built with Django, MongoDB, and Next.js"
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
