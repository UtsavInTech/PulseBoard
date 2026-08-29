import React from "react";
import { Link } from "react-router-dom";
import styles from "./Button.module.css";

/**
 * Shared CTA button. Renders as <Link> (to), <a> (href) or <button>.
 * variant: primary | secondary | navy | onDark | ghostOnDark
 */
export default function Button({
  to,
  href,
  variant = "primary",
  size = "md",
  block = false,
  arrow = false,
  children,
  className = "",
  ...rest
}) {
  const cls = [
    styles.btn,
    styles[variant],
    size !== "md" ? styles[size] : "",
    block ? styles.block : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {children}
      {arrow && <span className={styles.arrow} aria-hidden="true">→</span>}
    </>
  );

  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}
