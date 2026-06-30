import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { Resend } from 'resend';
import { z } from 'zod';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const DiagnosticIntakeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().min(1).max(160),
  role: z.string().max(120).optional().or(z.literal('')),
  website: z.string().max(300).optional().or(z.literal('')),
  stage: z.enum(['pre-purchase', 'post-purchase', 'internal-review']),
  agent_type: z.string().min(1).max(80),
  biggest_risk: z.string().min(1).max(4000),
  desired_outcome: z.string().min(1).max(4000),
  notes: z.string().max(4000).optional().or(z.literal('')),
});

const DIAGNOSTIC_RECIPIENT = 'travisbergen2@gmail.com';
const PYTHON = process.env.RPCS1_PYTHON ?? 'python3';

function generateReport(brief: Record<string, any>): any {
  try {
    const json = JSON.stringify(brief).replace(/'/g, "'\\''");
    const script = `
import json, sys
sys.path.insert(0, 'sdk/python/src')
from rpcs1.translator.diagnostic_report import generate_report
brief = json.loads('''${json}''')
report = generate_report(brief)
print(json.dumps(report))
    `.trim();
    const output = execSync(`${PYTHON} -c '${script}'`, {
      encoding: 'utf-8',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(output.trim());
  } catch (err: any) {
    console.error('[diagnostic] Report generation failed:', err.message);
    return null;
  }
}

function buildReportEmailHtml(report: any, brief: any): string {
  const s = report.summary;
  const p = report.primitives;
  const r = report.recommendations;
  const isPostPurchase = brief.stage === 'post-purchase';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1f2937; background: #fff;">
  <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 4px;">
    ${isPostPurchase ? 'Your RPCS-1 Diagnostic Report' : 'RPCS-1 Diagnostic Preview'}
  </h1>
  <p style="color: #6b7280; margin-top: 0;">
    ${brief.agent_type} · ${brief.company}
    ${isPostPurchase ? '' : '<br/><em>Purchase the full report to unlock detailed recommendations.</em>'}
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>

  <h2 style="font-size: 16px; font-weight: 600;">Summary</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr><td style="padding: 6px 0; color: #6b7280;">Stability regime</td><td style="padding: 6px 0; font-weight: 600;">${s.stability_regime}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">Risk category</td><td style="padding: 6px 0; font-weight: 600;">${s.risk_category}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">Ambiguity margin</td><td style="padding: 6px 0; font-weight: 600;">${s.ambiguity_margin}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">AR level</td><td style="padding: 6px 0; font-weight: 600;">${s.ar_level}</td></tr>
  </table>

  <h2 style="font-size: 16px; font-weight: 600;">Primitive Profile</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr><td style="padding: 6px 0; color: #6b7280;">IC (Interpretation Confidence)</td><td style="padding: 6px 0; font-weight: 600;">${p.IC}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">UE (User Evidence)</td><td style="padding: 6px 0; font-weight: 600;">${p.UE}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">EC (Epistemic Commitment)</td><td style="padding: 6px 0; font-weight: 600;">${p.EC}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">NM (Narrative Momentum)</td><td style="padding: 6px 0; font-weight: 600;">${p.NM}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">SG (Semantic Gap)</td><td style="padding: 6px 0; font-weight: 600;">${p.SG}</td></tr>
    <tr><td style="padding: 6px 0; color: #6b7280;">TI (Translation Integrity)</td><td style="padding: 6px 0; font-weight: 600;">${p.TI}</td></tr>
  </table>

  <h2 style="font-size: 16px; font-weight: 600;">Recommendations</h2>
  <p style="margin-bottom: 8px;"><strong>Posture:</strong> ${r.posture.label} — ${r.posture.description}</p>
  <p style="margin-bottom: 4px;"><strong>Next tests:</strong></p>
  <ul style="color: #374151;">
    ${r.next_tests.map((t: string) => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
  <p style="color: #9ca3af; font-size: 12px;">
    RPCS-1 Agent Tuner · <a href="https://rpcs1.dev" style="color: #9ca3af;">rpcs1.dev</a>
  </p>
</body>
</html>
  `.trim();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DiagnosticIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please complete the required diagnostic brief fields.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isPostPurchase = data.stage === 'post-purchase';

  // Generate the diagnostic report
  const report = generateReport(data);

  // Send email with report summary
  const subject = isPostPurchase
    ? `RPCS-1 diagnostic report — ${data.company}`
    : `RPCS-1 diagnostic brief received — ${data.company}`;

  const textParts = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Agent type: ${data.agent_type}`,
    `Stage: ${data.stage}`,
    '',
    'Biggest failure mode:',
    data.biggest_risk,
    '',
    'Desired outcome:',
    data.desired_outcome,
    '',
  ];

  if (report) {
    textParts.push('---');
    textParts.push('DIAGNOSTIC REPORT');
    const s = report.summary;
    textParts.push(`Regime: ${s.stability_regime}`);
    textParts.push(`Risk: ${s.risk_category}`);
    textParts.push(`Margin: ${s.ambiguity_margin}`);
    textParts.push(`AR level: ${s.ar_level}`);
    textParts.push('');
    textParts.push('Primitives:');
    for (const [k, v] of Object.entries(report.primitives)) {
      textParts.push(`  ${k}: ${v}`);
    }
    textParts.push('');
    textParts.push(`Posture: ${report.recommendations.posture.label}`);
    textParts.push('Next tests:');
    for (const t of report.recommendations.next_tests) {
      textParts.push(`  - ${t}`);
    }
  }

  try {
    if (env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      
      // Email to the owner
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: DIAGNOSTIC_RECIPIENT,
        reply_to: data.email,
        subject,
        text: textParts.join('\n'),
      });

      // If post-purchase, also send the formatted report to the customer
      if (isPostPurchase && report) {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: data.email,
          subject: `Your RPCS-1 Diagnostic Report — ${data.company}`,
          html: buildReportEmailHtml(report, data),
          text: textParts.join('\n'),
        });
      }
    } else {
      console.log('[diagnostic-intake] RESEND not configured:', subject);
    }

    return NextResponse.json({
      ok: true,
      report_generated: !!report,
      ...(report ? { report_summary: {
        regime: report.summary.stability_regime,
        risk: report.summary.risk_category,
        ar_level: report.summary.ar_level,
      }} : {}),
    });
  } catch (error) {
    console.error('[diagnostic-intake] Failed:', error);
    return NextResponse.json(
      { error: 'Could not submit the brief right now. Please try again or email directly.' },
      { status: 500 }
    );
  }
}
