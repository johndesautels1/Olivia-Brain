import type { QuestionModule } from './types';

// Climate & Weather — 100 questions
// Module ID: climate_weather

export const climateWeatherQuestions: QuestionModule = {
  "moduleId": "climate_weather",
  "moduleName": "Climate & Weather",
  "fileName": "CLIMATE_WEATHER_QUESTIONS.md",
  "structure": "10 sections x 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Temperature Preferences & Comfort",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "What is your ideal daytime temperature range for most of the year?",
          "type": "Temperature range",
          "modules": ["climate_weather"]
        },
        {
          "number": 2,
          "question": "What is the maximum summer temperature you can comfortably tolerate on a regular basis?",
          "type": "Temperature threshold",
          "modules": ["climate_weather"]
        },
        {
          "number": 3,
          "question": "What is the minimum winter temperature you can comfortably tolerate?",
          "type": "Temperature threshold",
          "modules": ["climate_weather"]
        },
        {
          "number": 4,
          "question": "How important is it that temperatures stay consistent year-round (tropical stability) versus having distinct seasonal shifts?",
          "type": "Single-select",
          "modules": ["climate_weather"]
        },
        {
          "number": 5,
          "question": "Do you have medical conditions (arthritis, Raynaud's, heat sensitivity, MS) affected by temperature extremes?",
          "type": "Yes/No + conditions",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 6,
          "question": "How important is reliable home heating and air conditioning infrastructure in your destination?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "housing_property"]
        },
        {
          "number": 7,
          "question": "How does extreme heat (above 38C/100F) affect your ability to work, exercise, and go about daily life?",
          "type": "Impact scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 8,
          "question": "How does extreme cold (below 0C/32F) affect your ability to work, exercise, and go about daily life?",
          "type": "Impact scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 9,
          "question": "Would you accept higher energy costs for a climate that requires year-round heating or cooling?",
          "type": "Slider",
          "modules": ["climate_weather", "financial_banking"]
        },
        {
          "number": 10,
          "question": "Rank these temperature factors from most to least important: Average daily comfort range, Summer heat tolerance, Winter cold tolerance, Temperature consistency, Climate-related health needs",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Humidity & Moisture Comfort",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "What is your ideal relative humidity range?",
          "type": "Humidity range",
          "modules": ["climate_weather"]
        },
        {
          "number": 12,
          "question": "How does high humidity (above 70%) affect your daily comfort and energy levels?",
          "type": "Impact scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 13,
          "question": "How does very low humidity (below 20%) affect your skin, sinuses, and respiratory health?",
          "type": "Impact scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 14,
          "question": "Do you have allergies or asthma that are worsened by specific humidity levels?",
          "type": "Yes/No + details",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 15,
          "question": "How concerned are you about mold, mildew, and moisture damage to your home in humid climates?",
          "type": "Concern scale",
          "modules": ["climate_weather", "housing_property"]
        },
        {
          "number": 16,
          "question": "Would you use a dehumidifier or humidifier daily to manage indoor air?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather"]
        },
        {
          "number": 17,
          "question": "How does humidity affect your outdoor exercise and activity levels?",
          "type": "Impact scale",
          "modules": ["climate_weather", "outdoor_recreation"]
        },
        {
          "number": 18,
          "question": "How important is a dry climate for preserving personal belongings (electronics, instruments, art, clothing)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 19,
          "question": "How do you feel about the \"feels like\" temperature when humidity makes it significantly hotter than actual temperature?",
          "type": "Tolerance scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 20,
          "question": "Rank these humidity factors from most to least important: Daily comfort level, Health and respiratory impact, Home and property protection, Outdoor activity impact, \"Feels like\" heat index",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Rainfall & Precipitation Patterns",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How many rainy days per month are you comfortable with?",
          "type": "Frequency range",
          "modules": ["climate_weather"]
        },
        {
          "number": 22,
          "question": "Do you prefer brief intense rain showers (tropical style) or long drizzly periods (maritime style)?",
          "type": "Single-select",
          "modules": ["climate_weather"]
        },
        {
          "number": 23,
          "question": "How important is having a predictable dry season for planning outdoor activities and travel?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 24,
          "question": "Could you live in a city with a monsoon season (months of heavy daily rain)?",
          "type": "Yes/No/Maybe",
          "modules": ["climate_weather"]
        },
        {
          "number": 25,
          "question": "How do you feel about gray, overcast skies for extended periods (weeks without sunshine)?",
          "type": "Tolerance scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 26,
          "question": "Do you enjoy snow? How many months of snowfall would you accept?",
          "type": "Preference + duration",
          "modules": ["climate_weather"]
        },
        {
          "number": 27,
          "question": "How important is it that roads and infrastructure handle rain and snow effectively (drainage, plowing, de-icing)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "transportation_mobility"]
        },
        {
          "number": 28,
          "question": "Would persistent rain or drizzle negatively affect your mental health and mood?",
          "type": "Impact scale",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 29,
          "question": "How important is annual sunshine hours in your destination (e.g., 300+ sunny days vs. 150)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 30,
          "question": "Rank these precipitation factors from most to least important: Total rainy days per year, Sunshine hours, Snow tolerance, Predictable dry season, Infrastructure quality for weather",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Seasonal Patterns & Daylight",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "Do you prefer four distinct seasons, two seasons (wet/dry), or year-round consistency?",
          "type": "Single-select",
          "modules": ["climate_weather"]
        },
        {
          "number": 32,
          "question": "How important is experiencing a traditional autumn with changing leaves and cooler temperatures?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 33,
          "question": "How important is a warm, long summer for outdoor activities and social life?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 34,
          "question": "How do you handle very short winter daylight hours (sunset at 4pm or earlier)?",
          "type": "Tolerance scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 35,
          "question": "How do you handle very long summer daylight hours (sunset at 10pm or later)?",
          "type": "Single-select",
          "modules": ["climate_weather"]
        },
        {
          "number": 36,
          "question": "Have you experienced or are you concerned about Seasonal Affective Disorder (SAD)?",
          "type": "Yes/No + concern",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 37,
          "question": "How important is consistent daylight hours year-round (tropical locations near the equator)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 38,
          "question": "Do you need specific seasonal conditions for hobbies (skiing, surfing, gardening, cycling)?",
          "type": "Yes/No + details",
          "modules": ["climate_weather", "outdoor_recreation"]
        },
        {
          "number": 39,
          "question": "How do seasonal transitions affect your wardrobe, energy costs, and daily routine?",
          "type": "Impact scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 40,
          "question": "Rank these seasonal factors from most to least important: Number of distinct seasons, Daylight hours consistency, Autumn/spring experience, Summer length and warmth, Seasonal hobby support",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Extreme Weather & Natural Disaster Risk",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Which natural disasters are you most concerned about? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["climate_weather", "safety_security"]
        },
        {
          "number": 42,
          "question": "Would you live in a hurricane/typhoon/cyclone zone if housing was built to withstand them?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather", "housing_property"]
        },
        {
          "number": 43,
          "question": "Would you live in an earthquake-prone area if building codes were strong?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather"]
        },
        {
          "number": 44,
          "question": "How concerned are you about wildfire risk in your destination?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 45,
          "question": "How concerned are you about flooding risk (coastal, river, flash flooding)?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 46,
          "question": "Would you live in a tornado-prone region (e.g., U.S. Tornado Alley)?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather"]
        },
        {
          "number": 47,
          "question": "How important is a robust early warning system for severe weather events?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "safety_security"]
        },
        {
          "number": 48,
          "question": "How concerned are you about volcanic activity in your destination region?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 49,
          "question": "Would natural disaster insurance costs (flood, earthquake, hurricane) affect your destination choice?",
          "type": "Slider",
          "modules": ["climate_weather", "financial_banking"]
        },
        {
          "number": 50,
          "question": "Rank these extreme weather factors from most to least important: Hurricane/typhoon risk, Earthquake risk, Wildfire risk, Flooding risk, Tornado risk",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Air Quality & Environmental Health",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is clean air quality (low AQI) in your daily life?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 52,
          "question": "What is the maximum Air Quality Index (AQI) you would tolerate on a regular basis?",
          "type": "AQI range",
          "modules": ["climate_weather"]
        },
        {
          "number": 53,
          "question": "Do you or family members have respiratory conditions (asthma, COPD) requiring clean air?",
          "type": "Yes/No",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 54,
          "question": "How concerned are you about seasonal smog, haze, or pollution events?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 55,
          "question": "How important is low pollen count and allergen levels in your destination?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 56,
          "question": "Would you avoid cities near heavy industrial areas or traffic pollution corridors?",
          "type": "Yes/No",
          "modules": ["climate_weather"]
        },
        {
          "number": 57,
          "question": "How important is access to clean, drinkable tap water?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "health_wellness"]
        },
        {
          "number": 58,
          "question": "How concerned are you about sand storms or dust storms in arid climates?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 59,
          "question": "Would you pay a premium to live in an area with certified clean air and low pollution?",
          "type": "Slider",
          "modules": ["climate_weather", "financial_banking"]
        },
        {
          "number": 60,
          "question": "Rank these air quality factors from most to least important: Average AQI level, Respiratory health impact, Pollen and allergens, Industrial pollution proximity, Clean water access",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Climate & Outdoor Lifestyle",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How many months per year do you need comfortable outdoor weather for walking, dining, and socializing?",
          "type": "Range",
          "modules": ["climate_weather"]
        },
        {
          "number": 62,
          "question": "Do you need year-round conditions for outdoor sports (running, cycling, swimming, tennis)?",
          "type": "Yes/No + sports",
          "modules": ["climate_weather", "outdoor_recreation"]
        },
        {
          "number": 63,
          "question": "How important is beach-friendly weather for a significant portion of the year?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 64,
          "question": "Do you garden or grow food? How important is a long growing season?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 65,
          "question": "How important is weather that supports an outdoor cafe and restaurant culture?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "food_dining"]
        },
        {
          "number": 66,
          "question": "Do you need climate suitable for year-round outdoor play for children?",
          "type": "Yes/No",
          "modules": ["climate_weather", "family_children"]
        },
        {
          "number": 67,
          "question": "How important are sunset and sunrise quality (clear skies, long golden hours) to your lifestyle?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 68,
          "question": "Do you need a climate that supports specific outdoor hobbies (sailing, skiing, hiking, surfing)?",
          "type": "Yes/No + hobbies",
          "modules": ["climate_weather", "outdoor_recreation"]
        },
        {
          "number": 69,
          "question": "How many months of pleasant \"windows open\" weather do you want per year (no heating or AC needed)?",
          "type": "Range",
          "modules": ["climate_weather"]
        },
        {
          "number": 70,
          "question": "Rank these outdoor lifestyle factors from most to least important: Outdoor months per year, Year-round sports weather, Beach season length, Gardening season, Outdoor dining and socializing",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Climate Change & Long-Term Trends",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How concerned are you about climate change impacts on your destination over the next 20-30 years?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 72,
          "question": "Would you avoid coastal areas at risk of sea-level rise?",
          "type": "Yes/No/Maybe",
          "modules": ["climate_weather"]
        },
        {
          "number": 73,
          "question": "How concerned are you about increasing frequency of extreme heat events in your destination?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 74,
          "question": "Would you factor in water scarcity projections when choosing a destination?",
          "type": "Yes/No",
          "modules": ["climate_weather"]
        },
        {
          "number": 75,
          "question": "How important is your destination's commitment to climate action and renewable energy?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "social_values_governance"]
        },
        {
          "number": 76,
          "question": "Are you concerned about climate-driven migration putting pressure on your destination's resources?",
          "type": "Concern scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 77,
          "question": "How important is the long-term agricultural viability and food security of your region?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "food_dining"]
        },
        {
          "number": 78,
          "question": "Would you choose a destination that is expected to become more pleasant due to climate change (e.g., northern regions warming)?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather"]
        },
        {
          "number": 79,
          "question": "How important is green infrastructure (urban forests, green roofs, flood mitigation) in your destination?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "environment_community_appearance"]
        },
        {
          "number": 80,
          "question": "Rank these long-term factors from most to least important: Sea-level rise risk, Extreme heat increase, Water scarcity, Climate policy commitment, Food security outlook",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Climate Adaptation & Personal Resilience",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Have you previously lived in a significantly different climate than your current one?",
          "type": "Yes/No + details",
          "modules": ["climate_weather"]
        },
        {
          "number": 82,
          "question": "How confident are you in your ability to adapt to a new climate?",
          "type": "Confidence scale",
          "modules": ["climate_weather"]
        },
        {
          "number": 83,
          "question": "How long do you expect it would take you to fully adjust to a major climate change?",
          "type": "Time range",
          "modules": ["climate_weather"]
        },
        {
          "number": 84,
          "question": "Would you invest in home modifications (better insulation, solar panels, hurricane shutters) for climate resilience?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather", "housing_property"]
        },
        {
          "number": 85,
          "question": "How important is a \"trial period\" before committing -- spending a full year in the new climate before buying property?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 86,
          "question": "Do you have pets whose climate needs must be considered (thick-coated dogs, outdoor cats)?",
          "type": "Yes/No",
          "modules": ["climate_weather", "pets_animals"]
        },
        {
          "number": 87,
          "question": "How important is reliable and affordable home climate control (central heating, split AC, underfloor heating)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "housing_property"]
        },
        {
          "number": 88,
          "question": "Would you accept a climate you dislike for 3-4 months if the remaining 8-9 months were perfect?",
          "type": "Slider",
          "modules": ["climate_weather"]
        },
        {
          "number": 89,
          "question": "How important is proximity to a different climate zone for weekend getaways (mountains, coast, desert)?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 90,
          "question": "Rank these adaptation factors from most to least important: Previous climate experience, Adaptation confidence, Home climate control, Trial period before committing, Nearby climate variety for getaways",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    },
    {
      "title": "Climate Deal-Breakers & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which climate factors would absolutely disqualify a destination? (Select all that apply)",
          "type": "Multi-select dealbreaker",
          "modules": ["climate_weather"]
        },
        {
          "number": 92,
          "question": "What is the single most important climate factor in your relocation decision?",
          "type": "Single select",
          "modules": ["climate_weather"]
        },
        {
          "number": 93,
          "question": "Would you accept a less-than-ideal climate for significantly better job opportunities or cost of living?",
          "type": "Slider",
          "modules": ["climate_weather", "professional_career", "financial_banking"]
        },
        {
          "number": 94,
          "question": "How important is climate compared to all other relocation factors (safety, cost, culture, etc.)?",
          "type": "Priority rating",
          "modules": ["climate_weather"]
        },
        {
          "number": 95,
          "question": "Do you have a specific \"dream climate\" in mind? Describe it briefly.",
          "type": "Open text",
          "modules": ["climate_weather"]
        },
        {
          "number": 96,
          "question": "Would you split your year between two locations to avoid unpleasant weather seasons?",
          "type": "Likert-Willingness",
          "modules": ["climate_weather"]
        },
        {
          "number": 97,
          "question": "How important is it that your destination climate is similar to what you are used to?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 98,
          "question": "Do you have any specific climate needs not covered above that would impact your relocation?",
          "type": "Open text",
          "modules": ["climate_weather"]
        },
        {
          "number": 99,
          "question": "Rate the overall importance of Climate & Weather factors in your relocation decision (1-10)",
          "type": "Slider",
          "modules": ["climate_weather"]
        },
        {
          "number": 100,
          "question": "FINAL MODULE RANKING: Drag all 10 sections to rank by overall importance to your relocation decision",
          "type": "Ranking",
          "modules": ["climate_weather"]
        }
      ]
    }
  ]
};
