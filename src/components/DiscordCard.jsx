import React from "react";

export default function DiscordCard({ avatarUrl, name, timestamp, message, amountCents, screenshotUrl }) {
  const amount = Number.isFinite(amountCents) ? `$${(amountCents / 100).toLocaleString()}` : null;
  return (
    <div className="rounded-xl bg-[#2b2d31] border border-white/10 p-3 flex gap-3">
      <img
        src={avatarUrl || "https://placehold.co/64x64"}
        alt={name || "avatar"}
        className="h-10 w-10 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-white">{name || "Member"}</span>
          <span className="text-white/50">• {timestamp || "just now"}</span>
        </div>
        <div className="mt-1 text-white/90 text-[15px] leading-5">
          {message}
          {amount && <span className="ml-2 rounded-md px-2 py-0.5 text-xs bg-white/10">{amount}</span>}
        </div>
        {screenshotUrl && (
          <div className="mt-2">
            <img src={screenshotUrl} alt="proof" className="rounded-lg border border-white/10 max-h-64" />
          </div>
        )}
      </div>
    </div>
  );
}
