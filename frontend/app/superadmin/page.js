"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import UserManagement from "@/components/UserManagement";
import TeamCard from "@/components/TeamCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function SuperadminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalMembers: 0,
    totalTeams: 0,
    totalTasks: 0,
  });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSuperAdmin = (user?.role || "").toUpperCase() === "SUPERADMIN";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [usersRes, teamsRes, tasksRes] = await Promise.all([
        api.get("/api/users/"),
        api.get("/api/teams/"),
        api.get("/api/tasks/"),
      ]);

      const usersList = usersRes?.users || [];
      const teamsList = teamsRes || [];
      const tasksList = tasksRes || [];

      const adminCount = usersList.filter(
        (u) => (u.role || "").toUpperCase() === "ADMIN"
      ).length;
      const memberCount = usersList.filter(
        (u) => (u.role || "").toUpperCase() === "MEMBER"
      ).length;

      setStats({
        totalUsers: usersList.length,
        totalAdmins: adminCount,
        totalMembers: memberCount,
        totalTeams: teamsList.length,
        totalTasks: tasksList.length,
      });

      setTeams(teamsList);
    } catch (err) {
      setError(err?.message || "Failed to load superadmin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isSuperAdmin) {
        router.replace("/dashboard");
      } else {
        loadData();
      }
    }
  }, [authLoading, isSuperAdmin, router, loadData]);

  if (authLoading || (!isSuperAdmin && loading)) {
    return (
      <ProtectedPage>
        <div className="py-24 text-center text-sm font-medium text-slate-400">
          Checking platform permissions...
        </div>
      </ProtectedPage>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-purple-100 text-purple-700 border border-purple-200">
                Superadmin Portal
              </span>
              <span className="text-xs text-slate-400">Platform Control</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage system users, promote and demote administrators, and oversee all team workspaces.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              &larr; Switch to Team Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* 1. Platform Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Users</span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5">
              {stats.totalUsers}
            </div>
            <span className="text-[11px] text-slate-400">Platform accounts</span>
          </div>

          <div className="bg-white rounded-xl border border-blue-200/80 p-5 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
            <span className="text-xs font-semibold text-blue-700">Team Admins</span>
            <div className="text-2xl font-bold text-blue-900 mt-1.5">
              {stats.totalAdmins}
            </div>
            <span className="text-[11px] text-blue-600/80">Can create & lead teams</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Members</span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5">
              {stats.totalMembers}
            </div>
            <span className="text-[11px] text-slate-400">Standard users</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Teams</span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5">
              {stats.totalTeams}
            </div>
            <span className="text-[11px] text-slate-400">Across platform</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Tasks</span>
            <div className="text-2xl font-bold text-slate-900 mt-1.5">
              {stats.totalTasks}
            </div>
            <span className="text-[11px] text-slate-400">All task statuses</span>
          </div>
        </div>

        {/* 2. User Management (Promote / Demote / User Table) */}
        <div>
          <UserManagement currentUserId={user?.id} onUserChanged={loadData} />
        </div>

        {/* 3. Teams Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">All Team Workspaces</h2>
              <p className="text-xs text-slate-500">Global overview of every team created across the platform.</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {teams.length} {teams.length === 1 ? "Team" : "Teams"}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Loading teams overview...
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No teams created yet on the platform.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
