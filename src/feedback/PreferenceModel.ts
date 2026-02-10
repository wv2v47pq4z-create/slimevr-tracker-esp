/**
 * @prz/agent-core - Preference Learning Model
 * 
 * Implements LinUCB (Linear Upper Confidence Bound) contextual bandit
 * for adaptive strategy selection based on task and user feedback.
 */

import {
  StrategyType,
  ContextFeatures,
  PreferenceState,
  UserFeedback,
  IntentType
} from '../types.js';

/**
 * LinUCB Contextual Bandit for Preference Learning
 * 
 * Balances exploration vs exploitation to learn optimal
 * task-pattern-to-strategy mappings from user feedback.
 */
export class PreferenceModel {
  private state: PreferenceState;
  private alpha: number; // Exploration parameter
  private featureDimension: number;

  constructor(alpha: number = 0.5) {
    this.alpha = alpha;
    this.featureDimension = 6; // Number of context features

    // Initialize state
    this.state = {
      strategyWeights: new Map(),
      explorationRate: 1.0,
      totalIterations: 0,
      rewardHistory: []
    };

    // Initialize weights for each strategy
    Object.values(StrategyType).forEach(strategy => {
      // Initialize with small random weights
      const weights = Array(this.featureDimension).fill(0).map(() => Math.random() * 0.1);
      this.state.strategyWeights.set(strategy, weights);
    });
  }

  /**
   * Select best strategy given context using LinUCB
   */
  selectStrategy(context: ContextFeatures): StrategyType {
    const contextVector = this.contextToVector(context);
    let bestStrategy: StrategyType = StrategyType.AUTONOMOUS;
    let bestScore = -Infinity;

    // Calculate UCB score for each strategy
    for (const [strategy, weights] of this.state.strategyWeights) {
      const expectedReward = this.dotProduct(weights, contextVector);
      const uncertainty = this.calculateUncertainty(strategy, contextVector);
      const ucbScore = expectedReward + this.alpha * uncertainty;

      if (ucbScore > bestScore) {
        bestScore = ucbScore;
        bestStrategy = strategy;
      }
    }

    // Decay exploration rate over time
    this.state.explorationRate = Math.max(0.1, this.state.explorationRate * 0.999);
    this.state.totalIterations++;

    return bestStrategy;
  }

  /**
   * Update model based on user feedback
   */
  updateFromFeedback(
    context: ContextFeatures,
    strategy: StrategyType,
    feedback: UserFeedback
  ): void {
    // Convert feedback to reward signal [0, 1]
    const reward = this.feedbackToReward(feedback);

    // Store in history
    this.state.rewardHistory.push({
      context,
      strategy,
      reward
    });

    // Update weights using gradient descent
    const contextVector = this.contextToVector(context);
    const currentWeights = this.state.strategyWeights.get(strategy) || [];
    
    // Learning rate
    const learningRate = 0.1 / (1 + this.state.totalIterations * 0.001);
    
    // Predicted reward
    const predicted = this.dotProduct(currentWeights, contextVector);
    const error = reward - predicted;

    // Update weights: w = w + lr * error * context
    const updatedWeights = currentWeights.map((w, i) => 
      w + learningRate * error * contextVector[i]
    );

    this.state.strategyWeights.set(strategy, updatedWeights);
  }

  /**
   * Get current preference state
   */
  getState(): PreferenceState {
    return { ...this.state };
  }

  /**
   * Convert context features to vector
   */
  private contextToVector(context: ContextFeatures): number[] {
    return [
      this.intentTypeToNumeric(context.intentType),
      context.taskComplexity,
      context.userExperience,
      context.timeOfDay / 24, // Normalize to [0, 1]
      context.sessionLength / 60, // Normalize to hours
      context.previousSuccessRate
    ];
  }

  /**
   * Convert intent type to numeric value
   */
  private intentTypeToNumeric(type: IntentType): number {
    const mapping: Record<IntentType, number> = {
      [IntentType.VIBE_CHECK]: 0.25,
      [IntentType.MOVE_MAKE]: 0.5,
      [IntentType.CLARITY_CALL]: 0.75,
      [IntentType.RAPPORT_BUILD]: 1.0
    };
    return mapping[type] || 0.5;
  }

  /**
   * Calculate dot product of two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Calculate uncertainty/exploration bonus
   */
  private calculateUncertainty(strategy: StrategyType, context: number[]): number {
    // Count how many times this strategy was selected
    const strategyCount = this.state.rewardHistory.filter(
      h => h.strategy === strategy
    ).length;

    // Higher uncertainty for less-explored strategies
    return Math.sqrt(2 * Math.log(this.state.totalIterations + 1) / (strategyCount + 1));
  }

  /**
   * Convert user feedback to normalized reward
   */
  private feedbackToReward(feedback: UserFeedback): number {
    let reward = 0;

    // Explicit rating (0-5) normalized to [0, 1]
    if (feedback.rating !== undefined) {
      reward += feedback.rating / 5 * 0.6;
    }

    // Implicit signals
    if (feedback.implicit) {
      // Task completion (40% weight)
      if (feedback.implicit.taskCompleted) {
        reward += 0.4;
      }

      // Time efficiency (bonus if fast, penalty if slow)
      const timeScore = Math.max(0, 1 - feedback.implicit.timeToCompletion / 300); // 5 min baseline
      reward += timeScore * 0.2;

      // Edits made (fewer is better)
      const editScore = Math.max(0, 1 - feedback.implicit.editsMade / 10);
      reward += editScore * 0.2;
    }

    return Math.min(1, Math.max(0, reward)); // Clamp to [0, 1]
  }

  /**
   * Get strategy statistics
   */
  getStrategyStats(): Record<StrategyType, { count: number; avgReward: number }> {
    const stats: Record<string, { count: number; avgReward: number }> = {};

    Object.values(StrategyType).forEach(strategy => {
      const strategyHistory = this.state.rewardHistory.filter(
        h => h.strategy === strategy
      );
      
      stats[strategy] = {
        count: strategyHistory.length,
        avgReward: strategyHistory.length > 0
          ? strategyHistory.reduce((sum, h) => sum + h.reward, 0) / strategyHistory.length
          : 0
      };
    });

    return stats as Record<StrategyType, { count: number; avgReward: number }>;
  }

  /**
   * Export model for persistence
   */
  exportModel(): string {
    return JSON.stringify({
      weights: Array.from(this.state.strategyWeights.entries()),
      explorationRate: this.state.explorationRate,
      totalIterations: this.state.totalIterations,
      rewardHistory: this.state.rewardHistory.slice(-100) // Keep last 100
    });
  }

  /**
   * Import model from persistence
   */
  importModel(serialized: string): void {
    try {
      const data = JSON.parse(serialized);
      this.state.strategyWeights = new Map(data.weights);
      this.state.explorationRate = data.explorationRate;
      this.state.totalIterations = data.totalIterations;
      this.state.rewardHistory = data.rewardHistory;
    } catch (error) {
      console.error('Failed to import model:', error);
    }
  }
}
