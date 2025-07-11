import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskState,
  TaskPriority,
  TaskComplexity,
  CreateTaskInput,
  DecompositionOptions,
  TaskValidationError
} from '../types/index.js';

/**
 * AI-driven task decomposition engine
 * Breaks down complex tasks into manageable subtasks with dependency tracking
 */
export class TaskDecomposer {
  
  // Complexity scoring weights
  private static readonly COMPLEXITY_WEIGHTS = {
    wordCount: 0.2,
    technicalTerms: 0.3,
    actionVerbs: 0.25,
    dependencies: 0.15,
    scope: 0.1
  };

  // Technical keywords that indicate complexity
  private static readonly TECHNICAL_KEYWORDS = [
    'implement', 'algorithm', 'architecture', 'optimization', 'integration',
    'database', 'api', 'security', 'performance', 'scalability', 'framework',
    'authentication', 'authorization', 'encryption', 'deployment', 'testing',
    'debugging', 'refactoring', 'migration', 'infrastructure', 'monitoring'
  ];

  // Action verbs that indicate work complexity
  private static readonly ACTION_VERBS = [
    'create', 'build', 'implement', 'develop', 'design', 'configure',
    'optimize', 'integrate', 'test', 'deploy', 'analyze', 'refactor',
    'migrate', 'setup', 'install', 'document', 'review', 'validate'
  ];

  /**
   * Decompose a complex task into subtasks
   */
  async decomposeTask(
    task: Task,
    options: DecompositionOptions = {}
  ): Promise<Task[]> {
    const {
      maxDepth = 3,
      targetComplexity = TaskComplexity.SIMPLE,
      estimateHours = true,
      generateDependencies = true,
      preserveMetadata = true
    } = options;

    // Validate input task
    if (!task.description || task.description.length < 10) {
      throw new TaskValidationError('Task description too short for decomposition');
    }

    // Check if task needs decomposition
    const currentComplexity = this.assessTaskComplexity(task);
    if (currentComplexity <= this.getComplexityValue(targetComplexity)) {
      return [task]; // Already simple enough
    }

    // Analyze task content
    const analysis = this.analyzeTaskContent(task.description);
    
    // Generate subtasks based on analysis
    const subtasks = await this.generateSubtasks(task, analysis, options);
    
    // Estimate hours if requested
    if (estimateHours) {
      this.estimateSubtaskHours(subtasks, task.estimatedHours);
    }

    // Generate dependencies if requested
    if (generateDependencies) {
      this.generateSubtaskDependencies(subtasks);
    }

    // Recursively decompose if needed and within depth limit
    if (maxDepth > 1) {
      const finalSubtasks: Task[] = [];
      
      for (const subtask of subtasks) {
        const subComplexity = this.assessTaskComplexity(subtask);
        
        if (subComplexity > this.getComplexityValue(targetComplexity)) {
          const nestedOptions = { ...options, maxDepth: maxDepth - 1 };
          const nestedSubtasks = await this.decomposeTask(subtask, nestedOptions);
          finalSubtasks.push(...nestedSubtasks);
        } else {
          finalSubtasks.push(subtask);
        }
      }
      
      return finalSubtasks;
    }

    return subtasks;
  }

  /**
   * Assess task complexity based on multiple factors
   */
  assessTaskComplexity(task: Task): number {
    if (!task.description) return 0;

    const analysis = this.analyzeTaskContent(task.description);
    
    // Calculate weighted complexity score
    const scores = {
      wordCount: this.scoreWordCount(analysis.wordCount),
      technicalTerms: this.scoreTechnicalTerms(analysis.technicalTerms),
      actionVerbs: this.scoreActionVerbs(analysis.actionVerbs),
      dependencies: this.scoreDependencies(task.dependencies.length),
      scope: this.scoreScope(analysis.scope)
    };

    let totalScore = 0;
    for (const [factor, weight] of Object.entries(TaskDecomposer.COMPLEXITY_WEIGHTS)) {
      totalScore += scores[factor as keyof typeof scores] * weight;
    }

    return Math.min(totalScore, 1.0); // Cap at 1.0
  }

  /**
   * Estimate complexity category from numeric score
   */
  estimateComplexity(task: Task): TaskComplexity {
    const score = this.assessTaskComplexity(task);
    
    if (score < 0.25) return TaskComplexity.SIMPLE;
    if (score < 0.5) return TaskComplexity.MODERATE;
    if (score < 0.75) return TaskComplexity.COMPLEX;
    return TaskComplexity.VERY_COMPLEX;
  }

  /**
   * Suggest task breakdown strategies
   */
  suggestBreakdownStrategies(task: Task): string[] {
    const analysis = this.analyzeTaskContent(task.description || '');
    const strategies: string[] = [];

    // Strategy based on action verbs
    if (analysis.actionVerbs.length > 2) {
      strategies.push('Break down by action phases (design → implement → test → deploy)');
    }

    // Strategy based on technical scope
    if (analysis.technicalTerms.length > 3) {
      strategies.push('Separate by technical domains (frontend, backend, database, infrastructure)');
    }

    // Strategy based on word count
    if (analysis.wordCount > 100) {
      strategies.push('Split into logical components or features');
    }

    // Strategy based on dependencies
    if (task.dependencies.length > 2) {
      strategies.push('Organize by dependency chains and parallel work streams');
    }

    // Default strategies
    if (strategies.length === 0) {
      strategies.push(
        'Break into planning, implementation, and validation phases',
        'Separate by functional requirements and non-functional requirements'
      );
    }

    return strategies;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Analyze task content for decomposition insights
   */
  private analyzeTaskContent(description: string): {
    wordCount: number;
    technicalTerms: string[];
    actionVerbs: string[];
    scope: 'narrow' | 'medium' | 'broad';
    sentences: string[];
    keyPhrases: string[];
  } {
    const words = description.toLowerCase().split(/\s+/);
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find technical terms
    const technicalTerms = words.filter(word => 
      TaskDecomposer.TECHNICAL_KEYWORDS.includes(word)
    );

    // Find action verbs
    const actionVerbs = words.filter(word => 
      TaskDecomposer.ACTION_VERBS.includes(word)
    );

    // Assess scope
    let scope: 'narrow' | 'medium' | 'broad' = 'narrow';
    if (words.length > 50 || technicalTerms.length > 3) scope = 'medium';
    if (words.length > 100 || technicalTerms.length > 5) scope = 'broad';

    // Extract key phrases (simple approach)
    const keyPhrases = this.extractKeyPhrases(description);

    return {
      wordCount: words.length,
      technicalTerms,
      actionVerbs,
      scope,
      sentences,
      keyPhrases
    };
  }

  /**
   * Generate subtasks based on task analysis
   */
  private async generateSubtasks(
    parentTask: Task,
    analysis: ReturnType<typeof this.analyzeTaskContent>,
    options: DecompositionOptions
  ): Promise<Task[]> {
    const subtasks: Task[] = [];
    
    // Strategy 1: Break by action phases
    if (analysis.actionVerbs.length > 1) {
      const phases = this.generateActionPhases(parentTask, analysis);
      subtasks.push(...phases);
    }
    
    // Strategy 2: Break by technical components
    else if (analysis.technicalTerms.length > 2) {
      const components = this.generateTechnicalComponents(parentTask, analysis);
      subtasks.push(...components);
    }
    
    // Strategy 3: Break by logical sections
    else if (analysis.sentences.length > 3) {
      const sections = this.generateLogicalSections(parentTask, analysis);
      subtasks.push(...sections);
    }
    
    // Fallback: Generic breakdown
    else {
      const generic = this.generateGenericBreakdown(parentTask);
      subtasks.push(...generic);
    }

    return subtasks;
  }

  /**
   * Generate subtasks based on action phases
   */
  private generateActionPhases(
    parentTask: Task,
    analysis: ReturnType<typeof this.analyzeTaskContent>
  ): Task[] {
    const phases = [
      { phase: 'Planning', verbs: ['plan', 'design', 'analyze', 'research'] },
      { phase: 'Implementation', verbs: ['create', 'build', 'implement', 'develop'] },
      { phase: 'Testing', verbs: ['test', 'validate', 'verify', 'debug'] },
      { phase: 'Deployment', verbs: ['deploy', 'install', 'configure', 'setup'] }
    ];

    const subtasks: Task[] = [];
    
    for (const phaseInfo of phases) {
      const hasRelevantVerbs = phaseInfo.verbs.some(verb => 
        analysis.actionVerbs.includes(verb)
      );
      
      if (hasRelevantVerbs) {
        const subtask = this.createSubtask(
          parentTask,
          `${phaseInfo.phase}: ${parentTask.title}`,
          `${phaseInfo.phase} phase for: ${parentTask.description?.substring(0, 100)}...`
        );
        subtasks.push(subtask);
      }
    }

    return subtasks.length > 0 ? subtasks : this.generateGenericBreakdown(parentTask);
  }

  /**
   * Generate subtasks based on technical components
   */
  private generateTechnicalComponents(
    parentTask: Task,
    analysis: ReturnType<typeof this.analyzeTaskContent>
  ): Task[] {
    const components = [
      { name: 'Frontend', terms: ['ui', 'frontend', 'interface', 'component'] },
      { name: 'Backend', terms: ['backend', 'api', 'server', 'service'] },
      { name: 'Database', terms: ['database', 'data', 'storage', 'model'] },
      { name: 'Infrastructure', terms: ['deployment', 'infrastructure', 'docker', 'cloud'] }
    ];

    const subtasks: Task[] = [];
    
    for (const component of components) {
      const hasRelevantTerms = component.terms.some(term => 
        analysis.technicalTerms.includes(term)
      );
      
      if (hasRelevantTerms) {
        const subtask = this.createSubtask(
          parentTask,
          `${component.name} - ${parentTask.title}`,
          `${component.name} implementation for: ${parentTask.description?.substring(0, 100)}...`
        );
        subtasks.push(subtask);
      }
    }

    return subtasks.length > 0 ? subtasks : this.generateGenericBreakdown(parentTask);
  }

  /**
   * Generate subtasks based on logical sections
   */
  private generateLogicalSections(
    parentTask: Task,
    analysis: ReturnType<typeof this.analyzeTaskContent>
  ): Task[] {
    const subtasks: Task[] = [];
    
    // Create subtask for each significant sentence/section
    analysis.sentences.slice(0, 5).forEach((sentence, index) => {
      if (sentence.trim().length > 20) {
        const subtask = this.createSubtask(
          parentTask,
          `${parentTask.title} - Part ${index + 1}`,
          sentence.trim()
        );
        subtasks.push(subtask);
      }
    });

    return subtasks.length > 0 ? subtasks : this.generateGenericBreakdown(parentTask);
  }

  /**
   * Generate generic task breakdown
   */
  private generateGenericBreakdown(parentTask: Task): Task[] {
    const genericPhases = [
      { title: 'Research and Planning', description: 'Analyze requirements and plan implementation approach' },
      { title: 'Core Implementation', description: 'Implement main functionality and features' },
      { title: 'Testing and Validation', description: 'Test implementation and validate requirements' },
      { title: 'Documentation and Cleanup', description: 'Document solution and clean up code' }
    ];

    return genericPhases.map(phase => 
      this.createSubtask(
        parentTask,
        `${phase.title}: ${parentTask.title}`,
        `${phase.description} for: ${parentTask.title}`
      )
    );
  }

  /**
   * Create a subtask from parent task
   */
  private createSubtask(parentTask: Task, title: string, description: string): Task {
    return {
      id: uuidv4(),
      title,
      description,
      state: TaskState.PENDING,
      priority: parentTask.priority,
      complexity: TaskComplexity.SIMPLE,
      parentId: parentTask.id,
      dependencies: [],
      tags: [...parentTask.tags, 'subtask'],
      assignee: parentTask.assignee,
      dueDate: parentTask.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...parentTask.metadata,
        generatedBy: 'TaskDecomposer',
        decompositionMethod: 'ai-driven'
      }
    };
  }

  /**
   * Estimate hours for subtasks based on parent task
   */
  private estimateSubtaskHours(subtasks: Task[], parentHours?: number): void {
    if (!parentHours || subtasks.length === 0) return;

    // Distribute hours based on complexity and priority
    const totalWeight = subtasks.reduce((sum, task) => {
      const complexityWeight = this.getComplexityValue(task.complexity || TaskComplexity.SIMPLE);
      const priorityWeight = this.getPriorityValue(task.priority);
      return sum + (complexityWeight * priorityWeight);
    }, 0);

    subtasks.forEach(task => {
      const complexityWeight = this.getComplexityValue(task.complexity || TaskComplexity.SIMPLE);
      const priorityWeight = this.getPriorityValue(task.priority);
      const taskWeight = (complexityWeight * priorityWeight) / totalWeight;
      task.estimatedHours = Math.round(parentHours * taskWeight * 10) / 10; // Round to 1 decimal
    });
  }

  /**
   * Generate dependencies between subtasks
   */
  private generateSubtaskDependencies(subtasks: Task[]): void {
    // Simple dependency chain: each task depends on the previous one
    for (let i = 1; i < subtasks.length; i++) {
      subtasks[i].dependencies = [subtasks[i - 1].id];
    }
  }

  /**
   * Extract key phrases from text (simple approach)
   */
  private extractKeyPhrases(text: string): string[] {
    // Simple approach: find noun phrases and compound terms
    const phrases: string[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`.toLowerCase();
      if (phrase.length > 5 && !phrases.includes(phrase)) {
        phrases.push(phrase);
      }
    }
    
    return phrases.slice(0, 10); // Limit to top 10
  }

  // ==================== SCORING METHODS ====================

  private scoreWordCount(count: number): number {
    if (count < 20) return 0.1;
    if (count < 50) return 0.3;
    if (count < 100) return 0.6;
    return 1.0;
  }

  private scoreTechnicalTerms(terms: string[]): number {
    const count = terms.length;
    if (count === 0) return 0.1;
    if (count < 3) return 0.3;
    if (count < 5) return 0.6;
    return 1.0;
  }

  private scoreActionVerbs(verbs: string[]): number {
    const count = verbs.length;
    if (count === 0) return 0.1;
    if (count < 3) return 0.4;
    if (count < 5) return 0.7;
    return 1.0;
  }

  private scoreDependencies(count: number): number {
    if (count === 0) return 0.1;
    if (count < 3) return 0.4;
    if (count < 5) return 0.7;
    return 1.0;
  }

  private scoreScope(scope: 'narrow' | 'medium' | 'broad'): number {
    const scores = { narrow: 0.2, medium: 0.5, broad: 0.9 };
    return scores[scope];
  }

  private getComplexityValue(complexity: TaskComplexity): number {
    const values = {
      [TaskComplexity.SIMPLE]: 0.25,
      [TaskComplexity.MODERATE]: 0.5,
      [TaskComplexity.COMPLEX]: 0.75,
      [TaskComplexity.VERY_COMPLEX]: 1.0
    };
    return values[complexity];
  }

  private getPriorityValue(priority: TaskPriority): number {
    const values = {
      [TaskPriority.LOW]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.CRITICAL]: 4
    };
    return values[priority];
  }
}