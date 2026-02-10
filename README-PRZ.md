# @prz/agent-core

> Production-grade agent orchestration middleware with event-driven pipeline architecture

A TypeScript-based agent orchestration framework designed for building intelligent, adaptive AI agents with measurable interaction metrics and optimization of human cognitive flow.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the interactive demo
npm run demo

# Run tests
npm test
```

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Terminology Mapping](#terminology-mapping)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**@prz/agent-core** provides a complete orchestration pipeline for AI agents, replacing traditional procedural architectures with a reactive event bus system. The framework enables:

- **Event-driven orchestration**: Stages observe full interaction history
- **Multi-dimensional confidence scoring**: Granular reliability insights
- **Anti-pattern detection**: GOOSEGUARD system prevents conversational pitfalls
- **Adaptive preference learning**: LinUCB contextual bandit for strategy optimization
- **LLM agnostic**: Works with GPT-4, Claude, Gemini, Llama, and others

## 🏗 Architecture

The pipeline consists of six core stages orchestrated through an event bus:

```
User Input
    ↓
[1. Intent Classification] → Classify: VIBE_CHECK, MOVE_MAKE, CLARITY_CALL, RAPPORT_BUILD
    ↓
[2. Confidence Gating] → Multi-dimensional confidence scoring
    ↓
[3. Anti-Pattern Detection] → GOOSEGUARD: Detect conversational anti-patterns
    ↓
[4. Strategy Selection] → Choose: AUTONOMOUS, CONFIRMATION, GUIDED, DELEGATED, LEARNING
    ↓
[5. Execution] → Execute with selected strategy
    ↓
[6. Feedback Collection] → Update preference model with LinUCB
```

### Event Bus Pattern

Each stage emits events that can be observed by other components, enabling:
- Cross-stage pattern detection
- Full interaction history tracking
- Flexible pipeline customization
- Debugging and monitoring

## 🧩 Core Concepts

### Intent Types (PRZ Vocabulary)

| Industry Standard | PRZ Term | Description |
|------------------|----------|-------------|
| Information Query | `VIBE_CHECK` | Exploratory questions, seeking information |
| Task Execution | `MOVE_MAKE` | Action requests, concrete tasks |
| Clarification | `CLARITY_CALL` | Needs more information or context |
| Conversational | `RAPPORT_BUILD` | Social interaction, relationship building |

### Confidence Dimensions

The framework uses **four-dimensional confidence scoring** for granular insights:

1. **Pattern Match** (0-1): How well input matches known patterns
2. **Clarity** (0-1): How clear/unambiguous the intent is
3. **Template Coverage** (0-1): Coverage of required template fields
4. **Historical Success** (0-1): Past success rate for similar intents
5. **Overall**: Weighted aggregate confidence

### Execution Strategies

- **AUTONOMOUS**: Execute without confirmation (high confidence)
- **CONFIRMATION**: Ask before executing (medium confidence)
- **GUIDED**: Step-by-step guidance (low confidence/complex tasks)
- **DELEGATED**: Hand off to specialist agent
- **LEARNING**: Learn from demonstration

### GOOSEGUARD Anti-Pattern Detection

Detects and prevents conversational anti-patterns:

- **Infinite Clarification**: Too many clarification loops
- **Stuck Loop**: Repetitive failed attempts
- **Context Drift**: Losing track of original goal
- **Scope Creep**: Task expanding beyond bounds
- **Hallucination Spiral**: Fabricating information repeatedly

### Preference Learning (LinUCB)

Uses **Linear Upper Confidence Bound (LinUCB)** contextual bandit for adaptive strategy selection:

- Balances exploration vs exploitation
- Learns from user feedback (explicit ratings + implicit signals)
- Adapts to task complexity, user experience, and context
- Continuously improves strategy selection

## ✨ Features

### 1. Event-Driven Pipeline

```typescript
import { Pipeline, PipelineStage } from '@prz/agent-core';

const pipeline = new Pipeline({
  confidenceThreshold: 0.7,
  enableAntiPatternDetection: true,
  enablePreferenceLearning: true
});

// Add custom observers
pipeline.on(PipelineStage.INTENT_CLASSIFICATION, async (event, context) => {
  console.log('Intent:', context.currentIntent?.type);
});

// Process user input
const context = await pipeline.process(
  'How do I build a REST API?',
  'session-123',
  'user-456'
);
```

### 2. Multi-Dimensional Confidence Scoring

```typescript
const confidence = context.currentIntent?.confidence;
console.log({
  patternMatch: confidence.patternMatch,      // 0.85
  clarity: confidence.clarity,                // 0.90
  templateCoverage: confidence.templateCoverage, // 0.75
  historicalSuccess: confidence.historicalSuccess, // 0.80
  overall: confidence.overall                 // 0.825
});
```

### 3. Anti-Pattern Detection

```typescript
if (context.antiPatternDetected) {
  console.log('Type:', context.antiPatternDetected.type);
  console.log('Severity:', context.antiPatternDetected.severity);
  console.log('Pivot:', context.antiPatternDetected.recommendedPivot);
}
```

### 4. Preference Learning

```typescript
import { PreferenceModel } from '@prz/agent-core';

const model = new PreferenceModel(0.5); // exploration parameter

// Select strategy based on context
const strategy = model.selectStrategy({
  intentType: IntentType.MOVE_MAKE,
  taskComplexity: 0.7,
  userExperience: 0.8,
  timeOfDay: 14,
  sessionLength: 10,
  previousSuccessRate: 0.85
});

// Update from feedback
model.updateFromFeedback(context, strategy, {
  rating: 5,
  implicit: {
    taskCompleted: true,
    timeToCompletion: 30,
    editsMade: 0
  }
});

// Get statistics
const stats = model.getStrategyStats();
```

### 5. Feedback Collection

```typescript
await pipeline.submitFeedback('session-123', {
  rating: 5,
  explicit: {
    liked: ['clear explanation', 'helpful examples'],
    disliked: []
  },
  implicit: {
    taskCompleted: true,
    timeToCompletion: 45,
    editsMade: 1
  }
});
```

## 📚 API Reference

### Pipeline

```typescript
class Pipeline {
  constructor(config?: Partial<PipelineConfig>);
  
  // Register event handler
  on(stage: PipelineStage, handler: EventHandler): void;
  
  // Process user input
  async process(input: string, sessionId: string, userId?: string): Promise<PipelineContext>;
  
  // Submit feedback
  async submitFeedback(sessionId: string, feedback: UserFeedback): Promise<void>;
  
  // Context management
  getContext(sessionId: string): PipelineContext | undefined;
  clearContext(sessionId: string): void;
}
```

### PreferenceModel

```typescript
class PreferenceModel {
  constructor(alpha?: number); // Exploration parameter (default: 0.5)
  
  // Select best strategy
  selectStrategy(context: ContextFeatures): StrategyType;
  
  // Update from feedback
  updateFromFeedback(
    context: ContextFeatures,
    strategy: StrategyType,
    feedback: UserFeedback
  ): void;
  
  // Get statistics
  getStrategyStats(): Record<StrategyType, { count: number; avgReward: number }>;
  
  // Persistence
  exportModel(): string;
  importModel(serialized: string): void;
}
```

## 🎨 Design Decisions

### Why Event-Driven Architecture?

**Problem**: Traditional procedural pipelines are rigid and opaque.

**Solution**: Event bus enables:
- Stages to observe full interaction history
- Cross-stage pattern detection
- Flexible customization without modifying core logic
- Better debugging and monitoring

### Why Multi-Dimensional Confidence?

**Problem**: Single confidence scores hide important nuances.

**Solution**: Four dimensions provide:
- Granular insights into classification reliability
- Better threshold tuning per dimension
- Richer data for preference learning
- More informed decision-making

### Why LinUCB for Preference Learning?

**Problem**: Static strategy selection doesn't adapt to users or tasks.

**Solution**: LinUCB contextual bandit:
- Balances exploration (trying new strategies) vs exploitation (using best known)
- Learns from both explicit (ratings) and implicit (behavior) feedback
- Adapts to context (task type, user experience, time of day)
- Continuously improves with more data

### Why GOOSEGUARD?

**Problem**: Agents can get stuck in unproductive loops.

**Solution**: Anti-pattern detection:
- Identifies problematic conversation patterns
- Enforces pivots when necessary
- Improves user experience
- Reduces wasted time and frustration

## 🗺 Terminology Mapping

PRZ uses creative vocabulary mapped to industry standards for clarity:

| PRZ Creative | Industry Standard | Rationale |
|-------------|------------------|-----------|
| VIBE_CHECK | Information Query | More intuitive, less formal |
| MOVE_MAKE | Task Execution | Action-oriented, memorable |
| CLARITY_CALL | Clarification Request | Emphasizes communication |
| RAPPORT_BUILD | Conversational | Relationship-focused |
| GOOSEGUARD | Anti-Pattern Detection | Memorable, protective metaphor |

This mapping makes the framework more accessible while maintaining professional rigor in implementation.

## 🧪 Testing

The framework includes comprehensive unit and integration tests:

```bash
# Run all tests
npm test

# Tests cover:
# - Intent classification
# - Confidence gating
# - Strategy selection
# - Execution
# - Anti-pattern detection
# - Context management
# - Feedback collection
# - Preference learning
# - Integration scenarios
```

## 🎬 Demo

Run the interactive demo to see all features in action:

```bash
npm run demo
```

The demo demonstrates:
1. **Autonomous Execution**: High-confidence intents executed immediately
2. **Confirmation Required**: Medium-confidence tasks with user confirmation
3. **Clarification Request**: Low-confidence inputs requesting more info
4. **Anti-Pattern Detection**: GOOSEGUARD detecting infinite clarification loops
5. **Preference Learning**: LinUCB adapting strategy selection from feedback

## 🚦 Production Considerations

### LLM Integration

The framework is LLM-agnostic. For production, replace the simple rule-based classification with actual LLM calls:

```typescript
pipeline.on(PipelineStage.INTENT_CLASSIFICATION, async (event, context) => {
  const { input } = event.data;
  
  // Call your LLM
  const response = await llm.classify(input);
  
  context.currentIntent = {
    type: response.intent,
    confidence: response.confidence,
    rawInput: input,
    extractedEntities: response.entities,
    timestamp: Date.now()
  };
});
```

### Persistence

For production deployment, persist:
- Preference model state (use `exportModel()` / `importModel()`)
- Pipeline contexts (for session recovery)
- Feedback history (for analytics)

### Monitoring

Track these metrics:
- Intent classification accuracy
- Confidence score distributions
- Strategy selection patterns
- Anti-pattern detection frequency
- User satisfaction (feedback ratings)
- Task completion rates

## 📄 License

This project is dual-licensed under either:

- MIT License ([LICENSE-MIT](LICENSE-MIT))
- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

**Built with ❤️ by the PRZ Team**

For questions or support, please open an issue on GitHub.
