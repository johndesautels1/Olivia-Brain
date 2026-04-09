import type { QuestionModule } from './types';

// General Questions — 50 questions
// Module ID: general_questions

export const generalQuestionsQuestions: QuestionModule = {
  "moduleId": "general_questions",
  "moduleName": "General Questions",
  "fileName": "GENERAL_QUESTIONS_REFERENCE.md",
  "structure": "",
  "totalQuestions": 50,
  "sections": [
    {
      "title": "Household & Decision Dynamics",
      "questionRange": "Q1-Q5",
      "questions": [
        {
          "number": 1,
          "question": "Who is the primary decision-maker for this relocation? (Select one: myself alone, myself and partner equally, primarily my partner, family consensus, other)",
          "type": "Single-select",
          "modules": ["family_children"]
        },
        {
          "number": 2,
          "question": "How aligned is your partner/household on relocation priorities?",
          "type": "Slider",
          "sliderLeft": "Not at all aligned",
          "sliderRight": "Perfectly aligned",
          "modules": ["family_children"]
        },
        {
          "number": 3,
          "question": "What regions, countries, or cities are you most drawn to — and which have you already visited or lived in?",
          "type": "Text",
          "modules": ["climate_weather", "cultural_heritage_traditions"]
        },
        {
          "number": 4,
          "question": "Do you have family obligations that affect where you can relocate?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 5,
          "question": "What type of family obligations do you have, and how often must you travel for them?",
          "type": "Text",
          "modules": ["family_children", "transportation_mobility"]
        }
      ]
    },
    {
      "title": "Personality & Psychology",
      "questionRange": "Q6-Q12",
      "questions": [
        {
          "number": 6,
          "question": "How do you approach risk in life decisions? (Select one: very cautious, somewhat cautious, balanced, somewhat adventurous, very adventurous)",
          "type": "Single-select",
          "modules": ["general_questions"]
        },
        {
          "number": 7,
          "question": "How do you handle uncertainty and change? (Select one: need stability, prefer predictability, adaptable, thrive on change, seek disruption)",
          "type": "Single-select",
          "modules": ["general_questions"]
        },
        {
          "number": 8,
          "question": "What is the PRIMARY reason driving your relocation? (Select one: career opportunity, lifestyle change, retirement, cost savings, family reunification, escape/fresh start, adventure, relationship, health/climate, safety, political instability, religious/cultural freedom, education, tax optimization, digital nomad lifestyle, other)",
          "type": "Single-select",
          "modules": ["professional_career", "financial_banking", "family_children", "safety_security", "climate_weather"]
        },
        {
          "number": 9,
          "question": "What is your overall risk tolerance for major life changes?",
          "type": "Slider",
          "sliderLeft": "Very risk-averse",
          "sliderRight": "Very risk-tolerant",
          "modules": ["general_questions"]
        },
        {
          "number": 10,
          "question": "What is your openness to lifestyle experimentation?",
          "type": "Slider",
          "sliderLeft": "Not open at all",
          "sliderRight": "Completely open",
          "modules": ["general_questions"]
        },
        {
          "number": 11,
          "question": "What pace of life do you prefer? (Select one: very slow/relaxed, slow/easygoing, moderate, fast-paced, intense/high-energy)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 12,
          "question": "What is your preferred social style? (Select one: mostly solitary, small intimate circle, moderate social life, very social/outgoing, extroverted/always connecting)",
          "type": "Single-select",
          "modules": ["entertainment_nightlife", "neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Readiness & Key Priorities",
      "questionRange": "Q13-Q17",
      "questions": [
        {
          "number": 13,
          "question": "What is your international living experience? (Select one: never lived abroad, short stays only <6 months, lived abroad 1-3 years, lived abroad 3+ years, serial expat/multiple countries)",
          "type": "Single-select",
          "modules": ["cultural_heritage_traditions", "legal_immigration"]
        },
        {
          "number": 14,
          "question": "How important is your religious or spiritual practice to your daily life?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 15,
          "question": "If you could split your monthly budget any way you wanted, what percentage would go to housing, food, entertainment, travel, savings, and healthcare?",
          "type": "Text",
          "modules": ["financial_banking", "housing_property", "food_dining", "entertainment_nightlife", "health_wellness"]
        },
        {
          "number": 16,
          "question": "What are your biggest relocation fears? (Select all that apply: loneliness/isolation, language barriers, career setback, financial loss, culture shock, safety concerns, healthcare access, missing family, bureaucracy, failure/regret)",
          "type": "Multi-select",
          "modules": ["safety_security", "health_wellness", "professional_career", "family_children", "cultural_heritage_traditions"]
        },
        {
          "number": 17,
          "question": "Do you prefer the familiar or the adventurous?",
          "type": "Slider",
          "sliderLeft": "Strongly prefer familiar",
          "sliderRight": "Strongly prefer adventurous",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Cultural Adaptation & Integration",
      "questionRange": "Q18-Q23",
      "questions": [
        {
          "number": 18,
          "question": "What is your tolerance for cultural differences?",
          "type": "Slider",
          "sliderLeft": "Low tolerance",
          "sliderRight": "Very high tolerance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 19,
          "question": "What is your comfort level with language barriers?",
          "type": "Slider",
          "sliderLeft": "Very uncomfortable",
          "sliderRight": "Very comfortable",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 20,
          "question": "Do you prefer expat communities or full local integration?",
          "type": "Slider",
          "sliderLeft": "Expat community",
          "sliderRight": "Full local integration",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 21,
          "question": "What is your expected timeline for feeling socially integrated? (Select one: 1-3 months, 3-6 months, 6-12 months, 1-2 years, 2+ years)",
          "type": "Single-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 22,
          "question": "How interested are you in cultural bridge-building and exchange?",
          "type": "Slider",
          "sliderLeft": "Not interested",
          "sliderRight": "Extremely interested",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 23,
          "question": "How willing are you to adapt to different social norms?",
          "type": "Slider",
          "sliderLeft": "Not willing at all",
          "sliderRight": "Completely willing",
          "modules": ["cultural_heritage_traditions", "social_values_governance"]
        }
      ]
    },
    {
      "title": "Social Identity & Community",
      "questionRange": "Q24-Q30",
      "questions": [
        {
          "number": 24,
          "question": "How would you describe your ideal social environment? (Select one: quiet/private, small close-knit community, active neighborhood, bustling urban life, cosmopolitan hub)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 25,
          "question": "How comfortable are you attending large social events versus intimate gatherings?",
          "type": "Slider",
          "sliderLeft": "Prefer intimate gatherings",
          "sliderRight": "Prefer large social events",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 26,
          "question": "What specific communities, hobbies, or subcultures do you NEED access to in order to feel fulfilled?",
          "type": "Text",
          "modules": ["entertainment_nightlife", "outdoor_recreation", "arts_culture"]
        },
        {
          "number": 27,
          "question": "How important is it that your neighborhood has people in a similar life stage to yours (young professionals, families, retirees)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "family_children"]
        },
        {
          "number": 28,
          "question": "How private or open do you prefer to be within your community?",
          "type": "Slider",
          "sliderLeft": "Very private",
          "sliderRight": "Very open",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 29,
          "question": "What social support systems do you need to thrive? (Select all that apply: religious community, professional network, parent groups, hobby/interest clubs, expat community, mental health support, volunteer organizations, none specific)",
          "type": "Multi-select",
          "modules": ["religion_spirituality", "professional_career", "family_children", "health_wellness"]
        },
        {
          "number": 30,
          "question": "How important is building local community roots versus maintaining a transient/flexible lifestyle?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Lifestyle Philosophy",
      "questionRange": "Q31-Q36",
      "questions": [
        {
          "number": 31,
          "question": "What is your stance on work-life balance?",
          "type": "Slider",
          "sliderLeft": "Work-focused",
          "sliderRight": "Life-focused",
          "modules": ["professional_career"]
        },
        {
          "number": 32,
          "question": "How do you prefer to spend your weekends? (Select one: relaxing at home, outdoor activities, social events, cultural exploration, travel/day trips, mix of everything)",
          "type": "Single-select",
          "modules": ["outdoor_recreation", "entertainment_nightlife", "arts_culture"]
        },
        {
          "number": 33,
          "question": "What is your ideal noise level environment?",
          "type": "Slider",
          "sliderLeft": "Very quiet",
          "sliderRight": "Very lively",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 34,
          "question": "What is your ideal community size? (Select one: village <5,000, small town 5K-50K, mid-size city 50K-500K, large city 500K-2M, mega city 2M+)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 35,
          "question": "How do seasonal changes affect your mood and activity level?",
          "type": "Likert-Concern",
          "modules": ["climate_weather"]
        },
        {
          "number": 36,
          "question": "How important is environmental sustainability to your lifestyle?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Vision, Planning & Living Preferences",
      "questionRange": "Q37-Q44",
      "questions": [
        {
          "number": 37,
          "question": "What are your long-term settlement plans? (Select one: permanent relocation, 5-10 years, 2-5 years, 1-2 years, exploring/undecided)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 38,
          "question": "Are your intentions temporary or permanent? (Select one: definitely permanent, leaning permanent, truly undecided, leaning temporary, definitely temporary)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 39,
          "question": "How important is having an exit strategy or reversible plan?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 40,
          "question": "What is your retirement timeline consideration? (Select one: already retired, retiring within 5 years, 5-15 years, 15+ years, not a factor)",
          "type": "Single-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 41,
          "question": "How important is access to cuisine and food culture that matches your preferences?",
          "type": "Likert-Importance",
          "modules": ["food_dining"]
        },
        {
          "number": 42,
          "question": "What is your settling period tolerance — how long before you expect to feel at home? (Select one: 1-3 months, 3-6 months, 6-12 months, 1-2 years, 2+ years)",
          "type": "Single-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 43,
          "question": "What is your backup plan approach if things don't work out? (Select one: return home, try another country, move to a different city, adapt and stay, no backup plan)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 44,
          "question": "What type of dwelling do you prefer to live in? (Select one: detached house, townhouse/row house, apartment/condo, villa/estate, tiny home/alternative, no strong preference)",
          "type": "Single-select",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Lifestyle & Values Preferences",
      "questionRange": "Q45-Q50",
      "questions": [
        {
          "number": 45,
          "question": "What setting do you prefer to live in? (Select one: urban core/city center, inner suburb, outer suburb, small town/rural, remote/off-grid)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 46,
          "question": "How important is it that local firearm and weapon laws align with your personal views?",
          "type": "Likert-Importance",
          "modules": ["safety_security", "social_values_governance"]
        },
        {
          "number": 47,
          "question": "How important is access to live music, performing arts, and entertainment or nightlife?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "arts_culture"]
        },
        {
          "number": 48,
          "question": "How important is access to sports, fitness facilities, and outdoor recreation?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "health_wellness"]
        },
        {
          "number": 49,
          "question": "How important is LGBTQ+ acceptance and legal protections in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "social_values_governance"]
        },
        {
          "number": 50,
          "question": "How important is it that your destination's political and social values broadly align with your own?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        }
      ]
    }
  ]
};
