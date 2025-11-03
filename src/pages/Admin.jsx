// File: src/pages/Admin.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

import AdminSettings from "./admin/AdminSettings.jsx";
import AdminQuestions from "./admin/AdminQuestions.jsx";
import AdminProof from "./admin/AdminProof.jsx";
import AdminLeads from "./admin/AdminLeads.jsx";
import AdminAvailability from "./admin/AdminAvailability.jsx";
import AdminAnalytics from "./admin/AdminAnalytics.jsx"; // ← add this

export default function Admin() {
  const [tab, setTab] = useState("settings");
  const tabs = ["settings", "questions", "proof", "leads", "availability", "analytics"]; // ← add

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 items-center">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg ${tab === t ? "bg:white text-black bg-white" : "bg-white/10"}`}
            >
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          >
            Sign out
          </button>
        </div>

        {tab === "settings" && <AdminSettings />}
        {tab === "questions" && <AdminQuestions />}
        {tab === "proof" && <AdminProof />}
        {tab === "leads" && <AdminLeads />}
        {tab === "availability" && <AdminAvailability />}
        {tab === "analytics" && <AdminAnalytics />} {/* ← render analytics */}
      </div>
    </div>
  );
}
