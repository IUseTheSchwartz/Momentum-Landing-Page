import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1f22] text-white p-6">
      <form onSubmit={onLogin} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h1 className="text-xl font-bold">Admin Login</h1>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <div>
          <label className="text-sm text-white/70">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 p-3"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white/90 text-black font-semibold py-3 hover:bg-white"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
