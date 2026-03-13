import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PerformanceScoreCardProps {
  score: number;
  category: string;
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    label: string;
    score: number;
    color: string;
  }[];
}

const PerformanceScoreCard: React.FC<PerformanceScoreCardProps> = ({
  score,
  category,
  trend,
  breakdown,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const maxScore = 250;
  const percentage = Math.max(0, Math.min(100, (score / maxScore) * 100));
  
  const getCategoryColor = () => {
    if (percentage >= 85) return 'text-success';
    if (percentage >= 70) return 'text-primary';
    if (percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getPercentageColor = () => {
    if (percentage >= 85) return 'text-emerald-500';
    if (percentage >= 70) return 'text-indigo-500';
    if (percentage >= 50) return 'text-amber-500';
    return 'text-rose-500';
  }

  return (
    <div className="premium-card p-8 group">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <h3 className="font-display font-black text-xl tracking-tight">Performance Analytics</h3>
      </div>
      
      {/* Main Score Circle with Gradient Shine */}
      <div className="flex justify-center mb-8 relative">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-[60px] animate-pulse-subtle -z-10" />
        <div className="relative w-48 h-48 drop-shadow-2xl">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="84"
              fill="none"
              stroke="hsl(var(--muted)/0.3)"
              strokeWidth="10"
            />
            <circle
              cx="96"
              cy="96"
              r="84"
              fill="none"
              stroke="url(#performanceGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 527.7} 527.7`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-5xl font-display font-black tracking-tighter leading-none', getCategoryColor())}>{score}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">out of {maxScore}</span>
            <div className={cn('flex items-center gap-0.5 mt-2 px-2 py-0.5 rounded-full bg-muted/30 border border-white/10 shadow-sm animate-reveal', trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-[10px] font-bold">Stable Trend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="flex flex-col items-center mb-10">
        <div className={cn(
          'px-6 py-2.5 rounded-[20px] shadow-xl border border-white/10 backdrop-blur-md transition-all duration-500 hover:scale-105',
          percentage >= 85 ? 'bg-emerald-500/10 border-emerald-500/20' :
          percentage >= 70 ? 'bg-indigo-500/10 border-indigo-500/20' :
          percentage >= 50 ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-rose-500/10 border-rose-500/20'
        )}>
          <span className={cn('text-sm font-black uppercase tracking-[0.2em]', getPercentageColor())}>
            Rank: {category}
          </span>
        </div>
      </div>

      {/* Score Breakdown with Premium Bars */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-1 h-3 bg-muted rounded-full" />
           <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Component Scores</h4>
        </div>
        <div className="grid gap-5">
          {breakdown.map((item, index) => (
            <div key={index} className="space-y-2 group/bar">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-foreground/80 group-hover/bar:text-primary transition-colors">{item.label}</span>
                <span className="text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 shadow-sm">{item.score}%</span>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden p-[1px] relative">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000 ease-out shadow-lg', item.color)}
                  style={{ width: `${item.score}%` }}
                >
                   <div className="absolute inset-0 bg-white/20 animate-pulse-subtle" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceScoreCard;
