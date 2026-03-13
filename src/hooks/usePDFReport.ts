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
                ${scoreBar('Teaching & Learning', data.teachingScore, 50, '#10b981')}
                ${scoreBar('Research Activities', data.researchScore, 100, '#8b5cf6')}
                ${scoreBar('Contributions',       data.contributionScore, 100, '#3b82f6')}
            </div>
            <div class="total-box">
                <div style="font-size:13px;color:#64748b;margin-bottom:6px">Total Score</div>
                <div class="score">${data.totalScore}</div>
                <div style="font-size:13px;color:#64748b">out of 250</div>
                <div style="margin-top:8px"><span class="badge" style="background:${gradeColor}">${data.category}</span></div>
            </div>
        </div>
    </div>

    <!-- Teaching Records -->
    <div class="section">
        <div class="section-title">Teaching & Learning (Max 50 pts)</div>
        ${data.teachingRecords.length === 0
            ? '<p class="no-data">No teaching records found.</p>'
            : `<table>
                <tr style="background:#dbeafe"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Academic Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Semester</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Pass %</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Feedback %</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Instruction Level</th></tr>
                ${data.teachingRecords.map(t => `<tr><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.academic_year}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.semester}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.subject_pass_percentage}%</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.student_feedback_percentage}%</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${t.instruction_material_level}</td></tr>`).join('')}
               </table>`}
    </div>

    <!-- Research Records -->
    <div class="section">
        <div class="section-title">Research Activities (Max 100 pts)</div>
        ${data.researchRecords.length === 0
            ? '<p class="no-data">No research records found.</p>'
            : `<table>
                <tr style="background:#ede9fe"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Title</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Category</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Score</th></tr>
                ${data.researchRecords.map(r => `<tr><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.title || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.activity_category || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.academic_year || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.score_claimed ?? '—'} pts</td></tr>`).join('')}
               </table>`}
    </div>

    <!-- Networking & Contributions -->
    <div class="section">
        <div class="section-title">Networking & Contributions (Max 100 pts)</div>
        ${data.networkingRecords.length === 0
            ? '<p class="no-data">No contribution records found.</p>'
            : `<table>
                <tr style="background:#dcfce7"><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Title</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Category</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Year</th><th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Score</th></tr>
                ${data.networkingRecords.map(r => `<tr><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.title || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.contribution_category || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.academic_year || '—'}</td><td style="padding:5px 10px;border:1px solid #e2e8f0">${r.score_claimed ?? '—'} pts</td></tr>`).join('')}
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
