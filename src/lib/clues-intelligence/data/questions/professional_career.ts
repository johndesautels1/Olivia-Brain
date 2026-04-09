import type { QuestionModule } from './types';

// Professional & Career Development — 100 questions
// Module ID: professional_career

export const professionalCareerQuestions: QuestionModule = {
  "moduleId": "professional_career",
  "moduleName": "Professional & Career Development",
  "fileName": "PROFESSIONAL_CAREER_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Current Career & Work Style",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "What is your current employment status? (Select one: employed full-time, employed part-time, self-employed/freelance, business owner, retired, not currently working, student, multiple roles)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 2,
          "question": "Which best describes your primary work arrangement? (Select one: fully in-office, hybrid, fully remote, field/travel-based, shift-based, flexible/variable)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 3,
          "question": "How established is your current career (years of experience in your primary field)?",
          "type": "Range",
          "modules": ["professional_career"]
        },
        {
          "number": 4,
          "question": "What is your primary industry/field? (Select one: technology/IT, finance/banking, healthcare/medical, education/academia, legal, engineering, creative/media, hospitality/tourism, real estate, consulting, manufacturing, government/public sector, nonprofit, retail/commerce, energy, agriculture, other)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 5,
          "question": "How specialized is your professional skill set versus generalist versatility?",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 6,
          "question": "Does your current work require professional licenses or certifications that may not transfer internationally?",
          "type": "Yes/No",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 7,
          "question": "How important is career advancement and growth opportunities in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 8,
          "question": "What is your preferred company size/work environment? (Select one: startup/small <50, mid-size 50-500, large corporation 500+, solo/freelance, government/institutional, no preference)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 9,
          "question": "How important is your existing professional network in your current location?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 10,
          "question": "Rank these current career factors from most to least important: Employment flexibility, Work arrangement, Career advancement, Professional network, Industry specialization",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Remote Work & Location Independence",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "Can your current work be performed fully remotely from another country?",
          "type": "Yes/No",
          "modules": ["professional_career"]
        },
        {
          "number": 12,
          "question": "How important is reliable high-speed internet for your professional work?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "technology_connectivity"]
        },
        {
          "number": 13,
          "question": "How important is access to co-working spaces or business centers in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 14,
          "question": "How important is timezone alignment with your primary clients or colleagues?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 15,
          "question": "How willing are you to work non-standard hours to accommodate timezone differences?",
          "type": "Likert-Willingness",
          "modules": ["professional_career"]
        },
        {
          "number": 16,
          "question": "How important is access to professional-grade technology infrastructure (video conferencing, cloud services, VPN reliability)?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "technology_connectivity"]
        },
        {
          "number": 17,
          "question": "How dependent is your income on your current geographic location?",
          "type": "Likert-Concern",
          "modules": ["professional_career"]
        },
        {
          "number": 18,
          "question": "Are you open to changing careers or industries as part of your relocation?",
          "type": "Yes/No",
          "modules": ["professional_career"]
        },
        {
          "number": 19,
          "question": "How important is having a dedicated home office or professional workspace?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "housing_property"]
        },
        {
          "number": 20,
          "question": "Rank these remote work factors from most to least important: Internet reliability, Co-working access, Timezone alignment, Technology infrastructure, Home office setup",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Industry & Opportunity",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is it that your industry has a strong presence in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 22,
          "question": "How important are major employers in your field being located nearby?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 23,
          "question": "How important is proximity to universities or research institutions for your work?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "education_learning"]
        },
        {
          "number": 24,
          "question": "Do you need access to specialized facilities, labs, or professional equipment?",
          "type": "Yes/No",
          "modules": ["professional_career"]
        },
        {
          "number": 25,
          "question": "How important is access to industry conferences, events, and professional meetups?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 26,
          "question": "How important is being in a recognized business cluster or innovation hub for your field?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 27,
          "question": "How important is access to specific suppliers, vendors, or business partners in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 28,
          "question": "How important is intellectual property protection and enforcement in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 29,
          "question": "How important is access to trade organizations or professional associations in your field?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 30,
          "question": "Rank these industry factors from most to least important: Industry presence, Major employers, Research institutions, Business cluster, IP protection",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Income & Compensation",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How do you expect your income to change with international relocation? (Select one: significant increase, modest increase, remain similar, modest decrease acceptable, significant decrease acceptable)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 32,
          "question": "What is your minimum acceptable annual income in your destination (adjusted for local cost of living)?",
          "type": "Range",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 33,
          "question": "How important is salary competitiveness compared to your current market?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 34,
          "question": "What type of compensation structure do you prefer? (Select one: fixed salary, salary plus bonus, commission-based, equity/profit-sharing, project-based/contract, mixed)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 35,
          "question": "How important are traditional employment benefits (health insurance, retirement plans, paid leave)?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "health_wellness", "financial_banking"]
        },
        {
          "number": 36,
          "question": "How comfortable are you with currency fluctuation affecting your income?",
          "type": "Likert-Comfort",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 37,
          "question": "How important is building long-term wealth and assets in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 38,
          "question": "Do you need income that supports dependents or family obligations in your home country?",
          "type": "Yes/No",
          "modules": ["professional_career", "family_children", "financial_banking"]
        },
        {
          "number": 39,
          "question": "How comfortable are you with income that varies seasonally or is performance-based?",
          "type": "Likert-Comfort",
          "modules": ["professional_career"]
        },
        {
          "number": 40,
          "question": "Rank these income factors from most to least important: Income level, Salary competitiveness, Benefits package, Currency stability, Wealth building",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Entrepreneurship & Business Ownership",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Do you plan to start or operate a business in your destination?",
          "type": "Yes/No",
          "modules": ["professional_career"]
        },
        {
          "number": 42,
          "question": "How important is ease of business registration and startup processes for foreign entrepreneurs?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 43,
          "question": "How important is access to startup funding, venture capital, or business loans for foreign nationals?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 44,
          "question": "How important is a favorable tax environment for small businesses and entrepreneurs?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "financial_banking", "legal_immigration"]
        },
        {
          "number": 45,
          "question": "How important is access to business incubators, accelerators, or mentorship programs?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 46,
          "question": "How important is a strong local consumer market for your business or services?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 47,
          "question": "How important is the ability to hire local and foreign employees for your business?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 48,
          "question": "How concerned are you about bureaucracy and regulatory complexity for foreign business owners?",
          "type": "Likert-Concern",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 49,
          "question": "How important is access to legal, accounting, and business advisory services in your language?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 50,
          "question": "Rank these entrepreneurship factors from most to least important: Ease of setup, Funding access, Tax environment, Consumer market, Hiring ability",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Work Environment & Culture",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "What business culture communication style do you prefer? (Select one: direct/explicit, indirect/contextual, collaborative/consensus, formal/hierarchical, casual/flat)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 52,
          "question": "How important is workplace diversity and inclusion in your professional environment?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 53,
          "question": "What level of workplace formality do you prefer?",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 54,
          "question": "How important is work-life balance versus career intensity?",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 55,
          "question": "How willing are you to adapt to a very different workplace culture and business etiquette? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 56,
          "question": "How comfortable are you with workplace hierarchy and formal structures different from your home country?",
          "type": "Likert-Comfort",
          "modules": ["professional_career"]
        },
        {
          "number": 57,
          "question": "How important is corporate social responsibility and ethical business practices in your workplace?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 58,
          "question": "How important is gender equality and equal opportunity in your professional environment?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 59,
          "question": "How important is a workplace that accommodates your cultural and religious practices?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 60,
          "question": "Rank these work culture factors from most to least important: Communication style, Diversity/inclusion, Work-life balance, Formality level, Ethical practices",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Professional Credentials & Development",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Do your professional credentials and qualifications transfer to your destination country?",
          "type": "Yes/No",
          "modules": ["professional_career", "legal_immigration", "education_learning"]
        },
        {
          "number": 62,
          "question": "How important is access to credential recognition and equivalency services?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 63,
          "question": "How important is access to professional development and continuing education programs?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "education_learning"]
        },
        {
          "number": 64,
          "question": "How important is access to mentorship and professional guidance in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 65,
          "question": "How important is access to professional certification and training programs recognized internationally?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 66,
          "question": "How important is building a personal professional brand in your new market?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 67,
          "question": "How important is access to professional networking events and industry connections?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 68,
          "question": "How willing are you to retrain or earn new credentials to work in your destination?",
          "type": "Likert-Willingness",
          "modules": ["professional_career", "education_learning"]
        },
        {
          "number": 69,
          "question": "How important is access to language training for professional/business communication?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "education_learning"]
        },
        {
          "number": 70,
          "question": "Rank these credential factors from most to least important: Credential transfer, Equivalency services, Continuing education, Mentorship access, Professional networking",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Labor Market & Employment Rights",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is a low unemployment rate and strong job market in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 72,
          "question": "How important are worker protection laws (unfair dismissal, severance, contracts) for foreign employees?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 73,
          "question": "How important is it that your destination allows work permits for your occupation/skill level?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 74,
          "question": "How important are anti-discrimination employment laws protecting foreign workers?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "legal_immigration"]
        },
        {
          "number": 75,
          "question": "How concerned are you about language barriers limiting your employment options?",
          "type": "Likert-Concern",
          "modules": ["professional_career"]
        },
        {
          "number": 76,
          "question": "How important is access to professional recruitment agencies and job placement services?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 77,
          "question": "How important is the minimum wage and standard compensation level relative to cost of living?",
          "type": "Likert-Importance",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 78,
          "question": "How important are mandatory paid leave and vacation policies in your destination?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 79,
          "question": "How willing are you to accept a lower professional status initially while establishing yourself in a new market? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 80,
          "question": "Rank these labor market factors from most to least important: Job market strength, Worker protections, Work permit access, Anti-discrimination laws, Compensation standards",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Professional Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept a lower salary in exchange for better quality of life in your destination?",
          "type": "Likert-Willingness",
          "modules": ["professional_career"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept limited career advancement in exchange for lifestyle benefits?",
          "type": "Likert-Willingness",
          "modules": ["professional_career"]
        },
        {
          "number": 83,
          "question": "How willing are you to work in a different industry or role than your current career?",
          "type": "Likert-Willingness",
          "modules": ["professional_career"]
        },
        {
          "number": 84,
          "question": "How willing are you to accept a longer commute for better professional opportunities?",
          "type": "Likert-Willingness",
          "modules": ["professional_career", "transportation_mobility"]
        },
        {
          "number": 85,
          "question": "If your ideal career opportunity conflicts with your preferred lifestyle location, which would you prioritize?",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 86,
          "question": "How willing are you to invest 1-2 years building professional contacts before expecting full career success?",
          "type": "Likert-Willingness",
          "modules": ["professional_career"]
        },
        {
          "number": 87,
          "question": "How willing are you to navigate professional bureaucracy in a foreign language? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 88,
          "question": "How important is having a professional exit strategy if career opportunities do not materialize?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 89,
          "question": "How important is it that your destination's professional landscape is growing and improving?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Salary vs. lifestyle, Career advancement vs. location, Industry flexibility, Time investment, Exit strategy",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    },
    {
      "title": "Overall Professional Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which professional issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no work permit available, no jobs in my field, extremely low salaries, no credential recognition, hostile business environment, no internet/remote work infrastructure, language barrier too severe, no entrepreneurship path)",
          "type": "Multi-select",
          "modules": ["professional_career"]
        },
        {
          "number": 92,
          "question": "Which professional features are non-negotiable must-haves? (Select all that apply: work permit eligibility, jobs in my field, competitive salary, credential recognition, co-working spaces, business-friendly regulations, English-speaking workplace, professional networking opportunities)",
          "type": "Multi-select",
          "modules": ["professional_career"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank professional and career factors as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 94,
          "question": "What is your approximate annual budget for professional development (courses, certifications, networking, conferences)?",
          "type": "Range",
          "modules": ["professional_career", "financial_banking"]
        },
        {
          "number": 95,
          "question": "How do you primarily intend to earn income in your destination? (Select one: continue current remote job, find local employment, start a business, freelance/consult, invest/passive income, retire, combination)",
          "type": "Single-select",
          "modules": ["professional_career"]
        },
        {
          "number": 96,
          "question": "How willing are you to embrace completely different professional norms and business practices? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["professional_career"]
        },
        {
          "number": 97,
          "question": "How important is it that the local culture values and respects your profession or industry?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 98,
          "question": "How frequently do you plan to return to your home country for professional reasons (meetings, conferences, clients)?",
          "type": "Likert-Frequency",
          "modules": ["professional_career", "transportation_mobility"]
        },
        {
          "number": 99,
          "question": "How important is it that your destination's economy and job market are trending upward?",
          "type": "Likert-Importance",
          "modules": ["professional_career"]
        },
        {
          "number": 100,
          "question": "Rank these overall professional categories from most to least important for your relocation: Current career & work style, Remote work capability, Industry & opportunity, Income & compensation, Entrepreneurship, Work culture, Credentials & development, Labor market & rights, Professional trade-offs, Overall professional investment",
          "type": "Ranking",
          "modules": ["professional_career"]
        }
      ]
    }
  ]
};
