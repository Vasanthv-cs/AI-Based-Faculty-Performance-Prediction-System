import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, RotateCcw, TrendingUp, Lightbulb } from 'lucide-react';

interface ActivityOption {
  id: string;
  label: string;
  category: 'research' | 'networking' | 'teaching';
  basePoints: number;
  cap: number;
  description: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: 'sci', label: '+ SCI Indexed Journal', category: 'research', basePoints: 25, cap: 100, description: 'High-impact journal publication' },
  { id: 'scopus', label: '+ Scopus Journal', category: 'research', basePoints: 20, cap: 100, description: 'Scopus indexed publication' },
  { id: 'conference', label: '+ Conference Paper', category: 'research', basePoints: 10, cap: 100, description: 'Peer-reviewed conference' },
  { id: 'patent', label: '+ Patent Filed', category: 'research', basePoints: 5, cap: 100, description: 'Patent application or grant' },
  { id: 'book', label: '+ Book Authored', category: 'research', basePoints: 5, cap: 100, description: 'Authored academic book' },
  { id: 'funded_project', label: '+ Funded Project', category: 'research', basePoints: 25, cap: 100, description: 'Gov/Industry sponsored project' },
  { id: 'fdp_excellent', label: '+ FDP (Excellent)', category: 'networking', basePoints: 25, cap: 100, description: 'Faculty development program' },
  { id: 'institution', label: '+ Institution Work', category: 'networking', basePoints: 30, cap: 100, description: 'Key institutional contribution' },
  { id: 'consultancy', label: '+ Consultancy', category: 'research', basePoints: 10, cap: 100, description: 'Industry consulting work' },
];

const CATEGORY_CAPS = { research: 100, networking: 100, teaching: 50 };
const MAX_TOTAL = 250;

const GRADE_INFO = (score: number) => {
  if (score >= 200) return { label: 'Excellent 🏆', color: 'bg-emerald-500', textColor: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' };
  if (score >= 150) return { label: 'Very Good ⭐', color: 'bg-blue-500', textColor: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50' };
  if (score >= 100) return { label: 'Good 👍', color: 'bg-yellow-500', textColor: 'text-yellow-700', border: 'border-yellow-200', bg: 'bg-yellow-50' };
  return { label: 'Needs Improvement', color: 'bg-red-400', textColor: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50' };
};

interface WhatIfSimulatorProps {
  currentTeaching: number;
  currentResearch: number;
  currentContribution: number;
  currentTotal: number;
}

const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentTeaching,
  currentResearch,
  currentContribution,
  currentTotal,
}) => {
  const [hypotheticals, setHypotheticals] = useState<Record<string, number>>({});

  const toggleActivity = (id: string, points: number) => {
    setHypotheticals(prev => {
      const updated = { ...prev };
      if (updated[id]) delete updated[id];
      else updated[id] = points;
      return updated;
    });
  };

  const reset = () => setHypotheticals({});

  // Compute hypothetical totals per category (capped)
  const calcCategory = (category: 'research' | 'networking' | 'teaching', base: number) => {
    const added = ACTIVITY_OPTIONS
      .filter(a => a.category === category && hypotheticals[a.id])
      .reduce((sum, a) => sum + (hypotheticals[a.id] || 0), 0);
    return Math.min(base + added, CATEGORY_CAPS[category]);
  };

  const newTeaching = Math.min(currentTeaching + (hypotheticals['teaching_level'] || 0), 50);
  const newResearch = calcCategory('research', currentResearch);
  const newContrib = calcCategory('networking', currentContribution);
  const newTotal = Math.min(newTeaching + newResearch + newContrib, MAX_TOTAL);

  const totalGain = newTotal - currentTotal;
  const grade = GRADE_INFO(newTotal);
  const currentGrade = GRADE_INFO(currentTotal);

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="w-5 h-5 text-purple-600" />
          Performance Lab
          <Badge variant="outline" className="ml-auto text-xs text-purple-700 border-purple-300 bg-purple-50">What-If Simulator</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Select hypothetical activities to see how they'd boost your score</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-5">
        {/* Activity toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACTIVITY_OPTIONS.map(activity => {
            const isActive = !!hypotheticals[activity.id];
            const color = activity.category === 'research' ? 'purple' : activity.category === 'networking' ? 'blue' : 'emerald';
            const colorStyles: Record<string, string> = {
              purple: 'bg-purple-100 border-purple-300 text-purple-800 shadow-purple-500/10',
              blue: 'bg-blue-100 border-blue-300 text-blue-800 shadow-blue-500/10',
              emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-emerald-500/10'
            };
            
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => toggleActivity(activity.id, activity.basePoints)}
                className={`text-left px-3 py-2 rounded-lg border transition-all duration-300 text-sm ${
                  isActive
                    ? `${colorStyles[color]} font-black shadow-lg scale-[1.02]`
                    : 'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{activity.label}</span>
                  <span className={`text-xs font-bold ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    +{activity.basePoints} pts
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{activity.description}</div>
              </button>
            );
          })}
        </div>

        {/* Score comparison */}
        <div className={`rounded-xl border p-4 ${grade.border} ${grade.bg}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Projected Total Score</div>
              <div className={`text-4xl font-black ${grade.textColor}`}>{newTotal}<span className="text-lg font-normal text-muted-foreground">/250</span></div>
              <div className={`text-sm font-semibold mt-1 ${grade.textColor}`}>{grade.label}</div>
            </div>
            {totalGain > 0 && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-xl">
                  <TrendingUp className="w-5 h-5" /> +{totalGain}
                </div>
                <div className="text-xs text-muted-foreground">vs current ({currentTotal})</div>
                {currentGrade.label !== grade.label && (
                  <div className="text-xs mt-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Grade Upgrade! 🎉
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="space-y-2">
            {[
              { label: 'Teaching', base: currentTeaching, projected: newTeaching, cap: 50, color: 'bg-emerald-400' },
              { label: 'Research', base: currentResearch, projected: newResearch, cap: 100, color: 'bg-purple-400' },
              { label: 'Contribution', base: currentContribution, projected: newContrib, cap: 100, color: 'bg-blue-400' },
            ].map(cat => (
              <div key={cat.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="font-semibold">{cat.projected}/{cat.cap}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute h-full bg-muted-foreground/20 rounded-full" style={{ width: `${(cat.base / cat.cap) * 100}%` }} />
                  <div className={`absolute h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${(cat.projected / cat.cap) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insight message */}
        {Object.keys(hypotheticals).length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
            <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
            <span>Select activities above to instantly simulate your projected performance score and grade upgrade.</span>
          </div>
        )}

        {Object.keys(hypotheticals).length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {Object.keys(hypotheticals).length} hypothetical{Object.keys(hypotheticals).length > 1 ? 's' : ''} added
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={reset} className="gap-1 text-xs h-7">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatIfSimulator;
