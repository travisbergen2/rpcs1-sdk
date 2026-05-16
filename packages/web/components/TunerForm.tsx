'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Label, Select, Textarea, ErrorMessage, FieldHint } from '@/components/ui/FormField';
import type { RecommendInput } from '@rpcs1/core';

const schema = z.object({
  task_summary: z.string().min(10, 'Describe the task in at least 10 characters'),
  domain: z.string().optional(),
  entropy: z.enum(['stable', 'moderate', 'dynamic', 'chaotic']),
  predictability: z.enum(['highly_predictable', 'somewhat_predictable', 'unpredictable']),
  stakes: z.enum(['low', 'medium', 'high', 'catastrophic']),
  context_relevance: z.enum(['short', 'medium', 'long']),
  commitment_style: z.enum(['decisive', 'balanced', 'cautious']),
  target_platform: z.enum(['anthropic', 'openai', 'open_source', 'generic']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (input: RecommendInput) => Promise<void>;
  loading: boolean;
}

const ENTROPY_OPTIONS = [
  { value: 'stable',   label: 'Stable',   hint: 'Environment rarely changes' },
  { value: 'moderate', label: 'Moderate', hint: 'Occasional predictable changes' },
  { value: 'dynamic',  label: 'Dynamic',  hint: 'Frequent, somewhat unpredictable changes' },
  { value: 'chaotic',  label: 'Chaotic',  hint: 'Constant, highly unpredictable changes' },
];

const PREDICTABILITY_OPTIONS = [
  { value: 'highly_predictable',   label: 'Highly predictable',   hint: 'Changes follow patterns' },
  { value: 'somewhat_predictable', label: 'Somewhat predictable', hint: 'Some patterns, some surprises' },
  { value: 'unpredictable',        label: 'Unpredictable',        hint: 'Changes are random' },
];

const STAKES_OPTIONS = [
  { value: 'low',          label: 'Low',          hint: 'Mistakes are cheap to fix' },
  { value: 'medium',       label: 'Medium',       hint: 'Mistakes cost time or money' },
  { value: 'high',         label: 'High',         hint: 'Mistakes have significant consequences' },
  { value: 'catastrophic', label: 'Catastrophic', hint: 'Mistakes are irreversible or harmful' },
];

const CONTEXT_OPTIONS = [
  { value: 'short',  label: 'Short',  hint: 'Only recent messages matter' },
  { value: 'medium', label: 'Medium', hint: 'Last few turns are relevant' },
  { value: 'long',   label: 'Long',   hint: 'Full history is important' },
];

const COMMITMENT_OPTIONS = [
  { value: 'decisive', label: 'Decisive', hint: 'Agent should act quickly when path is clear' },
  { value: 'balanced', label: 'Balanced', hint: 'Act when reasonably confident' },
  { value: 'cautious', label: 'Cautious', hint: 'Verify before acting, ask when unsure' },
];

const PLATFORM_OPTIONS = [
  { value: 'anthropic',   label: 'Anthropic (Claude)' },
  { value: 'openai',      label: 'OpenAI (GPT / o1)' },
  { value: 'open_source', label: 'Open source (Llama, Mistral, etc.)' },
  { value: 'generic',     label: 'Generic / platform-neutral' },
];

export function TunerForm({ onSubmit, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entropy:           'moderate',
      predictability:    'somewhat_predictable',
      stakes:            'medium',
      context_relevance: 'medium',
      commitment_style:  'balanced',
      target_platform:   'anthropic',
    },
  });

  const submit = async (data: FormValues) => {
    await onSubmit({
      task: {
        task_summary: data.task_summary,
        domain:       data.domain || undefined,
      },
      environment: {
        entropy:           data.entropy,
        predictability:    data.predictability,
        stakes:            data.stakes,
        context_relevance: data.context_relevance,
        commitment_style:  data.commitment_style,
      },
      target_platform: data.target_platform,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Task */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Task</h2>

        <div>
          <Label htmlFor="task_summary" hint="required">
            What does the agent do?
          </Label>
          <Textarea
            id="task_summary"
            rows={3}
            placeholder="e.g. Customer support agent handling refund requests and billing disputes"
            error={errors.task_summary?.message}
            {...register('task_summary')}
          />
          {errors.task_summary && <ErrorMessage>{errors.task_summary.message}</ErrorMessage>}
          <FieldHint>Be specific — more detail improves confidence rating.</FieldHint>
        </div>

        <div>
          <Label htmlFor="domain" hint="optional">Domain</Label>
          <Select id="domain" {...register('domain')}>
            <option value="">— select domain —</option>
            <option value="customer_support">Customer support</option>
            <option value="coding">Coding / DevOps</option>
            <option value="research">Research / analysis</option>
            <option value="healthcare">Healthcare / medical</option>
            <option value="finance">Finance / trading</option>
            <option value="creative">Creative writing</option>
            <option value="legal">Legal</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      {/* Environment */}
      <div className="space-y-4 pt-2 border-t border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider pt-2">Environment</h2>

        <div>
          <Label htmlFor="entropy">How often does the environment change?</Label>
          <Select id="entropy" error={errors.entropy?.message} {...register('entropy')}>
            {ENTROPY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="predictability">How predictable are those changes?</Label>
          <Select id="predictability" {...register('predictability')}>
            {PREDICTABILITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="stakes">What are the stakes if the agent makes an error?</Label>
          <Select id="stakes" {...register('stakes')}>
            {STAKES_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="context_relevance">How far back does relevant context reach?</Label>
          <Select id="context_relevance" {...register('context_relevance')}>
            {CONTEXT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="commitment_style">Should the agent commit quickly or deliberate carefully?</Label>
          <Select id="commitment_style" {...register('commitment_style')}>
            {COMMITMENT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Platform */}
      <div className="space-y-4 pt-2 border-t border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider pt-2">Platform</h2>
        <div>
          <Label htmlFor="target_platform">Target LLM platform</Label>
          <Select id="target_platform" {...register('target_platform')}>
            {PLATFORM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? 'Computing...' : 'Get recommendations'}
      </Button>
    </form>
  );
}
