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
      // Reload team list
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome, {user?.name}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Select a team to view tasks and track real-time activity.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${
                user?.role === "admin"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              Role: {user?.role}
            </span>
          </div>
        </div>

        {/* Admin Only: Create Team Form */}
        {user?.role === "admin" && (
          <div className="mb-10 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-900">Create a New Team</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Organize projects and assign tasks by creating dedicated team spaces.
              </p>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Design Systems, Platform Core"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Brief description of the team's mission"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
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
            <h2 className="text-lg font-bold text-gray-900">Your Teams</h2>
            <span className="text-xs text-gray-500 font-medium">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-gray-500 font-medium text-sm">
              Loading your teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-dashed border-gray-300 p-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-3 text-base font-semibold text-gray-900">
                No teams found
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                {user?.role === "admin"
                  ? "You haven't created any teams yet. Use the form above to create your first team!"
                  : "You are not a member of any teams yet. Ask your team admin to invite your email address."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition p-6"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition truncate">
                      {team.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 shrink-0 ml-2">
                      {team.member_count || (team.members ? team.members.length : 1)}{" "}
                      {(team.member_count || (team.members ? team.members.length : 1)) === 1
                        ? "member"
                        : "members"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-600 line-clamp-2 min-h-[2rem]">
                    {team.description || "No description provided for this team."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>View Team Workspace</span>
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
