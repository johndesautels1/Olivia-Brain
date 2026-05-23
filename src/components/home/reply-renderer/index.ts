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
export {
  GammaCard,
  parseGammaSpec,
  type GammaCardProps,
  type GammaCardSpec,
  type GammaCardParseResult,
} from "./GammaCard";
export {
  CitationStrip,
  parseCitations,
  type CitationStripProps,
  type Citation,
  type CitationsParseResult,
} from "./CitationStrip";
export {
  TimelineFromSpec,
  parseTimelineSpec,
  type TimelineFromSpecProps,
  type TimelineEntry,
  type TimelineParseResult,
} from "./TimelineFromSpec";
export {
  MapManifest,
  type MapManifestProps,
} from "./MapManifest";
export {
  parseMapSpec,
  resolvePinColor,
  defaultPitchForKind,
  defaultZoomForKind,
  type MapSpec,
  type MapPin,
  type MapKind,
  type MapColorToken,
  type MapParseResult,
} from "./map-spec";
export {
  UIManifest,
  type UIManifestProps,
} from "./UIManifest";
export {
  parseUISpec,
  clampProgress,
  resolveTokenColor,
  resolveTokenMute,
  resolveTone,
  type UISpec,
  type UIComponent,
  type UICard,
  type UIStat,
  type UIProgress,
  type UIButton,
  type UIColorToken,
  type UITone,
  type UIParseResult,
} from "./ui-spec";
export {
  ComparisonView,
  type ComparisonViewProps,
} from "./ComparisonView";
export {
  parseComparisonSpec,
  resolveColumnAccent,
  MIN_COLUMNS,
  MAX_COLUMNS,
  type ComparisonSpec,
  type ComparisonColumn,
  type ComparisonColorToken,
  type ComparisonParseResult,
} from "./comparison-spec";
