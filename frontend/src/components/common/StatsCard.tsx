// components/admin/common/StatsCard.tsx
import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number | null;
  subtitle?: string;
  trend?: "up" | "down" | null;
  trendValue?: string | number;
  className?: string;
  /** Icon from lucide-react */
  icon?: LucideIcon;
  /** Tailwind gradient classes (e.g. "from-blue-500 to-cyan-500") */
  gradient?: string;
  /** Fallback accent color if no gradient (e.g. "blue") */
  accentColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className = "",
  icon: Icon,
  gradient = "from-blue-500 to-blue-600",
  accentColor = "blue",
}) => {
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600";
  const trendIcon = trend === "up" ? "Up" : trend === "down" ? "Down" : "";

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90
        border border-gray-200 dark:border-slate-800
        shadow-lg hover:shadow-2xl transition-all duration-300
        group ${className}
      `}
      role="group"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Optional subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent dark:via-slate-900/50 opacity-60" />

      <div className="relative p-6">
        {/* Icon with gradient background */}
        {Icon && (
          <div
            className={`
              absolute top-6 right-6 p-4 rounded-2xl bg-gradient-to-br ${gradient}
              shadow-xl group-hover:scale-110 transition-transform duration-300
            `}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="max-w-[70%]">
          <p
            id={`stats-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
          >
            {title}
          </p>

          <div className="mt-3 flex items-end gap-3">
            <p className="text-4xl font-bold text-gray-900 dark:text-white">
              {value !== null && value !== undefined ? value.toLocaleString() : "—"}
            </p>

            {trend && trendValue !== undefined && (
              <span
                className={`
                  text-sm font-semibold flex items-center gap-1
                  ${trendColor}
                `}
              >
                {trendIcon}
                {trendValue}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};