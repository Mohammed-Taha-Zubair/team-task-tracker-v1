"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function NewTaskForm({ teamId, members = [], onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo || null,
        status,
      };

      await api.post(`/api/teams/${teamId}/tasks/`, payload);

      setTitle("");
      setDescription("");
      setAssignedTo("");
      setStatus("pending");
      setIsExpanded(false);

      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (err) {
      setError(err?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Create New Task</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add a task for your team members to collaborate on
          </p>
        </div>
        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            + New Task
          </button>
        )}
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user settings page"
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or links..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {members?.filter((m) => m && m.role === "member").map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setError("");
                setTitle("");
                setDescription("");
                setAssignedTo("");
                setStatus("pending");
              }}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
