import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import SiteLayout from "./components/marketing/SiteLayout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import SolutionsPage from "./pages/SolutionsPage";
import CareersPage from "./pages/CareersPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import LoginPage from "./pages/LoginPage";
import AppNavbar from "./components/Navbar";
import ProfilePage from "./pages/ProfilePage";

// The dashboard pulls in recharts — keep it out of the marketing bundle.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));

/** Shown while the dashboard chunk loads. */
function DashboardFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
        fontSize: "0.9375rem",
      }}
    >
      Loading dashboard…
    </div>
  );
}

/** Gate for the existing analytics application. */
function RequireAuth({ children }) {
  const { auth } = useAuth();
  const location = useLocation();
  if (!auth) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Signed-in users skip the login form. */
function RedirectIfAuthed({ children }) {
  const { auth } = useAuth();
  return auth ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public marketing site ─────────────────────────────── */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
          </Route>

          {/* ── Authentication ────────────────────────────────────── */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />

          {/* ── Existing analytics application ────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <>
                  <AppNavbar />
                  <Suspense fallback={<DashboardFallback />}>
                    <DashboardPage />
                  </Suspense>
                </>
              </RequireAuth>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <>
                  <AppNavbar />
                  <ProfilePage />
                </>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
