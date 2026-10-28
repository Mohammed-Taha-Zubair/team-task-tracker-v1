"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function TaskEditForm({ task, members = [], onTaskSaved }) {
  const { user } = useAuth();
  const canManageTaskDetails =
    (user?.role || "").toUpperCase() === "ADMIN" ||
    (user?.role || "").toUpperCase() === "SUPERADMIN";

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "pending");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to?.id || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "pending");
      setAssignedTo(task.assigned_to?.id || "");
    }
  }, [task]);

  const handleSave = async (e) => {
    e.preventDefault();

    // Prevent submitting if status didn't change for member
    if (!canManageTaskDetails && status === task?.status) {
      return;
    }

    if (canManageTaskDetails && !title.trim()) {
      setSaveMessage({ type: "error", text: "Task title cannot be empty." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const payload = canManageTaskDetails
        ? {
            title: title.trim(),
            description: description.trim(),
            status,
            assigned_to: assignedTo || null,
          }
        : {
            status,
          };

      const updated = await api.patch(`/api/tasks/${task.id}/`, payload);

      setSaveMessage({
        type: "success",
        text: canManageTaskDetails
          ? "Task updated successfully!"
          : "Task status updated successfully!",
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

  const getStatusLabel = (s) => {
    switch (s) {
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return "Pending";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8 space-y-6">
      {/* Header bar with ID and Timestamps */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-mono text-slate-400">
              TASK #{task?.id?.slice(-6)}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider ${getStatusBadge(
                task?.status
              )}`}
            >
              {getStatusLabel(task?.status)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
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
          className={`p-3 rounded-lg text-xs font-medium border ${
            saveMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. MEMBER VIEW: Pure Read-Only Details + Dedicated Status Box */}
      {/* ============================================================== */}
      {!canManageTaskDetails ? (
        <div className="space-y-6">
          {/* Read-Only Description */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Description
            </h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {task?.description || "No description provided for this task."}
            </p>
          </div>

          {/* Read-Only Metadata (Assignee & Creator) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Assigned Member
              </span>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {task?.assigned_to?.name
                    ? task.assigned_to.name.charAt(0).toUpperCase()
                    : "U"}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {task?.assigned_to?.name || "Unassigned"}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Created By
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-800">
                  {task?.created_by?.name || "Team Admin"}
                </span>
              </div>
            </div>
          </div>

          {/* Member Status Updater Box */}
          <form
            onSubmit={handleSave}
            className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Update Task Status
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change the status to reflect your progress on this task.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3.5 py-2 bg-white text-slate-900 border border-indigo-200 rounded-lg text-sm font-medium shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>

                <button
                  type="submit"
                  disabled={saving || status === task?.status}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {saving
                    ? "Updating..."
                    : status === task?.status
                    ? "Status Up to Date"
                    : "Update Status"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. ADMIN VIEW: Full Editable Task Management Form              */
        /* ============================================================== */
        <form onSubmit={handleSave} className="space-y-4">
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
                {(members || []).filter(Boolean).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role || "member"})
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
      )}
    </div>
  );
}
