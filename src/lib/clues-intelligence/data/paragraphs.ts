/**
 * 30 Paragraph Definitions
 *
 * Follows the CLUES decision pipeline:
 *   Phase 1: Your Profile (Demographics)              — P1-P2
 *   Phase 2: Do Not Wants (Dealbreakers)               — P3
 *   Phase 3: Must Haves (Non-Negotiables)              — P4
 *   Phase 4: Trade-offs                                — P5
 *   Phase 5: Module Deep Dives (23 paragraphs)         — P6-P28
 *   Phase 6: Your Vision                               — P29-P30
 *
 * Phase 5 maps 1:1 to the 23 category modules in funnel order
 * (Survival -> Foundation -> Infrastructure -> Lifestyle -> Connection -> Identity).
 * Each paragraph is the narrative equivalent of that module's questionnaire —
 * users answer in their own writing style instead of Likerts/true-false/rank.
 *
 * This ordering ensures Gemini receives data in the same logical
 * sequence the evaluation pipeline expects: demographics first,
 * then hard walls (DNW), then requirements (MH), then flexibility
 * (trade-offs), then rich module-specific detail, then vision.
 */

export interface ParagraphDef {
  id: number;
  heading: string;
  section: string;
  prompt: string;
  placeholder: string;
  /** Which module this paragraph maps to (Phase 5 only) */
  moduleId?: string;
}

export const PARAGRAPH_DEFS: ParagraphDef[] = [
  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: YOUR PROFILE (Demographics)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 1,
    heading: 'Who You Are',
    section: 'Your Profile',
    prompt:
      'Tell us about yourself. Include your age, gender, nationality, and citizenship(s). ' +
      'Are you single, married, partnered? If you have a partner, include their age, nationality, ' +
      'citizenship(s), and languages they speak. Do you have children — how many and what ages? ' +
      'What languages do you speak? What is your employment type — remote worker, business owner, ' +
      'retired, student? This is the foundation Gemini uses to filter every recommendation.',
    placeholder:
      "I'm a 34-year-old American, single, no kids. I speak English and basic Spanish. " +
      "I work remotely as a software engineer. I hold a US passport only...",
  },
  {
    id: 2,
    heading: 'Your Life Right Now',
    section: 'Your Profile',
    prompt:
      'Where do you currently live and what is your monthly income or budget in your currency? ' +
      'What is pushing you to consider relocating — cost of living, quality of life, safety, ' +
      'career, relationships, climate, politics? How soon do you want to move — are we talking ' +
      'months or years? Be specific about numbers where you can.',
    placeholder:
      "I live in Austin, Texas. I earn about $8,000/month after taxes. I'm thinking about " +
      "moving within the next 6-12 months. The main push is cost of living and heat...",
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: DO NOT WANTS (Dealbreakers)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 3,
    heading: 'Your Dealbreakers',
    section: 'Do Not Wants',
    prompt:
      'What would make a place absolutely unacceptable to you? Think about: climate extremes ' +
      'you cannot tolerate, crime levels, political instability or ideology (right-wing, authoritarian), ' +
      'lack of healthcare, internet too slow for your work, no visa pathway, religious or cultural ' +
      'intolerance, excessive bureaucracy, specific countries or regions you refuse to consider, ' +
      'languages you cannot function in. Have you tried living somewhere that did not work out? Tell us what failed. ' +
      'These are HARD walls — if a city hits any of these, it is eliminated regardless of score.',
    placeholder:
      "I absolutely cannot live somewhere with humidity above 80%. I refuse to consider " +
      "any country without a path to legal residency. I won't live where violent crime is...",
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: MUST HAVES (Non-Negotiables)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 4,
    heading: 'Your Non-Negotiables',
    section: 'Must Haves',
    prompt:
      'What must your new home absolutely have? Think about: minimum internet speed for your work, ' +
      'specific medical facilities or specialists you need access to, airport within X hours, ' +
      'English widely spoken, specific visa type available, minimum safety rating, type of housing ' +
      'that must exist, proximity to family, specific legal rights you require. ' +
      'Unlike dealbreakers (what you reject), these are what you REQUIRE to be present.',
    placeholder:
      "I must have at least 100 Mbps internet — my job depends on it. I need an international " +
      "airport within 2 hours. English needs to be widely spoken. I require access to...",
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: TRADE-OFFS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 5,
    heading: 'Your Trade-offs',
    section: 'Trade-offs',
    prompt:
      'No place is perfect. What are you willing to sacrifice to get what matters most? ' +
      'Would you pay more rent for better safety? Accept slower internet for beach access? ' +
      'Live farther from an airport for lower cost of living? Give up nightlife for nature? ' +
      'Accept language barriers for better weather? Tolerate bureaucracy for tax advantages? ' +
      'How important is low bureaucracy vs. other benefits? ' +
      'This tells us how to WEIGHT your priorities when cities score differently on different metrics.',
    placeholder:
      "I'd happily pay 20% more rent for a safer neighborhood. I could sacrifice nightlife " +
      "entirely if the nature and outdoor access is great. I'd tolerate learning a new language...",
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: MODULE DEEP DIVES (23 paragraphs, funnel order)
  // ═══════════════════════════════════════════════════════════════

  // --- TIER 1: SURVIVAL ---
  {
    id: 6,
    heading: 'Safety & Security',
    section: 'Survival',
    moduleId: 'safety_security',
    prompt:
      'What does feeling safe mean to you specifically? Think about: violent crime rates, ' +
      'property crime, political stability and ideology (progressive, moderate, conservative), ' +
      'corruption levels, police reliability, gun laws and gun culture, ' +
      'neighborhood safety for walking at night, safety for women/LGBTQ+/minorities, ' +
      'emergency services quality (ambulance response times, fire services). ' +
      'What is your current safety situation and how does it compare to what you want?',
    placeholder:
      "I want to feel safe walking alone at night. Low violent crime is critical — I'd want " +
      "a city with rates below the US average. Political stability matters more to me than...",
  },
  {
    id: 7,
    heading: 'Health & Wellness',
    section: 'Survival',
    moduleId: 'health_wellness',
    prompt:
      'Describe your health needs and medical priorities — for you AND your partner/family. ' +
      'Do you have chronic conditions, take regular medications (name them), need specialist access ' +
      '(cardiologist, therapist, dentist)? Does your partner have separate medical needs? ' +
      'How important is public vs. private healthcare? What about health insurance availability ' +
      'and cost for expats? Do you need English-speaking doctors? Mental health services? ' +
      'Pharmacy access for specific medications (Ozempic, insulin, etc.)? ' +
      'Do you need world-class teaching hospitals or multidisciplinary medical centers? ' +
      'What about wellness infrastructure — gyms, spas, yoga studios, wellness retreats?',
    placeholder:
      "I take daily medication for blood pressure — I need reliable pharmacy access. " +
      "I see a therapist monthly so mental health services in English are important. " +
      "I'd prefer a country with affordable private health insurance...",
  },
  {
    id: 8,
    heading: 'Climate & Weather',
    section: 'Survival',
    moduleId: 'climate_weather',
    prompt:
      'Describe your ideal climate in detail. What temperature range do you want in summer and winter? ' +
      'How do you feel about humidity, rain, snow, wind? Do you need four seasons or prefer year-round ' +
      'warmth? How important is sunshine — how many cloudy days can you tolerate? ' +
      'Do natural disasters (earthquakes, hurricanes, flooding) factor into your thinking? ' +
      'What climate are you escaping from and what specifically bothers you about it?',
    placeholder:
      "I want winter temps around 15-22C and summers no higher than 32C. I hate humidity — " +
      "anything above 65% makes me miserable. I need at least 250 sunny days per year...",
  },

  // --- TIER 2: FOUNDATION ---
  {
    id: 9,
    heading: 'Legal & Immigration',
    section: 'Foundation',
    moduleId: 'legal_immigration',
    prompt:
      'What is your passport and visa situation? Which visa pathways interest you — digital nomad visa, ' +
      'freelancer visa, investor visa, retirement visa, employment visa? How long do you want to stay — ' +
      'short-term (3-6 months), long-term residency, permanent residency, eventual citizenship? ' +
      'How important is rule of law, judicial independence, and contract enforcement? ' +
      'Any legal concerns about property ownership, business registration, or tax treaties?',
    placeholder:
      "I have a US passport. I'm looking for a digital nomad visa initially, with a path to " +
      "permanent residency within 3-5 years. I want a country with strong rule of law...",
  },
  {
    id: 10,
    heading: 'Financial & Banking',
    section: 'Foundation',
    moduleId: 'financial_banking',
    prompt:
      'Break down your financial picture. What is your monthly income and in what currency? ' +
      'What monthly cost of living would feel comfortable vs. stretched? How important are: ' +
      'tax optimization (income tax, capital gains, wealth tax), banking access for foreigners, ' +
      'ability to receive international transfers, cryptocurrency friendliness, ' +
      'cost of groceries/dining/transport relative to your income? ' +
      'Do you have savings, investments, or rental income to factor in?',
    placeholder:
      "I earn EUR 6,500/month from remote work. I'd like my total cost of living under " +
      "EUR 3,000/month including rent. Tax structure matters — I want to keep my effective " +
      "rate under 25%. I need easy international banking...",
  },
  {
    id: 11,
    heading: 'Housing & Property Preferences',
    section: 'Foundation',
    moduleId: 'housing_property',
    prompt:
      'What does your ideal home look like and what can you afford? Apartment, house, villa? ' +
      'How many bedrooms and bathrooms? Urban high-rise, suburban house, rural property? ' +
      'What is your monthly rent budget or purchase budget? Do you want to rent or buy? ' +
      'Can foreigners legally buy property — is that important to you? Furnished or unfurnished? ' +
      'Do you need wheelchair/disability accessibility in the building? ' +
      'Sound insulation for music or work calls? Natural light requirements? Views? ' +
      'Would you want to rent out the property short-term when traveling? ' +
      'Gated community, walkable neighborhood, near the beach, near a city center?',
    placeholder:
      "I want a modern 2-bedroom apartment in a walkable neighborhood. My rent budget is " +
      "$1,500-2,000/month. I'd prefer to rent for the first year then possibly buy. " +
      "I need reliable hot water, AC, and a decent kitchen...",
  },
  {
    id: 12,
    heading: 'Professional & Career',
    section: 'Foundation',
    moduleId: 'professional_career',
    prompt:
      'What is your professional situation and ambition? Are you a remote employee, freelancer, ' +
      'business owner, or looking to start something new? Do you already have businesses registered ' +
      'in other countries? How important is the local startup ecosystem, coworking spaces, ' +
      'networking events, access to talent, and the local AI/tech scene? ' +
      'Do you need to register a business locally? How important are business-friendly regulations, ' +
      'low corporate tax, ease of hiring, and intellectual property protection?',
    placeholder:
      "I'm a freelance designer who may start an agency. I need good coworking spaces and " +
      "a community of other remote workers. Ideally I'd register an LLC locally with low " +
      "corporate tax. Networking events and startup meetups would be a big plus...",
  },

  // --- TIER 3: INFRASTRUCTURE ---
  {
    id: 13,
    heading: 'Technology & Connectivity',
    section: 'Infrastructure',
    moduleId: 'technology_connectivity',
    prompt:
      'How critical is tech infrastructure to your daily life and work? What minimum internet speed ' +
      'do you need (download AND upload)? How important is fiber availability, 5G coverage, ' +
      'reliable power grid (no blackouts)? Do you need access to specific tech services ' +
      '(AWS, Google Cloud, VPN-friendly)? Coworking with high-speed connections? ' +
      'How important is the local tech/digital nomad scene?',
    placeholder:
      "I need minimum 200 Mbps download and 50 Mbps upload for my video calls and file " +
      "transfers. Power outages would be a disaster — I need a reliable grid. 5G coverage " +
      "matters for mobile work. I use AWS and need low-latency connections...",
  },
  {
    id: 14,
    heading: 'Transportation & Mobility',
    section: 'Infrastructure',
    moduleId: 'transportation_mobility',
    prompt:
      'How do you want to get around daily? Walk, bike, e-bike, public transit, car, scooter, rideshare? ' +
      'How important is walkability score? Do you plan to own a car — how important are road quality, ' +
      'traffic, parking, and gas prices? How critical is public transit quality and coverage? ' +
      'How important is a high-speed rail network for regional travel and exploring? ' +
      'How far can you be from an international airport? List specific destinations you need ' +
      'direct flights to (family, clients, favorite countries). Which flight routes are essential?',
    placeholder:
      "I want to walk or bike for daily errands. I don't want to need a car. Good public " +
      "transit is important. I need an international airport within 1 hour with direct " +
      "flights to New York and London. Rideshare apps should be reliable...",
  },
  {
    id: 15,
    heading: 'Education & Learning',
    section: 'Infrastructure',
    moduleId: 'education_learning',
    prompt:
      'What are your education needs — for yourself or your family? Do children need international ' +
      'schools, specific curricula (IB, American, British), or local language immersion? ' +
      'Are you pursuing continuing education, certifications, or university courses? ' +
      'How important is living near a university or in an intellectually stimulating environment ' +
      'with well-educated residents? Is the local AI/tech education scene important? ' +
      'How important is access to libraries, language schools, professional development? ' +
      'If you have no education needs, say so — this helps Gemini weight other priorities higher.',
    placeholder:
      "My kids (ages 8 and 11) need an international school with an IB curriculum in English. " +
      "I'd like to take language classes myself. Access to a good library system would be nice...",
  },
  {
    id: 16,
    heading: 'Social Values & Governance',
    section: 'Infrastructure',
    moduleId: 'social_values_governance',
    prompt:
      'What personal freedoms and social values matter most to you? Think about: freedom of speech and press, ' +
      'government transparency, civic participation, progressive vs. conservative social policies, ' +
      'LGBTQ+ rights, cannabis/alcohol laws, gun rights, privacy laws, ' +
      'government surveillance, internet censorship, protest rights. ' +
      'How important is social tolerance and multicultural acceptance? ' +
      'Are there freedoms you currently enjoy that you are NOT willing to give up? ' +
      'Are there restrictions in your current country you want to escape?',
    placeholder:
      "Freedom of speech is non-negotiable for me. I want to live somewhere with legal " +
      "cannabis. LGBTQ+ rights matter even though I'm straight — I want a tolerant society. " +
      "I don't want government censoring the internet...",
  },

  // --- TIER 4: LIFESTYLE ---
  {
    id: 17,
    heading: 'Food & Dining',
    section: 'Lifestyle',
    moduleId: 'food_dining',
    prompt:
      'What are your food needs and preferences? Do you have dietary restrictions ' +
      '(vegan, gluten-free, halal, kosher, allergies)? How important is restaurant variety ' +
      'and quality? Do you cook at home — how important is grocery store quality and access ' +
      'to specific ingredients? What cuisines do you love? How important is local food culture, ' +
      'farmers markets, food delivery apps? What is your monthly food/dining budget?',
    placeholder:
      "I'm vegetarian and need a city with lots of meat-free options. I cook at home " +
      "most days so good grocery stores with fresh produce are essential. I love Thai, " +
      "Indian, and Mediterranean food. My food budget is about $600/month...",
  },
  {
    id: 18,
    heading: 'Shopping & Services',
    section: 'Lifestyle',
    moduleId: 'shopping_services',
    prompt:
      'How important is access to shopping and services? Think about: international product availability, ' +
      'Amazon or equivalent delivery services, shopping malls vs. local boutiques, ' +
      'availability of specific brands or products you depend on, home delivery speed, ' +
      'dry cleaning, laundry services, home repair services, personal care (barbers, salons). ' +
      'How important is convenience and modern retail infrastructure vs. local market charm?',
    placeholder:
      "I order a lot online — Amazon Prime or similar fast delivery is important. " +
      "I need access to international brands for certain products. Good barber shops " +
      "and a reliable dry cleaning service matter more than fancy malls...",
  },
  {
    id: 19,
    heading: 'Outdoor & Recreation',
    section: 'Lifestyle',
    moduleId: 'outdoor_recreation',
    prompt:
      'How important is access to nature in your daily and weekly life? Do you want beach access, ' +
      'mountains for hiking, forests, lakes, rivers? How close does nature need to be — walkable, ' +
      'short drive, weekend trips? Do you do water sports (surfing, sailing, diving), ' +
      'hiking, camping, skiing? How important are city parks and green spaces for daily life? ' +
      'Do you stay active with sports — gym, padel, tennis, running, yoga? ' +
      'Is natural beauty a core reason for your relocation?',
    placeholder:
      "I want to be within 30 minutes of a beach and within an hour of hiking trails. " +
      "I surf recreationally and want decent waves accessible on weekends. Daily access " +
      "to city parks for walks is important. Nature is a top-3 priority for me...",
  },
  {
    id: 20,
    heading: 'Entertainment & Nightlife',
    section: 'Lifestyle',
    moduleId: 'entertainment_nightlife',
    prompt:
      'What does your ideal entertainment and nightlife scene look like? Do you go out to bars, clubs, ' +
      'restaurants on weekends? How important are concerts, festivals, comedy shows, sporting events? ' +
      'Do you prefer a city that is alive at night or one that quiets down early? ' +
      'How much do you spend monthly on entertainment? What about home entertainment — ' +
      'streaming services, gaming, home theater? Specific entertainment you cannot live without?',
    placeholder:
      "I love going out on weekends — good cocktail bars and live music venues are essential. " +
      "I attend 3-4 concerts a year and love food festivals. I don't need clubs but " +
      "I want the city to feel alive on weekend nights. Budget: $300-400/month...",
  },

  // --- TIER 5: CONNECTION ---
  {
    id: 21,
    heading: 'Family & Children',
    section: 'Connection',
    moduleId: 'family_children',
    prompt:
      'Who is relocating with you? Partner, children, elderly parents, extended family? ' +
      'What does each family member need? Think about: childcare and daycare quality, ' +
      'playgrounds and parks, family-friendly neighborhoods, eldercare facilities, ' +
      'disability and wheelchair accessibility for visiting family, activities for teens, ' +
      'partner employment opportunities. Do you have elderly parents who may visit or need care? ' +
      'How important is proximity to family back home — how often would you fly back? ' +
      'If you are solo with no dependents, say so clearly.',
    placeholder:
      "It's just me and my partner — no kids, no plans for kids. My parents are in " +
      "Florida and I'd want to visit 2-3 times a year, so flight connections to the US " +
      "matter. My partner needs to find remote work or a local job in marketing...",
  },
  {
    id: 22,
    heading: 'Neighborhood & Urban Design',
    section: 'Connection',
    moduleId: 'neighborhood_urban_design',
    prompt:
      'What should your neighborhood feel like at street level? Think about: walkability and pedestrian ' +
      'infrastructure, bike lanes, public spaces and plazas, mixed-use vs. residential-only zoning, ' +
      'noise levels, street lighting, sidewalk quality, urban density preferences. ' +
      'Do you prefer a dense urban core, a leafy suburb, or a small-town feel? ' +
      'How important is community feeling — knowing your neighbors, local shops, regular faces? ' +
      'What neighborhood vibe are you looking for — bohemian, upscale, family-oriented, artsy?',
    placeholder:
      "I want a walkable, mixed-use neighborhood where I can walk to cafes, groceries, " +
      "and restaurants. Tree-lined streets matter. I prefer urban density over suburbs. " +
      "I'd love a neighborhood with character — not a cookie-cutter development...",
  },
  {
    id: 23,
    heading: 'Environment & Community Appearance',
    section: 'Connection',
    moduleId: 'environment_community_appearance',
    prompt:
      'How important is the visual and environmental quality of your surroundings? Think about: ' +
      'cleanliness of streets, graffiti levels, green spaces and tree coverage, air quality, ' +
      'noise pollution, water quality, waste management and recycling infrastructure, ' +
      'architectural consistency, building maintenance, stray animals. ' +
      'Would you sacrifice affordability for a cleaner, more aesthetically pleasing environment? ' +
      'How important is environmental sustainability and green initiatives in the city?',
    placeholder:
      "Clean streets are important to me — I've visited cities where trash was everywhere and " +
      "it ruined the experience. Air quality matters for my daily runs. I want lots of green " +
      "space and trees. Recycling infrastructure shows me a city cares about the future...",
  },

  // --- TIER 6: IDENTITY ---
  {
    id: 24,
    heading: 'Religion & Spirituality',
    section: 'Identity',
    moduleId: 'religion_spirituality',
    prompt:
      'Do you have religious or spiritual needs that affect where you live? Do you need a specific ' +
      'place of worship (church, mosque, synagogue, temple, meditation center)? How important is ' +
      'religious tolerance and diversity? Would you avoid a country with a dominant religion different ' +
      'from yours? Do you practice yoga, meditation, or alternative spirituality that needs community? ' +
      'If religion/spirituality is not a factor, say so — it helps weight other priorities.',
    placeholder:
      "I'm not religious but I practice meditation daily and would love access to a " +
      "meditation center or Buddhist temple. Religious tolerance is important to me — " +
      "I want a society that respects all beliefs. This is not a top priority though...",
  },
  {
    id: 25,
    heading: 'Sexual Beliefs, Practices & Laws',
    section: 'Identity',
    moduleId: 'sexual_beliefs_practices_laws',
    prompt:
      'How important are sexual freedom and related legal protections in your destination? ' +
      'Think about: LGBTQ+ legal rights and social acceptance, same-sex marriage recognition, ' +
      'anti-discrimination protections, dating culture openness, ' +
      'laws around cohabitation, sex work legality, access to reproductive healthcare, ' +
      'attitudes toward alternative relationships or lifestyles. ' +
      'Are there specific legal protections you require or cultural attitudes you need?',
    placeholder:
      "As a gay man, LGBTQ+ rights are critical — I need same-sex marriage to be legal or " +
      "at minimum strong anti-discrimination protections. Social acceptance matters as much " +
      "as legal rights. I want to hold my partner's hand without fear...",
  },
  {
    id: 26,
    heading: 'Arts & Culture',
    section: 'Identity',
    moduleId: 'arts_culture',
    prompt:
      'How important is cultural richness in your ideal city? Do you attend museums, galleries, ' +
      'theater, live music, film festivals? How important is architectural beauty and historic ' +
      'character vs. modern development? Do you create art yourself — do you need studio space, ' +
      'creative communities, art supplies? How important is the city\'s cultural identity and ' +
      'heritage? Would you choose a culturally vibrant but more expensive city over a cheaper but bland one?',
    placeholder:
      "I go to museums and galleries monthly. Live music is a big part of my social life. " +
      "I want a city with genuine cultural character — not a soulless modern development. " +
      "Historic architecture makes me happy. I'd pay more for cultural vibrancy...",
  },
  {
    id: 27,
    heading: 'Cultural Heritage & Traditions',
    section: 'Identity',
    moduleId: 'cultural_heritage_traditions',
    prompt:
      'How important is it that you connect with or understand the local culture and traditions? ' +
      'Think about: local festivals and celebrations, traditional customs, ' +
      'attitudes toward foreigners and integration expectations, ' +
      'cultural formality vs. informality, social hierarchy, ' +
      'expat community size vs. integration with locals, ' +
      'language and cultural barriers, historical significance of the area. ' +
      'Do you want to deeply integrate or maintain your own cultural identity while living abroad?',
    placeholder:
      "I want to integrate with locals, not just live in an expat bubble. Learning the " +
      "local language and customs is part of the adventure for me. But I also want a city " +
      "where foreigners are welcomed and there's a path to feeling like you belong...",
  },
  {
    id: 28,
    heading: 'Pets & Animals',
    section: 'Identity',
    moduleId: 'pets_animals',
    prompt:
      'Do you have pets or plan to get any? What animals and breeds? What pet infrastructure matters: ' +
      'pet-friendly rental housing, veterinary quality and cost, off-leash parks and dog beaches, ' +
      'pet import regulations and quarantine requirements, breed-specific legislation? ' +
      'How important is the general attitude toward pets in the culture? ' +
      'If you have no pets and no plans for any, say so clearly.',
    placeholder:
      "I have a 4-year-old golden retriever. Pet-friendly apartments are essential — " +
      "many places reject large dogs. I need a good vet within 20 minutes. Off-leash " +
      "parks are important for daily exercise. I'd need to research import requirements...",
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: YOUR VISION
  // ═══════════════════════════════════════════════════════════════
  {
    id: 29,
    heading: 'Your Dream Day',
    section: 'Your Vision',
    prompt:
      'Describe your perfect ordinary day in your new city — not a vacation day, but a regular ' +
      'Tuesday. Morning to night: where do you wake up, what do you see, how do you get your ' +
      'coffee, where do you work, what do you do for lunch, how do you spend the afternoon, ' +
      'what does the evening look like? Paint the picture so vividly that Gemini can extract ' +
      'lifestyle metrics you might not have mentioned explicitly.',
    placeholder:
      "I wake up in my apartment with a balcony overlooking the water. I walk 5 minutes " +
      "to a local cafe for coffee and a pastry. I work from a coworking space with ocean " +
      "views until noon. Lunch is at a small local restaurant — maybe fresh fish and salad...",
  },
  {
    id: 30,
    heading: 'Anything Else',
    section: 'Your Vision',
    prompt:
      'What did we miss? This is your wildcard. Dealbreakers that did not fit, quirky preferences, ' +
      'things deeply important to you that no questionnaire ever asks about. Past relocation ' +
      'experiences (good or bad), specific cities you have visited and loved or hated and WHY, ' +
      'relationship dynamics that affect location, future plans (starting a family, retiring, ' +
      'building a business) that should influence the recommendation. Anything.',
    placeholder:
      "One thing nobody asks about: I'm a light sleeper and noise pollution is a real " +
      "issue for me. I visited Lisbon last year and loved the vibe but hated the hills. " +
      "I've also been to Bali — amazing nature but too humid. I plan to start a family...",
  },
];

/** Group paragraphs by section for sidebar navigation */
export const PARAGRAPH_SECTIONS = [
  { name: 'Your Profile', ids: [1, 2] },
  { name: 'Do Not Wants', ids: [3] },
  { name: 'Must Haves', ids: [4] },
  { name: 'Trade-offs', ids: [5] },
  { name: 'Survival', ids: [6, 7, 8] },
  { name: 'Foundation', ids: [9, 10, 11, 12] },
  { name: 'Infrastructure', ids: [13, 14, 15, 16] },
  { name: 'Lifestyle', ids: [17, 18, 19, 20] },
  { name: 'Connection', ids: [21, 22, 23] },
  { name: 'Identity', ids: [24, 25, 26, 27, 28] },
  { name: 'Your Vision', ids: [29, 30] },
];

/** Total paragraph count */
export const PARAGRAPH_COUNT = PARAGRAPH_DEFS.length; // 30
