/**
 * PreparationStudio smoke — module-import only.
 *
 * Track B 8c chunk 3/3 exit criterion: the orchestrator + its full
 * import graph (27 ported LTM Studio component files) resolves
 * cleanly. Full mount-and-render is deferred to Track C UI rebuild
 * + 8d-routes-2 because it needs an OliviaProvider context + Document
 * data flowing through the real bridge, neither of which is wired
 * into the test setup today.
 *
 * This is the same smoke-test shape used by Track V's
 * ValuationWorkbench module-import smoke (32 tests) — proves the
 * import graph is intact end-to-end. Catches missing-export +
 * circular-import regressions immediately.
 */
import { describe, expect, it } from "vitest";

describe("Track B 8c · Studio v1 engine import smoke", () => {
  it("PreparationStudio imports without error", async () => {
    const mod = await import("../PreparationStudio");
    expect(mod.PreparationStudio).toBeDefined();
    expect(typeof mod.PreparationStudio).toBe("function");
  });

  it("StudioTopBar + StudioBottomBar import without error", async () => {
    const top = await import("../StudioTopBar");
    const bot = await import("../StudioBottomBar");
    expect(top.StudioTopBar).toBeDefined();
    expect(bot.StudioBottomBar).toBeDefined();
  });

  it("StudioOliviaAvatar + StudioOliviaChat import without error", async () => {
    const avatar = await import("../StudioOliviaAvatar");
    const chat = await import("../StudioOliviaChat");
    expect(avatar.StudioOliviaAvatar).toBeDefined();
    expect(chat.StudioOliviaChat).toBeDefined();
  });

  it("StudioQuestionCard imports without error", async () => {
    const mod = await import("../StudioQuestionCard");
    expect(mod.StudioQuestionCard).toBeDefined();
  });

  it("StudioAnswerEditor exports the editor + the inline-format helpers", async () => {
    const mod = await import("../StudioAnswerEditor");
    expect(mod.StudioAnswerEditor).toBeDefined();
    expect(typeof mod.applyInlineFormat).toBe("function");
    expect(typeof mod.insertTextAtPosition).toBe("function");
  });

  it("StudioFormattingToolbar imports without error", async () => {
    const mod = await import("../StudioFormattingToolbar");
    expect(mod.StudioFormattingToolbar).toBeDefined();
  });

  it("PitchPolishModal + SuggestionChips + WhyThisPanel import", async () => {
    const polish = await import("../PitchPolishModal");
    const chips = await import("../SuggestionChips");
    const why = await import("../WhyThisPanel");
    expect(polish.PitchPolishModal).toBeDefined();
    expect(chips.SuggestionChips).toBeDefined();
    expect(why.WhyThisPanel).toBeDefined();
  });

  it("DeepResearchPanel + ResearchHistory import", async () => {
    const panel = await import("../DeepResearchPanel");
    const history = await import("../ResearchHistory");
    expect(panel.DeepResearchPanel).toBeDefined();
    expect(history.ResearchHistory).toBeDefined();
  });

  it("EntityBriefCard + EntityPerspectiveModal import", async () => {
    const card = await import("../EntityBriefCard");
    const modal = await import("../EntityPerspectiveModal");
    expect(card.EntityBriefCard).toBeDefined();
    expect(modal.EntityPerspectiveModal).toBeDefined();
  });

  it("MicroReward + SkipNudgeModal + CompletionCeremony + DocumentTransition import", async () => {
    const reward = await import("../MicroReward");
    const skip = await import("../SkipNudgeModal");
    const ceremony = await import("../CompletionCeremony");
    const trans = await import("../DocumentTransition");
    expect(reward.MicroReward).toBeDefined();
    expect(skip.SkipNudgeModal).toBeDefined();
    expect(ceremony.CompletionCeremony).toBeDefined();
    expect(trans.DocumentTransition).toBeDefined();
  });

  it("PreSubmitCheck + CristianoReEvaluation + AnswerRibbon + StoryReview import", async () => {
    const pre = await import("../PreSubmitCheck");
    const cri = await import("../CristianoReEvaluation");
    const rib = await import("../AnswerRibbon");
    const story = await import("../StoryReview");
    expect(pre.PreSubmitCheck).toBeDefined();
    expect(cri.CristianoReEvaluation).toBeDefined();
    expect(rib.AnswerRibbon).toBeDefined();
    expect(story.StoryReview).toBeDefined();
  });

  it("StudioTTSPlayer + StudioVoiceInput + StudioVoiceCommands import", async () => {
    const tts = await import("../StudioTTSPlayer");
    const voice = await import("../StudioVoiceInput");
    const cmd = await import("../StudioVoiceCommands");
    expect(tts.StudioTTSPlayer).toBeDefined();
    expect(voice.StudioVoiceInput).toBeDefined();
    expect(typeof cmd.useVoiceCommands).toBe("function");
  });

  it("useStudioKeyboardShortcuts hook imports as a function", async () => {
    const mod = await import("../StudioKeyboardShortcuts");
    expect(typeof mod.useStudioKeyboardShortcuts).toBe("function");
  });

  it("the /studio/[id] route page imports without error", async () => {
    const page = await import("@/app/studio/[id]/page");
    expect(page.default).toBeDefined();
    expect(typeof page.default).toBe("function");
  });
});
