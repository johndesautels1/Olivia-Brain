import type { QuestionModule } from './types';

// Education & Learning — 100 questions
// Module ID: education_learning

export const educationLearningQuestions: QuestionModule = {
  "moduleId": "education_learning",
  "moduleName": "Education & Learning",
  "fileName": "EDUCATION_LEARNING_QUESTIONS.md",
  "structure": "10 sections x 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Early Childhood & Primary Education",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "Do you have or plan to have children who will need schooling in your destination?",
          "type": "Yes/No/Maybe",
          "modules": ["education_learning", "family_children"]
        },
        {
          "number": 2,
          "question": "How important is access to high-quality preschool and early childhood programs?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 3,
          "question": "Which primary school types would you consider? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 4,
          "question": "How important is the availability of international or bilingual primary schools?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 5,
          "question": "What is the maximum acceptable commute time for your child's school?",
          "type": "Time range",
          "modules": ["education_learning", "transportation_mobility"]
        },
        {
          "number": 6,
          "question": "How important are small class sizes (under 20 students) in primary education?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 7,
          "question": "Which teaching methodologies appeal to you? (Montessori, Waldorf, IB, traditional, etc.)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 8,
          "question": "How important is after-school care and extracurricular program availability?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 9,
          "question": "Would you pay premium tuition for a top-rated international school?",
          "type": "Likert-Willingness",
          "modules": ["education_learning", "financial_banking"]
        },
        {
          "number": 10,
          "question": "Rank these primary education factors from most to least important: School quality/reputation, Proximity to home, Tuition affordability, Teaching methodology, Language of instruction",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Secondary & High School Education",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is access to internationally recognized secondary school programs (IB, A-Levels, AP)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 12,
          "question": "Which secondary school credentials matter most for your family's future plans?",
          "type": "Single select",
          "modules": ["education_learning"]
        },
        {
          "number": 13,
          "question": "How important is college/university preparation and counseling at the secondary level?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 14,
          "question": "Do you need secondary schools with instruction in a specific language?",
          "type": "Yes/No + language",
          "modules": ["education_learning"]
        },
        {
          "number": 15,
          "question": "How important are competitive athletics and sports programs at the secondary level?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 16,
          "question": "How important are STEM (Science, Technology, Engineering, Math) program offerings?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 17,
          "question": "How important are arts, music, and creative programs at the secondary level?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 18,
          "question": "What is the maximum annual tuition you would pay for secondary education per child?",
          "type": "Budget range",
          "modules": ["education_learning", "financial_banking"]
        },
        {
          "number": 19,
          "question": "How important is the school's track record of university placement (top 100 global universities)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 20,
          "question": "Rank these secondary education factors from most to least important: Academic rigor, University placement record, Extracurricular programs, Tuition cost, International accreditation",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "University & Higher Education",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "Do you or a family member plan to attend university in your destination country?",
          "type": "Yes/No/Maybe",
          "modules": ["education_learning"]
        },
        {
          "number": 22,
          "question": "How important is proximity to internationally ranked universities?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 23,
          "question": "Which fields of study need to be available locally? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 24,
          "question": "How important is affordable university tuition (including for international students)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 25,
          "question": "Would you consider a destination specifically because of its university offerings?",
          "type": "Likert-Willingness",
          "modules": ["education_learning"]
        },
        {
          "number": 26,
          "question": "How important is the availability of English-language university programs?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 27,
          "question": "Do you need access to graduate or postgraduate programs (Masters, PhD)?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 28,
          "question": "How important is university campus culture and student life quality?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 29,
          "question": "How important are research opportunities and academic partnerships with global institutions?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 30,
          "question": "Rank these university factors from most to least important: Global ranking, Tuition affordability, Program availability, Language of instruction, Campus and student life",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Vocational & Technical Training",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "Do you or a family member need access to vocational or technical training programs?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 32,
          "question": "Which vocational fields are relevant to your needs? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 33,
          "question": "How important is government-subsidized vocational training in your destination?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 34,
          "question": "Do you need trade certifications that are recognized internationally?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 35,
          "question": "How important is apprenticeship availability in skilled trades?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 36,
          "question": "Would you retrain or upskill in a new field as part of your relocation?",
          "type": "Likert-Willingness",
          "modules": ["education_learning", "professional_career"]
        },
        {
          "number": 37,
          "question": "How important is the local job market's demand for technically trained workers?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "professional_career"]
        },
        {
          "number": 38,
          "question": "Do you need access to coding bootcamps, digital skills programs, or tech training?",
          "type": "Yes/No",
          "modules": ["education_learning", "professional_career", "technology_connectivity"]
        },
        {
          "number": 39,
          "question": "How important is employer-sponsored training and professional development in the local job market?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "professional_career"]
        },
        {
          "number": 40,
          "question": "Rank these vocational factors from most to least important: Program availability, International certification, Cost/subsidies, Job market demand, Apprenticeship access",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Language Learning & Multilingual Education",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How important is access to language learning programs for the local language?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 42,
          "question": "What is your current proficiency in the language of your target destination?",
          "type": "Proficiency scale",
          "modules": ["education_learning"]
        },
        {
          "number": 43,
          "question": "Which language learning formats do you prefer? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 44,
          "question": "How important is government-funded or subsidized language training for immigrants?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 45,
          "question": "Do you want your children educated in a bilingual or multilingual environment?",
          "type": "Yes/No/Maybe",
          "modules": ["education_learning"]
        },
        {
          "number": 46,
          "question": "How quickly do you expect to achieve conversational fluency in the local language?",
          "type": "Time range",
          "modules": ["education_learning"]
        },
        {
          "number": 47,
          "question": "Would you choose a destination partly based on your ability to learn the local language?",
          "type": "Likert-Willingness",
          "modules": ["education_learning"]
        },
        {
          "number": 48,
          "question": "How important is the availability of immersive language programs (full-time intensive courses)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 49,
          "question": "Do you need access to translation and interpretation services during your transition?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 50,
          "question": "Rank these language learning factors from most to least important: Free/subsidized courses, Immersive programs, Bilingual school options, Translation services, Cultural integration support",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Continuing Education & Lifelong Learning",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is access to adult education and continuing learning programs?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 52,
          "question": "Which continuing education formats interest you? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 53,
          "question": "Do you plan to pursue professional certifications or licenses in your destination?",
          "type": "Yes/No/Maybe",
          "modules": ["education_learning", "professional_career"]
        },
        {
          "number": 54,
          "question": "How important is access to public libraries and community learning centers?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 55,
          "question": "Would you use online learning platforms (Coursera, edX, etc.) as a supplement to local education?",
          "type": "Likert-Willingness",
          "modules": ["education_learning"]
        },
        {
          "number": 56,
          "question": "How important are community college or open university options for affordable learning?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 57,
          "question": "Do you want access to cultural enrichment classes (cooking, art, music, dance)?",
          "type": "Yes/No",
          "modules": ["education_learning", "arts_culture", "cultural_heritage_traditions"]
        },
        {
          "number": 58,
          "question": "How important is mentorship and professional networking through educational institutions?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "professional_career"]
        },
        {
          "number": 59,
          "question": "Would you attend local lectures, workshops, or seminars as part of community integration?",
          "type": "Likert-Willingness",
          "modules": ["education_learning"]
        },
        {
          "number": 60,
          "question": "Rank these lifelong learning factors from most to least important: Professional certifications, Community classes, Public libraries, Online learning access, Mentorship programs",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Special Education & Learning Support",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "Does anyone in your household require special education or learning support services?",
          "type": "Yes/No",
          "modules": ["education_learning", "family_children", "health_wellness"]
        },
        {
          "number": 62,
          "question": "Which special education services are needed? (Select all that apply)",
          "type": "Multi-select",
          "modules": ["education_learning"]
        },
        {
          "number": 63,
          "question": "How important is legal protection for students with learning differences (equivalent to IEP/504 plans)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 64,
          "question": "Do you need schools with dedicated special education staff and resources?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 65,
          "question": "How important is inclusive education (mainstreaming special needs students into regular classrooms)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 66,
          "question": "Do you need access to speech therapy, occupational therapy, or behavioral support through schools?",
          "type": "Yes/No",
          "modules": ["education_learning", "health_wellness"]
        },
        {
          "number": 67,
          "question": "How important is gifted and talented program availability?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 68,
          "question": "Do you need schools with assistive technology and adaptive learning tools?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 69,
          "question": "How important is parent support and advocacy organizations for special needs education?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 70,
          "question": "Rank these special education factors from most to least important: Specialist staff availability, Legal protections, Inclusive classrooms, Therapy services access, Gifted programs",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Education System Quality & Standards",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How important are international education rankings (PISA scores, etc.) in evaluating a destination?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 72,
          "question": "Do you require schools accredited by international bodies (CIS, NEASC, WASC)?",
          "type": "Yes/No/Maybe",
          "modules": ["education_learning"]
        },
        {
          "number": 73,
          "question": "How important is teacher quality and qualification standards in the local education system?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 74,
          "question": "How do you feel about standardized testing as a measure of educational quality?",
          "type": "Single-select",
          "modules": ["education_learning"]
        },
        {
          "number": 75,
          "question": "How important is a low student-to-teacher ratio across all school levels?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 76,
          "question": "Do you need schools with modern facilities (science labs, libraries, sports complexes, tech labs)?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 77,
          "question": "How important is the country's overall investment in education as a percentage of GDP?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 78,
          "question": "How do you feel about homeschooling legality and support in your destination?",
          "type": "Single-select",
          "modules": ["education_learning"]
        },
        {
          "number": 79,
          "question": "How important is school safety, including anti-bullying policies and campus security?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "safety_security"]
        },
        {
          "number": 80,
          "question": "Rank these quality factors from most to least important: International rankings, Accreditation, Teacher quality, Facilities, Student-to-teacher ratio",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Education Affordability & Access",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How important is free or heavily subsidized public education?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 82,
          "question": "What is your maximum annual education budget per child (all levels combined)?",
          "type": "Budget range",
          "modules": ["education_learning", "financial_banking"]
        },
        {
          "number": 83,
          "question": "Do you need access to scholarship or financial aid programs for international students?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 84,
          "question": "How important is government-funded education for non-citizens or permanent residents?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "legal_immigration"]
        },
        {
          "number": 85,
          "question": "Would you choose a destination with excellent free public schools over one with only expensive private options?",
          "type": "Slider",
          "modules": ["education_learning"]
        },
        {
          "number": 86,
          "question": "How important is transparent and predictable tuition fee structures?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 87,
          "question": "Do you need access to student loan programs in your destination?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 88,
          "question": "How important is equitable access to education regardless of neighborhood or income level?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 89,
          "question": "Would you accept a longer commute to access a better or more affordable school?",
          "type": "Slider",
          "modules": ["education_learning"]
        },
        {
          "number": 90,
          "question": "Rank these affordability factors from most to least important: Free public education quality, Tuition levels, Scholarship availability, Government subsidies, Equitable access",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    },
    {
      "title": "Education Deal-Breakers & Overall Priorities",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which education factors would absolutely disqualify a destination? (Select all that apply)",
          "type": "Multi-select dealbreaker",
          "modules": ["education_learning"]
        },
        {
          "number": 92,
          "question": "What is the single most important education factor in your relocation decision?",
          "type": "Single select",
          "modules": ["education_learning"]
        },
        {
          "number": 93,
          "question": "How important is credential recognition -- will your degrees and certifications be recognized in the destination?",
          "type": "Likert-Importance",
          "modules": ["education_learning", "professional_career", "legal_immigration"]
        },
        {
          "number": 94,
          "question": "Do you need your children's academic records to transfer seamlessly to schools in the destination?",
          "type": "Yes/No",
          "modules": ["education_learning"]
        },
        {
          "number": 95,
          "question": "How important is the education system's alignment with your home country's curriculum for potential return?",
          "type": "Likert-Importance",
          "modules": ["education_learning"]
        },
        {
          "number": 96,
          "question": "Would you relocate to a less desirable area if it had significantly better schools?",
          "type": "Slider",
          "modules": ["education_learning"]
        },
        {
          "number": 97,
          "question": "How concerned are you about cultural adjustment challenges for children entering a new school system?",
          "type": "Concern scale",
          "modules": ["education_learning", "family_children", "cultural_heritage_traditions"]
        },
        {
          "number": 98,
          "question": "Do you have any specific education needs not covered above that would impact your relocation?",
          "type": "Open text",
          "modules": ["education_learning"]
        },
        {
          "number": 99,
          "question": "Rate the overall importance of Education & Learning factors in your relocation decision (1-10)",
          "type": "Slider",
          "modules": ["education_learning"]
        },
        {
          "number": 100,
          "question": "FINAL MODULE RANKING: Drag all 10 sections to rank by overall importance to your relocation decision",
          "type": "Ranking",
          "modules": ["education_learning"]
        }
      ]
    }
  ]
};
