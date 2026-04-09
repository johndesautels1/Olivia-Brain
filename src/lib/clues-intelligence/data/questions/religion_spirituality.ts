import type { QuestionModule } from './types';

// Religion & Spirituality — 100 questions
// Module ID: religion_spirituality

export const religionSpiritualityQuestions: QuestionModule = {
  "moduleId": "religion_spirituality",
  "moduleName": "Religion & Spirituality",
  "fileName": "RELIGION_SPIRITUALITY_QUESTIONS.md",
  "structure": "10 sections × 10 questions, each ending with a ranking question + 1 final master ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Personal Beliefs & Identity",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How would you describe your religious or spiritual orientation? (Select one: Christianity, Islam, Judaism, Hinduism, Buddhism, Sikhism, Bahá'í, Jainism, Shinto, Taoism, Indigenous/traditional, spiritual but not religious, agnostic, atheist, secular humanist, other)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 2,
          "question": "How central is your religious or spiritual identity to who you are as a person?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 3,
          "question": "How often do you engage in personal prayer, meditation, or spiritual practice?",
          "type": "Likert-Frequency",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 4,
          "question": "How frequently do you attend formal religious services or spiritual gatherings?",
          "type": "Likert-Frequency",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 5,
          "question": "Do you consider yourself a practicing member of your faith or spiritual path?",
          "type": "Yes/No",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 6,
          "question": "How important is it that your beliefs are understood and respected by others in your community?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 7,
          "question": "How do your religious or spiritual beliefs influence your moral and ethical decisions?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 8,
          "question": "How comfortable are you openly discussing your beliefs with people of different faiths?",
          "type": "Likert-Comfort",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 9,
          "question": "How do you view people of different religious or non-religious beliefs? (Select one: fully accepting, respectfully curious, tolerant but private, cautiously engaged, prefer like-minded community)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 10,
          "question": "Rank these belief identity factors from most to least important: Centrality of faith, Practice frequency, Community respect, Interfaith comfort, Ethical influence",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Worship Facilities & Access",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How important is having access to formal worship facilities (church, mosque, temple, synagogue, etc.) in your destination?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 12,
          "question": "What type of worship facility do you need access to? (Select all that apply: church, mosque, synagogue, Hindu temple, Buddhist temple, Sikh gurdwara, meditation center, interfaith center, home-based worship, online/virtual, none needed)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 13,
          "question": "How far are you willing to travel for regular worship services?",
          "type": "Range",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 14,
          "question": "What size religious community do you prefer? (Select one: small intimate <50, medium 50-200, large 200-1000, mega 1000+, solitary practice, no preference)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 15,
          "question": "How important is access to religious scholars, clergy, or spiritual advisors in your destination?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 16,
          "question": "How important is having multilingual religious services available in your heritage language?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 17,
          "question": "How important is the availability of religious education programs (Sunday school, Quran classes, Torah study, etc.)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "education_learning"]
        },
        {
          "number": 18,
          "question": "How important is the social fellowship aspect of your religious community?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 19,
          "question": "How important are specific architectural and aesthetic features in your place of worship?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 20,
          "question": "Rank these worship access factors from most to least important: Facility availability, Community size, Clergy access, Multilingual services, Religious education",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Religious Freedom & Legal Protection",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How important is constitutional or legal protection of religious freedom in your destination?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "legal_immigration"]
        },
        {
          "number": 22,
          "question": "Which specific legal protections are most important for your religious practice? (Select all that apply: freedom to worship, freedom to wear religious attire, freedom to proselytize, protection from discrimination, religious holiday accommodation, conscientious objection rights, dietary accommodation in institutions, religious marriage recognition)",
          "type": "Multi-select",
          "modules": ["religion_spirituality", "legal_immigration"]
        },
        {
          "number": 23,
          "question": "How concerned are you about potential religious discrimination or persecution in your destination?",
          "type": "Likert-Concern",
          "modules": ["religion_spirituality", "safety_security"]
        },
        {
          "number": 24,
          "question": "How important is it that you can freely express your religious identity in public (clothing, symbols, practices)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 25,
          "question": "How important is it that your children can freely practice your faith in school settings?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "education_learning", "family_children"]
        },
        {
          "number": 26,
          "question": "What level of religious influence in local government are you comfortable with?",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 27,
          "question": "How concerned are you about blasphemy laws, apostasy laws, or restrictions on religious expression?",
          "type": "Likert-Concern",
          "modules": ["religion_spirituality", "legal_immigration", "safety_security"]
        },
        {
          "number": 28,
          "question": "How important is it that local businesses accommodate your religious needs (halal/kosher food, prayer times, Sabbath hours)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 29,
          "question": "How flexible are you about adapting your religious practices to local laws and customs while maintaining core beliefs? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 30,
          "question": "Rank these religious freedom factors from most to least important: Legal protection, Anti-discrimination laws, Public expression freedom, School accommodation, Business accommodation",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Religious Tolerance & Interfaith Relations",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How important is living in a community with high religious tolerance and acceptance?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 32,
          "question": "How comfortable are you living in a community where the dominant religion is different from yours?",
          "type": "Likert-Comfort",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 33,
          "question": "How do you prefer to handle religious differences with neighbors and community members? (Select one: open dialogue, respectful distance, active interfaith engagement, live and let live, shared celebrations)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 34,
          "question": "How important is access to interfaith dialogue programs and organizations?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 35,
          "question": "How comfortable are you with religious symbols and practices different from yours in public spaces?",
          "type": "Likert-Comfort",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 36,
          "question": "How important is religious diversity in your neighborhood and community?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 37,
          "question": "How do you view the role of secularism and separation of church and state?",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 38,
          "question": "How willing are you to participate in local religious or cultural traditions that differ from your own? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 39,
          "question": "How concerned are you about religious extremism or fundamentalism in your destination?",
          "type": "Likert-Concern",
          "modules": ["religion_spirituality", "safety_security"]
        },
        {
          "number": 40,
          "question": "Rank these tolerance factors from most to least important: Community tolerance, Interfaith programs, Religious diversity, Secularism, Extremism concerns",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Religious Dietary & Lifestyle Requirements",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "Do you follow specific dietary laws or spiritual eating practices? (Select all that apply: halal, kosher, vegetarian/Hindu, Buddhist vegetarian, fasting periods, no alcohol, no pork, no beef, Jain diet, raw/natural food practices, none)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 42,
          "question": "How important is access to religiously compliant food (halal, kosher, etc.) in daily life?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "food_dining"]
        },
        {
          "number": 43,
          "question": "How important is access to specialty religious food stores and suppliers?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "food_dining", "shopping_services"]
        },
        {
          "number": 44,
          "question": "How important is having a dedicated space for prayer, meditation, or worship in your home?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 45,
          "question": "Which religious observances affect your daily schedule or housing needs? (Select all that apply: daily prayer times, Sabbath/rest day, fasting periods, meditation schedule, modesty requirements, gender separation, noise/music restrictions, none)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 46,
          "question": "How important is access to religious clothing and ritual items (prayer rugs, vestments, candles, incense, etc.)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 47,
          "question": "How important is it that your workplace accommodates religious practices (prayer breaks, holiday leave, dress code)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "professional_career"]
        },
        {
          "number": 48,
          "question": "How do you handle alcohol and substance use in social settings based on your beliefs? (Select one: strictly abstain, flexible depending on context, no restrictions, moderate personal choice)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 49,
          "question": "How willing are you to adapt your religious lifestyle practices to fit local norms? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 50,
          "question": "Rank these lifestyle factors from most to least important: Dietary compliance, Food access, Home worship space, Schedule accommodation, Workplace accommodation",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Religious Family & Children",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How important is it to raise your children in your religious or spiritual tradition?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "family_children"]
        },
        {
          "number": 52,
          "question": "How important is access to faith-based schools or religious education for your children?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "education_learning", "family_children"]
        },
        {
          "number": 53,
          "question": "Which religious life cycle ceremonies are important for your family? (Select all that apply: birth/naming ceremonies, baptism/dedication, circumcision, bar/bat mitzvah, confirmation, first communion, coming-of-age rituals, religious marriage, funeral/burial rites, none)",
          "type": "Multi-select",
          "modules": ["religion_spirituality", "family_children", "cultural_heritage_traditions"]
        },
        {
          "number": 54,
          "question": "How important is it that your children have same-faith peers and social groups?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "family_children"]
        },
        {
          "number": 55,
          "question": "How important is access to religious youth programs (youth groups, camps, retreats)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "family_children"]
        },
        {
          "number": 56,
          "question": "How do you want to handle interfaith or non-religious relationships within your family?",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 57,
          "question": "How important is having religious role models and mentors available for your children?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 58,
          "question": "How important is intergenerational religious knowledge transfer (grandparents teaching grandchildren faith traditions)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "family_children"]
        },
        {
          "number": 59,
          "question": "How comfortable are you with your children being exposed to different religious perspectives in school?",
          "type": "Likert-Comfort",
          "modules": ["religion_spirituality", "education_learning", "family_children"]
        },
        {
          "number": 60,
          "question": "Rank these family faith factors from most to least important: Religious upbringing, Faith-based schools, Life cycle ceremonies, Youth programs, Same-faith peers",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Spiritual Growth & Practice",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How important is access to spiritual growth opportunities (retreats, pilgrimages, study groups)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 62,
          "question": "How important is access to spiritual mentorship or guidance from experienced practitioners?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 63,
          "question": "How important is access to religious texts, literature, and study materials in your language?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 64,
          "question": "How important is access to meditation, contemplation, or sacred nature spaces?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 65,
          "question": "How do you prefer to contribute to your religious or spiritual community? (Select all that apply: volunteer service, financial tithing/donations, teaching/mentoring, worship leadership, community organizing, charitable outreach, none)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 66,
          "question": "How important is digital access to religious services, teachings, and community (online worship, streaming, apps)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 67,
          "question": "How important is being able to share your faith or spiritual insights with others who are interested?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 68,
          "question": "How important are spiritual crisis resources (pastoral counseling, faith-based support groups, chaplaincy)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "health_wellness"]
        },
        {
          "number": 69,
          "question": "How important is that your spiritual practice integrates with your approach to health and wellness?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "health_wellness"]
        },
        {
          "number": 70,
          "question": "Rank these spiritual growth factors from most to least important: Growth opportunities, Mentorship, Sacred texts access, Digital access, Crisis resources",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Religious & Spiritual Trade-Offs",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How willing are you to accept a smaller religious community in exchange for better overall quality of life?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 72,
          "question": "How willing are you to travel further for worship services in exchange for a better neighborhood?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 73,
          "question": "How willing are you to practice your faith primarily at home or online if local facilities are limited?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 74,
          "question": "How willing are you to join a different denomination or branch of your faith if your specific tradition is unavailable?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 75,
          "question": "How willing are you to accept limited religious dietary options if other food quality is excellent?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 76,
          "question": "How willing are you to pioneer and help build a religious community where none currently exists?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 77,
          "question": "How willing are you to accept less religious freedom in exchange for significantly better economic opportunities?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 78,
          "question": "How willing are you to adapt your religious expression to be more private in a less tolerant environment? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 79,
          "question": "How important is it that your destination's religious landscape is trending toward greater tolerance and diversity?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 80,
          "question": "Rank these trade-off priorities from most to least important: Community size vs. quality of life, Travel distance for worship, Home practice vs. community, Denominational flexibility, Religious freedom vs. economics",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "End-of-Life & Legacy",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How important is access to religiously appropriate funeral and burial practices?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 82,
          "question": "Which end-of-life practices are important for your faith? (Select all that apply: traditional burial, cremation, sky burial, repatriation of remains, specific burial orientation, religious funeral rites, mourning period customs, memorial traditions, none specific)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 83,
          "question": "How important is access to religious cemeteries or consecrated burial grounds?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 84,
          "question": "How important is end-of-life spiritual care (chaplaincy, last rites, pastoral visits)?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "health_wellness"]
        },
        {
          "number": 85,
          "question": "How important is it that your destination respects religious mourning customs and bereavement practices?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 86,
          "question": "How important is leaving a religious or spiritual legacy in your community?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 87,
          "question": "How do you want your religious practice to evolve as you age? (Select one: deepen commitment, maintain current level, become more flexible, focus on spiritual over ritual, legacy/teaching focus)",
          "type": "Single-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 88,
          "question": "How important is access to faith-based elder care and senior services?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "health_wellness", "family_children"]
        },
        {
          "number": 89,
          "question": "How important is it that your family can continue your religious traditions after your passing?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality", "family_children"]
        },
        {
          "number": 90,
          "question": "Rank these end-of-life factors from most to least important: Funeral practices, Burial access, Spiritual care, Mourning customs, Religious legacy",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    },
    {
      "title": "Overall Religion & Spirituality Priorities & Deal-Breakers",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "Which religious issues are absolute dealbreakers that would eliminate a destination? (Select all that apply: no worship facilities for my faith, religious persecution, banned religious practices, no religious dietary options, no religious education, forced religious participation, no religious freedom laws, no clergy access)",
          "type": "Multi-select",
          "modules": ["religion_spirituality", "safety_security"]
        },
        {
          "number": 92,
          "question": "Which religious features are non-negotiable must-haves? (Select all that apply: worship facility for my faith, religious freedom laws, faith community presence, religious education access, dietary compliance available, life cycle ceremony support, clergy/spiritual advisor access, interfaith tolerance)",
          "type": "Multi-select",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 93,
          "question": "On a scale of 0-100, how would you rank religion and spirituality as a priority compared to all other relocation factors?",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 94,
          "question": "What is your approximate annual budget for religious activities, donations, and faith-based expenses?",
          "type": "Range",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 95,
          "question": "How important is it that the local culture is respectful and knowledgeable about your faith tradition?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 96,
          "question": "How willing are you to be a religious and spiritual pioneer in a community that is unfamiliar with your faith?",
          "type": "Likert-Willingness",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 97,
          "question": "How willing are you to embrace and learn from the spiritual traditions of your destination's local culture? CULTURAL FLEX",
          "type": "Slider",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 98,
          "question": "How important is it that your destination has a track record of religious harmony and peaceful coexistence?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 99,
          "question": "How important is it that religious tolerance and freedom are improving in your destination?",
          "type": "Likert-Importance",
          "modules": ["religion_spirituality"]
        },
        {
          "number": 100,
          "question": "Rank these overall religion categories from most to least important for your relocation: Personal beliefs & identity, Worship facilities & access, Religious freedom & legal protection, Tolerance & interfaith relations, Dietary & lifestyle requirements, Family & children, Spiritual growth, Religious trade-offs, End-of-life & legacy, Overall religious investment",
          "type": "Ranking",
          "modules": ["religion_spirituality"]
        }
      ]
    }
  ]
};
