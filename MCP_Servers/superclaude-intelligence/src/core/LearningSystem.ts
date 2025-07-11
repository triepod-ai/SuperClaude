import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  LearningExample,
  Pattern,
  LearningModel,
  MemoryItem,
  ContextState,
  LearningRequest,
  LearningExampleSchema,
  PatternSchema,
  LearningModelSchema,
  MemoryItemSchema,
  ContextStateSchema
} from '../types';

export interface LearningSystemOptions {
  maxExamples?: number;
  maxPatterns?: number;
  maxMemoryItems?: number;
  confidenceThreshold?: number;
  patternMinSupport?: number;
  enableAdaptiveLearning?: boolean;
  memoryDecayRate?: number;
}

export interface PatternMatch {
  pattern: Pattern;
  confidence: number;
  matchDetails: Record<string, any>;
}

export class LearningSystem extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<LearningSystemOptions>;
  private models: Map<string, LearningModel> = new Map();
  private memory: Map<string, MemoryItem> = new Map();
  private contextHistory: Map<string, ContextState> = new Map();
  private patternIndex: Map<string, Set<string>> = new Map(); // condition -> pattern IDs
  private metrics: {
    examplesLearned: number;
    patternsGenerated: number;
    predictionsTotal: number;
    predictionsCorrect: number;
    adaptationsPerformed: number;
  };

  constructor(options: LearningSystemOptions = {}) {
    super();
    this.logger = new Logger('LearningSystem');
    this.options = {
      maxExamples: options.maxExamples ?? 10000,
      maxPatterns: options.maxPatterns ?? 1000,
      maxMemoryItems: options.maxMemoryItems ?? 5000,
      confidenceThreshold: options.confidenceThreshold ?? 0.6,
      patternMinSupport: options.patternMinSupport ?? 0.1,
      enableAdaptiveLearning: options.enableAdaptiveLearning ?? true,
      memoryDecayRate: options.memoryDecayRate ?? 0.01
    };
    this.metrics = {
      examplesLearned: 0,
      patternsGenerated: 0,
      predictionsTotal: 0,
      predictionsCorrect: 0,
      adaptationsPerformed: 0
    };

    // Start memory decay process
    this.startMemoryDecay();
  }

  /**
   * Create a new learning model
   */
  async createModel(
    type: LearningModel['type'],
    domain: string,
    metadata?: Record<string, any>
  ): Promise<LearningModel> {
    try {
      const model: LearningModel = {
        id: uuidv4(),
        type,
        domain,
        patterns: [],
        examples: [],
        performance: {},
        lastUpdated: new Date()
      };

      const validatedModel = LearningModelSchema.parse(model);
      this.models.set(validatedModel.id, validatedModel);

      this.emit('modelCreated', { modelId: validatedModel.id, type, domain });
      this.logger.info(`Created learning model ${validatedModel.id} for domain: ${domain}`);

      return validatedModel;
    } catch (error) {
      this.logger.error('Failed to create learning model:', error);
      throw error;
    }
  }

  /**
   * Add learning example to model
   */
  async addExample(request: LearningRequest): Promise<void> {
    try {
      const validatedExample = LearningExampleSchema.parse(request.example);
      
      // Find or create model for domain
      let model: LearningModel | undefined;
      
      if (request.domain) {
        model = Array.from(this.models.values()).find(m => m.domain === request.domain);
        if (!model) {
          model = await this.createModel('pattern-recognition', request.domain);
        }
      } else {
        // Use first available model or create default
        model = Array.from(this.models.values())[0];
        if (!model) {
          model = await this.createModel('pattern-recognition', 'general');
        }
      }

      // Add example to model
      model.examples.push(validatedExample);
      
      // Limit examples
      if (model.examples.length > this.options.maxExamples) {
        model.examples = model.examples.slice(-this.options.maxExamples);
      }

      model.lastUpdated = new Date();
      this.metrics.examplesLearned++;

      // Update patterns if requested
      if (request.updatePatterns !== false) {
        await this.updatePatternsFromExamples(model);
      }

      // Store in memory
      await this.storeInMemory({
        id: uuidv4(),
        type: 'episodic',
        content: {
          example: validatedExample,
          domain: model.domain,
          outcome: validatedExample.outcome
        },
        importance: this.calculateImportance(validatedExample),
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date()
      });

      this.emit('exampleAdded', { 
        modelId: model.id, 
        exampleId: validatedExample.id, 
        outcome: validatedExample.outcome 
      });
      
      this.logger.debug(`Added learning example ${validatedExample.id} to model ${model.id}`);
    } catch (error) {
      this.logger.error('Failed to add learning example:', error);
      throw error;
    }
  }

  /**
   * Predict outcome based on input
   */
  async predict(
    modelId: string,
    input: Record<string, any>,
    context?: Record<string, any>
  ): Promise<{
    prediction: any;
    confidence: number;
    matchedPatterns: PatternMatch[];
    explanation: string;
  }> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Learning model ${modelId} not found`);
    }

    this.metrics.predictionsTotal++;

    try {
      const matchedPatterns = await this.findMatchingPatterns(model, input, context);
      
      if (matchedPatterns.length === 0) {
        return {
          prediction: null,
          confidence: 0,
          matchedPatterns: [],
          explanation: 'No matching patterns found for input'
        };
      }

      // Aggregate predictions from matched patterns
      const prediction = await this.aggregatePredictions(matchedPatterns, input);
      const confidence = this.calculatePredictionConfidence(matchedPatterns);

      // Store prediction for later validation
      await this.storeInMemory({
        id: uuidv4(),
        type: 'working',
        content: {
          prediction,
          input,
          context,
          patterns: matchedPatterns.map(m => m.pattern.id),
          confidence
        },
        importance: confidence,
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
      });

      const explanation = this.generatePredictionExplanation(matchedPatterns, prediction);

      this.emit('predictionMade', { 
        modelId, 
        confidence, 
        patternsUsed: matchedPatterns.length 
      });

      return { prediction, confidence, matchedPatterns, explanation };
    } catch (error) {
      this.logger.error('Failed to make prediction:', error);
      throw error;
    }
  }

  /**
   * Learn from feedback on prediction
   */
  async provideFeedback(
    predictionId: string,
    actualOutcome: any,
    wasCorrect: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      // Find prediction in memory
      const predictionMemory = Array.from(this.memory.values()).find(
        m => m.type === 'working' && m.content.prediction !== undefined
      );

      if (!predictionMemory) {
        this.logger.warn(`Prediction ${predictionId} not found in memory`);
        return;
      }

      if (wasCorrect) {
        this.metrics.predictionsCorrect++;
      }

      // Update pattern confidences based on feedback
      if (predictionMemory.content.patterns) {
        for (const patternId of predictionMemory.content.patterns) {
          await this.updatePatternConfidence(patternId, wasCorrect);
        }
      }

      // Store feedback as learning example
      const feedbackExample: LearningExample = {
        id: uuidv4(),
        input: predictionMemory.content.input,
        output: { predicted: predictionMemory.content.prediction, actual: actualOutcome },
        context: predictionMemory.content.context,
        outcome: wasCorrect ? 'success' : 'failure',
        feedback,
        timestamp: new Date()
      };

      // Find relevant model and add example
      const models = Array.from(this.models.values());
      if (models.length > 0) {
        await this.addExample({ example: feedbackExample });
      }

      this.emit('feedbackReceived', { 
        predictionId, 
        wasCorrect, 
        patternsAffected: predictionMemory.content.patterns?.length || 0 
      });

      this.logger.debug(`Received feedback for prediction ${predictionId}: ${wasCorrect ? 'correct' : 'incorrect'}`);
    } catch (error) {
      this.logger.error('Failed to process feedback:', error);
      throw error;
    }
  }

  /**
   * Find patterns matching input conditions
   */
  async findMatchingPatterns(
    model: LearningModel,
    input: Record<string, any>,
    context?: Record<string, any>
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    for (const pattern of model.patterns) {
      const match = await this.evaluatePatternMatch(pattern, input, context);
      if (match.confidence >= this.options.confidenceThreshold) {
        matches.push(match);
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Update context state
   */
  async updateContext(
    sessionId: string,
    domain?: string,
    goals?: string[],
    constraints?: string[],
    preferences?: Record<string, any>
  ): Promise<ContextState> {
    try {
      const context: ContextState = {
        id: uuidv4(),
        session: sessionId,
        domain,
        goals: goals || [],
        constraints: constraints || [],
        preferences: preferences || {},
        workingMemory: [],
        timestamp: new Date()
      };

      // Add relevant memory items to working memory
      const relevantMemory = await this.findRelevantMemory(domain, goals);
      context.workingMemory = relevantMemory.map(m => m.id);

      const validatedContext = ContextStateSchema.parse(context);
      this.contextHistory.set(sessionId, validatedContext);

      this.emit('contextUpdated', { sessionId, domain, goals: goals?.length || 0 });
      this.logger.debug(`Updated context for session ${sessionId}`);

      return validatedContext;
    } catch (error) {
      this.logger.error('Failed to update context:', error);
      throw error;
    }
  }

  /**
   * Get current context for session
   */
  getContext(sessionId: string): ContextState | undefined {
    return this.contextHistory.get(sessionId);
  }

  /**
   * Get learning model by ID
   */
  getModel(modelId: string): LearningModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  getModels(): LearningModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const accuracy = this.metrics.predictionsTotal > 0 
      ? this.metrics.predictionsCorrect / this.metrics.predictionsTotal 
      : 0;

    return {
      ...this.metrics,
      accuracy,
      memorySize: this.memory.size,
      modelsCount: this.models.size
    };
  }

  /**
   * Update patterns from examples using pattern mining
   */
  private async updatePatternsFromExamples(model: LearningModel): Promise<void> {
    try {
      const successfulExamples = model.examples.filter(e => e.outcome === 'success');
      const patterns = await this.minePatterns(successfulExamples);

      // Add new patterns
      for (const pattern of patterns) {
        const exists = model.patterns.some(p => p.name === pattern.name);
        if (!exists && pattern.confidence >= this.options.confidenceThreshold) {
          model.patterns.push(pattern);
          this.indexPattern(pattern);
          this.metrics.patternsGenerated++;
        }
      }

      // Limit patterns
      if (model.patterns.length > this.options.maxPatterns) {
        // Keep highest confidence patterns
        model.patterns.sort((a, b) => b.confidence - a.confidence);
        model.patterns = model.patterns.slice(0, this.options.maxPatterns);
      }

      model.lastUpdated = new Date();
    } catch (error) {
      this.logger.error('Failed to update patterns:', error);
    }
  }

  /**
   * Mine patterns from successful examples
   */
  private async minePatterns(examples: LearningExample[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const minSupport = Math.max(1, Math.floor(examples.length * this.options.patternMinSupport));

    // Find frequent itemsets in input attributes
    const itemsets = this.findFrequentItemsets(examples, minSupport);

    for (const itemset of itemsets) {
      const supportingExamples = examples.filter(e => this.matchesItemset(e.input, itemset));
      const confidence = supportingExamples.length / examples.length;

      if (confidence >= this.options.confidenceThreshold) {
        const pattern: Pattern = {
          id: uuidv4(),
          name: `Pattern_${itemset.map(item => `${item.attribute}=${item.value}`).join('_')}`,
          description: `Pattern found in ${supportingExamples.length} successful examples`,
          conditions: itemset.map(item => `${item.attribute} = ${item.value}`),
          actions: this.extractCommonActions(supportingExamples),
          confidence,
          examples: supportingExamples.map(e => e.id),
          metadata: {
            support: supportingExamples.length,
            itemset
          }
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Evaluate if a pattern matches given input
   */
  private async evaluatePatternMatch(
    pattern: Pattern,
    input: Record<string, any>,
    context?: Record<string, any>
  ): Promise<PatternMatch> {
    let matchScore = 0;
    let totalConditions = pattern.conditions.length;
    const matchDetails: Record<string, any> = {};

    for (const condition of pattern.conditions) {
      // Simple condition parsing: "attribute = value" or "attribute > value"
      const match = condition.match(/(\w+)\s*(=|>|<|>=|<=)\s*(.+)/);
      if (!match) continue;

      const [, attribute, operator, value] = match;
      const inputValue = input[attribute];

      let conditionMet = false;

      if (inputValue !== undefined) {
        switch (operator) {
          case '=':
            conditionMet = String(inputValue) === value.trim();
            break;
          case '>':
            conditionMet = Number(inputValue) > Number(value);
            break;
          case '<':
            conditionMet = Number(inputValue) < Number(value);
            break;
          case '>=':
            conditionMet = Number(inputValue) >= Number(value);
            break;
          case '<=':
            conditionMet = Number(inputValue) <= Number(value);
            break;
        }
      }

      if (conditionMet) {
        matchScore++;
        matchDetails[attribute] = { matched: true, value: inputValue, condition };
      } else {
        matchDetails[attribute] = { matched: false, value: inputValue, condition };
      }
    }

    const confidence = totalConditions > 0 
      ? (matchScore / totalConditions) * pattern.confidence 
      : 0;

    return {
      pattern,
      confidence,
      matchDetails
    };
  }

  /**
   * Helper methods
   */
  private findFrequentItemsets(
    examples: LearningExample[],
    minSupport: number
  ): Array<Array<{ attribute: string; value: any }>> {
    const itemCounts = new Map<string, number>();
    
    // Count individual items
    for (const example of examples) {
      for (const [attribute, value] of Object.entries(example.input)) {
        const item = `${attribute}=${value}`;
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    // Filter by minimum support
    const frequentItems = Array.from(itemCounts.entries())
      .filter(([, count]) => count >= minSupport)
      .map(([item]) => {
        const [attribute, value] = item.split('=');
        return { attribute, value };
      });

    return [frequentItems]; // Simplified: return only 1-itemsets
  }

  private matchesItemset(
    input: Record<string, any>,
    itemset: Array<{ attribute: string; value: any }>
  ): boolean {
    return itemset.every(item => String(input[item.attribute]) === String(item.value));
  }

  private extractCommonActions(examples: LearningExample[]): string[] {
    // Extract common patterns from outputs
    const actions = new Set<string>();
    
    for (const example of examples) {
      if (example.output && typeof example.output === 'object') {
        for (const [key, value] of Object.entries(example.output)) {
          actions.add(`${key} = ${value}`);
        }
      }
    }

    return Array.from(actions);
  }

  private async aggregatePredictions(
    matches: PatternMatch[],
    input: Record<string, any>
  ): Promise<any> {
    // Simple aggregation: use highest confidence pattern's actions
    if (matches.length === 0) return null;

    const bestMatch = matches[0];
    const prediction: Record<string, any> = {};

    for (const action of bestMatch.pattern.actions) {
      const match = action.match(/(\w+)\s*=\s*(.+)/);
      if (match) {
        const [, key, value] = match;
        prediction[key] = value.trim();
      }
    }

    return prediction;
  }

  private calculatePredictionConfidence(matches: PatternMatch[]): number {
    if (matches.length === 0) return 0;
    
    // Weighted average of match confidences
    let totalWeight = 0;
    let weightedSum = 0;
    
    matches.forEach((match, index) => {
      const weight = 1 / (index + 1); // Exponential decay
      totalWeight += weight;
      weightedSum += match.confidence * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private generatePredictionExplanation(
    matches: PatternMatch[],
    prediction: any
  ): string {
    if (matches.length === 0) return 'No patterns matched the input';
    
    const topPattern = matches[0];
    const matchedConditions = Object.entries(topPattern.matchDetails)
      .filter(([, details]: [string, any]) => details.matched)
      .map(([attr]) => attr);

    return `Prediction based on pattern "${topPattern.pattern.name}" ` +
           `(confidence: ${topPattern.confidence.toFixed(3)}) ` +
           `matching conditions: ${matchedConditions.join(', ')}`;
  }

  private async updatePatternConfidence(patternId: string, wasCorrect: boolean): Promise<void> {
    for (const model of this.models.values()) {
      const pattern = model.patterns.find(p => p.id === patternId);
      if (pattern) {
        // Adjust confidence based on feedback
        const adjustment = wasCorrect ? 0.05 : -0.1;
        pattern.confidence = Math.max(0.1, Math.min(1.0, pattern.confidence + adjustment));
        model.lastUpdated = new Date();
        
        if (this.options.enableAdaptiveLearning) {
          this.metrics.adaptationsPerformed++;
        }
        break;
      }
    }
  }

  private async storeInMemory(item: MemoryItem): Promise<void> {
    const validatedItem = MemoryItemSchema.parse(item);
    
    // Limit memory size
    if (this.memory.size >= this.options.maxMemoryItems) {
      // Remove least important items
      const items = Array.from(this.memory.values());
      items.sort((a, b) => a.importance - b.importance);
      const toRemove = items.slice(0, Math.floor(this.options.maxMemoryItems * 0.1));
      
      for (const itemToRemove of toRemove) {
        this.memory.delete(itemToRemove.id);
      }
    }

    this.memory.set(validatedItem.id, validatedItem);
  }

  private async findRelevantMemory(
    domain?: string,
    goals?: string[]
  ): Promise<MemoryItem[]> {
    const relevant: MemoryItem[] = [];
    
    for (const item of this.memory.values()) {
      let relevance = 0;
      
      // Domain match
      if (domain && item.content.domain === domain) {
        relevance += 0.5;
      }
      
      // Goal match
      if (goals && item.content.goals) {
        const matchingGoals = goals.filter(g => 
          item.content.goals?.includes(g)
        );
        relevance += (matchingGoals.length / goals.length) * 0.3;
      }
      
      // Recency bonus
      const ageHours = (Date.now() - item.lastAccessed.getTime()) / (1000 * 60 * 60);
      const recencyBonus = Math.max(0, 0.2 - (ageHours * 0.01));
      relevance += recencyBonus;
      
      if (relevance > 0.3) {
        item.accessCount++;
        item.lastAccessed = new Date();
        relevant.push(item);
      }
    }
    
    return relevant.sort((a, b) => b.importance - a.importance).slice(0, 10);
  }

  private calculateImportance(example: LearningExample): number {
    let importance = 0.5; // Base importance
    
    // Outcome importance
    if (example.outcome === 'success') importance += 0.3;
    else if (example.outcome === 'failure') importance += 0.2;
    
    // Feedback importance
    if (example.feedback) importance += 0.2;
    
    return Math.min(1.0, importance);
  }

  private indexPattern(pattern: Pattern): void {
    for (const condition of pattern.conditions) {
      if (!this.patternIndex.has(condition)) {
        this.patternIndex.set(condition, new Set());
      }
      this.patternIndex.get(condition)!.add(pattern.id);
    }
  }

  private startMemoryDecay(): void {
    // Run memory decay every hour
    setInterval(() => {
      for (const item of this.memory.values()) {
        item.importance = Math.max(0.1, item.importance * (1 - this.options.memoryDecayRate));
        
        // Remove expired items
        if (item.expires && item.expires < new Date()) {
          this.memory.delete(item.id);
        }
      }
    }, 60 * 60 * 1000);
  }
}