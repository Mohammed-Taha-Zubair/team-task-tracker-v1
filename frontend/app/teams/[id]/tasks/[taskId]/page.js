"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import TaskEditForm from "@/components/TaskEditForm";
import TaskComments from "@/components/TaskComments";
import { api } from "@/lib/api";

function TaskDetailContent() {
  const params = useParams();
  const teamId = params?.id;
  const taskId = params?.taskId;

  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const refreshComments = useCallback(async () => {
    if (!taskId) return;
    try {
      const commentsData = await api.get(`/api/tasks/${taskId}/comments/`);
      setComments(commentsData || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  }, [taskId]);

  useEffect(() => {
    let ignore = false;
    if (!taskId) return;

    api
      .get(`/api/tasks/${taskId}/`)
      .then((data) => {
        if (!ignore) {
          setTask(data);
          setPageError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setPageError(err?.message || "Failed to load task details");
          setLoading(false);
        }
      });

    if (teamId) {
      api
        .get(`/api/teams/${teamId}/`)
        .then((teamData) => {
          if (!ignore) {
            setMembers(teamData.members || []);
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Failed to load team members:", err);
          }
        });
    }

    api
      .get(`/api/tasks/${taskId}/comments/`)
      .then((commentsData) => {
        if (!ignore) {
          setComments(commentsData || []);
          setLoadingComments(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to load comments:", err);
          setLoadingComments(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [taskId, teamId]);

  const actualTeamId = teamId || task?.team_id;

  return (
    <ProtectedPage>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation / Back to Team */}
        <div className="mb-6">
          <Link
            href={`/teams/${actualTeamId}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <span aria-hidden="true" className="mr-1.5 font-bold">
              &larr;
            </span>
            Back to Team Workspace
          </Link>
        </div>

        {pageError ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <h2 className="text-base font-bold">Unable to load task</h2>
            <p className="text-sm mt-1">{pageError}</p>
            <Link
              href={`/teams/${actualTeamId}`}
              className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Back to Team Workspace
            </Link>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-sm font-medium text-slate-400">
            Loading task details...
          </div>
        ) : (
          <div className="space-y-6">
            <TaskEditForm
              key={task?.id}
              task={task}
              members={members}
              onTaskSaved={(updatedTask) => setTask(updatedTask)}
            />

            <TaskComments
              taskId={taskId}
              task={task}
              comments={comments}
              loading={loadingComments}
              onCommentAdded={refreshComments}
            />
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm font-medium text-slate-400">
          Loading task...
        </div>
      }
    >
      <TaskDetailContent />
    </Suspense>
  );
}
