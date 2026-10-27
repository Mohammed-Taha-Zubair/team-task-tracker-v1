"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function TeamHeader({ team, user, onTeamUpdated }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteMessage({ type: "error", text: "Email address is required" });
      return;
    }

    setInviting(true);
    setInviteMessage(null);

    try {
      const response = await api.post(`/api/teams/${team.id}/invite/`, {
        email: inviteEmail.trim(),
      });

      setInviteMessage({
        type: "success",
        text: response.message || "Invitation sent successfully!",
      });
      setInviteEmail("");
      if (onTeamUpdated) {
        await onTeamUpdated();
      }
    } catch (err) {
      setInviteMessage({
        type: "error",
        text: err?.message || "Failed to invite member",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {team?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {team?.description || "No description provided."}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
          {team?.members?.length || 0}{" "}
          {team?.members?.length === 1 ? "Member" : "Members"}
        </span>
      </div>

      {/* Members List */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Team Members
        </h3>
        <div className="flex flex-wrap gap-2">
          {team?.members?.map((member) => (
            <div
              key={member.id}
              className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-xs"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                {member.name ? member.name.charAt(0).toUpperCase() : "U"}
              </span>
              <span className="font-semibold text-slate-800">
                {member.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide border ${
                  member.role === "admin"
                    ? "bg-purple-50 text-purple-700 border-purple-200/60"
                    : "bg-slate-100 text-slate-600 border-slate-200/60"
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Only: Invite Member Form */}
      {user?.role === "admin" && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Invite Member by Email
          </h3>

          {inviteMessage && (
            <div
              className={`mb-3 p-3 rounded-lg text-xs font-medium border flex items-center space-x-2 ${
                inviteMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <span>{inviteMessage.text}</span>
            </div>
          )}

          <form
            onSubmit={handleInviteMember}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 px-3.5 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {inviting ? "Inviting..." : "Invite Member"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
