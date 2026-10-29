"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import TeamHeader from "@/components/TeamHeader";
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
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      const data = await api.get(`/api/teams/${teamId}/`);
      setTeam(data);
      setTeamError("");
    } catch (err) {
      setTeamError(err?.message || "Failed to load team details");
    } finally {
      setLoadingTeam(false);
    }
  }, [teamId]);

  const fetchTasks = useCallback(async (filter = currentFilter) => {
    if (!teamId) return;
    try {
      const query = filter && filter !== "all" ? `?status=${filter}` : "";
      const data = await api.get(`/api/teams/${teamId}/tasks/${query}`);
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [teamId, currentFilter]);

  useEffect(() => {
    fetchTeam();
    fetchTasks(currentFilter);
  }, [fetchTeam, fetchTasks, currentFilter]);

  const handleFilterChange = (filterKey) => {
    setCurrentFilter(filterKey);
    setLoadingTasks(true);
  };

  const handleTaskCreated = () => {
    fetchTasks(currentFilter);
    setTimelineRefreshTrigger((prev) => prev + 1);
  };

  const handleTeamUpdated = async () => {
    await fetchTeam();
    setTimelineRefreshTrigger((prev) => prev + 1);
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
            <div className="lg:col-span-2 space-y-6">
              <TeamHeader
                team={team}
                user={user}
                onTeamUpdated={handleTeamUpdated}
              />

              <TaskList
                teamId={teamId}
                tasks={tasks}
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange}
                loading={loadingTasks}
              />

              {/* Only admins and superadmins can create tasks */}
              {((user?.role || "").toUpperCase() === "ADMIN" ||
                (user?.role || "").toUpperCase() === "SUPERADMIN") && (
                <NewTaskForm
                  teamId={teamId}
                  members={team?.members || []}
                  onTaskCreated={handleTaskCreated}
                />
              )}
            </div>

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
