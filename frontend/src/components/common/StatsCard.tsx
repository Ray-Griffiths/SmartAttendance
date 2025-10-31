import React from 'react';

interface StatsCardProps {
  title: string;
  value?: string | number | null;
  subtitle?: string;
  trend?: 'up' | 'down' | null;
  trendValue?: string | number;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className = '',
}) => {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div 
      className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}
      role="group"
      aria-labelledby={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="text-sm font-medium text-gray-500 uppercase tracking-wide" id={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {title}
      </div>
      
      <div className="mt-2 flex items-baseline">
        <div className="text-2xl font-semibold text-gray-900">
          {value ?? '—'}
        </div>
        
        {trendValue && trend && (
          <span className={`ml-2 text-sm font-medium ${trendColor} flex items-center`}>
            {trendIcon}
            {trendValue}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-sm text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
};