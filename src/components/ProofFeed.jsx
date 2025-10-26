// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useState } from "react";

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    const units = [
      ["yr", 31536000],
      ["mo", 2592000],
      ["wk", 604800],
      ["d", 86400],
      ["h", 3600],
      ["m", 60],
      ["s", 1],
    ];
    for (const [label, secs] of units) {
      if (s >= secs) {
        const v = Math.floor(s / secs);
        return `${v}${label} ago`;
      }
    }
  } catch {}
  return "";
}

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="100%" height="100%" fill="#2f3136"/>
      <circle cx="32" cy="24" r="12" fill="#b9bbbe"/>
      <rect x="14" y="38" width="36" height="12" rx="6" fill="#b9bbbe"/>
    </svg>
  `);

/**
 * Props:
 * - items: [{display_name, message_text, happened_at, avatar_url, is_pinned}]
 * - visibleCount: number (default 5)
 * - cycleMs: number (default 3000)
 */
export default function ProofFeed({ items = [], visibleCount = 5, cycleMs = 3000 }) {
  // Order: pinned first, then newest by happened_at desc
  const ordered = useMemo(() => {
    const clone = [...(items || [])];
    clone.sort((a, b) => {
      const pinDiff = (b?.is_pinned ? 1 : 0) - (a?.is_pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      const atA = new Date(a?.happened_at || a?.created_at || 0).getTime();
      const atB = new Date(b?.happened_at || b?.created_at || 0).getTime();
      return atB - atA;
    });
    return clone;
  }, [items]);

  const [offset, setOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const canCycle = ordered.length > visibleCount;

  useEffect(() => {
    if (!canCycle || isPaused) return;
    const t = setInterval(() => {
      setOffset((o) => (o + 1) % ordered.length);
    }, cycleMs);
    return () => clearInterval(t);
  }, [canCycle, isPaused, ordered.length, cycleMs]);

  // Rotate list by offset and take visibleCount
  const rotated = useMemo(() => {
    if (!ordered.length) return [];
    const start = offset % ordered.length;
    const seq = ordered.slice(start).concat(ordered.slice(0, start));
    return seq.slice(0, Math.min(visibleCount, seq.length));
  }, [ordered, offset, visibleCount]);

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 p-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Recent Wins</h3>
        {/* removed total counter */}
      </div>

      <ul className="space-y-2 transition-opacity duration-300 ease-in-out">
        {rotated.map((p, idx) => (
          <li
            key={`${p.id || p.happened_at || idx}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-2"
          >
            <img
              src={p.avatar_url || DEFAULT_AVATAR}
              alt={p.display_name || "avatar"}
              className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{p.display_name || "Rep"}</span>
                {p.is_pinned ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">Pinned</span>
                ) : null}
                <span className="ml-auto text-xs text-white/50">
                  {timeAgo(p.happened_at || p.created_at)}
                </span>
              </div>
              <div className="text-white/80 text-sm break-words">
                {p.message_text || ""}
              </div>
            </div>
          </li>
        ))}
        {!rotated.length && (
          <li className="text-sm text-white/60 p-2">No proof yet. Wins show up here.</li>
        )}
      </ul>

      {canCycle && (
        <div className="text-[11px] text-white/50 mt-2">
          Auto-cycling through posts… {isPaused ? "(paused)" : ""}
        </div>
      )}
    </div>
  );
}
