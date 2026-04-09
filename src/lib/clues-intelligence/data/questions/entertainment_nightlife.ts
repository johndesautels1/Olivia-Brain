import type { QuestionModule } from './types';

// Entertainment & Nightlife — 100 questions
// Module ID: entertainment_nightlife

export const entertainmentNightlifeQuestions: QuestionModule = {
  "moduleId": "entertainment_nightlife",
  "moduleName": "Entertainment & Nightlife",
  "fileName": "ENTERTAINMENT_NIGHTLIFE_QUESTIONS.md",
  "structure": "10 sections x 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Live Music & Concerts",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How often do you attend live music events or concerts?",
          "type": "Likert-Frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 2,
          "question": "Which music genres are most important for you to have access to? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 3,
          "question": "How important is access to large concert venues and arenas hosting international touring acts?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 4,
          "question": "Do you prefer intimate venues (under 500 capacity) or large-scale events?",
          "type": "Single-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 5,
          "question": "How important is a thriving local/independent music scene in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 6,
          "question": "Would you travel to a nearby city (1-3 hours) for major concerts if your local area lacks large venues?",
          "type": "Likert-Willingness",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 7,
          "question": "How important is access to music festivals (multi-day outdoor events)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 8,
          "question": "Do you play a musical instrument or perform? How important is access to open mics, jam sessions, or rehearsal spaces?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 9,
          "question": "How important is the affordability of live music tickets in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "financial_banking"]
        },
        {
          "number": 10,
          "question": "Rank these live music factors from most to least important: International touring acts, Local indie scene, Festival access, Venue variety, Ticket affordability",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Bars, Clubs & Nightlife Scene",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How often do you go out to bars, clubs, or nightlife venues?",
          "type": "Likert-Frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 12,
          "question": "Which types of nightlife venues do you enjoy? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 13,
          "question": "How important is a walkable nightlife district where multiple venues are clustered together?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "neighborhood_urban_design"]
        },
        {
          "number": 14,
          "question": "What time do you typically go out, and how late do you expect venues to stay open?",
          "type": "Time preference",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 15,
          "question": "How important is the availability of VIP, bottle service, or upscale nightlife experiences?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 16,
          "question": "Do you prefer a casual pub/bar atmosphere or a high-energy club scene?",
          "type": "Single-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 17,
          "question": "How important is the quality and variety of craft cocktails and mixology culture?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 18,
          "question": "How important is nightlife safety (well-lit streets, reliable late-night transportation, venue security)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "safety_security", "transportation_mobility"]
        },
        {
          "number": 19,
          "question": "How open are you to adapting to local nightlife customs (late dining before going out, drinking etiquette, dress codes)? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 20,
          "question": "Rank these nightlife factors from most to least important: Venue variety, Operating hours, Walkability, Safety, Cocktail/drink quality",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Theater, Performing Arts & Comedy",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How often do you attend theater, dance, or performing arts shows?",
          "type": "Likert-Frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 22,
          "question": "Which performing arts interest you? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 23,
          "question": "How important is access to Broadway/West End-quality professional theater?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "arts_culture"]
        },
        {
          "number": 24,
          "question": "Do you enjoy stand-up comedy and improv shows? How important is access to comedy clubs?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 25,
          "question": "How important is the availability of performances in your preferred language?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 26,
          "question": "Do you attend opera or ballet? How important is access to world-class opera and ballet companies?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "arts_culture"]
        },
        {
          "number": 27,
          "question": "How important is affordable access to performing arts (subsidized tickets, free outdoor performances)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 28,
          "question": "Do you participate in community theater or amateur performing arts?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 29,
          "question": "How important is a vibrant fringe/independent theater scene alongside mainstream productions?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 30,
          "question": "Rank these performing arts factors from most to least important: Professional theater quality, Comedy scene, Opera and ballet, Affordability, Community participation",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Cinema & Film Culture",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How often do you go to the cinema/movie theater?",
          "type": "Likert-Frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 32,
          "question": "Which types of cinema experiences do you prefer? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 33,
          "question": "How important is access to films in your preferred language (original language with subtitles vs. dubbed)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 34,
          "question": "Do you attend film festivals or arthouse/independent cinema screenings?",
          "type": "Yes/No + frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 35,
          "question": "How important is the availability of IMAX, 4DX, or premium cinema formats?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 36,
          "question": "How important is same-day or near-simultaneous global release of major films in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 37,
          "question": "Do you prefer streaming at home or going to physical cinemas?",
          "type": "Single-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 38,
          "question": "How important is the local film industry and culture (domestic productions, film history)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 39,
          "question": "How important is cinema ticket affordability?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 40,
          "question": "Rank these cinema factors from most to least important: Language/subtitle options, Premium formats, Release timing, Arthouse/indie access, Affordability",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Sports & Spectator Events",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How often do you attend live sporting events as a spectator?",
          "type": "Likert-Frequency",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 42,
          "question": "Which sports are you most passionate about following? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 43,
          "question": "How important is access to professional/top-tier league sports in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 44,
          "question": "Do you follow international sporting events (Olympics, World Cup, Grand Slam tennis)? How important is hosting proximity?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 45,
          "question": "How important is the ability to watch international sports broadcasts (your home country's leagues) via local TV or streaming?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "technology_connectivity"]
        },
        {
          "number": 46,
          "question": "Do you participate in sports betting? How important is legal and regulated sports betting access?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 47,
          "question": "How important is the atmosphere and fan culture at local sporting events?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 48,
          "question": "Would you choose a destination partly based on its sports culture and team loyalty?",
          "type": "Likert-Willingness",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 49,
          "question": "How important is access to motorsport events (Formula 1, MotoGP, rally)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 50,
          "question": "Rank these spectator sports factors from most to least important: Professional league access, International event proximity, Broadcast availability, Fan culture and atmosphere, Ticket affordability",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Gaming & Digital Entertainment",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is high-speed internet for online gaming in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "technology_connectivity"]
        },
        {
          "number": 52,
          "question": "Do you participate in esports or competitive gaming? How important is a local esports scene?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 53,
          "question": "How important is access to gaming cafes, LAN centers, or VR arcades?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 54,
          "question": "Do you attend gaming conventions or expos (E3, Gamescom, PAX-style events)?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 55,
          "question": "How important is the availability and pricing of gaming hardware and consoles in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 56,
          "question": "How concerned are you about government censorship or restrictions on video games and digital content?",
          "type": "Concern scale",
          "modules": ["entertainment_nightlife", "social_values_governance"]
        },
        {
          "number": 57,
          "question": "How important is access to streaming services (Netflix, Spotify, YouTube Premium) without geo-restrictions?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "technology_connectivity"]
        },
        {
          "number": 58,
          "question": "Do you use VPN services? How concerned are you about VPN legality in your destination?",
          "type": "Likert-Concern",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 59,
          "question": "How important is the local gaming community (Discord servers, meetups, tournaments)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 60,
          "question": "Rank these digital entertainment factors from most to least important: Internet speed for gaming, Streaming service access, Hardware availability, Esports scene, Content censorship freedom",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Festivals, Events & Seasonal Celebrations",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is living in a city with a vibrant calendar of public festivals and events?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 62,
          "question": "Which types of festivals appeal to you? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 63,
          "question": "How important are major annual events (Carnival, Oktoberfest, Songkran, Diwali celebrations)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "cultural_heritage_traditions"]
        },
        {
          "number": 64,
          "question": "Do you prefer participating in festivals or watching from the sidelines?",
          "type": "Single-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 65,
          "question": "How important is access to holiday markets (Christmas markets, night markets, seasonal bazaars)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "shopping_services"]
        },
        {
          "number": 66,
          "question": "How do you feel about public noise, crowds, and disruption during major festival periods?",
          "type": "Tolerance scale",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 67,
          "question": "How important is the local celebration of holidays that are meaningful to you (national, religious, cultural)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "cultural_heritage_traditions", "religion_spirituality"]
        },
        {
          "number": 68,
          "question": "Do you want to live in a destination known for a world-famous event or festival?",
          "type": "Likert-Willingness",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 69,
          "question": "How open are you to participating in local festivals and traditions you are not familiar with? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 70,
          "question": "Rank these festival factors from most to least important: Frequency of events, International/world-famous festivals, Cultural relevance to you, Holiday markets, Community participation",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Amusement Parks, Attractions & Tourism",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is proximity to theme parks and amusement parks?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 72,
          "question": "Do you enjoy water parks, zoos, aquariums, or botanical gardens? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 73,
          "question": "How important is access to tourist attractions and landmarks for hosting visiting friends and family?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 74,
          "question": "Do you enjoy escape rooms, bowling, mini-golf, go-karts, or similar entertainment venues?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 75,
          "question": "How important is access to casinos and gambling entertainment?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 76,
          "question": "How important is proximity to beach, lake, or waterfront entertainment and boardwalks?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "outdoor_recreation"]
        },
        {
          "number": 77,
          "question": "Do you need access to family-friendly attractions for children or teenagers?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife", "family_children"]
        },
        {
          "number": 78,
          "question": "How important is the variety of weekend day-trip entertainment options within 1-2 hours of your home?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 79,
          "question": "Would you choose a destination partly based on its tourism appeal and visitor attractions?",
          "type": "Likert-Willingness",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 80,
          "question": "Rank these attraction factors from most to least important: Theme parks, Zoos and aquariums, Tourist landmarks, Day-trip variety, Casino and gaming",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Social Entertainment & Community",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How important is access to social clubs, networking events, and organized social gatherings?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 82,
          "question": "Do you enjoy trivia nights, pub quizzes, karaoke, or similar social entertainment?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 83,
          "question": "How important is the availability of co-working spaces that double as social hubs?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 84,
          "question": "Do you participate in book clubs, wine clubs, supper clubs, or similar interest-based social groups?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 85,
          "question": "How important is a vibrant expat social scene with organized events and meetups?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 86,
          "question": "How important is the LGBTQ+ entertainment scene and inclusive nightlife in your destination?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 87,
          "question": "Do you enjoy outdoor cinema, rooftop bars, or seasonal pop-up entertainment venues?",
          "type": "Yes/No",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 88,
          "question": "How important is the social dining scene (food halls, communal dining, supper clubs)?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife", "food_dining"]
        },
        {
          "number": 89,
          "question": "How open are you to socializing in ways that are common locally but different from your home culture? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 90,
          "question": "Rank these social factors from most to least important: Organized social events, Expat meetup scene, Interest-based clubs, LGBTQ+ inclusivity, Social dining culture",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    },
    {
      "title": "Entertainment Deal-Breakers & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which entertainment factors would absolutely disqualify a destination? (Select all that apply)",
          "type": "Multi-select dealbreaker",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 92,
          "question": "What is the single most important entertainment factor in your relocation decision?",
          "type": "Single select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 93,
          "question": "How much of your monthly budget do you typically allocate to entertainment and going out?",
          "type": "Budget range",
          "modules": ["entertainment_nightlife", "financial_banking"]
        },
        {
          "number": 94,
          "question": "Would you accept limited entertainment options for a lower cost of living or better climate?",
          "type": "Slider",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 95,
          "question": "How important is entertainment diversity (something for every mood and interest) versus depth in one area?",
          "type": "Single-select",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 96,
          "question": "How concerned are you about government restrictions on entertainment (alcohol bans, curfews, censorship)?",
          "type": "Concern scale",
          "modules": ["entertainment_nightlife", "social_values_governance"]
        },
        {
          "number": 97,
          "question": "How important is it that your destination has a reputation as a \"fun\" or \"exciting\" city?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 98,
          "question": "Do you have any specific entertainment needs not covered above that would impact your relocation?",
          "type": "Open text",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 99,
          "question": "Rate the overall importance of Entertainment & Nightlife factors in your relocation decision (1-10)",
          "type": "Slider",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 100,
          "question": "FINAL MODULE RANKING: Drag all 10 sections to rank by overall importance to your relocation decision",
          "type": "Ranking",
          "modules": ["entertainment_nightlife"]
        }
      ]
    }
  ]
};
