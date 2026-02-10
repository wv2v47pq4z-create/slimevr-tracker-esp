/**
 * @prz/agent-core - Event-Driven Pipeline
 * 
 * Implements the core orchestration pipeline using an event bus architecture.
 * Stages observe the full interaction history and can detect cross-stage patterns.
 */

import {
  PipelineStage,
  PipelineEvent,
  PipelineContext,
  PipelineConfig,
  DEFAULT_CONFIG,
  ClassifiedIntent,
  IntentType,
  ConfidenceScore,
  ExecutionStrategy,
  StrategyType,
  ExecutionResult,
  AntiPattern,
  AntiPatternType,
  UserFeedback
} from '../types.js';

/**
 * Event handler function type
 */
type EventHandler = (event: PipelineEvent, context: PipelineContext) => void | Promise<void>;

/**
 * Event-driven pipeline orchestrator
 */
export class Pipeline {
  private config: PipelineConfig;
  private eventBus: Map<PipelineStage, EventHandler[]>;
  private contexts: Map<string, PipelineContext>;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = new Map();
    this.contexts = new Map();

    // Initialize event bus for each stage
    Object.values(PipelineStage).forEach(stage => {
      this.eventBus.set(stage, []);
    });

    // Register default stage handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register an event handler for a specific stage
   */
  on(stage: PipelineStage, handler: EventHandler): void {
    const handlers = this.eventBus.get(stage) || [];
    handlers.push(handler);
    this.eventBus.set(stage, handlers);
  }

  /**
   * Emit an event to all registered handlers
   */
  private async emit(event: PipelineEvent, context: PipelineContext): Promise<void> {
    const handlers = this.eventBus.get(event.stage) || [];
    
    // Add event to context history
    context.history.push(event);

    if (this.config.debug) {
      console.log(`[Pipeline] Stage: ${event.stage}`, event.data);
    }

    // Execute all handlers in sequence
    for (const handler of handlers) {
      await handler(event, context);
    }
  }

  /**
   * Process user input through the pipeline
   */
  async process(input: string, sessionId: string, userId?: string): Promise<PipelineContext> {
    // Get or create context
    let context = this.contexts.get(sessionId);
    if (!context) {
      context = {
        sessionId,
        userId,
        history: []
      };
      this.contexts.set(sessionId, context);
    }

    try {
      // Stage 1: Intent Classification
      await this.emit({
        stage: PipelineStage.INTENT_CLASSIFICATION,
        data: { input },
        metadata: { timestamp: Date.now(), sessionId, userId }
      }, context);

      // Stage 2: Confidence Gating
      await this.emit({
        stage: PipelineStage.CONFIDENCE_GATING,
        data: { intent: context.currentIntent },
        metadata: { timestamp: Date.now(), sessionId, userId }
      }, context);

      // Stage 3: Anti-Pattern Detection (if enabled)
      if (this.config.enableAntiPatternDetection) {
        await this.emit({
          stage: PipelineStage.ANTI_PATTERN_DETECTION,
          data: { history: context.history },
          metadata: { timestamp: Date.now(), sessionId, userId }
        }, context);

        // If anti-pattern detected, handle pivot
        if (context.antiPatternDetected) {
          return context;
        }
      }

      // Stage 4: Strategy Selection
      await this.emit({
        stage: PipelineStage.STRATEGY_SELECTION,
        data: { intent: context.currentIntent },
        metadata: { timestamp: Date.now(), sessionId, userId }
      }, context);

      // Stage 5: Execution
      await this.emit({
        stage: PipelineStage.EXECUTION,
        data: { 
          intent: context.currentIntent,
          strategy: context.selectedStrategy
        },
        metadata: { timestamp: Date.now(), sessionId, userId }
      }, context);

      return context;
    } catch (error) {
      console.error('[Pipeline] Error:', error);
      throw error;
    }
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(sessionId: string, feedback: UserFeedback): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await this.emit({
      stage: PipelineStage.FEEDBACK_COLLECTION,
      data: { feedback },
      metadata: { timestamp: Date.now(), sessionId: context.sessionId, userId: context.userId }
    }, context);
  }

  /**
   * Get context for a session
   */
  getContext(sessionId: string): PipelineContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Clear a session context
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Register default stage handlers
   */
  private registerDefaultHandlers(): void {
    // Intent Classification Handler
    this.on(PipelineStage.INTENT_CLASSIFICATION, async (event, context) => {
      const { input } = event.data;
      const intent = this.classifyIntent(input);
      context.currentIntent = intent;
    });

    // Confidence Gating Handler
    this.on(PipelineStage.CONFIDENCE_GATING, async (event, context) => {
      const { intent } = event.data;
      
      if (!intent) {
        throw new Error('No intent to gate');
      }

      // Check if confidence meets threshold
      if (intent.confidence.overall < this.config.confidenceThreshold) {
        // Request clarification
        intent.type = IntentType.CLARITY_CALL;
      }
    });

    // Strategy Selection Handler
    this.on(PipelineStage.STRATEGY_SELECTION, async (event, context) => {
      const { intent } = event.data;
      
      if (!intent) {
        throw new Error('No intent for strategy selection');
      }

      const strategy = this.selectStrategy(intent, context);
      context.selectedStrategy = strategy;
    });

    // Execution Handler
    this.on(PipelineStage.EXECUTION, async (event, context) => {
      const { intent, strategy } = event.data;
      
      if (!intent || !strategy) {
        throw new Error('Missing intent or strategy for execution');
      }

      const result = await this.execute(intent, strategy);
      context.executionResult = result;
    });

    // Anti-Pattern Detection Handler
    this.on(PipelineStage.ANTI_PATTERN_DETECTION, async (event, context) => {
      const antiPattern = this.detectAntiPatterns(context);
      if (antiPattern) {
        context.antiPatternDetected = antiPattern;
      }
    });

    // Feedback Collection Handler
    this.on(PipelineStage.FEEDBACK_COLLECTION, async (event, context) => {
      // This would typically update the preference model
      if (this.config.debug) {
        console.log('[Pipeline] Feedback received:', event.data.feedback);
      }
    });
  }

  /**
   * Classify user intent
   */
  private classifyIntent(input: string): ClassifiedIntent {
    // Simple rule-based classification (in production, use LLM or ML model)
    const lowerInput = input.toLowerCase();
    
    let type: IntentType;
    let patternMatch = 0;
    let clarity = 0;

    // Pattern matching
    if (lowerInput.includes('how') || lowerInput.includes('what') || lowerInput.includes('why')) {
      type = IntentType.VIBE_CHECK;
      patternMatch = 0.8;
      clarity = 0.85;
    } else if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('make')) {
      type = IntentType.MOVE_MAKE;
      patternMatch = 0.85;
      clarity = 0.9;
    } else if (lowerInput.includes('?') || lowerInput.length < 10) {
      type = IntentType.CLARITY_CALL;
      patternMatch = 0.6;
      clarity = 0.5;
    } else {
      type = IntentType.RAPPORT_BUILD;
      patternMatch = 0.7;
      clarity = 0.7;
    }

    const confidence: ConfidenceScore = {
      patternMatch,
      clarity,
      templateCoverage: 0.75,
      historicalSuccess: 0.8,
      overall: (patternMatch + clarity + 0.75 + 0.8) / 4
    };

    return {
      type,
      confidence,
      rawInput: input,
      extractedEntities: {},
      timestamp: Date.now()
    };
  }

  /**
   * Select execution strategy based on intent
   */
  private selectStrategy(intent: ClassifiedIntent, context: PipelineContext): ExecutionStrategy {
    // Simple strategy selection (in production, use preference learning)
    let type: StrategyType;
    let confidence = 0.85;

    switch (intent.type) {
      case IntentType.VIBE_CHECK:
        type = StrategyType.AUTONOMOUS;
        break;
      case IntentType.MOVE_MAKE:
        type = intent.confidence.overall > 0.9 
          ? StrategyType.AUTONOMOUS 
          : StrategyType.CONFIRMATION;
        break;
      case IntentType.CLARITY_CALL:
        type = StrategyType.GUIDED;
        break;
      default:
        type = StrategyType.AUTONOMOUS;
    }

    return {
      type,
      confidence,
      reasoning: `Selected ${type} based on intent ${intent.type}`,
      parameters: {}
    };
  }

  /**
   * Execute the intent with selected strategy
   */
  private async execute(intent: ClassifiedIntent, strategy: ExecutionStrategy): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Simulate execution (in production, call actual LLM or action executor)
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        output: `Executed ${intent.type} with ${strategy.type} strategy`,
        metrics: {
          duration: Date.now() - startTime,
          tokensUsed: 150,
          retriesAttempted: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          duration: Date.now() - startTime,
          retriesAttempted: 1
        }
      };
    }
  }

  /**
   * Detect anti-patterns in conversation
   */
  private detectAntiPatterns(context: PipelineContext): AntiPattern | null {
    // Count CLARITY_CALL intents across all events in history
    let clarificationCount = 0;
    for (const event of context.history) {
      if (event.stage === PipelineStage.INTENT_CLASSIFICATION) {
        // Check if the data contains a CLARITY_CALL intent
        const intentData = event.data as any;
        if (intentData?.input && intentData.input.length < 10) {
          clarificationCount++;
        }
      }
    }

    // Check for infinite clarification loop
    if (clarificationCount > this.config.maxClarificationAttempts) {
      return {
        type: AntiPatternType.INFINITE_CLARIFICATION,
        severity: 0.9,
        evidence: [`${clarificationCount} clarification attempts detected`],
        recommendedPivot: 'Switch to guided mode with examples'
      };
    }

    // Check for stuck loop (repeated similar events)
    const recentEvents = context.history.slice(-5);
    const uniqueStages = new Set(recentEvents.map(e => e.stage)).size;
    if (uniqueStages < 2 && recentEvents.length >= 5) {
      return {
        type: AntiPatternType.STUCK_LOOP,
        severity: 0.85,
        evidence: ['Repetitive pattern detected in recent events'],
        recommendedPivot: 'Reset context and try alternative approach'
      };
    }

    return null;
  }
}
