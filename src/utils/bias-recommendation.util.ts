/**
 * Bias Recommendation Engine - Simplified Implementation
 *
 * This file exports the simplified implementation that compiles correctly.
 * The original complex implementation had many type conflicts that are resolved
 * in the simplified version.
 */

export {
  SimplifiedBiasRecommendationEngine as BiasRecommendationEngine,
  simplifiedBiasRecommendationEngine,
} from './bias-recommendation-simplified.util';

// Re-export interfaces from simplified implementation
export type {
  QuestionBiasAnalysis,
  RecommendationContext,
} from './bias-recommendation-simplified.util';
