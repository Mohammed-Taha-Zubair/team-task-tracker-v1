"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

function TaskDetailContent() {
  const params = useParams();
  const teamId = params?.id;
  const taskId = params?.taskId;

  // Task & team member state
  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Editable form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Load task and team members
  useEffect(() => {
    if (!taskId || !teamId) return;

    let active = true;

    // Fetch Task Details
    api
      .get(`/api/tasks/${taskId}/`)
      .then((data) => {
        if (active) {
          setTask(data);
          setTitle(data.title || "");
          setDescription(data.description || "");
          setStatus(data.status || "pending");
          setAssignedTo(data.assigned_to?.id || "");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setPageError(err?.message || "Failed to load task details");
          setLoading(false);
        }
      });

    // Fetch Team Members
    api
      .get(`/api/teams/${teamId}/`)
      .then((teamData) => {
        if (active) {
          setMembers(teamData.members || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load team members:", err);
      });

    // Fetch Comments
    api
      .get(`/api/tasks/${taskId}/comments/`)
      .then((commentsData) => {
        if (active) {
          setComments(commentsData || []);
          setLoadingComments(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load comments:", err);
          setLoadingComments(false);
        }
      });

    return () => {
      active = false;
    };
  }, [teamId, taskId]);

  const reloadComments = async () => {
    if (!taskId) return;
    try {
      const data = await api.get(`/api/tasks/${taskId}/comments/`);
      setComments(data || []);
    } catch (err) {
      console.error("Failed to reload comments:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setSaveMessage({ type: "error", text: "Task title cannot be empty." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const updated = await api.patch(`/api/tasks/${taskId}/`, {
        title: title.trim(),
        description: description.trim(),
        status,
        assigned_to: assignedTo || null,
      });

      setTask(updated);
      setSaveMessage({ type: "success", text: "Task updated successfully!" });
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err?.message || "Failed to save changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setPostingComment(true);
    setCommentError("");

    try {
      await api.post(`/api/tasks/${taskId}/comments/`, {
        text: commentText.trim(),
      });

      setCommentText("");
      await reloadComments();
    } catch (err) {
      setCommentError(err?.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation / Back to Team */}
        <div className="mb-6">
          <Link
            href={`/teams/${teamId}`}
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
              href={`/teams/${teamId}`}
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
            {/* Task Edit Form Card */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-mono text-slate-400">
                      TASK #{task?.id?.slice(-6)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wider ${getStatusBadge(
                        task?.status
                      )}`}
                    >
                      {task?.status?.replace("_", " ")}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1.5">
                    {task?.title}
                  </h1>
                </div>

                <div className="text-xs text-slate-400 text-left sm:text-right shrink-0">
                  <p>
                    Updated:{" "}
                    <span className="font-medium text-slate-600">
                      {formatRelativeTime(task?.updated_at)}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Created:{" "}
                    <span className="font-medium text-slate-600">
                      {formatRelativeTime(task?.created_at)}
                    </span>
                  </p>
                </div>
              </div>

              {saveMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-xs font-medium border ${
                    saveMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              <form onSubmit={handleSave} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details and instructions..."
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assignee
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Task Discussion</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comments and team conversation on this task
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                  {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                </span>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mt-5">
                {commentError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                    {commentError}
                  </div>
                )}
                <div>
                  <label className="sr-only">Leave a comment</label>
                  <textarea
                    rows={3}
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment or status update..."
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none placeholder:text-slate-400"
                  />
                </div>
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !commentText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {postingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>

              {/* Comments Feed */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                {loadingComments ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    Loading discussion...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                    No comments yet. Start the conversation above!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {comment.user?.name
                                ? comment.user.name.charAt(0).toUpperCase()
                                : "U"}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {comment.user?.name || "Team Member"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
