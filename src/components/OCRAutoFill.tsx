import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOCR, OCRDocumentType } from '@/hooks/useOCR';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OCRAutoFillProps {
  /** The file selected by the user */
  file: File | null;
  /** Document type determines the field schema sent to AI */
  docType: OCRDocumentType;
  /** Called with the extracted key-value pairs so parent can fill form fields */
  onFieldsExtracted: (fields: Record<string, string>) => void;
  /** Optional accent color class (Tailwind) for theming per page */
  accentColor?: string;
  className?: string;
}

/**
 * OCRAutoFill
 * ──────────────────────────────────────────────────────────────────────────────
 * Drop this below any FileUpload component to add an "Auto-fill with AI" button.
 * When clicked, it runs OCR + AI parsing on the selected file and calls back
 * with the extracted fields so the parent form can pre-populate its inputs.
 */
const OCRAutoFill: React.FC<OCRAutoFillProps> = ({
  file,
  docType,
  onFieldsExtracted,
  accentColor = 'violet',
  className,
}) => {
  const { isExtracting, ocrProgress, ocrStatus, extractAndParse } = useOCR();
  const [lastFields, setLastFields] = useState<Record<string, string> | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!file) return null;

  const handleExtract = async () => {
    setIsDone(false);
    setLastFields(null);

    const result = await extractAndParse(file, docType);

    if (!result) {
      toast.error('Could not extract text from this file. Try a clearer image or a text-based PDF.');
      return;
    }

    const nonEmpty = Object.values(result.fields).filter(v => v.trim()).length;

    if (nonEmpty === 0) {
      toast.warning('No fields were detected. Please fill in the form manually.');
      return;
    }

    setLastFields(result.fields);
    setRawText(result.rawText);
    onFieldsExtracted(result.fields);
    setIsDone(true);

    toast.success(`Auto-filled ${nonEmpty} field${nonEmpty !== 1 ? 's' : ''} from the document!`, {
      description: 'Review and correct any values before saving.',
    });
  };

  const colorMap: Record<string, string> = {
    violet: 'from-violet-600 to-purple-600 shadow-violet-500/30',
    blue: 'from-blue-600 to-indigo-600 shadow-blue-500/30',
    fuchsia: 'from-fuchsia-600 to-pink-600 shadow-fuchsia-500/30',
    emerald: 'from-emerald-600 to-teal-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    rose: 'from-rose-600 to-red-600 shadow-rose-500/30',
  };

  const gradientClass = colorMap[accentColor] || colorMap.violet;

  return (
    <div className={cn('mt-3 rounded-2xl border border-dashed border-violet-300/40 bg-violet-50/40 p-4 space-y-3 transition-all', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', gradientClass)}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-700">
              AI Auto-Fill
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              {isDone ? 'Fields extracted — review below' : 'Extract details from this document'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleExtract}
          disabled={isExtracting}
          className={cn(
            'h-9 px-4 rounded-xl text-white font-black text-xs shadow-lg transition-all duration-300',
            'bg-gradient-to-r hover:brightness-110 hover:-translate-y-0.5',
            gradientClass,
            isExtracting && 'opacity-70 pointer-events-none'
          )}
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Processing…
            </>
          ) : isDone ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Re-extract
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Auto-fill
            </>
          )}
        </Button>
      </div>

      {/* Progress bar */}
      {isExtracting && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <Progress value={ocrProgress} className="h-1.5 rounded-full" />
          <p className="text-[10px] text-muted-foreground font-medium italic animate-pulse">
            {ocrStatus}
          </p>
        </div>
      )}

      {/* Success state — show extracted fields */}
      {isDone && lastFields && !isExtracting && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Extracted Fields</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(lastFields)
              .filter(([, v]) => v.trim())
              .map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg bg-white/80 border border-emerald-100 px-2.5 py-1.5 shadow-sm"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={value}>
                    {value}
                  </p>
                </div>
              ))}
          </div>

          {/* Raw text toggle */}
          {rawText && (
            <button
              type="button"
              onClick={() => setShowRaw(p => !p)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors font-bold uppercase tracking-widest mt-1"
            >
              {showRaw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showRaw ? 'Hide' : 'Show'} extracted text
            </button>
          )}

          {showRaw && (
            <pre className="text-[9px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 overflow-auto max-h-32 whitespace-pre-wrap font-mono leading-relaxed border border-border/30">
              {rawText.slice(0, 2000)}{rawText.length > 2000 ? '\n…(truncated)' : ''}
            </pre>
          )}

          <div className="flex items-start gap-1.5 text-amber-600 bg-amber-50 rounded-lg px-2.5 py-2 border border-amber-100">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-medium">
              AI extraction may not be 100% accurate. Always review the auto-filled values before saving.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRAutoFill;
