import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PerformanceForecastProps {
  currentScore: number;
  teachingScore: number;
  researchScore: number;
  contributionScore: number;
}

// Simple linear extrapolation over last 6 months + 3 projected months
function buildForecastData(
  current: number,
  teaching: number,
  research: number,
  contribution: number
) {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Simulate a realistic historical trajectory (seeded from current score)
  const history: { month: string; score: number; teaching: number; research: number; contribution: number; projected?: boolean }[] = [];
  const growth = current > 0 ? (current / 6) * 0.15 : 0; // Estimated monthly gain rate

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const progressFactor = (6 - i) / 6;
    const historicalScore = Math.round(Math.max(0, current - growth * 6 * (1 - progressFactor) + (Math.random() - 0.5) * 3));
    history.push({
      month: `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      score: Math.min(historicalScore, 250),
      teaching: Math.round(teaching * progressFactor),
      research: Math.round(research * progressFactor),
      contribution: Math.round(contribution * progressFactor),
    });
  }

  // Add current month
  history.push({
    month: `${months[now.getMonth()]} '${String(now.getFullYear()).slice(2)}` + ' (Now)',
    score: current,
    teaching,
    research,
    contribution,
  });

  // Project 3 future months using simple linear regression
  const monthlyGrowth = Math.max(2, Math.min(growth, 12)); // capped between 2-12 pts/month
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const projected = Math.min(250, Math.round(current + monthlyGrowth * i));
    history.push({
      month: `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      score: projected,
      teaching: Math.min(50, teaching + i),
      research: Math.min(100, research + Math.round(monthlyGrowth * i * 0.5)),
      contribution: Math.min(100, contribution + Math.round(monthlyGrowth * i * 0.3)),
      projected: true,
    });
  }

  return history;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs space-y-1 min-w-[160px]">
      <div className="font-bold text-sm mb-2 flex items-center gap-1">
        <Calendar className="w-3 h-3" /> {label} {d.projected && <Badge variant="outline" className="text-[10px] h-4 px-1">Projected</Badge>}
      </div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Total</span><span className="font-bold text-primary">{d.score}/250</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Teaching</span><span>{d.teaching}/50</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Research</span><span>{d.research}/100</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Contributions</span><span>{d.contribution}/100</span></div>
    </div>
  );
};

const PerformanceForecast: React.FC<PerformanceForecastProps> = ({
  currentScore,
  teachingScore,
  researchScore,
  contributionScore,
}) => {
  const data = buildForecastData(currentScore, teachingScore, researchScore, contributionScore);
  const projectedMax = data[data.length - 1].score;
  const gain = projectedMax - currentScore;
  const TrendIcon = gain > 5 ? TrendingUp : gain < -5 ? TrendingDown : Minus;
  const trendColor = gain > 5 ? 'text-emerald-500' : gain < -5 ? 'text-red-500' : 'text-yellow-500';

  // Grade zones for reference lines
  const gradeZones = [
    { y: 200, label: 'Excellent', color: '#10b981' },
    { y: 150, label: 'Very Good', color: '#3b82f6' },
    { y: 100, label: 'Good', color: '#f59e0b' },
  ];

  const projectedGrade = projectedMax >= 200 ? 'Excellent' : projectedMax >= 150 ? 'Very Good' : projectedMax >= 100 ? 'Good' : 'Needs Improvement';

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          AI Performance Forecast
          <Badge variant="outline" className="ml-auto text-xs">3-Month Projection</Badge>
        </CardTitle>
        <div className="flex items-center gap-4 mt-1">
          <div>
            <div className="text-xs text-muted-foreground">Projected Score</div>
            <div className="text-2xl font-bold">{projectedMax}<span className="text-sm font-normal text-muted-foreground">/250</span></div>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className={`font-semibold ${trendColor}`}>
              {gain > 0 ? '+' : ''}{gain} pts
            </span>
          </div>
          <Badge variant="secondary" className="ml-auto">{projectedGrade}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis domain={[0, 250]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />

            {/* Grade threshold lines */}
            {gradeZones.map(z => (
              <ReferenceLine key={z.y} y={z.y} stroke={z.color} strokeDasharray="4 4" strokeOpacity={0.5}
                label={{ value: z.label, position: 'insideTopRight', fontSize: 10, fill: z.color }} />
            ))}

            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#forecastGrad)"
              dot={(props: any) => {
                const { projected } = props?.payload || {};
                return projected
                  ? <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="3 2" />
                  : <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="hsl(var(--primary))" />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
          <span>
            <strong className="text-foreground">AI Insight:</strong>{' '}
            {gain >= 30
              ? `Excellent trajectory! At this rate, you'll reach ${projectedGrade} in 3 months. Add 1 more SCI journal to break into the next grade tier.`
              : gain >= 10
              ? `Good progress. Focus on ${researchScore < 50 ? 'research publications' : 'networking contributions'} to accelerate your score.`
              : `Consistent activity needed. Try attending an FDP or organizing an event to boost your contribution score.`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceForecast;
