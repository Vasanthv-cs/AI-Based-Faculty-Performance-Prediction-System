import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIWritingAssistantProps {
  value: string;
  onSelect: (value: string) => void;
  type?: 'title' | 'description' | 'authors';
  className?: string;
}

const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({ value, onSelect, type = 'description', className }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const generateSuggestion = async () => {
    if (!value || value.length < 5) {
      toast.error('Please type a bit more for the AI to understand the context.');
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    let refined = '';
    if (type === 'title') {
      refined = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      // Simple refinement rules
      refined = refined.replace(/\b(and|or|of|in|the|a|an)\b/gi, (m) => m.toLowerCase());
      if (!refined.endsWith('.') && refined.length > 20) refined = refined; // Keep as is
    } else if (type === 'description') {
      refined = `Successfully implemented ${value.toLowerCase()} to enhance student engagement and optimize academic outcomes for the current semester.`;
    } else if (type === 'authors') {
      refined = value.split(/[,&]/).map(s => s.trim().split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ')).join(', ');
    }

    setSuggestion(refined);
    setIsGenerating(false);
    toast.success('AI refinement complete!');
  };

  const handleApply = () => {
    if (suggestion) {
      onSelect(suggestion);
      setSuggestion(null);
    }
  };

  return (
    <div className={cn("relative group", className)}>
      {!suggestion ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateSuggestion}
          disabled={isGenerating || !value}
          className="h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all border border-primary/20 bg-primary/5"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 mr-1.5" />
          )}
          {isGenerating ? 'Analyzing...' : 'AI Refine'}
        </Button>
      ) : (
        <div className="flex items-center gap-1 animate-reveal">
           <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleApply}
            className="h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-3 h-3 mr-1.5" />
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSuggestion(null)}
            className="h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Undo
          </Button>
          
          <div className="absolute bottom-full mb-3 left-0 w-64 p-4 rounded-2xl bg-slate-900 text-white text-[11px] font-medium leading-relaxed shadow-2xl z-50 animate-reveal border border-white/10">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI Suggestion
              </div>
              "{suggestion}"
              <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIWritingAssistant;
