"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

export default function Timeline({ teamId, refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial load and live polling every 5 seconds
  useEffect(() => {
    if (!teamId) return;

    let active = true;
    const fetchActivities = () => {
      api
        .get(`/api/teams/${teamId}/activity/`)
        .then((data) => {
          if (active) {
            setActivities(data || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            console.error("Failed to load activity timeline:", err);
            setLoading(false);
          }
        });
    };

    fetchActivities();
    const intervalId = setInterval(fetchActivities, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [teamId, refreshTrigger]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-bold text-gray-900">Activity Timeline</h2>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          Live Updates
        </span>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 font-medium">
            Loading timeline...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500">
            No recent activity recorded for this team.
          </div>
        ) : (
          <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {activities.map((item) => (
              <div key={item.id} className="relative flex items-start group">
                {/* Timeline node dot */}
                <div className="absolute -left-[14.5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />

                <div className="min-w-0 flex-1 ml-2">
                  <p className="text-xs text-gray-800 leading-snug">
                    {item.message}
                  </p>
                  <span className="text-[11px] text-gray-400 font-normal block mt-0.5">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
