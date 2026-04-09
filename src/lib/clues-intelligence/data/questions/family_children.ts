import type { QuestionModule } from './types';

// Family & Children — 100 questions
// Module ID: family_children

export const familyChildrenQuestions: QuestionModule = {
  "moduleId": "family_children",
  "moduleName": "Family & Children",
  "fileName": "FAMILY_CHILDREN_QUESTIONS.md",
  "structure": "10 sections x 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Family Structure & Life Stage",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "What is your current family structure?",
          "type": "Single select",
          "modules": ["family_children"]
        },
        {
          "number": 2,
          "question": "How many children do you currently have (if any), and what are their ages?",
          "type": "Number + age ranges",
          "modules": ["family_children"]
        },
        {
          "number": 3,
          "question": "Are you planning to have children in the next 5 years?",
          "type": "Yes/No/Maybe",
          "modules": ["family_children"]
        },
        {
          "number": 4,
          "question": "Do you have elderly parents or extended family who may join you or need nearby access?",
          "type": "Yes/No/Maybe",
          "modules": ["family_children"]
        },
        {
          "number": 5,
          "question": "How important is multi-generational living arrangements or proximity in your destination?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 6,
          "question": "Do any family members have special needs that require specific services or infrastructure?",
          "type": "Yes/No + details",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 7,
          "question": "How important is your destination's legal recognition and protection of your family structure?",
          "type": "Likert-Importance",
          "modules": ["family_children", "legal_immigration"]
        },
        {
          "number": 8,
          "question": "Are you relocating as a single parent? If so, how important is single-parent support infrastructure?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 9,
          "question": "Do you have shared custody arrangements that require proximity to a specific country or region?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 10,
          "question": "Rank these family structure factors from most to least important: Legal family recognition, Multi-generational support, Special needs services, Single-parent infrastructure, Custody/proximity requirements",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Childcare & Early Years",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is access to affordable, high-quality daycare and nursery programs?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 12,
          "question": "What type of childcare arrangement do you prefer? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["family_children"]
        },
        {
          "number": 13,
          "question": "How important is government-subsidized or free childcare?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 14,
          "question": "What is the maximum monthly childcare cost you would accept per child?",
          "type": "Budget range",
          "modules": ["family_children", "financial_banking"]
        },
        {
          "number": 15,
          "question": "How important is the availability of nannies, au pairs, or in-home childcare providers?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 16,
          "question": "Do you need childcare facilities with flexible hours (early drop-off, late pickup, weekends)?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 17,
          "question": "How important is it that childcare providers are licensed, regulated, and inspected by the government?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 18,
          "question": "Do you need childcare in a specific language?",
          "type": "Yes/No + language",
          "modules": ["family_children"]
        },
        {
          "number": 19,
          "question": "How important are parent-and-child social groups (playgroups, mommy-and-me classes)?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 20,
          "question": "Rank these childcare factors from most to least important: Affordability, Quality/regulation, Availability/hours, Language of care, Government subsidies",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Parental Leave & Family Benefits",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is generous paid parental leave (maternity and paternity) in your destination?",
          "type": "Likert-Importance",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 22,
          "question": "What minimum parental leave duration would you consider acceptable?",
          "type": "Duration range",
          "modules": ["family_children"]
        },
        {
          "number": 23,
          "question": "How important are government child benefits or family allowance payments?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 24,
          "question": "Do you need access to fertility treatments or assisted reproduction services?",
          "type": "Yes/No",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 25,
          "question": "How important is the country's adoption and foster care system and legal framework?",
          "type": "Likert-Importance",
          "modules": ["family_children", "legal_immigration"]
        },
        {
          "number": 26,
          "question": "Do you need access to prenatal and postnatal healthcare programs (birthing centers, midwives)?",
          "type": "Yes/No",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 27,
          "question": "How important is workplace flexibility for parents (remote work, flexible hours, part-time options)?",
          "type": "Likert-Importance",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 28,
          "question": "Do you need tax benefits or deductions specifically for families with children?",
          "type": "Yes/No/Maybe",
          "modules": ["family_children", "financial_banking"]
        },
        {
          "number": 29,
          "question": "How important is a country's overall family-friendly policy reputation?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 30,
          "question": "Rank these family benefit factors from most to least important: Parental leave duration, Child benefit payments, Workplace flexibility, Tax benefits for families, Fertility/reproductive services",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Children's Health & Pediatric Services",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is access to high-quality pediatric healthcare?",
          "type": "Likert-Importance",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 32,
          "question": "Do you need pediatric specialists (allergists, neurologists, developmental pediatricians) nearby?",
          "type": "Yes/No + specialties",
          "modules": ["family_children"]
        },
        {
          "number": 33,
          "question": "How important is the availability of a children's hospital within a reasonable distance?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 34,
          "question": "Do you need access to pediatric dental and orthodontic services?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 35,
          "question": "How important are comprehensive childhood vaccination programs?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 36,
          "question": "Do any of your children have chronic conditions requiring ongoing specialist care?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 37,
          "question": "How important is access to child psychology and mental health services?",
          "type": "Likert-Importance",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 38,
          "question": "Do you need pediatric emergency services available 24/7 within 30 minutes?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 39,
          "question": "How important is the availability of lactation consultants, breastfeeding support, and newborn care services?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 40,
          "question": "Rank these pediatric factors from most to least important: Pediatric specialist access, Children's hospital proximity, Vaccination programs, Mental health services, Emergency pediatric care",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Family Recreation & Activities",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is access to family-friendly parks, playgrounds, and outdoor spaces?",
          "type": "Likert-Importance",
          "modules": ["family_children", "outdoor_recreation"]
        },
        {
          "number": 42,
          "question": "Which family activities are important to your lifestyle? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["family_children"]
        },
        {
          "number": 43,
          "question": "How important is access to children's museums, science centers, and educational attractions?",
          "type": "Likert-Importance",
          "modules": ["family_children", "arts_culture", "education_learning"]
        },
        {
          "number": 44,
          "question": "Do you need family-friendly swimming pools, sports clubs, or recreation centers nearby?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 45,
          "question": "How important is the availability of organized children's sports leagues and programs?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 46,
          "question": "Do you need access to summer camps, holiday programs, or school-break childcare?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 47,
          "question": "How important is a family-friendly restaurant and entertainment scene?",
          "type": "Likert-Importance",
          "modules": ["family_children", "food_dining", "entertainment_nightlife"]
        },
        {
          "number": 48,
          "question": "Do you want neighborhoods with other families and children for socialization?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 49,
          "question": "How important is access to indoor play spaces and activities for rainy or extreme weather days?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 50,
          "question": "Rank these recreation factors from most to least important: Parks and playgrounds, Organized sports, Cultural/educational attractions, Holiday programs, Family-friendly dining and entertainment",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Family Safety & Child Protection",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is overall child safety rankings and statistics in choosing a destination?",
          "type": "Likert-Importance",
          "modules": ["family_children", "safety_security"]
        },
        {
          "number": 52,
          "question": "Do you need safe, walkable neighborhoods where children can play outside independently?",
          "type": "Yes/No",
          "modules": ["family_children", "safety_security", "neighborhood_urban_design"]
        },
        {
          "number": 53,
          "question": "How important are strict child protection laws and enforcement?",
          "type": "Likert-Importance",
          "modules": ["family_children", "safety_security"]
        },
        {
          "number": 54,
          "question": "How concerned are you about online safety and cyberbullying protections for children?",
          "type": "Concern scale",
          "modules": ["family_children"]
        },
        {
          "number": 55,
          "question": "How important is school bus or safe school transportation availability?",
          "type": "Likert-Importance",
          "modules": ["family_children", "transportation_mobility", "education_learning"]
        },
        {
          "number": 56,
          "question": "Do you need neighborhoods with traffic-calming measures (speed bumps, pedestrian zones) for child safety?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 57,
          "question": "How important is the presence of crossing guards, bike lanes, and safe routes to school?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 58,
          "question": "How concerned are you about substance abuse accessibility to minors in the destination?",
          "type": "Concern scale",
          "modules": ["family_children"]
        },
        {
          "number": 59,
          "question": "How important is local community policing focused on family and child safety?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 60,
          "question": "Rank these safety factors from most to least important: Overall child safety statistics, Safe walkable neighborhoods, Child protection laws, School transportation, Traffic calming and safe routes",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Teenage & Young Adult Needs",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Do you have teenagers or young adults whose needs will influence your relocation?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 62,
          "question": "How important is access to age-appropriate social activities and youth culture?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 63,
          "question": "Do your teens need access to SAT/ACT prep, university counseling, or gap year programs?",
          "type": "Yes/No",
          "modules": ["family_children", "education_learning"]
        },
        {
          "number": 64,
          "question": "How important is a safe and active nightlife scene for young adults (18-25)?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 65,
          "question": "Do you need access to teen mental health and counseling services?",
          "type": "Yes/No",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 66,
          "question": "How important is the availability of part-time jobs and internships for teenagers?",
          "type": "Likert-Importance",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 67,
          "question": "Do your teenagers need access to competitive academic or athletic programs?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 68,
          "question": "How important is peer diversity and multicultural exposure for your teenager's social development?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 69,
          "question": "How concerned are you about local driving age laws and teen driving safety?",
          "type": "Concern scale",
          "modules": ["family_children"]
        },
        {
          "number": 70,
          "question": "Rank these teen factors from most to least important: Social and youth culture, University preparation, Mental health services, Part-time job availability, Peer diversity",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Family Integration & Community",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is having an established expat family community in your destination?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 72,
          "question": "Do you need family-oriented community organizations or social clubs?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 73,
          "question": "How important are parent-teacher associations and school community involvement opportunities?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 74,
          "question": "How important is cultural sensitivity and inclusivity toward international families?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 75,
          "question": "Do you need access to family counseling or marriage and family therapy services?",
          "type": "Yes/No",
          "modules": ["family_children", "health_wellness"]
        },
        {
          "number": 76,
          "question": "How important is it that your neighborhood has a family-friendly culture (vs. singles/nightlife-oriented)?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 77,
          "question": "Do you need access to religious or cultural family programming (Sunday school, cultural classes)?",
          "type": "Yes/No",
          "modules": ["family_children", "religion_spirituality", "cultural_heritage_traditions"]
        },
        {
          "number": 78,
          "question": "How important is the ability to maintain your family's cultural traditions and heritage in the new location?",
          "type": "Likert-Importance",
          "modules": ["family_children", "cultural_heritage_traditions"]
        },
        {
          "number": 79,
          "question": "Would you choose a smaller city or suburb over a major city for better family community?",
          "type": "Slider",
          "modules": ["family_children"]
        },
        {
          "number": 80,
          "question": "Rank these community factors from most to least important: Expat family network, Community organizations, School involvement, Cultural inclusivity, Family counseling access",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Work-Life Balance & Family Time",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How important is the country's work culture in supporting family time (reasonable hours, no weekend work expectations)?",
          "type": "Likert-Importance",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 82,
          "question": "Do you need a destination where school holidays align with typical work vacation periods?",
          "type": "Yes/No",
          "modules": ["family_children"]
        },
        {
          "number": 83,
          "question": "How important is average commute time in preserving family time?",
          "type": "Likert-Importance",
          "modules": ["family_children", "transportation_mobility"]
        },
        {
          "number": 84,
          "question": "Do you need flexible work arrangements (remote, hybrid) to manage family responsibilities?",
          "type": "Yes/No",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 85,
          "question": "How important is proximity to extended family for regular visits and support?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 86,
          "question": "Do you need affordable and frequent flight connections to family in your home country?",
          "type": "Yes/No",
          "modules": ["family_children", "transportation_mobility"]
        },
        {
          "number": 87,
          "question": "How important is the country's attitude toward family meals, weekends, and protected family time?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 88,
          "question": "Do you need access to family-oriented vacation destinations within a short flight or drive?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 89,
          "question": "How important is the ability to take family medical leave or emergency family leave from work?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 90,
          "question": "Rank these work-life factors from most to least important: Work-culture family friendliness, Commute time, Proximity to extended family, Flight connections home, Vacation destination access",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    },
    {
      "title": "Family Deal-Breakers & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which family-related factors would absolutely disqualify a destination? (Select all that apply)",
          "type": "Multi-select dealbreaker",
          "modules": ["family_children"]
        },
        {
          "number": 92,
          "question": "What is the single most important family factor in your relocation decision?",
          "type": "Single select",
          "modules": ["family_children"]
        },
        {
          "number": 93,
          "question": "Would you sacrifice career advancement for a destination with better family quality of life?",
          "type": "Slider",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 94,
          "question": "How important is the destination country's overall ranking on family-friendly indexes?",
          "type": "Likert-Importance",
          "modules": ["family_children"]
        },
        {
          "number": 95,
          "question": "Do you require a destination where both partners can legally work?",
          "type": "Yes/No",
          "modules": ["family_children", "professional_career", "legal_immigration"]
        },
        {
          "number": 96,
          "question": "How important is spousal career opportunity in your relocation decision?",
          "type": "Likert-Importance",
          "modules": ["family_children", "professional_career"]
        },
        {
          "number": 97,
          "question": "Would you choose a location with excellent family infrastructure over lower cost of living?",
          "type": "Slider",
          "modules": ["family_children", "financial_banking"]
        },
        {
          "number": 98,
          "question": "Do you have any specific family needs not covered above that would impact your relocation?",
          "type": "Open text",
          "modules": ["family_children"]
        },
        {
          "number": 99,
          "question": "Rate the overall importance of Family & Children factors in your relocation decision (1-10)",
          "type": "Slider",
          "modules": ["family_children"]
        },
        {
          "number": 100,
          "question": "FINAL MODULE RANKING: Drag all 10 sections to rank by overall importance to your relocation decision",
          "type": "Ranking",
          "modules": ["family_children"]
        }
      ]
    }
  ]
};
