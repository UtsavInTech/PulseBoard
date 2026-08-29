import React from "react";

/** Minimal 22px stroke icon set — currentColor, no external dependency. */
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const PulseIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l2.5-7 4 14L16 12h5" />
  </svg>
);

export const NetworkIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="9" r="2" />
    <circle cx="9" cy="18" r="2" />
    <path d="M6.8 7L17 8.6M7.4 16.4l10.2-6M6 8v8" />
  </svg>
);

export const TargetIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
);

export const UsersIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.9c2 .7 3.3 2.4 3.3 4.6" />
  </svg>
);

export const AlertIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 21 19H3z" />
    <path d="M12 9.5v4.2M12 16.6h.01" />
  </svg>
);

export const ChartIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16V11M12.5 16V7M17 16v-3" />
  </svg>
);

export const CartIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 4h2.2l2 11h10l2-8H6" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </svg>
);

export const LayersIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 3 8l9 5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
);

export const ShieldIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.2 19.5 6v6c0 4.2-3 7.4-7.5 8.8C7.5 19.4 4.5 16.2 4.5 12V6z" />
    <path d="M9.2 12.2l2 2 3.6-3.8" />
  </svg>
);

export const CodeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M9 7 4.5 12 9 17M15 7l4.5 5-4.5 5" />
  </svg>
);

export const DatabaseIcon = (p) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="6" rx="7.5" ry="3" />
    <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </svg>
);

export const GridIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

export const SparkIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.8 9 19.5 10.5 13.8 12 12 17.5 10.2 12 4.5 10.5 10.2 9z" />
  </svg>
);

export const EyeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const TrendIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 16.5 9 10l4 4 8-8.5" />
    <path d="M15.5 5.5H21V11" />
  </svg>
);
