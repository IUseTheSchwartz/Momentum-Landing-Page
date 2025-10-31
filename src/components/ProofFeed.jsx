// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** Heuristics to read many possible column names -------------------------------- */
function pick(obj, keys = []) {
  for (const k of keys) {
    if (obj?.[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}
function deepPick(obj, paths = []) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    for (const part of parts) {
      if (cur == null) break;
      cur = cur[part];
    }
    if (cur != null && cur !== "") return cur;
  }
  return null;
}
function parseAmountMaybeCents(raw) {
  if (raw == null) return null;

  // strings like "$200", "200.00", "200", "200 USD"
  if (typeof raw === "string") {
    const m = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    const val = parseFloat(m[0]);
    return isNaN(val) ? null : val;
  }

  // numbers: could be dollars or cents
  if (typeof raw === "number") {
    // Heuristic: treat as cents if clearly too large and divisible by 100 (or looks like cents)
    if (raw >= 10000 && raw % 100 === 0) return raw / 100;
    // Or if integer and ends with typical cents pattern (e.g., 24500)
    if (raw >= 5000 && Number.isInteger(raw) && `${raw}`.endsWith("00")) return raw / 100;
    return raw;
  }

  return null;
}

function normalizeProof(item) {
  // amount candidates
  const amount =
    parseAmountMaybeCents(
      pick(item, [
        "amount",
        "sale_amount",
        "premium",
        "value",
        "price",
        "total",
        "amount_dollars",
      ])
    ) ??
    parseAmountMaybeCents(
      pick(item, [
        "amount_cents",
        "premium_cents",
        "value_cents",
        "price_cents",
        "total_cents",
        "minor_amount",
      ])
    ) ??
    parseAmountMaybeCents(deepPick(item, ["data.amount", "meta.amount"]));

  // who/title candidates
  const who =
    pick(item, [
      "buyer_name",
      "client_name",
      "agent_name",
      "user_name",
      "customer",
      "title",
      "name",
      "headline",
    ]) ??
    deepPick(item, ["data.title", "meta.title"]) ??
    "New sale";

  // note/description
  const note =
    pick(item, ["caption", "note", "description", "body", "text"]) ??
    deepPick(item, ["data.caption", "meta.note"]) ??
    "";

  // image
  const img =
    pick(item, [
      "image_url",
      "img_url",
      "screenshot_url",
      "photo_url",
      "thumbnail_url",
      "thumb",
      "image",
    ]) ??
    deepPick(item, ["data.image_url", "meta.image_url"]);

  // date/time
  const whenRaw =
    pick(item, ["created_at", "published_at", "timestamp", "ts", "date"]) ??
    deepPick(item, ["data.created_at", "meta.created_at"]);
  const when = whenRaw ? new Date(whenRaw) : null;

  return { amount, who, note, img, when };
}

/** Component ------------------------------------------------------------------- */
/**
 * items: array from mf_proof_posts (shape-flexible)
 * visibleCount: # cards shown at once
 * cycleMs: autoplay interval
 * blurTransition: visual effect
 * bigSlides: larger cards
 */
export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = true,
  bigSlides = true,
}) {
  const safeItems = Array.isArray(items) ? items : [];

  // Normalize once
  const norm = useMemo(() => safeItems.map(normalizeProof), [safeItems]);

  // Sort newest first if no order applied upstream
  const sorted = useMemo(() => {
    return [...norm].sort((a, b) => {
      const ta = a.when ? a.when.getTime() : 0;
      const tb = b.when ? b.when.getTime() : 0;
      return tb - ta;
    });
  }, [norm]);

  // Paginate into pages of N
  const pages = useMemo(() => {
    const chunk = Math.max(1, visibleCount);
    if (!sorted.length) return [[]];
    const out = [];
    for (let i = 0; i < sorted.length; i += chunk) {
      out.push(sorted.slice(i, i + chunk));
    }
    if (out.length === 1 && out[0].length < chunk && out[0].length > 0) {
      const base = out[0].slice();
      while (out[0].length < chunk) out[0].push(base[out[0].length % base.length]);
    }
    return out;
  }, [sorted, visibleCount]);

  const [page, setPage] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (pages.length <= 1) return;
    timer.current = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, cycleMs);
    return () => clearInterval(timer.current);
  }, [pages.length, cycleMs]);

  // trigger enter animation on page change
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
  const { amount, who, note, img, when } = item;
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
          ? { animation: "pfFade 700ms ease both, pfSlide 700ms ease both" }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {img ? (
          <div className="shrink-0">
            <img
              src={img}
              alt=""
              className={`rounded-lg object-cover ${big ? "h-16 w-16" : "h-14 w-14"}`}
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

        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">{who}</div>
            {amount != null && !Number.isNaN(amount) && (
              <div className="ml-auto shrink-0 text-sm font-bold bg-white text-black rounded px-2 py-0.5">
                ${Number(amount).toLocaleString()}
              </div>
            )}
          </div>
          {whenStr && <div className="text-xs text-white/50 mt-0.5">{whenStr}</div>}
          {note && <div className="text-sm text-white/80 mt-1 line-clamp-2">{note}</div>}
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
