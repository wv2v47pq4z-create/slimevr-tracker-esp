/**
 * @prz/agent-core - Interactive Demo
 * 
 * Demonstrates the full pipeline with various scenarios:
 * - Autonomous execution
 * - Clarification requests
 * - Anti-pattern detection
 * - Preference learning
 */

import { Pipeline } from '../src/pipeline/Pipeline.js';
import { PreferenceModel } from '../src/feedback/PreferenceModel.js';
import { IntentType, StrategyType, PipelineStage } from '../src/types.js';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

function log(color: string, prefix: string, message: string) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

async function runDemo() {
  console.log(`\n${colors.bright}=== PRZ Agent Core Interactive Demo ===${colors.reset}\n`);

  // Initialize pipeline with debug mode
  const pipeline = new Pipeline({
    debug: true,
    confidenceThreshold: 0.7,
    maxClarificationAttempts: 3,
    enableAntiPatternDetection: true,
    enablePreferenceLearning: true
  });

  // Initialize preference model
  const preferenceModel = new PreferenceModel(0.5);

  // Add custom handler to observe events
  pipeline.on(PipelineStage.INTENT_CLASSIFICATION, async (event, context) => {
    log(colors.cyan, '[OBSERVE]', `Intent classified as: ${context.currentIntent?.type}`);
  });

  pipeline.on(PipelineStage.STRATEGY_SELECTION, async (event, context) => {
    log(colors.green, '[OBSERVE]', `Strategy selected: ${context.selectedStrategy?.type}`);
  });

  pipeline.on(PipelineStage.ANTI_PATTERN_DETECTION, async (event, context) => {
    if (context.antiPatternDetected) {
      log(colors.red, '[GOOSEGUARD]', 
        `Anti-pattern detected: ${context.antiPatternDetected.type} (severity: ${context.antiPatternDetected.severity})`);
      log(colors.yellow, '[GOOSEGUARD]', `Pivot: ${context.antiPatternDetected.recommendedPivot}`);
    }
  });

  // ========================================================================
  // SCENARIO 1: Autonomous Execution (High Confidence)
  // ========================================================================
  console.log(`\n${colors.bright}--- Scenario 1: Autonomous Execution ---${colors.reset}`);
  log(colors.magenta, '[USER]', 'How does the agent pipeline work?');
  
  const session1 = 'session-1';
  let context = await pipeline.process(
    'How does the agent pipeline work?',
    session1,
    'user-123'
  );
  
  log(colors.green, '[RESULT]', `Success: ${context.executionResult?.success}`);
  log(colors.green, '[RESULT]', `Output: ${context.executionResult?.output}`);

  // Submit positive feedback
  await pipeline.submitFeedback(session1, {
    rating: 5,
    implicit: {
      taskCompleted: true,
      timeToCompletion: 30,
      editsMade: 0
    }
  });

  // ========================================================================
  // SCENARIO 2: Confirmation Required (Medium Confidence)
  // ========================================================================
  console.log(`\n${colors.bright}--- Scenario 2: Confirmation Required ---${colors.reset}`);
  log(colors.magenta, '[USER]', 'Create a new microservice architecture');
  
  const session2 = 'session-2';
  context = await pipeline.process(
    'Create a new microservice architecture',
    session2,
    'user-123'
  );
  
  log(colors.green, '[RESULT]', `Strategy: ${context.selectedStrategy?.type}`);
  log(colors.green, '[RESULT]', `Reasoning: ${context.selectedStrategy?.reasoning}`);

  // Submit feedback
  await pipeline.submitFeedback(session2, {
    rating: 4,
    implicit: {
      taskCompleted: true,
      timeToCompletion: 120,
      editsMade: 2
    }
  });

  // ========================================================================
  // SCENARIO 3: Clarification Request (Low Confidence)
  // ========================================================================
  console.log(`\n${colors.bright}--- Scenario 3: Clarification Request ---${colors.reset}`);
  log(colors.magenta, '[USER]', 'hmm?');
  
  const session3 = 'session-3';
  context = await pipeline.process('hmm?', session3, 'user-456');
  
  log(colors.yellow, '[SYSTEM]', `Intent: ${context.currentIntent?.type}`);
  log(colors.yellow, '[SYSTEM]', `Confidence: ${context.currentIntent?.confidence.overall.toFixed(2)}`);

  // ========================================================================
  // SCENARIO 4: Anti-Pattern Detection (Infinite Clarification Loop)
  // ========================================================================
  console.log(`\n${colors.bright}--- Scenario 4: Anti-Pattern Detection ---${colors.reset}`);
  log(colors.magenta, '[USER]', 'Simulating multiple unclear requests...');
  
  const session4 = 'session-4';
  
  // Make multiple unclear requests to trigger anti-pattern
  for (let i = 0; i < 5; i++) {
    log(colors.magenta, '[USER]', `what? (attempt ${i + 1})`);
    context = await pipeline.process('what?', session4, 'user-789');
    
    if (context.antiPatternDetected) {
      break;
    }
  }

  // ========================================================================
  // SCENARIO 5: Preference Learning
  // ========================================================================
  console.log(`\n${colors.bright}--- Scenario 5: Preference Learning ---${colors.reset}`);
  
  // Simulate multiple interactions with feedback
  const testCases = [
    {
      input: 'What is machine learning?',
      rating: 5,
      taskCompleted: true,
      timeToCompletion: 20
    },
    {
      input: 'Build a React component',
      rating: 4,
      taskCompleted: true,
      timeToCompletion: 60
    },
    {
      input: 'How do I center a div?',
      rating: 5,
      taskCompleted: true,
      timeToCompletion: 15
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const sessionId = `learning-session-${i}`;
    
    log(colors.magenta, '[USER]', testCase.input);
    context = await pipeline.process(testCase.input, sessionId, 'user-learning');
    
    // Update preference model
    if (context.currentIntent && context.selectedStrategy) {
      preferenceModel.updateFromFeedback(
        {
          intentType: context.currentIntent.type,
          taskComplexity: 0.5,
          userExperience: 0.7,
          timeOfDay: new Date().getHours(),
          sessionLength: 10,
          previousSuccessRate: 0.85
        },
        context.selectedStrategy.type,
        {
          rating: testCase.rating,
          implicit: {
            taskCompleted: testCase.taskCompleted,
            timeToCompletion: testCase.timeToCompletion,
            editsMade: 0
          }
        }
      );
    }
  }

  // Display preference learning stats
  console.log(`\n${colors.bright}--- Preference Learning Stats ---${colors.reset}`);
  const stats = preferenceModel.getStrategyStats();
  
  Object.entries(stats).forEach(([strategy, stat]) => {
    log(colors.cyan, '[STATS]', 
      `${strategy}: ${stat.count} uses, avg reward: ${stat.avgReward.toFixed(3)}`);
  });

  // Test learned preferences
  console.log(`\n${colors.bright}--- Testing Learned Preferences ---${colors.reset}`);
  const testContext = {
    intentType: IntentType.VIBE_CHECK,
    taskComplexity: 0.3,
    userExperience: 0.8,
    timeOfDay: 14,
    sessionLength: 5,
    previousSuccessRate: 0.9
  };
  
  const recommendedStrategy = preferenceModel.selectStrategy(testContext);
  log(colors.green, '[LEARNED]', `Recommended strategy: ${recommendedStrategy}`);

  // ========================================================================
  // Summary
  // ========================================================================
  console.log(`\n${colors.bright}=== Demo Complete ===${colors.reset}`);
  console.log('\nKey Features Demonstrated:');
  console.log('✓ Event-driven pipeline architecture');
  console.log('✓ Multi-dimensional confidence scoring');
  console.log('✓ Autonomous and confirmation strategies');
  console.log('✓ GOOSEGUARD anti-pattern detection');
  console.log('✓ LinUCB preference learning');
  console.log('✓ Full interaction history tracking\n');
}

// Run the demo
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
