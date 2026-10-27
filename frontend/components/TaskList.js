"use client";

import Link from "next/link";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    dotClass: "bg-gray-400",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  done: {
    label: "Done",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function TaskList({ teamId, tasks, currentFilter, onFilterChange, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Tasks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} in this view
          </p>
        </div>

        {/* Filter Tab buttons */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
          {TABS.map((tab) => {
            const isActive = currentFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List Content */}
      <div className="mt-4">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500 font-medium">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">No tasks found</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentFilter === "all"
                ? "No tasks have been created in this team yet."
                : `No tasks currently marked as "${currentFilter.replace("_", " ")}".`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              return (
                <li key={task.id}>
                  <Link
                    href={`/teams/${teamId}/tasks/${task.id}`}
                    className="group block p-4 -mx-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2.5">
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                            {task.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dotClass}`}
                            />
                            {statusInfo.label}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Assignee pill */}
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                          <svg
                            className="w-3.5 h-3.5 mr-1 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {task.assigned_to?.name || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
