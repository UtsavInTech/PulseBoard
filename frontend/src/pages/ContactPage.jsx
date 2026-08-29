import React, { useState } from "react";
import Reveal from "../components/Reveal";
import { CONTACT } from "../constants/site";
import m from "../styles/marketing.module.css";
import s from "./ContactPage.module.css";

/**
 * Profile photo. Served straight from frontend/public, so Vite copies it to
 * the build output untouched and the path works in dev and behind nginx alike.
 * Until the file exists the initial-placeholder is shown instead.
 */
const PHOTO_SRC = "/profile.jpg";

const LinkedInGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.76-1.95C20.3 8.75 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.3-2.05-3.3-2.05 0-2.37 1.57-2.37 3.2V21H9z" />
  </svg>
);

const WhatsAppGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.83c0 1.98.58 3.82 1.58 5.37L2 22.5l5.45-1.73a9.78 9.78 0 0 0 4.59 1.15h.01c5.43 0 9.84-4.4 9.84-9.83S17.47 2 12.04 2zm5.7 13.92c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11a15.7 15.7 0 0 1-1.65-.6c-2.9-1.25-4.8-4.16-4.94-4.35-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.14.12.31.02.5-.1.2-.15.32-.3.49l-.44.51c-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.14.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.68-.17 1.34z" />
  </svg>
);

const MailGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3 7 8.2 5.6a1.4 1.4 0 0 0 1.6 0L21 7" />
  </svg>
);

export default function ContactPage() {
  const [hasPhoto, setHasPhoto] = useState(true);

  const channels = [
    {
      href: CONTACT.linkedin,
      external: true,
      icon: <LinkedInGlyph />,
      iconClass: s.iconLinkedin,
      title: "Connect on LinkedIn",
      meta: "linkedin.com/in/utsav-tech",
    },
    {
      href: CONTACT.whatsappUrl,
      external: true,
      icon: <WhatsAppGlyph />,
      iconClass: s.iconWhatsapp,
      title: "Message on WhatsApp",
      meta: CONTACT.whatsappNumber,
    },
    {
      href: `mailto:${CONTACT.email}`,
      external: false,
      icon: <MailGlyph />,
      iconClass: s.iconEmail,
      title: "Send an Email",
      meta: CONTACT.email,
    },
  ];

  return (
    <>
      <section className={m.pageHero}>
        <div className={m.container}>
          <Reveal>
            <span className={m.pageHeroEyebrow}>Contact</span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className={m.pageHeroTitle}>Let's Talk About PulseBoard</h1>
          </Reveal>
          <Reveal delay={130}>
            <p className={m.pageHeroText}>
              Have an idea, want to explore the platform, or simply want to talk about what
              we're building? Get in touch.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={s.wrap}>
            {/* ── Profile ─────────────────────────────────────────── */}
            <Reveal className={s.profileCard}>
              <div className={s.photoFrame}>
                {hasPhoto ? (
                  <img
                    className={s.photo}
                    src={PHOTO_SRC}
                    alt={`${CONTACT.name} — ${CONTACT.title}`}
                    width="172"
                    height="172"
                    decoding="async"
                    onError={() => setHasPhoto(false)}
                  />
                ) : (
                  <span className={s.photoPlaceholder}>
                    <span className={s.photoInitial}>U</span>
                    <span className={s.photoHint}>Photo</span>
                  </span>
                )}
              </div>

              <h2 className={s.name}>{CONTACT.name}</h2>
              <p className={s.role}>{CONTACT.title}</p>

              <ul className={s.detailList}>
                <li>
                  <span className={s.detailLabel}>Email</span>
                  <a className={s.detailValue} href={`mailto:${CONTACT.email}`}>
                    {CONTACT.email}
                  </a>
                </li>
                <li>
                  <span className={s.detailLabel}>LinkedIn</span>
                  <a
                    className={s.detailValue}
                    href={CONTACT.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /in/utsav-tech
                  </a>
                </li>
                <li>
                  <span className={s.detailLabel}>WhatsApp</span>
                  <a
                    className={s.detailValue}
                    href={CONTACT.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {CONTACT.whatsappNumber}
                  </a>
                </li>
              </ul>
            </Reveal>

            {/* ── Channels ────────────────────────────────────────── */}
            <div>
              <Reveal>
                <span className={m.eyebrow}>Get in touch</span>
              </Reveal>
              <Reveal delay={70}>
                <h2 className={m.heading}>Pick whichever channel suits you.</h2>
              </Reveal>
              <Reveal delay={130}>
                <p className={s.channelIntro}>
                  Whether it's a question about how PulseBoard works, an idea for where it
                  could go next, or a conversation about building something together —
                  every message reaches me directly.
                </p>
              </Reveal>

              <div className={s.channels}>
                {channels.map((c, i) => (
                  <Reveal
                    key={c.title}
                    as="a"
                    delay={i * 90}
                    className={s.channel}
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    <span className={`${s.channelIcon} ${c.iconClass}`}>{c.icon}</span>
                    <span className={s.channelBody}>
                      <span className={s.channelTitle}>{c.title}</span>
                      <span className={s.channelMeta}>{c.meta}</span>
                    </span>
                    <span className={s.channelArrow} aria-hidden="true">→</span>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={140}>
                <p className={s.responseNote}>
                  PulseBoard is an independent project built and maintained by one person,
                  so replies come straight from me — usually within a day or two.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
