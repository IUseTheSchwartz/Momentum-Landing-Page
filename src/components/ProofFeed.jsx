import React from "react";
import DiscordCard from "./DiscordCard";

export default function ProofFeed({ items = [] }) {
  if (!items.length) return <div className="text-white/60 text-sm">No posts yet. Check back soon.</div>;
  const sorted = [...items].sort((a, b) => {
    // pinned first, then newest
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.happened_at || 0) - new Date(a.happened_at || 0);
  });
  return (
    <div className="space-y-3">
      {sorted.map((it) => (
        <DiscordCard
          key={it.id}
          avatarUrl={it.avatar_url}
          name={it.display_name}
          timestamp={new Date(it.happened_at || Date.now()).toLocaleString()}
          message={it.message_text}
          amountCents={it.amount_cents}
          screenshotUrl={it.screenshot_url}
        />
      ))}
    </div>
  );
}
