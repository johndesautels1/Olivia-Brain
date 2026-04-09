import type { QuestionModule } from './types';

// Environment & Community Appearance — 100 questions
// Module ID: environment_community_appearance

export const environmentCommunityAppearanceQuestions: QuestionModule = {
  "moduleId": "environment_community_appearance",
  "moduleName": "Environment & Community Appearance",
  "fileName": "ENVIRONMENT_COMMUNITY_APPEARANCE_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Air Quality & Environmental Health",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is air quality when considering a city to live in?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "health_wellness"]
        },
        {
          "number": 2,
          "question": "What is the maximum Air Quality Index (AQI) you would tolerate on a regular basis?",
          "type": "Range",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 3,
          "question": "Which air pollutants concern you most? (Select all that apply: particulate matter/PM2.5, vehicle exhaust, industrial emissions, wildfire smoke, pollen/allergens, ozone, chemical odors)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 4,
          "question": "How sensitive are you to environmental odors and smells in your neighborhood?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 5,
          "question": "How important is access to clean drinkable tap water without filtration?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "health_wellness"]
        },
        {
          "number": 6,
          "question": "How would you react to occasional boil-water advisories in your area?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 7,
          "question": "How willing are you to pay 15-30% more in living costs for significantly better air quality?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance", "financial_banking"]
        },
        {
          "number": 8,
          "question": "Do you have respiratory sensitivities or conditions affected by air quality?",
          "type": "Yes/No",
          "modules": ["environment_community_appearance", "health_wellness"]
        },
        {
          "number": 9,
          "question": "How important are strong environmental regulations and enforcement in your ideal city?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 10,
          "question": "Rank these environmental health factors from most to least important: Air quality, Water quality, Environmental regulations, Odor control, Noise pollution",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Visual Appeal & Urban Aesthetics",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How much does litter in public spaces affect your comfort and enjoyment?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 12,
          "question": "How do you feel about graffiti and street art in urban areas?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 13,
          "question": "How important are well-maintained building exteriors and facades?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 14,
          "question": "Which building and infrastructure conditions bother you most? (Select all that apply: peeling paint, broken windows, crumbling facades, rusting structures, abandoned buildings, boarded-up storefronts, unmaintained lots)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 15,
          "question": "How important is consistent architectural style in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "neighborhood_urban_design"]
        },
        {
          "number": 16,
          "question": "How tolerant are you of construction zones and ongoing urban development?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 17,
          "question": "How do you feel about overhead power lines and visible utility infrastructure?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 18,
          "question": "How important is consistent adequate street lighting quality?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 19,
          "question": "How sensitive are you to visual chaos and clutter in urban environments (excessive signage, advertising, tangled wires)?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 20,
          "question": "Rank these visual appeal factors from most to least important: Cleanliness/litter, Building maintenance, Architectural consistency, Street lighting, Visual clutter",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Noise & Sensory Environment",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How tolerant are you of noise pollution in urban environments?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 22,
          "question": "Which noise sources bother you most? (Select all that apply: traffic, construction, nightlife/bars, aircraft, trains, sirens, dogs barking, loud music, street vendors, industrial)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 23,
          "question": "How important is noise ordinance enforcement and designated quiet hours?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 24,
          "question": "How important is nighttime aesthetic appeal (lighting, ambiance) compared to daytime appearance?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 25,
          "question": "How concerned are you about light pollution and its impact on night sky visibility and sleep quality?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 26,
          "question": "How do you feel about street vendors and temporary commercial activities in your neighborhood?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 27,
          "question": "How tolerant are you of street-level commercial activity and bustling energy?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 28,
          "question": "How important is clean, well-maintained sidewalk and pedestrian area quality?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 29,
          "question": "How important is public art and community beautification projects?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 30,
          "question": "Rank these sensory environment factors from most to least important: Noise control, Quiet hours enforcement, Light pollution, Street activity levels, Pedestrian area quality",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Social Environment & Public Safety Perception",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How does visible homelessness affect your comfort in a city?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 32,
          "question": "How do you prefer cities address homelessness challenges? (Select one: shelters/services, enforcement/relocation, housing-first programs, mental health/addiction services, mixed approach)",
          "type": "Single-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 33,
          "question": "How important is feeling safe walking alone during daytime hours?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "safety_security"]
        },
        {
          "number": 34,
          "question": "How important is feeling safe walking alone during nighttime hours?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "safety_security"]
        },
        {
          "number": 35,
          "question": "Which public safety features matter most for nighttime comfort? (Select all that apply: street lighting, police patrols, security cameras, emergency call stations, well-traveled paths, 24-hour businesses)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 36,
          "question": "How do you feel about public intoxication and substance use visibility?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 37,
          "question": "How comfortable are you with diverse socioeconomic populations in public spaces?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 38,
          "question": "How important is active community engagement in neighborhood maintenance?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 39,
          "question": "How do you feel about visible security measures (cameras, guards, barriers) in your neighborhood?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 40,
          "question": "Rank these social environment factors from most to least important: Homelessness management, Daytime safety, Nighttime safety, Community engagement, Socioeconomic diversity",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Green Spaces & Nature Access",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How essential is access to parks and green spaces for your well-being?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 42,
          "question": "What is the maximum distance you would want to walk to a quality park or green space?",
          "type": "Range",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 43,
          "question": "Which green space features are most important? (Select all that apply: playgrounds, walking/running trails, sports fields, dog areas, picnic areas, botanical gardens, natural/wild areas, water features, seating/shade)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 44,
          "question": "How important is urban tree coverage and street landscaping?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 45,
          "question": "How do you feel about urban wildlife presence (birds, squirrels, foxes, deer)?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 46,
          "question": "How important is proximity to larger natural areas (mountains, beaches, forests) outside the city?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "outdoor_recreation"]
        },
        {
          "number": 47,
          "question": "How important are community gardens and urban agriculture opportunities?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 48,
          "question": "How important is it that green spaces feel safe and well-monitored?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 49,
          "question": "How important is access to beaches, lakes, or waterfront recreation areas?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "outdoor_recreation"]
        },
        {
          "number": 50,
          "question": "Rank these green space factors from most to least important: Park proximity, Park features, Tree coverage, Nature access, Waterfront access",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Waste Management & Sanitation",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is efficient and regular waste collection in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 52,
          "question": "Which waste management issues would bother you most? (Select all that apply: overflowing bins, irregular collection, no recycling, illegal dumping, odors from waste, visible waste facilities, rodents/pests near waste)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 53,
          "question": "How important are comprehensive recycling programs?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 54,
          "question": "How bothered are you by pest issues (rats, cockroaches, mosquitoes) in urban environments?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 55,
          "question": "How important are clean, well-maintained public facilities (restrooms, water fountains, benches)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 56,
          "question": "How do you feel about composting and organic waste programs?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 57,
          "question": "How important is efficient bulk item and large appliance disposal?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 58,
          "question": "How sensitive are you to odors from waste management and sanitation systems?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 59,
          "question": "How important is access to clear waste disposal and recycling guidelines in your language?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 60,
          "question": "Rank these waste management factors from most to least important: Collection reliability, Recycling programs, Pest control, Public facilities, Composting options",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Sustainability & Climate Resilience",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is the visibility and adoption of renewable energy infrastructure (solar panels, wind turbines, EV charging)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 62,
          "question": "How important is effective stormwater drainage and flood prevention infrastructure?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 63,
          "question": "How important is the cleanliness and ecological health of local waterways (rivers, canals, harbors, coastline)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 64,
          "question": "How concerned are you about proximity to industrial zones, factories, or major freight corridors?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 65,
          "question": "How important are urban heat island mitigation features (shade trees, reflective surfaces, cooling centers)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 66,
          "question": "How concerned are you about soil contamination or brownfield sites near residential areas?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 67,
          "question": "How important is effective seasonal environmental management (snow removal, leaf clearing, monsoon drainage, wildfire smoke response)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 68,
          "question": "How concerned are you about proximity to high-voltage power lines, cell towers, or electrical substations?",
          "type": "Likert-Concern",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 69,
          "question": "How willing are you to support higher taxes for environmental improvements and sustainability?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 70,
          "question": "Rank these sustainability factors from most to least important: Renewable energy, Flood prevention, Waterway health, Heat mitigation, Seasonal management",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Property & Community Maintenance Standards",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is enforcement of property upkeep and maintenance standards (no abandoned buildings, overgrown lots, derelict vehicles)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 72,
          "question": "How important is the accessibility of public spaces for people with mobility challenges?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 73,
          "question": "How important is the presence of community beautification programs (flower boxes, murals, adopt-a-street)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 74,
          "question": "How important is the management of pet waste in public spaces?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 75,
          "question": "How important is the condition of public infrastructure (road surfaces, bridges, tunnels, retaining walls)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance", "transportation_mobility"]
        },
        {
          "number": 76,
          "question": "How important is community participation in environmental stewardship (neighborhood cleanups, tree planting)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 77,
          "question": "How tolerant are you of construction and renovation debris in your neighborhood?",
          "type": "Likert-Comfort",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 78,
          "question": "How important are extensive street cleaning programs?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 79,
          "question": "How important is consistent neighborhood character and maintenance standards across the whole area?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 80,
          "question": "Rank these maintenance factors from most to least important: Property upkeep enforcement, Public accessibility, Beautification programs, Infrastructure condition, Street cleaning",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Environmental Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept higher noise levels in exchange for a more vibrant, walkable neighborhood?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept less green space for proximity to city center amenities?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 83,
          "question": "How willing are you to accept imperfect or aging park facilities if the overall neighborhood is safe and clean?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 84,
          "question": "How willing are you to accept some visual clutter (signage, construction) in a rapidly developing, improving area?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 85,
          "question": "How willing are you to accept different environmental and cleanliness standards than your home country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 86,
          "question": "How important is balancing urban density with green space preservation?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 87,
          "question": "How important is climate-appropriate urban design and planning?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 88,
          "question": "How important are innovative green building features (rooftop gardens, living walls, passive design)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 89,
          "question": "How do you prefer your neighborhood balance between natural/wild environments and manicured/maintained spaces?",
          "type": "Slider",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Noise vs. vibrancy, Green space vs. location, Facility quality vs. safety, Visual order vs. development, Environmental standards flexibility",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    },
    {
      "title": "Overall Environment Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which environment issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: severe air pollution, unsafe water, no green spaces, excessive noise, poor waste management, industrial proximity, no environmental regulations, visible homelessness crisis, pest problems, no recycling)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 92,
          "question": "Which environment features are non-negotiable must-haves? (Select all that apply: clean air, safe water, nearby parks, quiet residential areas, reliable waste collection, clean streets, tree-lined streets, public facilities, recycling programs, sustainable infrastructure)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank environment and community appearance as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 94,
          "question": "How willing are you to accept a less pristine environment in exchange for lower cost of living or better weather?",
          "type": "Likert-Willingness",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 95,
          "question": "How important is it that your destination's environmental quality is improving and trending upward?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 96,
          "question": "Which community issues would most likely make you avoid certain areas? (Select all that apply: crime, homelessness, noise, pollution, poor maintenance, traffic, industrial activity, overcrowding, lack of nature)",
          "type": "Multi-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 97,
          "question": "How do you prefer cities handle public events and large gatherings near residential areas?",
          "type": "Single-select",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 98,
          "question": "How important is living in an innovative, environmentally forward-thinking community?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 99,
          "question": "How willing are you to adapt to a very different environmental aesthetic than your home country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 100,
          "question": "Rank these overall environment categories from most to least important for your relocation: Air quality & health, Visual appeal, Noise & sensory, Social environment, Green spaces, Waste management, Sustainability, Maintenance standards, Environmental trade-offs, Overall environmental investment",
          "type": "Ranking",
          "modules": ["environment_community_appearance"]
        }
      ]
    }
  ]
};
