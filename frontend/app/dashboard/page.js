/** @format */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamCard from "@/components/TeamCard";
import UserManagement from "@/components/UserManagement";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

// Helper for status badge styling
function getStatusBadge(status) {
  switch (status) {
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "done":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return "Pending";
  }
}

/* ========================================================================= */
/* 1. SUPERADMIN VIEW: System stats, user promotion/demotion, all teams      */
/* ========================================================================= */
function SuperadminDashboardView({ user }) {
  const [stats, setStats] = useState({
    users: 0,
    admins: 0,
    members: 0,
    teams: 0,
    tasks: 0,
  });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, teamsRes, tasksRes] = await Promise.all([
        api.get("/api/users/"),
        api.get("/api/teams/"),
        api.get("/api/tasks/"),
      ]);

      const usersList = usersRes?.users || [];
      const teamsList = teamsRes || [];
      const tasksList = tasksRes || [];

      setStats({
        users: usersList.length,
        admins: usersList.filter(
          (u) => (u.role || "").toUpperCase() === "ADMIN",
        ).length,
        members: usersList.filter(
          (u) => (u.role || "").toUpperCase() === "MEMBER",
        ).length,
        teams: teamsList.length,
        tasks: tasksList.length,
      });

      setTeams(teamsList);
    } catch (err) {
      console.error("Superadmin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
          Superadmin Control Center
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Welcome, {user?.name}!
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage application users, promote members to admin, and oversee all
          platform workspaces.
        </p>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">
            Total Users
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.users}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <span className="text-xs text-blue-700 font-semibold">
            Total Admins
          </span>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {stats.admins}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">
            Total Members
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.members}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">
            Total Teams
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.teams}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">
            Total Tasks
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats.tasks}
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div>
        <UserManagement currentUserId={user?.id} onUserChanged={loadData} />
      </div>

      {/* All Teams Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            All Platform Teams
          </h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {teams.length} teams
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No teams created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. ADMIN VIEW: Team creation, my teams, team task overview, activity       */
/* ========================================================================= */
function AdminDashboardView({ user }) {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [taskFilter, setTaskFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamsRes, tasksRes, actRes] = await Promise.all([
        api.get("/api/teams/"),
        api.get("/api/tasks/"),
        api.get("/api/activities/"),
      ]);
      setTeams(teamsRes || []);
      setTasks(tasksRes || []);
      setActivities(actRes || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return tasks;
    return tasks.filter((t) => t.status === taskFilter);
  }, [tasks, taskFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
          Admin Workspace
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Welcome, {user?.name}!
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create teams, invite members, assign tasks, and track team progress.
        </p>
      </div>

      {/* Create Team Form */}
      <div>
        <CreateTeamForm onTeamCreated={loadData} />
      </div>

      {/* My Teams */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Teams You Lead</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {teams.length} {teams.length === 1 ? "team" : "teams"}
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            You haven't created any teams yet. Use the form above to start your
            first team workspace!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        )}
      </div>

      {/* Task Overview & Activities Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tasks (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Task Overview
            </h3>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
              {["all", "pending", "in_progress", "done"].map((key) => (
                <button
                  key={key}
                  onClick={() => setTaskFilter(key)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                    taskFilter === key
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {key === "all"
                    ? "All"
                    : key === "in_progress"
                      ? "In Progress"
                      : key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No tasks found for filter '{taskFilter}'.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={
                        t.team_id ? `/teams/${t.team_id}/tasks/${t.id}` : "#"
                      }
                      className="text-xs font-semibold text-slate-900 hover:text-indigo-600 transition truncate block"
                    >
                      {t.title}
                    </Link>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Assigned:{" "}
                      {t.assigned_to ? t.assigned_to.name : "Unassigned"} &bull;{" "}
                      {t.team_name || "Team"}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getStatusBadge(t.status)}`}
                  >
                    {getStatusLabel(t.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities (1 col) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Activities
            </h3>
            <p className="text-[11px] text-slate-400">
              Updates across your teams
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <p className="text-slate-800 font-medium">{act.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {formatRelativeTime(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. MEMBER VIEW: My assigned tasks + status changer, my teams, activity    */
/* ========================================================================= */
function MemberDashboardView({ user }) {
  const [teams, setTeams] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [taskFilter, setTaskFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamsRes, tasksRes, actRes] = await Promise.all([
        api.get("/api/teams/"),
        api.get("/api/tasks/assigned-to-me/"),
        api.get("/api/activities/"),
      ]);
      setTeams(teamsRes || []);
      setMyTasks(tasksRes || []);
      setActivities(actRes || []);
    } catch (err) {
      console.error("Member fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Instant inline status update for member
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingId(taskId);
      await api.patch(`/api/tasks/${taskId}/`, { status: newStatus });
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
      api.get("/api/activities/").then((res) => setActivities(res || []));
    } catch (err) {
      alert(err?.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAssigned = useMemo(() => {
    if (taskFilter === "all") return myTasks;
    return myTasks.filter((t) => t.status === taskFilter);
  }, [myTasks, taskFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Member Workspace
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Welcome, {user?.name}!
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View your assigned tasks, update their progress, and collaborate in
          team workspaces.
        </p>
      </div>

      {/* 1. My Assigned Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              My Assigned Tasks
            </h2>
            <p className="text-xs text-slate-500">
              Tasks you are responsible for. Update status directly below.
            </p>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            {["all", "pending", "in_progress", "done"].map((key) => (
              <button
                key={key}
                onClick={() => setTaskFilter(key)}
                className={`px-2.5 py-1 text-xs cursor-pointer rounded-md font-medium transition ${
                  taskFilter === key
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {key === "all"
                  ? "All"
                  : key === "in_progress"
                    ? "In Progress"
                    : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading your tasks...
          </div>
        ) : filteredAssigned.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            {myTasks.length === 0
              ? "You do not have any tasks assigned to you right now."
              : `No assigned tasks with status '${taskFilter}'.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssigned.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      #{task.id.slice(-6)}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getStatusBadge(task.status)}`}
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
                    <div className="mt-2 text-[11px] text-slate-400">
                      Team:{" "}
                      <span className="font-medium text-slate-600">
                        {task.team_name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Status:
                    </span>
                    <select
                      disabled={updatingId === task.id}
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value)
                      }
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <Link
                    href={
                      task.team_id
                        ? `/teams/${task.team_id}/tasks/${task.id}`
                        : "#"
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. My Teams & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Teams (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Teams You Belong To
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {teams.length} teams
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              You are not a member of any teams yet. Ask your team administrator
              to invite you!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((t) => (
                <TeamCard key={t.id} team={t} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity (1 col) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Team Activity
            </h3>
            <p className="text-[11px] text-slate-400">
              Updates from your workspaces
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <p className="text-slate-800 font-medium">{act.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {formatRelativeTime(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MAIN DASHBOARD CONTROLLER: Render by Role (Superadmin, Admin, Member)     */
/* ========================================================================= */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === "SUPERADMIN" && <SuperadminDashboardView user={user} />}
        {role === "ADMIN" && <AdminDashboardView user={user} />}
        {role !== "SUPERADMIN" && role !== "ADMIN" && (
          <MemberDashboardView user={user} />
        )}
      </div>
    </ProtectedPage>
  );
}
