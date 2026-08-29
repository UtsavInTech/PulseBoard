import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SiteNavbar from "./SiteNavbar";
import SiteFooter from "./SiteFooter";
import BackgroundFX from "./BackgroundFX";
import Assistant from "./Assistant";

/**
 * html has `scroll-behavior: smooth` for in-page anchors, so a route change
 * must opt out of it explicitly — otherwise the new page glides to the top.
 */
function jumpToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

/** Shell for every public marketing route: fixed navbar + page + footer. */
export default function SiteLayout() {
  const { pathname, hash } = useLocation();

  // Reset scroll on navigation, but honour in-page #anchors.
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    jumpToTop();
  }, [pathname, hash]);

  return (
    <>
      <BackgroundFX />
      <SiteNavbar />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      <Assistant />
    </>
  );
}
