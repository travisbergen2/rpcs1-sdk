import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'Privacy information for Explicit Formula — the browser extension, the Loop plugin for Obsidian, the site — and for the RPCS1 API and MCP server.',
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 prose prose-invert">
      <h1>Privacy</h1>
      <p>Last updated: September 9, 2026.</p>

      <h2>The browser extension and the Loop plugin</h2>
      <p>
        Both tools send text to our own server to be checked. Said plainly, this is what leaves your
        machine, when, and where it goes.
      </p>
      <h3>What is sent, and when</h3>
      <ul>
        <li>
          <strong>Browser extension.</strong> When you pause while typing in a text field, the text of
          that one field (at most its last 4,000 characters) is sent over an encrypted connection to
          <code>rpcs1.dev/api/translate</code> for a deterministic check that finds words a reader could take
          two ways. When you tap an underline to open the picker, or select text and choose{' '}
          <em>How could this read?</em>, the same text is sent again for a deeper reading. Nothing is sent
          from pages you only read, and nothing is sent unless you type in a field or ask.
        </li>
        <li>
          <strong>The Loop (Obsidian plugin).</strong> The text you type into the Loop panel is sent to{' '}
          <code>explicitformula.com</code> to be interpreted. If — and only if — you list vault folders the
          Loop may read, up to six short snippets from those folders (2,400 characters in total at most),
          chosen on your machine, are sent with it, and the panel lists every note and character count
          used, every round. Empty the folder list and vault reads stop.
        </li>
      </ul>
      <h3>Where it goes</h3>
      <p>
        The deterministic check runs entirely on our server. The deeper readings are produced by a
        third-party model provider acting as our service provider — currently OpenAI models reached
        through Vercel&apos;s AI Gateway, with Google Gemini configured as the alternate. Their handling of
        the text is governed by their own API terms. We do not use submitted text to train models, sell
        it, or use it for anything other than answering the request that carried it.
      </p>
      <h3>What is kept</h3>
      <p>
        Our server does not store submitted text in a database. Infrastructure providers may hold request
        metadata — IP address, timestamp, path, error logs — briefly for delivery, security, diagnostics,
        and the daily per-address limit on model calls. The browser extension keeps a short-lived
        in-memory cache of recent checks (cleared whenever the browser restarts the extension) and a local
        log of your last 200 accepted or dismissed suggestions in the browser&apos;s extension storage;
        neither leaves your machine. The Loop keeps nothing beyond the notes it writes into your own vault
        at your instruction.
      </p>
      <h3>What there is none of</h3>
      <p>
        No account. No ads. No analytics or telemetry in the extension or the plugin. No scanning of
        messages you receive. Free for people.
      </p>

      <h2>The RPCS1 tuner, REST API, and MCP server</h2>
      <h3>Data processed</h3>
      <p>
        The tuner, REST API, and MCP server process the task and environment information you submit to
        generate a deterministic recommendation. RPCS1 does not use submitted content to train a
        machine-learning model.
      </p>
      <h3>Retention and infrastructure</h3>
      <p>
        RPCS1 does not intentionally store recommendation inputs in an application database.
        Infrastructure providers may temporarily process request metadata, including IP addresses,
        timestamps, paths, and error logs, for delivery, security, rate limiting, and diagnostics.
      </p>

      <h2>Payments</h2>
      <p>
        Organization licenses are processed by Stripe. Transactional email is delivered through Resend.
        Their handling of account and payment information is governed by their own privacy policies.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy and support questions can be sent to{' '}
        <a href="mailto:travisbergen2@gmail.com">travisbergen2@gmail.com</a>.
      </p>
    </article>
  );
}
