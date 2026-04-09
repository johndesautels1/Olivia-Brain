import type { QuestionModule } from './types';

// Housing & Property Preferences — 100 questions
// Module ID: housing_property

export const housingPropertyQuestions: QuestionModule = {
  "moduleId": "housing_property",
  "moduleName": "Housing & Property Preferences",
  "fileName": "HOUSING_PROPERTY_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Housing Type & Structure",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "What is your ideal primary residence type? (Select one: detached house, semi-detached/duplex, townhouse, apartment/condo, penthouse, villa, farmhouse, loft/converted space)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 2,
          "question": "What building height/density environment do you prefer? (Select one: single-family low-rise, mid-rise 3-6 stories, high-rise 7-20 stories, skyscraper 20+, mixed)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 3,
          "question": "How important is having a detached, standalone home versus attached housing?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 4,
          "question": "What is your tolerance for stairs and vertical living (walk-up apartments, multi-story homes)?",
          "type": "Likert-Comfort",
          "modules": ["housing_property"]
        },
        {
          "number": 5,
          "question": "What is your preferred architectural style? (Select one: modern/contemporary, traditional/classical, Mediterranean, colonial, art deco, industrial/loft, tropical, no preference)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 6,
          "question": "What is your ideal private outdoor space? (Select one: large yard/garden, small garden, balcony/terrace, rooftop access, courtyard, none needed)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 7,
          "question": "How open are you to alternative or unique housing types (converted churches, warehouses, boats, tiny homes)?",
          "type": "Likert-Willingness",
          "modules": ["housing_property"]
        },
        {
          "number": 8,
          "question": "How important is that your home has climate-adaptive features (hurricane shutters, seismic reinforcement, flood elevation, insulation)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "climate_weather"]
        },
        {
          "number": 9,
          "question": "What is your preference for home age and renovation status? (Select one: new construction, recently renovated, move-in ready any age, willing to renovate, historic/original)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 10,
          "question": "Rank these housing structure factors from most to least important: Residence type, Building density, Architectural style, Outdoor space, Climate features",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Outdoor & Water Features",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is waterfront or water-adjacent living to you?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 12,
          "question": "If waterfront, what type of water access do you prefer? (Select one: oceanfront, lakefront, riverfront, canal, marina, no preference)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 13,
          "question": "Which water-related features do you desire? (Select all that apply: private beach access, boat dock/slip, pool, hot tub/spa, water sports storage, fishing access, surf access)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 14,
          "question": "What type of pool configuration do you prefer? (Select one: private pool, shared community pool, indoor pool, no pool needed)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 15,
          "question": "How important are outdoor cooking and entertaining spaces (BBQ area, outdoor kitchen, patio)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 16,
          "question": "Which outdoor structures are important to you? (Select all that apply: pergola/gazebo, covered patio, detached guest house, pool house, greenhouse, outdoor shower, fire pit)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 17,
          "question": "How important is having a private garden or cultivation space?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 18,
          "question": "How important is outdoor privacy from neighbors?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 19,
          "question": "How important are sustainable and self-sufficient property features (solar panels, rainwater collection, composting, geothermal)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 20,
          "question": "Rank these outdoor factors from most to least important: Water features/access, Pool, Outdoor entertaining, Garden space, Sustainability features",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Parking, Storage & Workspace",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is having a garage versus other parking options?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 22,
          "question": "How many vehicles need covered or protected parking?",
          "type": "Number",
          "modules": ["housing_property"]
        },
        {
          "number": 23,
          "question": "What is your maximum tolerance for parking distance from your front door?",
          "type": "Range",
          "modules": ["housing_property"]
        },
        {
          "number": 24,
          "question": "How important is guest and visitor parking availability?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 25,
          "question": "Which storage needs do you have? (Select all that apply: seasonal items, sports equipment, wine collection, hobby supplies, business inventory, vehicle/boat storage, tools/workshop)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 26,
          "question": "How important is having a workshop or project workspace on your property?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 27,
          "question": "How important is having a basement or cellar (for storage, wine, utilities)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 28,
          "question": "How important is direct indoor access from your parking area (attached garage, covered walkway)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 29,
          "question": "How important are delivery and service access features (package lockers, service entrance, loading area)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 30,
          "question": "Rank these parking/storage factors from most to least important: Covered parking, Storage space, Workshop, Guest parking, Direct home access",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Interior Features & Layout",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "What is your preferred interior layout? (Select one: open-plan, semi-open, traditional separated rooms, loft-style, flexible/modular)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 32,
          "question": "How important is the kitchen configuration to your lifestyle?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 33,
          "question": "Do you prefer the kitchen open to living areas or separated?",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 34,
          "question": "Which luxury interior amenities do you desire? (Select all that apply: walk-in closets, ensuite bathrooms, home theater, wine room, sauna/steam room, library, gym room, dressing room)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 35,
          "question": "How many bedrooms do you require?",
          "type": "Number",
          "modules": ["housing_property"]
        },
        {
          "number": 36,
          "question": "How important is abundant natural light and large windows?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 37,
          "question": "How important is smart home technology integration (automated lighting, climate, security, entertainment)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "technology_connectivity"]
        },
        {
          "number": 38,
          "question": "How important is a dedicated home office or remote work space?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "professional_career"]
        },
        {
          "number": 39,
          "question": "How important are energy efficiency and green building features (double-glazing, insulation, LED, water-saving)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 40,
          "question": "Rank these interior factors from most to least important: Layout/open plan, Kitchen quality, Natural light, Smart home tech, Home office",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Community & Neighborhood Setting",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "What type of community setting do you prefer? (Select one: urban center, suburban neighborhood, gated community, rural/countryside, resort/vacation community, mixed-use development)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 42,
          "question": "How important are community shared amenities (pools, gyms, parks, clubhouse)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 43,
          "question": "Which community amenities do you value? (Select all that apply: community pool, fitness center, tennis/sports courts, playground, walking trails, dog park, clubhouse, concierge, security gate)",
          "type": "Multi-select",
          "modules": ["housing_property", "family_children", "pets_animals"]
        },
        {
          "number": 44,
          "question": "What is your ideal maximum distance to essential services (grocery, pharmacy, medical)?",
          "type": "Range",
          "modules": ["housing_property", "health_wellness", "shopping_services"]
        },
        {
          "number": 45,
          "question": "How important is architectural harmony and visual consistency in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 46,
          "question": "How do you feel about tourist areas or vacation rental neighborhoods (Airbnb density)?",
          "type": "Likert-Comfort",
          "modules": ["housing_property"]
        },
        {
          "number": 47,
          "question": "How important is walkability and pedestrian-friendly design in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "transportation_mobility"]
        },
        {
          "number": 48,
          "question": "What level of community involvement do you prefer? (Select one: private/independent, casual neighborly, active participation, tight-knit community)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 49,
          "question": "How do you feel about Homeowners Associations (HOAs) or similar community governance?",
          "type": "Likert-Comfort",
          "modules": ["housing_property"]
        },
        {
          "number": 50,
          "question": "Rank these community factors from most to least important: Community setting type, Shared amenities, Proximity to services, Walkability, Community involvement",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Neighborhood Character & Safety",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is the neighborhood being family-friendly?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "family_children"]
        },
        {
          "number": 52,
          "question": "How do you feel about noise and activity levels in your neighborhood?",
          "type": "Likert-Comfort",
          "modules": ["housing_property"]
        },
        {
          "number": 53,
          "question": "What is your preferred population density? (Select one: very low/rural, low/suburban, medium/urban residential, high/city center, very high/dense urban)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 54,
          "question": "What age demographic mix do you prefer in your neighborhood?",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 55,
          "question": "How do you feel about ongoing neighborhood development and construction?",
          "type": "Likert-Comfort",
          "modules": ["housing_property"]
        },
        {
          "number": 56,
          "question": "How important is the quality of street design (tree-lined, well-lit, speed-controlled)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "neighborhood_urban_design"]
        },
        {
          "number": 57,
          "question": "How important are underground utilities versus overhead power lines?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 58,
          "question": "What is your preferred neighborhood maintenance standard?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 59,
          "question": "Which neighborhood features would deter you? (Select all that apply: heavy traffic, industrial proximity, flight paths, nightlife noise, construction, tourist crowds, high-rises, vacant lots)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 60,
          "question": "Rank these neighborhood character factors from most to least important: Family-friendliness, Noise levels, Population density, Street quality, Maintenance standards",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Property Financials & Ownership",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Are you looking to buy or rent in your destination? (Select one: buy only, rent only, rent then buy, flexible)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 62,
          "question": "What is your total housing budget (monthly rent or purchase price)?",
          "type": "Range",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 63,
          "question": "How important is the investment potential and appreciation prospects of your property?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 64,
          "question": "How important is having clear and straightforward foreign property ownership laws?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "legal_immigration"]
        },
        {
          "number": 65,
          "question": "How concerned are you about property taxes and annual real estate levies?",
          "type": "Likert-Concern",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 66,
          "question": "How important is access to mortgage financing as a foreign buyer?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 67,
          "question": "How important is the overall cost of property maintenance (utilities, repairs, insurance, staff) relative to your budget?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 68,
          "question": "How important is having a reliable property management service if you travel frequently?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 69,
          "question": "How important is rental income potential if you decide to rent out your property?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 70,
          "question": "Rank these financial factors from most to least important: Purchase/rental cost, Investment appreciation, Property taxes, Mortgage access, Maintenance costs",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Home Security & Resilience",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "What level of home security features do you require? (Select one: basic locks, alarm system, 24/7 monitored, gated/guarded, smart integrated security)",
          "type": "Single-select",
          "modules": ["housing_property", "safety_security"]
        },
        {
          "number": 72,
          "question": "How important is living in a gated or guarded community?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "safety_security"]
        },
        {
          "number": 73,
          "question": "How important are natural disaster resilience features (seismic reinforcement, flood protection, fire-resistant materials, storm shutters)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "climate_weather"]
        },
        {
          "number": 74,
          "question": "How important is backup power and utilities (generator, solar+battery, water tank)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 75,
          "question": "How important is home insurance availability and affordability in your destination?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 76,
          "question": "How important is it that the building meets modern safety codes (fire, structural, electrical)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "safety_security"]
        },
        {
          "number": 77,
          "question": "How important is building management and maintenance in apartment/condo buildings?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 78,
          "question": "How important is elevator access and reliability in multi-story buildings?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 79,
          "question": "How concerned are you about property crime in your area (break-ins, theft, vandalism)?",
          "type": "Likert-Concern",
          "modules": ["housing_property", "safety_security"]
        },
        {
          "number": 80,
          "question": "Rank these security factors from most to least important: Security systems, Gated community, Disaster resilience, Backup utilities, Building code compliance",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Deal-Breakers & Flexibility",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Which property factors would absolutely disqualify a property? (Select all that apply: no parking, no outdoor space, shared walls, no natural light, flood zone, no internet, poor construction, too far from services, no security, no elevator in high-rise)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 82,
          "question": "How willing are you to compromise on house quality for a better neighborhood?",
          "type": "Likert-Willingness",
          "modules": ["housing_property"]
        },
        {
          "number": 83,
          "question": "How willing are you to compromise on size for a better location?",
          "type": "Likert-Willingness",
          "modules": ["housing_property"]
        },
        {
          "number": 84,
          "question": "How tolerant are you of properties needing renovation or updates?",
          "type": "Likert-Willingness",
          "modules": ["housing_property"]
        },
        {
          "number": 85,
          "question": "Which features would you NEVER compromise on? (Select up to 3: location, size, price, outdoor space, parking, natural light, safety, kitchen quality, modern finishes)",
          "type": "Multi-select",
          "modules": ["housing_property"]
        },
        {
          "number": 86,
          "question": "How important is finding a \"forever home\" versus a temporary stepping-stone property?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 87,
          "question": "What is your preferred timeline for finding housing after relocating?",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 88,
          "question": "What percentage over budget would you pay for the perfect property?",
          "type": "Range",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 89,
          "question": "How important is having separate guest accommodations (guest room, guest house, mother-in-law suite)?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 90,
          "question": "Rank these flexibility factors from most to least important: Location vs. quality trade-off, Size vs. location, Renovation tolerance, Budget flexibility, Timeline flexibility",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    },
    {
      "title": "Overall Housing Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "How important is the historical or heritage significance of your home?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "cultural_heritage_traditions"]
        },
        {
          "number": 92,
          "question": "Which describes your ideal relationship with neighbors? (Select one: close friends, friendly acquaintances, polite but private, minimal interaction)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 93,
          "question": "Do you need multi-generational or accessibility features (wheelchair access, single-level living, wide doorways)?",
          "type": "Yes/No",
          "modules": ["housing_property", "family_children"]
        },
        {
          "number": 94,
          "question": "How important is having a laundry room or in-unit laundry?",
          "type": "Likert-Importance",
          "modules": ["housing_property"]
        },
        {
          "number": 95,
          "question": "How do seasonal changes affect your housing needs (heating, cooling, snow removal, hurricane prep)?",
          "type": "Likert-Concern",
          "modules": ["housing_property", "climate_weather"]
        },
        {
          "number": 96,
          "question": "Which housing issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no foreign ownership, unaffordable market, no rental options, poor construction quality, no financing, extreme property taxes, unsafe neighborhoods, no internet infrastructure)",
          "type": "Multi-select",
          "modules": ["housing_property", "legal_immigration", "financial_banking"]
        },
        {
          "number": 97,
          "question": "Which housing features are non-negotiable must-haves? (Select all that apply: modern kitchen, private outdoor space, parking, natural light, security, quiet neighborhood, proximity to services, internet infrastructure, air conditioning)",
          "type": "Multi-select",
          "modules": ["housing_property", "technology_connectivity"]
        },
        {
          "number": 98,
          "question": "How willing are you to accept different housing standards than your home country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["housing_property"]
        },
        {
          "number": 99,
          "question": "On a scale of 0-100, how would you rank housing and property as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["housing_property"]
        },
        {
          "number": 100,
          "question": "Rank these overall housing categories from most to least important for your relocation: Housing type & structure, Outdoor & water features, Parking & storage, Interior features, Community setting, Neighborhood character, Property financials, Security & resilience, Flexibility & deal-breakers, Overall housing investment",
          "type": "Ranking",
          "modules": ["housing_property"]
        }
      ]
    }
  ]
};
