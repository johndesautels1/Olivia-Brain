/**
 * CLUES Main Module - 23 Category Module Definitions (Funnel Order)
 * Each module has 100 questions in its freestanding app.
 *
 * Funnel order: Survival > Foundation > Infrastructure > Lifestyle > Connection > Identity
 *
 * Clues Intelligence LTD
 */

export type ModuleStatus = 'locked' | 'not_started' | 'in_progress' | 'completed' | 'recommended';

export interface ModuleDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  status: ModuleStatus;
  score?: number;          // 0-100 completion/SMART score
  questionCount: number;   // 100 per category module
  url?: string;            // Link to freestanding module app
}

export const MODULES: ModuleDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // TIER 1: SURVIVAL (P6-P8) — Can I survive here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'safety_security',
    name: 'Safety & Security',
    shortName: 'Safety',
    description: 'Crime rates, political stability, emergency services, and personal safety',
    icon: '\u{1F6E1}\uFE0F',  // Shield
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'health_wellness',
    name: 'Health & Wellness',
    shortName: 'Health',
    description: 'Healthcare system quality, medical access, wellness infrastructure',
    icon: '\u{1F3E5}',  // Hospital
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'climate_weather',
    name: 'Climate & Weather',
    shortName: 'Climate',
    description: 'Temperature, humidity, sunshine, natural disasters, air quality, and seasons',
    icon: '\u{1F326}\uFE0F',  // Sun behind rain cloud
    status: 'not_started',
    questionCount: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2: FOUNDATION (P9-P12) — Can I legally/financially exist here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'legal_immigration',
    name: 'Legal & Immigration',
    shortName: 'Legal',
    description: 'Visa pathways, residency programs, rule of law, and legal system',
    icon: '\u{2696}\uFE0F',  // Scales
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'financial_banking',
    name: 'Financial & Banking',
    shortName: 'Finance',
    description: 'Banking access, tax structure, cost of living, and financial services',
    icon: '\u{1F4B0}',  // Money bag
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'housing_property',
    name: 'Housing & Property Preferences',
    shortName: 'Housing',
    description: 'Cost, availability, types, rental/purchase options, and neighborhoods',
    icon: '\u{1F3E0}',  // House
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'professional_career',
    name: 'Professional & Career Development',
    shortName: 'Career',
    description: 'Job market, remote work infrastructure, entrepreneurship, coworking',
    icon: '\u{1F4BC}',  // Briefcase
    status: 'not_started',
    questionCount: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3: INFRASTRUCTURE (P13-P16) — Can I function daily here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'technology_connectivity',
    name: 'Technology & Connectivity',
    shortName: 'Tech',
    description: 'Internet speed, tech ecosystem, digital infrastructure, and innovation',
    icon: '\u{1F4F1}',  // Mobile phone
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'transportation_mobility',
    name: 'Transportation & Mobility',
    shortName: 'Transport',
    description: 'Transit systems, walkability, car dependency, rail networks, and airports',
    icon: '\u{1F687}',  // Metro
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'education_learning',
    name: 'Education & Learning',
    shortName: 'Education',
    description: 'Schools, universities, continuing education, and learning culture',
    icon: '\u{1F393}',  // Graduation cap
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'social_values_governance',
    name: 'Social Values & Governance',
    shortName: 'Values',
    description: 'Political freedom, social tolerance, civic engagement, personal liberty',
    icon: '\u{1F5FD}',  // Statue of Liberty
    status: 'not_started',
    questionCount: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 4: LIFESTYLE (P17-P20) — Can I enjoy life here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'food_dining',
    name: 'Food & Dining',
    shortName: 'Food',
    description: 'Restaurant scene, grocery access, dietary options, and food culture',
    icon: '\u{1F37D}\uFE0F',  // Fork and knife with plate
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'shopping_services',
    name: 'Shopping & Services',
    shortName: 'Shopping',
    description: 'Retail, convenience, international products, delivery services',
    icon: '\u{1F6CD}\uFE0F',  // Shopping bags
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'outdoor_recreation',
    name: 'Outdoor & Recreation',
    shortName: 'Outdoors',
    description: 'Parks, hiking, sports facilities, beaches, and nature access',
    icon: '\u{1F3D4}\uFE0F',  // Snow-capped mountain
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'entertainment_nightlife',
    name: 'Entertainment & Nightlife',
    shortName: 'Entertainment',
    description: 'Venues, events, concerts, nightlife, and cultural programming',
    icon: '\u{1F3AD}',  // Performing arts
    status: 'not_started',
    questionCount: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 5: CONNECTION (P21-P23) — Can I build a life here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'family_children',
    name: 'Family & Children',
    shortName: 'Family',
    description: 'Family services, child safety, schools, pediatric care',
    icon: '\u{1F46A}',  // Family
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'neighborhood_urban_design',
    name: 'Neighborhood & Urban Design',
    shortName: 'Neighborhood',
    description: 'Street-level livability, walkability, public spaces, urban planning',
    icon: '\u{1F3D8}\uFE0F',  // Cityscape
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'environment_community_appearance',
    name: 'Environment & Community Appearance',
    shortName: 'Environment',
    description: 'Cleanliness, green space, aesthetic quality, environmental standards',
    icon: '\u{1F333}',  // Deciduous tree
    status: 'not_started',
    questionCount: 100
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 6: IDENTITY (P24-P28) — Can I be myself here?
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'religion_spirituality',
    name: 'Religion & Spirituality',
    shortName: 'Spiritual',
    description: 'Places of worship, religious tolerance, and spiritual communities',
    icon: '\u{1F54C}',  // Mosque (representing all faiths)
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'sexual_beliefs_practices_laws',
    name: 'Sexual Beliefs, Practices & Laws',
    shortName: 'Sexual Freedom',
    description: 'LGBTQ+ rights, personal freedom, legal protections, social acceptance',
    icon: '\u{1F308}',  // Rainbow
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'arts_culture',
    name: 'Arts & Culture',
    shortName: 'Arts',
    description: 'Museums, galleries, creative communities, and intellectual life',
    icon: '\u{1F3A8}',  // Artist palette
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'cultural_heritage_traditions',
    name: 'Cultural Heritage & Traditions',
    shortName: 'Heritage',
    description: 'Local customs, integration expectations, belonging, cultural identity',
    icon: '\u{1F30D}',  // Globe Europe-Africa
    status: 'not_started',
    questionCount: 100
  },
  {
    id: 'pets_animals',
    name: 'Pets & Animals',
    shortName: 'Pets',
    description: 'Pet-friendly policies, veterinary care, animal welfare, and pet housing',
    icon: '\u{1F43E}',  // Paw prints
    status: 'not_started',
    questionCount: 100
  }
];

export const MODULES_MAP: Record<string, ModuleDefinition> = MODULES.reduce(
  (acc, mod) => ({ ...acc, [mod.id]: mod }),
  {} as Record<string, ModuleDefinition>
);
