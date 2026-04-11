import styles from "./Logo.module.css";

export default function Logo({ variant = "default", showText = true, size = "md" }) {
  return (
    <div className={`${styles.logoContainer} ${variant === "white" ? styles.white : ""} ${size === "lg" ? styles.lg : ""}`}>
      <div className={styles.isotypeContainer}>
        <img
          src="/solcan-logo-mark.jpg"
          alt="Solcan Logo"
          className={styles.logoImage}
        />
      </div>
      {showText && <span className={styles.logoText}>Solcan Lab</span>}
    </div>
  );
}
