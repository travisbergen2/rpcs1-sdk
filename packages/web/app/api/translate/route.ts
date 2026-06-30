/**
 * RPCS-1 Translator API — native TypeScript implementation.
 *
 * POST /api/translate
 * Body: { tool: "interpret"|"normalize"|"split"|"rewrite"|"route"|"score", ...params }
 *
 * No Python dependency. Runs natively in the Next.js API route.
 */
import { NextResponse } from 'next/server';
import { interpret, normalize, split, rewrite, route, score } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tool, ...params } = body;

    switch (tool) {
      case 'interpret': {
        const result = interpret(params.text || '', params.risk || 'advice');
        return NextResponse.json(result);
      }
      case 'normalize': {
        const result = normalize(params.text || '');
        return NextResponse.json(result);
      }
      case 'split': {
        const result = split(params.text || '');
        return NextResponse.json(result);
      }
      case 'rewrite': {
        const result = rewrite(params.text || '', params.style || 'plain');
        return NextResponse.json(result);
      }
      case 'route': {
        const result = route(params.task_type || 'chat', params.objective, params.allow_multi_model);
        return NextResponse.json(result);
      }
      case 'score': {
        const candidates = Array.isArray(params.candidates) ? params.candidates : [];
        const result = score(candidates, params.risk || 'casual');
        return NextResponse.json(result);
      }
      case 'manifest': {
        return NextResponse.json({
          protocol: 'RPCS-1 / HF-HATP v1.9',
          version: '1.9.0',
          tools: {
            interpret: { description: 'Interpret a message using RPCS-1', parameters: { text: 'string (required)', risk: 'casual|advice|high-stakes|safety-critical' } },
            normalize: { description: 'Normalize fragmented human input' },
            split: { description: 'Split mixed intents' },
            rewrite: { description: 'Rewrite for a target audience', styles: ['technical', 'plain', 'socially_gentle', 'concise', 'detailed', 'direct'] },
            route: { description: 'Route a task to a model family', types: ['code', 'creative_writing', 'analysis', 'chat', 'translation', 'reasoning', 'planning', 'emotional'] },
            score: { description: 'Score candidates with the Signature Ambiguity Framework' },
          },
        });
      }
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Request error: ${err.message}` }, { status: 500 });
  }
}
