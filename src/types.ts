/**
 * @prz/agent-core - Core Type Definitions
 * 
 * This module contains industry-standard type definitions mapped to PRZ creative vocabulary
 * for better clarity and understanding across the agent orchestration pipeline.
 */

// ============================================================================
// INTENT & CONFIDENCE TYPES
// ============================================================================

/**
 * User intent classification with PRZ terminology mapping
 * 
 * Industry Standard → PRZ Creative Vocabulary:
 * - Information Query → VIBE_CHECK (exploratory question)
 * - Task Execution → MOVE_MAKE (action request)
 * - Clarification → CLARITY_CALL (needs more info)
 * - Conversational → RAPPORT_BUILD (social interaction)
 */
export enum IntentType {
  VIBE_CHECK = 'vibe_check',      // Information query
  MOVE_MAKE = 'move_make',        // Executable task
  CLARITY_CALL = 'clarity_call',  // Needs clarification
  RAPPORT_BUILD = 'rapport_build' // Conversational
}

/**
 * Multi-dimensional confidence scoring
 * Provides granular insights into classification reliability
 */
export interface ConfidenceScore {
  patternMatch: number;      // [0-1] How well input matches known patterns
  clarity: number;           // [0-1] How clear/unambiguous the intent is
  templateCoverage: number;  // [0-1] Coverage of required template fields
  historicalSuccess: number; // [0-1] Past success rate for similar intents
  overall: number;           // [0-1] Weighted aggregate confidence
}

/**
 * Classified user intent with confidence metrics
 */
export interface ClassifiedIntent {
  type: IntentType;
  confidence: ConfidenceScore;
  rawInput: string;
  extractedEntities: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// PIPELINE STAGE TYPES
// ============================================================================

/**
 * Pipeline stage identifier
 */
export enum PipelineStage {
  INTENT_CLASSIFICATION = 'intent_classification',
  CONFIDENCE_GATING = 'confidence_gating',
  STRATEGY_SELECTION = 'strategy_selection',
  EXECUTION = 'execution',
  ANTI_PATTERN_DETECTION = 'anti_pattern_detection',
  FEEDBACK_COLLECTION = 'feedback_collection'
}

/**
 * Event emitted between pipeline stages
 */
export interface PipelineEvent {
  stage: PipelineStage;
  data: any;
  metadata: {
    timestamp: number;
    sessionId: string;
    userId?: string;
  };
}

/**
 * Pipeline execution context
 * Maintains state throughout the interaction
 */
export interface PipelineContext {
  sessionId: string;
  userId?: string;
  history: PipelineEvent[];
  currentIntent?: ClassifiedIntent;
  selectedStrategy?: ExecutionStrategy;
  executionResult?: ExecutionResult;
  antiPatternDetected?: AntiPattern;
}

// ============================================================================
// STRATEGY & EXECUTION TYPES
// ============================================================================

/**
 * Execution strategy options
 */
export enum StrategyType {
  AUTONOMOUS = 'autonomous',           // Execute without confirmation
  CONFIRMATION = 'confirmation',       // Ask before executing
  GUIDED = 'guided',                   // Step-by-step guidance
  DELEGATED = 'delegated',             // Hand off to specialist
  LEARNING = 'learning'                // Learn from demonstration
}

/**
 * Strategy selection with confidence
 */
export interface ExecutionStrategy {
  type: StrategyType;
  confidence: number;
  reasoning: string;
  parameters: Record<string, any>;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  metrics: {
    duration: number;
    tokensUsed?: number;
    retriesAttempted: number;
  };
}

// ============================================================================
// ANTI-PATTERN DETECTION (GOOSEGUARD)
// ============================================================================

/**
 * GOOSEGUARD - Anti-pattern detection system
 * Detects conversational anti-patterns and enforces pivots
 */
export enum AntiPatternType {
  INFINITE_CLARIFICATION = 'infinite_clarification',  // Too many clarification loops
  STUCK_LOOP = 'stuck_loop',                          // Repetitive failed attempts
  CONTEXT_DRIFT = 'context_drift',                    // Losing track of original goal
  SCOPE_CREEP = 'scope_creep',                        // Task expanding beyond bounds
  HALLUCINATION_SPIRAL = 'hallucination_spiral'       // Fabricating information repeatedly
}

/**
 * Detected anti-pattern
 */
export interface AntiPattern {
  type: AntiPatternType;
  severity: number; // [0-1] How severe the pattern is
  evidence: string[];
  recommendedPivot: string;
}

// ============================================================================
// FEEDBACK & PREFERENCE LEARNING
// ============================================================================

/**
 * User feedback on interaction
 */
export interface UserFeedback {
  rating: number; // [0-5] User satisfaction rating
  explicit?: {
    liked: string[];
    disliked: string[];
  };
  implicit?: {
    taskCompleted: boolean;
    timeToCompletion: number;
    editsMade: number;
  };
}

/**
 * Context features for preference learning
 * Used by LinUCB contextual bandit
 */
export interface ContextFeatures {
  intentType: IntentType;
  taskComplexity: number;     // [0-1] Estimated task complexity
  userExperience: number;     // [0-1] User expertise level
  timeOfDay: number;          // [0-23] Hour of day
  sessionLength: number;      // Minutes in current session
  previousSuccessRate: number; // [0-1] Historical success rate
}

/**
 * Preference model state
 */
export interface PreferenceState {
  strategyWeights: Map<StrategyType, number[]>;
  explorationRate: number;
  totalIterations: number;
  rewardHistory: Array<{
    context: ContextFeatures;
    strategy: StrategyType;
    reward: number;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  confidenceThreshold: number;        // Minimum confidence to proceed
  maxClarificationAttempts: number;   // Max clarification loops
  enableAntiPatternDetection: boolean;
  enablePreferenceLearning: boolean;
  llmProvider: string;                // 'gpt-4' | 'claude' | 'gemini' | 'llama'
  debug: boolean;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_CONFIG: PipelineConfig = {
  confidenceThreshold: 0.7,
  maxClarificationAttempts: 3,
  enableAntiPatternDetection: true,
  enablePreferenceLearning: true,
  llmProvider: 'gpt-4',
  debug: false
};
