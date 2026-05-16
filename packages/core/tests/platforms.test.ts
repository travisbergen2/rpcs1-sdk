import { describe, it, expect } from 'vitest';
import { mapToParameters } from '../src/platforms';
import type { ReceiverProfile } from '../src/types';

const balancedProfile: ReceiverProfile = { TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 };
const aggressiveProfile: ReceiverProfile = { TI: 20, SG: 80, FT: 20, UE: 80, AR: 80 };
const conservativeProfile: ReceiverProfile = { TI: 80, SG: 20, FT: 80, UE: 20, AR: 20 };

describe('mapToParameters', () => {
  it('balanced profile → mid-range parameters', () => {
    const p = mapToParameters(balancedProfile, 'anthropic');
    expect(p.temperature).toBeGreaterThan(0.1);
    expect(p.temperature).toBeLessThan(0.9);
    expect(p.max_tokens).toBeGreaterThan(1000);
  });

  it('high SG → lower temperature (crisp outputs)', () => {
    const highSG = mapToParameters({ ...balancedProfile, SG: 90 }, 'anthropic');
    const lowSG  = mapToParameters({ ...balancedProfile, SG: 10 }, 'anthropic');
    expect(highSG.temperature).toBeLessThan(lowSG.temperature);
  });

  it('high TI → more max_tokens', () => {
    const highTI = mapToParameters({ ...balancedProfile, TI: 90 }, 'anthropic');
    const lowTI  = mapToParameters({ ...balancedProfile, TI: 10 }, 'anthropic');
    expect(highTI.max_tokens).toBeGreaterThan(lowTI.max_tokens);
  });

  it('high TI → long_window context strategy', () => {
    const p = mapToParameters({ ...balancedProfile, TI: 80 }, 'anthropic');
    expect(p.context_strategy).toBe('long_window');
  });

  it('low TI → frequent_grounding context strategy', () => {
    const p = mapToParameters({ ...balancedProfile, TI: 15 }, 'anthropic');
    expect(p.context_strategy).toBe('frequent_grounding');
  });

  it('high FT → explicit_confirmation tool strategy', () => {
    const p = mapToParameters({ ...balancedProfile, FT: 80 }, 'anthropic');
    expect(p.tool_use_strategy).toBe('explicit_confirmation');
  });

  it('high AR + low FT → aggressive tool strategy', () => {
    const p = mapToParameters({ ...balancedProfile, AR: 80, FT: 20 }, 'anthropic');
    expect(p.tool_use_strategy).toBe('aggressive');
  });

  it('high UE → aggressive retry strategy', () => {
    const p = mapToParameters({ ...balancedProfile, UE: 80 }, 'anthropic');
    expect(p.retry_strategy).toBe('aggressive');
  });

  it('generic platform → no model_recommendation', () => {
    const p = mapToParameters(balancedProfile, 'generic');
    expect(p.model_recommendation).toBeUndefined();
  });

  it('anthropic platform → model recommendation present', () => {
    const p = mapToParameters(balancedProfile, 'anthropic');
    expect(p.model_recommendation).toBeDefined();
  });

  it('openai temperature range can exceed 1.0', () => {
    // openai temperature_range is [0, 2.0]
    const p = mapToParameters({ ...balancedProfile, SG: 0 }, 'openai');
    expect(p.temperature).toBeGreaterThanOrEqual(1.0);
  });

  it('conservative profile → system_prompt_additions non-empty', () => {
    const p = mapToParameters(conservativeProfile, 'anthropic');
    expect(p.system_prompt_additions?.length).toBeGreaterThan(0);
  });

  it('all returned temperature values are within platform range', () => {
    for (const profile of [balancedProfile, aggressiveProfile, conservativeProfile]) {
      const p = mapToParameters(profile, 'anthropic');
      expect(p.temperature).toBeGreaterThanOrEqual(0.0);
      expect(p.temperature).toBeLessThanOrEqual(1.0);
    }
  });
});
