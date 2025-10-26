import React from "react";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";

export default function App() {
  // super simple router for now: /admin shows admin
  const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  return isAdmin ? <Admin /> : <Landing />;
}
