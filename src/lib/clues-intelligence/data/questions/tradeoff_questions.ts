import type { QuestionModule } from './types';

// Trade — 50 questions
// Module ID: tradeoff_questions

export const tradeoffQuestionsQuestions: QuestionModule = {
  "moduleId": "tradeoff_questions",
  "moduleName": "Trade",
  "fileName": "TRADEOFF_QUESTIONS_REFERENCE.md",
  "structure": "",
  "totalQuestions": 50,
  "sections": [
    {
      "title": "Safety vs. Lifestyle",
      "questionRange": "Q1-Q6",
      "questions": [
        {
          "number": 1,
          "question": "Would you accept a higher cost of living for significantly better personal safety and lower crime?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "safety_security"]
        },
        {
          "number": 2,
          "question": "Would you live in a less exciting city (fewer restaurants, nightlife, culture) if it meant your family felt completely safe?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["entertainment_nightlife", "food_dining", "arts_culture", "safety_security", "family_children"]
        },
        {
          "number": 3,
          "question": "Would you accept stricter laws and less personal freedom in exchange for a very low crime rate and political stability?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["social_values_governance", "safety_security"]
        },
        {
          "number": 4,
          "question": "Would you move to a city with moderate safety concerns if it had world-class healthcare within walking distance?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["safety_security", "health_wellness"]
        },
        {
          "number": 5,
          "question": "Would you choose a safe but isolated small town over a vibrant but riskier large city?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["safety_security", "entertainment_nightlife", "neighborhood_urban_design"]
        },
        {
          "number": 6,
          "question": "Would you live in a country with mild political instability if it offered significantly better weather and cost of living?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["safety_security", "climate_weather", "financial_banking"]
        }
      ]
    },
    {
      "title": "Cost vs. Quality",
      "questionRange": "Q7-Q12",
      "questions": [
        {
          "number": 7,
          "question": "Would you pay 30-50% more in monthly expenses to live in a city with excellent infrastructure, healthcare, and services?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "health_wellness", "neighborhood_urban_design"]
        },
        {
          "number": 8,
          "question": "Would you accept a smaller home or apartment to live in a walkable neighborhood with everything nearby?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["housing_property", "neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 9,
          "question": "Would you choose a cheaper city with average food options over an expensive city with an incredible food scene?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "food_dining"]
        },
        {
          "number": 10,
          "question": "Would you sacrifice access to international-standard shopping and services for a significantly lower cost of living?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "shopping_services"]
        },
        {
          "number": 11,
          "question": "Would you accept higher taxes in exchange for excellent public services (healthcare, transit, education, safety)?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "health_wellness", "transportation_mobility", "education_learning", "safety_security"]
        },
        {
          "number": 12,
          "question": "Would you live further from the city center to afford a larger home, even if it meant a longer commute?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["housing_property", "transportation_mobility", "neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Climate vs. Opportunity",
      "questionRange": "Q13-Q18",
      "questions": [
        {
          "number": 13,
          "question": "Would you tolerate a climate you dislike (too hot, too cold, too humid) for significantly better career opportunities?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["climate_weather", "professional_career"]
        },
        {
          "number": 14,
          "question": "Would you accept fewer sunshine days for a city with a stronger professional network in your field?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["climate_weather", "professional_career"]
        },
        {
          "number": 15,
          "question": "Would you choose perfect weather in a rural area over imperfect weather in a thriving metropolis?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["climate_weather", "neighborhood_urban_design"]
        },
        {
          "number": 16,
          "question": "Would you live in a city with harsh winters if it had the best education options for your children?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["climate_weather", "education_learning", "family_children"]
        },
        {
          "number": 17,
          "question": "Would you sacrifice beach access for mountain access (or vice versa) if one option had better overall infrastructure?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["outdoor_recreation", "neighborhood_urban_design"]
        },
        {
          "number": 18,
          "question": "Would you accept a climate with natural disaster risk (earthquakes, hurricanes) for a city that excels in everything else?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["climate_weather", "safety_security"]
        }
      ]
    },
    {
      "title": "Career & Financial vs. Lifestyle",
      "questionRange": "Q19-Q24",
      "questions": [
        {
          "number": 19,
          "question": "Would you take a significant pay cut to live in a city with a dramatically better quality of life?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 20,
          "question": "Would you give up career advancement opportunities to live in a place that perfectly matches your lifestyle values?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["professional_career", "social_values_governance"]
        },
        {
          "number": 21,
          "question": "Would you accept a less favorable tax situation for a city that has everything else you want?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking"]
        },
        {
          "number": 22,
          "question": "Would you work in a different time zone (inconvenient hours) to live in your dream location?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["professional_career", "technology_connectivity"]
        },
        {
          "number": 23,
          "question": "Would you choose a city with fewer professional networking opportunities if it had a stronger sense of community?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["professional_career", "neighborhood_urban_design"]
        },
        {
          "number": 24,
          "question": "Would you sacrifice financial growth potential for immediate quality of life improvement?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["financial_banking", "professional_career"]
        }
      ]
    },
    {
      "title": "Social & Cultural vs. Practical",
      "questionRange": "Q25-Q30",
      "questions": [
        {
          "number": 25,
          "question": "Would you live in a place where you don't speak the language if everything else was perfect?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 26,
          "question": "Would you choose a culturally unfamiliar environment over a comfortable expat bubble if it meant deeper integration?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 27,
          "question": "Would you sacrifice proximity to family and friends for a location that matches all other priorities?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["family_children"]
        },
        {
          "number": 28,
          "question": "Would you accept a less diverse community for a city that scores perfectly on safety, cost, and climate?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["cultural_heritage_traditions", "safety_security", "financial_banking", "climate_weather"]
        },
        {
          "number": 29,
          "question": "Would you live somewhere with limited nightlife and entertainment if the daytime lifestyle was exceptional?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["entertainment_nightlife", "outdoor_recreation"]
        },
        {
          "number": 30,
          "question": "Would you choose a city where you'd be a visible minority if it was the best match on every other metric?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["cultural_heritage_traditions", "social_values_governance"]
        }
      ]
    },
    {
      "title": "Healthcare & Wellness vs. Other Priorities",
      "questionRange": "Q31-Q36",
      "questions": [
        {
          "number": 31,
          "question": "Would you accept a longer commute to hospitals and specialists for a location with better overall daily life quality?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness", "transportation_mobility"]
        },
        {
          "number": 32,
          "question": "Would you live in a country with excellent public healthcare but less personal freedom?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness", "social_values_governance"]
        },
        {
          "number": 33,
          "question": "Would you sacrifice access to cutting-edge medical technology for a city with better air quality, less stress, and a healthier lifestyle?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness", "environment_community_appearance"]
        },
        {
          "number": 34,
          "question": "Would you accept higher out-of-pocket healthcare costs for a location with better weather and outdoor activity options?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness", "climate_weather", "outdoor_recreation"]
        },
        {
          "number": 35,
          "question": "Would you choose a location with fewer wellness amenities (gyms, spas, yoga) if it had stronger community health outcomes?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness"]
        },
        {
          "number": 36,
          "question": "Would you live further from nature and outdoor recreation to be closer to top-tier medical facilities?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["health_wellness", "outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Housing & Neighborhood vs. Location",
      "questionRange": "Q37-Q42",
      "questions": [
        {
          "number": 37,
          "question": "Would you accept a less desirable home (older, smaller, fewer amenities) to live in the perfect neighborhood?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["housing_property", "neighborhood_urban_design"]
        },
        {
          "number": 38,
          "question": "Would you rent instead of own to live in a city you love, even if you could afford to buy in a city you only like?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 39,
          "question": "Would you sacrifice modern urban design and architecture for a historic, charming neighborhood with older infrastructure?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["neighborhood_urban_design", "cultural_heritage_traditions"]
        },
        {
          "number": 40,
          "question": "Would you accept a noisier, busier neighborhood for walkability and proximity to everything?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 41,
          "question": "Would you choose a city with less green space but better public transit over one with beautiful parks but car-dependent living?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["environment_community_appearance", "transportation_mobility"]
        },
        {
          "number": 42,
          "question": "Would you accept a less aesthetically pleasing environment (concrete, industrial) for a city with exceptional community and culture?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["environment_community_appearance", "arts_culture", "cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Freedom & Values vs. Convenience",
      "questionRange": "Q43-Q50",
      "questions": [
        {
          "number": 43,
          "question": "Would you accept more bureaucracy and slower government services for a country with stronger civil liberties?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["legal_immigration", "social_values_governance"]
        },
        {
          "number": 44,
          "question": "Would you live in a more religiously conservative area if it had the best family environment and lowest cost?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["religion_spirituality", "family_children", "financial_banking"]
        },
        {
          "number": 45,
          "question": "Would you sacrifice access to certain substances (alcohol, cannabis) for a safer, more family-friendly environment?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["social_values_governance", "safety_security", "family_children"]
        },
        {
          "number": 46,
          "question": "Would you accept internet censorship or limited media access for a location that excels in other areas?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["technology_connectivity", "social_values_governance"]
        },
        {
          "number": 47,
          "question": "Would you choose a location with weaker environmental regulations but stronger economic opportunities?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["environment_community_appearance", "professional_career"]
        },
        {
          "number": 48,
          "question": "Would you accept limited pet-friendliness (fewer parks, stricter rules) for a city that otherwise perfectly matches your needs?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["pets_animals"]
        },
        {
          "number": 49,
          "question": "Would you live in a location with limited cultural heritage and traditions if it was modern, efficient, and comfortable?",
          "type": "Slider",
          "sliderLeft": "Absolutely not",
          "sliderRight": "Absolutely yes",
          "modules": ["cultural_heritage_traditions", "technology_connectivity"]
        },
        {
          "number": 50,
          "question": "Looking at everything you've told us — if you could ONLY optimize for THREE things in your new home and had to accept \"good enough\" on everything else, what would your three be?",
          "type": "Text",
          "modules": ["general_questions"]
        }
      ]
    }
  ]
};
