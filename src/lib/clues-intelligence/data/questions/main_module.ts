import type { QuestionModule } from './types';

// Main Module — 100 questions
// Module ID: main_module

export const mainModuleQuestions: QuestionModule = {
  "moduleId": "main_module",
  "moduleName": "Main Module",
  "fileName": "MAIN_MODULE_QUESTIONS.md",
  "structure": "3 sections — Demographics (34Q), Do Not Wants (33Q), Must Haves (33Q)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Demographics",
      "questionRange": "Q1-Q34",
      "questions": [
        {
          "number": 1,
          "question": "What is your nationality or primary citizenship? (Select one: United States, United Kingdom, Canada, Australia, Germany, France, Italy, Spain, Portugal, Ireland, Netherlands, Sweden, Switzerland, Mexico, Brazil, Argentina, Israel, South Africa, New Zealand, India, Japan, South Korea, Singapore, Other)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 2,
          "question": "Do you hold dual or multiple citizenships? If yes, which countries? (Select all that apply: United States, United Kingdom, Canada, Australia, Germany, France, Italy, Spain, Portugal, Ireland, Netherlands, Sweden, Switzerland, Mexico, Brazil, Argentina, Israel, South Africa, New Zealand, India, Japan, South Korea, Singapore, Other)",
          "type": "Multi-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 3,
          "question": "What is your current country of residence? (Select one: United States, United Kingdom, Canada, Australia, Germany, France, Italy, Spain, Portugal, Ireland, Netherlands, Sweden, Switzerland, Mexico, Brazil, Argentina, Israel, South Africa, New Zealand, India, Japan, South Korea, Singapore, Other)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 4,
          "question": "What is your age range? (Select one: 18-24, 25-34, 35-44, 45-54, 55-64, 65-74, 75+)",
          "type": "Single-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 5,
          "question": "What is your current relationship status? (Select one: single, in a relationship, married, domestic partnership, divorced, widowed)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 6,
          "question": "Will your partner/spouse relocate with you?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 7,
          "question": "Does your partner/spouse need work authorization in the new location?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 8,
          "question": "Do you have children?",
          "type": "Yes/No",
          "modules": ["family_children", "education_learning"]
        },
        {
          "number": 9,
          "question": "What are your children's age ranges? (Select all that apply: infant 0-2, toddler 3-5, elementary 6-10, middle school 11-13, high school 14-17, adult 18+)",
          "type": "Multi-select",
          "modules": ["family_children", "education_learning"]
        },
        {
          "number": 10,
          "question": "Will all children relocate with you?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 11,
          "question": "Do any of your children have special educational or medical needs?",
          "type": "Yes/No",
          "modules": ["family_children", "education_learning", "health_wellness"]
        },
        {
          "number": 12,
          "question": "What is your highest level of education completed? (Select one: high school, trade/vocational, associate's, bachelor's, master's, doctorate, professional degree)",
          "type": "Single-select",
          "modules": ["professional_career", "education_learning"]
        },
        {
          "number": 13,
          "question": "Are you involved in a skilled trade? If so, select your trade area. (Select all that apply: electrician, plumber, carpenter, welder, HVAC, automotive, machinist, construction, culinary/chef, cosmetology, medical technician, not applicable)",
          "type": "Multi-select",
          "modules": ["professional_career"]
        },
        {
          "number": 14,
          "question": "Are you currently or formerly in the military?",
          "type": "Yes/No",
          "modules": ["safety_security"]
        },
        {
          "number": 15,
          "question": "Do you need access to military or veteran services in your new location?",
          "type": "Yes/No",
          "modules": ["health_wellness", "safety_security"]
        },
        {
          "number": 16,
          "question": "What is your current employment status? (Select all that apply: employed full-time, employed part-time, self-employed, business owner, retired, unemployed, student)",
          "type": "Multi-select",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 17,
          "question": "What is your employment plan in your new location? (Select all that apply: seeking local employment, remote work, self-employed, business owner, retired, undecided)",
          "type": "Multi-select",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 18,
          "question": "What is your primary industry or professional field? (Select one: technology/IT, finance/banking, healthcare/medical, education, legal, engineering, real estate, hospitality/tourism, media/entertainment, marketing/advertising, consulting, manufacturing, retail/e-commerce, agriculture, government/public sector, non-profit, construction, transportation/logistics, energy/utilities, arts/creative, other)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 19,
          "question": "What is your preferred work arrangement? (Select one: fully remote, hybrid, in-office, freelance, retired)",
          "type": "Single-select",
          "modules": ["professional_career", "technology_connectivity"]
        },
        {
          "number": 20,
          "question": "What is your annual household income in USD? (Select one: under $25k, $25k-$50k, $50k-$75k, $75k-$100k, $100k-$150k, $150k-$200k, $200k-$300k, $300k-$500k, $500k+, prefer not to say)",
          "type": "Single-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 21,
          "question": "What percentage of your current income could you maintain if you relocated internationally? (Select one: 0-25%, 25-50%, 50-75%, 75-100%, 100%+, unsure)",
          "type": "Single-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 22,
          "question": "What is your current housing situation? (Select one: own, rent, live with family, other)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 23,
          "question": "What is your current monthly housing cost in USD? (Select one: under $500, $500-$1000, $1000-$1500, $1500-$2000, $2000-$3000, $3000-$5000, $5000-$7500, $7500-$10000, $10000+)",
          "type": "Single-select",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 24,
          "question": "How many bedrooms do you need in your new home? (Select one: studio, 1, 2, 3, 4, 5+)",
          "type": "Single-select",
          "modules": ["housing_property"]
        },
        {
          "number": 25,
          "question": "What type of area do you currently live in? (Select one: urban core, suburban, small town, rural)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 26,
          "question": "What is the approximate population of your current city or town? (Select one: under 10k, 10k-50k, 50k-100k, 100k-250k, 250k-500k, 500k-1 million, 1-5 million, 5 million+)",
          "type": "Single-select",
          "modules": ["neighborhood_urban_design"]
        },
        {
          "number": 27,
          "question": "Do you have any chronic health conditions or special medical requirements?",
          "type": "Yes/No",
          "modules": ["health_wellness"]
        },
        {
          "number": 28,
          "question": "What specific medical conditions require ongoing treatment or specialist access? (Select all that apply: allergies/immunology, arthritis/rheumatology, asthma, autoimmune disorders, blood disorders/hematology, cancer/oncology, cardiovascular/heart disease, cerebral palsy, chronic fatigue syndrome, chronic pain, Crohn's disease/IBD, cystic fibrosis, dementia/Alzheimer's, dermatology/skin conditions, diabetes (Type 1), diabetes (Type 2), eating disorders, endocrine/hormonal disorders, epilepsy/seizure disorders, fibromyalgia, gastrointestinal/digestive, genetic/hereditary conditions, hearing loss/audiology, hepatitis/liver disease, HIV/AIDS, hypertension, infectious disease, kidney/renal disease, lupus, Lyme disease, mental health - anxiety, mental health - bipolar disorder, mental health - depression, mental health - PTSD, mental health - schizophrenia, mental health - other, migraines/headache disorders, multiple sclerosis, muscular dystrophy, neurological disorders, obesity/metabolic, obstetrics/gynecology, ophthalmology/vision, organ transplant care, orthopedic/musculoskeletal, osteoporosis, Parkinson's disease, pediatric specialty care, pulmonary/respiratory, rare diseases, reproductive health/fertility, sickle cell disease, sleep disorders, speech/language therapy, spinal cord conditions, stroke recovery, substance use/addiction, thyroid disorders, tuberculosis, urology, vascular disease, none of the above)",
          "type": "Multi-select",
          "modules": ["health_wellness"]
        },
        {
          "number": 29,
          "question": "What are your regular modes of daily transportation? (Select all that apply: personal car, public transit/bus, subway/metro, commuter rail/train, bicycle, e-bike/e-scooter, walking, ride-hailing (Uber/Lyft), taxi, motorcycle/moped, carpool/vanpool, ferry/water taxi, company shuttle, electric vehicle, none/work from home)",
          "type": "Multi-select",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 30,
          "question": "Do you have pets that would relocate with you?",
          "type": "Yes/No",
          "modules": ["pets_animals"]
        },
        {
          "number": 31,
          "question": "What type and how many pets do you have? (Select all that apply: dog(s), cat(s), bird(s), reptile(s), fish, small mammals, exotic pets, none)",
          "type": "Multi-select",
          "modules": ["pets_animals"]
        },
        {
          "number": 32,
          "question": "Are any of your pets a breed that faces import restrictions in certain countries?",
          "type": "Yes/No",
          "modules": ["pets_animals", "legal_immigration"]
        },
        {
          "number": 33,
          "question": "Which languages do you speak fluently? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["cultural_heritage_traditions", "legal_immigration"]
        },
        {
          "number": 34,
          "question": "What is your relocation timeline? (Select one: immediate, 6 months, 1-2 years, 2+ years, exploring/no timeline)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Do Not Wants — Deal-Breakers",
      "questionRange": "Q35-Q67",
      "questions": [
        {
          "number": 35,
          "question": "How much do you want to avoid extreme heat (regularly over 35C / 95F)?",
          "type": "Dealbreaker",
          "modules": ["climate_weather"]
        },
        {
          "number": 36,
          "question": "How much do you want to avoid extreme cold (regularly below -10C / 14F)?",
          "type": "Dealbreaker",
          "modules": ["climate_weather"]
        },
        {
          "number": 37,
          "question": "How much do you want to avoid high humidity and tropical climate conditions?",
          "type": "Dealbreaker",
          "modules": ["climate_weather"]
        },
        {
          "number": 38,
          "question": "How much do you want to avoid significant natural disaster risks (earthquakes, hurricanes, floods, wildfires)?",
          "type": "Dealbreaker",
          "modules": ["climate_weather", "safety_security"]
        },
        {
          "number": 39,
          "question": "How much do you want to avoid severe air pollution (regularly unhealthy air quality)?",
          "type": "Dealbreaker",
          "modules": ["climate_weather", "environment_community_appearance"]
        },
        {
          "number": 40,
          "question": "How much do you want to avoid severe water quality or water shortage issues?",
          "type": "Dealbreaker",
          "modules": ["environment_community_appearance", "health_wellness"]
        },
        {
          "number": 41,
          "question": "How much do you want to avoid language barriers you cannot overcome?",
          "type": "Dealbreaker",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 42,
          "question": "How much do you want to avoid living under restrictive social or religious laws?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance", "religion_spirituality"]
        },
        {
          "number": 43,
          "question": "How much do you want to avoid a lack of diversity or a monocultural environment?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance", "cultural_heritage_traditions"]
        },
        {
          "number": 44,
          "question": "How much do you want to avoid hostile attitudes toward foreigners or immigrants?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 45,
          "question": "How much do you want to avoid gender-based or LGBTQ+ discrimination?",
          "type": "Dealbreaker",
          "modules": ["sexual_beliefs_practices_laws", "social_values_governance"]
        },
        {
          "number": 46,
          "question": "How much do you want to avoid religious intolerance or persecution?",
          "type": "Dealbreaker",
          "modules": ["religion_spirituality", "social_values_governance"]
        },
        {
          "number": 47,
          "question": "How much do you want to avoid a poor or inaccessible healthcare system?",
          "type": "Dealbreaker",
          "modules": ["health_wellness"]
        },
        {
          "number": 48,
          "question": "How much do you want to avoid unreliable infrastructure (power outages, poor roads, inconsistent utilities)?",
          "type": "Dealbreaker",
          "modules": ["technology_connectivity", "transportation_mobility"]
        },
        {
          "number": 49,
          "question": "How much do you want to avoid poor internet and telecommunications reliability?",
          "type": "Dealbreaker",
          "modules": ["technology_connectivity"]
        },
        {
          "number": 50,
          "question": "How much do you want to avoid high taxes without adequate public services in return?",
          "type": "Dealbreaker",
          "modules": ["financial_banking", "social_values_governance"]
        },
        {
          "number": 51,
          "question": "How much do you want to avoid a high cost of living that is not matched by quality of life?",
          "type": "Dealbreaker",
          "modules": ["financial_banking"]
        },
        {
          "number": 52,
          "question": "How much do you want to avoid an unstable economy and volatile currency?",
          "type": "Dealbreaker",
          "modules": ["financial_banking"]
        },
        {
          "number": 53,
          "question": "How much do you want to avoid living under an authoritarian or non-democratic government?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance"]
        },
        {
          "number": 54,
          "question": "How much do you want to avoid systemic corruption and an unreliable legal system?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 55,
          "question": "How much do you want to avoid political instability or civil unrest?",
          "type": "Dealbreaker",
          "modules": ["social_values_governance", "safety_security"]
        },
        {
          "number": 56,
          "question": "How much do you want to avoid high crime rates and personal safety concerns?",
          "type": "Dealbreaker",
          "modules": ["safety_security"]
        },
        {
          "number": 57,
          "question": "How much do you want to avoid a lack of personal safety for women and minorities?",
          "type": "Dealbreaker",
          "modules": ["safety_security", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 58,
          "question": "How much do you want to avoid complex visa or residency complications?",
          "type": "Dealbreaker",
          "modules": ["legal_immigration"]
        },
        {
          "number": 59,
          "question": "How much do you want to avoid a car-dependent lifestyle with no viable alternatives?",
          "type": "Dealbreaker",
          "modules": ["transportation_mobility", "neighborhood_urban_design"]
        },
        {
          "number": 60,
          "question": "How much do you want to avoid poor public transportation options?",
          "type": "Dealbreaker",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 61,
          "question": "How much do you want to avoid a lack of career or professional opportunities?",
          "type": "Dealbreaker",
          "modules": ["professional_career"]
        },
        {
          "number": 62,
          "question": "How much do you want to avoid lacking access to specific foods, products, or dietary needs?",
          "type": "Dealbreaker",
          "modules": ["food_dining", "shopping_services"]
        },
        {
          "number": 63,
          "question": "How much do you want to avoid isolation from family and close friends?",
          "type": "Dealbreaker",
          "modules": ["cultural_heritage_traditions", "transportation_mobility"]
        },
        {
          "number": 64,
          "question": "How much do you want to avoid limited education options for your children?",
          "type": "Dealbreaker",
          "modules": ["education_learning", "family_children"]
        },
        {
          "number": 65,
          "question": "How much do you want to avoid limited access to international airports and travel connectivity?",
          "type": "Dealbreaker",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 66,
          "question": "How much do you want to avoid excessive noise pollution or severe overcrowding?",
          "type": "Dealbreaker",
          "modules": ["neighborhood_urban_design", "environment_community_appearance"]
        },
        {
          "number": 67,
          "question": "How much do you want to avoid a lack of outdoor recreation, parks, and green spaces?",
          "type": "Dealbreaker",
          "modules": ["outdoor_recreation"]
        }
      ]
    },
    {
      "title": "Must Haves — Non-Negotiables",
      "questionRange": "Q68-Q100",
      "questions": [
        {
          "number": 68,
          "question": "How important is it that English (or your primary language) is widely spoken?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions"]
        },
        {
          "number": 69,
          "question": "How important is a welcoming attitude toward newcomers and foreigners?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "cultural_heritage_traditions"]
        },
        {
          "number": 70,
          "question": "How important is having job opportunities available in your professional field?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 71,
          "question": "How important is the ability to legally work in your new location?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 72,
          "question": "How important is a reasonable and affordable cost of living?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 73,
          "question": "How important is affordable housing availability (rent or purchase)?",
          "type": "Likert-Importance",
          "modules": ["housing_property", "financial_banking"]
        },
        {
          "number": 74,
          "question": "How important is a stable economy and reliable currency?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 75,
          "question": "How important is strong legal protection for foreigners and property rights?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 76,
          "question": "How important is access to quality healthcare and medical facilities?",
          "type": "Likert-Importance",
          "modules": ["health_wellness"]
        },
        {
          "number": 77,
          "question": "How important is a low crime rate and strong personal safety?",
          "type": "Likert-Importance",
          "modules": ["safety_security"]
        },
        {
          "number": 78,
          "question": "How important is political stability and democratic governance?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 79,
          "question": "How important is a clean environment (air, water, streets)?",
          "type": "Likert-Importance",
          "modules": ["environment_community_appearance"]
        },
        {
          "number": 80,
          "question": "How important is good air quality for daily life and outdoor activities?",
          "type": "Likert-Importance",
          "modules": ["climate_weather", "environment_community_appearance"]
        },
        {
          "number": 81,
          "question": "How important is reliable high-speed internet and modern telecommunications?",
          "type": "Likert-Importance",
          "modules": ["technology_connectivity"]
        },
        {
          "number": 82,
          "question": "How important is reliable utilities infrastructure (electricity, water, gas)?",
          "type": "Likert-Importance",
          "modules": ["technology_connectivity"]
        },
        {
          "number": 83,
          "question": "How important is good public transportation and transit options?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 84,
          "question": "How important are walkable neighborhoods where daily needs are nearby?",
          "type": "Likert-Importance",
          "modules": ["neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 85,
          "question": "How important is proximity to an international airport with good connections?",
          "type": "Likert-Importance",
          "modules": ["transportation_mobility"]
        },
        {
          "number": 86,
          "question": "How important is access to outdoor recreation, nature, and green spaces?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation"]
        },
        {
          "number": 87,
          "question": "How important is a vibrant food scene with diverse dining options?",
          "type": "Likert-Importance",
          "modules": ["food_dining"]
        },
        {
          "number": 88,
          "question": "How important is access to cultural activities (museums, theater, arts)?",
          "type": "Likert-Importance",
          "modules": ["arts_culture"]
        },
        {
          "number": 89,
          "question": "How important is access to fitness facilities and sports infrastructure?",
          "type": "Likert-Importance",
          "modules": ["outdoor_recreation", "health_wellness"]
        },
        {
          "number": 90,
          "question": "How important is nightlife and entertainment options?",
          "type": "Likert-Importance",
          "modules": ["entertainment_nightlife"]
        },
        {
          "number": 91,
          "question": "How important is a good education system (for you or your children)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 92,
          "question": "How important is access to professional networking and career development?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 93,
          "question": "How important is a family-friendly environment with child-oriented resources?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 94,
          "question": "How important is an expat or international community in your new location?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "social_values_governance"]
        },
        {
          "number": 95,
          "question": "How important is access to your religious or spiritual community?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 96,
          "question": "How important is a pet-friendly environment (parks, vets, pet-friendly housing)?",
          "type": "Likert-Importance",
          "modules": ["pets_animals"]
        },
        {
          "number": 97,
          "question": "How important is a climate and weather pattern that suits your lifestyle preferences?",
          "type": "Likert-Importance",
          "modules": ["climate_weather"]
        },
        {
          "number": 98,
          "question": "How important is the overall happiness and life satisfaction of residents in your prospective city?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "neighborhood_urban_design"]
        },
        {
          "number": 99,
          "question": "How important is it that the community actively embraces diversity and inclusion?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 100,
          "question": "How important is proximity to family, friends, or an existing support network?",
          "type": "Likert-Importance",
          "modules": ["cultural_heritage_traditions", "transportation_mobility"]
        }
      ]
    }
  ]
};
