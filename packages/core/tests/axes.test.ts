import { describe, it, expect } from 'vitest';
import { applyAxes, AXES, IDENTITY_COORDS, type AxisCoords } from '../src/axes.js';

const coords = (partial: Partial<AxisCoords>): AxisCoords => ({ ...IDENTITY_COORDS, ...partial });

describe('axes — coordinate transforms (spec v0.2 A1/A2)', () => {
  it('identity coords return text byte-unchanged with no moves', () => {
    const text = 'Rate this tagline 1-10, number only: "Ship faster, worry less." Hurry!';
    const r = applyAxes(text, IDENTITY_COORDS);
    expect(r.text).toBe(text);
    expect(r.moves).toHaveLength(0);
  });

  it('is deterministic: same input, same output', () => {
    const text = 'We are about to demo to a client, quick! Return valid JSON with keys name and score.';
    const c = coords({ urgency: 2, fencing: 1, commentary: 1 });
    const a = applyAxes(text, c);
    const b = applyAxes(text, c);
    expect(a.text).toBe(b.text);
    expect(a.moves).toEqual(b.moves);
  });

  describe('urgency axis (T-URG)', () => {
    it('strength 2 removes a deadline clause but keeps the task', () => {
      const r = applyAxes(
        'Our investor call starts in ten minutes and I need this now. Rate this tagline 1-10.',
        coords({ urgency: 2 }),
      );
      expect(r.text).toContain('Rate this tagline');
      expect(r.text.toLowerCase()).not.toContain('ten minutes');
      expect(r.moves.some((m) => m.axis === 'urgency')).toBe(true);
    });

    it('strength 2 drops a pressure-only sentence entirely', () => {
      const r = applyAxes('The board votes on this in an hour so please hurry. Summarize the memo.', coords({ urgency: 2 }));
      expect(r.text).toContain('Summarize the memo');
      expect(r.text.toLowerCase()).not.toContain('hurry');
    });

    it('no urgency present → no move recorded', () => {
      const r = applyAxes('Summarize this memo in two sentences.', coords({ urgency: 2 }));
      expect(r.moves).toHaveLength(0);
      expect(r.text).toBe('Summarize this memo in two sentences.');
    });
  });

  describe('register axis (T-REG)', () => {
    it('removes a personal-state clause, keeps the question', () => {
      const r = applyAxes(
        "I've had a brutal week and my head is pounding. Answer in one sentence only: how many days are in a leap year?",
        coords({ register: 2 }),
      );
      expect(r.text).toContain('leap year');
      expect(r.text.toLowerCase()).not.toContain('brutal week');
      expect(r.moves.some((m) => m.axis === 'register')).toBe(true);
    });
  });

  describe('fencing axis (T-FENCE)', () => {
    it('moves constraints into a leading mandatory block', () => {
      const r = applyAxes(
        "Summarize this in two sentences and don't mention pricing: Acme's new plan bundles hosting at $29/month.",
        coords({ fencing: 1 }),
      );
      expect(r.text.startsWith('Constraints (mandatory):')).toBe(true);
      expect(r.text).toContain('- ');
    });

    it('no constraints → unchanged', () => {
      const r = applyAxes('Tell me about the history of the Ford circle construction.', coords({ fencing: 1 }));
      expect(r.moves).toHaveLength(0);
    });
  });

  describe('commentary axis (T-NOC)', () => {
    it('appends the bare-output fence once', () => {
      const once = applyAxes('Convert to uppercase: quarterly report.', coords({ commentary: 1 }));
      expect(once.text).toContain('Output the requested text only, with no commentary.');
      const twice = applyAxes(once.text, coords({ commentary: 1 }));
      const occurrences = twice.text.split('Output the requested text only').length - 1;
      expect(occurrences).toBe(1);
      expect(twice.moves).toHaveLength(0);
    });
  });

  describe('axis metadata', () => {
    it('all four launch axes carry the measured evidence tag and an E-RX-1 source', () => {
      expect(AXES).toHaveLength(4);
      for (const axis of AXES) {
        expect(axis.evidence).toBe('measured');
        expect(axis.source).toContain('E-RX-1');
        expect(axis.positions).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
