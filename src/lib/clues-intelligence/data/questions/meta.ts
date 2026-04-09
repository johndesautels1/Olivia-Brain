import type { ResponseTypeMeta } from './types';

// CLUES Question Library — Metadata and response type definitions
// Split from questionLibrary.ts

export const LIBRARY_META = {
  project: "CLUES Intelligence",
  description: "All review module questions with structured response types for UI modal design",
  totalModules: 26,
  totalQuestions: 2500,
  moduleStructure: "23 category modules × 100 questions each (10 sections × 10 questions) + Main Module (100Q: 34 Demographics + 33 DNW + 33 Must Haves) + General Questions (50Q) + Trade-off Questions (50Q) = 2,500 total questions",
  brand: {
  "darkBackground": "#0a0e1a",
  "cardBackground": "#111827",
  "goldAccent": "#C4A87A",
  "sapphireAccent": "#3b82f6",
  "textPrimary": "#f9fafb",
  "textSecondary": "#9ca3af",
  "textMuted": "#8b95a5",
  "orangeAccent": "#f97316"
},
} as const;

export const RESPONSE_TYPES: Record<string, ResponseTypeMeta> = {
  "Likert-Importance": {
    "scale": "1-5",
    "labels": [
      "Not Important",
      "Slightly Important",
      "Moderately Important",
      "Very Important",
      "Essential"
    ],
    "component": "RadioGroup or StarRating"
  },
  "Likert-Concern": {
    "scale": "1-5",
    "labels": [
      "Not Concerned",
      "Slightly Concerned",
      "Moderately Concerned",
      "Very Concerned",
      "Extremely Concerned"
    ],
    "component": "RadioGroup"
  },
  "Likert-Comfort": {
    "scale": "1-5",
    "labels": [
      "Very Uncomfortable",
      "Uncomfortable",
      "Neutral",
      "Comfortable",
      "Very Comfortable"
    ],
    "component": "RadioGroup"
  },
  "Likert-Willingness": {
    "scale": "1-5",
    "labels": [
      "Not Willing",
      "Slightly Willing",
      "Moderately Willing",
      "Very Willing",
      "Completely Willing"
    ],
    "component": "RadioGroup"
  },
  "Likert-Frequency": {
    "scale": "1-5",
    "labels": [
      "Never",
      "Rarely",
      "Sometimes",
      "Often",
      "Very Frequently"
    ],
    "component": "RadioGroup"
  },
  "Likert-Satisfaction": {
    "scale": "1-5",
    "labels": [
      "Very Dissatisfied",
      "Dissatisfied",
      "Neutral",
      "Satisfied",
      "Very Satisfied"
    ],
    "component": "RadioGroup"
  },
  "Likert-Agreement": {
    "scale": "1-5",
    "labels": [
      "Strongly Disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly Agree"
    ],
    "component": "RadioGroup"
  },
  "Multi-select": {
    "description": "Checkbox list, multiple selections allowed",
    "component": "CheckboxGroup"
  },
  "Single-select": {
    "description": "Radio button list, one selection only",
    "component": "RadioGroup"
  },
  "Yes/No": {
    "description": "Binary toggle",
    "component": "Toggle or RadioGroup"
  },
  "Range": {
    "description": "Numeric range slider with min/max",
    "component": "RangeSlider"
  },
  "Slider": {
    "description": "Continuous slider 0-100 or contextual scale",
    "component": "Slider"
  },
  "Ranking": {
    "description": "Drag-to-reorder list of 5-10 items",
    "component": "DragToRank"
  },
  "Dealbreaker": {
    "scale": "1-5",
    "labels": [
      "Mild Preference to Avoid",
      "Would Rather Avoid",
      "Significant Concern",
      "Strong Aversion",
      "Absolute Deal-Breaker"
    ],
    "component": "RadioGroup with red gradient"
  },
  "Open-text": {
    "description": "Free text input, multi-line",
    "component": "Textarea"
  },
  "Text": {
    "description": "Free text input, multi-line",
    "component": "Textarea"
  },
  // ─── Scales (1-5 or 1-10) ────────────────────────────────────
  "Comfort scale": {
    "scale": "1-5",
    "labels": ["Very Uncomfortable", "Uncomfortable", "Neutral", "Comfortable", "Very Comfortable"],
    "component": "RadioGroup"
  },
  "Concern scale": {
    "scale": "1-5",
    "labels": ["Not Concerned", "Slightly Concerned", "Moderately Concerned", "Very Concerned", "Extremely Concerned"],
    "component": "RadioGroup"
  },
  "Confidence scale": {
    "scale": "1-5",
    "labels": ["Not Confident", "Slightly Confident", "Moderately Confident", "Very Confident", "Extremely Confident"],
    "component": "RadioGroup"
  },
  "Impact scale": {
    "scale": "1-5",
    "labels": ["No Impact", "Minor Impact", "Moderate Impact", "Significant Impact", "Major Impact"],
    "component": "RadioGroup"
  },
  "Attachment scale": {
    "scale": "1-5",
    "labels": ["Not Attached", "Slightly Attached", "Moderately Attached", "Very Attached", "Deeply Attached"],
    "component": "RadioGroup"
  },
  "Dependency scale": {
    "scale": "1-5",
    "labels": ["Not Dependent", "Slightly Dependent", "Moderately Dependent", "Very Dependent", "Completely Dependent"],
    "component": "RadioGroup"
  },
  "Difficulty scale": {
    "scale": "1-5",
    "labels": ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
    "component": "RadioGroup"
  },
  "Frustration scale": {
    "scale": "1-5",
    "labels": ["Not Frustrated", "Mildly Frustrated", "Moderately Frustrated", "Very Frustrated", "Extremely Frustrated"],
    "component": "RadioGroup"
  },
  "Proficiency scale": {
    "scale": "1-5",
    "labels": ["None", "Basic", "Intermediate", "Advanced", "Native/Expert"],
    "component": "RadioGroup"
  },
  "Sensitivity scale": {
    "scale": "1-5",
    "labels": ["Not Sensitive", "Slightly Sensitive", "Moderately Sensitive", "Very Sensitive", "Extremely Sensitive"],
    "component": "RadioGroup"
  },
  "Tolerance scale": {
    "scale": "1-5",
    "labels": ["Very Intolerant", "Somewhat Intolerant", "Neutral", "Somewhat Tolerant", "Very Tolerant"],
    "component": "RadioGroup"
  },
  "Priority rating": {
    "scale": "1-5",
    "labels": ["Not a Priority", "Low Priority", "Medium Priority", "High Priority", "Top Priority"],
    "component": "RadioGroup"
  },
  // ─── Range inputs ────────────────────────────────────────────
  "Temperature range": {
    "description": "Temperature range selector (°C or °F)",
    "component": "RangeSlider"
  },
  "Temperature threshold": {
    "description": "Maximum/minimum temperature threshold",
    "component": "RangeSlider"
  },
  "Humidity range": {
    "description": "Humidity percentage range",
    "component": "RangeSlider"
  },
  "AQI range": {
    "description": "Air Quality Index range",
    "component": "RangeSlider"
  },
  "Speed range": {
    "description": "Speed range (Mbps, km/h, etc.)",
    "component": "RangeSlider"
  },
  "Budget range": {
    "description": "Budget/cost range in currency",
    "component": "RangeSlider"
  },
  "Budget %": {
    "description": "Budget percentage allocation",
    "component": "RangeSlider"
  },
  "Amount range": {
    "description": "Numeric amount range",
    "component": "RangeSlider"
  },
  "Percentage range": {
    "description": "Percentage range 0-100%",
    "component": "RangeSlider"
  },
  "Duration range": {
    "description": "Duration/time period range",
    "component": "RangeSlider"
  },
  "Frequency range": {
    "description": "Frequency range (times per week/month)",
    "component": "RangeSlider"
  },
  "Time range": {
    "description": "Time-of-day or duration range",
    "component": "RangeSlider"
  },
  "Tolerance range": {
    "description": "Numeric tolerance threshold range",
    "component": "RangeSlider"
  },
  // ─── Yes/No variants ─────────────────────────────────────────
  "Yes/No/Maybe": {
    "description": "Ternary: Yes, No, Maybe/Unsure",
    "component": "RadioGroup"
  },
  "Yes/No/In progress": {
    "description": "Ternary: Yes, No, In Progress",
    "component": "RadioGroup"
  },
  "Yes/No + details": {
    "description": "Binary toggle with conditional text input for details",
    "component": "Toggle + Textarea"
  },
  "Yes/No + concern": {
    "description": "Binary toggle with conditional concern level",
    "component": "Toggle + RadioGroup"
  },
  "Yes/No + conditions": {
    "description": "Binary toggle with conditional multi-select conditions",
    "component": "Toggle + CheckboxGroup"
  },
  "Yes/No + frequency": {
    "description": "Binary toggle with conditional frequency selector",
    "component": "Toggle + RadioGroup"
  },
  "Yes/No + hobbies": {
    "description": "Binary toggle with conditional hobby multi-select",
    "component": "Toggle + CheckboxGroup"
  },
  "Yes/No + language": {
    "description": "Binary toggle with conditional language input",
    "component": "Toggle + Textarea"
  },
  "Yes/No + range": {
    "description": "Binary toggle with conditional range slider",
    "component": "Toggle + RangeSlider"
  },
  "Yes/No + specialties": {
    "description": "Binary toggle with conditional specialty multi-select",
    "component": "Toggle + CheckboxGroup"
  },
  "Yes/No + sports": {
    "description": "Binary toggle with conditional sports multi-select",
    "component": "Toggle + CheckboxGroup"
  },
  "Yes/No + type": {
    "description": "Binary toggle with conditional type selection",
    "component": "Toggle + RadioGroup"
  },
  // ─── Other input types ───────────────────────────────────────
  "Multi-select dealbreaker": {
    "description": "Checkbox list for dealbreaker categories",
    "component": "CheckboxGroup"
  },
  "Number": {
    "description": "Numeric input field",
    "component": "NumberInput"
  },
  "Number + age ranges": {
    "description": "Numeric count with age range sub-inputs",
    "component": "NumberInput + RangeSlider"
  },
  "Time preference": {
    "description": "Time-of-day or schedule preference selector",
    "component": "RadioGroup"
  },
  "Preference + duration": {
    "description": "Preference selection with duration qualifier",
    "component": "RadioGroup + RangeSlider"
  },
  // ─── Aliases (normalized keys) ───────────────────────────────
  "Open text": {
    "description": "Free text input, multi-line",
    "component": "Textarea"
  },
  "Single select": {
    "description": "Radio button list, one selection only",
    "component": "RadioGroup"
  }
};
