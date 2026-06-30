/**
 * RPCS-1 Translator API — wraps the Python SDK translator module.
 *
 * POST /api/translate
 * Body: { tool: "interpret"|"normalize"|"split"|"rewrite"|"route"|"score", ...params }
 *
 * In production with Vercel, this calls the Python SDK via subprocess.
 * For local dev, same approach works if `rpcs1` is installed.
 */
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PYTHON = process.env.RPCS1_PYTHON ?? 'python3';

function callTranslator(tool: string, args: string[]): any {
  try {
    const cmd = [PYTHON, '-m', 'rpcs1.translator.server', tool, ...args].join(' ');
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(output.trim());
  } catch (err: any) {
    // Fallback: return a structured error
    const message = err.stderr?.toString() || err.message || 'Unknown error';
    return { error: `Translator error: ${message}`, tool };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tool, ...params } = body;

    switch (tool) {
      case 'interpret': {
        const result = callTranslator('interpret', [
          params.text || '',
          '--risk', params.risk || 'advice',
        ]);
        return NextResponse.json(result);
      }
      case 'normalize': {
        const result = callTranslator('normalize', [params.text || '']);
        return NextResponse.json(result);
      }
      case 'split': {
        const result = callTranslator('split', [params.text || '']);
        return NextResponse.json(result);
      }
      case 'rewrite': {
        const result = callTranslator('rewrite', [
          params.text || '',
          '--style', params.style || 'plain',
        ]);
        return NextResponse.json(result);
      }
      case 'route': {
        const args = [params.task_type || 'chat'];
        if (params.objective) args.push('--objective', params.objective);
        if (params.allow_multi_model) args.push('--allow-multi-model');
        const result = callTranslator('route', args);
        return NextResponse.json(result);
      }
      case 'score': {
        const candidates = JSON.stringify(params.candidates || []);
        const result = callTranslator('score', [
          candidates,
          '--risk', params.risk || 'advice',
        ]);
        return NextResponse.json(result);
      }
      case 'manifest': {
        const result = callTranslator('manifest', []);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Request error: ${err.message}` },
      { status: 500 }
    );
  }
}
