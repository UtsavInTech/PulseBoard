/**
 * Central content/config for the public PulseBoard site.
 * Demo usernames MUST stay in sync with backend/seed.py SEED_USERS.
 */

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Solutions", to: "/solutions" },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: "/contact" },
];

/** The demo company whose product data every demo account analyses. */
export const DEMO_COMPANY = {
  name: "Meridian Retail",
  product: "Meridian Shop",
};

/**
 * Seeded demo accounts — see backend/seed.py SEED_MEMBERS.
 * All four are employees of DEMO_COMPANY and read the SAME end-user dataset;
 * their role changes the perspective, never the data.
 */
export const DEMO_ACCOUNTS = [
  {
    username: "utsav",
    label: "Utsav",
    role: "Product Manager",
    focus: "Feature adoption, usage and drop-off",
  },
  {
    username: "utsav1",
    label: "Utsav1",
    role: "Growth Manager",
    focus: "Acquisition, activation, conversion, retention",
  },
  {
    username: "utsav2",
    label: "Utsav2",
    role: "User Researcher",
    focus: "Journeys, repeated actions and friction",
  },
  {
    username: "utsav3",
    label: "Utsav3",
    role: "Executive",
    focus: "Combined overview across all three",
  },
];

export const DEMO_PASSWORD = "password123";

export const CONTACT = {
  name: "Utsav",
  title: "Founder & Developer — PulseBoard",
  email: "utsav.udk@gmail.com",
  linkedin: "https://www.linkedin.com/in/utsav-tech/",
  whatsappNumber: "6200842008",
  whatsappUrl: "https://wa.me/916200842008",
};
