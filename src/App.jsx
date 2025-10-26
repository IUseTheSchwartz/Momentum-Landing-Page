import React, { useEffect, useState } from "react";
import Landing from "./pages/Landing.jsx";
import Admin from "./pages/Admin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import { supabase } from "./lib/supabaseClient.js";

export default function App() {
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(isAdminRoute); // only check when on /admin

  useEffect(() => {
    if (!isAdminRoute) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription?.unsubscribe();
  }, [isAdminRoute]);

  if (!isAdminRoute) return <Landing />;

  if (checking) return null; // brief flash blocker
  return session ? <Admin /> : <AdminLogin />;
}
