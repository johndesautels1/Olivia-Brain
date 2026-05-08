/**
 * `reply-renderer` — Track N Sessions N1+N3.
 *
 * Markdown + chart manifestation for Olivia replies. Used by:
 *   - `HomeHero` (lastReply blockquote)
 *   - any future surface that needs to render an LLM reply with
 *     inline charts / tables / formatted text
 *
 * Future N-track work (mermaid diagrams, generative UI, 3D scenes,
 * Gamma deck preview cards) will mount here as additional code-fence
 * languages.
 */

export { MarkdownReply, type MarkdownReplyProps } from "./MarkdownReply";
export { ChartFromSpec, type ChartFromSpecProps } from "./ChartFromSpec";
export {
  parseChartSpec,
  resolveSeriesColor,
  type ChartSpec,
  type ChartSeries,
  type ChartType,
  type ChartColorToken,
  type ChartParseResult,
} from "./chart-spec";
