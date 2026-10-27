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
  const [saveMessage, setSaveMessage] = useState(null); // { type: 'success' | 'error', text: '' }

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

  // Reload comments helper
  const reloadComments = async () => {
    if (!taskId) return;
    try {
      const data = await api.get(`/api/tasks/${taskId}/comments/`);
      setComments(data || []);
    } catch (err) {
      console.error("Failed to reload comments:", err);
    }
  };

  // Handle Save Task Edits
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

  // Handle Add Comment
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
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "done":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <ProtectedPage>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation / Back to Team */}
        <div className="mb-6">
          <Link
            href={`/teams/${teamId}`}
            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <span aria-hidden="true" className="mr-1">
              &larr;
            </span>
            Back to team
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
              Back to team workspace
            </Link>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-sm font-medium text-gray-500">
            Loading task details...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Task Edit Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-gray-400">
                      TASK #{task?.id?.slice(-6)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${getStatusBadge(
                        task?.status
                      )}`}
                    >
                      {task?.status?.replace("_", " ")}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">
                    {task?.title}
                  </h1>
                </div>

                <div className="text-xs text-gray-500 text-left sm:text-right shrink-0">
                  <p>
                    Updated:{" "}
                    <span className="font-medium text-gray-700">
                      {formatRelativeTime(task?.updated_at)}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Created:{" "}
                    <span className="font-medium text-gray-700">
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

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details and instructions..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Assignee
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
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
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : "Save"}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Task Discussion</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Comments and team conversation on this task
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                </span>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mt-6">
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
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !commentText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {postingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>

              {/* Comments Feed */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                {loadingComments ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    Loading discussion...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500">
                    No comments yet. Start the conversation above!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 transition hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {comment.user?.name
                                ? comment.user.name.charAt(0).toUpperCase()
                                : "U"}
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {comment.user?.name || "Team Member"}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mt-2.5 whitespace-pre-wrap leading-relaxed">
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
        <div className="py-20 text-center text-sm font-medium text-gray-500">
          Loading task...
        </div>
      }
    >
      <TaskDetailContent />
    </Suspense>
  );
}
