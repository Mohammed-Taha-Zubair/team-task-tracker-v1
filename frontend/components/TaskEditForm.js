"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function TaskEditForm({ task, members = [], onTaskSaved }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "pending");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to?.id || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [prevTask, setPrevTask] = useState(task);

  if (task !== prevTask) {
    setPrevTask(task);
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setStatus(task?.status || "pending");
    setAssignedTo(task?.assigned_to?.id || "");
  }

  const isAdmin = user?.role === "admin";
  const isAssignedToUser = String(task?.assigned_to?.id || "") === String(user?.id || "");
  const canEditStatusOnly = !isAdmin && isAssignedToUser;
  const isReadOnly = !isAdmin && !isAssignedToUser;

  const currentAssignedId = task?.assigned_to?.id || "";
  const hasChanges = canEditStatusOnly
    ? status !== (task?.status || "pending")
    : title.trim() !== (task?.title || "") ||
      description.trim() !== (task?.description || "") ||
      status !== (task?.status || "pending") ||
      assignedTo !== currentAssignedId;

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!hasChanges) {
      setSaveMessage({ type: "info", text: "No changes to save." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      let payload;
      if (canEditStatusOnly) {
        // Member assigned to this task: only update status
        payload = { status };
      } else {
        // Admin: can update title, description, status, assigned_to
        if (!title.trim()) {
          setSaveMessage({ type: "error", text: "Task title cannot be empty." });
          setSaving(false);
          return;
        }
        payload = {
          title: title.trim(),
          description: description.trim(),
          status,
          assigned_to: assignedTo || null,
        };
      }

      const updated = await api.patch(`/api/tasks/${task.id}/`, payload);

      setSaveMessage({
        type: "success",
        text: canEditStatusOnly ? "Task status updated successfully!" : "Task updated successfully!",
      });
      if (onTaskSaved) {
        onTaskSaved(updated);
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err?.message || "Failed to save changes.",
      });
    } finally {
      setSaving(false);
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
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
      {/* Task Header */}
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
            {canEditStatusOnly && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Assigned to you
              </span>
            )}
            {isReadOnly && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Read-only
              </span>
            )}
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
              : saveMessage.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* CASE 1: UNASSIGNED MEMBER (READ ONLY) */}
      {isReadOnly && (
        <div className="mt-6 space-y-5">
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-lg text-xs text-slate-600 flex items-center space-x-2.5">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>You are viewing this task in read-only mode. Only the assigned member can update progress, and the admin can edit task details.</span>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-line p-4 bg-slate-50/50 rounded-lg border border-slate-200/60 leading-relaxed min-h-[80px]">
              {task?.description || "No description provided."}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1">Status</span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider ${getStatusBadge(
                  task?.status
                )}`}
              >
                {task?.status?.replace("_", " ")}
              </span>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1">Assignee</span>
              <div className="inline-flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/70 text-xs text-slate-700 font-medium">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{task?.assigned_to?.name || "Unassigned"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: ASSIGNED MEMBER (UPDATE STATUS ONLY) */}
      {canEditStatusOnly && (
        <div className="mt-6 space-y-5">
          <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-lg text-xs text-indigo-800 font-medium flex items-center space-x-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>You are assigned to this task. Keep your team updated by updating the status as you work.</span>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-line p-4 bg-slate-50/50 rounded-lg border border-slate-200/60 leading-relaxed min-h-[80px]">
              {task?.description || "No description provided."}
            </div>
          </div>

          <form onSubmit={handleSave} className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Update Task Status
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full sm:w-60 px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {saving ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CASE 3: ADMIN (FULL EDIT ACCESS) */}
      {isAdmin && (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Title
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
                {members
                  ?.filter((m) => m && m.role === "member")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
