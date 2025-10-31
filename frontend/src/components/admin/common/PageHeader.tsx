import React from "react";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Main heading for the page
   */
  title: string;
  
  /**
   * Optional smaller description
   */
  subtitle?: string | React.ReactNode;
  
  /**
   * Optional node rendered to the right (e.g. buttons)
   */
  actions?: React.ReactNode;
  
  /**
   * Extra class for outer container
   */
  className?: string;
  
  /**
   * Optional extra content rendered below header row
   */
  children?: React.ReactNode;
}

/**
 * Reusable page header for SmartAttendance pages.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle = null,
  actions = null,
  className = "",
  children = null,
  ...rest
}) => {
  return (
    <header
      className={`${styles.container} ${className}`}
      role="banner"
      aria-label={title}
      {...rest}
    >
      <div className={styles.row}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title} title={title}>
            {title}
          </h1>
          {subtitle && (
            <p className={styles.subtitle}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {children && <div className={styles.children}>{children}</div>}
    </header>
  );
};

export default PageHeader;