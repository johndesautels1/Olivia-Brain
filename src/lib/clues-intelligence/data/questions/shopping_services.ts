import type { QuestionModule } from './types';

// Shopping & Services — 100 questions
// Module ID: shopping_services

export const shoppingServicesQuestions: QuestionModule = {
  "moduleId": "shopping_services",
  "moduleName": "Shopping & Services",
  "fileName": "SHOPPING_SERVICES_QUESTIONS.md",
  "structure": "10 sections x 10 questions (Q1-Q99) + 1 final cross-section ranking (Q100)",
  "totalQuestions": 100,
  "sections": [
    {
      "title": "Grocery & Everyday Essentials",
      "questionRange": "Q1-Q10",
      "questions": [
        {
          "number": 1,
          "question": "How often do you shop for groceries?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 2,
          "question": "Which grocery store types do you prefer?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 3,
          "question": "How far are you willing to travel for your preferred grocery store or market?",
          "type": "Range",
          "modules": ["shopping_services"]
        },
        {
          "number": 4,
          "question": "How important is having multiple grocery options within a 15-minute radius?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 5,
          "question": "Is 24-hour or extended-hours grocery access important to you?",
          "type": "Yes/No",
          "modules": ["shopping_services"]
        },
        {
          "number": 6,
          "question": "Do you prefer local or imported food products?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 7,
          "question": "Which household essentials do you buy regularly?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 8,
          "question": "Would you pay 15-25% more for eco-friendly or sustainable packaging on everyday items?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 9,
          "question": "When shopping for everyday items, how much does price influence your decisions compared to brand?",
          "type": "Slider",
          "modules": ["shopping_services"]
        },
        {
          "number": 10,
          "question": "Rank these essentials from most to least important: Grocery variety, Price affordability, Proximity/convenience, Organic/sustainable options, 24-hour access",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Fashion & Clothing",
      "questionRange": "Q11-Q20",
      "questions": [
        {
          "number": 11,
          "question": "How often do you buy new clothing items?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 12,
          "question": "Which clothing categories are most important to your wardrobe?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 13,
          "question": "What percentage of your monthly income do you typically spend on clothing?",
          "type": "Budget %",
          "modules": ["shopping_services", "financial_banking"]
        },
        {
          "number": 14,
          "question": "Do you prefer in-store shopping (for trying on items) over online shopping for clothing?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 15,
          "question": "How important will access to international fashion brands be in the future location?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 16,
          "question": "Which accessories do you shop for regularly?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 17,
          "question": "How important is the availability of tailoring or alteration services?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 18,
          "question": "Do you prefer following seasonal fashion trends or timeless/classic styles?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 19,
          "question": "Would you travel to another city or country for a major fashion purchase?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 20,
          "question": "Rank these fashion factors from most to least important: Brand selection, Price affordability, Quality/durability, Tailoring services, Style relevance",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Luxury Goods",
      "questionRange": "Q21-Q30",
      "questions": [
        {
          "number": 21,
          "question": "How often do you purchase luxury items?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 22,
          "question": "Which luxury categories interest you most?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 23,
          "question": "Do you prefer shopping at flagship brand stores or multi-brand luxury boutiques?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 24,
          "question": "Is duty-free shopping availability important for your luxury purchases?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 25,
          "question": "Would you buy luxury goods locally even if prices are 15-30% higher than abroad?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 26,
          "question": "How important is brand prestige as a status symbol in your luxury purchases?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 27,
          "question": "Which luxury services do you value?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 28,
          "question": "Would you consider purchasing certified authenticated pre-owned luxury goods?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 29,
          "question": "How important is potential resale value when deciding on a luxury purchase?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 30,
          "question": "Rank these luxury priorities from most to least important: Brand prestige, Service quality, Price/value, Exclusivity/rarity, Resale value",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Vehicles & Automotive",
      "questionRange": "Q31-Q40",
      "questions": [
        {
          "number": 31,
          "question": "How often do you buy or lease a new vehicle?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services", "transportation_mobility"]
        },
        {
          "number": 32,
          "question": "Which vehicle types interest you?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 33,
          "question": "Do you prefer buying new vehicles or certified pre-owned?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 34,
          "question": "How important is parking availability in your vehicle purchase decision?",
          "type": "Likert-Importance",
          "modules": ["shopping_services", "transportation_mobility"]
        },
        {
          "number": 35,
          "question": "Would you import a vehicle from abroad for better options or cost savings?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 36,
          "question": "How important is brand reputation for reliability in your vehicle purchases?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 37,
          "question": "Which vehicle-related services are essential?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 38,
          "question": "What is your preferred method for purchasing a vehicle?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 39,
          "question": "How important is projected resale value in your vehicle selection?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 40,
          "question": "Rank these vehicle priorities from most to least important: Brand reputation, Price affordability, Service/maintenance, Local availability, Resale value",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Home Goods & Furnishings",
      "questionRange": "Q41-Q50",
      "questions": [
        {
          "number": 41,
          "question": "How often do you buy home furnishings or decor items?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services", "housing_property"]
        },
        {
          "number": 42,
          "question": "Which home goods categories are most important?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 43,
          "question": "Do you prefer ready-made furniture or custom/bespoke pieces?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 44,
          "question": "Where do you prefer to shop for home goods?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 45,
          "question": "Would you import home goods from abroad if local options are limited?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 46,
          "question": "How important is matching design styles to your home's aesthetic?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 47,
          "question": "Which home goods services do you value?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 48,
          "question": "Would you pay 15-25% more for sustainable or eco-friendly materials?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 49,
          "question": "How important is brand reputation for durability in home goods?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 50,
          "question": "Rank these home goods priorities from most to least important: Quality/durability, Price affordability, Style/design, Service/support, Sustainability",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Personal Care & Beauty",
      "questionRange": "Q51-Q60",
      "questions": [
        {
          "number": 51,
          "question": "How often do you use personal care or beauty services?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 52,
          "question": "Which personal care services are essential?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 53,
          "question": "Do you prefer walk-in services or appointment-only?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 54,
          "question": "How important is having staff who speak your preferred language?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 55,
          "question": "Would you pay more for premium or high-end personal care brands?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 56,
          "question": "Which beauty products do you buy regularly?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 57,
          "question": "Would you travel to another area for a specific stylist or therapist?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 58,
          "question": "How important are hygiene and safety standards in choosing a service?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 59,
          "question": "Do you prefer local/regional beauty brands or international ones?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 60,
          "question": "Rank these personal care priorities from most to least important: Quality/results, Price affordability, Brand reputation, Service experience, Location convenience",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Hobbies & Specialty Items",
      "questionRange": "Q61-Q70",
      "questions": [
        {
          "number": 61,
          "question": "How often do you shop for hobby-related items?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 62,
          "question": "Which hobbies require regular purchases?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 63,
          "question": "Do you prefer buying new specialty items or pre-owned?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 64,
          "question": "Where do you prefer to shop for hobby items?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 65,
          "question": "Would you import specialty hobby items if unavailable locally?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 66,
          "question": "How important is expert advice in specialty hobby stores?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 67,
          "question": "Which hobby services are important?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 68,
          "question": "Would you join a local club or community for hobby networking?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 69,
          "question": "How important is brand reputation for hobby gear quality?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 70,
          "question": "Rank these hobby priorities from most to least important: Quality/performance, Price affordability, Expert advice, Local availability, Community access",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Electronics & Technology",
      "questionRange": "Q71-Q80",
      "questions": [
        {
          "number": 71,
          "question": "How often do you buy new electronics or tech gadgets?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services", "technology_connectivity"]
        },
        {
          "number": 72,
          "question": "Which electronics categories are most important?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 73,
          "question": "Where do you prefer to shop for electronics?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 74,
          "question": "Would you pay a premium for the latest model or cutting-edge features?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 75,
          "question": "Would you import electronics from abroad for better prices or availability?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 76,
          "question": "How important is comprehensive warranty coverage (2+ years)?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 77,
          "question": "How important are local tech repair services vs. mail-in warranty service?",
          "type": "Likert-Importance",
          "modules": ["shopping_services", "technology_connectivity"]
        },
        {
          "number": 78,
          "question": "Which electronics services are essential?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 79,
          "question": "Do you prefer local or international electronics brands?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 80,
          "question": "Rank these tech priorities from most to least important: Price affordability, Brand reputation, Features/innovation, Warranty coverage, Service/support",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Professional & Personal Services",
      "questionRange": "Q81-Q90",
      "questions": [
        {
          "number": 81,
          "question": "How often do you use professional services?",
          "type": "Likert-Frequency",
          "modules": ["shopping_services"]
        },
        {
          "number": 82,
          "question": "Which professional services are essential?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 83,
          "question": "Do you prefer local firms or international ones for professional services?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 84,
          "question": "How important is same-day or urgent appointment availability?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 85,
          "question": "Would you pay more for professionals who speak your preferred language fluently?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 86,
          "question": "Which personal services do you use regularly?",
          "type": "Multi-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 87,
          "question": "Would you subscribe to a premium concierge service for errands and bookings?",
          "type": "Likert-Willingness",
          "modules": ["shopping_services"]
        },
        {
          "number": 88,
          "question": "How important is a service provider's reputation over their price?",
          "type": "Slider",
          "modules": ["shopping_services"]
        },
        {
          "number": 89,
          "question": "How far will you travel for a trusted professional service?",
          "type": "Range",
          "modules": ["shopping_services"]
        },
        {
          "number": 90,
          "question": "Rank these service priorities from most to least important: Quality/expertise, Price affordability, Speed/efficiency, Language/communication, Reputation/reviews",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    },
    {
      "title": "Shopping Habits & Cross-Cutting Preferences",
      "questionRange": "Q91-Q100",
      "questions": [
        {
          "number": 91,
          "question": "What is your preferred payment method for shopping?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 92,
          "question": "How important is cashless payment acceptance at retailers?",
          "type": "Likert-Importance",
          "modules": ["shopping_services", "financial_banking"]
        },
        {
          "number": 93,
          "question": "How do you prefer to research products before purchasing?",
          "type": "Single-select",
          "modules": ["shopping_services"]
        },
        {
          "number": 94,
          "question": "How important are online booking/reservation systems for services?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 95,
          "question": "Would lack of your preferred shopping brands be a dealbreaker for relocation?",
          "type": "Dealbreaker",
          "modules": ["shopping_services"]
        },
        {
          "number": 96,
          "question": "What percentage of your shopping is done online vs. in-store?",
          "type": "Range",
          "modules": ["shopping_services", "technology_connectivity"]
        },
        {
          "number": 97,
          "question": "Would you accept limited luxury shopping for excellent everyday essentials?",
          "type": "Slider",
          "modules": ["shopping_services"]
        },
        {
          "number": 98,
          "question": "How important is having shopping areas with gender-specific or culturally-appropriate options?",
          "type": "Likert-Importance",
          "modules": ["shopping_services"]
        },
        {
          "number": 99,
          "question": "Describe any shopping or service needs not covered above that would significantly impact your relocation decision:",
          "type": "Open text",
          "modules": ["shopping_services"]
        },
        {
          "number": 100,
          "question": "Rank these 10 sections from most important to least important",
          "type": "Ranking",
          "modules": ["shopping_services"]
        }
      ]
    }
  ]
};
