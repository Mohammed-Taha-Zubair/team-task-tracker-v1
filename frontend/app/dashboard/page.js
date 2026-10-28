"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamCard from "@/components/TeamCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters for tasks
  const [taskFilter, setTaskFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const userRole = (user?.role || "").toUpperCase();
  const isSuperAdmin = userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const isMember = userRole === "MEMBER";

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [teamsRes, tasksRes, activitiesRes] = await Promise.all([
        api.get("/api/teams/"),
        api.get("/api/tasks/"),
        api.get("/api/activities/"),
      ]);

      setTeams(teamsRes || []);
      setTasks(tasksRes || []);
      setActivities(activitiesRes || []);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle quick status update by a member or admin directly from dashboard
  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      await api.patch(`/api/tasks/${taskId}/`, { status: newStatus });
      // Update local task state immediately
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      // Refresh activities in background
      api.get("/api/activities/").then((res) => setActivities(res || []));
    } catch (err) {
      alert(err?.message || "Failed to update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter tasks assigned to current member
  const myAssignedTasks = useMemo(() => {
    return tasks.filter((t) => t.assigned_to && t.assigned_to.id === user?.id);
  }, [tasks, user?.id]);

  const filteredAssignedTasks = useMemo(() => {
    if (assignedFilter === "all") return myAssignedTasks;
    return myAssignedTasks.filter((t) => t.status === assignedFilter);
  }, [myAssignedTasks, assignedFilter]);

  const filteredTeamTasks = useMemo(() => {
    if (taskFilter === "all") return tasks;
    return tasks.filter((t) => t.status === taskFilter);
  }, [tasks, taskFilter]);

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "done":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
  };

  const getStatusLabel = (s) => {
    switch (s) {
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return "Pending";
    }
  };

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin
                ? "Manage your teams, assign tasks to members, and oversee team workflows."
                : isSuperAdmin
                ? "Platform Superadmin overview. Access user management and system controls."
                : "View your assigned tasks, update progress, and collaborate with your teams."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold tracking-wide border uppercase ${
                isSuperAdmin
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : isAdmin
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              Role: {userRole || "MEMBER"}
            </span>

            {isSuperAdmin && (
              <Link
                href="/superadmin"
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Superadmin Portal &rarr;
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. ADMIN DASHBOARD VIEW: Team Creation & Team Admin Controls   */}
        {/* ============================================================== */}
        {(isAdmin || isSuperAdmin) && (
          <div className="space-y-4">
            <CreateTeamForm onTeamCreated={loadDashboardData} />
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. MEMBER DASHBOARD VIEW: My Assigned Tasks Highlight          */}
        {/* ============================================================== */}
        {isMember && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-base font-bold text-slate-900">
                    My Assigned Tasks
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tasks assigned directly to you across your teams. You can update status anytime.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                {["all", "pending", "in_progress", "done"].map((statusKey) => (
                  <button
                    key={statusKey}
                    onClick={() => setAssignedFilter(statusKey)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      assignedFilter === statusKey
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {statusKey === "all"
                      ? "All"
                      : statusKey === "in_progress"
                      ? "In Progress"
                      : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                Loading your assigned tasks...
              </div>
            ) : filteredAssignedTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                {myAssignedTasks.length === 0
                  ? "You have no tasks assigned to you right now."
                  : `No assigned tasks with status '${assignedFilter}'.`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 transition shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          #{task.id.slice(-6)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {task.team_name && (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-semibold text-slate-600">Team:</span>
                          <span>{task.team_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* Quick Status Updater */}
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] font-medium text-slate-600">Status:</label>
                        <select
                          disabled={updatingTaskId === task.id}
                          value={task.status}
                          onChange={(e) =>
                            handleQuickStatusChange(task.id, e.target.value)
                          }
                          className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <Link
                        href={task.team_id ? `/teams/${task.team_id}/tasks/${task.id}` : "#"}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. TEAMS SECTION (All Roles)                                   */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAdmin ? "Teams You Lead & Manage" : "My Teams"}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? "Select a team to create tasks, assign work, or invite team members."
                  : "Workspaces you belong to. Click any team to see discussions and progress."}
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              Loading your teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
              {isAdmin || isSuperAdmin
                ? "You haven't created any teams yet. Use the Create Team form above to get started!"
                : "You are not a member of any teams yet. Ask your team administrator to invite your email address."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 4. TASK OVERVIEW & RECENT ACTIVITY (Split Grid)               */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Cross-Team Tasks (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAdmin ? "Task Overview Across Teams" : "Team Task List"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tasks across all teams you belong to.
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                {["all", "pending", "in_progress", "done"].map((statusKey) => (
                  <button
                    key={statusKey}
                    onClick={() => setTaskFilter(statusKey)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      taskFilter === statusKey
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {statusKey === "all"
                      ? "All"
                      : statusKey === "in_progress"
                      ? "In Progress"
                      : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                Loading tasks...
              </div>
            ) : filteredTeamTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No tasks found matching filter '{taskFilter}'.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTeamTasks.slice(0, 10).map((t) => (
                  <div
                    key={t.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={t.team_id ? `/teams/${t.team_id}/tasks/${t.id}` : "#"}
                          className="text-xs font-semibold text-slate-900 hover:text-indigo-600 transition truncate"
                        >
                          {t.title}
                        </Link>
                        {t.team_name && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {t.team_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>
                          Assigned: {t.assigned_to ? t.assigned_to.name : "Unassigned"}
                        </span>
                        <span>&bull;</span>
                        <span>Updated {formatRelativeTime(t.updated_at)}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Recent Activities Timeline (1 col) */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Recent Activities
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time updates across your team workspaces
              </p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                Loading activities...
              </div>
            ) : activities.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No recent activities yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 8).map((act) => (
                  <div
                    key={act.id}
                    className="text-xs p-3 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <p className="text-slate-800 leading-snug font-medium">
                      {act.message}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{act.user?.name || "System"}</span>
                      <span>{formatRelativeTime(act.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
