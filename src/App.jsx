// File: src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing.jsx";
import Reschedule from "./pages/Reschedule.jsx";
import Admin from "./pages/Admin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import { supabase } from "./lib/supabaseClient.js";

/** Gate that protects /admin using your existing Supabase session logic */
function AdminGate() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription?.unsubscribe();
  }, []);

  if (checking) return null; // prevents brief flash
  return session ? <Admin /> : <AdminLogin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/reschedule" element={<Reschedule />} />

        {/* Admin (auth required) */}
        <Route path="/admin" element={<AdminGate />} />

        {/* Optional: redirect any unknown path back home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
