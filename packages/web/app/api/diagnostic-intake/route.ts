import { NextRequest, NextResponse } from 'next/server';
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
  const subject = `RPCS-1 diagnostic brief — ${data.company}`;
  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Role: ${data.role || '(not provided)'}`,
    `Website: ${data.website || '(not provided)'}`,
    `Purchase stage: ${data.stage}`,
    `Agent type: ${data.agent_type}`,
    '',
    'Biggest failure mode:',
    data.biggest_risk,
    '',
    'Desired outcome:',
    data.desired_outcome,
    '',
    'Additional notes:',
    data.notes || '(none)',
  ].join('\n');

  try {
    if (env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: DIAGNOSTIC_RECIPIENT,
        reply_to: data.email,
        subject,
        text,
      });
    } else {
      console.log('[diagnostic-intake] RESEND not configured:', { subject, text });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[diagnostic-intake] Failed to send brief:', error);
    return NextResponse.json(
      { error: 'Could not submit the brief right now. Please try again or email directly.' },
      { status: 500 }
    );
  }
}
