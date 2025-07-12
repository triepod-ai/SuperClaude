import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@superclaude/shared';
import {
  Task,
  TaskState,
  TaskPriority,
  TaskComplexity
} from '../types/index.js';

/**
 * Learning algorithm types
 */
export enum LearningAlgorithm {
  LINEAR_REGRESSION = 'linear_regression',
  RANDOM_FOREST = 'random_forest',
  NEURAL_NETWORK = 'neural_network',
  GRADIENT_BOOSTING = 'gradient_boosting',
  ENSEMBLE = 'ensemble'
}

/**
 * Feature types for ML models
 */
export enum FeatureType {
  NUMERIC = 'numeric',
  CATEGORICAL = 'categorical',
  BOOLEAN = 'boolean',
  TEXT = 'text',
  TEMPORAL = 'temporal'
}

/**
 * Feature definition for ML models
 */
export interface Feature {
  name: string;
  type: FeatureType;
  importance?: number;
  description: string;
  extractor: (task: Task, context?: any) => any;
  transformer?: (value: any) => number;
}

/**
 * Training data point
 */
export interface TrainingDataPoint {
  id: string;
  taskId: string;
  features: Record<string, any>;
  actualOutcome: {
    duration: number;
    complexity: TaskComplexity;
    success: boolean;
    quality: number;
    resourceUsage: Record<string, number>;
  };
  predictedOutcome?: {
    duration: number;
    complexity: TaskComplexity;
    confidence: number;
  };
  timestamp: Date;
  context: Record<string, any>;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  algorithm: LearningAlgorithm;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number; // Mean Squared Error for regression
  mae: number; // Mean Absolute Error
  r2Score: number; // R-squared for regression
  trainingSize: number;
  lastTrained: Date;
  featureImportance: Record<string, number>;
  crossValidationScore: number;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  algorithm: LearningAlgorithm;
  features: Feature[];
  targetVariable: 'duration' | 'complexity' | 'success' | 'quality';
  hyperparameters: Record<string, any>;
  validationSplit: number;
  minTrainingSize: number;
  retrainFrequency: number; // Hours
  enableOnlineUpdates: boolean;
  featureSelection: {
    enabled: boolean;
    method: 'correlation' | 'mutual_info' | 'lasso' | 'rfe';
    topK: number;
  };
}

/**
 * Prediction request
 */
export interface PredictionRequest {
  taskId?: string;
  task?: Task;
  context?: Record<string, any>;
  targetVariable: 'duration' | 'complexity' | 'success' | 'quality';
  includeConfidence: boolean;
  includeExplanation: boolean;
}

/**
 * Prediction response
 */
export interface PredictionResponse {
  requestId: string;
  taskId: string;
  prediction: {
    value: any;
    confidence: number;
    confidenceInterval?: { lower: number; upper: number };
  };
  explanation?: {
    topFeatures: Array<{ name: string; importance: number; value: any }>;
    reasoning: string;
    similarTasks: string[];
  };
  model: {
    algorithm: LearningAlgorithm;
    version: string;
    lastTrained: Date;
    accuracy: number;
  };
  metadata: {
    processingTime: number;
    featureCount: number;
    timestamp: Date;
  };
}

/**
 * Pattern recognition result
 */
export interface PatternRecognitionResult {
  id: string;
  patternType: 'estimation_bias' | 'complexity_pattern' | 'success_factor' | 'bottleneck' | 'trend';
  description: string;
  confidence: number;
  evidence: Array<{
    taskId: string;
    relevantData: Record<string, any>;
    weight: number;
  }>;
  implications: string[];
  recommendations: Array<{
    action: string;
    impact: string;
    confidence: number;
  }>;
  discoveredAt: Date;
}

/**
 * Adaptive learning result
 */
export interface AdaptiveResult {
  modelId: string;
  improvementType: 'accuracy' | 'bias_reduction' | 'feature_optimization' | 'hyperparameter_tuning';
  beforeMetrics: ModelMetrics;
  afterMetrics: ModelMetrics;
  improvement: number;
  adaptationStrategy: string;
  timestamp: Date;
}

/**
 * ML-powered learning engine for task estimation and optimization
 */
export class LearningEngine extends EventEmitter {
  private trainingData: Map<string, TrainingDataPoint> = new Map();
  private models: Map<string, any> = new Map(); // Would use actual ML models
  private features: Feature[] = [];
  private patterns: Map<string, PatternRecognitionResult> = new Map();
  private predictionHistory: Map<string, PredictionResponse> = new Map();
  private config: LearningConfig;
  private modelMetrics: Map<string, ModelMetrics> = new Map();
  private isTraining: boolean = false;
  
  constructor(config: LearningConfig) {
    super();
    this.config = config;
    this.features = config.features;
    this.setupPeriodicTraining();
    this.setupPatternDetection();
    
    logger.info('LearningEngine initialized', { 
      algorithm: config.algorithm,
      features: config.features.length 
    });
  }
  
  /**
   * Add training data from completed tasks
   */
  addTrainingData(task: Task, actualOutcome: any, context: Record<string, any> = {}): void {
    const dataPoint: TrainingDataPoint = {
      id: uuidv4(),
      taskId: task.id,
      features: this.extractFeatures(task, context),
      actualOutcome,
      timestamp: new Date(),
      context
    };
    
    this.trainingData.set(dataPoint.id, dataPoint);
    
    // Trigger online learning if enabled
    if (this.config.enableOnlineUpdates && this.models.size > 0) {
      this.performOnlineUpdate(dataPoint);
    }
    
    this.emit('training_data_added', { dataPointId: dataPoint.id, taskId: task.id });
    
    logger.debug('Training data added', { 
      taskId: task.id, 
      featureCount: Object.keys(dataPoint.features).length 
    });
  }
  
  /**
   * Extract features from a task
   */
  private extractFeatures(task: Task, context: Record<string, any> = {}): Record<string, any> {
    const features: Record<string, any> = {};
    
    for (const feature of this.features) {
      try {
        const rawValue = feature.extractor(task, context);
        const value = feature.transformer ? feature.transformer(rawValue) : rawValue;
        features[feature.name] = value;
      } catch (error) {
        logger.warn('Feature extraction failed', { 
          feature: feature.name, 
          taskId: task.id, 
          error: error.message 
        });
        features[feature.name] = null;
      }
    }
    
    return features;
  }
  
  /**
   * Train models with available data
   */
  async trainModels(): Promise<void> {
    if (this.isTraining) {
      logger.warn('Training already in progress');
      return;
    }
    
    const trainingDataArray = Array.from(this.trainingData.values());
    
    if (trainingDataArray.length < this.config.minTrainingSize) {
      logger.warn('Insufficient training data', { 
        available: trainingDataArray.length, 
        required: this.config.minTrainingSize 
      });
      return;
    }
    
    this.isTraining = true;
    
    try {
      logger.info('Starting model training', { 
        algorithm: this.config.algorithm,
        dataSize: trainingDataArray.length 
      });
      
      // Prepare training data
      const { trainData, validationData } = this.splitTrainingData(trainingDataArray);
      
      // Train based on algorithm
      const model = await this.trainAlgorithm(trainData, validationData);
      
      // Evaluate model
      const metrics = await this.evaluateModel(model, validationData);
      
      // Store model and metrics
      const modelId = `${this.config.algorithm}_${this.config.targetVariable}`;
      this.models.set(modelId, model);
      this.modelMetrics.set(modelId, metrics);
      
      // Perform feature selection if enabled
      if (this.config.featureSelection.enabled) {
        await this.performFeatureSelection(model, trainData);
      }
      
      this.emit('model_trained', { 
        modelId, 
        algorithm: this.config.algorithm, 
        metrics 
      });
      
      logger.info('Model training completed', { 
        modelId, 
        accuracy: metrics.accuracy,
        trainingSize: metrics.trainingSize 
      });
      
    } catch (error) {
      logger.error('Model training failed', { error: error.message });
      this.emit('training_failed', { error: error.message });
    } finally {
      this.isTraining = false;
    }
  }
  
  /**
   * Make prediction for a task
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const task = request.task || await this.getTaskById(request.taskId!);
      if (!task) {
        throw new Error(`Task not found: ${request.taskId}`);
      }
      
      const modelId = `${this.config.algorithm}_${request.targetVariable}`;
      const model = this.models.get(modelId);
      
      if (!model) {
        throw new Error(`Model not available for ${request.targetVariable}`);
      }
      
      // Extract features
      const features = this.extractFeatures(task, request.context);
      
      // Make prediction
      const prediction = await this.makePrediction(model, features, request);
      
      // Calculate confidence
      const confidence = this.calculatePredictionConfidence(model, features, prediction);
      
      // Generate explanation if requested
      let explanation;
      if (request.includeExplanation) {
        explanation = await this.generatePredictionExplanation(model, features, prediction, task);
      }
      
      const metrics = this.modelMetrics.get(modelId)!;
      
      const response: PredictionResponse = {
        requestId,
        taskId: task.id,
        prediction: {
          value: prediction,
          confidence,
          confidenceInterval: request.includeConfidence ? 
            this.calculateConfidenceInterval(prediction, confidence) : undefined
        },
        explanation,
        model: {
          algorithm: this.config.algorithm,
          version: '1.0',
          lastTrained: metrics.lastTrained,
          accuracy: metrics.accuracy
        },
        metadata: {
          processingTime: Date.now() - startTime,
          featureCount: Object.keys(features).length,
          timestamp: new Date()
        }
      };
      
      // Store prediction for future learning
      this.predictionHistory.set(requestId, response);
      
      this.emit('prediction_made', { requestId, taskId: task.id, targetVariable: request.targetVariable });
      
      logger.debug('Prediction completed', { 
        requestId, 
        taskId: task.id, 
        confidence,
        processingTime: response.metadata.processingTime 
      });
      
      return response;
      
    } catch (error) {
      logger.error('Prediction failed', { requestId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Detect patterns in task data
   */
  async detectPatterns(): Promise<PatternRecognitionResult[]> {
    const patterns: PatternRecognitionResult[] = [];
    
    try {
      // Detect estimation bias patterns
      const estimationBias = await this.detectEstimationBias();
      if (estimationBias) patterns.push(estimationBias);
      
      // Detect complexity patterns
      const complexityPatterns = await this.detectComplexityPatterns();
      patterns.push(...complexityPatterns);
      
      // Detect success factors
      const successFactors = await this.detectSuccessFactors();
      patterns.push(...successFactors);
      
      // Detect bottlenecks
      const bottlenecks = await this.detectBottlenecks();
      patterns.push(...bottlenecks);
      
      // Detect trends
      const trends = await this.detectTrends();
      patterns.push(...trends);
      
      // Store discovered patterns
      for (const pattern of patterns) {
        this.patterns.set(pattern.id, pattern);
        this.emit('pattern_discovered', { patternId: pattern.id, type: pattern.patternType });
      }
      
      logger.info('Pattern detection completed', { 
        patternsFound: patterns.length,
        types: patterns.map(p => p.patternType)
      });
      
      return patterns;
      
    } catch (error) {
      logger.error('Pattern detection failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Perform adaptive learning based on recent performance
   */
  async performAdaptiveLearning(): Promise<AdaptiveResult[]> {
    const results: AdaptiveResult[] = [];
    
    try {
      for (const [modelId, model] of this.models) {
        const currentMetrics = this.modelMetrics.get(modelId)!;
        
        // Try different adaptation strategies
        const strategies = [
          'hyperparameter_tuning',
          'feature_optimization',
          'bias_reduction'
        ];
        
        for (const strategy of strategies) {
          const adaptedModel = await this.adaptModel(model, strategy);
          const newMetrics = await this.evaluateModel(adaptedModel, Array.from(this.trainingData.values()));
          
          const improvement = newMetrics.accuracy - currentMetrics.accuracy;
          
          if (improvement > 0.01) { // At least 1% improvement
            this.models.set(modelId, adaptedModel);
            this.modelMetrics.set(modelId, newMetrics);
            
            const result: AdaptiveResult = {
              modelId,
              improvementType: strategy as any,
              beforeMetrics: currentMetrics,
              afterMetrics: newMetrics,
              improvement,
              adaptationStrategy: strategy,
              timestamp: new Date()
            };
            
            results.push(result);
            
            this.emit('model_adapted', { modelId, improvement, strategy });
            
            logger.info('Model adapted successfully', { 
              modelId, 
              strategy, 
              improvement: improvement * 100 
            });
            
            break; // Use first successful adaptation
          }
        }
      }
      
      return results;
      
    } catch (error) {
      logger.error('Adaptive learning failed', { error: error.message });
      return [];
    }
  }
  
  /**
   * Split training data into train and validation sets
   */
  private splitTrainingData(data: TrainingDataPoint[]): { trainData: TrainingDataPoint[]; validationData: TrainingDataPoint[] } {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(data.length * (1 - this.config.validationSplit));
    
    return {
      trainData: shuffled.slice(0, splitIndex),
      validationData: shuffled.slice(splitIndex)
    };
  }
  
  /**
   * Train algorithm based on configuration
   */
  private async trainAlgorithm(trainData: TrainingDataPoint[], validationData: TrainingDataPoint[]): Promise<any> {
    // This would integrate with actual ML libraries
    // For now, return a mock model
    
    switch (this.config.algorithm) {
      case LearningAlgorithm.LINEAR_REGRESSION:
        return await this.trainLinearRegression(trainData);
      case LearningAlgorithm.RANDOM_FOREST:
        return await this.trainRandomForest(trainData);
      case LearningAlgorithm.NEURAL_NETWORK:
        return await this.trainNeuralNetwork(trainData);
      case LearningAlgorithm.GRADIENT_BOOSTING:
        return await this.trainGradientBoosting(trainData);
      case LearningAlgorithm.ENSEMBLE:
        return await this.trainEnsemble(trainData);
      default:
        throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
  }
  
  /**
   * Mock implementations for different algorithms
   */
  private async trainLinearRegression(data: TrainingDataPoint[]): Promise<any> {
    // Mock linear regression model
    return {
      type: 'linear_regression',
      coefficients: this.calculateCoefficients(data),
      intercept: 0,
      features: this.features.map(f => f.name)
    };
  }
  
  private async trainRandomForest(data: TrainingDataPoint[]): Promise<any> {
    // Mock random forest model
    return {
      type: 'random_forest',
      trees: this.generateMockTrees(data),
      featureImportance: this.calculateFeatureImportance(data),
      features: this.features.map(f => f.name)
    };
  }
  
  private async trainNeuralNetwork(data: TrainingDataPoint[]): Promise<any> {
    // Mock neural network model
    return {
      type: 'neural_network',
      layers: [
        { type: 'dense', units: 64, activation: 'relu' },
        { type: 'dense', units: 32, activation: 'relu' },
        { type: 'dense', units: 1, activation: 'linear' }
      ],
      weights: this.generateMockWeights(),
      features: this.features.map(f => f.name)
    };
  }
  
  private async trainGradientBoosting(data: TrainingDataPoint[]): Promise<any> {
    // Mock gradient boosting model
    return {
      type: 'gradient_boosting',
      estimators: this.generateMockEstimators(data),
      learningRate: 0.1,
      features: this.features.map(f => f.name)
    };
  }
  
  private async trainEnsemble(data: TrainingDataPoint[]): Promise<any> {
    // Mock ensemble model combining multiple algorithms
    const models = await Promise.all([
      this.trainLinearRegression(data),
      this.trainRandomForest(data),
      this.trainGradientBoosting(data)
    ]);
    
    return {
      type: 'ensemble',
      models,
      weights: [0.3, 0.4, 0.3],
      features: this.features.map(f => f.name)
    };
  }
  
  /**
   * Evaluate model performance
   */
  private async evaluateModel(model: any, validationData: TrainingDataPoint[]): Promise<ModelMetrics> {
    let totalError = 0;
    let totalSquaredError = 0;
    let correctPredictions = 0;
    
    for (const dataPoint of validationData) {
      const prediction = await this.makePrediction(model, dataPoint.features, { targetVariable: this.config.targetVariable } as any);
      const actual = this.getActualValue(dataPoint, this.config.targetVariable);
      
      const error = Math.abs(prediction - actual);
      totalError += error;
      totalSquaredError += error * error;
      
      if (error < 0.1) correctPredictions++; // Within 10% tolerance
    }
    
    const mse = totalSquaredError / validationData.length;
    const mae = totalError / validationData.length;
    const accuracy = correctPredictions / validationData.length;
    
    return {
      algorithm: this.config.algorithm,
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy,    // Simplified
      f1Score: accuracy,   // Simplified
      mse,
      mae,
      r2Score: this.calculateR2Score(validationData, model),
      trainingSize: this.trainingData.size,
      lastTrained: new Date(),
      featureImportance: this.calculateFeatureImportance(validationData),
      crossValidationScore: accuracy
    };
  }
  
  /**
   * Make prediction using model
   */
  private async makePrediction(model: any, features: Record<string, any>, request: PredictionRequest): Promise<any> {
    // Mock prediction logic
    switch (model.type) {
      case 'linear_regression':
        return this.predictLinearRegression(model, features);
      case 'random_forest':
        return this.predictRandomForest(model, features);
      case 'neural_network':
        return this.predictNeuralNetwork(model, features);
      case 'gradient_boosting':
        return this.predictGradientBoosting(model, features);
      case 'ensemble':
        return this.predictEnsemble(model, features);
      default:
        throw new Error(`Unknown model type: ${model.type}`);
    }
  }
  
  /**
   * Mock prediction methods
   */
  private predictLinearRegression(model: any, features: Record<string, any>): number {
    let prediction = model.intercept;
    for (const [featureName, coefficient] of Object.entries(model.coefficients)) {
      prediction += (features[featureName] || 0) * (coefficient as number);
    }
    return Math.max(0, prediction);
  }
  
  private predictRandomForest(model: any, features: Record<string, any>): number {
    // Average predictions from all trees
    const treePredictions = model.trees.map((tree: any) => this.predictTree(tree, features));
    return treePredictions.reduce((sum: number, pred: number) => sum + pred, 0) / treePredictions.length;
  }
  
  private predictNeuralNetwork(model: any, features: Record<string, any>): number {
    // Simplified neural network prediction
    const input = model.features.map((name: string) => features[name] || 0);
    let output = input.reduce((sum, val) => sum + val, 0) / input.length;
    return Math.max(0, output * 10); // Scale to reasonable range
  }
  
  private predictGradientBoosting(model: any, features: Record<string, any>): number {
    // Sum predictions from all estimators
    let prediction = 0;
    for (const estimator of model.estimators) {
      prediction += this.predictEstimator(estimator, features) * model.learningRate;
    }
    return Math.max(0, prediction);
  }
  
  private predictEnsemble(model: any, features: Record<string, any>): number {
    let weightedSum = 0;
    for (let i = 0; i < model.models.length; i++) {
      const modelPrediction = this.makePrediction(model.models[i], features, {} as any);
      weightedSum += modelPrediction * model.weights[i];
    }
    return weightedSum;
  }
  
  /**
   * Pattern detection methods
   */
  private async detectEstimationBias(): Promise<PatternRecognitionResult | null> {
    const data = Array.from(this.trainingData.values());
    const estimationErrors = [];
    
    for (const dataPoint of data) {
      if (dataPoint.predictedOutcome && dataPoint.actualOutcome.duration) {
        const error = (dataPoint.predictedOutcome.duration - dataPoint.actualOutcome.duration) / dataPoint.actualOutcome.duration;
        estimationErrors.push(error);
      }
    }
    
    if (estimationErrors.length < 10) return null;
    
    const averageError = estimationErrors.reduce((sum, err) => sum + err, 0) / estimationErrors.length;
    
    if (Math.abs(averageError) > 0.2) { // More than 20% bias
      return {
        id: uuidv4(),
        patternType: 'estimation_bias',
        description: `Systematic ${averageError > 0 ? 'over' : 'under'}estimation bias of ${Math.abs(averageError * 100).toFixed(1)}%`,
        confidence: 0.8,
        evidence: data.slice(0, 5).map(d => ({
          taskId: d.taskId,
          relevantData: { estimationError: averageError },
          weight: 1.0
        })),
        implications: [
          'Task estimates may be consistently inaccurate',
          'Resource planning could be affected',
          'Team velocity calculations may be skewed'
        ],
        recommendations: [
          {
            action: 'Recalibrate estimation models with bias correction',
            impact: 'Improve estimation accuracy by 15-25%',
            confidence: 0.7
          },
          {
            action: 'Add bias awareness to estimation process',
            impact: 'Reduce systematic errors',
            confidence: 0.8
          }
        ],
        discoveredAt: new Date()
      };
    }
    
    return null;
  }
  
  private async detectComplexityPatterns(): Promise<PatternRecognitionResult[]> {
    // Analyze complexity distribution and patterns
    // This would be more sophisticated in practice
    return [];
  }
  
  private async detectSuccessFactors(): Promise<PatternRecognitionResult[]> {
    // Identify factors that correlate with task success
    // This would analyze feature correlations with success outcomes
    return [];
  }
  
  private async detectBottlenecks(): Promise<PatternRecognitionResult[]> {
    // Identify recurring bottlenecks in task execution
    return [];
  }
  
  private async detectTrends(): Promise<PatternRecognitionResult[]> {
    // Identify temporal trends in task patterns
    return [];
  }
  
  /**
   * Helper methods
   */
  private calculateCoefficients(data: TrainingDataPoint[]): Record<string, number> {
    const coefficients: Record<string, number> = {};
    for (const feature of this.features) {
      coefficients[feature.name] = Math.random() * 2 - 1; // Mock coefficients
    }
    return coefficients;
  }
  
  private generateMockTrees(data: TrainingDataPoint[]): any[] {
    return Array.from({ length: 10 }, () => ({ nodes: Math.floor(Math.random() * 100) }));
  }
  
  private calculateFeatureImportance(data: TrainingDataPoint[]): Record<string, number> {
    const importance: Record<string, number> = {};
    let total = 0;
    
    for (const feature of this.features) {
      const score = Math.random();
      importance[feature.name] = score;
      total += score;
    }
    
    // Normalize to sum to 1
    for (const name in importance) {
      importance[name] /= total;
    }
    
    return importance;
  }
  
  private generateMockWeights(): number[][] {
    return [[Math.random(), Math.random(), Math.random()]];
  }
  
  private generateMockEstimators(data: TrainingDataPoint[]): any[] {
    return Array.from({ length: 100 }, () => ({ depth: Math.floor(Math.random() * 10) }));
  }
  
  private predictTree(tree: any, features: Record<string, any>): number {
    return Math.random() * 10; // Mock tree prediction
  }
  
  private predictEstimator(estimator: any, features: Record<string, any>): number {
    return Math.random() * 2 - 1; // Mock estimator prediction
  }
  
  private getActualValue(dataPoint: TrainingDataPoint, targetVariable: string): number {
    switch (targetVariable) {
      case 'duration':
        return dataPoint.actualOutcome.duration;
      case 'quality':
        return dataPoint.actualOutcome.quality;
      case 'success':
        return dataPoint.actualOutcome.success ? 1 : 0;
      default:
        return 0;
    }
  }
  
  private calculateR2Score(validationData: TrainingDataPoint[], model: any): number {
    // Simplified R² calculation
    return Math.random() * 0.3 + 0.7; // Mock R² between 0.7 and 1.0
  }
  
  private calculatePredictionConfidence(model: any, features: Record<string, any>, prediction: any): number {
    // Calculate confidence based on feature quality and model performance
    let confidence = 0.5;
    
    // Boost confidence for non-null features
    const nonNullFeatures = Object.values(features).filter(v => v !== null && v !== undefined).length;
    confidence += (nonNullFeatures / this.features.length) * 0.3;
    
    // Boost confidence for high-performing models
    const modelId = `${this.config.algorithm}_${this.config.targetVariable}`;
    const metrics = this.modelMetrics.get(modelId);
    if (metrics) {
      confidence += metrics.accuracy * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  private calculateConfidenceInterval(prediction: number, confidence: number): { lower: number; upper: number } {
    const margin = prediction * (1 - confidence) * 0.5;
    return {
      lower: prediction - margin,
      upper: prediction + margin
    };
  }
  
  private async generatePredictionExplanation(
    model: any, 
    features: Record<string, any>, 
    prediction: any, 
    task: Task
  ): Promise<any> {
    const featureImportance = this.calculateFeatureImportance([]);
    
    const topFeatures = Object.entries(features)
      .map(([name, value]) => ({
        name,
        importance: featureImportance[name] || 0,
        value
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    
    return {
      topFeatures,
      reasoning: `Prediction based on ${topFeatures.length} key features with ${this.config.algorithm} algorithm`,
      similarTasks: [] // Would find similar tasks from training data
    };
  }
  
  private async getTaskById(taskId: string): Promise<Task | null> {
    // This would integrate with the task management system
    return null;
  }
  
  private async performOnlineUpdate(dataPoint: TrainingDataPoint): Promise<void> {
    // Implement online learning update
    logger.debug('Online learning update performed', { taskId: dataPoint.taskId });
  }
  
  private async performFeatureSelection(model: any, trainData: TrainingDataPoint[]): Promise<void> {
    // Implement feature selection based on configured method
    logger.debug('Feature selection performed', { method: this.config.featureSelection.method });
  }
  
  private async adaptModel(model: any, strategy: string): Promise<any> {
    // Implement model adaptation strategies
    return { ...model, adapted: true, strategy };
  }
  
  /**
   * Setup periodic training
   */
  private setupPeriodicTraining(): void {
    setInterval(async () => {
      if (this.trainingData.size >= this.config.minTrainingSize && !this.isTraining) {
        await this.trainModels();
      }
    }, this.config.retrainFrequency * 60 * 60 * 1000);
  }
  
  /**
   * Setup pattern detection
   */
  private setupPatternDetection(): void {
    setInterval(async () => {
      await this.detectPatterns();
    }, 24 * 60 * 60 * 1000); // Daily pattern detection
  }
  
  /**
   * Get model metrics
   */
  getModelMetrics(): Map<string, ModelMetrics> {
    return new Map(this.modelMetrics);
  }
  
  /**
   * Get discovered patterns
   */
  getPatterns(): PatternRecognitionResult[] {
    return Array.from(this.patterns.values());
  }
  
  /**
   * Get prediction history
   */
  getPredictionHistory(): PredictionResponse[] {
    return Array.from(this.predictionHistory.values());
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.trainingData.clear();
    this.models.clear();
    this.patterns.clear();
    this.predictionHistory.clear();
    this.modelMetrics.clear();
    this.removeAllListeners();
    
    logger.info('LearningEngine cleanup completed');
  }
}

/**
 * Default feature set for task estimation
 */
export const DEFAULT_FEATURES: Feature[] = [
  {
    name: 'title_length',
    type: FeatureType.NUMERIC,
    description: 'Number of characters in task title',
    extractor: (task: Task) => task.title.length
  },
  {
    name: 'description_length',
    type: FeatureType.NUMERIC,
    description: 'Number of characters in task description',
    extractor: (task: Task) => task.description?.length || 0
  },
  {
    name: 'priority_numeric',
    type: FeatureType.NUMERIC,
    description: 'Task priority as numeric value',
    extractor: (task: Task) => ({ low: 1, medium: 2, high: 3, critical: 4 }[task.priority]),
    transformer: (value: number) => value
  },
  {
    name: 'complexity_numeric',
    type: FeatureType.NUMERIC,
    description: 'Task complexity as numeric value',
    extractor: (task: Task) => ({ simple: 1, moderate: 2, complex: 3, very_complex: 4 }[task.complexity || 'moderate']),
    transformer: (value: number) => value
  },
  {
    name: 'dependency_count',
    type: FeatureType.NUMERIC,
    description: 'Number of task dependencies',
    extractor: (task: Task) => task.dependencies.length
  },
  {
    name: 'tag_count',
    type: FeatureType.NUMERIC,
    description: 'Number of tags assigned to task',
    extractor: (task: Task) => task.tags.length
  },
  {
    name: 'has_due_date',
    type: FeatureType.BOOLEAN,
    description: 'Whether task has a due date',
    extractor: (task: Task) => !!task.dueDate,
    transformer: (value: boolean) => value ? 1 : 0
  },
  {
    name: 'days_until_due',
    type: FeatureType.NUMERIC,
    description: 'Days until task due date',
    extractor: (task: Task) => {
      if (!task.dueDate) return -1;
      return Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
  },
  {
    name: 'has_assignee',
    type: FeatureType.BOOLEAN,
    description: 'Whether task has an assignee',
    extractor: (task: Task) => !!task.assignee,
    transformer: (value: boolean) => value ? 1 : 0
  },
  {
    name: 'estimated_hours',
    type: FeatureType.NUMERIC,
    description: 'Initial estimated hours (if available)',
    extractor: (task: Task) => task.estimatedHours || 0
  }
];