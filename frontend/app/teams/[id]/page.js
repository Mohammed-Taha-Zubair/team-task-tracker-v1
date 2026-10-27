"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import TaskList from "@/components/TaskList";
import NewTaskForm from "@/components/NewTaskForm";
import Timeline from "@/components/Timeline";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function TeamViewContent() {
  const params = useParams();
  const teamId = params?.id;
  const { user } = useAuth();

  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [teamError, setTeamError] = useState("");

  // Invite member state (Admin only)
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Trigger to signal Timeline to refresh immediately
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!teamId) return;

    let active = true;

    // Load team
    api
      .get(`/api/teams/${teamId}/`)
      .then((data) => {
        if (active) {
          setTeam(data);
          setTeamError("");
          setLoadingTeam(false);
        }
      })
      .catch((err) => {
        if (active) {
          setTeamError(err?.message || "Failed to load team details");
          setLoadingTeam(false);
        }
      });

    // Load tasks based on current filter
    const query = currentFilter && currentFilter !== "all" ? `?status=${currentFilter}` : "";
    api
      .get(`/api/teams/${teamId}/tasks/${query}`)
      .then((data) => {
        if (active) {
          setTasks(data || []);
          setLoadingTasks(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load tasks:", err);
          setLoadingTasks(false);
        }
      });

    return () => {
      active = false;
    };
  }, [teamId, currentFilter]);

  const handleFilterChange = (filterKey) => {
    setCurrentFilter(filterKey);
    setLoadingTasks(true);
  };

  const reloadTasks = async () => {
    if (!teamId) return;
    try {
      const query = currentFilter && currentFilter !== "all" ? `?status=${currentFilter}` : "";
      const data = await api.get(`/api/teams/${teamId}/tasks/${query}`);
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to reload tasks:", err);
    }
  };

  const reloadTeam = async () => {
    if (!teamId) return;
    try {
      const data = await api.get(`/api/teams/${teamId}/`);
      setTeam(data);
    } catch (err) {
      console.error("Failed to reload team:", err);
    }
  };

  const handleTaskCreated = () => {
    reloadTasks();
    setTimelineRefreshTrigger((prev) => prev + 1);
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteMessage({ type: "error", text: "Email address is required" });
      return;
    }

    setInviting(true);
    setInviteMessage(null);

    try {
      const response = await api.post(`/api/teams/${teamId}/invite/`, {
        email: inviteEmail.trim(),
      });

      setInviteMessage({
        type: "success",
        text: response.message || "Invitation sent successfully!",
      });
      setInviteEmail("");
      await reloadTeam();
      setTimelineRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err?.message || "Failed to invite member",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <span aria-hidden="true" className="mr-1.5 font-bold">
              &larr;
            </span>
            Back to Dashboard
          </Link>
        </div>

        {teamError ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <h2 className="text-base font-bold">Unable to load team workspace</h2>
            <p className="text-sm mt-1">{teamError}</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : loadingTeam ? (
          <div className="py-20 text-center text-sm font-medium text-slate-400">
            Loading team workspace...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT COLUMN: Team Header, Members, Invite, Tasks, New Task */}
            <div className="lg:col-span-2 space-y-6">
              {/* Team Info Card */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                      {team?.name}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      {team?.description || "No description provided."}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
                    {team?.members?.length || 0}{" "}
                    {team?.members?.length === 1 ? "Member" : "Members"}
                  </span>
                </div>

                {/* Members List */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Team Members
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {team?.members?.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide border ${
                            member.role === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-200/60"
                              : "bg-slate-100 text-slate-600 border-slate-200/60"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Only: Invite Member Form */}
                {user?.role === "admin" && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Invite Member by Email
                    </h3>

                    {inviteMessage && (
                      <div
                        className={`mb-3 p-3 rounded-lg text-xs font-medium border flex items-center space-x-2 ${
                          inviteMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        <span>{inviteMessage.text}</span>
                      </div>
                    )}

                    <form
                      onSubmit={handleInviteMember}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 px-3.5 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={inviting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {inviting ? "Inviting..." : "Invite Member"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Task List Component */}
              <TaskList
                teamId={teamId}
                tasks={tasks}
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange}
                loading={loadingTasks}
              />

              {/* New Task Form Component */}
              <NewTaskForm
                teamId={teamId}
                members={team?.members || []}
                onTaskCreated={handleTaskCreated}
              />
            </div>

            {/* RIGHT COLUMN: Live Activity Timeline */}
            <div className="lg:col-span-1 sticky top-20">
              <Timeline teamId={teamId} refreshTrigger={timelineRefreshTrigger} />
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

export default function TeamViewPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm font-medium text-slate-400">
          Loading team workspace...
        </div>
      }
    >
      <TeamViewContent />
    </Suspense>
  );
}
