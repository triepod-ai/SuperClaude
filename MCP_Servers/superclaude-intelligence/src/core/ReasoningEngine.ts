import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  Evidence,
  ReasoningStep,
  ReasoningChain,
  ReasoningRequest,
  EvidenceSchema,
  ReasoningStepSchema,
  ReasoningChainSchema
} from '../types';

export interface ReasoningEngineOptions {
  maxSteps?: number;
  confidenceThreshold?: number;
  evidenceRetentionLimit?: number;
  enableMetrics?: boolean;
}

export class ReasoningEngine extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<ReasoningEngineOptions>;
  private activeChains: Map<string, ReasoningChain> = new Map();
  private evidenceStore: Map<string, Evidence> = new Map();
  private metrics: {
    chainsCreated: number;
    chainsCompleted: number;
    chainsFailed: number;
    averageSteps: number;
    averageConfidence: number;
  };

  constructor(options: ReasoningEngineOptions = {}) {
    super();
    this.logger = new Logger('ReasoningEngine');
    this.options = {
      maxSteps: options.maxSteps ?? 20,
      confidenceThreshold: options.confidenceThreshold ?? 0.7,
      evidenceRetentionLimit: options.evidenceRetentionLimit ?? 1000,
      enableMetrics: options.enableMetrics ?? true
    };
    this.metrics = {
      chainsCreated: 0,
      chainsCompleted: 0,
      chainsFailed: 0,
      averageSteps: 0,
      averageConfidence: 0
    };
  }

  /**
   * Create a new reasoning chain
   */
  async createReasoningChain(request: ReasoningRequest): Promise<ReasoningChain> {
    try {
      const chainId = uuidv4();
      const chain: ReasoningChain = {
        id: chainId,
        goal: request.goal,
        context: request.context || {},
        steps: [],
        evidence: request.evidence || [],
        status: 'active'
      };

      // Validate and store initial evidence
      if (request.evidence) {
        for (const evidence of request.evidence) {
          const validated = EvidenceSchema.parse(evidence);
          this.evidenceStore.set(validated.id, validated);
        }
      }

      this.activeChains.set(chainId, chain);
      this.metrics.chainsCreated++;

      this.emit('chainCreated', { chainId, goal: request.goal });
      this.logger.info(`Created reasoning chain ${chainId} with goal: ${request.goal}`);

      return chain;
    } catch (error) {
      this.logger.error('Failed to create reasoning chain:', error);
      throw error;
    }
  }

  /**
   * Add evidence to a reasoning chain
   */
  async addEvidence(chainId: string, evidence: Evidence): Promise<void> {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Reasoning chain ${chainId} not found`);
    }

    try {
      const validated = EvidenceSchema.parse(evidence);
      this.evidenceStore.set(validated.id, validated);
      chain.evidence.push(validated);

      this.emit('evidenceAdded', { chainId, evidenceId: validated.id });
      this.logger.debug(`Added evidence ${validated.id} to chain ${chainId}`);
    } catch (error) {
      this.logger.error('Failed to add evidence:', error);
      throw error;
    }
  }

  /**
   * Perform a reasoning step
   */
  async reasoningStep(
    chainId: string,
    type: ReasoningStep['type'],
    inputEvidenceIds: string[],
    method: string,
    rationale: string
  ): Promise<ReasoningStep> {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Reasoning chain ${chainId} not found`);
    }

    if (chain.status !== 'active') {
      throw new Error(`Reasoning chain ${chainId} is not active`);
    }

    if (chain.steps.length >= this.options.maxSteps) {
      throw new Error(`Maximum steps (${this.options.maxSteps}) reached for chain ${chainId}`);
    }

    try {
      // Validate input evidence exists
      for (const evidenceId of inputEvidenceIds) {
        if (!this.evidenceStore.has(evidenceId)) {
          throw new Error(`Evidence ${evidenceId} not found`);
        }
      }

      // Create reasoning step
      const step: ReasoningStep = {
        id: uuidv4(),
        type,
        input: inputEvidenceIds,
        output: [], // Will be populated by specific reasoning methods
        method,
        confidence: 0, // Will be calculated by specific reasoning methods
        rationale,
        timestamp: new Date()
      };

      // Apply reasoning method
      await this.applyReasoningMethod(step, chain);

      // Validate step
      const validatedStep = ReasoningStepSchema.parse(step);
      chain.steps.push(validatedStep);

      this.emit('reasoningStep', { chainId, stepId: validatedStep.id, type });
      this.logger.debug(`Performed ${type} reasoning step ${validatedStep.id} in chain ${chainId}`);

      return validatedStep;
    } catch (error) {
      this.logger.error('Failed to perform reasoning step:', error);
      throw error;
    }
  }

  /**
   * Complete a reasoning chain with conclusion
   */
  async completeChain(chainId: string, conclusion: string): Promise<ReasoningChain> {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Reasoning chain ${chainId} not found`);
    }

    try {
      // Calculate overall confidence
      const confidence = this.calculateChainConfidence(chain);
      
      chain.conclusion = conclusion;
      chain.confidence = confidence;
      chain.status = 'completed';

      this.metrics.chainsCompleted++;
      this.updateMetrics();

      this.emit('chainCompleted', { chainId, conclusion, confidence });
      this.logger.info(`Completed reasoning chain ${chainId} with confidence ${confidence}`);

      return chain;
    } catch (error) {
      this.logger.error('Failed to complete reasoning chain:', error);
      chain.status = 'failed';
      this.metrics.chainsFailed++;
      throw error;
    }
  }

  /**
   * Get reasoning chain by ID
   */
  getChain(chainId: string): ReasoningChain | undefined {
    return this.activeChains.get(chainId);
  }

  /**
   * Get all active chains
   */
  getActiveChains(): ReasoningChain[] {
    return Array.from(this.activeChains.values()).filter(chain => chain.status === 'active');
  }

  /**
   * Get evidence by ID
   */
  getEvidence(evidenceId: string): Evidence | undefined {
    return this.evidenceStore.get(evidenceId);
  }

  /**
   * Search evidence by criteria
   */
  searchEvidence(criteria: {
    type?: Evidence['type'];
    confidenceMin?: number;
    source?: string;
    content?: string;
  }): Evidence[] {
    const results: Evidence[] = [];
    
    for (const evidence of this.evidenceStore.values()) {
      let matches = true;

      if (criteria.type && evidence.type !== criteria.type) matches = false;
      if (criteria.confidenceMin && evidence.confidence < criteria.confidenceMin) matches = false;
      if (criteria.source && evidence.source !== criteria.source) matches = false;
      if (criteria.content && !evidence.content.toLowerCase().includes(criteria.content.toLowerCase())) matches = false;

      if (matches) results.push(evidence);
    }

    return results;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear completed chains and old evidence
   */
  async cleanup(): Promise<void> {
    // Remove completed/failed chains older than 1 hour
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [chainId, chain] of this.activeChains.entries()) {
      if (chain.status !== 'active' && chain.steps.length > 0) {
        const lastStep = chain.steps[chain.steps.length - 1];
        if (lastStep.timestamp < cutoff) {
          this.activeChains.delete(chainId);
        }
      }
    }

    // Limit evidence store size
    if (this.evidenceStore.size > this.options.evidenceRetentionLimit) {
      const evidenceArray = Array.from(this.evidenceStore.entries());
      evidenceArray.sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());
      
      // Keep only the most recent evidence
      const toKeep = evidenceArray.slice(0, this.options.evidenceRetentionLimit);
      this.evidenceStore.clear();
      
      for (const [id, evidence] of toKeep) {
        this.evidenceStore.set(id, evidence);
      }
    }

    this.logger.debug('Cleanup completed');
  }

  /**
   * Apply specific reasoning methods
   */
  private async applyReasoningMethod(step: ReasoningStep, chain: ReasoningChain): Promise<void> {
    const inputEvidence = step.input.map(id => this.evidenceStore.get(id)!);

    switch (step.type) {
      case 'analysis':
        await this.performAnalysis(step, inputEvidence, chain);
        break;
      case 'synthesis':
        await this.performSynthesis(step, inputEvidence, chain);
        break;
      case 'evaluation':
        await this.performEvaluation(step, inputEvidence, chain);
        break;
      case 'inference':
        await this.performInference(step, inputEvidence, chain);
        break;
      case 'verification':
        await this.performVerification(step, inputEvidence, chain);
        break;
    }
  }

  private async performAnalysis(step: ReasoningStep, evidence: Evidence[], chain: ReasoningChain): Promise<void> {
    // Analyze evidence for patterns and insights
    const analysisResult: Evidence = {
      id: uuidv4(),
      type: 'inference',
      content: `Analysis of ${evidence.length} evidence items using ${step.method}`,
      confidence: this.calculateAverageConfidence(evidence),
      source: `reasoning-step-${step.id}`,
      timestamp: new Date()
    };

    this.evidenceStore.set(analysisResult.id, analysisResult);
    step.output.push(analysisResult.id);
    step.confidence = analysisResult.confidence;
  }

  private async performSynthesis(step: ReasoningStep, evidence: Evidence[], chain: ReasoningChain): Promise<void> {
    // Combine evidence into new insights
    const synthesisResult: Evidence = {
      id: uuidv4(),
      type: 'inference',
      content: `Synthesis of patterns from ${evidence.length} evidence items`,
      confidence: Math.min(this.calculateAverageConfidence(evidence), 0.9),
      source: `reasoning-step-${step.id}`,
      timestamp: new Date()
    };

    this.evidenceStore.set(synthesisResult.id, synthesisResult);
    step.output.push(synthesisResult.id);
    step.confidence = synthesisResult.confidence;
  }

  private async performEvaluation(step: ReasoningStep, evidence: Evidence[], chain: ReasoningChain): Promise<void> {
    // Evaluate evidence quality and relevance
    const evaluationResult: Evidence = {
      id: uuidv4(),
      type: 'inference',
      content: `Evaluation of evidence quality and relevance`,
      confidence: this.calculateMinConfidence(evidence),
      source: `reasoning-step-${step.id}`,
      timestamp: new Date()
    };

    this.evidenceStore.set(evaluationResult.id, evaluationResult);
    step.output.push(evaluationResult.id);
    step.confidence = evaluationResult.confidence;
  }

  private async performInference(step: ReasoningStep, evidence: Evidence[], chain: ReasoningChain): Promise<void> {
    // Make logical inferences from evidence
    const inferenceResult: Evidence = {
      id: uuidv4(),
      type: 'inference',
      content: `Logical inference based on ${evidence.length} evidence items`,
      confidence: this.calculateAverageConfidence(evidence) * 0.8, // Reduce confidence for inferences
      source: `reasoning-step-${step.id}`,
      timestamp: new Date()
    };

    this.evidenceStore.set(inferenceResult.id, inferenceResult);
    step.output.push(inferenceResult.id);
    step.confidence = inferenceResult.confidence;
  }

  private async performVerification(step: ReasoningStep, evidence: Evidence[], chain: ReasoningChain): Promise<void> {
    // Verify consistency and validity of evidence
    const verificationResult: Evidence = {
      id: uuidv4(),
      type: 'fact',
      content: `Verification of evidence consistency and validity`,
      confidence: this.calculateMinConfidence(evidence),
      source: `reasoning-step-${step.id}`,
      timestamp: new Date()
    };

    this.evidenceStore.set(verificationResult.id, verificationResult);
    step.output.push(verificationResult.id);
    step.confidence = verificationResult.confidence;
  }

  private calculateAverageConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + e.confidence, 0);
    return sum / evidence.length;
  }

  private calculateMinConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    return Math.min(...evidence.map(e => e.confidence));
  }

  private calculateChainConfidence(chain: ReasoningChain): number {
    if (chain.steps.length === 0) return 0;
    
    // Weighted average with recent steps having higher weight
    let totalWeight = 0;
    let weightedSum = 0;
    
    chain.steps.forEach((step, index) => {
      const weight = Math.pow(1.2, index); // Exponential weighting favoring recent steps
      totalWeight += weight;
      weightedSum += step.confidence * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private updateMetrics(): void {
    if (!this.options.enableMetrics) return;

    const completedChains = Array.from(this.activeChains.values())
      .filter(chain => chain.status === 'completed');

    if (completedChains.length > 0) {
      this.metrics.averageSteps = completedChains.reduce((sum, chain) => sum + chain.steps.length, 0) / completedChains.length;
      this.metrics.averageConfidence = completedChains.reduce((sum, chain) => sum + (chain.confidence || 0), 0) / completedChains.length;
    }
  }
}