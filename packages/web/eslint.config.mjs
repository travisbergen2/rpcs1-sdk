import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Accessibility ratchet (2026-08-25). Next's config already registers the
  // jsx-a11y plugin but enables only ~6 rules; we turn on the rest of the
  // high-value set as errors WITHOUT re-registering the plugin (spreading its
  // flat config throws "Cannot redefine plugin"). These lock in labels,
  // keyboard parity for click handlers, valid roles/aria, and anchor
  // validity at lint time so the audit can't silently regress.
  {
    rules: {
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
      // NOTE: control-has-associated-label is intentionally NOT enabled — it
      // does not traverse the explicit htmlFor+id association this codebase
      // uses, so it false-positives on correctly-labeled controls.
      // label-has-associated-control (above) is the accurate check and passes.
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      'jsx-a11y/aria-role': 'error',
    },
  },
  globalIgnores(['.next/**']),
]);
