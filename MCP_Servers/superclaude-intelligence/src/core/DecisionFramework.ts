import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  DecisionCriteria,
  DecisionOption,
  DecisionContext,
  DecisionResult,
  DecisionRequest,
  DecisionContextSchema,
  DecisionResultSchema
} from '../types';

export interface DecisionFrameworkOptions {
  defaultMethod?: 'weighted-sum' | 'topsis' | 'ahp' | 'fuzzy';
  confidenceThreshold?: number;
  enableRiskAssessment?: boolean;
  maxOptions?: number;
}

export class DecisionFramework extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<DecisionFrameworkOptions>;
  private decisionHistory: Map<string, DecisionResult> = new Map();
  private contextCache: Map<string, DecisionContext> = new Map();
  private metrics: {
    decisionsTotal: number;
    decisionsSuccessful: number;
    averageConfidence: number;
    methodUsage: Record<string, number>;
  };

  constructor(options: DecisionFrameworkOptions = {}) {
    super();
    this.logger = new Logger('DecisionFramework');
    this.options = {
      defaultMethod: options.defaultMethod ?? 'weighted-sum',
      confidenceThreshold: options.confidenceThreshold ?? 0.6,
      enableRiskAssessment: options.enableRiskAssessment ?? true,
      maxOptions: options.maxOptions ?? 20
    };
    this.metrics = {
      decisionsTotal: 0,
      decisionsSuccessful: 0,
      averageConfidence: 0,
      methodUsage: {}
    };
  }

  /**
   * Create decision context for analysis
   */
  async createDecisionContext(
    problem: string,
    criteria: DecisionCriteria[],
    options: DecisionOption[],
    constraints?: string[],
    stakeholders?: string[],
    timeframe?: string,
    riskTolerance?: 'low' | 'medium' | 'high'
  ): Promise<DecisionContext> {
    try {
      if (options.length > this.options.maxOptions) {
        throw new Error(`Too many options (${options.length}). Maximum allowed: ${this.options.maxOptions}`);
      }

      // Validate criteria weights sum to 1
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        throw new Error(`Criteria weights must sum to 1.0 (current sum: ${totalWeight})`);
      }

      const context: DecisionContext = {
        id: uuidv4(),
        problem,
        criteria,
        options,
        constraints,
        stakeholders,
        timeframe,
        riskTolerance
      };

      const validatedContext = DecisionContextSchema.parse(context);
      this.contextCache.set(validatedContext.id, validatedContext);

      this.emit('contextCreated', { contextId: validatedContext.id, problem });
      this.logger.info(`Created decision context ${validatedContext.id}: ${problem}`);

      return validatedContext;
    } catch (error) {
      this.logger.error('Failed to create decision context:', error);
      throw error;
    }
  }

  /**
   * Make a decision using specified method
   */
  async makeDecision(request: DecisionRequest): Promise<DecisionResult> {
    try {
      const method = request.method || this.options.defaultMethod;
      
      // Create context from request
      const context = await this.createDecisionContext(
        request.problem,
        request.criteria,
        request.options
      );

      let result: DecisionResult;

      switch (method) {
        case 'weighted-sum':
          result = await this.weightedSumMethod(context);
          break;
        case 'topsis':
          result = await this.topsisMethod(context);
          break;
        case 'ahp':
          result = await this.ahpMethod(context);
          break;
        case 'fuzzy':
          result = await this.fuzzyMethod(context);
          break;
        default:
          throw new Error(`Unknown decision method: ${method}`);
      }

      // Add risk assessment if enabled
      if (this.options.enableRiskAssessment) {
        result.riskAssessment = await this.assessRisk(context, result);
      }

      // Validate and store result
      const validatedResult = DecisionResultSchema.parse(result);
      this.decisionHistory.set(validatedResult.id, validatedResult);

      // Update metrics
      this.updateMetrics(method, validatedResult.confidence);

      this.emit('decisionMade', {
        resultId: validatedResult.id,
        contextId: context.id,
        selectedOption: validatedResult.selectedOption,
        confidence: validatedResult.confidence,
        method
      });

      this.logger.info(`Decision made for context ${context.id}: ${validatedResult.selectedOption} (confidence: ${validatedResult.confidence})`);

      return validatedResult;
    } catch (error) {
      this.logger.error('Failed to make decision:', error);
      throw error;
    }
  }

  /**
   * Weighted Sum decision method
   */
  private async weightedSumMethod(context: DecisionContext): Promise<DecisionResult> {
    const scores: Array<{ optionId: string; score: number; breakdown: Record<string, number> }> = [];

    for (const option of context.options) {
      let totalScore = 0;
      const breakdown: Record<string, number> = {};

      for (const criteria of context.criteria) {
        const criteriaScore = option.scores[criteria.id] || 0;
        const weightedScore = criteriaScore * criteria.weight;
        totalScore += weightedScore;
        breakdown[criteria.name] = weightedScore;
      }

      scores.push({
        optionId: option.id,
        score: totalScore,
        breakdown
      });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const bestOption = scores[0];
    const confidence = this.calculateConfidence(scores);

    return {
      id: uuidv4(),
      contextId: context.id,
      selectedOption: bestOption.optionId,
      confidence,
      rationale: `Weighted sum analysis selected option with score ${bestOption.score.toFixed(3)}. Top criteria contributions: ${Object.entries(bestOption.breakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, score]) => `${name}: ${score.toFixed(3)}`)
        .join(', ')}`,
      alternativeOptions: scores.slice(1, 4).map(s => s.optionId),
      timestamp: new Date()
    };
  }

  /**
   * TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) method
   */
  private async topsisMethod(context: DecisionContext): Promise<DecisionResult> {
    const matrix: number[][] = [];
    
    // Build decision matrix
    for (const option of context.options) {
      const row: number[] = [];
      for (const criteria of context.criteria) {
        row.push(option.scores[criteria.id] || 0);
      }
      matrix.push(row);
    }

    // Normalize matrix
    const normalizedMatrix = this.normalizeMatrix(matrix);
    
    // Weight normalized matrix
    const weightedMatrix = normalizedMatrix.map(row =>
      row.map((value, colIndex) => value * context.criteria[colIndex].weight)
    );

    // Find ideal and anti-ideal solutions
    const idealSolution: number[] = [];
    const antiIdealSolution: number[] = [];
    
    for (let col = 0; col < context.criteria.length; col++) {
      const column = weightedMatrix.map(row => row[col]);
      idealSolution.push(Math.max(...column));
      antiIdealSolution.push(Math.min(...column));
    }

    // Calculate distances and relative closeness
    const results: Array<{ optionId: string; closeness: number }> = [];
    
    for (let row = 0; row < weightedMatrix.length; row++) {
      const distanceToIdeal = this.euclideanDistance(weightedMatrix[row], idealSolution);
      const distanceToAntiIdeal = this.euclideanDistance(weightedMatrix[row], antiIdealSolution);
      
      const closeness = distanceToAntiIdeal / (distanceToIdeal + distanceToAntiIdeal);
      
      results.push({
        optionId: context.options[row].id,
        closeness
      });
    }

    // Sort by closeness descending
    results.sort((a, b) => b.closeness - a.closeness);

    const bestOption = results[0];
    const confidence = Math.min(bestOption.closeness + 0.1, 1.0); // TOPSIS provides good confidence

    return {
      id: uuidv4(),
      contextId: context.id,
      selectedOption: bestOption.optionId,
      confidence,
      rationale: `TOPSIS analysis selected option with relative closeness ${bestOption.closeness.toFixed(3)} to ideal solution`,
      alternativeOptions: results.slice(1, 4).map(r => r.optionId),
      timestamp: new Date()
    };
  }

  /**
   * AHP (Analytic Hierarchy Process) method - simplified version
   */
  private async ahpMethod(context: DecisionContext): Promise<DecisionResult> {
    // For this implementation, we'll use a simplified AHP approach
    // In a full implementation, this would include pairwise comparison matrices
    
    const priorityScores: Array<{ optionId: string; score: number }> = [];

    for (const option of context.options) {
      let score = 0;
      
      // Calculate geometric mean of scores weighted by criteria importance
      let product = 1;
      let totalWeight = 0;
      
      for (const criteria of context.criteria) {
        const criteriaScore = Math.max(option.scores[criteria.id] || 0, 0.01); // Avoid zero
        product *= Math.pow(criteriaScore, criteria.weight);
        totalWeight += criteria.weight;
      }
      
      score = Math.pow(product, 1 / totalWeight);
      
      priorityScores.push({
        optionId: option.id,
        score
      });
    }

    // Sort by score descending
    priorityScores.sort((a, b) => b.score - a.score);

    const bestOption = priorityScores[0];
    const confidence = this.calculateConfidenceFromScores(priorityScores.map(p => p.score));

    return {
      id: uuidv4(),
      contextId: context.id,
      selectedOption: bestOption.optionId,
      confidence,
      rationale: `AHP analysis selected option with priority score ${bestOption.score.toFixed(3)}`,
      alternativeOptions: priorityScores.slice(1, 4).map(p => p.optionId),
      timestamp: new Date()
    };
  }

  /**
   * Fuzzy decision method
   */
  private async fuzzyMethod(context: DecisionContext): Promise<DecisionResult> {
    const fuzzyScores: Array<{ optionId: string; score: number; uncertainty: number }> = [];

    for (const option of context.options) {
      let totalScore = 0;
      let totalUncertainty = 0;
      
      for (const criteria of context.criteria) {
        const score = option.scores[criteria.id] || 0;
        
        // Apply fuzzy logic - add uncertainty based on criteria type
        let uncertainty = 0.1; // Base uncertainty
        if (criteria.type === 'fuzzy') uncertainty = 0.3;
        else if (criteria.type === 'categorical') uncertainty = 0.2;
        
        const fuzzyScore = score * (1 - uncertainty * 0.5); // Reduce score by uncertainty
        totalScore += fuzzyScore * criteria.weight;
        totalUncertainty += uncertainty * criteria.weight;
      }

      fuzzyScores.push({
        optionId: option.id,
        score: totalScore,
        uncertainty: totalUncertainty
      });
    }

    // Sort by score adjusted for uncertainty
    fuzzyScores.sort((a, b) => (b.score - b.uncertainty) - (a.score - a.uncertainty));

    const bestOption = fuzzyScores[0];
    const confidence = Math.max(0.1, bestOption.score - bestOption.uncertainty);

    return {
      id: uuidv4(),
      contextId: context.id,
      selectedOption: bestOption.optionId,
      confidence,
      rationale: `Fuzzy analysis selected option with adjusted score ${(bestOption.score - bestOption.uncertainty).toFixed(3)} (uncertainty: ${bestOption.uncertainty.toFixed(3)})`,
      alternativeOptions: fuzzyScores.slice(1, 4).map(f => f.optionId),
      timestamp: new Date()
    };
  }

  /**
   * Assess risk for a decision
   */
  private async assessRisk(context: DecisionContext, result: DecisionResult): Promise<string> {
    const selectedOption = context.options.find(o => o.id === result.selectedOption);
    if (!selectedOption) return 'Unknown risk - option not found';

    const riskFactors: string[] = [];

    // Confidence-based risk
    if (result.confidence < 0.5) {
      riskFactors.push('Low decision confidence');
    }

    // Option score variability risk
    const scores = Object.values(selectedOption.scores);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    
    if (variance > 0.3) {
      riskFactors.push('High variability in criteria scores');
    }

    // Constraint risk
    if (context.constraints && context.constraints.length > 0) {
      riskFactors.push('Multiple constraints may limit flexibility');
    }

    // Time pressure risk
    if (context.timeframe?.includes('urgent') || context.timeframe?.includes('immediate')) {
      riskFactors.push('Time pressure may limit thorough evaluation');
    }

    // Risk tolerance mismatch
    if (context.riskTolerance === 'low' && result.confidence < 0.8) {
      riskFactors.push('Low risk tolerance conflicts with decision uncertainty');
    }

    if (riskFactors.length === 0) {
      return 'Low risk - decision meets quality thresholds';
    }

    return `Medium to high risk: ${riskFactors.join('; ')}`;
  }

  /**
   * Get decision by ID
   */
  getDecision(decisionId: string): DecisionResult | undefined {
    return this.decisionHistory.get(decisionId);
  }

  /**
   * Get decision context by ID
   */
  getContext(contextId: string): DecisionContext | undefined {
    return this.contextCache.get(contextId);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Helper methods
   */
  private normalizeMatrix(matrix: number[][]): number[][] {
    const normalized: number[][] = [];
    
    // Calculate column sums for normalization
    const columnSums: number[] = new Array(matrix[0].length).fill(0);
    for (const row of matrix) {
      for (let col = 0; col < row.length; col++) {
        columnSums[col] += Math.pow(row[col], 2);
      }
    }
    
    // Normalize each element
    for (const row of matrix) {
      const normalizedRow: number[] = [];
      for (let col = 0; col < row.length; col++) {
        const sqrtSum = Math.sqrt(columnSums[col]);
        normalizedRow.push(sqrtSum > 0 ? row[col] / sqrtSum : 0);
      }
      normalized.push(normalizedRow);
    }
    
    return normalized;
  }

  private euclideanDistance(vector1: number[], vector2: number[]): number {
    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.pow(vector1[i] - vector2[i], 2);
    }
    return Math.sqrt(sum);
  }

  private calculateConfidence(scores: Array<{ score: number }>): number {
    if (scores.length < 2) return 0.5;
    
    const sortedScores = scores.map(s => s.score).sort((a, b) => b - a);
    const topScore = sortedScores[0];
    const secondScore = sortedScores[1];
    
    // Confidence based on gap between top two options
    const gap = topScore - secondScore;
    const maxPossibleGap = topScore; // Assuming scores are normalized
    
    return Math.min(0.5 + (gap / maxPossibleGap) * 0.5, 1.0);
  }

  private calculateConfidenceFromScores(scores: number[]): number {
    if (scores.length < 2) return 0.5;
    
    const sortedScores = scores.sort((a, b) => b - a);
    const gap = sortedScores[0] - sortedScores[1];
    const maxScore = Math.max(...scores);
    
    return Math.min(0.5 + (gap / maxScore) * 0.5, 1.0);
  }

  private updateMetrics(method: string, confidence: number): void {
    this.metrics.decisionsTotal++;
    if (confidence >= this.options.confidenceThreshold) {
      this.metrics.decisionsSuccessful++;
    }
    
    // Update average confidence
    this.metrics.averageConfidence = (
      (this.metrics.averageConfidence * (this.metrics.decisionsTotal - 1) + confidence) /
      this.metrics.decisionsTotal
    );
    
    // Update method usage
    this.metrics.methodUsage[method] = (this.metrics.methodUsage[method] || 0) + 1;
  }
}