"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";


export default function UserManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create-member form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Deletion in-flight state
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = useCallback(async (query = "") => {
    try {
      const endpoint = query.trim()
        ? `/api/users/?search=${encodeURIComponent(query.trim())}`
        : "/api/users/";
      const data = await api.get(endpoint);
      setUsers(data.users || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
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
      const createdName = form.name;
      await api.post("/api/users/", form);
      setForm({ name: "", email: "", password: "" });
      setShowForm(false);
      flash(`Member "${createdName}" created successfully`);
      await fetchUsers(searchQuery);
    } catch (err) {
      setFormError(err?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(userId);
    setError("");
    try {
      await api.delete(`/api/users/${userId}/`);
      flash(`User "${userName}" was deleted successfully`);
      await fetchUsers(searchQuery);
    } catch (err) {
      setError(err?.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span>User Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 ml-8">
            View registered team members and manage accounts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="add-user-btn"
            onClick={() => { setShowForm(!showForm); setFormError(""); }}
            className="flex items-center space-x-1.5 text-xs px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-xs transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{showForm ? "Cancel" : "Add Member"}</span>
          </button>
        </div>
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold text-xs ml-4 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 bg-purple-50 border border-purple-200/70 rounded-xl space-y-3"
        >
          <h3 className="text-sm font-semibold text-purple-900 mb-1">New Member Account</h3>
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Password <span className="font-normal text-slate-400">(shared with member)</span>
              </label>
              <input
                id="new-user-password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Set password"
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              id="create-user-submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Creating..." : "Create Member"}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <input
            id="user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            {searchQuery ? `No users matching "${searchQuery}"` : "No users found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {users.map((u) => {
                  const isAdmin = u.role === "admin";
                  const isSelf = u.id === currentUserId;
                  const isDeletingThisUser = deletingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isAdmin ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
                            }`}>
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <span className="font-medium text-slate-800 text-xs">
                            {u.name}
                            {isSelf && (
                              <span className="ml-1.5 text-slate-400 font-normal">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${isAdmin
                              ? "bg-purple-50 text-purple-700 border-purple-200/70"
                              : "bg-slate-100 text-slate-600 border-slate-200/70"
                            }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Administrator account and self cannot be deleted */}
                        {isAdmin || isSelf ? (
                          <span
                            className="text-xs text-slate-300 px-2.5 py-1 select-none"
                            title={isAdmin ? "Administrator account cannot be deleted" : "Cannot delete yourself"}
                          >
                            —
                          </span>
                        ) : (
                          <button
                            id={`delete-user-${u.id}`}
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={isDeletingThisUser}
                            className="text-xs px-2.5 py-1 rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 font-medium transition disabled:opacity-40 cursor-pointer"
                          >
                            {isDeletingThisUser ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
