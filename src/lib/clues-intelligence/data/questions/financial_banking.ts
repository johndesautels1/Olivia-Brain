import type { QuestionModule } from './types';

// Financial & Banking — 100 questions
// Module ID: financial_banking

export const financialBankingQuestions: QuestionModule = {
  "moduleId": "financial_banking",
  "moduleName": "Financial & Banking",
  "fileName": "FINANCIAL_BANKING_QUESTIONS.md",
  "structure": "10 sections x 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Banking Access & Infrastructure",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is having a major international bank with branches near your home?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 2,
          "question": "Which banking services are essential for your daily life? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 3,
          "question": "How comfortable are you using a fully digital/online bank with no physical branches?",
          "type": "Comfort scale",
          "modules": ["financial_banking"]
        },
        {
          "number": 4,
          "question": "Do you need multi-currency accounts for managing income or expenses in different currencies?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking"]
        },
        {
          "number": 5,
          "question": "How important is English-language (or your preferred language) banking support?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 6,
          "question": "How quickly do you need to be able to open a bank account after arriving in a new country?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 7,
          "question": "Which digital banking features are must-haves for you? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 8,
          "question": "How important is ATM availability and low-fee cash withdrawal access?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 9,
          "question": "Would you maintain bank accounts in your home country alongside local accounts?",
          "type": "Single-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 10,
          "question": "Rank these banking factors from most to least important: International bank access, Digital banking quality, Multi-currency support, ATM availability, Language support",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Cost of Living & Daily Expenses",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "What is your expected monthly household budget (excluding housing) in USD?",
          "type": "Budget range",
          "modules": ["financial_banking"]
        },
        {
          "number": 12,
          "question": "How sensitive are you to cost-of-living differences compared to your current location?",
          "type": "Sensitivity scale",
          "modules": ["financial_banking"]
        },
        {
          "number": 13,
          "question": "Which daily expenses concern you most when relocating? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 14,
          "question": "Would you accept a higher cost of living for better quality of life and services?",
          "type": "Slider",
          "modules": ["financial_banking"]
        },
        {
          "number": 15,
          "question": "How important is price transparency and predictability for everyday goods and services?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 16,
          "question": "How do you feel about tipping culture and service charges in restaurants and services?",
          "type": "Single-select",
          "modules": ["financial_banking", "food_dining"]
        },
        {
          "number": 17,
          "question": "What grocery and household spending level are you comfortable with monthly?",
          "type": "Budget range",
          "modules": ["financial_banking", "food_dining"]
        },
        {
          "number": 18,
          "question": "How important is affordable domestic help (cleaning, cooking, childcare) to your lifestyle?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "family_children"]
        },
        {
          "number": 19,
          "question": "Would you relocate to a lower cost-of-living area even if job opportunities are fewer?",
          "type": "Slider",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 20,
          "question": "Rank these cost factors from most to least important: Groceries and food, Utilities and services, Transportation costs, Healthcare costs, Domestic help affordability",
          "type": "Ranking",
          "modules": ["financial_banking", "health_wellness", "transportation_mobility", "food_dining"]
        }
      ]
    },
    {
      "title": "Taxation & Government Fees",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is a favorable personal income tax rate in your destination country?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 22,
          "question": "What is the maximum effective income tax rate you would accept?",
          "type": "Percentage range",
          "modules": ["financial_banking"]
        },
        {
          "number": 23,
          "question": "How important is the availability of tax treaties to avoid double taxation with your home country?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 24,
          "question": "Do you need a country with no capital gains tax or favorable capital gains treatment?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking"]
        },
        {
          "number": 25,
          "question": "How concerned are you about property taxes and annual real estate levies?",
          "type": "Concern scale",
          "modules": ["financial_banking", "housing_property"]
        },
        {
          "number": 26,
          "question": "How important is VAT/sales tax rate in your daily purchasing decisions?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 27,
          "question": "Do you require access to qualified international tax advisors in your destination?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 28,
          "question": "How important is government transparency about how tax revenue is spent?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 29,
          "question": "Would you accept higher taxes in exchange for better public services (healthcare, education, infrastructure)?",
          "type": "Slider",
          "modules": ["financial_banking", "health_wellness", "education_learning"]
        },
        {
          "number": 30,
          "question": "Rank these tax factors from most to least important: Income tax rate, Capital gains treatment, Property tax burden, VAT/sales tax, Double taxation treaties",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Investment & Wealth Management",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "Do you actively manage an investment portfolio that you would continue managing from abroad?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 32,
          "question": "Which investment vehicles are important for you to access locally? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 33,
          "question": "How important is access to international stock exchanges and trading platforms?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 34,
          "question": "Do you need local wealth management or private banking services?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking"]
        },
        {
          "number": 35,
          "question": "How important is the country's financial market stability and regulatory strength?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 36,
          "question": "Would you invest in local real estate as part of your financial strategy?",
          "type": "Likert-Willingness",
          "modules": ["financial_banking", "housing_property"]
        },
        {
          "number": 37,
          "question": "How important is cryptocurrency regulation clarity and exchange access in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 38,
          "question": "Do you need access to retirement account portability or international pension transfer options?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 39,
          "question": "How important is asset protection and favorable trust/estate planning laws?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "legal_immigration"]
        },
        {
          "number": 40,
          "question": "Rank these investment factors from most to least important: Stock market access, Real estate investment climate, Wealth management services, Crypto regulation clarity, Retirement account portability",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Credit & Lending",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is the ability to obtain a mortgage or property loan as a foreign buyer?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "housing_property"]
        },
        {
          "number": 42,
          "question": "Do you anticipate needing personal or business credit in your destination country?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking"]
        },
        {
          "number": 43,
          "question": "How important are competitive interest rates on loans and mortgages?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 44,
          "question": "Would you accept limited initial credit access while building a local credit history?",
          "type": "Slider",
          "modules": ["financial_banking"]
        },
        {
          "number": 45,
          "question": "How important is credit card availability with international rewards and travel benefits?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 46,
          "question": "Do you need access to business financing or startup loans in your destination?",
          "type": "Yes/No",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 47,
          "question": "How concerned are you about maintaining your home-country credit score while living abroad?",
          "type": "Concern scale",
          "modules": ["financial_banking"]
        },
        {
          "number": 48,
          "question": "How important is the availability of microfinance or community lending options?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 49,
          "question": "Would you bring proof of international creditworthiness to secure better local lending terms?",
          "type": "Likert-Willingness",
          "modules": ["financial_banking"]
        },
        {
          "number": 50,
          "question": "Rank these credit factors from most to least important: Mortgage availability for foreigners, Credit card access, Business financing, Interest rates, Credit history portability",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Insurance & Risk Protection",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "Which types of insurance do you consider essential in a new country? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking", "health_wellness"]
        },
        {
          "number": 52,
          "question": "How important is access to international health insurance versus local-only plans?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "health_wellness"]
        },
        {
          "number": 53,
          "question": "Do you need property insurance for natural disasters specific to certain regions (earthquakes, hurricanes, floods)?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking", "housing_property", "climate_weather"]
        },
        {
          "number": 54,
          "question": "How important is liability insurance coverage (personal and professional) in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 55,
          "question": "Do you require life insurance that is portable across countries?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 56,
          "question": "How important is vehicle insurance affordability and coverage quality?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "transportation_mobility"]
        },
        {
          "number": 57,
          "question": "Would you use a global insurance broker or prefer working with local providers?",
          "type": "Single-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 58,
          "question": "How important is renter's insurance or contents insurance for your belongings?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "housing_property"]
        },
        {
          "number": 59,
          "question": "Do you need specialty insurance (art, jewelry, collections, high-value items)?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 60,
          "question": "Rank these insurance factors from most to least important: Health insurance quality, Property/disaster coverage, Liability protection, Life insurance portability, Vehicle insurance",
          "type": "Ranking",
          "modules": ["financial_banking", "health_wellness", "housing_property", "transportation_mobility"]
        }
      ]
    },
    {
      "title": "Money Transfer & Currency Exchange",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How frequently will you need to send or receive international money transfers?",
          "type": "Likert-Frequency",
          "modules": ["financial_banking"]
        },
        {
          "number": 62,
          "question": "What is the typical amount per international transfer?",
          "type": "Amount range",
          "modules": ["financial_banking"]
        },
        {
          "number": 63,
          "question": "How important are low fees and competitive exchange rates on international transfers?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 64,
          "question": "Which money transfer services do you currently use or prefer? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 65,
          "question": "How important is same-day or instant international transfer capability?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 66,
          "question": "Do you need to regularly convert large sums between currencies (e.g., for property purchases)?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 67,
          "question": "How concerned are you about currency volatility affecting your purchasing power in your destination?",
          "type": "Concern scale",
          "modules": ["financial_banking"]
        },
        {
          "number": 68,
          "question": "Would you use hedging or forward contracts to protect against currency fluctuations?",
          "type": "Likert-Willingness",
          "modules": ["financial_banking"]
        },
        {
          "number": 69,
          "question": "How important is the ability to receive salary or income in a foreign currency without excessive conversion fees?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 70,
          "question": "Rank these transfer factors from most to least important: Transfer fees, Exchange rates, Transfer speed, Service reliability, Currency hedging options",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Retirement & Long-Term Financial Planning",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "Are you relocating with retirement as a primary or secondary goal?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking"]
        },
        {
          "number": 72,
          "question": "Do you have a pension or retirement fund from your home country that you need to access abroad?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 73,
          "question": "How important is a country's retirement visa or retiree-friendly residency program?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "legal_immigration"]
        },
        {
          "number": 74,
          "question": "What is your expected retirement income source? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["financial_banking"]
        },
        {
          "number": 75,
          "question": "How important is affordable high-quality healthcare in retirement planning for your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "health_wellness"]
        },
        {
          "number": 76,
          "question": "Do you plan to purchase property as part of your retirement financial strategy?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking", "housing_property"]
        },
        {
          "number": 77,
          "question": "How important is estate planning and inheritance law favorability in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "legal_immigration"]
        },
        {
          "number": 78,
          "question": "Would you consider a country with a lower cost of living to stretch your retirement savings further?",
          "type": "Likert-Willingness",
          "modules": ["financial_banking"]
        },
        {
          "number": 79,
          "question": "How important is the stability of the local currency for long-term financial planning?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 80,
          "question": "Rank these retirement factors from most to least important: Pension accessibility, Retirement visa programs, Healthcare affordability, Estate/inheritance laws, Currency stability",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Business & Entrepreneurial Finance",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Do you plan to start or operate a business in your destination country?",
          "type": "Yes/No/Maybe",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 82,
          "question": "How important is ease of company registration and business licensing for foreigners?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "professional_career", "legal_immigration"]
        },
        {
          "number": 83,
          "question": "Do you need access to venture capital, angel investors, or startup funding ecosystems?",
          "type": "Yes/No",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 84,
          "question": "How important is a favorable corporate tax rate for your business?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "professional_career"]
        },
        {
          "number": 85,
          "question": "Do you need the ability to repatriate business profits to your home country without excessive restrictions?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 86,
          "question": "How important are free trade zones or special economic zones for your business operations?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 87,
          "question": "Do you require access to commercial banking services (merchant accounts, payroll, invoicing)?",
          "type": "Yes/No",
          "modules": ["financial_banking"]
        },
        {
          "number": 88,
          "question": "How important is intellectual property protection and enforcement in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "legal_immigration"]
        },
        {
          "number": 89,
          "question": "Would you accept more bureaucracy in exchange for stronger financial regulation and fraud protection?",
          "type": "Slider",
          "modules": ["financial_banking"]
        },
        {
          "number": 90,
          "question": "Rank these business finance factors from most to least important: Company registration ease, Corporate tax rate, Funding ecosystem, Profit repatriation, IP protection",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    },
    {
      "title": "Financial Deal-Breakers & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which financial factors would absolutely disqualify a destination? (Select all that apply)",
          "type": "Multi-select dealbreaker",
          "modules": ["financial_banking"]
        },
        {
          "number": 92,
          "question": "What is the single most important financial factor in your relocation decision?",
          "type": "Single select",
          "modules": ["financial_banking"]
        },
        {
          "number": 93,
          "question": "How willing are you to pay for professional financial relocation advice (tax planning, banking setup, investment transfer)?",
          "type": "Likert-Willingness",
          "modules": ["financial_banking"]
        },
        {
          "number": 94,
          "question": "How important is financial privacy and banking secrecy laws in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking"]
        },
        {
          "number": 95,
          "question": "Would you accept financial inconveniences (limited ATMs, cash-heavy economy) for other lifestyle benefits?",
          "type": "Slider",
          "modules": ["financial_banking"]
        },
        {
          "number": 96,
          "question": "How concerned are you about fraud, scams, or financial crime targeting expatriates?",
          "type": "Concern scale",
          "modules": ["financial_banking", "safety_security"]
        },
        {
          "number": 97,
          "question": "How important is government economic stability and low inflation in your destination?",
          "type": "Likert-Importance",
          "modules": ["financial_banking", "social_values_governance"]
        },
        {
          "number": 98,
          "question": "Do you have any specific financial needs not covered above that would impact your relocation?",
          "type": "Open text",
          "modules": ["financial_banking"]
        },
        {
          "number": 99,
          "question": "Rate the overall importance of Financial & Banking factors in your relocation decision (1-10)",
          "type": "Slider",
          "modules": ["financial_banking"]
        },
        {
          "number": 100,
          "question": "FINAL MODULE RANKING: Drag all 10 sections to rank by overall importance to your relocation decision",
          "type": "Ranking",
          "modules": ["financial_banking"]
        }
      ]
    }
  ]
};
