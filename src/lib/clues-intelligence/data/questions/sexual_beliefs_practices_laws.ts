import type { QuestionModule } from './types';

// Sexual Beliefs, Practices & Laws — 100 questions
// Module ID: sexual_beliefs_practices_laws

export const sexualBeliefsPracticesLawsQuestions: QuestionModule = {
  "moduleId": "sexual_beliefs_practices_laws",
  "moduleName": "Sexual Beliefs, Practices & Laws",
  "fileName": "SEXUAL_BELIEFS_PRACTICES_LAWS_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Reproductive Rights & Access",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How important is legal abortion access in your destination country?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 2,
          "question": "What level of abortion access do you require? (Select one: full unrestricted access, access with reasonable limits, access in medical emergencies only, not a factor for me, prefer restrictions)",
          "type": "Single-select",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 3,
          "question": "How important is unrestricted access to contraception (birth control pills, IUDs, condoms, implants)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 4,
          "question": "How important is emergency contraception (morning-after pill) availability without prescription?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 5,
          "question": "Which reproductive healthcare services are important for you to access? (Select all that apply: prenatal care, fertility treatments/IVF, genetic counseling, reproductive surgery, midwifery, surrogacy, egg/sperm donation, postpartum care, none)",
          "type": "Multi-select",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 6,
          "question": "How important is bodily autonomy protection in your destination's laws?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 7,
          "question": "How important is legal protection for reproductive healthcare providers in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 8,
          "question": "How important is insurance or public health coverage for reproductive healthcare?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 9,
          "question": "How important is access to fertility treatments (IVF, egg freezing, surrogacy) regardless of marital status or sexual orientation?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 10,
          "question": "Rank these reproductive rights factors from most to least important: Abortion access, Contraception access, Reproductive healthcare services, Bodily autonomy laws, Insurance coverage",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "LGBTQ+ Legal Rights & Protections",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is legal same-sex marriage recognition in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 12,
          "question": "How important are legal protections against LGBTQ+ discrimination in employment, housing, and services?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "legal_immigration", "safety_security"]
        },
        {
          "number": 13,
          "question": "What level of transgender legal recognition do you require? (Select one: full legal gender change without surgery, legal change with medical requirements, some recognition, not a factor for me)",
          "type": "Single-select",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 14,
          "question": "How important is legal adoption and parenting equality for LGBTQ+ individuals and couples?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "family_children", "legal_immigration"]
        },
        {
          "number": 15,
          "question": "How important are hate crime protections based on sexual orientation and gender identity?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security", "legal_immigration"]
        },
        {
          "number": 16,
          "question": "How important is it that conversion therapy is banned in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 17,
          "question": "How important is legal recognition of civil partnerships and domestic partnerships?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 18,
          "question": "How important are workplace equality protections specifically for LGBTQ+ individuals?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 19,
          "question": "How important are legal protections for LGBTQ+ youth in schools (anti-bullying, inclusive curricula)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "education_learning", "safety_security"]
        },
        {
          "number": 20,
          "question": "Rank these LGBTQ+ rights factors from most to least important: Marriage equality, Anti-discrimination laws, Transgender recognition, Adoption equality, Hate crime protections",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Sexual Freedom & Privacy",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is freedom from government regulation of private consensual sexual conduct?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 22,
          "question": "How important is legal protection for sexual minorities and alternative lifestyles (polyamory, kink, etc.)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 23,
          "question": "How important is protection of sexual privacy rights from government surveillance?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 24,
          "question": "How do you feel about your destination's public decency and sexual expression laws?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 25,
          "question": "How important is legal protection from sexual harassment in workplace and public spaces?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security"]
        },
        {
          "number": 26,
          "question": "How important are strong sexual consent laws and enforcement?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security", "legal_immigration"]
        },
        {
          "number": 27,
          "question": "How concerned are you about religious exemptions from sexual freedom protections in your destination?",
          "type": "Likert-Concern",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 28,
          "question": "How do you feel about regulation of sexual content in media and advertising?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 29,
          "question": "How important is protection of digital sexual privacy (sexting laws, revenge porn laws, online harassment)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 30,
          "question": "Rank these sexual freedom factors from most to least important: Private conduct freedom, Sexual minority protections, Privacy rights, Harassment protections, Consent laws",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Cultural Values & Social Acceptance",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "What level of cultural conservatism versus liberalism do you prefer regarding sexuality in your destination?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 32,
          "question": "How important is social acceptance of diverse sexual orientations in your community?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 33,
          "question": "How comfortable are you with public displays of affection across different relationship types in your community?",
          "type": "Likert-Comfort",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 34,
          "question": "How important is gender expression and role flexibility being accepted in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 35,
          "question": "How important is body positivity and sexual diversity acceptance in local culture?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 36,
          "question": "How do you feel about alternative relationship structures (polyamory, open relationships) being socially visible?",
          "type": "Likert-Comfort",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 37,
          "question": "How important is feminist and gender equality integration in your destination's sexual culture?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 38,
          "question": "How important is access to LGBTQ+-affirming religious or spiritual communities?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "religion_spirituality"]
        },
        {
          "number": 39,
          "question": "How willing are you to adapt your public expression of sexuality to local cultural norms? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 40,
          "question": "Rank these cultural values factors from most to least important: Sexual liberalism/conservatism, Social acceptance, Gender flexibility, Body positivity, Feminist integration",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Sexual Healthcare & Education",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is comprehensive sexual education in schools aligned with your values?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "education_learning"]
        },
        {
          "number": 42,
          "question": "How important is access to sexual health clinics and STI testing facilities?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 43,
          "question": "How important is access to gender-affirming healthcare services (hormone therapy, surgery, counseling)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 44,
          "question": "How important is sexual health insurance coverage (STI treatment, sexual wellness, gender-affirming care)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 45,
          "question": "How important is sexual health privacy in medical records and healthcare settings?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 46,
          "question": "How important is access to sexual wellness and pleasure education through healthcare providers?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 47,
          "question": "How important is access to HIV/AIDS prevention services (PrEP, PEP, testing, treatment)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 48,
          "question": "How important is access to sexual violence prevention, response services, and survivor support?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security", "health_wellness"]
        },
        {
          "number": 49,
          "question": "How important is sexual health information and contraception access for teenagers?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 50,
          "question": "Rank these healthcare factors from most to least important: Sex education policy, Sexual health clinics, Gender-affirming care, HIV/AIDS services, Violence prevention",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Sex Work & Adult Industry Regulation",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "What is your preferred legal approach to sex work in your destination? (Select one: full legalization and regulation, decriminalization, Nordic model/buyer criminalization, full prohibition, no opinion)",
          "type": "Single-select",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 52,
          "question": "How important is sex worker safety and labor protections in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 53,
          "question": "How do you feel about the regulation and visibility of adult entertainment venues in your area?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 54,
          "question": "How do you feel about online adult content regulation in your destination?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 55,
          "question": "How important is anti-trafficking enforcement and victim protection in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security"]
        },
        {
          "number": 56,
          "question": "How important is mandatory STI testing and health regulation for the sex industry?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 57,
          "question": "How concerned are you about proximity to red-light districts or adult entertainment zones?",
          "type": "Likert-Concern",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 58,
          "question": "How important is sex offender registration and community notification laws in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security"]
        },
        {
          "number": 59,
          "question": "How important is child protection from sexual exploitation and online predation?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "family_children", "safety_security"]
        },
        {
          "number": 60,
          "question": "Rank these regulation factors from most to least important: Sex work legal framework, Worker safety, Anti-trafficking, Sex offender registry, Child protection",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Dating Culture & Social Life",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is the availability of dating apps and online matchmaking platforms in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 62,
          "question": "How easy do you need it to be for a foreigner or expat to enter the local dating scene?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 63,
          "question": "How important is social acceptance of interracial, interethnic, or intercultural romantic relationships?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 64,
          "question": "How important is it that the local culture supports autonomous partner choice rather than family-arranged matchmaking?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 65,
          "question": "How important is an active social and nightlife scene for meeting potential partners (bars, social clubs, meetup groups)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "entertainment_nightlife"]
        },
        {
          "number": 66,
          "question": "How concerned are you about social stigma or pressure around being single, unmarried, or child-free?",
          "type": "Likert-Concern",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 67,
          "question": "How important is personal safety while dating as a foreigner (romance scams, targeting of expats)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "safety_security"]
        },
        {
          "number": 68,
          "question": "How important is social acceptance of dating as a single parent or after divorce?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 69,
          "question": "How willing are you to adapt to local dating customs and courtship norms? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 70,
          "question": "Rank these dating factors from most to least important: Dating accessibility, Intercultural acceptance, Autonomous partner choice, Social scene, Dating safety",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Relationship & Family Structure",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important is social and legal acceptance of cohabitation before marriage?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 72,
          "question": "How important is social acceptance of diverse family structures (single parents, blended families, same-sex parents, child-free couples)?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "family_children"]
        },
        {
          "number": 73,
          "question": "How important are equitable divorce laws and processes in your destination?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "legal_immigration"]
        },
        {
          "number": 74,
          "question": "How important is social acceptance of age-gap romantic relationships?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 75,
          "question": "How important is social acceptance of interfaith or non-religious romantic relationships?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "religion_spirituality"]
        },
        {
          "number": 76,
          "question": "How important is the availability of relationship counseling, couples therapy, and mediation services?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "health_wellness"]
        },
        {
          "number": 77,
          "question": "How important is that social venues and community events cater to diverse age groups for meeting people?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 78,
          "question": "How important is the local culture's support for maintaining friendships and social connections outside of a romantic partnership?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 79,
          "question": "How willing are you to accept different relationship and family norms than your home culture? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 80,
          "question": "Rank these relationship factors from most to least important: Cohabitation acceptance, Diverse family acceptance, Divorce equity, Counseling access, Social connection culture",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Sexual Beliefs Trade-Offs & Priorities",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How willing are you to accept more conservative sexual norms in exchange for better overall quality of life?",
          "type": "Likert-Willingness",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 82,
          "question": "How willing are you to accept limited LGBTQ+ legal protections in exchange for other important benefits?",
          "type": "Likert-Willingness",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 83,
          "question": "How willing are you to accept limited reproductive healthcare access in exchange for lower cost of living?",
          "type": "Likert-Willingness",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 84,
          "question": "How willing are you to be more private about your sexual identity or lifestyle in a less progressive environment? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 85,
          "question": "How willing are you to accept different gender role expectations in exchange for cultural richness?",
          "type": "Likert-Willingness",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 86,
          "question": "How concerned are you about the direction your destination is trending on sexual rights (progressive vs. regressive)?",
          "type": "Likert-Concern",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 87,
          "question": "How important is it that your destination is actively improving its sexual rights and freedoms?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 88,
          "question": "How willing are you to be an advocate or activist for sexual rights in a less progressive environment?",
          "type": "Likert-Willingness",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 89,
          "question": "How important is it that the local expat community shares your values on sexual rights and freedoms?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 90,
          "question": "Rank these trade-off priorities from most to least important: Conservative norms vs. quality of life, LGBTQ+ rights vs. other benefits, Reproductive access vs. cost, Gender roles vs. culture, Rights trajectory",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    },
    {
      "title": "Overall Sexual Beliefs Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which sexual rights issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: criminalized homosexuality, no abortion access, no contraception access, no LGBTQ+ protections, forced marriage legal, no sexual harassment laws, no gender-affirming healthcare, criminalized adultery, death penalty for sexual offenses, no divorce rights)",
          "type": "Multi-select",
          "modules": ["sexual_beliefs_practices_laws", "safety_security", "legal_immigration"]
        },
        {
          "number": 92,
          "question": "Which sexual rights features are non-negotiable must-haves? (Select all that apply: marriage equality, LGBTQ+ anti-discrimination, abortion access, contraception access, sexual harassment protections, gender-affirming healthcare, consent laws, sexual privacy protections, dating freedom, divorce rights)",
          "type": "Multi-select",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank sexual beliefs, practices, and laws as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 94,
          "question": "How important is it that the local culture's sexual values broadly align with your own?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 95,
          "question": "How important is living in a destination known internationally as progressive on sexual rights?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 96,
          "question": "How willing are you to embrace and understand the local culture's approach to sexuality, even if different from yours? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 97,
          "question": "How important is access to sexual and reproductive health services in your language?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 98,
          "question": "How important is it that your children grow up in a sexually inclusive and educated environment?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws", "family_children", "education_learning"]
        },
        {
          "number": 99,
          "question": "How important is it that your destination's sexual rights landscape is improving and trending upward?",
          "type": "Likert-Importance",
          "modules": ["sexual_beliefs_practices_laws"]
        },
        {
          "number": 100,
          "question": "Rank these overall sexual beliefs categories from most to least important for your relocation: Reproductive rights, LGBTQ+ legal rights, Sexual freedom & privacy, Cultural values & acceptance, Sexual healthcare & education, Sex work regulation, Dating culture, Relationship & family structure, Sexual beliefs trade-offs, Overall sexual rights investment",
          "type": "Ranking",
          "modules": ["sexual_beliefs_practices_laws"]
        }
      ]
    }
  ]
};
