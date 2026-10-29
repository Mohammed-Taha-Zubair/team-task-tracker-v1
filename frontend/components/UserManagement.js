"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

/**
 * UserManagement — Admin-only panel for creating and managing users.
 *
 * Features:
 *  - List all users with their role badges
 *  - Create new users (admin sets name, email, password, role)
 *  - Delete users (cannot delete self)
 */
export default function UserManagement({ currentUserId, onUserChanged }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create-user form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get("/api/users/");
      setUsers(data.users || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    let active = true;
    api.get("/api/users/")
      .then((data) => { if (active) { setUsers(data.users || []); setError(""); setLoading(false); } })
      .catch((err) => { if (active) { setError(err?.message || "Failed to load users"); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.password) {
      setFormError("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/users/", form);
      setForm({ name: "", email: "", password: "", role: "MEMBER" });
      setShowForm(false);
      flash(`User "${form.name}" created successfully`);
      await fetchUsers();
      if (onUserChanged) onUserChanged();
    } catch (err) {
      setFormError(err?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleToggle = async (targetUser) => {
    const currentRole = (targetUser.role || "").toUpperCase();
    const nextRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";
    try {
      await api.patch(`/api/users/${targetUser.id}/`, { role: nextRole });
      flash(`Updated "${targetUser.name}" to ${nextRole}`);
      await fetchUsers();
      if (onUserChanged) onUserChanged();
    } catch (err) {
      setError(err?.message || "Failed to update role");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      await api.delete(`/api/users/${userId}/`);
      flash(`User "${userName}" deleted`);
      await fetchUsers();
      if (onUserChanged) onUserChanged();
    } catch (err) {
      setError(err?.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span>Super Admin — Member Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 ml-8">
            Create credentials for team members. Members log in directly using the credentials you set.
          </p>
        </div>
        <button
          id="add-user-btn"
          onClick={() => { setShowForm(!showForm); setFormError(""); }}
          className="flex items-center space-x-1.5 text-xs px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-xs transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>{showForm ? "Cancel" : "Add Member"}</span>
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium flex items-center space-x-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 bg-purple-50 border border-purple-200/70 rounded-xl space-y-3"
        >
          <h3 className="text-sm font-semibold text-purple-900 mb-1">New User Details</h3>
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                id="new-user-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Alice Johnson"
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                id="new-user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="alice@company.com"
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="font-normal text-slate-400">(shared with user)</span>
              </label>
              <input
                id="new-user-password"
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Set a temporary password"
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                id="new-user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
              >
                <option value="MEMBER">Member (Team Collaborator)</option>
                <option value="ADMIN">Admin (Team Creator & Manager)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              id="create-user-submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {submitting ? "Creating..." : `Create ${form.role === "ADMIN" ? "Admin" : "Member"}`}
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            No users yet. Click &quot;Add User&quot; to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <span className="font-medium text-slate-800 text-xs">
                        {u.name}
                        {u.id === currentUserId && (
                          <span className="ml-1.5 text-slate-400 font-normal">(you)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium tracking-wide border ${
                        (u.role || "").toUpperCase() === "SUPERADMIN"
                          ? "bg-purple-50 text-purple-700 border-purple-200/70"
                          : (u.role || "").toUpperCase() === "ADMIN"
                          ? "bg-blue-50 text-blue-700 border-blue-200/70"
                          : "bg-slate-100 text-slate-600 border-slate-200/70"
                      }`}
                    >
                      {(u.role || "MEMBER").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUserId ? (
                      <div className="flex items-center justify-end space-x-2">
                        {(u.role || "").toUpperCase() !== "SUPERADMIN" && (
                          <button
                            id={`toggle-role-${u.id}`}
                            onClick={() => handleRoleToggle(u)}
                            className="text-xs px-2.5 py-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 font-medium transition"
                          >
                            {(u.role || "").toUpperCase() === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                          </button>
                        )}
                        <button
                          id={`delete-user-${u.id}`}
                          onClick={() => handleDelete(u.id, u.name)}
                          disabled={deletingId === u.id}
                          className="text-xs px-2.5 py-1 rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 font-medium transition disabled:opacity-40"
                        >
                          {deletingId === u.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 px-2.5 py-1">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && users.length === 1 && (
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>You are currently the only member in this workspace.</span>
            <button
              onClick={() => { setShowForm(true); setFormError(""); }}
              className="text-purple-600 font-semibold hover:text-purple-700 transition"
            >
              Add a team member &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
