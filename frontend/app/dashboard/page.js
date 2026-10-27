"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create team state (Admin only)
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setCreateError("Team name is required");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      await api.post("/api/teams/", {
        name: teamName.trim(),
        description: teamDescription.trim(),
      });

      setTeamName("");
      setTeamDescription("");
      await fetchTeams();
    } catch (err) {
      setCreateError(err?.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

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
          <div className="mb-10 bg-white rounded-xl shadow-xs border border-slate-200/90 p-6">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Create a New Team</h2>
                <p className="text-xs text-slate-500">
                  Organize projects and assign tasks by creating dedicated team spaces.
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Design Systems, Platform Core"
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Brief description of the team's mission"
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating Team..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
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
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="group block bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all p-5"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                      {team.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0 ml-2">
                      {team.member_count || (team.members ? team.members.length : 1)}{" "}
                      {(team.member_count || (team.members ? team.members.length : 1)) === 1
                        ? "member"
                        : "members"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {team.description || "No description provided for this team."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>View Workspace</span>
                    <span aria-hidden="true">&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
