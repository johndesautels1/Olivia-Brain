import type { QuestionModule } from './types';

// Arts & Culture — 100 questions
// Module ID: arts_culture

export const artsCultureQuestions: QuestionModule = {
  "moduleId": "arts_culture",
  "moduleName": "Arts & Culture",
  "fileName": "ARTS_CULTURE_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Museums & Galleries",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is access to world-class art museums in your ideal location?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 2,
          "question": "What types of museums are most important to you? (Select all that apply: fine art, contemporary art, natural history, science/technology, history/cultural, photography, design/architecture, children's museums, military/war, ethnographic)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 3,
          "question": "How frequently do you visit museums or galleries?",
          "type": "Likert-Frequency",
          "modules": ["arts_culture"]
        },
        {
          "number": 4,
          "question": "How important are special exhibitions and rotating displays versus permanent collections?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 5,
          "question": "How willing are you to pay premium prices for exceptional museum access (annual memberships, special events)?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 6,
          "question": "How important is English-language accessibility in museums and galleries?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 7,
          "question": "What type of gallery scene appeals to you most? (Select one: blue-chip/established, emerging/experimental, community, street art/urban, commercial, mixed)",
          "type": "Single-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 8,
          "question": "How important is it that museums reflect diverse global cultures, not just Western art?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 9,
          "question": "How important is the architectural significance of museum buildings themselves?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 10,
          "question": "Rank these museum factors from most to least important: Museum world-class quality, Exhibition variety, Gallery scene, Cultural diversity, English accessibility",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Theater & Performing Arts",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is access to live theater in your ideal location?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 12,
          "question": "What types of theatrical performances interest you? (Select all that apply: Broadway/West End-style musicals, dramatic plays, opera, ballet, modern dance, experimental theater, comedy/improv, cabaret, puppetry, circus arts)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 13,
          "question": "How important is access to live music venues of various sizes?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 14,
          "question": "What types of live music venues appeal to you? (Select all that apply: concert halls, intimate jazz clubs, rock/indie venues, outdoor amphitheaters, stadium concerts, DJ/electronic clubs, busking/street music, opera houses)",
          "type": "Multi-select",
          "modules": ["arts_culture", "entertainment_nightlife"]
        },
        {
          "number": 15,
          "question": "How frequently do you attend live performances (theater, music, dance)?",
          "type": "Likert-Frequency",
          "modules": ["arts_culture"]
        },
        {
          "number": 16,
          "question": "How important are internationally touring productions and world-famous artists visiting your city?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 17,
          "question": "What is your typical monthly entertainment budget for performing arts?",
          "type": "Range",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 18,
          "question": "How important is English-language accessibility for performances?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 19,
          "question": "How willing are you to attend performances in the local language as part of cultural immersion? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 20,
          "question": "Rank these performing arts factors from most to least important: Theater access, Live music venues, International touring acts, Performance variety, Language accessibility",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Creative Community & Arts Participation",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is being part of an active creative community?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 22,
          "question": "What types of creative communities interest you? (Select all that apply: visual arts, music/bands, writing/literary, film/video, photography, theater/acting, dance, crafts/maker spaces, digital arts, culinary arts)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 23,
          "question": "What level of creative community engagement do you prefer? (Select one: observer/audience, casual participant, active member, professional practitioner, community leader)",
          "type": "Single-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 24,
          "question": "How important are artist studios and creative coworking spaces?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "professional_career"]
        },
        {
          "number": 25,
          "question": "What type of arts education and workshops interest you? (Select all that apply: painting/drawing, pottery/sculpture, music lessons, dance classes, writing workshops, photography, digital media, film production, acting, crafts)",
          "type": "Multi-select",
          "modules": ["arts_culture", "education_learning"]
        },
        {
          "number": 26,
          "question": "How important are cultural mentorship and apprenticeship opportunities?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 27,
          "question": "How important is access to public funding, grants, or residency programs that support local artists?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 28,
          "question": "How important is the presence of independent bookstores, art-house cinemas, and alternative cultural spaces?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 29,
          "question": "How important is a thriving street art, public art installation, and open-air cultural scene?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 30,
          "question": "Rank these creative community factors from most to least important: Creative community access, Studios/workspaces, Arts education, Public art scene, Arts funding/grants",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Cultural Events & Festivals",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important are annual cultural festivals in your ideal location?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 32,
          "question": "What types of cultural festivals interest you? (Select all that apply: music festivals, film festivals, literary festivals, food/wine festivals, art fairs, theater festivals, comedy festivals, heritage festivals, design weeks, fashion weeks)",
          "type": "Multi-select",
          "modules": ["arts_culture", "entertainment_nightlife", "food_dining"]
        },
        {
          "number": 33,
          "question": "What scale of cultural events appeals to you most? (Select one: intimate/local, neighborhood/community, city-wide, national/international, mega-events)",
          "type": "Single-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 34,
          "question": "How frequently do you want major cultural events in your area?",
          "type": "Likert-Frequency",
          "modules": ["arts_culture"]
        },
        {
          "number": 35,
          "question": "How important is international cultural programming (foreign film series, world music, international art exhibitions)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 36,
          "question": "How important are free and accessible cultural events for the public?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 37,
          "question": "How important are outdoor cultural events and venues (open-air cinema, park concerts, sculpture gardens)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "outdoor_recreation"]
        },
        {
          "number": 38,
          "question": "How important are cultural events that celebrate local and regional history and traditions?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 39,
          "question": "How important are cultural events that address contemporary social issues (social justice art, political theater, documentary screenings)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 40,
          "question": "Rank these cultural events factors from most to least important: Festival variety, Event frequency, International programming, Free/accessible events, Local tradition celebrations",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Film, Media & Literary Culture",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is access to art-house and independent cinemas?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 42,
          "question": "How important is a strong local film and documentary scene?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 43,
          "question": "How important is access to a vibrant literary culture (bookstores, author events, book clubs, literary readings)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 44,
          "question": "How important is access to public libraries with diverse collections and programming?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 45,
          "question": "How important is local media and journalism quality (newspapers, magazines, podcasts, blogs)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 46,
          "question": "How important is access to international media and publications in English or your language?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 47,
          "question": "How important is a strong podcast and digital media creator community?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "technology_connectivity"]
        },
        {
          "number": 48,
          "question": "How important is access to foreign language films with subtitles?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 49,
          "question": "How willing are you to engage with local-language media as part of cultural integration? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture"]
        },
        {
          "number": 50,
          "question": "Rank these media/literary factors from most to least important: Independent cinema, Literary culture, Public libraries, Local media quality, International media access",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Architecture & Design Culture",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is living in a city with significant architectural heritage?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 52,
          "question": "How important is contemporary architecture and innovative urban design in your destination?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "neighborhood_urban_design"]
        },
        {
          "number": 53,
          "question": "How important is access to design museums, architecture tours, and built-environment exhibitions?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 54,
          "question": "How important is a strong interior design and home décor retail scene?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "shopping_services"]
        },
        {
          "number": 55,
          "question": "How important is living in a city known for fashion and style?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "shopping_services"]
        },
        {
          "number": 56,
          "question": "How important is access to design festivals, architecture biennales, or design weeks?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 57,
          "question": "How important is the quality of public space design (plazas, parks, waterfronts, pedestrian areas)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "neighborhood_urban_design"]
        },
        {
          "number": 58,
          "question": "How important is the preservation of historic buildings and neighborhoods?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 59,
          "question": "How willing are you to appreciate and adapt to a very different architectural and design aesthetic from your home country? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture"]
        },
        {
          "number": 60,
          "question": "Rank these architecture/design factors from most to least important: Architectural heritage, Contemporary design, Public space quality, Historic preservation, Fashion/design scene",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Music & Nightlife Culture",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is a vibrant and diverse music scene in your destination?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 62,
          "question": "Which music genres are most important to have access to? (Select all that apply: classical, jazz, rock/indie, electronic/DJ, hip-hop, world music, folk/traditional, Latin, R&B/soul, metal, pop, country)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 63,
          "question": "How important is access to record stores, music equipment shops, and vinyl culture?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 64,
          "question": "How important is a strong DJ and electronic music scene (clubs, raves, festivals)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "entertainment_nightlife"]
        },
        {
          "number": 65,
          "question": "How important are music education opportunities (lessons, conservatories, jam sessions)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "education_learning"]
        },
        {
          "number": 66,
          "question": "How important is a city known for producing or nurturing musical talent?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 67,
          "question": "How important are pre- and post-performance dining and social options near cultural venues?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "food_dining"]
        },
        {
          "number": 68,
          "question": "How important is children's and family-friendly arts and entertainment programming?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "family_children"]
        },
        {
          "number": 69,
          "question": "How willing are you to explore and appreciate the local music traditions of your destination? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 70,
          "question": "Rank these music/nightlife factors from most to least important: Music scene diversity, Live venue quality, Genre variety, Music education, Local music traditions",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Cultural Integration & Adaptation",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is cultural integration for your overall relocation success?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 72,
          "question": "What types of cultural learning opportunities interest you? (Select all that apply: language classes, cooking classes, history courses, art workshops, local customs orientation, cultural immersion programs, volunteer programs, mentorship)",
          "type": "Multi-select",
          "modules": ["arts_culture", "education_learning", "cultural_heritage_traditions"]
        },
        {
          "number": 73,
          "question": "How important is maintaining your own cultural and artistic traditions after relocating?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 74,
          "question": "How important are cultural institutions that serve expatriate communities (international clubs, expat arts groups)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 75,
          "question": "How important are multilingual cultural resources and programming?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 76,
          "question": "How important is a city that values intellectual discourse, debate, and academic culture?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "education_learning"]
        },
        {
          "number": 77,
          "question": "How important is cultural education for personal growth and lifelong learning?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 78,
          "question": "How important are cultural approaches to work-life balance (long lunches, afternoon siestas, early evenings)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture", "professional_career"]
        },
        {
          "number": 79,
          "question": "How willing are you to fully immerse yourself in the local cultural scene rather than staying in expat bubbles? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture"]
        },
        {
          "number": 80,
          "question": "Rank these integration factors from most to least important: Cultural learning, Maintaining own traditions, Expat community, Intellectual culture, Local immersion",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Arts & Culture Trade-Offs",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept a smaller arts scene in exchange for lower cost of living?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept limited English-language cultural programming?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture"]
        },
        {
          "number": 83,
          "question": "How willing are you to travel (1-2 hours) to access major cultural institutions?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture", "transportation_mobility"]
        },
        {
          "number": 84,
          "question": "How willing are you to accept a more traditional cultural scene versus cutting-edge contemporary?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture"]
        },
        {
          "number": 85,
          "question": "How willing are you to pay higher cost of living for proximity to world-class cultural institutions?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 86,
          "question": "How willing are you to accept a strong cultural scene that is primarily in a language you don't speak?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture"]
        },
        {
          "number": 87,
          "question": "How important is it to live in a city on the \"cultural world map\" (known internationally for arts)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 88,
          "question": "What is your approximate annual budget for arts and cultural activities (memberships, tickets, classes)?",
          "type": "Range",
          "modules": ["arts_culture", "financial_banking"]
        },
        {
          "number": 89,
          "question": "How willing are you to build cultural community from scratch in a less-established arts scene?",
          "type": "Likert-Willingness",
          "modules": ["arts_culture"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off factors from most to least important: Arts scene size vs. cost, Language accessibility, Travel distance, Traditional vs. contemporary, Cultural world reputation",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    },
    {
      "title": "Overall Arts & Culture Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which arts and culture issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no museums, no live music, censored arts, no theaters, no cultural festivals, no English programming, no bookstores/libraries, no creative community)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 92,
          "question": "Which arts features are non-negotiable must-haves? (Select all that apply: world-class museums, live music venues, theater scene, cultural festivals, independent cinema, bookstores/libraries, creative community, public art, arts education)",
          "type": "Multi-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank arts and culture as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["arts_culture"]
        },
        {
          "number": 94,
          "question": "How important is it that your destination's arts and cultural scene is growing and improving?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 95,
          "question": "How important is government support and investment in arts and culture?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 96,
          "question": "How important is the social aspect of cultural activities (meeting people, building friendships through arts)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 97,
          "question": "What type of cultural legacy or contribution would you like to make in your new community? (Select one: audience member, participant, organizer, patron/donor, creator, educator, no preference)",
          "type": "Single-select",
          "modules": ["arts_culture"]
        },
        {
          "number": 98,
          "question": "How willing are you to accept a culturally different arts scene than what you're used to? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["arts_culture"]
        },
        {
          "number": 99,
          "question": "How important are cultural approaches to aging, life transitions, and community belonging?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 100,
          "question": "Rank these overall arts & culture categories from most to least important for your relocation: Museums & galleries, Theater & performing arts, Creative community, Cultural events & festivals, Film & literary culture, Architecture & design, Music & nightlife, Cultural integration, Arts trade-offs, Overall cultural investment",
          "type": "Ranking",
          "modules": ["arts_culture"]
        }
      ]
    }
  ]
};
