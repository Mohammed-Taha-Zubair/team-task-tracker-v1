"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamCard from "@/components/TeamCard";
import UserManagement from "@/components/UserManagement";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeams = useCallback(async () => {
    try {
      const data = await api.get("/api/teams/");
      setTeams(data || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/teams/")
      .then((data) => {
        if (active) {
          setTeams(data || []);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || "Failed to load teams");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {user?.name}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select a team to view tasks and track real-time activity.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium tracking-wide border ${
                user?.role === "admin"
                  ? "bg-purple-50 text-purple-700 border-purple-200/70"
                  : "bg-slate-100 text-slate-700 border-slate-200/70"
              }`}
            >
              Role: {user?.role}
            </span>
          </div>
        </div>

        {/* Admin Only: Create Team Form */}
        {user?.role === "admin" && (
          <CreateTeamForm onTeamCreated={fetchTeams} />
        )}

        {/* Admin Only: User Management */}
        {user?.role === "admin" && (
          <UserManagement currentUserId={user?.id} />
        )}

        {/* Teams List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Your Teams</h2>
            <span className="text-xs text-slate-500 font-medium">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 font-medium text-sm">
              Loading your teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8 shadow-2xs">
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                No teams found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {user?.role === "admin"
                  ? "You haven't created any teams yet. Use the form above to create your first team!"
                  : "You are not a member of any teams yet. Ask your team admin to invite your email address."}
              </p>
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
