import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for the RPCS1 Agent Tuner, API, and MCP server.',
};

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 prose prose-invert">
      <h1>Terms of Service</h1>
      <p>Last updated: June 9, 2026.</p>

      <h2>Service</h2>
      <p>
        RPCS1 provides deterministic tools for analyzing agent configuration, environmental
        constraints, and behavioral mismatch. These terms apply to the RPCS1 website, tuner, API,
        SDK, and MCP server.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may use RPCS1 only in compliance with applicable laws. You may not abuse, disrupt,
        reverse engineer, overload, or use the service to harm others or gain unauthorized access
        to systems or data.
      </p>

      <h2>Recommendations and responsibility</h2>
      <p>
        RPCS1 output is informational and may be incomplete or unsuitable for a particular
        situation. It is not medical, legal, financial, or safety-critical advice. You are
        responsible for evaluating recommendations before applying them to an agent or system.
      </p>

      <h2>Accounts, billing, and cancellation</h2>
      <p>
        Paid plans, when offered, are processed by Stripe under the price and billing interval
        shown at checkout. You are responsible for keeping payment information current. You may
        cancel a subscription through the available billing controls or by contacting support.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The service may be modified, suspended, rate limited, or discontinued. We may update these
        terms by publishing a revised version with a new effective date.
      </p>

      <h2>Intellectual property</h2>
      <p>
        RPCS1 software distributed under an open-source license remains subject to that license.
        Other site content, branding, and hosted services remain the property of their respective
        owners. You retain ownership of content you submit.
      </p>

      <h2>Disclaimer and limitation of liability</h2>
      <p>
        The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
        warranties of any kind. To the fullest extent permitted by law, RPCS1 and its developer
        will not be liable for indirect, incidental, special, consequential, or punitive damages,
        or for loss of data, profits, or business arising from use of the service.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to{' '}
        <a href="mailto:travisbergen2@gmail.com">travisbergen2@gmail.com</a>.
      </p>
    </article>
  );
}
