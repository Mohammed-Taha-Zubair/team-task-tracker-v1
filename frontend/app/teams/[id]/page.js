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
  const [inviteMessage, setInviteMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Trigger to signal Timeline to refresh immediately
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  // Initial load and whenever teamId or currentFilter changes
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

  // Handle Tab filter change
  const handleFilterChange = (filterKey) => {
    setCurrentFilter(filterKey);
    setLoadingTasks(true);
  };

  // Refresh functions for task creation and invites
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

  // Handle Task creation: refresh tasks and ping timeline
  const handleTaskCreated = () => {
    reloadTasks();
    setTimelineRefreshTrigger((prev) => prev + 1);
  };

  // Handle Invite Member (Admin only)
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

      // Refresh team to update member list and assignee dropdown
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
            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <span aria-hidden="true" className="mr-1">
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
          <div className="py-20 text-center text-sm font-medium text-gray-500">
            Loading team workspace...
          </div>
        ) : (
          /* Two Column Layout on Desktop, Stacked on Mobile */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT COLUMN: Team Header, Members, Invite, Tasks, New Task */}
            <div className="lg:col-span-2 space-y-6">
              {/* Team Info Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                      {team?.name}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {team?.description || "No description provided."}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                    {team?.members?.length || 0}{" "}
                    {team?.members?.length === 1 ? "Member" : "Members"}
                  </span>
                </div>

                {/* Members List */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Team Members
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {team?.members?.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                        </span>
                        <span className="font-medium text-gray-800">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            member.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
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
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Invite Member to Team
                    </h3>

                    {inviteMessage && (
                      <div
                        className={`mb-3 p-3 rounded-lg text-xs font-medium border ${
                          inviteMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {inviteMessage.text}
                      </div>
                    )}

                    <form
                      onSubmit={handleInviteMember}
                      className="flex flex-col sm:flex-row gap-3"
                    >
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={inviting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0"
                      >
                        {inviting ? "Inviting..." : "Invite Member"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Task List Component with filter tabs */}
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
        <div className="py-20 text-center text-sm font-medium text-gray-500">
          Loading team workspace...
        </div>
      }
    >
      <TeamViewContent />
    </Suspense>
  );
}

