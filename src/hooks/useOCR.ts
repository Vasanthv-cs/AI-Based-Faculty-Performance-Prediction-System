import { useState, useCallback } from 'react';

interface OCRResult {
  text: string;
  suggestedTitle?: string;
  suggestedOrganization?: string;
  suggestedDate?: string;
  suggestedDuration?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * useOCR — Client-side text extraction from images using Tesseract.js
 * Falls back gracefully if the file is not an image or OCR fails.
 */
export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  const extractFromFile = useCallback(async (file: File): Promise<OCRResult | null> => {
    // Only process image files
    if (!file.type.startsWith('image/')) {
      setOcrResult(null);
      return null;
    }

    setIsProcessing(true);
    setOcrResult(null);

    try {
      // Dynamic import to avoid bundling issues and allow code splitting
      const Tesseract = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: () => {}, // suppress logs
      });

      const result = parseOCRText(text);
      setOcrResult(result);
      return result;
    } catch (err) {
      console.warn('OCR failed:', err);
      setOcrResult(null);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearResult = useCallback(() => setOcrResult(null), []);

  return { extractFromFile, isProcessing, ocrResult, clearResult };
}

// ─── Smart OCR text parser ────────────────────────────────────────────────────
function parseOCRText(raw: string): OCRResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();

  // ── Title detection ──
  let suggestedTitle: string | undefined;
  const titlePatterns = [
    /certificate\s+of\s+(?:completion|participation|achievement)\s+(?:in|for|on)?\s*[""']?([^.\n\r]{5,80})/i,
    /(?:successfully\s+completed|attended)\s+(?:the\s+)?[""']?([^.\n\r]{5,80})/i,
    /(?:workshop|fdp|training|course|program(?:me)?)\s+on\s+[""']?([^.\n\r]{5,80})/i,
    /program(?:me)?\s*[:–-]\s*([^.\n\r]{5,80})/i,
  ];
  for (const p of titlePatterns) {
    const m = text.match(p);
    if (m) { suggestedTitle = m[1].trim().replace(/["""'']/g, '').substring(0, 80); break; }
  }

  // ── Organisation detection ──
  let suggestedOrganization: string | undefined;
  const orgPatterns = [
    /organized\s+by\s+(?:the\s+)?([^.\n\r,]{5,80})/i,
    /conducted\s+by\s+(?:the\s+)?([^.\n\r,]{5,80})/i,
    /offered\s+by\s+(?:the\s+)?([^.\n\r,]{5,80})/i,
    /hosted\s+by\s+(?:the\s+)?([^.\n\r,]{5,80})/i,
    /(?:from|at)\s+([A-Z][A-Za-z\s&,.-]{5,60}(?:University|College|Institute|Academy|Center|Centre|School|IIT|NIT))/,
  ];
  for (const p of orgPatterns) {
    const m = text.match(p);
    if (m) { suggestedOrganization = m[1].trim().replace(/[,.]$/, '').substring(0, 80); break; }
  }

  // ── Date detection ──
  let suggestedDate: string | undefined;
  const datePatterns = [
    /(?:held|conducted|organized)?\s+(?:on\s+|from\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})?/i,
    /(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/i,
    /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/i,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) { suggestedDate = m[1].trim(); break; }
  }

  // ── Duration detection ──
  let suggestedDuration: string | undefined;
  const durPatterns = [
    /(\d+)\s*[-–]\s*days?\s+(?:workshop|fdp|training|program(?:me)?)/i,
    /(?:workshop|fdp|training|program(?:me)?)\s+(?:of\s+)?(\d+)\s+days?/i,
    /duration\s*[:–-]\s*([^.\n\r]{2,30})/i,
    /(\d+)\s+days?\s+(?:certificate|program|training|workshop)/i,
  ];
  for (const p of durPatterns) {
    const m = text.match(p);
    if (m) { suggestedDuration = m[1].includes('day') ? m[1] : `${m[1]} Day${parseInt(m[1]) > 1 ? 's' : ''}`; break; }
  }

  // Confidence scoring
  const detected = [suggestedTitle, suggestedOrganization, suggestedDate].filter(Boolean).length;
  const confidence: 'high' | 'medium' | 'low' = detected >= 2 ? 'high' : detected === 1 ? 'medium' : 'low';

  return { text, suggestedTitle, suggestedOrganization, suggestedDate, suggestedDuration, confidence };
}
