// File: src/pages/admin/AdminQuestions.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

export default function AdminQuestions() {
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_questions").select("*").order("sort_order", { ascending: true });
      setList(data || []);
    })();
  }, []);

  function add() {
    setList((ls) => [
      ...ls,
      {
        id: crypto.randomUUID(),
        question_text: "Are you prepared to work 12–14 hours/day for the first 60 days?",
        input_type: "radio",
        input_options: ["Yes", "No"],
        required: true,
        is_active: true,
        sort_order: (ls?.length || 0) + 1,
        _new: true,
      },
    ]);
  }

  function update(i, patch) {
    setList((ls) => {
      const n = [...ls];
      n[i] = { ...n[i], ...patch };
      return n;
    });
  }

  async function save() {
    setSaving(true);
    try {
      for (const q of list) {
        const row = { ...q };
        delete row._new;
        if (q._new) {
          const { error } = await supabase.from("mf_questions").insert([row]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("mf_questions").update(row).eq("id", q.id);
          if (error) throw error;
        }
      }
      alert("Questions saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Questions</h3>
        <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">Add</button>
      </div>

      {list.map((q, i) => (
        <div key={q.id} className="rounded-xl bg-black/20 p-3 border border-white/10">
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-white/60">
              Question
              <input
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.question_text}
                onChange={(e) => update(i, { question_text: e.target.value })}
              />
            </label>
            <label className="text-xs text-white/60">
              Input type
              <select
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.input_type}
                onChange={(e) => update(i, { input_type: e.target.value })}
              >
                {["text", "textarea", "number", "email", "phone", "select", "radio", "checkbox"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs text-white/60 block mt-2">
            Options (comma-separated, for select/radio)
            <input
              className="mt-1 w-full bg-white/5 border border-white/15 p-2 rounded"
              placeholder="Yes,No"
              value={(q.input_options || []).join(",")}
              onChange={(e) =>
                update(i, {
                  input_options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!q.required} onChange={(e) => update(i, { required: e.target.checked })} />
              Required
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!q.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} />
              Active
            </label>
            <label className="text-xs text-white/60">
              Order
              <input
                type="number"
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.sort_order || 0}
                onChange={(e) => update(i, { sort_order: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Questions"}
      </button>
    </div>
  );
}
