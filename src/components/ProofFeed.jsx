// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** Map your mf_proof_posts row -> UI model (STRICT to your schema) */
function mapRow(row) {
  // amount_cents -> currency display
  let amount = null;
  if (typeof row.amount_cents === "number" && !Number.isNaN(row.amount_cents)) {
    amount = row.amount_cents / 100;
  }
  const currency = row.currency || "USD";
  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `$${Number(n).toLocaleString()}`;
    }
  };

  return {
    name: row.display_name || "Member",
    avatar: row.avatar_url || null,
    text: row.message_text || "",
    image: row.screenshot_url || null, // show as “attachment” under the message
    when: row.happened_at ? new Date(row.happened_at) :
          row.created_at ? new Date(row.created_at) : null,
    amountStr: amount != null ? fmt(amount) : null,
    pinned: !!row.is_pinned,
    _raw: row,
  };
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("") || "MF";
}

export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = true,
  bigSlides = true,
}) {
  const normalized = useMemo(() => (Array.isArray(items) ? items.map(mapRow) : []), [items]);

  // Sort: pinned first, then newest
  const sorted = useMemo(() => {
    return [...normalized].sort((a, b) => {
      const pin = Number(b.pinned) - Number(a.pinned);
      if (pin !== 0) return pin;
      const ta = a.when ? a.when.getTime() : 0;
      const tb = b.when ? b.when.getTime() : 0;
      return tb - ta;
    });
  }, [normalized]);

  // Pages of N
  const pages = useMemo(() => {
    const chunk = Math.max(1, visibleCount);
    if (!sorted.length) return [[]];
    const out = [];
    for (let i = 0; i < sorted.length; i += chunk) out.push(sorted.slice(i, i + chunk));
    if (out.length === 1 && out[0].length && out[0].length < chunk) {
      const base = out[0].slice();
      while (out[0].length < chunk) out[0].push(base[out[0].length % base.length]);
    }
    return out;
  }, [sorted, visibleCount]);

  const [page, setPage] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    if (pages.length <= 1) return;
    timer.current = setInterval(() => setPage((p) => (p + 1) % pages.length), cycleMs);
    return () => clearInterval(timer.current);
  }, [pages.length, cycleMs]);

  // re-trigger entrance animation
  const [slideKey, setSlideKey] = useState(0);
  useEffect(() => setSlideKey((k) => k + 1), [page]);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          key={slideKey}
          className={`grid transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)] ${
            bigSlides ? "md:grid-cols-4 grid-cols-2 gap-3" : "md:grid-cols-4 grid-cols-2 gap-2"
          }`}
        >
          {pages[page].map((it, i) => (
            <DiscordCard key={`${page}-${i}`} item={it} blur={blurTransition} />
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-6 bg-white" : "w-3 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscordCard({ item, blur }) {
  const { name, avatar, text, image, when, amountStr, pinned } = item;
  const whenStr = when
    ? when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div
      className={[
        "rounded-xl border border-white/10 bg-[#2b2d31] p-3",
        "shadow-lg shadow-black/30",
        "transition-all duration-500",
        blur ? "hover:scale-[1.01]" : "",
      ].join(" ")}
      style={blur ? { animation: "pfFade 600ms ease both, pfSlide 600ms ease both" } : undefined}
    >
      {/* Header line = avatar + name + time + amount chip */}
      <div className="flex items-start gap-3">
        {/* Avatar (fallback initials) */}
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-10 w-10 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="h-10 w-10 rounded-full grid place-items-center bg-white/10 border border-white/10 text-xs font-semibold">
            {initials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{name}</span>
            {whenStr && <span className="text-xs text-white/50">{whenStr}</span>}
            <div className="ml-auto flex items-center gap-2">
              {pinned && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                  Pinned
                </span>
              )}
              {amountStr && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-black">
                  {amountStr}
                </span>
              )}
            </div>
          </div>

          {/* Message body */}
          {text && <div className="mt-1 text-[15px] leading-snug text-white/90">{text}</div>}

          {/* Attachment */}
          {image && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              <img
                src={image}
                alt=""
                className="w-full h-auto max-h-56 object-cover"
                style={{ display: "block" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* subtle divider shimmer like Discord hover */}
      <div className="mt-3 h-px w-full bg-white/10" />

      <style>{`
@keyframes pfFade {
  0% { opacity: .0; filter: ${blur ? "blur(6px)" : "none"}; transform: scale(.995); }
  100% { opacity: 1; filter: blur(0); transform: scale(1); }
}
@keyframes pfSlide {
  0% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}
      `}</style>
    </div>
  );
}
