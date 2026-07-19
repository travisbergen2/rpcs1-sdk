import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your website speed report — what it means and the fix',
  description:
    'We measured how fast your website loads for a real visitor. Here’s what the number means for your business, and a flat-rate fix if you want it handled.',
  robots: { index: false }, // outreach landing page — not for search
};

export default function LocalPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-12 pt-20 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
          You got our email — here’s the full picture
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          We measured how fast your website loads. Here’s why that number matters.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          The report in your inbox is a real measurement of your actual site — not a sales
          template. This page explains what it means in plain terms, what it’s likely costing
          you, and what fixing it involves if you’d like it handled.
        </p>
      </section>

      {/* Why it matters */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Slow pages lose customers before you ever see them</h2>
          <div className="mt-5 space-y-4 text-slate-700">
            <p>
              <strong>More than half of mobile visitors leave</strong> a page that takes over
              three seconds to load — Google’s own research puts it at 53%. They don’t call to
              complain. They tap the next business in the list.
            </p>
            <p>
              Google also ranks faster sites higher in local search results. A slow site
              doesn’t just frustrate the visitors you get — it quietly reduces how many people
              find you at all.
            </p>
            <p>
              None of this shows up on an invoice, which is why most owners never hear about
              it. The measurement in your email is the part you were never shown.
            </p>
          </div>
        </div>
      </section>

      {/* What the fix involves */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">What fixing it involves</h2>
        <div className="mt-5 space-y-4 text-slate-700">
          <p>
            Most slow small-business sites have the same handful of causes: oversized images,
            plugins stacked over the years, cheap hosting, and pages that load everything
            before showing anything. These are mechanical problems with mechanical fixes.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>You keep your website.</strong> Same design, same address, same content — it just loads fast.</li>
            <li><strong>Flat rate, quoted up front.</strong> No subscription, no hourly meter, no surprise invoice.</li>
            <li><strong>Before-and-after numbers.</strong> You get the same measurement we sent you, re-run after the work — so you can see exactly what changed, not take our word for it.</li>
            <li><strong>If we can’t make it meaningfully faster, we say so before you pay.</strong></li>
          </ul>
        </div>
      </section>

      {/* Who */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Who’s behind this</h2>
          <p className="mt-4 text-slate-700">
            RPCS-1 is an Iowa-based software shop. The same measurement-first approach we use
            for AI systems — measure, change one thing, measure again — is what we bring to
            your website: no jargon, no scare tactics, numbers you can verify yourself.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Want it handled?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Reply to the email we sent — or write to us directly. You’ll get a flat-rate quote
          and a plain-language plan. No call required; everything can be done in writing.
        </p>
        <a
          href="mailto:hello@rpcs1.dev?subject=Website%20speed%20fix"
          className="mt-7 inline-flex items-center justify-center rounded-xl bg-sky-600 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-sky-500"
        >
          Email us about your site
        </a>
        <p className="mt-4 text-sm text-slate-500">
          Prefer not to hear from us again? Reply “unsubscribe” to the email and you won’t.
        </p>
      </section>
    </div>
  );
}
