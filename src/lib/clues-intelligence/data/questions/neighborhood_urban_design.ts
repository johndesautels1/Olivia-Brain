import type { QuestionModule } from './types';

// Neighborhood & Urban Design — 100 questions
// Module ID: neighborhood_urban_design

export const neighborhoodUrbanDesignQuestions: QuestionModule = {
  "moduleId": "neighborhood_urban_design",
  "moduleName": "Neighborhood & Urban Design",
  "fileName": "NEIGHBORHOOD_URBAN_DESIGN_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Getting Around",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How would you like the streets in your new neighborhood to be laid out? (Select one: grid pattern, winding/organic, cul-de-sac, mixed, pedestrian-only center)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 2,
          "question": "What is your ideal street width for neighborhood roads? (Select one: narrow pedestrian-priority, medium two-lane, wide boulevard, mixed widths)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 3,
          "question": "Which sidewalk features are important to you? (Select all that apply: wide sidewalks, tree-lined, benches, lighting, ADA-accessible, separated from traffic, covered/shaded, smooth surface)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 4,
          "question": "How important is it that traffic moves slowly through your neighborhood (traffic calming, speed bumps, 20mph zones)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "safety_security"]
        },
        {
          "number": 5,
          "question": "Which bicycle facilities would you like? (Select all that apply: bike lanes, bike-share stations, secure bike parking, bike repair stations, protected cycleways, bike trails)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 6,
          "question": "How should parking be handled in your ideal neighborhood? (Select one: on-street abundant, garage/structure, underground, limited/car-free, mixed)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 7,
          "question": "How connected should your neighborhood streets be to surrounding areas (through-streets vs. isolated enclave)?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 8,
          "question": "Which pedestrian safety features matter to you? (Select all that apply: crosswalks, raised intersections, pedestrian signals, roundabouts, car-free zones, speed cameras, bollards)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "safety_security"]
        },
        {
          "number": 9,
          "question": "How important is it to be able to walk to daily needs (grocery, pharmacy, cafe) within 10 minutes?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "shopping_services"]
        },
        {
          "number": 10,
          "question": "Rank these getting-around priorities from most to least important: Walkability, Sidewalk quality, Traffic calming, Bike facilities, Parking design",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Look & Feel",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is consistent architectural style in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 12,
          "question": "What building heights do you prefer? (Select one: 1-2 stories, 3-5 stories, 6-10 stories, 10-20 stories, mixed heights, no preference)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 13,
          "question": "How important is preserving historic buildings and neighborhood character?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "cultural_heritage_traditions"]
        },
        {
          "number": 14,
          "question": "Which architectural features appeal to you? (Select all that apply: balconies, courtyards, front porches, bay windows, stone/brick facades, colorful buildings, modern glass, green roofs, ornate details)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 15,
          "question": "How much green space should be integrated with buildings (green roofs, vertical gardens, tree canopy)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 16,
          "question": "What types of public art and culture should be visible? (Select all that apply: murals, sculptures, fountains, interactive art, light installations, performance spaces, cultural markers, memorial/historic plaques)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "arts_culture"]
        },
        {
          "number": 17,
          "question": "Should new buildings blend with historic buildings or stand out as modern contrast?",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 18,
          "question": "How important is high-quality building design and exterior maintenance?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 19,
          "question": "What type of neighborhood character appeals most to you? (Select one: historic/charming, modern/sleek, bohemian/artistic, upscale/polished, eclectic/mixed, village/cozy)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 20,
          "question": "Rank these look & feel priorities from most to least important: Architectural consistency, Historic preservation, Building quality, Green integration, Public art",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Open Spaces & Parks",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "What type of main public space would you prefer in your neighborhood? (Select one: formal park/garden, town square/plaza, waterfront promenade, village green, pocket parks, nature reserve)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 22,
          "question": "Which park features are important to you? (Select all that apply: playground, walking trails, sports courts, dog park, gardens, water features, picnic areas, exercise equipment, amphitheater, skate park)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "outdoor_recreation"]
        },
        {
          "number": 23,
          "question": "How important are street trees and green corridors throughout the neighborhood?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 24,
          "question": "What activities should public squares support? (Select all that apply: farmers markets, outdoor dining, community events, street performers, relaxation/seating, children's play, art displays, fitness classes)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 25,
          "question": "How do you prefer the balance between natural/wild and manicured/maintained parks?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 26,
          "question": "Which water features would you enjoy? (Select all that apply: fountains, ponds, streams, splash pads, reflecting pools, marina, canal, none)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 27,
          "question": "How important is access to nature and wildlife within walking distance?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "outdoor_recreation"]
        },
        {
          "number": 28,
          "question": "How should public spaces be lit at night? (Select one: bright/well-lit, warm ambient, minimal/natural, smart/motion-activated, festival/decorative)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 29,
          "question": "What types of seating and gathering spots do you want? (Select all that apply: park benches, cafe tables, amphitheater seating, hammocks/loungers, picnic tables, shaded pavilions, waterfront seating)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 30,
          "question": "Rank these open space priorities from most to least important: Park type, Park features, Street trees, Water features, Nature access",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Services & Amenities",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "Which community facilities are essential? (Select all that apply: library, community center, post office, police station, fire station, place of worship, co-working space, health clinic, bank/ATM)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 32,
          "question": "How should shops and restaurants be integrated into your neighborhood? (Select one: ground-floor retail on main street, dedicated commercial district, small corner shops, no commercial/purely residential, mixed throughout)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 33,
          "question": "How important is a diverse food and dining scene within walking distance?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "food_dining"]
        },
        {
          "number": 34,
          "question": "Which educational facilities should be nearby? (Select all that apply: primary school, secondary school, daycare/preschool, university, library, adult education, language school, music/art school)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "education_learning"]
        },
        {
          "number": 35,
          "question": "How close should medical facilities be to your home?",
          "type": "Range",
          "modules": ["neighborhood_urban_design", "health_wellness"]
        },
        {
          "number": 36,
          "question": "Which recreation facilities do you want within your neighborhood? (Select all that apply: gym/fitness, swimming pool, tennis courts, yoga/dance studio, sports fields, playground, skate park, climbing wall)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "outdoor_recreation"]
        },
        {
          "number": 37,
          "question": "How important is it that the neighborhood has its own distinct identity and community brand?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 38,
          "question": "How important is access to public transit stops within a 5-minute walk?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 39,
          "question": "Which everyday services should be walkable? (Select all that apply: grocery, pharmacy, dry cleaner, bank, post office, hairdresser, hardware store, vet, cafe, restaurant)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "shopping_services"]
        },
        {
          "number": 40,
          "question": "Rank these services priorities from most to least important: Community facilities, Retail integration, Dining variety, Educational facilities, Recreation facilities",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Environmental Design",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Which green features are important in your neighborhood? (Select all that apply: solar panels, EV charging, rain gardens, permeable pavement, green roofs, composting facilities, community gardens, native plantings)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "environment_community_appearance"]
        },
        {
          "number": 42,
          "question": "How important is living in an environmentally sustainable neighborhood?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 43,
          "question": "How should the neighborhood handle climate challenges (flooding, heat, storms)? (Select one: engineered solutions, nature-based solutions, mixed approach, not a concern)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design", "climate_weather"]
        },
        {
          "number": 44,
          "question": "Which pollution controls matter to you? (Select all that apply: air quality monitoring, noise reduction, light pollution control, water quality, soil remediation, traffic emissions reduction)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "environment_community_appearance"]
        },
        {
          "number": 45,
          "question": "How visible should renewable energy be in your neighborhood (solar panels, wind, EV infrastructure)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 46,
          "question": "How important is access to local food (farmers markets, community gardens, urban farms)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "food_dining"]
        },
        {
          "number": 47,
          "question": "What nature and wildlife features do you want? (Select all that apply: bird habitats, butterfly gardens, wildlife corridors, nature trails, ponds/wetlands, native plantings, bat boxes)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "outdoor_recreation"]
        },
        {
          "number": 48,
          "question": "How should waste and recycling be managed in your neighborhood? (Select one: curbside collection, communal bins, underground systems, pneumatic waste, smart bins)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 49,
          "question": "How important is protection from natural disasters in neighborhood design (flood barriers, fire breaks, seismic design)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "safety_security"]
        },
        {
          "number": 50,
          "question": "Rank these environmental design priorities from most to least important: Sustainability features, Climate resilience, Pollution control, Local food access, Nature/wildlife",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Housing Mix & Community",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "What mix of housing types do you prefer? (Select one: all single-family, mostly single-family with some townhouses, mixed density, mostly apartments, fully mixed all types)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design", "housing_property"]
        },
        {
          "number": 52,
          "question": "What economic diversity would you prefer in your neighborhood? (Select one: homogeneous/similar income, moderate mix, fully diverse mixed income, no preference)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 53,
          "question": "How important is living near people from your cultural or ethnic background?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 54,
          "question": "Which household types should the neighborhood accommodate? (Select all that apply: families with children, young professionals, retirees, students, multi-generational, single-person, couples, group/shared housing)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 55,
          "question": "How dense should housing be? (Select one: very low/rural, low/suburban, medium/town, high/urban, very high/dense urban)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design", "housing_property"]
        },
        {
          "number": 56,
          "question": "What special housing options interest you? (Select all that apply: co-housing, live-work units, eco-homes, smart homes, tiny homes, multigenerational, accessible/universal design)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "housing_property"]
        },
        {
          "number": 57,
          "question": "How important is a strong sense of community and neighborly connection?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 58,
          "question": "How important is private outdoor space for each home (yard, balcony, terrace)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 59,
          "question": "Which shared facilities would you use? (Select all that apply: community pool, shared garden, tool library, guest suite, co-working space, laundry facility, party room, roof deck)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 60,
          "question": "Rank these housing & community priorities from most to least important: Housing mix, Economic diversity, Cultural community, Housing density, Community connection",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Accessibility & Safety",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Which accessibility features are important? (Select all that apply: wheelchair ramps, tactile paving, audio signals, level sidewalks, accessible transit stops, stroller-friendly paths, elevator access, accessible playgrounds)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 62,
          "question": "How should the neighborhood prioritize pedestrians versus cars?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 63,
          "question": "How important is it that children can play safely in the neighborhood (low traffic, safe play areas)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "family_children", "safety_security"]
        },
        {
          "number": 64,
          "question": "Which alternative transport options do you want? (Select all that apply: e-scooter sharing, bike sharing, car sharing, golf cart lanes, water taxi, shuttle service, ride-hailing pickup zones)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 65,
          "question": "How should deliveries and services access homes? (Select one: front door, dedicated service access, package lockers, concierge, no preference)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 66,
          "question": "How important is accommodation for elderly residents (benches, handrails, slow crossing signals)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 67,
          "question": "Which safety features matter to you? (Select all that apply: well-lit paths, emergency call stations, security patrols, CCTV, gated entry, neighborhood watch, safe rooms, fire hydrants)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "safety_security"]
        },
        {
          "number": 68,
          "question": "How important is it that the neighborhood accommodates pets (dog parks, pet waste stations, pet-friendly businesses)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "pets_animals"]
        },
        {
          "number": 69,
          "question": "How important is easy navigation and wayfinding (clear signage, landmark features, intuitive layout)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 70,
          "question": "Rank these accessibility priorities from most to least important: Universal accessibility, Pedestrian priority, Child safety, Elderly accommodation, Pet accommodation",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Social Life & Community Spaces",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "Where would you like to socialize in your neighborhood? (Select all that apply: cafes, bars, parks, community center, plazas, sports facilities, neighbors' homes, co-working spaces, rooftops)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 72,
          "question": "Should different age groups mix in shared spaces or have separate designated areas?",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 73,
          "question": "How important are spaces for community events and festivals (amphitheater, town square, event lawn)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 74,
          "question": "What community activities interest you? (Select all that apply: outdoor cinema, farmers market, street festival, art walks, yoga in park, running clubs, book clubs, community dinners, workshops)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 75,
          "question": "How much privacy do you want from neighbors?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 76,
          "question": "What types of community groups are important? (Select all that apply: sports clubs, cultural groups, volunteering, environmental, parent groups, professional networks, hobby clubs, religious groups, political/civic)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 77,
          "question": "How important is cultural diversity in your neighborhood?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "cultural_heritage_traditions"]
        },
        {
          "number": 78,
          "question": "How should the neighborhood support working from home? (Select all that apply: co-working spaces, quiet zones, fast internet, delivery infrastructure, walkable cafes, meeting rooms)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "professional_career", "technology_connectivity"]
        },
        {
          "number": 79,
          "question": "What evening and nightlife options do you want in your neighborhood? (Select all that apply: restaurants, bars, live music, cinema, late-night food, quiet after 10PM, theater, night markets)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "entertainment_nightlife"]
        },
        {
          "number": 80,
          "question": "Rank these social life priorities from most to least important: Socializing spaces, Community events, Privacy level, Community groups, Nightlife options",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Technology & Innovation",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Which smart technology features interest you? (Select all that apply: smart lighting, smart parking, WiFi hotspots, digital kiosks, smart waste bins, environmental sensors, smart traffic, charging stations)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design", "technology_connectivity"]
        },
        {
          "number": 82,
          "question": "How do you feel about surveillance and security technology (cameras, facial recognition, license plate readers) in your neighborhood?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design", "safety_security"]
        },
        {
          "number": 83,
          "question": "How important is living in an innovative and forward-thinking area?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 84,
          "question": "Which future technologies should the neighborhood accommodate? (Select all that apply: autonomous vehicles, drone delivery, hyperloop/transit, solar roads, vertical farming, smart grid, AR navigation, 3D-printed buildings)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 85,
          "question": "Should the neighborhood preserve traditional character or embrace modern change?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 86,
          "question": "How important is ultra-fast digital connectivity (fiber internet, 5G, mesh WiFi)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "technology_connectivity"]
        },
        {
          "number": 87,
          "question": "Which creative and innovation spaces appeal to you? (Select all that apply: maker spaces, tech incubators, art studios, recording studios, fabrication labs, innovation hubs, startup garages)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 88,
          "question": "How should the neighborhood adapt to climate change (cooling infrastructure, flood design, fire resilience)?",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design", "climate_weather"]
        },
        {
          "number": 89,
          "question": "How important is excellent mobile phone coverage and internet throughout the neighborhood?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "technology_connectivity"]
        },
        {
          "number": 90,
          "question": "Rank these technology priorities from most to least important: Smart infrastructure, Digital connectivity, Innovation spaces, Future tech readiness, Traditional vs. modern balance",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    },
    {
      "title": "Governance & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "How should the neighborhood be managed? (Select one: HOA/residents association, local government, professional management company, community cooperative, minimal governance)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design", "social_values_governance"]
        },
        {
          "number": 92,
          "question": "How strict should design and maintenance rules be?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 93,
          "question": "How important is having a say in neighborhood decisions (participatory governance, community meetings)?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "social_values_governance"]
        },
        {
          "number": 94,
          "question": "Which issues should neighbors have control over? (Select all that apply: building design, noise levels, commercial activity, parking, landscaping, events, short-term rentals, pet rules, development projects)",
          "type": "Multi-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 95,
          "question": "How should conflicts between neighbors be resolved? (Select one: mediation, HOA/management, legal process, community vote, informal discussion)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 96,
          "question": "How important is it that rules are fairly and consistently enforced?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 97,
          "question": "How willing are you to adapt to a neighborhood governance style very different from your home country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 98,
          "question": "How important are good relationships between the neighborhood and local government?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 99,
          "question": "On a scale of 0-100, how would you rank neighborhood and urban design as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 100,
          "question": "Rank these overall neighborhood categories from most to least important for your relocation: Getting around, Look & feel, Open spaces, Services & amenities, Environmental design, Housing & community, Accessibility & safety, Social life, Technology & innovation, Governance & management",
          "type": "Ranking",
          "modules": ["neighborhood_urban_design"]
        }
      ]
    }
  ]
};
