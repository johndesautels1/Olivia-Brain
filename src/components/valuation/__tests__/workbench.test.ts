// V8 smoke test — confirms the ValuationWorkbench module + every zone
// component imports cleanly. Visual rendering is verified manually
// against `/analysis/valuation`. Full structural render assertions land
// alongside the WarRoom suite in V9.

import { describe, it, expect } from "vitest";

const v8Modules = [
  "ValuationWorkbench",
  "HeaderSection",
  "MethodStackPanel",
  "ValuationBridge",
  "ChartCard",
  "KpiCards",
  "OliviaNarrative",
  "RiskOpportunityPanel",
  "RiskMatrix",
  "PreMortemPanel",
  "EvidenceRoom",
  "DocumentHeatmap",
  "ComparableFingerprint",
  "CohortBenchmark",
  "MonteCarloHistogram",
  "BinomialTreeViz",
  "ScenarioDial",
  "ScenarioComparison",
  "SensitivitySliders",
  "TornadoChart",
  "ValuationLetter",
  "ExportPanel",
  "ValuationTimeline",
  "DataLineageSankey",
  "CascadeStatusBar",
  "CompanyIntelligenceNexus",
  "CommandPalette",
  "ProvenanceChip",
  "WhatChangedDiff",
  "GlossaryTooltip",
  "DraggableGrid",
];

describe("V8 ValuationWorkbench — module import smoke", () => {
  for (const name of v8Modules) {
    // ValuationWorkbench transitively imports the entire valuation/* tree
    // (V8 zones + V9 War Room family); cold transform on Windows can exceed
    // the 15s global. Other modules stay on the global timeout.
    const timeout = name === "ValuationWorkbench" ? 60_000 : undefined;
    it(`${name} imports without error`, async () => {
      const mod = await import(`@/components/valuation/${name}`);
      expect(mod).toBeDefined();
    }, timeout);
  }

  it("motion barrel exports primitives", async () => {
    const mod = await import("@/components/valuation/motion");
    expect(mod).toBeDefined();
  });
});
