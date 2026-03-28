import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FacultyReportData {
    name: string;
    email: string;
    designation: string;
    department: string;
    teachingScore: number;
    researchScore: number;
    contributionScore: number;
    totalScore: number;
    category: string;
    teachingRecords: any[];
    researchRecords: any[];
    networkingRecords: any[];
}

async function fetchReportData(facultyId: string): Promise<FacultyReportData | null> {
    const [profileRes, perfRes, teachingRes, researchRes, networkingRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, designation, departments(name)').eq('user_id', facultyId).single(),
        supabase.from('performance_scores').select('overall_score, category, teaching_score, research_score, contribution_score').eq('user_id', facultyId).single(),
        supabase.from('teaching_learning_activities').select('academic_year, semester, subject_pass_percentage, student_feedback_percentage, instruction_material_level').eq('user_id', facultyId).order('created_at', { ascending: false }).limit(5),
        supabase.from('research_activities').select('title, activity_category, academic_year, score_claimed').eq('user_id', facultyId).order('created_at', { ascending: false }).limit(10),
        supabase.from('networking_contributions').select('title, contribution_category, academic_year, score_claimed').eq('user_id', facultyId).order('created_at', { ascending: false }).limit(10),
    ]);

    if (!profileRes.data) return null;
    const p = profileRes.data as any;
    const perf = perfRes.data as any;

    return {
        name:              p.full_name || 'N/A',
        email:             p.email || '',
        designation:       p.designation || 'Faculty',
        department:        p.departments?.name || 'N/A',
        teachingScore:     Number(perf?.teaching_score || 0),
        researchScore:     Number(perf?.research_score || 0),
        contributionScore: Number(perf?.contribution_score || 0),
        totalScore:        Number(perf?.overall_score || 0),
        category:          perf?.category || 'N/A',
        teachingRecords:   teachingRes.data || [],
        researchRecords:   researchRes.data || [],
        networkingRecords: networkingRes.data || [],
    };
}

function buildPrintHTML(data: FacultyReportData): string {
    const gradeColors: Record<string, string> = {
        'Excellent': '#10b981', 'Very Good': '#3b82f6', 'Good': '#f59e0b',
        'Needs Improvement': '#ef4444', 'N/A': '#94a3b8',
    };
    const gradeColor = gradeColors[data.category] || '#94a3b8';
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const row = (label: string, value: string | number) =>
        `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:40%">${label}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${value}</td></tr>`;

    const scoreBar = (label: string, score: number, max: number, color: string) => `
        <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:13px;font-weight:600">${label}</span>
                <span style="font-size:13px;color:#64748b">${score}/${max}</span>
            </div>
            <div style="background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden">
                <div style="width:${Math.min(100, (score/max)*100)}%;height:100%;background:${color};border-radius:6px;"></div>
            </div>
        </div>`;

    // ── Image items 7-14 = Category II: Research (Journal, Conferences, Book Chapters, Books, Consultancy, Funded Projects, Patents, Guidance)
    // Note: Consultancy and Funded Projects are stored in networking_contributions but score in Category II
    const RESEARCH_CAPS: Record<string, number> = {
        'Journal': 25, 'Conference': 10, 'Book Chapter': 10,
        'Book': 5, 'Consultancy': 10, 'Funded Project': 25,
        'Patent': 5, 'Guidance': 10
    };
    const RESEARCH_TOTAL_MAX = 100;

    // Combine research_activities + consultancy/funded_project from networking for Category II
    const researchAndNetResearch = [
        ...data.researchRecords.map((r: any) => ({ ...r, _cat: r.activity_category })),
        ...data.networkingRecords
            .filter((n: any) => n.contribution_category === 'Consultancy' || n.contribution_category === 'Funded Project')
            .map((n: any) => ({ ...n, _cat: n.contribution_category })),
    ];

    const rCatTrack: Record<string, number> = {};
    let rTotalCapped = 0;
    const researchMeta = researchAndNetResearch.map((r: any) => {
        const cat = r._cat || 'Other';
        const pts = Number(r.score_claimed || 0);
        const cap = RESEARCH_CAPS[cat] ?? 999;
        const prevCat = rCatTrack[cat] || 0;
        const allowedInCat = Math.max(0, Math.min(pts, cap - prevCat));
        const counted = Math.max(0, Math.min(allowedInCat, RESEARCH_TOTAL_MAX - rTotalCapped));
        rCatTrack[cat] = prevCat + pts;
        rTotalCapped += counted;
        const isSubCapExtra = allowedInCat < pts;
        return { pts, counted, isExtra: counted < pts, isFullyExtra: counted === 0, isSubCapExtra };
    });
    const liveResearchScore = rTotalCapped;
    const rRunning = researchAndNetResearch.reduce((s: number, r: any) => s + Number(r.score_claimed || 0), 0);

    // ── Image items 15-18 = Category III: Networking (Prof Society, FDP, Organized Event, Institution)
    // Consultancy and Funded Project are excluded here (counted in Category II)
    const NETWORK_CAPS: Record<string, number> = {
        'Professional Society': 20, 'FDP Attended': 25,
        'Organized Event': 25, 'Institution Contribution': 30
    };
    const NETWORK_TOTAL_MAX = 100;

    const nCatTrack: Record<string, number> = {};
    let nTotalCapped = 0;
    const networkMeta = data.networkingRecords.map((n: any) => {
        const cat = n.contribution_category || 'Other';
        // Skip Consultancy and Funded Project — they are counted in Category II
        if (cat === 'Consultancy' || cat === 'Funded Project') {
            return { pts: Number(n.score_claimed || 0), counted: 0, isExtra: true, isFullyExtra: true, isSubCapExtra: false, isResearchCat: true };
        }
        const pts = Number(n.score_claimed || 0);
        const cap = NETWORK_CAPS[cat] ?? 999;
        const prevCat = nCatTrack[cat] || 0;
        const allowedInCat = Math.max(0, Math.min(pts, cap - prevCat));
        const counted = Math.max(0, Math.min(allowedInCat, NETWORK_TOTAL_MAX - nTotalCapped));
        nCatTrack[cat] = prevCat + pts;
        nTotalCapped += counted;
        const isSubCapExtra = allowedInCat < pts;
        return { pts, counted, isExtra: counted < pts, isFullyExtra: counted === 0, isSubCapExtra, isResearchCat: false };
    });
    const liveNetworkScore = nTotalCapped;
    const nRunning = data.networkingRecords
        .filter((n: any) => n.contribution_category !== 'Consultancy' && n.contribution_category !== 'Funded Project')
        .reduce((s: number, n: any) => s + Number(n.score_claimed || 0), 0);

    // Use live-computed scores so the bars match the actual item list
    const displayResearchScore      = liveResearchScore;
    const displayContributionScore  = liveNetworkScore;
    const displayTotal = data.teachingScore + displayResearchScore + displayContributionScore;

    // Row builders for Research / Networking with cap indicators
    // researchRows = items 7-14 from image (includes Consultancy & Funded Project)
    const researchRows = researchAndNetResearch.map((r: any, i: number) => {
        const { pts, counted, isFullyExtra, isExtra } = researchMeta[i];
        const category = r._src === 'networking' ? r.contribution_category : r.activity_category;
        const scoreCell = isFullyExtra
            ? `<span style="text-decoration:line-through;color:#94a3b8">${pts} pts</span> <span style="margin-left:4px;background:#fef3c7;border:1px solid #fcd34d;color:#b45309;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;">EXTRA — Not Counted</span>`
            : isExtra
            ? `<span style="color:#059669;font-weight:600">${counted} pts</span> <span style="margin-left:4px;background:#fef3c7;border:1px solid #fcd34d;color:#b45309;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;">${pts - counted} pts excess</span>`
            : `<span style="font-weight:600">${pts} pts</span>`;
        const rowBg = isFullyExtra ? 'background:#f8fafc;opacity:0.7;' : isExtra ? 'background:#fffbeb;' : '';
        return `<tr style="${rowBg}"><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;text-decoration:line-through;' : ''}">${r.title || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;' : ''}">${category || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;' : ''}">${r.academic_year || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;">${scoreCell}</td></tr>`;
    }).join('');

    // networkRows = items 15-18 from image ONLY (Consultancy & Funded Project excluded — they appear in Research)
    const networkRows = data.networkingRecords
        .filter((n: any) => n.contribution_category !== 'Consultancy' && n.contribution_category !== 'Funded Project')
        .map((n: any, i: number) => {
            // Find the correct meta index (skip the Consultancy/Funded entries filtered out)
            const allIdx = data.networkingRecords.findIndex((_: any, fi: number) =>
                data.networkingRecords.slice(0, fi + 1).filter((x: any) =>
                    x.contribution_category !== 'Consultancy' && x.contribution_category !== 'Funded Project'
                ).length === i + 1
            );
            const meta = networkMeta[allIdx] || { pts: 0, counted: 0, isFullyExtra: false, isExtra: false };
            const { pts, counted, isFullyExtra, isExtra } = meta;
            const scoreCell = isFullyExtra
                ? `<span style="text-decoration:line-through;color:#94a3b8">${pts} pts</span> <span style="margin-left:4px;background:#fef3c7;border:1px solid #fcd34d;color:#b45309;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;">EXTRA — Not Counted</span>`
                : isExtra
                ? `<span style="color:#059669;font-weight:600">${counted} pts</span> <span style="margin-left:4px;background:#fef3c7;border:1px solid #fcd34d;color:#b45309;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;">${pts - counted} pts excess</span>`
                : `<span style="font-weight:600">${pts} pts</span>`;
            const rowBg = isFullyExtra ? 'background:#f8fafc;opacity:0.7;' : isExtra ? 'background:#fffbeb;' : '';
            return `<tr style="${rowBg}"><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;text-decoration:line-through;' : ''}">${n.title || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;' : ''}">${n.contribution_category || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;${isFullyExtra ? 'color:#94a3b8;' : ''}">${n.academic_year || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0;">${scoreCell}</td></tr>`;
        }).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Faculty Appraisal Report — ${data.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 32px; }
        .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .header p  { font-size: 13px; opacity: 0.85; }
        .content   { padding: 28px; }
        .section   { margin-bottom: 28px; }
        .section-title { font-size: 15px; font-weight: 700; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
        table      { width: 100%; border-collapse: collapse; font-size: 13px; }
        .badge     { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 13px; color: white; }
        .total-box { background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 20px; text-align: center; }
        .total-box .score { font-size: 48px; font-weight: 900; color: #1e40af; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        .no-data { color: #94a3b8; font-style: italic; font-size: 12px; }
        .cap-note { font-size: 11px; color: #b45309; font-style: italic; margin-bottom: 8px; }
    </style>
</head>
<body>
<div class="header">
    <h1>Faculty Appraisal Report</h1>
    <p>Generated on ${date} &nbsp;|&nbsp; FacultyAI Performance System</p>
</div>

<div class="content">

    <!-- Profile -->
    <div class="section">
        <div class="section-title">Faculty Profile</div>
        <table>
            ${row('Name',        data.name)}
            ${row('Email',       data.email)}
            ${row('Designation', data.designation)}
            ${row('Department',  data.department)}
            ${row('Grade',       `<span class="badge" style="background:${gradeColor}">${data.category}</span>`)}
        </table>
    </div>

    <!-- Score Summary -->
    <div class="section">
        <div class="section-title">Performance Score Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
            <div>
                ${scoreBar('Teaching &amp; Learning', data.teachingScore, 50, '#10b981')}
                ${scoreBar('Research Activities', displayResearchScore, 100, '#8b5cf6')}
                ${scoreBar('Contributions',       displayContributionScore, 100, '#3b82f6')}
            </div>
            <div class="total-box">
                <div style="font-size:13px;color:#64748b;margin-bottom:6px">Total Score</div>
                <div class="score">${displayTotal}</div>
                <div style="font-size:13px;color:#64748b">out of 250</div>
                <div style="margin-top:8px"><span class="badge" style="background:${gradeColor}">${data.category}</span></div>
            </div>
        </div>
    </div>

    <!-- Teaching Records -->
    <div class="section">
        <div class="section-title">Teaching &amp; Learning (Max 50 pts)</div>
        ${data.teachingRecords.length === 0
            ? '<p class="no-data">No teaching records found.</p>'
            : `<table>
                <tr style="background:#dbeafe"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Academic Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Semester</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Pass %</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Feedback %</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Instruction Level</th></tr>
                ${data.teachingRecords.map((t: any) => `<tr><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.academic_year}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.semester}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.subject_pass_percentage}%</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.student_feedback_percentage}%</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.instruction_material_level}</td></tr>`).join('')}
               </table>`}
    </div>

    <!-- Research Records -->
    <div class="section">
        <div class="section-title">Research Activities (Max 100 pts — Counted: ${displayResearchScore} pts)</div>
        ${rRunning > RESEARCH_TOTAL_MAX ? `<p class="cap-note">⚠ Total claimed: ${rRunning} pts. Only the first ${RESEARCH_TOTAL_MAX} pts are counted. Rows marked "EXTRA" are excluded from scoring.</p>` : ''}
        ${data.researchRecords.length === 0
            ? '<p class="no-data">No research records found.</p>'
            : `<table>
                <tr style="background:#ede9fe"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Title</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Category</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Score</th></tr>
                ${researchRows}
               </table>`}
    </div>

    <!-- Networking & Contributions -->
    <div class="section">
        <div class="section-title">Networking &amp; Contributions (Max 100 pts — Counted: ${displayContributionScore} pts)</div>
        ${nRunning > NETWORK_TOTAL_MAX ? `<p class="cap-note">⚠ Total claimed: ${nRunning} pts. Only the first ${NETWORK_TOTAL_MAX} pts are counted. Rows marked "EXTRA" are excluded from scoring.</p>` : ''}
        ${data.networkingRecords.length === 0
            ? '<p class="no-data">No contribution records found.</p>'
            : `<table>
                <tr style="background:#dcfce7"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Title</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Category</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Score</th></tr>
                ${networkRows}
               </table>`}
    </div>

    <div class="footer">
        This report is auto-generated by the FacultyAI Performance System. &nbsp;|&nbsp; ${date}
    </div>
</div>
</body>
</html>`;
}

export function usePDFReport() {
    const generateReport = useCallback(async (facultyId: string, facultyName?: string) => {
        try {
            const data = await fetchReportData(facultyId);
            if (!data) throw new Error('Could not fetch faculty data');

            const html = buildPrintHTML(data);
            const win  = window.open('', '_blank', 'width=900,height=700');
            if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }

            win.document.write(html);
            win.document.close();
            win.focus();
            // Give a moment for styles to load, then print
            setTimeout(() => { win.print(); }, 600);
        } catch (err: any) {
            console.error('PDF report error:', err);
            alert('Failed to generate report: ' + (err.message || 'Unknown error'));
        }
    }, []);

    return { generateReport };
}
