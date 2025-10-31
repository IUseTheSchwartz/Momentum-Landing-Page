// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * items: array from mf_proof_posts (shape-flexible)
 * visibleCount: number of cards to show at a time (default 4)
 * cycleMs: autoplay interval per “page”
 * blurTransition: if true, cards blur/fade/scale during slide
 * bigSlides: if true, make slides/cards a bit larger
 */
export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = true,
  bigSlides = true,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const pages = useMemo(() => {
    if (!safeItems.length) return [[]];
    const chunk = Math.max(1, visibleCount);
    const out = [];
    for (let i = 0; i < safeItems.length; i += chunk) {
      out.push(safeItems.slice(i, i + chunk));
    }
    // if fewer than visibleCount, still show a single page that duplicates to fill
    if (out.length === 1 && out[0].length < chunk) {
      const base = out[0].slice();
      while (out[0].length < chunk) out[0].push(base[out[0].length % base.length]);
    }
    return out;
  }, [safeItems, visibleCount]);

  const [page, setPage] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (pages.length <= 1) return;
    timer.current = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, cycleMs);
    return () => clearInterval(timer.current);
  }, [pages.length, cycleMs]);

  // slide animation state
  const [slideKey, setSlideKey] = useState(0);
  useEffect(() => setSlideKey((k) => k + 1), [page]);

  return (
    <div className="relative">
      {/* Track */}
      <div className="overflow-hidden">
        {/* Animated container (key forces enter/exit on page change) */}
        <div
          key={slideKey}
          className={`grid transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)] ${
            bigSlides ? "md:grid-cols-4 grid-cols-2 gap-3" : "md:grid-cols-4 grid-cols-2 gap-2"
          }`}
          style={{
            // subtle entrance scale for whole page
            transform: "translate3d(0,0,0) scale(1)",
          }}
        >
          {pages[page].map((it, i) => (
            <Card
              key={`${page}-${i}`}
              item={it}
              index={i}
              blur={blurTransition}
              big={bigSlides}
            />
          ))}
        </div>
      </div>

      {/* Dots */}
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
  // Flexible field picks
  const amount =
    item.amount ??
    item.sale_amount ??
    item.premium ??
    null;

  const who =
    item.buyer_name ??
    item.client_name ??
    item.agent_name ??
    item.user_name ??
    item.title ??
    "New sale";

  const note =
    item.caption ??
    item.note ??
    item.description ??
    "";

  const img =
    item.image_url ??
    item.screenshot_url ??
    item.photo_url ??
    null;

  const when = item.created_at ? new Date(item.created_at) : null;
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
      style={
        blur
          ? {
              // subtle blur/fade on initial mount
              animation:
                "pfFade 700ms ease var(--pf-stagger,0ms) both, pfSlide 700ms ease both",
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {img ? (
          <div className="shrink-0">
            <img
              src={img}
              alt=""
              className={`rounded-lg object-cover ${
                big ? "h-16 w-16" : "h-14 w-14"
              }`}
              style={blur ? { filter: "brightness(.95) contrast(1.05)" } : undefined}
            />
          </div>
        ) : (
          <div
            className={`rounded-lg bg-white/5 border border-white/10 grid place-items-center ${
              big ? "h-16 w-16" : "h-14 w-14"
            }`}
          >
            <span className="text-xs text-white/50">SALE</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">
              {who}
            </div>
            {amount != null && (
              <div className="ml-auto shrink-0 text-sm font-bold bg-white text-black rounded px-2 py-0.5">
                ${Number(amount).toLocaleString()}
              </div>
            )}
          </div>
          {whenStr && (
            <div className="text-xs text-white/50 mt-0.5">{whenStr}</div>
          )}
          {note && (
            <div className="text-sm text-white/80 mt-1 line-clamp-2">{note}</div>
          )}
        </div>
      </div>

      {/* tiny progress shimmer on hover */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full w-1/3 animate-pulse bg-white/30" />
      </div>

      {/* Local CSS animations */}
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
