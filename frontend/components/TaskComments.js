"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function TaskComments({ taskId, task, comments = [], loading, onCommentAdded }) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const isAdmin = user?.role === "admin";
  const isAssigned = String(task?.assigned_to?.id || "") === String(user?.id || "");
  const canComment = isAdmin || isAssigned;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !canComment) return;

    setPostingComment(true);
    setCommentError("");

    try {
      await api.post(`/api/tasks/${taskId}/comments/`, {
        text: commentText.trim(),
      });

      setCommentText("");
      if (onCommentAdded) {
        await onCommentAdded();
      }
    } catch (err) {
      setCommentError(err?.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Task Discussion</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comments and updates on this task
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </span>
      </div>

      {/* Add Comment Form or Restriction Notice */}
      {canComment ? (
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
      ) : (
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-500 flex items-center space-x-2">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Comments are restricted to the assigned team member and administrators.</span>
        </div>
      )}

      {/* Comments Feed */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        {loading ? (
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
  );
}
