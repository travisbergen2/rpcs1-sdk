'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage, FieldHint, Input, Label, Select, Textarea } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';

type FormState = {
  name: string;
  email: string;
  company: string;
  role: string;
  website: string;
  stage: string;
  agent_type: string;
  biggest_risk: string;
  desired_outcome: string;
  notes: string;
};

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  company: '',
  role: '',
  website: '',
  stage: 'pre-purchase',
  agent_type: 'support copilot',
  biggest_risk: '',
  desired_outcome: '',
  notes: '',
};

export function DiagnosticIntakeForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diagnostic-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Could not submit diagnostic brief.');
      }

      setSubmitted(true);
      setForm(INITIAL_STATE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit diagnostic brief.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8">
        <p className="text-xs font-mono text-emerald-400 mb-2">received</p>
        <h2 className="text-2xl font-bold text-white mb-3">Brief received.</h2>
        <p className="text-gray-400 leading-relaxed mb-6">
          I’ve got the diagnostic brief. If you’ve already purchased Stripe access, I’ll pair this
          with your checkout email. If not, you can still proceed to payment and use the same brief.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/pricing#diagnostic"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            Review pricing
          </a>
          <a
            href="/tuner?preset=support"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Try sample assessment
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Travis Bergen"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder="Company name"
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Your role</Label>
          <Input
            id="role"
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            placeholder="Support ops, founder, PM, etc."
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="stage">Purchase stage</Label>
          <Select id="stage" value={form.stage} onChange={(e) => update('stage', e.target.value)}>
            <option value="pre-purchase">Pre-purchase</option>
            <option value="post-purchase">Post-purchase</option>
            <option value="internal-review">Internal review</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="agent_type">Agent type</Label>
          <Select
            id="agent_type"
            value={form.agent_type}
            onChange={(e) => update('agent_type', e.target.value)}
          >
            <option value="support copilot">Support copilot</option>
            <option value="coding agent">Coding agent</option>
            <option value="research agent">Research agent</option>
            <option value="workflow agent">Workflow agent</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="website" hint="Optional">Agent or company URL</Label>
        <Input
          id="website"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor="biggest_risk">What is the biggest failure mode?</Label>
        <Textarea
          id="biggest_risk"
          rows={4}
          value={form.biggest_risk}
          onChange={(e) => update('biggest_risk', e.target.value)}
          placeholder="Examples: inconsistent escalation, policy errors, looping, weak grounding."
          required
        />
      </div>

      <div>
        <Label htmlFor="desired_outcome">What do you want the diagnostic to tell you?</Label>
        <Textarea
          id="desired_outcome"
          rows={4}
          value={form.desired_outcome}
          onChange={(e) => update('desired_outcome', e.target.value)}
          placeholder="Examples: whether this agent should be cautious, what settings to use, what to test next."
          required
        />
      </div>

      <div>
        <Label htmlFor="notes" hint="Optional">Extra context</Label>
        <Textarea
          id="notes"
          rows={4}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Traffic volume, model stack, customer type, or anything else helpful."
        />
        <FieldHint>
          The more concrete the workload, the more useful the diagnostic.
        </FieldHint>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" loading={loading} size="lg" variant="cta" className="w-full sm:w-auto">
          Submit diagnostic brief
        </Button>
        <a
          href="/pricing#diagnostic"
          className={cn(
            'inline-flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-300 transition-colors',
            'hover:bg-amber-500/15'
          )}
        >
          View paid diagnostic
        </a>
      </div>
    </form>
  );
}
