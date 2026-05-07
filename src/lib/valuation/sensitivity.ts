// ═══════════════════════════════════════════════════════════════════════
// SENSITIVITY ANALYZER
// Tornado diagrams, bull/base/bear scenarios, and correlated stress
// cascade testing. From DeepSeek + Opus designs.
// ═══════════════════════════════════════════════════════════════════════

import type {
  CompanyValuationInput,
  Scenario,
  BuyerType,
  ValuationBand,
  TornadoBar,
  ScenarioResult,
  StressCascadeResult,
} from './types';
import { runValuation } from './engine';

// ── Sensitivity Variable Definition ───────────────────────────────────

export interface SensitivityVariable {
  name: string;
  key: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}

// ── Stage-aware variable ranges ───────────────────────────────────────

const VARIABLE_TEMPLATES: Record<string, Omit<SensitivityVariable, 'currentValue'>> = {
  revenueGrowthShockPct: {
    name: 'Revenue Growth',
    key: 'revenueGrowthShockPct',
    min: -30,
    max: 30,
    step: 5,
    unit: '%',
  },
  multipleShockPct: {
    name: 'Multiple',
    key: 'multipleShockPct',
    min: -25,
    max: 25,
    step: 5,
    unit: '%',
  },
  marginShockPct: {
    name: 'Margin',
    key: 'marginShockPct',
    min: -15,
    max: 15,
    step: 3,
    unit: '%',
  },
  discountRateShockPct: {
    name: 'Discount Rate',
    key: 'discountRateShockPct',
    min: -10,
    max: 10,
    step: 2,
    unit: '%',
  },
  strategicPremiumPct: {
    name: 'Strategic Premium',
    key: 'strategicPremiumPct',
    min: -20,
    max: 20,
    step: 5,
    unit: '%',
  },
  volatility: {
    name: 'Volatility (CRR)',
    key: 'volatility',
    min: -0.2,
    max: 0.2,
    step: 0.05,
    unit: 'abs',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// SENSITIVITY ANALYZER CLASS
// ═══════════════════════════════════════════════════════════════════════

export class SensitivityAnalyzer {
  private input: CompanyValuationInput;
  private baseScenario: Scenario;
  private buyerType: BuyerType;

  constructor(
    input: CompanyValuationInput,
    baseScenario: Scenario,
    buyerType: BuyerType
  ) {
    this.input = input;
    this.baseScenario = baseScenario;
    this.buyerType = buyerType;
  }

  /**
   * Returns stage-aware sensitivity variables with appropriate ranges.
   * Early-stage companies get wider ranges for growth/multiples.
   * Mature companies get tighter ranges with more focus on margins.
   */
  getSensitivityVariables(): SensitivityVariable[] {
    const stage = this.input.stage;
    const variables: SensitivityVariable[] = [];

    // Revenue growth — wider for early stage
    const growthVar = { ...VARIABLE_TEMPLATES['revenueGrowthShockPct'], currentValue: this.baseScenario.revenueGrowthShockPct };
    if (stage === 'idea' || stage === 'pre_revenue' || stage === 'mvp') {
      growthVar.min = -50;
      growthVar.max = 50;
    }
    variables.push(growthVar);

    // Multiple — wider for early stage
    const multipleVar = { ...VARIABLE_TEMPLATES['multipleShockPct'], currentValue: this.baseScenario.multipleShockPct };
    if (stage === 'idea' || stage === 'pre_revenue') {
      multipleVar.min = -40;
      multipleVar.max = 40;
    }
    variables.push(multipleVar);

    // Margin
    const marginVar = { ...VARIABLE_TEMPLATES['marginShockPct'], currentValue: this.baseScenario.marginShockPct };
    if (stage === 'mature' || stage === 'scaleup') {
      marginVar.min = -20;
      marginVar.max = 20;
    }
    variables.push(marginVar);

    // Discount rate
    variables.push({
      ...VARIABLE_TEMPLATES['discountRateShockPct'],
      currentValue: this.baseScenario.discountRateShockPct,
    });

    // Strategic premium (only if relevant)
    if (this.buyerType === 'acquirer' || this.buyerType === 'strategic_partner' || this.input.strategicSynergy) {
      variables.push({
        ...VARIABLE_TEMPLATES['strategicPremiumPct'],
        currentValue: this.baseScenario.strategicPremiumPct,
      });
    }

    // Volatility (CRR sensitivity — Grok's insight: huge impact)
    variables.push({
      ...VARIABLE_TEMPLATES['volatility'],
      currentValue: this.input.volatility,
    });

    return variables;
  }

  /**
   * Generate tornado diagram data by varying each variable independently.
   * Returns bars sorted by absolute impact (largest first).
   */
  generateTornadoData(): TornadoBar[] {
    // Use skipMonteCarlo so tornado bars reflect weighted-blend sensitivity,
    // not MC noise (MC is a DCF-only simulation that ignores multiple shocks).
    const opts = { skipMonteCarlo: true };
    const baseResult = runValuation(this.input, this.baseScenario, this.buyerType, opts);
    const baseEV = baseResult.enterpriseValue.base;
    const variables = this.getSensitivityVariables();
    const bars: TornadoBar[] = [];

    for (const variable of variables) {
      if (variable.key === 'volatility') {
        // Volatility is on the input, not the scenario
        const lowInput = { ...this.input, volatility: Math.max(0.1, this.input.volatility + variable.min) };
        const highInput = { ...this.input, volatility: Math.min(1.5, this.input.volatility + variable.max) };

        const lowResult = runValuation(lowInput, this.baseScenario, this.buyerType, opts);
        const highResult = runValuation(highInput, this.baseScenario, this.buyerType, opts);

        bars.push({
          variable: variable.name,
          lowValue: this.input.volatility + variable.min,
          highValue: this.input.volatility + variable.max,
          baseValue: this.input.volatility,
          lowResult: lowResult.enterpriseValue.base,
          highResult: highResult.enterpriseValue.base,
          baseResult: baseEV,
          absoluteImpact: Math.abs(highResult.enterpriseValue.base - lowResult.enterpriseValue.base),
        });
      } else {
        // Scenario-based variables
        const lowScenario = {
          ...this.baseScenario,
          [variable.key]: variable.min,
        };
        const highScenario = {
          ...this.baseScenario,
          [variable.key]: variable.max,
        };

        const lowResult = runValuation(this.input, lowScenario, this.buyerType, opts);
        const highResult = runValuation(this.input, highScenario, this.buyerType, opts);

        bars.push({
          variable: variable.name,
          lowValue: variable.min,
          highValue: variable.max,
          baseValue: variable.currentValue,
          lowResult: lowResult.enterpriseValue.base,
          highResult: highResult.enterpriseValue.base,
          baseResult: baseEV,
          absoluteImpact: Math.abs(highResult.enterpriseValue.base - lowResult.enterpriseValue.base),
        });
      }
    }

    // Sort by absolute impact (largest first) for tornado ordering
    return bars.sort((a, b) => b.absoluteImpact - a.absoluteImpact);
  }

  /**
   * Generate bull (20%), base (60%), bear (20%) scenarios with
   * probability-weighted expected value.
   */
  generateScenarios(): { scenarios: ScenarioResult[]; probabilityWeightedEV: number } {
    const stage = this.input.stage;

    // Stage-aware scenario shock magnitudes
    let growthBull = 20;
    let growthBear = -20;
    let multipleBull = 15;
    let multipleBear = -15;
    let marginBull = 5;
    let marginBear = -5;

    if (stage === 'idea' || stage === 'pre_revenue') {
      growthBull = 40;
      growthBear = -35;
      multipleBull = 25;
      multipleBear = -25;
    } else if (stage === 'mature' || stage === 'scaleup') {
      growthBull = 10;
      growthBear = -10;
      multipleBull = 10;
      multipleBear = -10;
      marginBull = 8;
      marginBear = -8;
    }

    const bullScenario: Scenario = {
      ...this.baseScenario,
      name: 'Bull',
      revenueGrowthShockPct: growthBull,
      multipleShockPct: multipleBull,
      marginShockPct: marginBull,
    };

    const bearScenario: Scenario = {
      ...this.baseScenario,
      name: 'Bear',
      revenueGrowthShockPct: growthBear,
      multipleShockPct: multipleBear,
      marginShockPct: marginBear,
    };

    const baseResult = runValuation(this.input, this.baseScenario, this.buyerType, { skipMonteCarlo: true });
    const bullResult = runValuation(this.input, bullScenario, this.buyerType, { skipMonteCarlo: true });
    const bearResult = runValuation(this.input, bearScenario, this.buyerType, { skipMonteCarlo: true });

    const scenarios: ScenarioResult[] = [
      {
        name: 'Bear',
        probability: 0.20,
        enterpriseValue: bearResult.enterpriseValue,
        weightedEV: bearResult.enterpriseValue.base * 0.20,
      },
      {
        name: 'Base',
        probability: 0.60,
        enterpriseValue: baseResult.enterpriseValue,
        weightedEV: baseResult.enterpriseValue.base * 0.60,
      },
      {
        name: 'Bull',
        probability: 0.20,
        enterpriseValue: bullResult.enterpriseValue,
        weightedEV: bullResult.enterpriseValue.base * 0.20,
      },
    ];

    const probabilityWeightedEV = scenarios.reduce((sum, s) => sum + s.weightedEV, 0);

    return { scenarios, probabilityWeightedEV };
  }

  /**
   * Correlated multi-variable stress cascade (Opus design).
   * Tests what happens when multiple bad things happen simultaneously.
   *
   * @param correlatedShocks Array of named shock sets
   */
  generateStressCascade(
    correlatedShocks?: { name: string; variables: string[]; shockPcts: number[] }[]
  ): StressCascadeResult[] {
    const baseResult = runValuation(this.input, this.baseScenario, this.buyerType, { skipMonteCarlo: true });
    const baseEV = baseResult.enterpriseValue.base;

    // Default stress scenarios — buyer-type-aware when none are provided
    const shocks = correlatedShocks ?? this.getDefaultStressCascades();

    const results: StressCascadeResult[] = [];

    for (const shock of shocks) {
      // Apply all shocks simultaneously to the scenario
      const stressedScenario = { ...this.baseScenario, name: shock.name };

      for (let i = 0; i < shock.variables.length; i++) {
        const varKey = shock.variables[i];
        const shockValue = shock.shockPcts[i];

        if (varKey in stressedScenario && varKey !== 'name') {
          const current = (stressedScenario as unknown as Record<string, number>)[varKey] ?? 0;
          (stressedScenario as unknown as Record<string, number>)[varKey] = current + shockValue;
        }
      }

      const stressResult = runValuation(this.input, stressedScenario, this.buyerType, { skipMonteCarlo: true });
      const impactPct = baseEV > 0
        ? ((stressResult.enterpriseValue.base - baseEV) / baseEV) * 100
        : 0;

      results.push({
        name: shock.name,
        shocks: shock.variables.map((v, i) => ({ variable: v, shockPct: shock.shockPcts[i] })),
        enterpriseValue: stressResult.enterpriseValue,
        impactPct,
      });
    }

    // Sort by impact (most negative first)
    return results.sort((a, b) => a.impactPct - b.impactPct);
  }

  /**
   * Returns buyer-type-specific stress cascade scenarios.
   * Each buyer type faces different primary risks that warrant stress testing.
   */
  private getDefaultStressCascades(): { name: string; variables: string[]; shockPcts: number[] }[] {
    // Universal macro shock included for all buyer types
    const macroDownturn = {
      name: 'Full macro downturn',
      variables: ['revenueGrowthShockPct', 'marginShockPct', 'multipleShockPct'],
      shockPcts: [-25, -10, -20],
    };

    switch (this.buyerType) {
      case 'angel':
        return [
          {
            name: 'Burn acceleration + runway depletion',
            variables: ['marginShockPct', 'revenueGrowthShockPct'],
            shockPcts: [-15, -20],
          },
          {
            name: 'Founder departure + growth stall',
            variables: ['revenueGrowthShockPct', 'multipleShockPct'],
            shockPcts: [-35, -25],
          },
          {
            name: 'Failed product-market fit pivot',
            variables: ['revenueGrowthShockPct', 'multipleShockPct', 'marginShockPct'],
            shockPcts: [-40, -30, -10],
          },
          macroDownturn,
        ];

      case 'private_equity':
        return [
          {
            name: 'EBITDA margin compression + debt service strain',
            variables: ['marginShockPct', 'discountRateShockPct'],
            shockPcts: [-15, 5],
          },
          {
            name: 'Integration cost overrun + working capital drain',
            variables: ['marginShockPct', 'revenueGrowthShockPct', 'multipleShockPct'],
            shockPcts: [-12, -10, -15],
          },
          {
            name: 'Multiple contraction + rate hike (exit risk)',
            variables: ['multipleShockPct', 'discountRateShockPct'],
            shockPcts: [-25, 8],
          },
          macroDownturn,
        ];

      case 'strategic_partner':
        return [
          {
            name: 'Synergy realisation failure',
            variables: ['strategicPremiumPct', 'marginShockPct'],
            shockPcts: [-20, -8],
          },
          {
            name: 'Cultural integration risk + talent attrition',
            variables: ['revenueGrowthShockPct', 'marginShockPct', 'multipleShockPct'],
            shockPcts: [-15, -10, -10],
          },
          {
            name: 'Regulatory block + technology obsolescence',
            variables: ['multipleShockPct', 'revenueGrowthShockPct', 'strategicPremiumPct'],
            shockPcts: [-20, -20, -15],
          },
          macroDownturn,
        ];

      case 'acquirer':
        return [
          {
            name: 'Control premium evaporation + comp repricing',
            variables: ['multipleShockPct', 'strategicPremiumPct'],
            shockPcts: [-20, -15],
          },
          {
            name: 'Key-person loss + revenue attrition',
            variables: ['revenueGrowthShockPct', 'marginShockPct', 'multipleShockPct'],
            shockPcts: [-25, -8, -15],
          },
          {
            name: 'Leverage risk + rate spike',
            variables: ['discountRateShockPct', 'marginShockPct', 'multipleShockPct'],
            shockPcts: [8, -10, -20],
          },
          macroDownturn,
        ];

      default:
        // VC (seed/series A) — growth-focused risks
        return [
          {
            name: 'Growth deceleration + churn spike',
            variables: ['revenueGrowthShockPct', 'marginShockPct'],
            shockPcts: [-30, -8],
          },
          {
            name: 'Down-round risk (multiple compression)',
            variables: ['multipleShockPct', 'discountRateShockPct'],
            shockPcts: [-25, 5],
          },
          {
            name: 'Competitive disruption + market share loss',
            variables: ['revenueGrowthShockPct', 'multipleShockPct', 'marginShockPct'],
            shockPcts: [-20, -15, -5],
          },
          macroDownturn,
        ];
    }
  }
}
