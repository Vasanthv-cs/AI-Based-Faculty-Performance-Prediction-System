import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/10 border-primary/20',
    accent: 'bg-accent/10 border-accent/20',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary text-primary-foreground',
    accent: 'bg-accent text-accent-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn(
      'stat-card-premium group hover:bg-white/90 dark:hover:bg-card/90', 
      className
    )}>
      {/* Decorative Gradient Blob */}
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none",
        variant === 'primary' && "bg-primary",
        variant === 'accent' && "bg-accent",
        variant === 'success' && "bg-emerald-500",
        variant === 'warning' && "bg-amber-500",
        variant === 'default' && "bg-slate-400"
      )} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[12px] uppercase tracking-wider font-semibold text-muted-foreground/80 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-display font-black text-foreground">{value}</p>
            {trend && trendValue && (
              <div className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-background/50 backdrop-blur-sm border', trendColor, 
                trend === 'up' ? 'border-success/20' : 'border-destructive/20')}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3', 
          iconStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
