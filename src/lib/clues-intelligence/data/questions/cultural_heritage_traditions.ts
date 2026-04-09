import type { QuestionModule } from './types';

// Cultural Heritage & Traditions — 100 questions
// Module ID: cultural_heritage_traditions

export const culturalHeritageTraditionsQuestions: QuestionModule = {
  "moduleId": "cultural_heritage_traditions",
  "moduleName": "Cultural Heritage & Traditions",
  "fileName": "CULTURAL_HERITAGE_TRADITIONS_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Cultural Identity & Background",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "Which cultural or ethnic heritage(s) do you most strongly identify with? (Select all that apply: European, Latin American, East Asian, South Asian, Southeast Asian, Middle Eastern, North African, Sub-Saharan African, Caribbean, Pacific Islander, Indigenous/First Nations, Mixed/Multi-cultural, Other)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 2,
          "question": "How important is maintaining your cultural identity after relocating to a new country?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 3,
          "question": "How would you describe your relationship with your heritage culture's traditions?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 4,
          "question": "How important is it that your destination has a visible and active community from your cultural background?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 5,
          "question": "How important is it to live near cultural landmarks, heritage sites, or institutions connected to your background?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 6,
          "question": "How comfortable are you living in a culture that is very different from your own?",
          "type": "Likert-Comfort",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 7,
          "question": "How important is it that your children (or future children) grow up connected to your cultural heritage?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "family_children"]
        },
        {
          "number": 8,
          "question": "Do you practice cultural or traditional customs on a regular basis (weekly or more)?",
          "type": "Yes/No",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 9,
          "question": "How important is freedom to openly express your cultural identity (clothing, language, customs) in public?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "legal_immigration"]
        },
        {
          "number": 10,
          "question": "Rank these cultural identity factors from most to least important: Heritage community presence, Cultural expression freedom, Child cultural education, Cultural landmark access, Personal identity maintenance",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Language & Communication",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "Which heritage languages do you speak or want to maintain? (Select all that apply: Mandarin, Cantonese, Hindi, Urdu, Arabic, Spanish, Portuguese, French, German, Italian, Japanese, Korean, Russian, Tagalog, Vietnamese, Swahili, Hebrew, Farsi, Turkish, Other)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 12,
          "question": "How important is access to heritage language education for yourself or your family?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "education_learning"]
        },
        {
          "number": 13,
          "question": "How important is it that government services and signage are available in your heritage language?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 14,
          "question": "How important is access to media (newspapers, TV, radio, podcasts) in your heritage language?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 15,
          "question": "How willing are you to learn the local language of your destination country?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 16,
          "question": "How important is it that your children attend bilingual or heritage-language schools?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "education_learning", "family_children"]
        },
        {
          "number": 17,
          "question": "How concerned are you about language barriers in daily life (shopping, healthcare, government)?",
          "type": "Likert-Concern",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 18,
          "question": "How important is access to professional interpreters and translation services?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 19,
          "question": "How comfortable are you in social settings where your heritage language is not spoken? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 20,
          "question": "Rank these language factors from most to least important: Heritage language education, Government language services, Media in your language, Bilingual schools, Translation services",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Festivals, Celebrations & Traditions",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "Which cultural or religious festivals are important for you to celebrate? (Select all that apply: Lunar New Year, Diwali, Eid, Hanukkah, Christmas, Easter, Thanksgiving, Day of the Dead, Carnival, Nowruz, Mid-Autumn Festival, Obon, Songkran, Holi, Passover, Other)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions", "religion_spirituality"]
        },
        {
          "number": 22,
          "question": "How important is it that your destination has public recognition or accommodation for your cultural holidays (days off, public events)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 23,
          "question": "How important is access to large-scale community celebrations and cultural festivals?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 24,
          "question": "How important is it that local schools recognize and accommodate your cultural holidays?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "education_learning"]
        },
        {
          "number": 25,
          "question": "How frequently do you participate in cultural celebrations or traditional ceremonies?",
          "type": "Likert-Frequency",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 26,
          "question": "How important is access to traditional ceremonial items, decorations, and ritual supplies for your celebrations?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 27,
          "question": "How important is festival infrastructure (parade routes, community halls, outdoor gathering spaces) in your area?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 28,
          "question": "How willing are you to participate in and embrace the local culture's festivals and celebrations? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 29,
          "question": "How important is it that your neighborhood is tolerant of cultural celebrations (noise, fireworks, gatherings)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "neighborhood_urban_design"]
        },
        {
          "number": 30,
          "question": "Rank these festival and celebration factors from most to least important: Holiday recognition, Community celebrations, School accommodation, Ceremonial supplies access, Festival infrastructure",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Food, Cuisine & Dietary Traditions",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is access to traditional and authentic foods from your cultural background?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "food_dining"]
        },
        {
          "number": 32,
          "question": "Which traditional food requirements are essential for you? (Select all that apply: halal, kosher, vegetarian/Hindu, specific spices/ingredients, traditional cooking methods, fermented foods, specific grains/staples, traditional teas/beverages)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions", "food_dining"]
        },
        {
          "number": 33,
          "question": "How important is access to specialty grocery stores or markets that carry your cultural food products?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "food_dining", "shopping_services"]
        },
        {
          "number": 34,
          "question": "How important is it to have restaurants serving authentic cuisine from your cultural background?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "food_dining"]
        },
        {
          "number": 35,
          "question": "How important is preserving traditional cooking and food preparation practices in your household?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 36,
          "question": "How important is it that your children learn traditional cooking from your culture?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "food_dining", "family_children"]
        },
        {
          "number": 37,
          "question": "How willing are you to adapt your diet to incorporate local cuisine and food traditions? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 38,
          "question": "How important is access to traditional food for ceremonial and religious purposes (ritual meals, holiday feasts)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "food_dining", "religion_spirituality"]
        },
        {
          "number": 39,
          "question": "How concerned are you about the availability of culturally appropriate food within your budget?",
          "type": "Likert-Concern",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 40,
          "question": "Rank these food tradition factors from most to least important: Authentic cuisine access, Specialty grocery stores, Dietary requirement availability, Traditional cooking preservation, Ceremonial food access",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Family & Life Cycle Traditions",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is access to culturally appropriate services for life events? (Select all that apply: birth ceremonies, coming-of-age rituals, wedding traditions, funeral/burial customs, naming ceremonies, baptism/dedication, bar/bat mitzvah or equivalent)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions", "religion_spirituality", "family_children"]
        },
        {
          "number": 42,
          "question": "How important is it that your destination allows traditional marriage customs and ceremonies?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "legal_immigration", "family_children"]
        },
        {
          "number": 43,
          "question": "How important is access to culturally appropriate funeral and burial practices (traditional burial, cremation, repatriation of remains)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "religion_spirituality"]
        },
        {
          "number": 44,
          "question": "How important is intergenerational cultural knowledge transfer (grandparents teaching grandchildren traditions)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "family_children"]
        },
        {
          "number": 45,
          "question": "How important is the availability of culturally competent family counseling and support services?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "family_children", "health_wellness"]
        },
        {
          "number": 46,
          "question": "How important is it that elder family members can maintain their traditional lifestyle in your destination?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "family_children"]
        },
        {
          "number": 47,
          "question": "How important is access to traditional medicine or healing practices alongside modern healthcare?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "health_wellness"]
        },
        {
          "number": 48,
          "question": "How important are culturally appropriate childcare and early education options?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "family_children", "education_learning"]
        },
        {
          "number": 49,
          "question": "How willing are you to adapt your family traditions to blend with local customs? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 50,
          "question": "Rank these family tradition factors from most to least important: Life cycle ceremony access, Marriage custom freedom, Burial practice access, Intergenerational transfer, Elder traditional lifestyle",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Arts, Music & Creative Heritage",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is access to traditional music and performing arts from your cultural background?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "arts_culture"]
        },
        {
          "number": 52,
          "question": "Which cultural art forms are important to you? (Select all that apply: traditional dance, folk music, classical music, theater/drama, visual arts, calligraphy, pottery/ceramics, textile arts, martial arts, storytelling/oral tradition)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 53,
          "question": "How important is access to venues that host performances from your cultural tradition?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "arts_culture"]
        },
        {
          "number": 54,
          "question": "How frequently do you attend cultural performances or art exhibitions?",
          "type": "Likert-Frequency",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 55,
          "question": "How important is access to traditional craft and artisan workshops for learning heritage skills?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "arts_culture"]
        },
        {
          "number": 56,
          "question": "How important is it that local museums feature exhibits from your cultural heritage?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "arts_culture"]
        },
        {
          "number": 57,
          "question": "How important is access to cultural literature, poetry, and publications from your heritage?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 58,
          "question": "How important is digital access to your cultural heritage (streaming traditional media, online cultural communities, digital archives)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 59,
          "question": "How willing are you to explore and appreciate the artistic traditions of your destination's local culture? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 60,
          "question": "Rank these arts and heritage factors from most to least important: Traditional music access, Cultural performance venues, Craft workshops, Museum representation, Digital cultural access",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Diaspora & Community Networks",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is the size and strength of the diaspora community from your background in your destination?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 62,
          "question": "What is the minimum size of cultural community you would need in your destination?",
          "type": "Single-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 63,
          "question": "How important is access to cultural community organizations and social clubs?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 64,
          "question": "How important is the presence of cultural businesses (restaurants, shops, services) run by people from your heritage?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 65,
          "question": "How important is access to diaspora professional networks and business associations?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "professional_career"]
        },
        {
          "number": 66,
          "question": "How important is the ability to maintain strong connections with your heritage country (flights, telecommunications, remittances)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 67,
          "question": "How important is it that the local government engages with and supports diaspora communities?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 68,
          "question": "How important are cultural exchange programs between your heritage community and the local population?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 69,
          "question": "How comfortable are you building your primary social network outside of your cultural community? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 70,
          "question": "Rank these diaspora factors from most to least important: Community size, Cultural organizations, Heritage businesses, Professional networks, Heritage country connections",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Cultural Adaptation & Integration",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How willing are you to adapt to the local customs and social norms of your destination? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 72,
          "question": "How important is access to cultural integration programs (orientation, language courses, cultural mentors)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 73,
          "question": "How would you describe your ideal balance between maintaining your heritage and integrating into the local culture?",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 74,
          "question": "How concerned are you about cultural discrimination or prejudice in your destination?",
          "type": "Likert-Concern",
          "modules": ["cultural_heritage_traditions", "safety_security"]
        },
        {
          "number": 75,
          "question": "How important is it that the local population is welcoming and receptive to foreign cultural communities?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 76,
          "question": "How important is access to interfaith and intercultural dialogue programs?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 77,
          "question": "How important is anti-discrimination legislation that protects cultural expression?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "legal_immigration"]
        },
        {
          "number": 78,
          "question": "How willing are you to modify certain traditions to respect local laws or social expectations? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 79,
          "question": "How important is it that your workplace is culturally sensitive and accommodating of your traditions?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "professional_career"]
        },
        {
          "number": 80,
          "question": "Rank these adaptation factors from most to least important: Local custom adaptation, Integration programs, Anti-discrimination laws, Community welcome, Workplace cultural sensitivity",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Cultural Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept limited cultural community access in exchange for a lower cost of living?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept limited heritage food access in exchange for better career opportunities?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 83,
          "question": "How willing are you to live far from cultural institutions if the neighborhood is safer and quieter?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 84,
          "question": "How willing are you to accept a smaller diaspora community if the local culture is welcoming and open?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 85,
          "question": "How willing are you to compromise on public holiday recognition if other cultural infrastructure is strong?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 86,
          "question": "How willing are you to use digital alternatives (streaming, video calls, online communities) to replace in-person cultural engagement?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 87,
          "question": "How willing are you to prioritize your children's cultural education over proximity to mainstream top-rated schools?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions", "education_learning", "family_children"]
        },
        {
          "number": 88,
          "question": "How strong is your desire to maintain regular physical connection to your heritage country (annual visits, property ownership)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 89,
          "question": "How flexible are you in compromising on cultural traditions that conflict with local laws or norms? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Cultural community size vs. cost, Heritage food vs. career, Cultural institutions vs. safety, Diaspora size vs. local welcome, Digital vs. in-person cultural life",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    },
    {
      "title": "Cultural Vision & Final Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "What is your approximate annual budget for cultural activities, celebrations, and heritage maintenance?",
          "type": "Range",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 92,
          "question": "Where do you envision your cultural life in 5 years after relocating?",
          "type": "Single-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 93,
          "question": "How important is it that your destination is trending toward greater cultural diversity and inclusion?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 94,
          "question": "How important is it to you to take on a leadership role in your cultural community (organizing events, mentoring newcomers)?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 95,
          "question": "How important is it that your cultural heritage is respected and valued by the broader society in your destination?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 96,
          "question": "Which cultural factors are absolute dealbreakers that would eliminate a destination? (Select all that apply: no cultural community, cultural discrimination, banned traditions, no heritage food access, no heritage language support, restricted religious expression, no ceremonial freedom)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 97,
          "question": "Which cultural features are non-negotiable must-haves? (Select all that apply: active diaspora community, heritage language schools, traditional food access, cultural celebration freedom, community organizations, life cycle ceremony access, cultural media access)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 98,
          "question": "On a scale of 0-100, how would you rank cultural heritage as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 99,
          "question": "How willing are you to be a cultural pioneer — building community infrastructure where none exists yet?",
          "type": "Likert-Willingness",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 100,
          "question": "Rank these overall cultural heritage categories from most to least important for your relocation: Cultural identity & expression, Language & communication, Festivals & celebrations, Food & dietary traditions, Family & life cycle traditions, Arts & creative heritage, Diaspora community, Cultural adaptation, Cultural trade-offs, Cultural vision & investment",
          "type": "Ranking",
          "modules": ["cultural_heritage_traditions"]
        }
      ]
    }
  ]
};
