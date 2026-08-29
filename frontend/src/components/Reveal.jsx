import React, { useEffect, useRef } from "react";

/**
 * Scroll-reveal wrapper built on IntersectionObserver.
 * Styling lives in index.css under [data-reveal] so it stays a single
 * shared transition rather than per-component CSS.
 *
 * Usage:  <Reveal delay={80}><Card /></Reveal>
 *         <Reveal as="h2" delay={0}>Heading</Reveal>
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-reveal", "in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal", "in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={{ "--reveal-delay": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
