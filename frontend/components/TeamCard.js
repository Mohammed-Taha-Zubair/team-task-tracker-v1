"use client";

import Link from "next/link";

export default function TeamCard({ team }) {
  const memberCount = team.member_count || (team.members ? team.members.length : 1);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group block bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all p-5"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
          {team.name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0 ml-2">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
        {team.description || "No description provided for this team."}
      </p>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
        <span>View Workspace</span>
        <span aria-hidden="true">&rarr;</span>
      </div>
    </Link>
  );
}
