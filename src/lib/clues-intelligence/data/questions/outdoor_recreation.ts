import type { QuestionModule } from './types';

// Outdoor & Recreation — 100 questions
// Module ID: outdoor_recreation

export const outdoorRecreationQuestions: QuestionModule = {
  "moduleId": "outdoor_recreation",
  "moduleName": "Outdoor & Recreation",
  "fileName": "OUTDOOR_RECREATION_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Physical Activity & Sports",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "Which recreational sports do you most value for regular participation? (Select all that apply: running, swimming, cycling, tennis, golf, hiking, surfing, skiing/snowboarding, rock climbing, martial arts, yoga, team sports, paddleboarding, kayaking, sailing, horseback riding)",
          "type": "Multi-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 2,
          "question": "How frequently do you engage in recreational physical activity?",
          "type": "Likert-Frequency",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 3,
          "question": "How important is access to high-quality recreational facilities and equipment?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 4,
          "question": "What role does competition play in your recreational lifestyle (casual to competitive)?",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 5,
          "question": "How important is year-round recreational activity access versus seasonal variations?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "climate_weather"]
        },
        {
          "number": 6,
          "question": "How important is access to winter and snow sports (skiing, snowboarding, ice skating, snowshoeing)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 7,
          "question": "What role do water sports (surfing, sailing, kayaking, diving, paddleboarding) play in your recreational lifestyle?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 8,
          "question": "How important is access to quality cycling infrastructure (road cycling routes, mountain bike trails, bike parks)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 9,
          "question": "How important is access to golf courses, tennis courts, or other facility-dependent sports?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 10,
          "question": "Rank these physical activity factors from most to least important: Sport variety, Facility quality, Year-round access, Water sports, Winter sports",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Nature Connection & Environment",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is the aesthetic quality and scenic beauty of your recreational environment?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 12,
          "question": "What type of natural landscape most deeply resonates with your recreational identity? (Select one: coastal/beach, mountain, forest/woodland, desert, tropical, lake/river, rolling hills/countryside, arctic/tundra)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 13,
          "question": "How important is local biodiversity and wildlife interaction in your recreational experience?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 14,
          "question": "How important is proximity to beaches, coastline, or ocean access for your recreational lifestyle?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 15,
          "question": "What terrain and elevation range do you prefer for your primary outdoor activities? (Select one: flat coastal, rolling hills, mountainous, high-altitude, mixed/varied)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 16,
          "question": "How important is access to water-based recreational environments (lakes, rivers, ocean, canals)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 17,
          "question": "How do seasonal allergens and natural irritants affect your recreational location choices?",
          "type": "Likert-Concern",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 18,
          "question": "How do daylight hours and latitude affect your outdoor recreation satisfaction?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 19,
          "question": "How do you prefer to engage with gardening, foraging, fishing, or hunting as recreational activities?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 20,
          "question": "Rank these nature factors from most to least important: Scenic beauty, Landscape type, Biodiversity, Beach/ocean access, Water environments",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Climate & Weather for Recreation",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "What is your ideal temperature range for comfortable outdoor recreation?",
          "type": "Range",
          "modules": ["outdoor_recreation", "climate_weather"]
        },
        {
          "number": 22,
          "question": "How does heat and humidity tolerance affect your outdoor activity choices?",
          "type": "Likert-Concern",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 23,
          "question": "How does cold weather tolerance affect your willingness to recreate outdoors year-round?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 24,
          "question": "How tolerant are you of rain and wet conditions affecting your outdoor recreation schedule?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 25,
          "question": "How important is reliable, predictable weather for planning outdoor activities?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 26,
          "question": "How important is having four distinct seasons for recreational variety?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 27,
          "question": "How important is air quality and low pollution levels for your outdoor exercise?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "health_wellness"]
        },
        {
          "number": 28,
          "question": "How concerned are you about extreme weather events (hurricanes, wildfires, flooding) disrupting your outdoor lifestyle?",
          "type": "Likert-Concern",
          "modules": ["outdoor_recreation", "climate_weather"]
        },
        {
          "number": 29,
          "question": "How concerned are you about UV intensity and sun exposure in your outdoor recreation environment?",
          "type": "Likert-Concern",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 30,
          "question": "Rank these climate factors from most to least important: Temperature range, Humidity, Weather predictability, Four seasons, Air quality",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Community & Social Recreation",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "What size recreational community optimally supports your lifestyle? (Select one: small intimate group, medium club-sized, large organized leagues, massive event-scale, solitary/independent)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 32,
          "question": "How important is the social aspect of recreation versus solitary enjoyment?",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 33,
          "question": "How important is demographic diversity in your recreational community?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 34,
          "question": "How important is local recreational cultural tradition (established clubs, events, customs) in your location choice?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 35,
          "question": "How do you prefer to engage in recreational sports and activities? (Select one: solo, with partner, small group, organized team, class/instruction, mixed)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 36,
          "question": "How important is access to mind-body outdoor activities (outdoor yoga, tai chi, forest bathing, outdoor meditation)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 37,
          "question": "How important are intergenerational recreational opportunities (family-friendly activities for all ages)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "family_children"]
        },
        {
          "number": 38,
          "question": "How important is gender inclusivity in recreational activities and facilities?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 39,
          "question": "How willing are you to adapt to local recreational customs and sporting traditions? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 40,
          "question": "Rank these social recreation factors from most to least important: Community size, Social vs. solo, Diversity, Local traditions, Family-friendly activities",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Infrastructure & Accessibility",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "What type of trail and recreational path infrastructure do you require? (Select all that apply: paved running paths, hiking trails, mountain bike trails, equestrian trails, nature boardwalks, waterfront promenades, ski trails, rock climbing routes)",
          "type": "Multi-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 42,
          "question": "How important is emergency and medical infrastructure for recreational activities (rescue teams, first aid, defibrillators)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "safety_security"]
        },
        {
          "number": 43,
          "question": "How important are recreational education and skill development facilities (lessons, guides, schools)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 44,
          "question": "How far are you willing to travel from your home to reach your primary outdoor recreation areas on a regular basis?",
          "type": "Range",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 45,
          "question": "How important is reliable mobile phone coverage and digital connectivity in your outdoor recreation areas?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 46,
          "question": "How important is recreational equipment storage and maintenance infrastructure (marinas, ski lockers, bike storage)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 47,
          "question": "How important is recreational community accessibility for people with different abilities?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 48,
          "question": "How important is access to recreational retail and equipment shops near your recreation areas?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 49,
          "question": "How willing are you to navigate complex permits and regulations for outdoor recreation (fishing licenses, park passes, hunting permits)?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 50,
          "question": "Rank these infrastructure factors from most to least important: Trail quality, Safety infrastructure, Education facilities, Travel distance, Equipment storage",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Camping, Wilderness & Adventure",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "What is your preferred camping style? (Select one: backcountry tent, car camping, RV/campervan, glamping, cabin/hut, no camping)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 52,
          "question": "How comfortable are you spending extended periods in remote areas with limited services?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 53,
          "question": "How important is access to dark sky areas for stargazing and astronomy?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 54,
          "question": "How comfortable are you with encounters with potentially dangerous wildlife during recreation?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 55,
          "question": "How important is access to multi-day hiking, trekking, or long-distance trail systems?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 56,
          "question": "How important is access to national parks, nature reserves, or protected wilderness areas within a day trip?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 57,
          "question": "How important is access to rock climbing, mountaineering, or canyoneering areas?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 58,
          "question": "How do you feel about off-road vehicle access (4x4, ATV, dirt bikes) as part of your recreation?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 59,
          "question": "How important is the balance between pristine wilderness and developed recreational infrastructure?",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 60,
          "question": "Rank these adventure factors from most to least important: Camping access, Wilderness remoteness, National parks, Multi-day trails, Climbing/mountaineering",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Recreation Philosophy & Lifestyle",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "What is your preferred pace and intensity for recreational experiences? (Select one: relaxed/leisurely, moderate/steady, intense/challenging, extreme/pushing limits, mixed)",
          "type": "Single-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 62,
          "question": "How important is skill mastery in specific sports versus variety across many activities?",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 63,
          "question": "How important are recreational challenges and goal-setting (races, personal records, expeditions)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 64,
          "question": "How tolerant are you of recreational discomfort and adverse conditions (cold, rain, heat, altitude)?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 65,
          "question": "How do cultural and spiritual dimensions influence your recreational preferences (nature worship, sacred trails, meditation retreats)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 66,
          "question": "How tolerant are you of recreational crowds and popular destination dynamics?",
          "type": "Likert-Comfort",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 67,
          "question": "How important is recreational equipment ownership versus rental and sharing?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 68,
          "question": "How important is recreational innovation and trying new activities regularly?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 69,
          "question": "How important is pet-friendly outdoor recreation (trails, beaches, parks that allow dogs)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "pets_animals"]
        },
        {
          "number": 70,
          "question": "Rank these philosophy factors from most to least important: Activity intensity, Skill mastery vs. variety, Goal-setting, Crowd tolerance, Equipment ownership",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Recreation Budget & Family",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "What percentage of your household income are you willing to allocate to outdoor recreation (memberships, gear, travel)?",
          "type": "Range",
          "modules": ["outdoor_recreation", "financial_banking"]
        },
        {
          "number": 72,
          "question": "How important is it that your primary outdoor activities are low-cost or free?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 73,
          "question": "How important are family-friendly and child-safe outdoor recreation options (playgrounds, gentle trails, shallow swimming areas)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "family_children"]
        },
        {
          "number": 74,
          "question": "Would you accept a higher cost of living or smaller home in exchange for superior outdoor recreation access?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 75,
          "question": "If your ideal climate for outdoor recreation conflicts with career opportunities, which would you prioritize?",
          "type": "Slider",
          "modules": ["outdoor_recreation", "professional_career"]
        },
        {
          "number": 76,
          "question": "How willing are you to live in a more rural or isolated area for better outdoor recreation access?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 77,
          "question": "Would you sacrifice proximity to cultural amenities (restaurants, nightlife, arts) for better outdoor recreation?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 78,
          "question": "How important is having nearby adventure tourism and guided expedition services?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 79,
          "question": "How important is access to overnight wilderness huts, backcountry permits, and public land for camping?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 80,
          "question": "Rank these budget/family factors from most to least important: Recreation budget, Low-cost activities, Family-friendly options, Location trade-offs, Rural vs. urban balance",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Recreation Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept limited outdoor recreation variety in exchange for excellent quality in one or two activities?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept seasonal limitations on outdoor recreation (snow closures, monsoon season, extreme heat)?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 83,
          "question": "How willing are you to travel 1-2 hours to access your preferred outdoor recreation if your city lacks it nearby?",
          "type": "Likert-Willingness",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 84,
          "question": "How willing are you to adapt your recreational activities to fit a new climate and environment? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 85,
          "question": "How important is the safety record and rescue infrastructure of your outdoor recreation areas?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "safety_security"]
        },
        {
          "number": 86,
          "question": "How important is recreational integration with long-term life planning (retirement activity, aging-in-place outdoor access)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 87,
          "question": "How concerned are you about risk and safety in recreational environments (injury rates, wildlife danger, terrain hazards)?",
          "type": "Likert-Concern",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 88,
          "question": "How important is proximity to specific natural features for your primary activities (e.g., must be near mountains, must be coastal)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 89,
          "question": "How important is it that your destination's outdoor recreation scene is growing and improving?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Quality vs. variety, Seasonal limitations, Travel distance, Safety infrastructure, Proximity to key features",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Overall Recreation Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which outdoor recreation issues are absolute dealbreakers? (Select all that apply: no hiking trails, no water access, extreme heat/cold, no winter sports, no cycling infrastructure, dangerous wildlife, poor air quality, no parks/green space, no fitness facilities)",
          "type": "Multi-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 92,
          "question": "Which outdoor recreation features are non-negotiable must-haves? (Select all that apply: hiking trails, beach/water access, parks/green spaces, cycling infrastructure, fitness facilities, skiing/snow sports, national parks nearby, running paths, golf/tennis courts)",
          "type": "Multi-select",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank outdoor recreation as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 94,
          "question": "How important is living in a destination known internationally for outdoor recreation (adventure capital, sports destination)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 95,
          "question": "What is your approximate annual budget for outdoor recreation equipment, memberships, and activities?",
          "type": "Range",
          "modules": ["outdoor_recreation", "financial_banking"]
        },
        {
          "number": 96,
          "question": "How willing are you to explore and embrace unfamiliar local outdoor traditions and activities? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 97,
          "question": "How important is environmental conservation and sustainable recreation practices in your destination?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 98,
          "question": "How important is it that the local culture values and prioritizes outdoor recreation and fitness?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 99,
          "question": "How do you approach risk management in outdoor recreation (insurance, safety training, emergency planning)?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 100,
          "question": "Rank these overall recreation categories from most to least important for your relocation: Physical activity & sports, Nature & environment, Climate & weather, Community & social, Infrastructure, Camping & adventure, Recreation philosophy, Budget & family, Trade-offs, Overall recreation investment",
          "type": "Ranking",
          "modules": ["outdoor_recreation"]
        }
      ]
    }
  ]
};
