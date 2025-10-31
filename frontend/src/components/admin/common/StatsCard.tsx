// src/components/admin/common/StatsCard.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./StatsCard.module.css";

type AccentColor = "blue" | "green" | "yellow" | "red" | "muted" | "purple";
type TrendType = "up" | "down" | null;

export interface StatsCardProps {
  title?: string;
  value?: string | number | null;
  subtitle?: string;
  icon?: LucideIcon;
  percent?: string | number;
  trend?: TrendType;
  accentColor?: AccentColor | string;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title = "",
  value,
  subtitle = "",
  icon: Icon,
  percent,
  trend = null,
  accentColor = "blue",
  className = "",
  loading = false,
  onClick,
}) => {
  const percentColor =
    trend === "up"
      ? styles.percentUp
      : trend === "down"
      ? styles.percentDown
      : styles.percentNeutral;

  const arrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  const ariaLabel =
    title +
    (loading
      ? ", loading"
      : value !== null && value !== undefined
      ? `: ${value}`
      : ", no data");

  const isButton = Boolean(onClick);

  // Only assign ARIA role when meaningful
  const role = isButton ? "button" : undefined;

  return (
    <div
      className={`${styles.statsCard} ${styles[accentColor]} ${className} ${
        isButton ? styles.clickable : ""
      }`}
      {...(role && { role })}
      aria-label={ariaLabel}
      tabIndex={isButton ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isButton && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}

        {loading ? (
          <div className={styles.skeleton}>
            <div className={styles.skeletonValue} />
            <div className={styles.skeletonPercent} />
          </div>
        ) : (
          <div className={styles.value}>{value ?? "—"}</div>
        )}

        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

        {percent !== undefined && (
          <div className={`${styles.percentContainer} ${percentColor}`}>
            {arrow && <span className={styles.arrow}>{arrow}</span>}
            <span>
              {typeof percent === "number" ? `${percent}%` : percent}
            </span>
            <span className={styles.periodLabel}>vs last period</span>
          </div>
        )}
      </div>

      <div className={`${styles.iconContainer} ${styles[`${accentColor}Bg`]}`}>
        {Icon ? (
          <Icon
            className={styles.icon}
            size={28}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.icon}
            aria-hidden="true"
          >
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        )}
      </div>
    </div>
  );
};

export { StatsCard };
export default StatsCard;
