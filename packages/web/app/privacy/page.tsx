import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy information for the RPCS1 Agent Tuner and MCP server.',
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 prose prose-invert">
      <h1>Privacy</h1>
      <p>Last updated: June 7, 2026.</p>

      <h2>Data processed</h2>
      <p>
        The tuner, REST API, and MCP server process the task and environment information you submit
        to generate a deterministic recommendation. RPCS1 does not use submitted content to train a
        machine-learning model.
      </p>

      <h2>Retention and infrastructure</h2>
      <p>
        RPCS1 does not intentionally store recommendation inputs in an application database.
        Infrastructure providers may temporarily process request metadata, including IP addresses,
        timestamps, paths, and error logs, for delivery, security, rate limiting, and diagnostics.
      </p>

      <h2>Payments</h2>
      <p>
        Paid subscriptions are processed by Stripe. Transactional email is delivered through
        Resend. Their handling of account and payment information is governed by their own privacy
        policies.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy and support questions can be sent to{' '}
        <a href="mailto:travisbergen2@gmail.com">travisbergen2@gmail.com</a>.
      </p>
    </article>
  );
}
