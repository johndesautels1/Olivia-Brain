import type { QuestionModule } from './types';

// Health & Wellness — 100 questions
// Module ID: health_wellness

export const healthWellnessQuestions: QuestionModule = {
  "moduleId": "health_wellness",
  "moduleName": "Health & Wellness",
  "fileName": "HEALTH_WELLNESS_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Healthcare Access & System",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is having world-class hospitals and medical facilities nearby?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 2,
          "question": "What is the maximum distance you would travel for routine healthcare?",
          "type": "Range",
          "modules": ["health_wellness"]
        },
        {
          "number": 3,
          "question": "How important is it that healthcare providers speak your native language fluently?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 4,
          "question": "What type of healthcare system do you prefer? (Select one: universal public, private insurance-based, hybrid public-private, cash-pay with low costs)",
          "type": "Single-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 5,
          "question": "How important is access to cutting-edge medical technology and treatments?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 6,
          "question": "What is the maximum acceptable wait time for non-emergency specialist appointments?",
          "type": "Range",
          "modules": ["health_wellness"]
        },
        {
          "number": 7,
          "question": "How important is access to 24/7 emergency medical services within 15 minutes of your home?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 8,
          "question": "What is the maximum acceptable cost for basic health insurance per month?",
          "type": "Range",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 9,
          "question": "How important is continuity of care with the same healthcare providers over time?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 10,
          "question": "Rank these healthcare access factors from most to least important: Hospital quality, Provider language, System type, Wait times, Insurance cost",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Healthcare Quality & Specialization",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is access to women's reproductive healthcare services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 12,
          "question": "How important is access to dental and oral healthcare?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 13,
          "question": "How important is access to preventive care and regular health screenings?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 14,
          "question": "What is the maximum acceptable out-of-pocket cost for a routine doctor visit?",
          "type": "Range",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 15,
          "question": "How important is access to specialized medical specialists and subspecialties?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 16,
          "question": "Which medical specialties are most important for you to have access to? (Select all that apply: cardiology, oncology, orthopedics, neurology, pediatrics, obstetrics/gynecology, dermatology, ophthalmology, endocrinology, gastroenterology)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 17,
          "question": "How important is access to diagnostic imaging and laboratory services (MRI, CT scan, blood work)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 18,
          "question": "How important is it that hospitals in your area are internationally accredited (e.g., JCI)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 19,
          "question": "How important is access to alternative and complementary medicine (acupuncture, homeopathy, naturopathy, chiropractic)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 20,
          "question": "Rank these healthcare quality factors from most to least important: Specialist access, Preventive care, Dental care, Diagnostic services, International accreditation",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Fitness & Physical Wellness",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is access to high-quality fitness facilities and gyms?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 22,
          "question": "Which fitness activities are most important to you? (Select all that apply: gym/weight training, swimming, yoga/pilates, running/jogging, cycling, martial arts, team sports, dance/aerobics, CrossFit, rock climbing, tennis/racquet sports)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 23,
          "question": "How important is access to outdoor recreational spaces for exercise (parks, trails, beaches)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "outdoor_recreation"]
        },
        {
          "number": 24,
          "question": "What is the maximum distance you would travel to your primary fitness facility?",
          "type": "Range",
          "modules": ["health_wellness"]
        },
        {
          "number": 25,
          "question": "How important is access to wellness services (massage, spa treatments, sauna, float tanks)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 26,
          "question": "What is the maximum monthly cost you would pay for fitness and wellness services?",
          "type": "Range",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 27,
          "question": "How important is air quality for your daily exercise and outdoor activities?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "environment_community_appearance"]
        },
        {
          "number": 28,
          "question": "How important is access to water-based fitness and recreation (pools, open water swimming, water sports)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 29,
          "question": "How important is access to sports medicine and injury prevention services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 30,
          "question": "Rank these fitness factors from most to least important: Gym quality, Outdoor exercise spaces, Wellness/spa services, Air quality, Sports medicine",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Mental Health & Emotional Wellbeing",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is access to mental health professionals and counseling services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 32,
          "question": "Which mental health services are most important to you? (Select all that apply: individual therapy, couples/family therapy, group therapy, psychiatric services, substance abuse counseling, grief counseling, trauma/PTSD treatment, eating disorder treatment, child/adolescent therapy)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 33,
          "question": "How important is low mental health stigma and cultural acceptance of seeking help?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 34,
          "question": "What is the maximum wait time you would accept for mental health appointments?",
          "type": "Range",
          "modules": ["health_wellness"]
        },
        {
          "number": 35,
          "question": "How important is access to stress management and mindfulness programs?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 36,
          "question": "What is the maximum monthly cost you would pay for mental health services?",
          "type": "Range",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 37,
          "question": "How important is privacy and confidentiality in mental health care?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 38,
          "question": "How comfortable are you with telehealth and online mental health services?",
          "type": "Likert-Comfort",
          "modules": ["health_wellness", "technology_connectivity"]
        },
        {
          "number": 39,
          "question": "How important is access to mental health services for families and children?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "family_children"]
        },
        {
          "number": 40,
          "question": "Rank these mental health factors from most to least important: Therapist access, Low stigma, Wait times, Cost, Child/family services",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Pharmaceutical & Medication Access",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is 24/7 access to pharmacies and medication?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 42,
          "question": "Do you or anyone in your household take prescription medications that must be available in your destination?",
          "type": "Yes/No",
          "modules": ["health_wellness"]
        },
        {
          "number": 43,
          "question": "How concerned are you about medication availability and pharmaceutical supply chain reliability?",
          "type": "Likert-Concern",
          "modules": ["health_wellness"]
        },
        {
          "number": 44,
          "question": "How important is affordable prescription medication (generics available, price controls)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 45,
          "question": "How important is access to over-the-counter medications without excessive regulation?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 46,
          "question": "How important is it that pharmacists in your area speak your language?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 47,
          "question": "How important is access to medical marijuana or CBD products where legal?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 48,
          "question": "How concerned are you about counterfeit or substandard medications in your destination?",
          "type": "Likert-Concern",
          "modules": ["health_wellness"]
        },
        {
          "number": 49,
          "question": "How important is the ability to transfer prescriptions internationally?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 50,
          "question": "Rank these pharmaceutical factors from most to least important: 24/7 pharmacy access, Medication availability, Affordable prescriptions, Language support, International prescription transfer",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Mind-Body & Holistic Wellness",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is access to mind-body wellness practices (yoga, tai chi, meditation, breathwork)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 52,
          "question": "How important is access to health coaching and wellness guidance?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 53,
          "question": "How important is living in a community that actively promotes healthy lifestyle choices?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 54,
          "question": "How important is access to nutrition counseling and dietitian services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 55,
          "question": "How important is access to healthy, organic, and specialized food options?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "food_dining"]
        },
        {
          "number": 56,
          "question": "How important is access to rehabilitation and physical therapy services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 57,
          "question": "How important is access to complementary and integrative medicine within mainstream healthcare systems?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 58,
          "question": "How willing are you to explore local traditional healing practices and wellness traditions? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["health_wellness", "cultural_heritage_traditions"]
        },
        {
          "number": 59,
          "question": "How important is the availability of wellness retreats and health-focused tourism?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 60,
          "question": "Rank these holistic wellness factors from most to least important: Mind-body practices, Health coaching, Healthy food access, Physical therapy, Integrative medicine",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Health Infrastructure & Technology",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "What is the maximum acceptable distance to a major hospital?",
          "type": "Range",
          "modules": ["health_wellness"]
        },
        {
          "number": 62,
          "question": "How important is access to home healthcare and mobile medical services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 63,
          "question": "How important is the quality of medical emergency response times in your area?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 64,
          "question": "How important is access to medical research facilities and clinical trials?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 65,
          "question": "How important is coordination between different healthcare providers and systems (integrated care)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 66,
          "question": "How important is access to digital health tools (patient portals, telemedicine, health apps, electronic records)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "technology_connectivity"]
        },
        {
          "number": 67,
          "question": "How important is access to genetic testing and personalized medicine?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 68,
          "question": "How important is access to organ transplant and advanced surgical capabilities?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 69,
          "question": "How important is strong health data privacy and information security?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 70,
          "question": "Rank these health infrastructure factors from most to least important: Hospital proximity, Emergency response, Telemedicine, Integrated care, Health data privacy",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Chronic Conditions & Specialized Care",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "Do you or anyone in your household have chronic conditions requiring ongoing medical management?",
          "type": "Yes/No",
          "modules": ["health_wellness"]
        },
        {
          "number": 72,
          "question": "Which chronic condition management services are important to you? (Select all that apply: diabetes management, cardiovascular care, respiratory/asthma care, autoimmune disease management, chronic pain management, dialysis, cancer treatment/monitoring, HIV/AIDS care, neurological conditions)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 73,
          "question": "How important is access to age-appropriate healthcare and senior services (geriatrics, memory care)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 74,
          "question": "How important is healthcare support for chronic conditions management (disease management programs, support groups)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 75,
          "question": "How concerned are you about the local climate's impact on your physical health (seasonal affective disorder, joint pain, respiratory conditions, heat-related illness)?",
          "type": "Likert-Concern",
          "modules": ["health_wellness", "climate_weather"]
        },
        {
          "number": 76,
          "question": "How important is access to pediatric specialists and children's hospitals?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "family_children"]
        },
        {
          "number": 77,
          "question": "How important is access to longevity and anti-aging medical services?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 78,
          "question": "How important is access to end-of-life care planning and advanced healthcare directives?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 79,
          "question": "How important is medical evacuation insurance and international medical transport options?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 80,
          "question": "Rank these specialized care factors from most to least important: Chronic condition management, Senior healthcare, Climate health impact, Pediatric care, Medical evacuation options",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Lifestyle Health & Longevity",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How important is living in an environment that promotes healthy aging and longevity?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 82,
          "question": "Which environmental health factors are most important to you? (Select all that apply: clean air, clean water, low noise pollution, green spaces, low UV exposure, temperate climate, low allergen levels, minimal industrial pollution)",
          "type": "Multi-select",
          "modules": ["health_wellness", "environment_community_appearance", "climate_weather"]
        },
        {
          "number": 83,
          "question": "How important is work-life balance and its impact on your health?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "professional_career"]
        },
        {
          "number": 84,
          "question": "How important is living where healthcare innovation and research is prioritized?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 85,
          "question": "How important is healthcare equity and accessibility for all community members?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 86,
          "question": "How frequently do you engage in preventive healthcare and wellness maintenance?",
          "type": "Likert-Frequency",
          "modules": ["health_wellness"]
        },
        {
          "number": 87,
          "question": "How important is access to health education and medical literacy resources?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 88,
          "question": "How comfortable are you with health-related regulations and public health measures (vaccination requirements, mask mandates, quarantine rules)?",
          "type": "Likert-Comfort",
          "modules": ["health_wellness"]
        },
        {
          "number": 89,
          "question": "How important is integrating technology with health and wellness (wearables, health tracking, AI diagnostics)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness", "technology_connectivity"]
        },
        {
          "number": 90,
          "question": "Rank these lifestyle health factors from most to least important: Healthy environment, Work-life balance, Healthcare innovation, Preventive care culture, Health technology",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    },
    {
      "title": "Overall Health Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "What is your approximate monthly budget for all health and wellness expenses (insurance, fitness, mental health, wellness)?",
          "type": "Range",
          "modules": ["health_wellness", "financial_banking"]
        },
        {
          "number": 92,
          "question": "How tolerant are you of medical bureaucracy and administrative processes?",
          "type": "Likert-Comfort",
          "modules": ["health_wellness"]
        },
        {
          "number": 93,
          "question": "How important is your overall healthcare satisfaction philosophy (patient-centered, outcome-focused, holistic)?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 94,
          "question": "Which health issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no emergency services, no specialist access, unaffordable healthcare, no mental health services, poor air/water quality, no chronic condition support, medication unavailability, no health insurance options)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 95,
          "question": "Which health features are non-negotiable must-haves? (Select all that apply: nearby hospital, affordable insurance, 24/7 pharmacy, specialist access, mental health services, clean air/water, fitness facilities, preventive care)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 96,
          "question": "How willing are you to accept a less advanced healthcare system in exchange for other benefits (lower cost of living, better climate, cultural richness)?",
          "type": "Likert-Willingness",
          "modules": ["health_wellness"]
        },
        {
          "number": 97,
          "question": "On a scale of 0-100, how would you rank overall health and wellness as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["health_wellness"]
        },
        {
          "number": 98,
          "question": "How willing are you to adapt to a different healthcare culture and system after relocating? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["health_wellness"]
        },
        {
          "number": 99,
          "question": "How important is it that your destination's health and wellness infrastructure is improving and trending upward?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 100,
          "question": "Rank these overall health categories from most to least important for your relocation: Healthcare access & system, Healthcare quality, Fitness & physical wellness, Mental health, Pharmaceuticals, Holistic wellness, Health infrastructure, Chronic/specialized care, Lifestyle health, Health investment",
          "type": "Ranking",
          "modules": ["health_wellness"]
        }
      ]
    }
  ]
};
