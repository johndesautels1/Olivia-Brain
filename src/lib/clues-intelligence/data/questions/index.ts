// CLUES Question Library — Barrel export
// Reassembles the full library from per-module files
// Backward compatible: import { questionLibraryData } from '@/data/questions'

import type { QuestionLibraryData } from './types';
import { LIBRARY_META, RESPONSE_TYPES } from './meta';
import { mainModuleQuestions } from './main_module';
import { generalQuestionsQuestions } from './general_questions';
import { tradeoffQuestionsQuestions } from './tradeoff_questions';
import { artsCultureQuestions } from './arts_culture';
import { climateWeatherQuestions } from './climate_weather';
import { culturalHeritageTraditionsQuestions } from './cultural_heritage_traditions';
import { educationLearningQuestions } from './education_learning';
import { entertainmentNightlifeQuestions } from './entertainment_nightlife';
import { environmentCommunityAppearanceQuestions } from './environment_community_appearance';
import { familyChildrenQuestions } from './family_children';
import { financialBankingQuestions } from './financial_banking';
import { foodDiningQuestions } from './food_dining';
import { healthWellnessQuestions } from './health_wellness';
import { housingPropertyQuestions } from './housing_property';
import { legalImmigrationQuestions } from './legal_immigration';
import { neighborhoodUrbanDesignQuestions } from './neighborhood_urban_design';
import { outdoorRecreationQuestions } from './outdoor_recreation';
import { petsAnimalsQuestions } from './pets_animals';
import { professionalCareerQuestions } from './professional_career';
import { religionSpiritualityQuestions } from './religion_spirituality';
import { safetySecurityQuestions } from './safety_security';
import { sexualBeliefsPracticesLawsQuestions } from './sexual_beliefs_practices_laws';
import { shoppingServicesQuestions } from './shopping_services';
import { socialValuesGovernanceQuestions } from './social_values_governance';
import { technologyConnectivityQuestions } from './technology_connectivity';
import { transportationMobilityQuestions } from './transportation_mobility';

// Re-export types for convenience
export type { QuestionItem, QuestionSection, QuestionModule, ResponseTypeMeta, QuestionLibraryData } from './types';
export { LIBRARY_META, RESPONSE_TYPES } from './meta';

// Individual module exports for targeted imports (avoids loading all 14K lines)
export { mainModuleQuestions } from './main_module';
export { generalQuestionsQuestions } from './general_questions';
export { tradeoffQuestionsQuestions } from './tradeoff_questions';
export { artsCultureQuestions } from './arts_culture';
export { climateWeatherQuestions } from './climate_weather';
export { culturalHeritageTraditionsQuestions } from './cultural_heritage_traditions';
export { educationLearningQuestions } from './education_learning';
export { entertainmentNightlifeQuestions } from './entertainment_nightlife';
export { environmentCommunityAppearanceQuestions } from './environment_community_appearance';
export { familyChildrenQuestions } from './family_children';
export { financialBankingQuestions } from './financial_banking';
export { foodDiningQuestions } from './food_dining';
export { healthWellnessQuestions } from './health_wellness';
export { housingPropertyQuestions } from './housing_property';
export { legalImmigrationQuestions } from './legal_immigration';
export { neighborhoodUrbanDesignQuestions } from './neighborhood_urban_design';
export { outdoorRecreationQuestions } from './outdoor_recreation';
export { petsAnimalsQuestions } from './pets_animals';
export { professionalCareerQuestions } from './professional_career';
export { religionSpiritualityQuestions } from './religion_spirituality';
export { safetySecurityQuestions } from './safety_security';
export { sexualBeliefsPracticesLawsQuestions } from './sexual_beliefs_practices_laws';
export { shoppingServicesQuestions } from './shopping_services';
export { socialValuesGovernanceQuestions } from './social_values_governance';
export { technologyConnectivityQuestions } from './technology_connectivity';
export { transportationMobilityQuestions } from './transportation_mobility';

// Full library (backward compatible — use individual exports when possible)
export const questionLibraryData: QuestionLibraryData = {
  _meta: {
    ...LIBRARY_META,
    responseTypes: RESPONSE_TYPES,
  },
  modules: [
    mainModuleQuestions,
    generalQuestionsQuestions,
    tradeoffQuestionsQuestions,
    artsCultureQuestions,
    climateWeatherQuestions,
    culturalHeritageTraditionsQuestions,
    educationLearningQuestions,
    entertainmentNightlifeQuestions,
    environmentCommunityAppearanceQuestions,
    familyChildrenQuestions,
    financialBankingQuestions,
    foodDiningQuestions,
    healthWellnessQuestions,
    housingPropertyQuestions,
    legalImmigrationQuestions,
    neighborhoodUrbanDesignQuestions,
    outdoorRecreationQuestions,
    petsAnimalsQuestions,
    professionalCareerQuestions,
    religionSpiritualityQuestions,
    safetySecurityQuestions,
    sexualBeliefsPracticesLawsQuestions,
    shoppingServicesQuestions,
    socialValuesGovernanceQuestions,
    technologyConnectivityQuestions,
    transportationMobilityQuestions,
  ],
};

// Quick lookup: get a module by ID
export function getModuleById(moduleId: string) {
  return questionLibraryData.modules.find(m => m.moduleId === moduleId);
}

// Quick lookup: get all questions for a module (flat array)
export function getModuleQuestions(moduleId: string) {
  const mod = getModuleById(moduleId);
  if (!mod) return [];
  return mod.sections.flatMap(s => s.questions);
}
