"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function CreateTeamForm({ onTeamCreated }) {
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setCreateError("Team name is required");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      await api.post("/api/teams/", {
        name: teamName.trim(),
        description: teamDescription.trim(),
      });

      setTeamName("");
      setTeamDescription("");
      if (onTeamCreated) {
        await onTeamCreated();
      }
    } catch (err) {
      setCreateError(err?.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-10 bg-white rounded-xl shadow-xs border border-slate-200/90 p-6">
      <div className="flex items-center space-x-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Create a New Team</h2>
          <p className="text-xs text-slate-500">
            Organize projects and assign tasks by creating dedicated team spaces.
          </p>
        </div>
      </div>

      {createError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          {createError}
        </div>
      )}

      <form onSubmit={handleCreateTeam} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Design Systems, Platform Core"
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Brief description of the team's mission"
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {creating ? "Creating Team..." : "Create Team"}
          </button>
        </div>
      </form>
    </div>
  );
}
