import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

// ─── Mistral AI free API helper ───────────────────────────────────────────────
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || '';

async function callMistralAI(rawText: string, fieldSchema: string): Promise<Record<string, string>> {
  if (!MISTRAL_API_KEY) {
    return fallbackExtract(rawText);
  }

  const prompt = `You are an expert document parser for academic faculty management systems.
Extract structured information from the following OCR-extracted text of an academic document.

DOCUMENT TEXT:
"""
${rawText.slice(0, 4000)}
"""

Return a JSON object with ONLY these fields (use empty string "" if not found):
${fieldSchema}

Rules:
- Do NOT add extra fields
- Return ONLY valid JSON, no explanation
- For year fields, return a 4-digit year (e.g. "2024")
- For author lists, separate by commas`;

  try {
    const res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) throw new Error(`Mistral API error: ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (err) {
    console.warn('Mistral AI extraction failed, using fallback:', err);
    return fallbackExtract(rawText);
  }
}

// ─── Fallback regex extractor (no API key required) ───────────────────────────
function fallbackExtract(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Title
  const titleMatch = text.match(/(?:title[:\s]+)([^\n]{10,120})/i) ||
    text.match(/^([A-Z][^\n]{15,100})/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Authors
  const authorMatch = text.match(/(?:authors?|by)[:\s]+([^\n]{5,200})/i);
  if (authorMatch) result.authors = authorMatch[1].trim();

  // Journal
  const journalMatch = text.match(/(?:journal|published in|publication)[:\s]+([^\n]{5,100})/i);
  if (journalMatch) result.journal_name = journalMatch[1].trim();

  // Publisher
  const publisherMatch = text.match(/(?:publisher|published by)[:\s]+([^\n]{3,80})/i);
  if (publisherMatch) result.publisher = publisherMatch[1].trim();

  // ISSN
  const issnMatch = text.match(/ISSN[:\s]*([\d\-X]{8,})/i);
  if (issnMatch) result.issn = issnMatch[1].trim();

  // DOI
  const doiMatch = text.match(/(?:doi[:\s]+|doi\.org\/)(10\.\d{4,}\/\S+)/i);
  if (doiMatch) result.doi = doiMatch[1].trim();

  // ISBN
  const isbnMatch = text.match(/ISBN[:\s]*([\d\-X]{10,17})/i);
  if (isbnMatch) result.isbn = isbnMatch[1].trim();

  // Volume
  const volMatch = text.match(/(?:vol(?:ume)?\.?\s*)(\d+)/i);
  if (volMatch) result.volume = volMatch[1];

  // Issue
  const issueMatch = text.match(/(?:issue|no\.?\s*)(\d+)/i);
  if (issueMatch) result.issue = issueMatch[1];

  // Pages
  const pagesMatch = text.match(/(?:pp?\.?\s*|pages?\s*)(\d+\s*[-–]\s*\d+)/i);
  if (pagesMatch) result.pages = pagesMatch[1].replace(/\s/g, '');

  // Year
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) result.year = yearMatch[1];

  // Patent number
  const patentMatch = text.match(/(?:patent\s*(?:no\.?|number)?)[:\s]*([\w\/\-]+)/i);
  if (patentMatch) result.patent_number = patentMatch[1].trim();

  // Status
  if (/granted/i.test(text)) result.status = 'Granted';
  else if (/published/i.test(text)) result.status = 'Published';
  else if (/filed/i.test(text)) result.status = 'Filed';

  // Organisation
  const orgMatch = text.match(/(?:organized|conducted|hosted|offered)\s+by[:\s]+([^\n,]{5,80})/i);
  if (orgMatch) result.organization = orgMatch[1].trim();

  // Conference name
  const confMatch = text.match(/(?:conference|symposium|proceedings)[:\s]*(?:on\s+)?([^\n]{5,100})/i);
  if (confMatch) result.conference_name = confMatch[1].trim();

  return result;
}

// ─── Load a script dynamically ───────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── PDF text extraction ──────────────────────────────────────────────────────
async function extractPDFText(file: File): Promise<string> {
  try {
    if (!(window as any).pdfjsLib) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // First try text extraction
    let fullText = '';
    const numPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }

    if (fullText.trim().length > 50) return fullText;

    // Fallback: render first page and OCR it
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data: { text } } = await Tesseract.recognize(canvas, 'eng', { logger: () => {} });
    return text;
  } catch (e) {
    console.error('PDF extraction error:', e);
    return '';
  }
}

// ─── Image OCR ────────────────────────────────────────────────────────────────
async function extractImageText(file: File): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(file, 'eng', { logger: () => {} });
  return text;
}

// ─── Field schemas ────────────────────────────────────────────────────────────
export const OCR_FIELD_SCHEMAS = {
  journal: `{"title":"paper title","authors":"comma-separated authors","journal_name":"journal name","publisher":"publisher","volume":"volume number","issue":"issue number","pages":"page range e.g. 12-25","issn":"ISSN","doi":"DOI without doi.org prefix","year":"4-digit year"}`,
  book: `{"title":"book title","authors":"comma-separated authors","publisher":"publisher name","isbn":"ISBN","year":"4-digit year"}`,
  patent: `{"title":"patent title","patent_number":"patent/application number","status":"Granted or Published or Filed","year":"4-digit year"}`,
  conference: `{"title":"paper title","authors":"comma-separated authors","conference_name":"conference name","location":"city and country","pages":"page range","year":"4-digit year","doi":"DOI"}`,
  fdp: `{"title":"program/workshop title","organization":"organizing institution","start_date":"start date","end_date":"end date","year":"4-digit year","duration":"number of days"}`,
  generic: `{"title":"document title","authors":"participants or authors","organization":"institution or body","year":"4-digit year","reference":"reference number or ID"}`,
} as const;

export type OCRDocumentType = keyof typeof OCR_FIELD_SCHEMAS;

// ─── Main hook ────────────────────────────────────────────────────────────────
export interface OCRResult {
  rawText: string;
  fields: Record<string, string>;
}

export function useOCR() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');

  const extractAndParse = useCallback(
    async (file: File, docType: OCRDocumentType): Promise<OCRResult | null> => {
      setIsExtracting(true);
      setOcrProgress(10);
      setOcrStatus('Reading file…');

      try {
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        setOcrProgress(20);
        setOcrStatus(isPDF ? 'Extracting PDF text…' : 'Running OCR on image…');

        const rawText = isPDF ? await extractPDFText(file) : await extractImageText(file);

        if (!rawText.trim()) {
          setOcrStatus('No text found in document');
          return null;
        }

        setOcrProgress(65);
        setOcrStatus('Parsing fields with AI…');

        const schema = OCR_FIELD_SCHEMAS[docType];
        const fields = await callMistralAI(rawText, schema);

        setOcrProgress(100);
        setOcrStatus('Done!');

        return { rawText, fields };
      } catch (err) {
        console.error('OCR error:', err);
        setOcrStatus('Extraction failed');
        return null;
      } finally {
        setTimeout(() => {
          setIsExtracting(false);
          setOcrProgress(0);
          setOcrStatus('');
        }, 1500);
      }
    },
    []
  );

  return { isExtracting, ocrProgress, ocrStatus, extractAndParse };
}

// Legacy compatibility export (keeps old consumers working)
export { useOCR as default };
