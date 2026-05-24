/**
 * `law-5-agent-data-sources-guard` -- regression guard for the
 * Architecture Standards Law 5 metadata contract.
 *
 * # What Law 5 says
 *
 * Per `~/CLAUDE.md` verbatim:
 *
 *   > Agents declare data dependencies via strict-typed `dataSources`
 *   > metadata in `registry.ts`; CI validates against AST.
 *
 * # What this guard enforces (today)
 *
 * The **first half** of Law 5 at the data-presence level: every entry
 * of `AGENT_DEFINITIONS` ships with a non-empty `dataSources` array
 * whose elements are non-empty trimmed strings.
 *
 * A new agent that lands with `dataSources: []` (or any whitespace-
 * only / non-string entry) fails this test on push. The audit at
 * `docs/07_ARCHITECTURE_LAW_5_AUDIT.md § 2.2` verified that all 141
 * agents in the current registry populate the field non-emptily, so
 * the lock-in here is the floor that already holds.
 *
 * # What this guard does NOT enforce (yet)
 *
 * The **second half** of Law 5 ("strict-typed against a canonical
 * enumeration; CI validates against AST") is deferred behind a
 * founder-gated synonym-collapse pass — `user_input` vs `user_query`
 * vs `user_message` semantically refer to the same dependency but
 * are three distinct strings the compiler treats as unrelated. Audit
 * `docs/07_ARCHITECTURE_LAW_5_AUDIT.md § 5 Phase 1+2` calls out the
 * needed sequencing: build the dedup'd enumeration, founder approves
 * canonical names, then this guard upgrades to enumeration-membership
 * checks. Until that lands, the loose `string[]` type plus the
 * non-emptiness invariant is the floor.
 *
 * # Why a runtime import rather than a source-scan
 *
 * Mirrors the audit's § 4.3 recommended pattern: `AGENT_DEFINITIONS`
 * is a pure TypeScript constant with no side effects, so importing
 * it at test time gives strongly-typed iteration with zero file-I/O
 * cost. The compiler's `AgentDefinition` shape catches drift on the
 * type side; this test catches drift on the data side.
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { describe, expect, it } from "vitest";

import { AGENT_DEFINITIONS } from "@/lib/agents/registry";

describe("Law 5 -- AgentDefinition.dataSources non-empty contract", () => {
  it("every agent declares at least one data dependency (non-empty dataSources array)", () => {
    const empties = AGENT_DEFINITIONS.filter(
      (a) => a.dataSources.length === 0,
    ).map((a) => a.agentId);

    if (empties.length > 0) {
      const msg = empties.map((id) => `  ${id}`).join("\n");
      throw new Error(
        `${empties.length} agent(s) ship with an empty dataSources array, ` +
          `violating Architecture Standards Law 5 first clause ` +
          `(\"declare data dependencies via dataSources metadata\"):\n${msg}\n\n` +
          `Fix: in src/lib/agents/registry.ts, add at least one ` +
          `dataSource string to each listed agent. The audit at ` +
          `docs/07_ARCHITECTURE_LAW_5_AUDIT.md § 2.2 enumerates the ` +
          `existing per-agent dependency surface so new entries can ` +
          `pick a consistent name (e.g. "user_input", ` +
          `"conversation_history", "crm_data"). Once a DATA_SOURCES ` +
          `enumeration lands per § 5 Phase 1+2, the names become ` +
          `compiler-checked.`,
      );
    }
    expect(empties).toEqual([]);
  });

  it("every dataSources entry is a non-empty trimmed string (catches \"\" / \"  \" / non-string drift)", () => {
    const offenders: { agentId: string; index: number; raw: string }[] = [];
    for (const agent of AGENT_DEFINITIONS) {
      for (let i = 0; i < agent.dataSources.length; i += 1) {
        const src = agent.dataSources[i];
        if (typeof src !== "string" || src.trim().length === 0) {
          offenders.push({
            agentId: agent.agentId,
            index: i,
            raw: JSON.stringify(src),
          });
        }
      }
    }

    if (offenders.length > 0) {
      const msg = offenders
        .map((o) => `  ${o.agentId}.dataSources[${o.index}] = ${o.raw}`)
        .join("\n");
      throw new Error(
        `${offenders.length} dataSources entry/entries are not a non-empty ` +
          `trimmed string, violating Law 5 first clause:\n${msg}\n\n` +
          `Fix: replace the offending entries with a meaningful string ` +
          `naming the data dependency (e.g. "user_input", ` +
          `"conversation_history"). Avoid empty strings, whitespace-only ` +
          `strings, null / undefined entries.`,
      );
    }
    expect(offenders).toEqual([]);
  });
});

describe("Law 5 guard -- surface coverage telemetry", () => {
  it("scans the expected order-of-magnitude number of agents", () => {
    /* The current registry holds 141 agents per the audit. The lower
     * bound here (100) leaves headroom for legitimate removals while
     * still catching accidental array truncation (e.g. a stray edit
     * that wipes most rows). If the floor needs lowering legitimately,
     * update this number in the same PR. */
    expect(AGENT_DEFINITIONS.length).toBeGreaterThanOrEqual(100);
  });

  it("every agent declares a non-empty agentId (precondition for diff-able failure output)", () => {
    /* Defense in depth: the assertions above print `agentId` to point
     * the maintainer at the offending row. If agentId itself is empty,
     * those messages lose their pointer. Catch that upstream. */
    const bad = AGENT_DEFINITIONS.filter(
      (a) => typeof a.agentId !== "string" || a.agentId.trim().length === 0,
    );
    expect(bad).toEqual([]);
  });
});
