import React from 'react';
import { Brain, Sparkles, TrendingUp, Award, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'achievement';
  title: string;
  description: string;
  confidence?: number;
}

interface AIInsightsCardProps {
  insights: AIInsight[];
  title?: string;
}

const INSIGHT_META: Record<
  AIInsight['type'],
  { label: string; icon: typeof Brain; color: string; bgClass: string; chartColor: string }
> = {
  prediction: {
    label: 'Prediction',
    icon: Brain,
    color: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
    chartColor: 'hsl(var(--primary))',
  },
  recommendation: {
    label: 'Recommendation',
    icon: Sparkles,
    color: 'text-accent',
    bgClass: 'bg-accent/10 border-accent/20',
    chartColor: 'hsl(var(--chart-2))',
  },
  alert: {
    label: 'Alert',
    icon: TrendingUp,
    color: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
    chartColor: 'hsl(var(--chart-3))',
  },
  achievement: {
    label: 'Achievement',
    icon: Award,
    color: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
    chartColor: 'hsl(var(--chart-1))',
  },
};

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ insights, title = 'AI Insights' }) => {
  const hasInsights = insights.length > 0;

  // Build chart data: count by type for distribution
  const typeCounts = insights.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const chartData = (['achievement', 'recommendation', 'prediction', 'alert'] as const)
    .filter((t) => typeCounts[t] > 0)
    .map((type) => ({
      name: INSIGHT_META[type].label,
      value: typeCounts[type],
      color: INSIGHT_META[type].chartColor,
    }));

  const summaryParts = chartData.map((d) => `${d.value} ${d.name}${d.value > 1 ? 's' : ''}`);
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' · ') : '';

  return (
    <div className="premium-card overflow-hidden group">
      {/* Header with gradient accent */}
      <div className="border-b bg-muted/20 px-6 py-6 border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 animate-float">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl tracking-tight">{title}</h3>
              {hasInsights && summaryText && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">{summaryText}</p>
              )}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm border border-border/50 text-muted-foreground">
             <Brain className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="p-8">
        {hasInsights ? (
          <div className="grid md:grid-cols-1 gap-8">
            {/* Insight type distribution chart */}
            {chartData.length > 0 && (
              <div className="rounded-2xl border bg-white/40 dark:bg-slate-900/40 p-6 shadow-inner backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground/80">Intelligence Distribution</h4>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={10}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeWidth={4} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: 'none',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                        }}
                      />
                      {chartData.length > 1 && (
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Insight list with improved presentation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1 h-4 bg-primary rounded-full" />
                 <h4 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground/80">Actionable Intelligence</h4>
              </div>
              <div className="grid gap-4">
                {insights.map((insight, index) => {
                  const meta = INSIGHT_META[insight.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={index}
                      className={cn(
                        'rounded-[24px] border border-border/30 p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group/insight overflow-hidden relative',
                        meta.bgClass
                      )}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover/insight:scale-125 transition-transform">
                        <Icon className="w-16 h-16" />
                      </div>
                      <div className="flex gap-5 relative z-10">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-white dark:bg-slate-900 shadow-lg group-hover/insight:scale-110 transition-transform">
                          <Icon className={cn('h-6 w-6', meta.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn('text-[10px] font-black uppercase tracking-[0.15em]', meta.color)}>
                              {meta.label}
                            </span>
                            {insight.confidence != null && (
                              <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                                {insight.confidence}% Match
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-foreground text-lg mb-1.5 tracking-tight group-hover/insight:text-primary transition-colors">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">
                            {insight.description}
                          </p>
                          {insight.confidence != null && (
                            <div className="mt-4 flex items-center gap-3">
                              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted/30">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-1000", meta.color.replace('text-', 'bg-'))}
                                  style={{ width: `${Math.min(100, Math.max(0, insight.confidence))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-border/50 py-16 px-8 text-center bg-muted/5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5 mb-6 group-hover:scale-110 transition-transform duration-700">
              <Lightbulb className="h-10 w-10 text-primary opacity-40" />
            </div>
            <h4 className="font-black text-2xl text-foreground mb-3 tracking-tight">Intelligence Pending</h4>
            <p className="text-muted-foreground text-base max-w-sm mx-auto font-medium leading-relaxed">
              Log your academic footprint to activate AI-powered performance analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsCard;
