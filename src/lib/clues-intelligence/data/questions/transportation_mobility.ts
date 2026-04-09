import type { QuestionModule } from './types';

// Transportation & Mobility — 100 questions
// Module ID: transportation_mobility

export const transportationMobilityQuestions: QuestionModule = {
  "moduleId": "transportation_mobility",
  "moduleName": "Transportation & Mobility",
  "fileName": "TRANSPORTATION_MOBILITY_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Daily Mobility & Commute",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "Which modes of transport do you currently rely on most? (Select all that apply: personal car, public bus, metro/subway, train/rail, bicycle, e-bike/e-scooter, walking, motorcycle/scooter, ride-hailing apps, taxi, car-sharing, ferry/boat)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 2,
          "question": "How often do you currently use public transportation in your daily life?",
          "type": "Likert-Frequency",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 3,
          "question": "How comfortable are you with long daily commutes (over 45 minutes one-way)?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 4,
          "question": "What is your maximum acceptable daily commute time (one-way in minutes)?",
          "type": "Range",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 5,
          "question": "How important is living in a walkable area where most daily needs are within 10-15 minutes on foot?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 6,
          "question": "How important is commute time predictability and reliability?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 7,
          "question": "How much are you willing to spend monthly on transportation (all modes combined)?",
          "type": "Range",
          "modules": ["transportation_mobility", "financial_banking"]
        },
        {
          "number": 8,
          "question": "Would you prefer to live without owning a car if public transportation options were excellent?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 9,
          "question": "What will be your primary daily activity upon relocating? (Select one: commuting to office, working from home, attending school/university, retired/leisure, business ownership, combination)",
          "type": "Single-select",
          "modules": ["transportation_mobility", "professional_career", "education_learning"]
        },
        {
          "number": 10,
          "question": "Rank these daily mobility factors from most to least important: Commute time, Walkability, Transport cost, Mode variety, Commute predictability",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Public Transit Quality & Access",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is living within walking distance (10 minutes) of public transit stops?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 12,
          "question": "How important is metro/subway or train access within 15 minutes of your home?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 13,
          "question": "Which public transport modes are most important to you? (Select all that apply: metro/subway, bus, tram/streetcar, commuter rail, light rail, ferry, cable car/funicular)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 14,
          "question": "How important is 24/7 or late-night public transport availability?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 15,
          "question": "How important is public transport reliability (on-time performance, consistent schedules)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 16,
          "question": "How important is seamless integration between different transport modes (unified tickets, easy transfers)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 17,
          "question": "How tolerant are you of crowded, standing-room-only public transport during peak hours?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 18,
          "question": "How comfortable are you using public transportation where signage and announcements are not in your language? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 19,
          "question": "How important is the cleanliness and comfort of public transit vehicles and stations?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 20,
          "question": "Rank these transit quality factors from most to least important: Proximity to transit, Reliability, 24/7 availability, Mode integration, Comfort/cleanliness",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Vehicle Ownership & Driving",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is car ownership to your lifestyle?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 22,
          "question": "Do you plan to own a personal car in your destination?",
          "type": "Yes/No",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 23,
          "question": "Do you hold a valid driver's license recognized internationally or easily convertible?",
          "type": "Yes/No",
          "modules": ["transportation_mobility", "legal_immigration"]
        },
        {
          "number": 24,
          "question": "How comfortable are you driving on the opposite side of the road from what you are used to?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 25,
          "question": "How important is having dedicated private parking at your residence?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 26,
          "question": "How concerned are you about fuel costs, tolls, and vehicle insurance in your destination?",
          "type": "Likert-Concern",
          "modules": ["transportation_mobility", "financial_banking"]
        },
        {
          "number": 27,
          "question": "Do you plan to own or need access to an electric vehicle (EV)?",
          "type": "Yes/No",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 28,
          "question": "How important is EV charging infrastructure availability in your area?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 29,
          "question": "Would you consider car-sharing or vehicle subscription services as an alternative to ownership?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 30,
          "question": "Rank these vehicle factors from most to least important: Car ownership, Parking availability, Driving comfort, Fuel/insurance costs, EV infrastructure",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Cycling, Walking & Micromobility",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is dedicated cycling infrastructure (protected bike lanes, bike paths, bike parking)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 32,
          "question": "Would you use cycling as a primary mode of daily transportation if safe infrastructure existed?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 33,
          "question": "How important is access to bike-sharing or e-scooter-sharing programs?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 34,
          "question": "How important is pedestrian infrastructure quality (wide sidewalks, safe crosswalks, pedestrian zones, car-free streets)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 35,
          "question": "How comfortable are you cycling in mixed traffic with cars and buses?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 36,
          "question": "How important is flat or gentle terrain for cycling and walking as daily transportation?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 37,
          "question": "How important is pedestrian and cyclist safety and priority at intersections?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "safety_security"]
        },
        {
          "number": 38,
          "question": "How concerned are you about theft and security for personal bicycles, e-bikes, or scooters?",
          "type": "Likert-Concern",
          "modules": ["transportation_mobility", "safety_security"]
        },
        {
          "number": 39,
          "question": "Do you own or plan to regularly use a personal bicycle, e-bike, or scooter for transportation?",
          "type": "Yes/No",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 40,
          "question": "Rank these micromobility factors from most to least important: Cycling infrastructure, Bike-sharing access, Pedestrian quality, Cyclist safety, Terrain suitability",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Road Conditions & Driving Culture",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is overall road surface quality and maintenance?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 42,
          "question": "How concerned are you about aggressive driving culture, road rage, and driver behavior in your destination?",
          "type": "Likert-Concern",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 43,
          "question": "How important is enforcement of traffic laws and road safety regulations?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 44,
          "question": "How do you feel about locations where motorcycles, tuk-tuks, or informal transport dominate the roads?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 45,
          "question": "How important is the availability of roadside assistance and emergency services on highways?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 46,
          "question": "How do extreme weather conditions (snow, ice, flooding, sandstorms) affecting roads influence your location preference?",
          "type": "Likert-Concern",
          "modules": ["transportation_mobility", "climate_weather"]
        },
        {
          "number": 47,
          "question": "How important is the availability of adequate street parking and public parking near daily destinations?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 48,
          "question": "How do you feel about traffic congestion levels in your destination?",
          "type": "Likert-Concern",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 49,
          "question": "How willing are you to adapt to very different driving norms and road conditions? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 50,
          "question": "Rank these road factors from most to least important: Road quality, Driving culture, Traffic law enforcement, Weather impact, Congestion levels",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Transportation Safety & Accessibility",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is station and stop safety (lighting, CCTV, staff presence, emergency call points)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "safety_security"]
        },
        {
          "number": 52,
          "question": "How important is wheelchair, stroller, and mobility-aid accessibility in transport systems?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "family_children"]
        },
        {
          "number": 53,
          "question": "Do you or any household member currently have mobility limitations requiring accessible transportation?",
          "type": "Yes/No",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 54,
          "question": "Do you expect to need elderly-friendly transportation features (low-step buses, priority seating, accessible stations) in the future?",
          "type": "Yes/No",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 55,
          "question": "Which accessibility features are necessary for your household? (Select all that apply: wheelchair ramps, elevator access, audio announcements, tactile guidance, low-floor vehicles, priority seating, companion seating, none needed)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 56,
          "question": "How important is personal safety while using public transport, especially at night?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "safety_security"]
        },
        {
          "number": 57,
          "question": "How important is transport system availability in English or your primary language (signage, announcements, apps)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 58,
          "question": "How important is the availability and affordability of ride-hailing and taxi services?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 59,
          "question": "How important is the safety and regulation of taxi and ride-hailing services (licensed drivers, GPS tracking)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 60,
          "question": "Rank these safety/accessibility factors from most to least important: Station safety, Wheelchair accessibility, Nighttime safety, Language accessibility, Ride-hailing safety",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Intercity & Regional Travel",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How often do you expect to travel between cities or regions within your destination country?",
          "type": "Likert-Frequency",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 62,
          "question": "How important is access to high-speed rail or efficient intercity train networks?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 63,
          "question": "How important is proximity to an international airport with direct flights to your home country or key destinations?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 64,
          "question": "How frequently do you expect to travel internationally from your destination?",
          "type": "Likert-Frequency",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 65,
          "question": "How important is easy access to neighboring countries by land, sea, or short flights?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 66,
          "question": "How important is the availability of long-distance bus or coach services for budget regional travel?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 67,
          "question": "How do you feel about ferry or boat services as a regular mode of intercity or island transport?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 68,
          "question": "How important is seamless border-crossing infrastructure (Schengen, visa-free zones) for your travel lifestyle?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "legal_immigration"]
        },
        {
          "number": 69,
          "question": "How important is the availability of car rental services for weekend or holiday road trips?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 70,
          "question": "Rank these intercity travel factors from most to least important: High-speed rail, International airport, Neighboring country access, Long-distance bus, Border-crossing ease",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Transport Technology & Innovation",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is real-time transit tracking and mobile app integration for public transport?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "technology_connectivity"]
        },
        {
          "number": 72,
          "question": "How important is contactless or mobile payment acceptance across all transportation modes?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "technology_connectivity"]
        },
        {
          "number": 73,
          "question": "How important is a unified transit card or payment system that works across buses, trains, ferries, and ride-hailing?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 74,
          "question": "How important is real-time traffic and navigation data quality (Google Maps, Waze accuracy)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 75,
          "question": "How do you feel about autonomous vehicles and self-driving transport options becoming available?",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 76,
          "question": "How do you feel about congestion pricing, low-emission zones, or car-restriction policies in city centers?",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 77,
          "question": "How important is it that your city actively invests in reducing transportation carbon emissions (electric buses, car-free zones)?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 78,
          "question": "How important is the city's long-term transportation master plan and investment in future infrastructure?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 79,
          "question": "How willing are you to pay premium for sustainable and eco-friendly transport options?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 80,
          "question": "Rank these technology factors from most to least important: Real-time tracking, Mobile payment, Unified transit card, Navigation accuracy, Sustainability investment",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Transportation Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept longer commutes in exchange for a more affordable or desirable neighborhood?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 82,
          "question": "How willing are you to give up car ownership for excellent public transit in a new city?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 83,
          "question": "How willing are you to accept limited public transit if the area is highly walkable and bikeable?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 84,
          "question": "How willing are you to accept chaotic or informal transportation systems if the overall cost of living is low? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 85,
          "question": "How willing are you to accept limited intercity travel options in exchange for better local transportation?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 86,
          "question": "How willing are you to adapt your daily routine to fit available transportation schedules?",
          "type": "Likert-Willingness",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 87,
          "question": "How important is transportation quality versus cost (willingness to pay more for better service)?",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 88,
          "question": "How many people in your household (including yourself) will need daily transportation?",
          "type": "Range",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 89,
          "question": "Do you have school-aged children who will require transportation to school?",
          "type": "Yes/No",
          "modules": ["transportation_mobility", "family_children", "education_learning"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Commute vs. neighborhood, Car ownership vs. transit, Transit vs. walkability, System quality vs. cost, Local vs. intercity access",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    },
    {
      "title": "Overall Transportation Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which transportation issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no public transit, dangerous roads, no airport access, no walkability, no cycling infrastructure, extreme traffic congestion, no ride-hailing, no accessibility features, unreliable transport)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 92,
          "question": "Which transportation features are non-negotiable must-haves? (Select all that apply: reliable public transit, international airport, walkable neighborhoods, cycling infrastructure, safe roads, ride-hailing services, EV charging, 24/7 transit, accessible transport)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank transportation and mobility as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 94,
          "question": "Which potential transportation challenges concern you most? (Select up to 3: language barriers, driving on opposite side, chaotic traffic, expensive transport, poor road conditions, no public transit, extreme weather impact, crime on transit)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 95,
          "question": "How important is it that your destination's transportation infrastructure is improving and expanding?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 96,
          "question": "How willing are you to completely change your transportation habits for a new country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 97,
          "question": "How confident are you navigating unfamiliar urban transportation systems?",
          "type": "Likert-Comfort",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 98,
          "question": "How important is transportation affordability relative to your income?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "financial_banking"]
        },
        {
          "number": 99,
          "question": "How important is your destination's overall transportation safety record?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility", "safety_security"]
        },
        {
          "number": 100,
          "question": "Rank these overall transportation categories from most to least important for your relocation: Daily mobility & commute, Public transit quality, Vehicle ownership & driving, Cycling & micromobility, Road conditions, Safety & accessibility, Intercity travel, Transport technology, Transportation trade-offs, Overall transportation investment",
          "type": "Ranking",
          "modules": ["transportation_mobility"]
        }
      ]
    }
  ]
};
