// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** Map your mf_proof_posts row -> UI model */
function mapRow(row) {
  // amount_cents -> currency display
  let amount = null;
  if (typeof row.amount_cents === "number" && !Number.isNaN(row.amount_cents)) {
    amount = row.amount_cents / 100;
  }

  // currency: default USD
  const currency = row.currency || "USD";
  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      // fallback if unknown currency
      return `$${Number(n).toLocaleString()}`;
    }
  };

  return {
    who: row.display_name || "New sale",
    note: row.message_text || "",
    img: row.screenshot_url || null,   // big image on the card
    avatar: row.avatar_url || null,    // small circle (optional)
    when: row.happened_at ? new Date(row.happened_at) :
          row.created_at ? new Date(row.created_at) : null,
    amountStr: amount != null ? fmt(amount) : null,
    _raw: row,
  };
}

export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = true,
  bigSlides = true,
}) {
  // Normalize strictly to your schema (no guesswork)
  const normalized = useMemo(() => (Array.isArray(items) ? items.map(mapRow) : []), [items]);

  // Sort newest first (server already ordered; this is a safeguard)
  const sorted = useMemo(() => {
    return [...normalized].sort((a, b) => {
      const ta = a.when ? a.when.getTime() : 0;
      const tb = b.when ? b.when.getTime() : 0;
      return tb - ta;
    });
  }, [normalized]);

  // Paginate into pages of N
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

  // re-trigger enter animation on page change
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
            <Card key={`${page}-${i}`} item={it} blur={blurTransition} big={bigSlides} />
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

function Card({ item, blur, big }) {
  const { who, note, img, avatar, when, amountStr } = item;
  const whenStr = when
    ? when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div
      className={[
        "rounded-xl border border-white/10 bg-white/[0.04] p-3",
        "shadow-lg shadow-black/20",
        "transition-all duration-500",
        blur ? "hover:scale-[1.02]" : "",
        big ? "min-h-[140px]" : "min-h-[120px]",
      ].join(" ")}
      style={blur ? { animation: "pfFade 700ms ease both, pfSlide 700ms ease both" } : undefined}
    >
      <div className="flex items-start gap-3">
        {img ? (
          <img
            src={img}
            alt=""
            className={`rounded-lg object-cover ${big ? "h-16 w-16" : "h-14 w-14"}`}
            style={blur ? { filter: "brightness(.95) contrast(1.05)" } : undefined}
          />
        ) : (
          <div
            className={`rounded-lg bg-white/5 border border-white/10 grid place-items-center ${
              big ? "h-16 w-16" : "h-14 w-14"
            }`}
          >
            <span className="text-xs text-white/50">SALE</span>
          </div>
        )}

        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">{who}</div>
            {amountStr && (
              <div className="ml-auto shrink-0 text-sm font-bold bg-white text-black rounded px-2 py-0.5">
                {amountStr}
              </div>
            )}
          </div>
          {whenStr && <div className="text-xs text-white/50 mt-0.5">{whenStr}</div>}
          {note && <div className="text-sm text-white/80 mt-1 line-clamp-2">{note}</div>}

          {/* optional tiny avatar under text if provided */}
          {avatar && (
            <div className="mt-2 flex items-center gap-2">
              <img src={avatar} alt="" className="h-6 w-6 rounded-full border border-white/10" />
              <span className="text-xs text-white/60 truncate">{who}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full w-1/3 animate-pulse bg-white/30" />
      </div>

      <style>{`
@keyframes pfFade {
  0% { opacity: .0; filter: ${blur ? "blur(8px)" : "none"}; transform: scale(.98); }
  100% { opacity: 1; filter: blur(0); transform: scale(1); }
}
@keyframes pfSlide {
  0% { transform: translateY(6px); }
  100% { transform: translateY(0); }
}
      `}</style>
    </div>
  );
}
