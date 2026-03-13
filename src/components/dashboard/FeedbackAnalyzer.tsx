import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, ThumbsUp, ThumbsDown, Minus, TrendingUp } from 'lucide-react';

// ─── Sentiment keyword dictionaries ───────────────────────────────────────────
const POSITIVE_WORDS = [
  'excellent', 'great', 'good', 'amazing', 'clear', 'helpful', 'understand',
  'best', 'wonderful', 'easy', 'engaging', 'interesting', 'thorough', 'patient',
  'knowledgeable', 'effective', 'enjoyed', 'love', 'outstanding', 'perfect',
  'fantastic', 'nice', 'enjoy', 'impressed', 'motivating', 'encouraging',
  'explain', 'explains', 'well', 'superb', 'brilliant', 'insightful',
];

const NEGATIVE_WORDS = [
  'bad', 'slow', 'fast', 'boring', 'confusing', 'difficult', 'hard',
  'unclear', 'poor', 'terrible', 'worst', 'useless', 'waste', 'boring',
  'disappointing', 'frustrated', 'unable', 'lost', 'late', 'unavailable',
  'rude', 'strict', 'unhelpful', 'complicated', 'rushed', 'disorganized',
  'doubt', 'doubt', 'lack', 'fails', 'not clear', 'doesn\'t', 'not good',
];

// Theme keyword dictionary
const THEME_KEYWORDS: Record<string, string[]> = {
  'Teaching Pace':       ['fast', 'slow', 'pace', 'rush', 'speed', 'quick', 'hurry'],
  'Subject Knowledge':   ['knowledge', 'expert', 'knows', 'depth', 'concept', 'topic', 'subject'],
  'Clarity':             ['clear', 'unclear', 'confusing', 'understand', 'explain', 'explanation'],
  'Student Engagement':  ['engaging', 'boring', 'interesting', 'participation', 'interact', 'attention'],
  'Availability':        ['available', 'office', 'doubt', 'access', 'approachable', 'help'],
  'Exam Preparation':    ['exam', 'test', 'revision', 'practice', 'question', 'prepare'],
  'Practical Examples':  ['example', 'practical', 'real', 'application', 'project', 'case'],
  'Communication':       ['communication', 'language', 'speaks', 'voice', 'presentation', 'delivery'],
};

function analyzeText(text: string): {
  score: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  themes: { theme: string; count: number }[];
  positiveHighlights: string[];
  negativeHighlights: string[];
  wordCount: number;
} {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;

  let positiveCount = 0;
  let negativeCount = 0;
  const positiveHighlights: string[] = [];
  const negativeHighlights: string[] = [];

  POSITIVE_WORDS.forEach(w => {
    if (lower.includes(w)) { positiveCount++; positiveHighlights.push(w); }
  });
  NEGATIVE_WORDS.forEach(w => {
    if (lower.includes(w)) { negativeCount++; negativeHighlights.push(w); }
  });

  const total = positiveCount + negativeCount || 1;
  const score = Math.round((positiveCount / total) * 100);
  const sentiment = score >= 65 ? 'Positive' : score >= 35 ? 'Neutral' : 'Negative';

  const themes: { theme: string; count: number }[] = [];
  Object.entries(THEME_KEYWORDS).forEach(([theme, kws]) => {
    const count = kws.filter(k => lower.includes(k)).length;
    if (count > 0) themes.push({ theme, count });
  });
  themes.sort((a, b) => b.count - a.count);

  return {
    score,
    sentiment,
    themes: themes.slice(0, 4),
    positiveHighlights: [...new Set(positiveHighlights)].slice(0, 5),
    negativeHighlights: [...new Set(negativeHighlights)].slice(0, 5),
    wordCount,
  };
}

interface FeedbackAnalyzerProps {
  initialText?: string;
  onAnalyzed?: (summary: string) => void;
}

const FeedbackAnalyzer: React.FC<FeedbackAnalyzerProps> = ({ initialText = '', onAnalyzed }) => {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ReturnType<typeof analyzeText> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const r = analyzeText(text);
      setResult(r);
      if (onAnalyzed) {
        onAnalyzed(`Sentiment: ${r.sentiment} (${r.score}%). Key themes: ${r.themes.map(t => t.theme).join(', ')}.`);
      }
      setIsAnalyzing(false);
    }, 600);
  };

  const sentimentColor = result?.sentiment === 'Positive'
    ? 'text-emerald-500' : result?.sentiment === 'Negative'
    ? 'text-red-500' : 'text-yellow-500';

  const SentimentIcon = result?.sentiment === 'Positive' ? ThumbsUp : result?.sentiment === 'Negative' ? ThumbsDown : Minus;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Brain className="w-4 h-4 text-purple-500" />
        AI Student Feedback Analyzer
        <span className="font-normal text-xs ml-1">(paste student comments below)</span>
      </div>

      <textarea
        className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        placeholder={`Paste student feedback here...\ne.g., "The professor explains concepts very clearly and is always available for doubts. However, the pace is sometimes too fast during formula derivations."`}
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
        onClick={handleAnalyze}
        disabled={!text.trim() || isAnalyzing}
      >
        {isAnalyzing ? (
          <span className="flex items-center gap-2"><Brain className="w-4 h-4 animate-pulse" /> Analyzing…</span>
        ) : (
          <><Brain className="w-4 h-4" /> Analyze Feedback</>
        )}
      </Button>

      {result && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4 animate-fade-in">
          {/* Sentiment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SentimentIcon className={`w-5 h-5 ${sentimentColor}`} />
              <span className={`font-bold text-lg ${sentimentColor}`}>{result.sentiment}</span>
              <span className="text-muted-foreground text-sm">({result.wordCount} words analyzed)</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{result.score}%</div>
              <div className="text-xs text-muted-foreground">Positivity Score</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                result.score >= 65 ? 'bg-emerald-500' : result.score >= 35 ? 'bg-yellow-400' : 'bg-red-500'
              }`}
              style={{ width: `${result.score}%` }}
            />
          </div>

          {/* Themes */}
          {result.themes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detected Themes</div>
              <div className="flex flex-wrap gap-2">
                {result.themes.map(t => (
                  <span key={t.theme} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <TrendingUp className="w-3 h-3" /> {t.theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keyword highlights */}
          <div className="grid grid-cols-2 gap-3">
            {result.positiveHighlights.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-emerald-600 mb-1">✅ Positive Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {result.positiveHighlights.map(w => (
                    <span key={w} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs">{w}</span>
                  ))}
                </div>
              </div>
            )}
            {result.negativeHighlights.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-500 mb-1">⚠️ Concern Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {result.negativeHighlights.map(w => (
                    <span key={w} className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-xs">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="text-xs text-muted-foreground border-t pt-3 border-border leading-relaxed">
            <strong>AI Summary:</strong> {result.wordCount} comments analyzed. Overall student sentiment is{' '}
            <strong className={sentimentColor}>{result.sentiment.toLowerCase()}</strong> with a positivity score of{' '}
            <strong>{result.score}%</strong>.
            {result.themes.length > 0 && ` Key areas of feedback: ${result.themes.map(t => t.theme).join(', ')}.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedbackAnalyzer;
