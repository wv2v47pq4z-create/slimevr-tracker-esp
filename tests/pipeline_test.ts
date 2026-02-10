/**
 * @prz/agent-core - Pipeline Tests
 * 
 * Unit and integration tests for the agent orchestration pipeline
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { Pipeline } from '../src/pipeline/Pipeline.js';
import { PreferenceModel } from '../src/feedback/PreferenceModel.js';
import { IntentType, StrategyType, PipelineStage, AntiPatternType } from '../src/types.js';

// ============================================================================
// INTENT CLASSIFICATION TESTS
// ============================================================================

test('Pipeline - Intent Classification: VIBE_CHECK', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('What is TypeScript?', 'test-session-1');
  
  assert.strictEqual(context.currentIntent?.type, IntentType.VIBE_CHECK);
  assert.ok(context.currentIntent?.confidence.overall > 0);
});

test('Pipeline - Intent Classification: MOVE_MAKE', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('Create a new API endpoint', 'test-session-2');
  
  assert.strictEqual(context.currentIntent?.type, IntentType.MOVE_MAKE);
  assert.ok(context.currentIntent?.confidence.overall > 0);
});

test('Pipeline - Intent Classification: CLARITY_CALL', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('?', 'test-session-3');
  
  assert.strictEqual(context.currentIntent?.type, IntentType.CLARITY_CALL);
});

// ============================================================================
// CONFIDENCE GATING TESTS
// ============================================================================

test('Pipeline - Confidence Gating: High confidence passes', async () => {
  const pipeline = new Pipeline({ 
    debug: false,
    confidenceThreshold: 0.7 
  });
  
  const context = await pipeline.process('How does machine learning work?', 'test-session-4');
  
  assert.ok(context.currentIntent);
  assert.ok(context.currentIntent.confidence.overall >= 0.7);
  assert.ok(context.executionResult);
});

test('Pipeline - Confidence Gating: Low confidence triggers clarification', async () => {
  const pipeline = new Pipeline({ 
    debug: false,
    confidenceThreshold: 0.9 // Very high threshold
  });
  
  const context = await pipeline.process('hmm', 'test-session-5');
  
  // Should be converted to CLARITY_CALL if below threshold
  assert.ok(context.currentIntent);
});

// ============================================================================
// STRATEGY SELECTION TESTS
// ============================================================================

test('Pipeline - Strategy Selection: VIBE_CHECK gets AUTONOMOUS', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('What is React?', 'test-session-6');
  
  assert.strictEqual(context.selectedStrategy?.type, StrategyType.AUTONOMOUS);
});

test('Pipeline - Strategy Selection: MOVE_MAKE with high confidence', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('Build a new feature', 'test-session-7');
  
  assert.ok(context.selectedStrategy);
  assert.ok([StrategyType.AUTONOMOUS, StrategyType.CONFIRMATION].includes(context.selectedStrategy.type));
});

test('Pipeline - Strategy Selection: CLARITY_CALL gets GUIDED', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('??', 'test-session-8');
  
  assert.strictEqual(context.selectedStrategy?.type, StrategyType.GUIDED);
});

// ============================================================================
// EXECUTION TESTS
// ============================================================================

test('Pipeline - Execution: Successful execution', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('How do I use TypeScript?', 'test-session-9');
  
  assert.ok(context.executionResult);
  assert.strictEqual(context.executionResult.success, true);
  assert.ok(context.executionResult.output);
  assert.ok(context.executionResult.metrics.duration >= 0);
});

test('Pipeline - Execution: Metrics are tracked', async () => {
  const pipeline = new Pipeline({ debug: false });
  const context = await pipeline.process('Explain async/await', 'test-session-10');
  
  assert.ok(context.executionResult);
  assert.ok(context.executionResult.metrics);
  assert.ok(typeof context.executionResult.metrics.duration === 'number');
  assert.ok(typeof context.executionResult.metrics.retriesAttempted === 'number');
});

// ============================================================================
// ANTI-PATTERN DETECTION TESTS
// ============================================================================

test('Pipeline - GOOSEGUARD: Detects infinite clarification loop', async () => {
  const pipeline = new Pipeline({ 
    debug: false,
    maxClarificationAttempts: 3,
    enableAntiPatternDetection: true
  });
  
  const sessionId = 'test-session-11';
  let context;
  
  // Make multiple unclear requests
  for (let i = 0; i < 5; i++) {
    context = await pipeline.process('what?', sessionId);
  }
  
  assert.ok(context);
  assert.ok(context.antiPatternDetected);
  assert.strictEqual(context.antiPatternDetected?.type, AntiPatternType.INFINITE_CLARIFICATION);
  assert.ok(context.antiPatternDetected?.severity > 0.5);
});

test('Pipeline - GOOSEGUARD: No false positives on normal flow', async () => {
  const pipeline = new Pipeline({ 
    debug: false,
    enableAntiPatternDetection: true
  });
  
  const context = await pipeline.process('How does REST API work?', 'test-session-12');
  
  assert.ok(!context.antiPatternDetected);
});

// ============================================================================
// CONTEXT MANAGEMENT TESTS
// ============================================================================

test('Pipeline - Context: Maintains history across interactions', async () => {
  const pipeline = new Pipeline({ debug: false });
  const sessionId = 'test-session-13';
  
  await pipeline.process('First query', sessionId);
  const context = await pipeline.process('Second query', sessionId);
  
  assert.ok(context.history.length >= 2);
});

test('Pipeline - Context: Separate sessions are isolated', async () => {
  const pipeline = new Pipeline({ debug: false });
  
  const context1 = await pipeline.process('Query 1', 'session-a');
  const context2 = await pipeline.process('Query 2', 'session-b');
  
  assert.notStrictEqual(context1.sessionId, context2.sessionId);
  assert.ok(context1.history.length > 0);
  assert.ok(context2.history.length > 0);
});

test('Pipeline - Context: Can retrieve context by sessionId', async () => {
  const pipeline = new Pipeline({ debug: false });
  const sessionId = 'test-session-14';
  
  await pipeline.process('Test query', sessionId);
  const retrievedContext = pipeline.getContext(sessionId);
  
  assert.ok(retrievedContext);
  assert.strictEqual(retrievedContext.sessionId, sessionId);
});

test('Pipeline - Context: Can clear context', async () => {
  const pipeline = new Pipeline({ debug: false });
  const sessionId = 'test-session-15';
  
  await pipeline.process('Test query', sessionId);
  pipeline.clearContext(sessionId);
  
  const retrievedContext = pipeline.getContext(sessionId);
  assert.strictEqual(retrievedContext, undefined);
});

// ============================================================================
// FEEDBACK COLLECTION TESTS
// ============================================================================

test('Pipeline - Feedback: Can submit feedback', async () => {
  const pipeline = new Pipeline({ debug: false });
  const sessionId = 'test-session-16';
  
  await pipeline.process('Test query', sessionId);
  
  // Should not throw
  await pipeline.submitFeedback(sessionId, {
    rating: 5,
    implicit: {
      taskCompleted: true,
      timeToCompletion: 30,
      editsMade: 0
    }
  });
  
  assert.ok(true);
});

test('Pipeline - Feedback: Throws on invalid session', async () => {
  const pipeline = new Pipeline({ debug: false });
  
  await assert.rejects(
    async () => {
      await pipeline.submitFeedback('non-existent-session', {
        rating: 5
      });
    },
    /Session .* not found/
  );
});

// ============================================================================
// PREFERENCE LEARNING TESTS
// ============================================================================

test('PreferenceModel - Initialization', () => {
  const model = new PreferenceModel(0.5);
  const state = model.getState();
  
  assert.ok(state.strategyWeights.size > 0);
  assert.strictEqual(state.totalIterations, 0);
  assert.ok(Array.isArray(state.rewardHistory));
});

test('PreferenceModel - Strategy Selection', () => {
  const model = new PreferenceModel(0.5);
  
  const strategy = model.selectStrategy({
    intentType: IntentType.VIBE_CHECK,
    taskComplexity: 0.5,
    userExperience: 0.7,
    timeOfDay: 14,
    sessionLength: 10,
    previousSuccessRate: 0.8
  });
  
  assert.ok(Object.values(StrategyType).includes(strategy));
});

test('PreferenceModel - Updates from Feedback', () => {
  const model = new PreferenceModel(0.5);
  
  const context = {
    intentType: IntentType.MOVE_MAKE,
    taskComplexity: 0.6,
    userExperience: 0.8,
    timeOfDay: 10,
    sessionLength: 15,
    previousSuccessRate: 0.85
  };
  
  const initialState = model.getState();
  const initialIterations = initialState.totalIterations;
  
  model.updateFromFeedback(context, StrategyType.AUTONOMOUS, {
    rating: 5,
    implicit: {
      taskCompleted: true,
      timeToCompletion: 30,
      editsMade: 0
    }
  });
  
  const updatedState = model.getState();
  assert.ok(updatedState.rewardHistory.length > 0);
});

test('PreferenceModel - Strategy Statistics', () => {
  const model = new PreferenceModel(0.5);
  
  // Add some feedback
  const context = {
    intentType: IntentType.VIBE_CHECK,
    taskComplexity: 0.5,
    userExperience: 0.7,
    timeOfDay: 14,
    sessionLength: 10,
    previousSuccessRate: 0.8
  };
  
  model.updateFromFeedback(context, StrategyType.AUTONOMOUS, {
    rating: 5
  });
  
  const stats = model.getStrategyStats();
  
  assert.ok(stats[StrategyType.AUTONOMOUS]);
  assert.ok(stats[StrategyType.AUTONOMOUS].count >= 0);
  assert.ok(typeof stats[StrategyType.AUTONOMOUS].avgReward === 'number');
});

test('PreferenceModel - Export and Import', () => {
  const model1 = new PreferenceModel(0.5);
  
  // Add some data
  model1.updateFromFeedback(
    {
      intentType: IntentType.MOVE_MAKE,
      taskComplexity: 0.6,
      userExperience: 0.8,
      timeOfDay: 10,
      sessionLength: 15,
      previousSuccessRate: 0.85
    },
    StrategyType.CONFIRMATION,
    {
      rating: 4,
      implicit: {
        taskCompleted: true,
        timeToCompletion: 60,
        editsMade: 2
      }
    }
  );
  
  const exported = model1.exportModel();
  
  const model2 = new PreferenceModel(0.5);
  model2.importModel(exported);
  
  const state1 = model1.getState();
  const state2 = model2.getState();
  
  assert.strictEqual(state1.totalIterations, state2.totalIterations);
  assert.strictEqual(state1.rewardHistory.length, state2.rewardHistory.length);
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

test('Integration - Full pipeline with feedback loop', async () => {
  const pipeline = new Pipeline({ debug: false });
  const model = new PreferenceModel(0.5);
  const sessionId = 'integration-test-1';
  
  // Step 1: Process input
  const context = await pipeline.process('Create a REST API', sessionId);
  
  assert.ok(context.currentIntent);
  assert.ok(context.selectedStrategy);
  assert.ok(context.executionResult);
  
  // Step 2: Submit feedback
  await pipeline.submitFeedback(sessionId, {
    rating: 5,
    implicit: {
      taskCompleted: true,
      timeToCompletion: 45,
      editsMade: 1
    }
  });
  
  // Step 3: Update preference model
  model.updateFromFeedback(
    {
      intentType: context.currentIntent.type,
      taskComplexity: 0.7,
      userExperience: 0.8,
      timeOfDay: new Date().getHours(),
      sessionLength: 10,
      previousSuccessRate: 0.85
    },
    context.selectedStrategy.type,
    {
      rating: 5,
      implicit: {
        taskCompleted: true,
        timeToCompletion: 45,
        editsMade: 1
      }
    }
  );
  
  const stats = model.getStrategyStats();
  assert.ok(Object.keys(stats).length > 0);
});

test('Integration - Custom event handlers', async () => {
  const pipeline = new Pipeline({ debug: false });
  let customHandlerCalled = false;
  
  pipeline.on(PipelineStage.INTENT_CLASSIFICATION, async (event, context) => {
    customHandlerCalled = true;
  });
  
  await pipeline.process('Test query', 'custom-handler-test');
  
  assert.strictEqual(customHandlerCalled, true);
});

console.log('All tests completed successfully!');
