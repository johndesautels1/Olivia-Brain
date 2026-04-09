import type { QuestionModule } from './types';

// Legal & Immigration — 100 questions
// Module ID: legal_immigration

export const legalImmigrationQuestions: QuestionModule = {
  "moduleId": "legal_immigration",
  "moduleName": "Legal & Immigration",
  "fileName": "LEGAL_IMMIGRATION_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Current Legal Status",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "What is your current citizenship status? (Select one: single citizenship, dual citizenship, multiple citizenships, stateless, refugee/asylum)",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 2,
          "question": "How many valid passports do you currently hold?",
          "type": "Number",
          "modules": ["legal_immigration"]
        },
        {
          "number": 3,
          "question": "Have you ever been denied a visa to any country?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 4,
          "question": "Do you have any criminal convictions on your record?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 5,
          "question": "Do you have any outstanding legal issues in your current country (lawsuits, investigations, pending charges)?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 6,
          "question": "How would you rate the strength of your current passport for international travel (visa-free access)?",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 7,
          "question": "Do you currently have legal residency status in any country other than your citizenship country?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 8,
          "question": "Are you subject to military service obligations in your current country?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 9,
          "question": "How complex is your overall legal situation regarding international relocation?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 10,
          "question": "Rank these current legal status factors from most to least important: Passport strength, Criminal record status, Outstanding legal issues, Military obligations, Existing residency rights",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Tax Obligations & Compliance",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "Are you required to file tax returns in your current country regardless of where you live (e.g., US citizens)?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 12,
          "question": "Do you currently owe any back taxes or have tax disputes with any government?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 13,
          "question": "How familiar are you with the tax implications of international relocation?",
          "type": "Likert-Comfort",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 14,
          "question": "Are you subject to foreign account reporting requirements (FATCA, FBAR, CRS)?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 15,
          "question": "How important is it to minimize your overall global tax burden through relocation?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 16,
          "question": "How important is access to tax treaties between your current and destination countries?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 17,
          "question": "Are you prepared to hire specialized international tax professionals?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 18,
          "question": "Are you concerned about currency exchange controls or restrictions in your destination?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 19,
          "question": "How complex are your current annual tax filings?",
          "type": "Single-select",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 20,
          "question": "Rank these tax factors from most to least important: Tax filing requirements, Global tax minimization, Treaty access, Reporting compliance, Currency controls",
          "type": "Ranking",
          "modules": ["legal_immigration", "financial_banking"]
        }
      ]
    },
    {
      "title": "Financial & Asset Legal",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "Do you own rental properties or real estate investments in your current country?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "housing_property", "financial_banking"]
        },
        {
          "number": 22,
          "question": "Do you have business ownership or partnership interests that complicate relocation?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career", "financial_banking"]
        },
        {
          "number": 23,
          "question": "Do you have retirement accounts or pensions that restrict your residence location?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 24,
          "question": "Do you have any trusts, foundations, or complex financial structures?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 25,
          "question": "Are you subject to inheritance or estate tax laws that affect your relocation decision?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 26,
          "question": "Do you have any debt obligations that could be affected by international relocation?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 27,
          "question": "How important is maintaining access to your current banking relationships after relocating?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 28,
          "question": "Are you willing to renounce citizenship to reduce tax obligations?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 29,
          "question": "Do you have any regulatory licenses or registrations that create ongoing legal obligations?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 30,
          "question": "Rank these financial legal factors from most to least important: Property ownership, Business interests, Retirement accounts, Estate planning, Banking access",
          "type": "Ranking",
          "modules": ["legal_immigration", "financial_banking"]
        }
      ]
    },
    {
      "title": "Visa & Residency Pathways",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "What type of visa or residency status are you seeking? (Select all that apply: tourist/visitor, work permit, investor visa, golden visa, digital nomad visa, retirement visa, entrepreneur visa, student visa, family reunification, permanent residency, citizenship by investment)",
          "type": "Multi-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 32,
          "question": "How long are you planning to stay in your destination country initially?",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 33,
          "question": "Do you meet minimum investment requirements for investor visas in your preferred countries?",
          "type": "Yes/No/Maybe",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 34,
          "question": "Do you have a job offer or business opportunity in your destination country?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 35,
          "question": "How important is having a clear pathway to permanent residency?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 36,
          "question": "Are you willing to spend 2-5 years meeting physical residency requirements?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 37,
          "question": "What is your preferred timeline for completing the relocation process?",
          "type": "Single-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 38,
          "question": "How important is it that your destination country allows dual citizenship?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 39,
          "question": "Are you prepared for potentially lengthy government processing times (6-24 months)?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 40,
          "question": "Rank these visa factors from most to least important: Visa type availability, Path to permanent residency, Processing time, Dual citizenship, Investment requirements",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Professional & Credential Recognition",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Do you have professional credentials that need to transfer to your destination country?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career", "education_learning"]
        },
        {
          "number": 42,
          "question": "What is your highest level of education?",
          "type": "Single-select",
          "modules": ["legal_immigration", "education_learning"]
        },
        {
          "number": 43,
          "question": "Do you speak the official language(s) of your preferred destination countries?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 44,
          "question": "Are you willing to take language proficiency tests for immigration purposes?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 45,
          "question": "Do you have professional licenses that require specific legal recognition abroad (medical, legal, engineering, financial)?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 46,
          "question": "How important is it that your professional qualifications are recognized without re-certification?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 47,
          "question": "Are you planning to start a business that requires specific legal structures or licenses in your destination?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "professional_career"]
        },
        {
          "number": 48,
          "question": "Do you have intellectual property, patents, or proprietary business information requiring international legal protection?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 49,
          "question": "How important is legal protection for your business activities in the destination country?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 50,
          "question": "Rank these professional factors from most to least important: Credential recognition, Language requirements, Business licensing, IP protection, Professional re-certification",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Family & Dependents",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "Do you have family members (spouse, children, parents) who would accompany you?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 52,
          "question": "How many dependents will accompany you on your relocation?",
          "type": "Number",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 53,
          "question": "If you have children, do you share custody with someone who might object to international relocation?",
          "type": "Yes/No/Maybe",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 54,
          "question": "Do you have elderly parents or family members requiring your care or legal administration (POA, guardianship, estate)?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 55,
          "question": "Are you married to someone from a different country than your own?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 56,
          "question": "How important is having legal mechanisms to eventually bring other family members to join you (family reunification)?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 57,
          "question": "Do you have any health conditions in your family that might affect immigration medical exams?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "health_wellness", "family_children"]
        },
        {
          "number": 58,
          "question": "How important is access to international family law services (cross-border custody, international divorce, inheritance)?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "family_children"]
        },
        {
          "number": 59,
          "question": "Do you have sufficient savings to support your family during the immigration process?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "financial_banking", "family_children"]
        },
        {
          "number": 60,
          "question": "Rank these family legal factors from most to least important: Dependent visas, Custody considerations, Family reunification, Medical exam requirements, Family law access",
          "type": "Ranking",
          "modules": ["legal_immigration", "family_children"]
        }
      ]
    },
    {
      "title": "Special Circumstances & Protections",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Are you LGBTQ+ and concerned about legal protections in destination countries?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 62,
          "question": "Do you have any disabilities that require specific legal protections or accommodations?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "health_wellness"]
        },
        {
          "number": 63,
          "question": "Are you concerned about gender-based legal rights in potential destination countries?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 64,
          "question": "Do you have any religious or cultural practices that may have country-specific legal limitations?",
          "type": "Yes/No",
          "modules": ["legal_immigration", "religion_spirituality"]
        },
        {
          "number": 65,
          "question": "Do you have any political asylum or refugee status considerations?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 66,
          "question": "Are you concerned about extradition treaties between your current and destination countries?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 67,
          "question": "Are you concerned about diplomatic relations between your home and destination countries?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 68,
          "question": "Do you have any military service background that might affect immigration eligibility?",
          "type": "Yes/No",
          "modules": ["legal_immigration"]
        },
        {
          "number": 69,
          "question": "How important is it to maintain your current legal name and identity in the destination country?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 70,
          "question": "Rank these special circumstance factors from most to least important: LGBTQ+ protections, Disability accommodations, Gender rights, Religious freedom, Political considerations",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Destination Legal System Quality",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is legal certainty and predictability in your destination country's legal system?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 72,
          "question": "How important is having clear legal rights to property ownership as a foreigner?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration", "housing_property"]
        },
        {
          "number": 73,
          "question": "How important is legal privacy and protection of personal information in your destination?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 74,
          "question": "How important is legal protection against potential asset seizure or confiscation?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 75,
          "question": "How important is an independent judiciary free from political interference?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 76,
          "question": "How important is access to English-speaking legal services and courts?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 77,
          "question": "How concerned are you about corruption in the destination country's legal system?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 78,
          "question": "How important is strong contract enforcement and commercial law in your destination?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 79,
          "question": "How important is consumer protection law and regulatory oversight?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 80,
          "question": "Rank these legal system factors from most to least important: Legal predictability, Property rights, Privacy laws, Asset protection, Judicial independence",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Long-term Legal Strategy",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Are you prepared to maintain legal compliance with multiple countries' laws simultaneously?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 82,
          "question": "How concerned are you about potential changes in immigration laws affecting your future status?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration"]
        },
        {
          "number": 83,
          "question": "Are you prepared to potentially lose certain legal rights you currently enjoy?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 84,
          "question": "Are you concerned about potential double taxation issues that might never be fully resolved?",
          "type": "Likert-Concern",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 85,
          "question": "Are you prepared for the legal complexity of managing estate planning across multiple jurisdictions?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 86,
          "question": "Are you prepared to invest significant time and money in ongoing legal compliance and planning?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 87,
          "question": "How important is having reliable access to legal counsel familiar with immigration law in your destination?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 88,
          "question": "Are you prepared to hire immigration lawyers and consultants in your destination country?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 89,
          "question": "How confident are you in your ability to successfully navigate the legal complexities of international relocation?",
          "type": "Likert-Comfort",
          "modules": ["legal_immigration"]
        },
        {
          "number": 90,
          "question": "Rank these long-term strategy factors from most to least important: Multi-country compliance, Immigration law stability, Estate planning, Legal costs, Professional legal support",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    },
    {
      "title": "Overall Legal Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which legal issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no visa pathway, no property rights for foreigners, mandatory military service, no dual citizenship, active sanctions, corruption in courts, no LGBTQ+ protections, no business ownership rights, extradition risk)",
          "type": "Multi-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 92,
          "question": "Which legal features are non-negotiable must-haves? (Select all that apply: clear visa pathway, property ownership rights, independent judiciary, foreigner protections, English legal services, dual citizenship, tax treaty, family reunification rights, business ownership rights)",
          "type": "Multi-select",
          "modules": ["legal_immigration"]
        },
        {
          "number": 93,
          "question": "How willing are you to accept a more complex legal situation in exchange for other relocation benefits (climate, cost, lifestyle)?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 94,
          "question": "On a scale of 0-100, how would you rank legal and immigration factors as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["legal_immigration"]
        },
        {
          "number": 95,
          "question": "How important is it that your destination's legal environment for foreigners is improving and trending positively?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 96,
          "question": "How flexible are you about your preferred destination countries if legal barriers arise?",
          "type": "Likert-Willingness",
          "modules": ["legal_immigration"]
        },
        {
          "number": 97,
          "question": "What is your approximate budget for immigration and legal services during the relocation process?",
          "type": "Range",
          "modules": ["legal_immigration", "financial_banking"]
        },
        {
          "number": 98,
          "question": "How willing are you to adapt to a fundamentally different legal system and culture? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["legal_immigration"]
        },
        {
          "number": 99,
          "question": "How important is having a \"Plan B\" destination in case your primary choice has legal complications?",
          "type": "Likert-Importance",
          "modules": ["legal_immigration"]
        },
        {
          "number": 100,
          "question": "Rank these overall legal categories from most to least important for your relocation: Current legal status, Tax obligations, Financial/asset legal, Visa pathways, Professional credentials, Family/dependents, Special protections, Legal system quality, Long-term strategy, Overall legal investment",
          "type": "Ranking",
          "modules": ["legal_immigration"]
        }
      ]
    }
  ]
};
