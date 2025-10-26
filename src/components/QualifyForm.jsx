import React, { useEffect, useState } from "react";

export default function QualifyForm({ questions = [], onSubmit }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = {};
    questions.forEach((q) => (init[q.id] = ""));
    setValues(init);
  }, [questions]);

  function update(id, v) {
    setValues((s) => ({ ...s, [id]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="block text-sm text-white/80">
            {q.question_text}
            {q.required && " *"}
          </label>

          {q.input_type === "textarea" ? (
            <textarea
              className="w-full rounded-lg bg-white/5 border border-white/15 p-3"
              required={q.required}
              value={values[q.id] || ""}
              onChange={(e) => update(q.id, e.target.value)}
            />
          ) : q.input_type === "select" ? (
            <select
              className="w-full rounded-lg bg-white/5 border border-white/15 p-3"
              required={q.required}
              value={values[q.id] || ""}
              onChange={(e) => update(q.id, e.target.value)}
            >
              <option value="">Select...</option>
              {(q.input_options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : q.input_type === "radio" ? (
            <div className="space-y-2">
              {(q.input_options || []).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-white/90">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    required={q.required}
                    onChange={(e) => update(q.id, e.target.value)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <input
              className="w-full rounded-lg bg-white/5 border border-white/15 p-3"
              type={q.input_type === "number" ? "number" : q.input_type === "email" ? "email" : "text"}
              required={q.required}
              value={values[q.id] || ""}
              onChange={(e) => update(q.id, e.target.value)}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-white/90 text-black font-semibold py-3 hover:bg-white"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
      <p className="text-xs text-white/50">
        This is not a job offer. Earnings vary. Effort required. You must be 18+ to apply.
      </p>
    </form>
  );
}
