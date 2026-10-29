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

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

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

      setSaveMessage({ type: "success", text: "Task updated successfully!" });
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
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
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
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {isReadOnly && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center space-x-2">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>You can view this task. Only administrators or the assigned member can update it.</span>
        </div>
      )}

      {canEditStatusOnly && (
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium">
          As the assigned member, you can update this task&apos;s status. Task details and assignments can only be changed by an Administrator.
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Title {!isAdmin && <span className="font-normal text-slate-400">(Admin only)</span>}
          </label>
          <input
            type="text"
            required={isAdmin}
            disabled={!isAdmin}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description {!isAdmin && <span className="font-normal text-slate-400">(Admin only)</span>}
          </label>
          <textarea
            rows={4}
            disabled={!isAdmin}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task details and instructions..."
            className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status
            </label>
            <select
              disabled={isReadOnly}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assignee {!isAdmin && <span className="font-normal text-slate-400">(Admin only)</span>}
            </label>
            <select
              disabled={!isAdmin}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {members?.filter((m) => m && m.role === "member").map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? "Saving..."
                : canEditStatusOnly
                ? "Update Status"
                : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
