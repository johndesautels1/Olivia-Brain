// ── Valuation Workbench Field Glossary ──────────────────────────────────
// Centralised hover-card content for every field on the Valuation page.
// Used by <GlossaryTooltip> to render accessible, rich explanation cards.

export interface FieldGlossaryEntry {
  key: string;
  title: string;
  oneLiner: string;
  plainEnglish: string;
  formula: string | null;
  industryContext: string;
  accuracyNote: string;
  accuracyLevel: 'high' | 'medium' | 'low';
  section:
    | 'kpi'
    | 'method'
    | 'sensitivity'
    | 'montecarlo'
    | 'realoptions'
    | 'scenarios'
    | 'negotiate'
    | 'input'
    | 'analysis';
}

const GLOSSARY: Record<string, FieldGlossaryEntry> = {
  // ── SECTION 1: KPI Cards ──────────────────────────────────────────────

  enterprise_value: {
    key: 'enterprise_value',
    title: 'Enterprise Value',
    oneLiner: 'Total company value before debt/cash adjustment',
    plainEnglish:
      'The total theoretical price a buyer would pay for the entire business, ignoring its cash balance and debt. This is the headline number in every deal.',
    formula:
      'Weighted average of all enabled method EVs × strategic adjustment multiplier',
    industryContext:
      'Used by every M&A deal, PE firm, and investment bank globally as THE core deal price metric.',
    accuracyNote: 'HIGH when methods agree; MEDIUM when divergence >40%.',
    accuracyLevel: 'high',
    section: 'kpi',
  },

  equity_value: {
    key: 'equity_value',
    title: 'Equity Value',
    oneLiner: 'What shareholders actually own',
    plainEnglish:
      'Enterprise value plus the company\'s cash minus its debts. This is what appears on cap tables and determines share price in every funding round.',
    formula: 'EV + Cash on Hand − Total Debt',
    industryContext:
      'Appears in every term sheet, cap table, and shareholder agreement.',
    accuracyNote: 'HIGH — depends on accurate debt/cash from audited financials.',
    accuracyLevel: 'high',
    section: 'kpi',
  },

  confidence: {
    key: 'confidence',
    title: 'Confidence Score',
    oneLiner: 'How trustworthy this valuation is',
    plainEnglish:
      'A 0–100% score reflecting data quality, method appropriateness for this company stage, and how much the different methods agree with each other.',
    formula: 'Average of (method weights + data quality + stage-fit) / 3',
    industryContext:
      'Internal quality metric; analogous to S&P credit confidence ratings.',
    accuracyNote: 'Self-referential — high confidence ≠ guaranteed accuracy.',
    accuracyLevel: 'medium',
    section: 'kpi',
  },

  methods_used: {
    key: 'methods_used',
    title: 'Active Methods',
    oneLiner: 'Number of valuation approaches contributing',
    plainEnglish:
      'How many independent mathematical approaches were used and blended. More triangulation = more robust estimate. Best practice is 3–5 methods.',
    formula: 'Count of methods where enabled=true AND (weight>0 OR isOverlay=true)',
    industryContext:
      'IB/PE standard is 3–5 methods; academic minimum is 2 cross-checks.',
    accuracyNote: 'More methods with agreement = higher confidence.',
    accuracyLevel: 'high',
    section: 'kpi',
  },

  moic: {
    key: 'moic',
    title: 'MOIC (Multiple on Invested Capital)',
    oneLiner: 'How many times investors have multiplied their money at the current valuation',
    plainEnglish:
      'If investors put in £1M total and the company is now worth £5M, the MOIC is 5.0x. VCs typically target 3–10x; PE targets 2.5–4x. Below 1.0x means value has been destroyed.',
    formula: 'MOIC = Enterprise Value (base) ÷ Total Capital Raised to Date',
    industryContext:
      'Top-quartile VC funds average 3.5x gross MOIC. PE buyout funds target 2.0–3.0x net. Angel investors seek 10x+ on individual deals to offset portfolio losses.',
    accuracyNote: 'Requires accurate capital raised data. Missing rounds will inflate MOIC.',
    accuracyLevel: 'medium',
    section: 'kpi',
  },

  implied_ownership: {
    key: 'implied_ownership',
    title: 'Implied Ownership',
    oneLiner: 'What percentage of the company all invested capital represents at the current valuation',
    plainEnglish:
      'If a round was done at £2M pre-money with £500K raised, investors own 500K / 2.5M = 20% of the company. If using total capital raised, this shows the cumulative dilution from all rounds.',
    formula: 'From last round: (Post-Money − Pre-Money) ÷ Post-Money. Fallback: Capital Raised ÷ Enterprise Value',
    industryContext:
      'Seed rounds typically sell 15–25% equity. Series A sells 20–30%. By Series B, founders typically retain 30–50% depending on capital efficiency.',
    accuracyNote: 'Most accurate with round-level pre/post-money data. Cap-raised proxy is approximate.',
    accuracyLevel: 'medium',
    section: 'kpi',
  },

  // ── SECTION 2: Method Stack — 11 Valuation Methods ────────────────────

  revenue_multiple: {
    key: 'revenue_multiple',
    title: 'Revenue Multiple',
    oneLiner: 'Revenue times a market-derived multiplier',
    plainEnglish:
      'Takes your annual revenue and multiplies it by what similar companies in your sector trade at. Adjustments for growth speed, customer retention quality, and profit margins fine-tune the number.',
    formula:
      'Revenue × Base Multiple × Growth Lift × NRR Lift × Margin Lift × Quality Multiplier',
    industryContext:
      '90%+ of tech M&A transactions; default for SaaS at Series A–C.',
    accuracyNote: 'HIGH for growth-stage with >£1M ARR; LOW for pre-revenue.',
    accuracyLevel: 'high',
    section: 'method',
  },

  ebitda_multiple: {
    key: 'ebitda_multiple',
    title: 'EBITDA Multiple',
    oneLiner: 'Operating profit times a market multiplier',
    plainEnglish:
      'Takes your profit before interest, taxes, depreciation, and amortisation, then multiplies by what profitable peers in your sector trade at.',
    formula: 'EBITDA × Base Multiple × Margin Adjustment',
    industryContext:
      'Standard for PE buyouts; how Blackstone, KKR, and Carlyle price acquisitions.',
    accuracyNote: 'HIGH for profitable companies; DISABLED for loss-making.',
    accuracyLevel: 'high',
    section: 'method',
  },

  dcf: {
    key: 'dcf',
    title: 'Discounted Cash Flow (DCF)',
    oneLiner: 'Future cash flows converted to today\'s value',
    plainEnglish:
      'Forecasts how much free cash the business will generate each year for 5 years, then converts all that future money into today\'s value using a discount rate that reflects risk. Includes a "terminal value" for all cash flows beyond year 5.',
    formula:
      'Σ [FCFF / (1+WACC)^year] + Terminal Value / (1+WACC)^5. Terminal Value uses Gordon Growth Model: FCFF_final / (WACC − g)',
    industryContext:
      'Gold standard at Goldman Sachs, Morgan Stanley, JP Morgan. Used in every IPO and M&A above £10M.',
    accuracyNote:
      'MEDIUM — highly sensitive to discount rate and growth assumptions; ±20% swing from small input changes.',
    accuracyLevel: 'medium',
    section: 'method',
  },

  vc_method: {
    key: 'vc_method',
    title: 'VC Back-Solve',
    oneLiner: 'Working backwards from future exit to today\'s price',
    plainEnglish:
      'Imagines what the company will be worth at exit (in 3–5 years based on stage), then works backwards to find today\'s price given an investor\'s required return rate (IRR).',
    formula: 'Exit Revenue × Exit Multiple / (1 + Target IRR)^Years',
    industryContext:
      'Standard at Sequoia, Accel, Index Ventures for early-stage pricing.',
    accuracyNote:
      'MEDIUM — assumes successful exit; ignores failure probability.',
    accuracyLevel: 'medium',
    section: 'method',
  },

  cost_to_duplicate: {
    key: 'cost_to_duplicate',
    title: 'Cost to Duplicate',
    oneLiner: 'Rebuild-from-scratch price estimate',
    plainEnglish:
      'Adds up all the money spent building the technology, plus the value of patents, proprietary data, and intellectual property strength. Sets a floor price.',
    formula:
      'Build Cost + (Patents × £25K) + (Data Score × £500K) + (IP Strength × £750K)',
    industryContext:
      'Used as valuation floor; popular in deeptech/hardware where IP is primary asset.',
    accuracyNote:
      'LOW-MEDIUM — conservative floor; doesn\'t capture commercial traction.',
    accuracyLevel: 'low',
    section: 'method',
  },

  scorecard: {
    key: 'scorecard',
    title: 'Scorecard (Berkus Method)',
    oneLiner: 'Qualitative scoring vs regional benchmarks',
    plainEnglish:
      'Takes the average seed-stage valuation for your region (£4M London), then adjusts up/down based on qualitative scores for team, market opportunity, product, competition, marketing, and capital needs.',
    formula:
      'Regional Benchmark × Weighted Score. Weights: Team 30%, Opportunity 25%, Product 15%, Competition 10%, Marketing 10%, Capital 5%, Other 5%',
    industryContext:
      'Bill Payne\'s Angel method; used by 60%+ of angel networks including London Angel Club.',
    accuracyNote:
      'LOW — inherently subjective; different evaluators score differently.',
    accuracyLevel: 'low',
    section: 'method',
  },

  liquidation: {
    key: 'liquidation',
    title: 'Liquidation / Book Value',
    oneLiner: 'Absolute floor — fire-sale value',
    plainEnglish:
      'The bare minimum worth if you shut down today: cash in the bank minus debts, plus whatever IP and patents would fetch in a forced sale. This is always the lowest number.',
    formula:
      '(Cash − Debt) + (IP Strength × £500K) + (Patents × £20K)',
    industryContext:
      'Required by auditors for impairment testing; used as downside floor in all M&A analyses.',
    accuracyNote:
      'HIGH for what it measures — but most going concerns are worth 3–10× liquidation.',
    accuracyLevel: 'high',
    section: 'method',
  },

  strategic_synergy: {
    key: 'strategic_synergy',
    title: 'Strategic Synergy',
    oneLiner: 'Additional value to a specific acquirer',
    plainEnglish:
      'Calculates the extra value that exists ONLY for a buyer who can generate synergies (cost savings, revenue expansion, market access) from the acquisition. Buyer-specific premium.',
    formula:
      '(Standalone EV + Synergy Value) × Buyer Premium. Synergy Value = Annual Synergy × 3 × Realisation Probability',
    industryContext:
      'Used in every strategic M&A deal; modelled by Bain, McKinsey, BCG.',
    accuracyNote:
      'LOW — 60%+ of projected synergies fail to materialise (Harvard Business Review data).',
    accuracyLevel: 'low',
    section: 'method',
  },

  precedent_transactions: {
    key: 'precedent_transactions',
    title: 'Precedent Transactions',
    oneLiner: 'What similar companies actually sold for',
    plainEnglish:
      'Looks at comparable company exits in your sector, then applies a 15% discount because your comparables are imperfect matches. Based on real deal data.',
    formula: 'Revenue × Sector Median Multiple × 0.85',
    industryContext:
      'Standard in every M&A pitch book; required by RICS and IVS valuation standards.',
    accuracyNote:
      'MEDIUM — accuracy depends on comparable quality; London tech data is sparse.',
    accuracyLevel: 'medium',
    section: 'method',
  },

  real_options: {
    key: 'real_options',
    title: 'Real Options (CRR)',
    oneLiner: 'Value of embedded strategic optionality',
    plainEnglish:
      'Treats the company like a financial option: the RIGHT (not obligation) to invest more capital and expand, or to abandon and recover salvage value. Uses binomial tree mathematics from options pricing theory.',
    formula:
      'Cox-Ross-Rubinstein lattice. u=e^(σ√dt), d=1/u, p=(R−d)/(u−d). Expansion = Call (strike=Capex). Abandonment = Put (strike=Salvage). 80-step American exercise.',
    industryContext:
      'Goldman Sachs TMT, sophisticated PE firms, pharma/biotech pipeline valuation.',
    accuracyNote:
      'MEDIUM — more valuable for early-stage (high uncertainty = high option value).',
    accuracyLevel: 'medium',
    section: 'method',
  },

  strategic_adjustment: {
    key: 'strategic_adjustment',
    title: 'Strategic Adjustment',
    oneLiner: 'Qualitative overlay multiplier',
    plainEnglish:
      'Final adjustment that adds premiums for strong IP, London ecosystem fit, and management quality, while penalising for legal risk and founder dependency.',
    formula:
      '1 + (London × 10% + IP × 8% + Mgmt × 6% − Legal × 10% − Founder Risk × 8%)',
    industryContext:
      'Every deal team applies qualitative adjustments; this formalises the informal.',
    accuracyNote: 'MEDIUM — bounded to ±15% total impact.',
    accuracyLevel: 'medium',
    section: 'method',
  },

  // ── SECTION 3: Sensitivity Tab ────────────────────────────────────────
  // Alias keys so SensitivitySliders (which uses camelCase variable.key)
  // resolves the same glossary entries as the snake_case canonical keys.

  revenueGrowthShockPct: {
    key: 'revenueGrowthShockPct',
    title: 'Revenue Growth',
    oneLiner: 'What if growth is faster or slower',
    plainEnglish:
      'Adjusts the projected revenue growth rate up or down. Dragging right simulates faster growth (higher ARR next year); dragging left simulates a slowdown or contraction. Typically the #1 most impactful variable because every valuation method depends on revenue.',
    formula: null,
    industryContext:
      'Standard stress test in every PE due diligence process. Growth is the single biggest driver of venture valuations.',
    accuracyNote: 'Sensitivity measure — shows directional impact on enterprise value.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  multipleShockPct: {
    key: 'multipleShockPct',
    title: 'Multiple Compression / Expansion',
    oneLiner: 'What if the market re-prices your sector',
    plainEnglish:
      'Simulates the market valuing companies at higher or lower revenue/EBITDA multiples. Dragging left models a crash like 2022 (multiples halved); dragging right models a boom. Directly scales every multiple-based valuation method.',
    formula: null,
    industryContext: 'Directly models 2022-style multiple compression events. Multiples are set by public-market comps and deal activity.',
    accuracyNote: 'Sensitivity measure — shows directional impact on enterprise value.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  marginShockPct: {
    key: 'marginShockPct',
    title: 'Margin Change',
    oneLiner: 'What if profitability improves or deteriorates',
    plainEnglish:
      'Shifts EBITDA margin up or down. Dragging right models cost cuts or pricing power (more profit per pound of revenue); dragging left models rising costs or price competition. PE firms call margin expansion the primary value creation lever.',
    formula: null,
    industryContext:
      'PE firms model margin expansion as the primary post-acquisition value creation lever. SaaS benchmark: 20–30% EBITDA margin at scale.',
    accuracyNote: 'Sensitivity measure — shows directional impact on enterprise value.',
    accuracyLevel: 'medium',
    section: 'sensitivity',
  },

  discountRateShockPct: {
    key: 'discountRateShockPct',
    title: 'Discount Rate / WACC',
    oneLiner: 'What if interest rates or risk premiums change',
    plainEnglish:
      'Raises or lowers the discount rate used in DCF. Dragging right increases the rate (future cash flows are worth less today — e.g. Bank of England rate hike); dragging left decreases it. The most academically important variable in all of finance.',
    formula: null,
    industryContext:
      'Central to every DCF model. A 2% change in discount rate can swing a DCF valuation by 20–30%.',
    accuracyNote: 'Sensitivity measure — shows directional impact on enterprise value.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  strategicPremiumPct: {
    key: 'strategicPremiumPct',
    title: 'Strategic Premium',
    oneLiner: 'What if strategic value is higher or lower',
    plainEnglish:
      'Adjusts the premium a strategic acquirer would pay for synergies — cost savings, revenue expansion, or technology access. Only appears when buyer type is set to acquirer or strategic partner. Dragging right = more synergy value; left = less.',
    formula: null,
    industryContext:
      'Modelled in every strategic M&A deal. Typical strategic premium is 20–40% over standalone value.',
    accuracyNote: 'Sensitivity measure — shows directional impact on enterprise value.',
    accuracyLevel: 'medium',
    section: 'sensitivity',
  },

  // volatility: uses the existing 'volatility' key in the input section below
  // (no duplicate needed — GlossaryTooltip resolves the same key for both)

  tornado_chart: {
    key: 'tornado_chart',
    title: 'Sensitivity Analysis',
    oneLiner: 'Which assumptions swing the valuation most',
    plainEnglish:
      'Horizontal bars showing the impact of each variable. Top bar = biggest impact. Red = downside shock, Green = upside shock. Read top-to-bottom to see what matters most.',
    formula: null,
    industryContext:
      'Every IB pitch book includes a tornado; required by Big 4 in all formal valuations.',
    accuracyNote: 'Visualisation — accuracy depends on underlying model.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  revenue_growth_shock: {
    key: 'revenue_growth_shock',
    title: 'Revenue Growth',
    oneLiner: 'What if growth is faster or slower',
    plainEnglish:
      'If your company grew faster or slower than projected, how much would the total valuation change? Typically the #1 or #2 most impactful variable.',
    formula: null,
    industryContext:
      'Standard stress test in every PE due diligence process.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  multiple_shock: {
    key: 'multiple_shock',
    title: 'Multiple Compression/Expansion',
    oneLiner: 'What if the market re-prices your sector',
    plainEnglish:
      'If the market suddenly values companies at higher or lower multiples (like the 2022 tech crash), how much does your valuation move?',
    formula: null,
    industryContext: 'Directly models 2022-style multiple compression events.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  margin_shock: {
    key: 'margin_shock',
    title: 'Margin Change',
    oneLiner: 'What if profitability improves or deteriorates',
    plainEnglish:
      'If your EBITDA margin gets better or worse, how does the valuation respond? PE firms obsess over "margin expansion" stories.',
    formula: null,
    industryContext:
      'PE firms model margin expansion as primary value creation lever.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'medium',
    section: 'sensitivity',
  },

  discount_rate_shock: {
    key: 'discount_rate_shock',
    title: 'Discount Rate / WACC',
    oneLiner: 'What if interest rates or risk premiums change',
    plainEnglish:
      'If the Bank of England raises rates or your company becomes riskier, your future cash flows are worth less today. The most academically important variable in finance.',
    formula: null,
    industryContext:
      'Central to every DCF; the input most directly controlled by monetary policy.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'high',
    section: 'sensitivity',
  },

  strategic_premium_shock: {
    key: 'strategic_premium_shock',
    title: 'Strategic Premium',
    oneLiner: 'What if strategic value is higher or lower',
    plainEnglish:
      'For acquirer/strategic buyers: if synergies, market access, or technology value is higher or lower than estimated. Only relevant for strategic deal scenarios.',
    formula: null,
    industryContext:
      'Modelled in every strategic M&A; typically 20–40% premium over standalone.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'medium',
    section: 'sensitivity',
  },

  volatility_crr: {
    key: 'volatility_crr',
    title: 'Volatility (CRR)',
    oneLiner: 'Business uncertainty level',
    plainEnglish:
      'Counterintuitively, MORE uncertainty = HIGHER option value. If outcomes are more volatile, the "right to expand" becomes more valuable because the upside is bigger. From Black-Scholes theory.',
    formula: null,
    industryContext:
      'Volatility is the #1 driver of all option prices; used by every derivatives desk globally.',
    accuracyNote: 'Sensitivity measure — shows directional impact.',
    accuracyLevel: 'medium',
    section: 'sensitivity',
  },

  // ── SECTION 4: Monte Carlo Tab ────────────────────────────────────────

  mc_distribution: {
    key: 'mc_distribution',
    title: 'Monte Carlo Simulation',
    oneLiner: '5,000 possible valuation outcomes',
    plainEnglish:
      'Instead of giving one number, we run the valuation 5,000 times with random variations to show the full range of possible outcomes as a bell-curve histogram.',
    formula:
      '5,000 DCF simulations with normally-distributed shocks: growth σ=15%, margin σ=8%, WACC σ=2%',
    industryContext:
      'Standard in quant finance; used by every risk management desk and sophisticated PE firm.',
    accuracyNote: 'Statistical robustness increases with path count.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  mc_mean: {
    key: 'mc_mean',
    title: 'Mean',
    oneLiner: 'Mathematical average of all outcomes',
    plainEnglish:
      'The average across all 5,000 simulated outcomes. Can be skewed by extreme outliers.',
    formula: 'Sum of all outcomes / simulation count',
    industryContext:
      'Standard statistical measure; used alongside median for robustness.',
    accuracyNote: 'Can be pulled by outliers — compare with median.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  mc_median: {
    key: 'mc_median',
    title: 'Median (P50)',
    oneLiner: 'Middle outcome — 50% above, 50% below',
    plainEnglish:
      'The "middle" outcome — half the simulations come above, half below. More robust than mean for skewed distributions.',
    formula: 'Value at the 50th percentile of sorted outcomes',
    industryContext:
      'Preferred by risk managers for skewed distributions; less sensitive to extreme outliers.',
    accuracyNote: 'More robust than mean for asymmetric distributions.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  mc_p5: {
    key: 'mc_p5',
    title: 'P5 (5th Percentile)',
    oneLiner: 'Downside floor — only 5% of outcomes are worse',
    plainEnglish:
      'The "bad luck" threshold. 95% of all simulated futures produce a value ABOVE this number. Think of it as a realistic worst case.',
    formula: 'Value at the 5th percentile of sorted outcomes',
    industryContext:
      'Equivalent to VaR (Value at Risk) in banking; used to size insurance and reserves.',
    accuracyNote: 'Tail risk measure — useful for downside planning.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  mc_p95: {
    key: 'mc_p95',
    title: 'P95 (95th Percentile)',
    oneLiner: 'Upside ceiling — only 5% of outcomes are better',
    plainEnglish:
      'The "great news" threshold. Only 5% of simulated futures exceed this. Think of it as a realistic best case.',
    formula: 'Value at the 95th percentile of sorted outcomes',
    industryContext:
      'Used alongside P5 to define the 90% confidence interval; standard in risk reporting.',
    accuracyNote: 'Upper tail measure — useful for upside planning.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  mc_hybrid_mean: {
    key: 'mc_hybrid_mean',
    title: 'Hybrid Mean (MC+CRR)',
    oneLiner: 'Monte Carlo + real option overlay',
    plainEnglish:
      'Combines DCF simulation with option pricing: at each of the 5,000 simulated outcomes, we calculate and add the expansion option value. Shows how optionality boosts total value.',
    formula:
      'For each path: Hybrid = DCF Value + CRR Call Option Value evaluated at that DCF level',
    industryContext:
      'Cutting-edge approach combining two gold-standard techniques; used in pharma pipeline valuation.',
    accuracyNote: 'Depends on both MC and CRR model accuracy.',
    accuracyLevel: 'medium',
    section: 'montecarlo',
  },

  mc_option_uplift: {
    key: 'mc_option_uplift',
    title: 'Option Uplift %',
    oneLiner: 'How much optionality adds to base value',
    plainEnglish:
      'The percentage increase in average valuation when you account for the company\'s embedded right to expand. Higher for early-stage companies with more uncertainty.',
    formula: '(Hybrid Mean − Base Mean) / Base Mean × 100%',
    industryContext:
      'Quantifies optionality premium; particularly valuable for early-stage with high uncertainty.',
    accuracyNote: 'Derived metric — accuracy depends on both MC and CRR.',
    accuracyLevel: 'medium',
    section: 'montecarlo',
  },

  mc_paths_exercised: {
    key: 'mc_paths_exercised',
    title: 'Paths Exercised',
    oneLiner: '% of futures where expansion makes sense',
    plainEnglish:
      'In what percentage of simulated futures would the company actually exercise its expansion option — i.e., invest the capex because the payoff exceeds the cost.',
    formula: '(Paths with option value > 0) / total paths × 100%',
    industryContext:
      'Shows the probability-weighted likelihood of expansion being value-accretive.',
    accuracyNote: 'Higher percentage = more likely the option is "in the money".',
    accuracyLevel: 'medium',
    section: 'montecarlo',
  },

  mc_seed: {
    key: 'mc_seed',
    title: 'Simulation Seed',
    oneLiner: 'Reproducibility reference',
    plainEnglish:
      'The deterministic random seed used. Same seed = same random numbers = identical results. Provides an auditable trail — anyone can verify by re-running with this seed.',
    formula: 'Mulberry32 PRNG with stated 32-bit seed',
    industryContext:
      'Standard practice in quantitative finance for audit and reproducibility.',
    accuracyNote: 'Ensures deterministic reproduction of results.',
    accuracyLevel: 'high',
    section: 'montecarlo',
  },

  // ── SECTION 5: Real Options Tab ───────────────────────────────────────

  crr_binomial_tree: {
    key: 'crr_binomial_tree',
    title: 'CRR Binomial Tree',
    oneLiner: 'Visual lattice of option price evolution',
    plainEnglish:
      'A tree diagram showing how the company\'s value could evolve step-by-step (up or down at each node). Green nodes = where exercising the option is profitable.',
    formula:
      'Each node: price moves up by u=e^(σ√dt) or down by d=1/u. Risk-neutral probability p=(R−d)/(u−d)',
    industryContext:
      'Standard in every options pricing textbook; visual form used by Goldman Sachs TMT.',
    accuracyNote: 'Accuracy improves with more steps (we use 80).',
    accuracyLevel: 'high',
    section: 'realoptions',
  },

  expansion_option: {
    key: 'expansion_option',
    title: 'Expansion Option (Call)',
    oneLiner: 'Right to invest and grow',
    plainEnglish:
      'Like a call option on a stock: the RIGHT to invest additional capital (capex) to expand the business. Worth more when uncertainty is high because the potential upside is larger.',
    formula:
      'Call: max(0, Asset Price − Expansion Capex) with American early exercise via backward induction',
    industryContext:
      'Core concept in real options theory; applied to R&D investment, market expansion decisions.',
    accuracyNote: 'Depends on accurate volatility and capex estimates.',
    accuracyLevel: 'medium',
    section: 'realoptions',
  },

  abandonment_option: {
    key: 'abandonment_option',
    title: 'Abandonment Option (Put)',
    oneLiner: 'Right to walk away and recover salvage',
    plainEnglish:
      'Like a put option: the RIGHT to shut down the venture and recover salvage value if things go badly. Insurance against catastrophic downside.',
    formula:
      'Put: max(0, Salvage Value − Asset Price) with American early exercise',
    industryContext:
      'Valued by PE firms assessing downside protection in portfolio companies.',
    accuracyNote: 'Depends on realistic salvage value estimate.',
    accuracyLevel: 'medium',
    section: 'realoptions',
  },

  base_dcf_mean: {
    key: 'base_dcf_mean',
    title: 'Base DCF Mean',
    oneLiner: 'Average without option premium',
    plainEnglish:
      'The company\'s expected value using only DCF, before adding any embedded option value. The "without optionality" baseline.',
    formula: 'Average of all MC DCF paths (no CRR overlay)',
    industryContext:
      'Baseline comparison figure to quantify the value of embedded options.',
    accuracyNote: 'Standard DCF accuracy — depends on growth and WACC inputs.',
    accuracyLevel: 'medium',
    section: 'realoptions',
  },

  hybrid_crr_mean: {
    key: 'hybrid_crr_mean',
    title: 'Hybrid Mean (with CRR)',
    oneLiner: 'Average including option premium',
    plainEnglish:
      'Expected value AFTER adding the embedded expansion option value at every simulated path. The "with optionality" number.',
    formula: 'Average of (DCF + CRR option value) across all paths',
    industryContext:
      'The most complete valuation figure combining both discounted cash flows and real option value.',
    accuracyNote: 'Depends on both MC and CRR model accuracy.',
    accuracyLevel: 'medium',
    section: 'realoptions',
  },

  compound_option: {
    key: 'compound_option',
    title: 'Compound Option',
    oneLiner: 'Option-on-option for staged investments',
    plainEnglish:
      'For PE/acquirer buyers: Stage 1 investment (due diligence deposit, ~15% of value) buys the RIGHT to make Stage 2 investment (full acquisition, ~85%). Models multi-stage M&A decisions.',
    formula:
      'Outer: max(0, Inner Option Value − Stage 1 Cost). Inner: CRR call with underlying = asset value at outer expiry',
    industryContext:
      'Used in phased acquisitions, pharma pipeline development, and staged VC investments.',
    accuracyNote: 'Advanced model — sensitive to both stage parameters.',
    accuracyLevel: 'low',
    section: 'realoptions',
  },

  // ── SECTION 6: Scenarios Tab ──────────────────────────────────────────

  scenario_bull: {
    key: 'scenario_bull',
    title: 'Bull Case (20% probability)',
    oneLiner: 'Everything goes right',
    plainEnglish:
      'Best realistic scenario: growth exceeds projections, market multiples expand, margins improve. Shocks: +20–40% growth, +15–25% multiples, +5–8% margin.',
    formula: null,
    industryContext:
      'Standard in every IB pitch book; represents the upside case for investor presentations.',
    accuracyNote: 'Scenario — represents the optimistic but plausible end.',
    accuracyLevel: 'medium',
    section: 'scenarios',
  },

  scenario_base: {
    key: 'scenario_base',
    title: 'Base Case (60% probability)',
    oneLiner: 'Business as expected',
    plainEnglish:
      'Most likely outcome: company performs roughly in line with current projections. No significant positive or negative surprises. All shocks at 0%.',
    formula: null,
    industryContext:
      'The default assumption in all financial models; weighted at 60% in our probability weighting.',
    accuracyNote: 'Scenario — represents the most likely outcome.',
    accuracyLevel: 'high',
    section: 'scenarios',
  },

  scenario_bear: {
    key: 'scenario_bear',
    title: 'Bear Case (20% probability)',
    oneLiner: 'Challenges materialise',
    plainEnglish:
      'Pessimistic but plausible: growth stalls, market multiples compress, margins shrink. Shocks: −20–35% growth, −15–25% multiples, −5–8% margin.',
    formula: null,
    industryContext:
      'Required by risk committees; represents the downside for stress testing.',
    accuracyNote: 'Scenario — represents the pessimistic but plausible end.',
    accuracyLevel: 'medium',
    section: 'scenarios',
  },

  probability_weighted_ev: {
    key: 'probability_weighted_ev',
    title: 'Probability-Weighted EV',
    oneLiner: 'Single expected value blending all scenarios',
    plainEnglish:
      'Combines all scenarios into one number using their probabilities: 20% × Bear + 60% × Base + 20% × Bull. The "expected value" a rational investor would price at.',
    formula: '0.20 × Bear EV + 0.60 × Base EV + 0.20 × Bull EV',
    industryContext:
      'Standard expected value calculation; used by every institutional investor and valuation professional.',
    accuracyNote: 'Only as good as the individual scenario estimates.',
    accuracyLevel: 'medium',
    section: 'scenarios',
  },

  // ── SECTION 7: Negotiate Tab ──────────────────────────────────────────

  negotiation_range: {
    key: 'negotiation_range',
    title: 'Negotiation Range',
    oneLiner: 'The full corridor between walk-away and anchor',
    plainEnglish:
      'The total spread between your minimum acceptable price and your opening ask. A wider range gives more concession room but may signal uncertainty; a tighter range signals conviction.',
    formula: 'Anchor Price − Walk Away Price',
    industryContext:
      'Professional deal advisors typically target a range of 20-40% of the target price to allow for meaningful negotiation dynamics.',
    accuracyNote: 'Derived directly from the valuation band.',
    accuracyLevel: 'high',
    section: 'negotiate',
  },

  gap_to_target: {
    key: 'gap_to_target',
    title: 'Gap to Target',
    oneLiner: 'Distance from the floor to the realistic outcome',
    plainEnglish:
      'How much value sits between your walk-away floor and your target price. This is the "risk zone" — the amount of value you protect by not conceding below target.',
    formula: 'Target Price − Walk Away Price',
    industryContext:
      'If the gap is too narrow, you have little buffer before reaching your BATNA. Too wide suggests the walk-away may be too conservative.',
    accuracyNote: 'Simple arithmetic from the valuation band.',
    accuracyLevel: 'high',
    section: 'negotiate',
  },

  concession_room: {
    key: 'concession_room',
    title: 'Concession Room',
    oneLiner: 'How much you can concede and still hit target',
    plainEnglish:
      'The distance between your anchor (opening ask) and your target. This is your planned concession budget — the amount you can "give away" in negotiation while still achieving the desired outcome.',
    formula: 'Anchor Price − Target Price',
    industryContext:
      'Experienced negotiators plan 2-3 concession steps within this band, each smaller than the last, to signal approaching a limit.',
    accuracyNote: 'Simple arithmetic from the valuation band.',
    accuracyLevel: 'high',
    section: 'negotiate',
  },

  total_range: {
    key: 'total_range',
    title: 'Total Range',
    oneLiner: 'Full spread from floor to ceiling',
    plainEnglish:
      'The complete negotiation corridor from walk-away to anchor. This is the maximum possible deal size variation. Equals gap-to-target plus concession room.',
    formula: 'Anchor Price − Walk Away Price',
    industryContext:
      'The total range typically represents 1-2 standard deviations of the valuation distribution, reflecting genuine uncertainty in enterprise value.',
    accuracyNote: 'Derived directly from the valuation band.',
    accuracyLevel: 'high',
    section: 'negotiate',
  },

  walk_away: {
    key: 'walk_away',
    title: 'Walk Away Price',
    oneLiner: 'Minimum acceptable — deal-breaker below this',
    plainEnglish:
      'The floor. Below this price, the opportunity cost of continuing to grow independently exceeds the acquisition premium. Based on liquidation floor + 18 months of projected growth.',
    formula: null,
    industryContext:
      'Every M&A advisor sets a walk-away; this is the BATNA (Best Alternative To Negotiated Agreement) price.',
    accuracyNote: 'Conservative floor — based on downside methods.',
    accuracyLevel: 'medium',
    section: 'negotiate',
  },

  target_price: {
    key: 'target_price',
    title: 'Target Price',
    oneLiner: 'Realistic outcome — where deals close',
    plainEnglish:
      'The reconciled enterprise value across all methods. The price a rational buyer and seller would agree on in fair, arm\'s-length negotiations.',
    formula: null,
    industryContext:
      'The primary output of any valuation engagement; the number that appears in board presentations.',
    accuracyNote: 'Best estimate based on all available data and methods.',
    accuracyLevel: 'high',
    section: 'negotiate',
  },

  anchor_price: {
    key: 'anchor_price',
    title: 'Anchor Price',
    oneLiner: 'Opening ask — sets the negotiation frame',
    plainEnglish:
      'Top of the valuation range. Opens high to give room to concede toward target while still achieving a premium outcome. Anchoring bias is the most powerful negotiation tool.',
    formula: null,
    industryContext:
      'Anchoring is the most powerful cognitive bias in negotiations; used by every sophisticated seller.',
    accuracyNote: 'Strategic — intentionally above fair value.',
    accuracyLevel: 'medium',
    section: 'negotiate',
  },

  deal_room_sim: {
    key: 'deal_room_sim',
    title: 'Deal Room',
    oneLiner: 'AI-powered negotiation practice',
    plainEnglish:
      'Simulated negotiation environment. Practice responding to buyer challenges, test arguments, and refine pitch before entering real deal rooms.',
    formula: null,
    industryContext:
      'Mirrors real M&A deal room dynamics; practice tool for founders preparing for acquisition discussions.',
    accuracyNote: 'Simulation — not a prediction.',
    accuracyLevel: 'medium',
    section: 'negotiate',
  },

  acquisition_mirror: {
    key: 'acquisition_mirror',
    title: 'Acquisition Mirror',
    oneLiner: 'Buyer vs Seller valuation gap analysis',
    plainEnglish:
      'Shows the gap between seller\'s view and buyer\'s view. Overlap region = negotiation zone. Olivia provides the seller narrative; Cristiano provides the buyer critique.',
    formula: null,
    industryContext:
      'Gap analysis is central to every M&A negotiation; visualises the Zone of Possible Agreement (ZOPA).',
    accuracyNote: 'Depends on both buyer and seller perspective accuracy.',
    accuracyLevel: 'medium',
    section: 'negotiate',
  },

  // ── SECTION 8: Input Fields ───────────────────────────────────────────

  arr: {
    key: 'arr',
    title: 'ARR (Annual Recurring Revenue)',
    oneLiner: 'Predictable yearly subscription revenue',
    plainEnglish:
      'Revenue that contractually repeats every year from subscriptions. THE metric for SaaS. Not one-time sales — only recurring contracts.',
    formula: null,
    industryContext:
      'The #1 metric VCs ask about; drives 80%+ of SaaS company valuations.',
    accuracyNote: 'HIGH when from audited financials; self-reported can vary.',
    accuracyLevel: 'high',
    section: 'input',
  },

  gross_margin_pct: {
    key: 'gross_margin_pct',
    title: 'Gross Margin %',
    oneLiner: 'Revenue minus direct delivery costs',
    plainEnglish:
      'What percentage of each pound of revenue remains after paying for direct costs (hosting, COGS, support staff). NOT including sales/marketing/R&D.',
    formula: null,
    industryContext:
      'SaaS benchmark: 70–85%. Below 60% raises red flags with VCs.',
    accuracyNote: 'HIGH when from audited financials.',
    accuracyLevel: 'high',
    section: 'input',
  },

  ebitda_input: {
    key: 'ebitda_input',
    title: 'EBITDA',
    oneLiner: 'Operating profit before accounting entries',
    plainEnglish:
      'Earnings Before Interest, Tax, Depreciation, Amortisation. Shows raw cash-generating power of the business, stripping out accounting and financing decisions.',
    formula: null,
    industryContext:
      'The metric PE firms care about most; drives buyout pricing and debt capacity.',
    accuracyNote: 'HIGH when from audited financials.',
    accuracyLevel: 'high',
    section: 'input',
  },

  burn_monthly: {
    key: 'burn_monthly',
    title: 'Monthly Burn Rate',
    oneLiner: 'Cash consumed per month',
    plainEnglish:
      'How much cash the company spends above what it earns, per month. Represents the speed at which you\'re "burning" through your fundraise.',
    formula: null,
    industryContext:
      'VCs use this to calculate runway and assess funding urgency.',
    accuracyNote: 'HIGH when from bank statements; estimates can be off.',
    accuracyLevel: 'high',
    section: 'input',
  },

  runway_months: {
    key: 'runway_months',
    title: 'Runway (months)',
    oneLiner: 'Months until cash runs out',
    plainEnglish:
      'Cash on hand divided by monthly burn. Below 6 months = emergency. 9–12 = start fundraising. 18+ = comfortable.',
    formula: null,
    industryContext:
      '<9 months triggers "fire sale" risk discount in our model; <6 = crisis.',
    accuracyNote: 'Derived from cash and burn — accuracy depends on both.',
    accuracyLevel: 'high',
    section: 'input',
  },

  growth_yoy_pct: {
    key: 'growth_yoy_pct',
    title: 'YoY Growth %',
    oneLiner: 'Revenue growth vs same period last year',
    plainEnglish:
      'How much bigger is revenue this year compared to last year. The primary indicator of company trajectory and market demand.',
    formula: null,
    industryContext:
      'T2D3 framework for top-tier: triple, triple, double, double, double each year.',
    accuracyNote: 'HIGH when from audited financials.',
    accuracyLevel: 'high',
    section: 'input',
  },

  nrr_pct: {
    key: 'nrr_pct',
    title: 'NRR (Net Revenue Retention)',
    oneLiner: 'Revenue growth from existing customers only',
    plainEnglish:
      'If you kept zero new customers and only tracked existing ones: did revenue grow (upsells) or shrink (churn)? >100% = growing without new sales.',
    formula: null,
    industryContext:
      '>120% = best-in-class (Snowflake, Datadog). <95% = churn problem.',
    accuracyNote: 'Requires accurate cohort revenue tracking.',
    accuracyLevel: 'high',
    section: 'input',
  },

  churn_pct: {
    key: 'churn_pct',
    title: 'Annual Churn %',
    oneLiner: 'Customer loss rate per year',
    plainEnglish:
      'What percentage of customers cancel their subscription each year. The "leaky bucket" metric — high churn means growth is wasted replacing lost customers.',
    formula: null,
    industryContext:
      '<5% annual = excellent. 5–10% = acceptable. >10% = systemic problem requiring fix.',
    accuracyNote: 'HIGH when from subscription management system.',
    accuracyLevel: 'high',
    section: 'input',
  },

  customer_concentration_top3: {
    key: 'customer_concentration_top3',
    title: 'Customer Concentration (Top 3)',
    oneLiner: 'Revenue dependency on largest clients',
    plainEnglish:
      'What % of total revenue comes from your 3 biggest customers. Higher = more risk that losing one client devastates the business.',
    formula: null,
    industryContext:
      '>40% triggers penalty. >60% = serious M&A red flag requiring escrow or earn-out.',
    accuracyNote: 'HIGH when from revenue breakdown.',
    accuracyLevel: 'high',
    section: 'input',
  },

  cac_payback_months: {
    key: 'cac_payback_months',
    title: 'CAC Payback (months)',
    oneLiner: 'Time to recoup customer acquisition cost',
    plainEnglish:
      'How many months of revenue from a new customer it takes to recover what you spent acquiring them (ads, sales team, onboarding).',
    formula: null,
    industryContext:
      '<12 months = capital-efficient. 12–18 = acceptable. >24 = capital-intensive.',
    accuracyNote: 'Depends on accurate CAC and revenue attribution.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  ltv_to_cac: {
    key: 'ltv_to_cac',
    title: 'LTV:CAC Ratio',
    oneLiner: 'Customer value vs acquisition cost',
    plainEnglish:
      'For every £1 spent acquiring a customer, how much total lifetime revenue do they generate? The fundamental unit economics ratio.',
    formula: null,
    industryContext:
      '>3:1 = healthy and investable. <2:1 = may be burning cash to grow.',
    accuracyNote: 'Requires accurate LTV and CAC calculations.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  burn_multiple: {
    key: 'burn_multiple',
    title: 'Burn Multiple',
    oneLiner: 'Growth efficiency metric',
    plainEnglish:
      'Net Burn / Net New ARR. How many pounds you burn for each pound of new recurring revenue added. Lower = more efficient growth engine.',
    formula: null,
    industryContext:
      '<1× = elite (Notion, Figma). 1–2× = good. 2–3× = acceptable. >3× = inefficient.',
    accuracyNote: 'Derived from burn and new ARR — accuracy depends on both.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  tam: {
    key: 'tam',
    title: 'TAM (Total Addressable Market)',
    oneLiner: 'Global market ceiling',
    plainEnglish:
      'The total revenue if you captured 100% of your market worldwide. Sets the theoretical maximum. VCs need this >$1B for venture-scale returns.',
    formula: null,
    industryContext:
      'Required in every pitch deck; must exceed $1B for VC interest.',
    accuracyNote: 'Typically estimated — wide range of methodologies.',
    accuracyLevel: 'low',
    section: 'input',
  },

  sam: {
    key: 'sam',
    title: 'SAM (Serviceable Addressable Market)',
    oneLiner: 'Targetable market with current product',
    plainEnglish:
      'The portion of TAM you could realistically serve with your current product, pricing, and go-to-market. Should be >10× your current revenue.',
    formula: null,
    industryContext:
      'Used to validate growth runway — is there room to 10× from here?',
    accuracyNote: 'Estimated — depends on market segmentation methodology.',
    accuracyLevel: 'low',
    section: 'input',
  },

  som: {
    key: 'som',
    title: 'SOM (Serviceable Obtainable Market)',
    oneLiner: 'Capturable market in 3–5 years',
    plainEnglish:
      'The realistic portion you can win in 3–5 years given competition, sales capacity, and market dynamics. Most grounded market number.',
    formula: null,
    industryContext:
      'Best proxy for near-term revenue ceiling; investors use this for growth projections.',
    accuracyNote: 'Most grounded of the three market metrics.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  wacc: {
    key: 'wacc',
    title: 'WACC (Weighted Average Cost of Capital)',
    oneLiner: 'The discount rate for DCF',
    plainEnglish:
      'The blended rate representing how expensive capital is for the company. Combines cost of debt and cost of equity weighted by capital structure. THIS is the discount rate in DCF.',
    formula: null,
    industryContext:
      'Set by company stage in our model: Idea=50%, Pre-revenue=45%, MVP=40%, Growth=25%, Mature=15%. Based on CAPM.',
    accuracyNote: 'Stage-based proxy — more accurate for mature companies.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  volatility: {
    key: 'volatility',
    title: 'Volatility (sigma)',
    oneLiner: 'Annual value uncertainty',
    plainEnglish:
      'How wildly the company\'s value could swing in a year. Higher for risky early-stage companies, lower for established businesses. Counterintuitively, MORE volatility = HIGHER option value because the upside of the "right to expand" gets bigger. On the sensitivity slider, dragging right increases uncertainty; dragging left decreases it.',
    formula: null,
    industryContext:
      'Typical London tech: 35–60%. Drives ALL option calculations. Directly from Black-Scholes σ parameter.',
    accuracyNote: 'Estimated — true volatility is unobservable for private companies.',
    accuracyLevel: 'medium',
    section: 'input',
  },

  time_to_exit: {
    key: 'time_to_exit',
    title: 'Time to Exit (years)',
    oneLiner: 'Expected years until liquidity',
    plainEnglish:
      'How many years until IPO, acquisition, or other liquidity event. Drives VC method, option expiry, and compound option timing.',
    formula: null,
    industryContext:
      'Pre-revenue=5yr, Early=4yr, Growth=3yr, Scaleup=2yr in our model.',
    accuracyNote: 'Stage-based estimate — actual timing is unpredictable.',
    accuracyLevel: 'low',
    section: 'input',
  },

  // ── SECTION 9: Analysis — Match Vectors ─────────────────────────────

  vector_sector_alignment: {
    key: 'vector_sector_alignment',
    title: 'Sector Alignment',
    oneLiner: 'How closely their industry focus aligns with yours',
    plainEnglish:
      'Measures the overlap between your company\'s sectors and the entity\'s primary sector focus. A high score means they operate in the same markets, fund the same verticals, or accelerate companies in your space. A low score means they focus elsewhere — your pitch needs to explain the cross-sector opportunity.',
    formula: null,
    industryContext:
      'VCs and accelerators are highly sector-specific. Applying to a fintech fund with a healthtech startup wastes both parties\' time.',
    accuracyNote: 'Based on tagged sectors in the database — only as good as entity classification.',
    accuracyLevel: 'medium',
    section: 'analysis',
  },

  vector_strategic_fit: {
    key: 'vector_strategic_fit',
    title: 'Strategic Fit',
    oneLiner: 'How well their goals and capabilities complement yours',
    plainEnglish:
      'Evaluates whether this entity\'s strategic priorities — portfolio gaps, geographic expansion, technology needs, partnership models — align with what your company offers. High strategic fit means a natural partnership; low fit means the relationship would require significant justification.',
    formula: null,
    industryContext:
      'Strategic fit drives 70%+ of corporate partnership decisions and is the #1 predictor of successful accelerator outcomes.',
    accuracyNote: 'AI-assessed from entity profile data — quality depends on profile completeness.',
    accuracyLevel: 'medium',
    section: 'analysis',
  },

  vector_capital_fit: {
    key: 'vector_capital_fit',
    title: 'Capital Fit',
    oneLiner: 'Whether their funding capacity matches your needs',
    plainEnglish:
      'Compares your fundraising target, stage, and round size against what this entity typically invests. A VC that writes £500K cheques is a poor capital fit for a £10M Series B. Score reflects check size match, stage preference, and fund capacity.',
    formula: null,
    industryContext:
      'Mismatched capital fit is the #1 reason founders waste time on investor meetings that go nowhere.',
    accuracyNote: 'Based on known fund sizes and historical investment data.',
    accuracyLevel: 'medium',
    section: 'analysis',
  },

  vector_response_likelihood: {
    key: 'vector_response_likelihood',
    title: 'Response Likelihood',
    oneLiner: 'Likelihood they will engage based on their activity profile',
    plainEnglish:
      'Estimates the probability this entity will respond to your outreach, based on their recent activity level, how many companies they\'ve engaged with, whether they\'re actively deploying capital, and how accessible their team is. A dormant fund scores low; an actively investing one scores high.',
    formula: null,
    industryContext:
      'Response rates to cold outreach average 5–15% for VCs. Targeting active deployers improves this to 25–40%.',
    accuracyNote: 'Inferred from activity signals — not a guarantee of response.',
    accuracyLevel: 'low',
    section: 'analysis',
  },

  vector_valuation_synergy: {
    key: 'vector_valuation_synergy',
    title: 'Valuation Synergy Fit',
    oneLiner: 'Financial synergy strength — how much more your company is worth to this entity',
    plainEnglish:
      'Measures the financial premium this specific entity would pay for your company compared to a generic buyer. High synergy fit means they can extract cost savings, revenue expansion, or technology leverage that makes your company worth more to them than to the open market.',
    formula: null,
    industryContext:
      'Strategic acquirers typically pay 20–40% premiums over financial buyers due to synergy value.',
    accuracyNote: 'AI-estimated — actual synergies only validated during due diligence.',
    accuracyLevel: 'low',
    section: 'analysis',
  },

  // ── SECTION 10: Analysis — Valuation Synergy Metrics ────────────────

  annual_synergy_value: {
    key: 'annual_synergy_value',
    title: 'Annual Synergy Value',
    oneLiner: 'Projected yearly financial benefit of the partnership',
    plainEnglish:
      'The estimated annual financial value created if this entity acquires or deeply partners with your company. Includes cost savings (shared infrastructure, eliminated redundancy), revenue synergies (cross-selling, new market access), and technology leverage (IP integration, platform enhancement). This is annualised — the total expected yearly benefit, not a one-time figure.',
    formula: 'Cost Synergies + Revenue Synergies + Technology Leverage (per year)',
    industryContext:
      'M&A synergy estimates are notoriously optimistic — Harvard Business Review found 60%+ of projected synergies fail to materialise. Treat as directional, not precise.',
    accuracyNote: 'AI-estimated from entity profiles — directional only.',
    accuracyLevel: 'low',
    section: 'analysis',
  },

  synergy_realization: {
    key: 'synergy_realization',
    title: 'Synergy Realization Probability',
    oneLiner: 'Likelihood these synergies actually materialise',
    plainEnglish:
      'The probability that the projected synergies will be achieved in practice. Factors in integration complexity, cultural fit, management alignment, and historical success rates for similar deals. A 70% realization probability on £1M annual synergy means the risk-adjusted value is £700K per year.',
    formula: 'Risk-Adjusted Synergy = Annual Synergy × Realization Probability',
    industryContext:
      'Bain & Company data: only 35% of M&A deals achieve their projected synergies within 3 years. Higher probabilities indicate stronger structural alignment.',
    accuracyNote: 'AI-estimated — historical base rates suggest real-world achievement is lower.',
    accuracyLevel: 'low',
    section: 'analysis',
  },

  buyer_premium_pct: {
    key: 'buyer_premium_pct',
    title: 'Buyer Premium',
    oneLiner: 'Extra percentage this buyer would pay above market value',
    plainEnglish:
      'The percentage premium above your standalone valuation that this specific entity would pay to acquire you, driven by the synergies they can extract. A 25% buyer premium on a £10M standalone valuation means they\'d pay £12.5M. This premium exists because your company is worth MORE to this buyer than to the general market.',
    formula: 'Acquisition Price = Standalone EV × (1 + Buyer Premium %)',
    industryContext:
      'Typical strategic acquisition premiums: 20–40% (tech M&A), 15–25% (PE buyouts), 30–60% (competitive bidding). The premium compensates sellers for loss of independence.',
    accuracyNote: 'AI-estimated — actual premiums negotiated during deal process.',
    accuracyLevel: 'low',
    section: 'analysis',
  },

  // ── SECTION 11: Analysis — Market Position & Funding Rounds ─────────

  funding_stage: {
    key: 'funding_stage',
    title: 'Funding Stage',
    oneLiner: 'Current stage in the company lifecycle',
    plainEnglish:
      'Where this company sits in the standard startup funding journey. Each stage represents a different level of maturity, risk, and capital need. Bootstrapped = self-funded. Angel/Pre-Seed = earliest investors (£50K–£500K). Seed = product-market fit validation (£500K–£3M). Series A = proven traction, scaling (£3M–£15M). Series B = growth acceleration (£15M–£50M). Growth/Public = mature operations.',
    formula: null,
    industryContext:
      'Stage determines which investors are relevant, what multiples apply, and what metrics matter. A Series A company talking to seed investors wastes time.',
    accuracyNote: 'Based on publicly available funding data — may lag actual status.',
    accuracyLevel: 'high',
    section: 'analysis',
  },

  funding_rounds: {
    key: 'funding_rounds',
    title: 'Funding Rounds',
    oneLiner: 'Number of investment rounds completed',
    plainEnglish:
      'How many distinct fundraising events this entity has completed or participated in. For an investor, this indicates deployment activity and deal flow. For a startup, it shows financing history. More rounds with increasing sizes indicate healthy progression; many small rounds may indicate difficulty raising larger commitments.',
    formula: null,
    industryContext:
      'Average London tech startup does 3–4 rounds before exit. Investors deploying from active funds typically make 15–30 investments per fund.',
    accuracyNote: 'Based on tracked funding data — may not include undisclosed rounds.',
    accuracyLevel: 'medium',
    section: 'analysis',
  },
};

/** Look up a single glossary entry by key. Returns null if not found. */
export function getGlossary(key: string): FieldGlossaryEntry | null {
  return GLOSSARY[key] ?? null;
}

/** Get all glossary entries as a record. */
export function getAllGlossary(): Record<string, FieldGlossaryEntry> {
  return GLOSSARY;
}

/** Get all entries for a given section. */
export function getGlossaryBySection(
  section: FieldGlossaryEntry['section']
): FieldGlossaryEntry[] {
  return Object.values(GLOSSARY).filter((e) => e.section === section);
}

export default GLOSSARY;
