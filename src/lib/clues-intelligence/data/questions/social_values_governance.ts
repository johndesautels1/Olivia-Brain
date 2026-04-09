import type { QuestionModule } from './types';

// Social Values & Governance — 100 questions
// Module ID: social_values_governance

export const socialValuesGovernanceQuestions: QuestionModule = {
  "moduleId": "social_values_governance",
  "moduleName": "Social Values & Governance",
  "fileName": "SOCIAL_VALUES_GOVERNANCE_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Government & Governance",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is government transparency and public accountability in your destination country?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 2,
          "question": "Which democratic freedoms are non-negotiable for you? (Select all that apply: free elections, freedom of speech, freedom of press, freedom of assembly, right to protest, independent judiciary, political opposition allowed, civilian government control)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 3,
          "question": "How concerned are you about government corruption in your destination?",
          "type": "Likert-Concern",
          "modules": ["social_values_governance"]
        },
        {
          "number": 4,
          "question": "How important is strong rule of law and judicial independence?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 5,
          "question": "How important is long-term political stability and peaceful transitions of power?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "safety_security"]
        },
        {
          "number": 6,
          "question": "How important are civic participation opportunities (voting rights for residents, town halls, public comment periods, referendums)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 7,
          "question": "How do you feel about the balance between government services and personal taxation?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 8,
          "question": "How important are digital government services and e-governance (online tax filing, digital IDs, electronic voting)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 9,
          "question": "How tolerant are you of bureaucracy and red tape in government processes?",
          "type": "Likert-Comfort",
          "modules": ["social_values_governance"]
        },
        {
          "number": 10,
          "question": "Rank these governance factors from most to least important: Government transparency, Democratic freedoms, Low corruption, Rule of law, Political stability",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Personal Freedoms",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "Which restrictions on personal freedom are absolute dealbreakers? (Select all that apply: censorship, surveillance state, restricted internet, banned political speech, restricted movement, mandatory military service, restricted religious practice, restricted personal appearance)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 12,
          "question": "How important is unrestricted freedom of expression (speech, press, art, online)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 13,
          "question": "How important are strong privacy rights protections (data protection laws, limits on government surveillance, warrant requirements)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 14,
          "question": "How important is freedom of religion and philosophical belief (practice, conversion, atheism)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "religion_spirituality"]
        },
        {
          "number": 15,
          "question": "How important are legal protections and social acceptance for LGBTQ+ individuals?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "sexual_beliefs_practices_laws", "safety_security"]
        },
        {
          "number": 16,
          "question": "How important are women's rights and full gender equality under the law?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 17,
          "question": "How important is access to reproductive rights and reproductive healthcare?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 18,
          "question": "How important is unrestricted freedom of movement and international travel?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 19,
          "question": "How important is freedom to make personal lifestyle choices (diet, recreation, relationships, personal appearance) without legal restriction?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 20,
          "question": "Rank these personal freedom factors from most to least important: Freedom of expression, Privacy rights, Religious freedom, LGBTQ+ rights, Women's rights",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Social Climate & Community",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is high social trust and community cohesion in your destination?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 22,
          "question": "How important is cultural and ethnic diversity in your destination community?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 23,
          "question": "Which social safety net programs are must-haves? (Select all that apply: universal healthcare, unemployment insurance, public pensions, disability benefits, public housing assistance, food assistance, free public education, paid parental leave, child allowances)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 24,
          "question": "How concerned are you about income inequality and wealth disparity in your destination?",
          "type": "Likert-Concern",
          "modules": ["social_values_governance"]
        },
        {
          "number": 25,
          "question": "How important is social mobility and opportunity for advancement regardless of background?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 26,
          "question": "Which community values must align with yours? (Select all that apply: environmental consciousness, intellectual freedom, entrepreneurial spirit, collectivism/community focus, individualism/personal autonomy, progressive social views, traditional family values, meritocracy, egalitarianism)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 27,
          "question": "How important is social tolerance for diverse lifestyles, beliefs, and identities?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 28,
          "question": "How important is strong legal protection of minority rights?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 29,
          "question": "How comfortable are you living in a society with strong social pressure to conform to local norms? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 30,
          "question": "Rank these social climate factors from most to least important: Social trust, Cultural diversity, Social safety net, Social mobility, Minority rights protection",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Civil Society & Justice",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is free, independent, and uncensored media in your destination?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 32,
          "question": "How important is the right to peaceful protest and public assembly?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 33,
          "question": "Which civil society elements are important to you? (Select all that apply: active NGOs, independent watchdog organizations, free trade unions, volunteer networks, community boards, advocacy groups, citizen journalism, philanthropic organizations)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 34,
          "question": "How important is access to affordable legal aid and an accessible justice system?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 35,
          "question": "How important are whistleblower protection laws?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 36,
          "question": "Which social justice issues are dealbreakers if unaddressed? (Select all that apply: systemic racism, police brutality, child labor, human trafficking, forced labor, political prisoners, censorship of media, persecution of minorities)",
          "type": "Multi-select",
          "modules": ["social_values_governance", "safety_security"]
        },
        {
          "number": 37,
          "question": "How do you feel about wealth distribution policies (progressive taxation, wealth taxes, universal basic income)?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 38,
          "question": "How important are strong labor rights and worker protections (minimum wage, safe conditions, union rights, anti-discrimination)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "professional_career"]
        },
        {
          "number": 39,
          "question": "How important are strong consumer protection laws and regulations?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 40,
          "question": "Rank these civil society factors from most to least important: Free media, Protest rights, Justice accessibility, Whistleblower protection, Labor rights",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Cultural Norms & Social Life",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Which substance-related cultural norms are you most comfortable with? (Select all that apply: legal alcohol, legal cannabis, legal tobacco, dry/prohibition culture, strict drug enforcement, harm reduction approach, social drinking culture, café culture over bar culture)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 42,
          "question": "How important is an open and progressive dating and relationship culture?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 43,
          "question": "Which family structures do you believe should be legally and socially accepted? (Select all that apply: single-parent families, same-sex parents, blended families, unmarried cohabitation, polyamorous relationships, multi-generational households, child-free couples, adopted families)",
          "type": "Multi-select",
          "modules": ["social_values_governance", "family_children", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 44,
          "question": "How important is a strong work-life balance culture (reasonable work hours, vacation time, anti-overwork norms)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "professional_career"]
        },
        {
          "number": 45,
          "question": "How would you describe your preferred social interaction style?",
          "type": "Single-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 46,
          "question": "How important is a culture of respect for elders and age-inclusive social norms?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 47,
          "question": "Which cultural taboos would be dealbreakers for you? (Select all that apply: public affection restrictions, alcohol prohibition, strict dress codes, gender segregation, restrictions on interfaith relationships, limited women's independence, mandatory religious observance, restrictions on artistic expression)",
          "type": "Multi-select",
          "modules": ["social_values_governance", "religion_spirituality", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 48,
          "question": "How important is a high-trust, honest social culture (low scam culture, fair dealing, reliable commitments)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 49,
          "question": "How important is a culture of hospitality and warmth toward newcomers and foreigners?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 50,
          "question": "Rank these cultural norm factors from most to least important: Work-life balance, Social openness, Dating/relationship culture, Hospitality culture, Honest/high-trust society",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Public Services & Infrastructure Values",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "Which public services must be excellent in your destination? (Select all that apply: public education, public healthcare, public transportation, postal service, libraries, emergency services, public parks, waste management, water/sewage)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 52,
          "question": "How important is social innovation and progress (progressive policies, pilot programs, forward-thinking governance)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 53,
          "question": "How important is environmental leadership and sustainability commitment (Paris Agreement compliance, renewable energy, conservation)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "environment_community_appearance"]
        },
        {
          "number": 54,
          "question": "How important are smart city features (intelligent traffic, IoT infrastructure, digital services, connected public systems)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 55,
          "question": "How important are community engagement platforms (citizen apps, participatory budgeting, public forums, community input systems)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 56,
          "question": "How important is government investment in arts, culture, and creative industries?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 57,
          "question": "How important is future-ready infrastructure (5G, EV charging, renewable energy grid, modern airports, high-speed rail)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "technology_connectivity", "transportation_mobility"]
        },
        {
          "number": 58,
          "question": "How important is your destination's ranking on international quality of life indices (HDI, World Happiness Report, Legatum Prosperity Index)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 59,
          "question": "How well do you need the overall social values of your destination to align with your personal values?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 60,
          "question": "Rank these public service factors from most to least important: Public service quality, Environmental leadership, Smart city features, Community engagement, Future-ready infrastructure",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Education System Values",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is a public education system that emphasizes critical thinking over rote memorization?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "education_learning"]
        },
        {
          "number": 62,
          "question": "How important is secular public education (no religious instruction in public schools)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "education_learning", "religion_spirituality"]
        },
        {
          "number": 63,
          "question": "How important is comprehensive sex education in schools?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "education_learning", "sexual_beliefs_practices_laws"]
        },
        {
          "number": 64,
          "question": "How important is education about diverse cultures, histories, and perspectives in schools?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 65,
          "question": "How important is free or heavily subsidized higher education?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "education_learning"]
        },
        {
          "number": 66,
          "question": "How important are special education services and inclusive schooling for children with disabilities?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "education_learning", "family_children"]
        },
        {
          "number": 67,
          "question": "How important is arts and music education as a core part of the school curriculum?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 68,
          "question": "How important is environmental and sustainability education in schools?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 69,
          "question": "How important is digital literacy and technology education from an early age?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 70,
          "question": "Rank these education value factors from most to least important: Critical thinking focus, Secular education, Diverse curriculum, Free higher education, Inclusive/special education",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Healthcare & Wellbeing Values",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is universal healthcare coverage (government-provided or mandated insurance for all)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "health_wellness"]
        },
        {
          "number": 72,
          "question": "How do you feel about the balance between public and private healthcare systems?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 73,
          "question": "How important are accessible and affordable mental health services?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "health_wellness"]
        },
        {
          "number": 74,
          "question": "How important are government-funded childcare and family support programs?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "family_children"]
        },
        {
          "number": 75,
          "question": "How important are quality elder care services and aging-in-place support?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 76,
          "question": "How important are comprehensive disability services and accessibility standards?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 77,
          "question": "How important are publicly funded addiction treatment and recovery services?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 78,
          "question": "How important is a well-funded emergency and crisis support system (disaster relief, crisis hotlines, emergency shelters)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 79,
          "question": "How important are immigrant and newcomer integration programs (language classes, cultural orientation, employment support)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "legal_immigration"]
        },
        {
          "number": 80,
          "question": "Rank these healthcare and wellbeing factors from most to least important: Universal healthcare, Mental health services, Family support, Elder care, Newcomer integration",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Urban Design & Built Environment Values",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "Which neighborhood character traits are must-haves? (Select all that apply: walkable streets, mixed-use zoning, green spaces, historic preservation, modern architecture, low-rise buildings, car-free zones, vibrant street life, quiet residential feel)",
          "type": "Multi-select",
          "modules": ["social_values_governance", "neighborhood_urban_design"]
        },
        {
          "number": 82,
          "question": "What is your preferred housing density?",
          "type": "Single-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 83,
          "question": "How do you feel about building heights and scale in your neighborhood (low-rise vs. high-rise)?",
          "type": "Single-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 84,
          "question": "How important is pedestrian-friendly street design (wide sidewalks, traffic calming, crosswalks)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 85,
          "question": "How do you feel about the balance between public and private space in your neighborhood?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 86,
          "question": "How important are noise and activity zoning regulations (quiet residential zones, separated commercial areas)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 87,
          "question": "How do you feel about the balance between historic preservation and modern development?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 88,
          "question": "How important is universal accessibility design (wheelchair ramps, accessible transit, braille signage)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance", "neighborhood_urban_design", "transportation_mobility"]
        },
        {
          "number": 89,
          "question": "How important are view protections and sight line regulations (building height limits, scenic overlook preservation)?",
          "type": "Likert-Importance",
          "modules": ["social_values_governance"]
        },
        {
          "number": 90,
          "question": "Rank these urban design factors from most to least important: Walkability, Housing density, Pedestrian safety, Historic preservation, Universal accessibility",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    },
    {
      "title": "Final Priorities & Trade-Offs",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which social values issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: authoritarian government, no free press, active persecution of minorities, no women's rights, no LGBTQ+ rights, state surveillance, no labor rights, forced religion, political instability)",
          "type": "Multi-select",
          "modules": ["social_values_governance", "safety_security"]
        },
        {
          "number": 92,
          "question": "What is the minimum acceptable social progress level for your destination?",
          "type": "Single-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 93,
          "question": "How willing are you to accept weaker social values alignment in exchange for other benefits (lower taxes, better climate, lower cost of living)?",
          "type": "Likert-Willingness",
          "modules": ["social_values_governance"]
        },
        {
          "number": 94,
          "question": "How strongly do you agree with: \"I prioritize personal freedom over collective security\"?",
          "type": "Likert-Agreement",
          "modules": ["social_values_governance"]
        },
        {
          "number": 95,
          "question": "How much do you intend to engage with civic and community life in your destination (volunteering, voting, activism, local politics)?",
          "type": "Likert-Willingness",
          "modules": ["social_values_governance"]
        },
        {
          "number": 96,
          "question": "How willing are you to adapt to different social norms and cultural expectations that may differ from your own? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 97,
          "question": "On a scale of 0-100, how flexible are you on social values alignment if other relocation factors are strong?",
          "type": "Slider",
          "modules": ["social_values_governance"]
        },
        {
          "number": 98,
          "question": "Which are your top 3 non-negotiable social value priorities? (Select exactly 3: democratic governance, personal freedom, social safety net, cultural tolerance, gender equality, environmental sustainability, economic opportunity, community cohesion, religious freedom)",
          "type": "Multi-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 99,
          "question": "Which global region best reflects the social values you are seeking?",
          "type": "Single-select",
          "modules": ["social_values_governance"]
        },
        {
          "number": 100,
          "question": "Rank these overall social values categories from most to least important for your relocation: Government & governance, Personal freedoms, Social climate, Civil society & justice, Cultural norms, Public services, Education values, Healthcare values, Urban design values, Trade-off flexibility",
          "type": "Ranking",
          "modules": ["social_values_governance"]
        }
      ]
    }
  ]
};
