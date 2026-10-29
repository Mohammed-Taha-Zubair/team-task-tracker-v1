"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamCard from "@/components/TeamCard";
import UserManagement from "@/components/UserManagement";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState("");

  const [myTasks, setMyTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await api.get("/api/teams/");
      setTeams(data || []);
      setTeamsError("");
    } catch (err) {
      setTeamsError(err?.message || "Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const fetchMyTasks = useCallback(async () => {
    try {
      const data = await api.get("/api/tasks/my/");
      setMyTasks(data || []);
    } catch (err) {
      console.error("Failed to load assigned tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/teams/")
      .then((data) => {
        if (active) {
          setTeams(data || []);
          setTeamsError("");
          setLoadingTeams(false);
        }
      })
      .catch((err) => {
        if (active) {
          setTeamsError(err?.message || "Failed to load teams");
          setLoadingTeams(false);
        }
      });

    api
      .get("/api/tasks/my/")
      .then((data) => {
        if (active) {
          setMyTasks(data || []);
          setLoadingTasks(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load assigned tasks:", err);
          setLoadingTasks(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const getStatusBadge = (s) => {
    switch (s) {
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "done":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/80";
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
              {user?.role === "admin"
                ? "Manage teams, assign tasks, and monitor workspace activity."
                : "Collaborate with your team, track assigned tasks, and update your progress."}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border ${
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

        {/* Member View: My Assigned Tasks */}
        {user?.role === "member" && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </span>
                <span>My Assigned Tasks</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {myTasks.length} {myTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            {loadingTasks ? (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">
                Loading your tasks...
              </div>
            ) : myTasks.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No tasks currently assigned to you.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teams/${t.team_id}/tasks/${t.id}`}
                    className="block bg-white border border-slate-200/90 rounded-xl p-4 hover:border-indigo-300 hover:shadow-xs transition group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        #{t.id.slice(-6)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Updated {formatRelativeTime(t.updated_at)}</span>
                      <span className="font-semibold text-indigo-600 group-hover:underline">View &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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

          {teamsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {teamsError}
            </div>
          )}

          {loadingTeams ? (
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
