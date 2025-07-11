import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskState,
  TaskPriority,
  TaskComplexity,
  PRDSection,
  PRDParseResult,
  PRDParseResultSchema
} from '../types/index.js';

/**
 * PRD (Product Requirements Document) parser
 * Extracts actionable tasks from structured and unstructured documents
 */
export class PRDParser {
  
  // Action indicators that suggest actionable items
  private static readonly ACTION_INDICATORS = [
    'must', 'should', 'shall', 'will', 'need to', 'required to',
    'implement', 'create', 'build', 'develop', 'design', 'configure',
    'setup', 'install', 'deploy', 'test', 'validate', 'ensure',
    'provide', 'support', 'enable', 'allow', 'prevent', 'handle'
  ];

  // Priority indicators
  private static readonly PRIORITY_INDICATORS = {
    critical: ['critical', 'urgent', 'must have', 'essential', 'required', 'mandatory'],
    high: ['important', 'high priority', 'should have', 'significant'],
    medium: ['moderate', 'medium priority', 'could have', 'nice to have'],
    low: ['low priority', 'optional', 'future', 'enhancement', 'nice-to-have']
  };

  // Complexity indicators
  private static readonly COMPLEXITY_INDICATORS = {
    simple: ['simple', 'basic', 'straightforward', 'easy', 'minimal'],
    moderate: ['moderate', 'standard', 'typical', 'regular'],
    complex: ['complex', 'advanced', 'sophisticated', 'comprehensive'],
    very_complex: ['very complex', 'extremely complex', 'enterprise-grade', 'large-scale']
  };

  /**
   * Parse PRD content and extract tasks
   */
  async parsePRD(content: string, title?: string): Promise<PRDParseResult> {
    // Parse document structure
    const sections = this.parseDocumentSections(content);
    
    // Extract tasks from sections
    const extractedTasks = await this.extractTasksFromSections(sections);
    
    // Calculate metadata
    const wordCount = content.split(/\s+/).length;
    const complexity = this.assessDocumentComplexity(content, sections);
    
    const result: PRDParseResult = {
      title: title || this.extractDocumentTitle(content),
      sections,
      extractedTasks,
      metadata: {
        wordCount,
        complexity,
        estimatedTasks: extractedTasks.length,
        parsedAt: new Date()
      }
    };

    return PRDParseResultSchema.parse(result);
  }

  /**
   * Parse specific section for tasks
   */
  async parseSectionForTasks(content: string, sectionTitle?: string): Promise<Task[]> {
    const section: PRDSection = {
      title: sectionTitle || 'Section',
      content,
      level: 1,
      actionItems: this.extractActionItems(content)
    };

    return this.extractTasksFromSection(section);
  }

  /**
   * Parse bullet points or numbered lists for tasks
   */
  async parseListForTasks(listContent: string): Promise<Task[]> {
    const items = this.parseListItems(listContent);
    const tasks: Task[] = [];

    for (const item of items) {
      if (this.isActionableItem(item)) {
        const task = await this.createTaskFromText(item);
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Extract requirements with acceptance criteria
   */
  async parseRequirementsWithAcceptance(content: string): Promise<{
    requirements: Task[];
    acceptanceCriteria: Record<string, string[]>;
  }> {
    const sections = this.parseDocumentSections(content);
    const requirements: Task[] = [];
    const acceptanceCriteria: Record<string, string[]> = {};

    for (const section of sections) {
      // Look for requirements sections
      if (this.isRequirementsSection(section.title)) {
        const sectionTasks = await this.extractTasksFromSection(section);
        requirements.push(...sectionTasks);

        // Extract acceptance criteria for each requirement
        for (const task of sectionTasks) {
          const criteria = this.extractAcceptanceCriteria(section.content, task.title);
          if (criteria.length > 0) {
            acceptanceCriteria[task.id] = criteria;
          }
        }
      }
    }

    return { requirements, acceptanceCriteria };
  }

  // ==================== PRIVATE PARSING METHODS ====================

  /**
   * Parse document into structured sections
   */
  private parseDocumentSections(content: string): PRDSection[] {
    const sections: PRDSection[] = [];
    const lines = content.split('\n');
    let currentSection: PRDSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.actionItems = this.extractActionItems(currentSection.content);
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        
        currentSection = {
          title,
          content: '',
          level,
          actionItems: []
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      } else {
        // Content before first header
        if (!currentSection) {
          currentSection = {
            title: 'Introduction',
            content: '',
            level: 1,
            actionItems: []
          };
          currentContent = [];
        }
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.actionItems = this.extractActionItems(currentSection.content);
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract actionable items from text
   */
  private extractActionItems(text: string): string[] {
    const actionItems: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    for (const sentence of sentences) {
      if (this.isActionableItem(sentence)) {
        actionItems.push(sentence.trim());
      }
    }

    // Also extract list items
    const listItems = this.parseListItems(text);
    for (const item of listItems) {
      if (this.isActionableItem(item)) {
        actionItems.push(item);
      }
    }

    return actionItems;
  }

  /**
   * Check if text is actionable
   */
  private isActionableItem(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for action indicators
    const hasActionIndicator = PRDParser.ACTION_INDICATORS.some(indicator =>
      lowerText.includes(indicator)
    );

    // Check for imperative mood (starts with verb)
    const startsWithVerb = /^(create|build|implement|develop|design|configure|setup|install|deploy|test|validate|ensure|provide|support|enable|allow|prevent|handle|add|remove|update|fix|improve)/i.test(text.trim());

    // Check for modal verbs indicating requirements
    const hasModalVerb = /\b(must|should|shall|will|need to|required to|have to)\b/i.test(text);

    return hasActionIndicator || startsWithVerb || hasModalVerb;
  }

  /**
   * Parse list items from text
   */
  private parseListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Match bullet points, numbered lists, etc.
      const listItemMatch = line.match(/^\s*[-*+•]\s+(.+)$/) || 
                           line.match(/^\s*\d+\.\s+(.+)$/) ||
                           line.match(/^\s*[a-zA-Z]\.\s+(.+)$/);
      
      if (listItemMatch) {
        items.push(listItemMatch[1].trim());
      }
    }

    return items;
  }

  /**
   * Extract tasks from all sections
   */
  private async extractTasksFromSections(sections: PRDSection[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const section of sections) {
      const sectionTasks = await this.extractTasksFromSection(section);
      tasks.push(...sectionTasks);
    }

    return tasks;
  }

  /**
   * Extract tasks from a single section
   */
  private async extractTasksFromSection(section: PRDSection): Promise<Task[]> {
    const tasks: Task[] = [];

    // Create tasks from action items
    for (const actionItem of section.actionItems) {
      const task = await this.createTaskFromText(actionItem, section.title);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Create task from text description
   */
  private async createTaskFromText(text: string, sectionTitle?: string): Promise<Task> {
    const title = this.extractTaskTitle(text);
    const description = text.length > title.length ? text : undefined;
    const priority = this.extractPriority(text);
    const complexity = this.extractComplexity(text);
    const tags = this.extractTags(text, sectionTitle);

    return {
      id: uuidv4(),
      title,
      description,
      state: TaskState.PENDING,
      priority,
      complexity,
      dependencies: [],
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: 'PRD',
        section: sectionTitle,
        extractedFrom: text.substring(0, 100)
      }
    };
  }

  /**
   * Extract task title from text
   */
  private extractTaskTitle(text: string): string {
    // Take first sentence or first 100 characters
    const firstSentence = text.split(/[.!?]/)[0];
    const title = firstSentence.length > 100 ? 
      firstSentence.substring(0, 97) + '...' : 
      firstSentence;
    
    return title.trim();
  }

  /**
   * Extract priority from text
   */
  private extractPriority(text: string): TaskPriority {
    const lowerText = text.toLowerCase();

    for (const [priority, indicators] of Object.entries(PRDParser.PRIORITY_INDICATORS)) {
      if (indicators.some(indicator => lowerText.includes(indicator))) {
        return priority as TaskPriority;
      }
    }

    return TaskPriority.MEDIUM; // Default
  }

  /**
   * Extract complexity from text
   */
  private extractComplexity(text: string): TaskComplexity {
    const lowerText = text.toLowerCase();

    for (const [complexity, indicators] of Object.entries(PRDParser.COMPLEXITY_INDICATORS)) {
      if (indicators.some(indicator => lowerText.includes(indicator))) {
        return complexity as TaskComplexity;
      }
    }

    // Estimate based on text length and technical terms
    const wordCount = text.split(/\s+/).length;
    const technicalTerms = this.countTechnicalTerms(text);

    if (wordCount > 50 || technicalTerms > 3) {
      return TaskComplexity.COMPLEX;
    } else if (wordCount > 20 || technicalTerms > 1) {
      return TaskComplexity.MODERATE;
    } else {
      return TaskComplexity.SIMPLE;
    }
  }

  /**
   * Extract relevant tags from text and section
   */
  private extractTags(text: string, sectionTitle?: string): string[] {
    const tags: string[] = [];

    // Add section-based tag
    if (sectionTitle) {
      tags.push(sectionTitle.toLowerCase().replace(/\s+/g, '-'));
    }

    // Add priority-based tag
    const priority = this.extractPriority(text);
    tags.push(`priority-${priority}`);

    // Add domain-based tags
    const lowerText = text.toLowerCase();
    const domainKeywords = {
      'frontend': ['ui', 'interface', 'frontend', 'client', 'web', 'mobile'],
      'backend': ['api', 'server', 'backend', 'service', 'database'],
      'security': ['security', 'auth', 'permission', 'encryption', 'secure'],
      'testing': ['test', 'testing', 'validation', 'verification', 'qa'],
      'deployment': ['deploy', 'deployment', 'infrastructure', 'devops']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.push(domain);
      }
    }

    return tags;
  }

  /**
   * Count technical terms in text
   */
  private countTechnicalTerms(text: string): number {
    const technicalKeywords = [
      'api', 'database', 'authentication', 'authorization', 'security',
      'performance', 'scalability', 'integration', 'framework', 'algorithm',
      'architecture', 'infrastructure', 'deployment', 'testing', 'validation'
    ];

    const lowerText = text.toLowerCase();
    return technicalKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }

  /**
   * Extract document title
   */
  private extractDocumentTitle(content: string): string {
    // Look for first H1 header
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Look for title in first few lines
    const lines = content.split('\n').slice(0, 5);
    for (const line of lines) {
      if (line.trim().length > 0 && line.length < 100) {
        return line.trim();
      }
    }

    return 'Untitled Document';
  }

  /**
   * Assess overall document complexity
   */
  private assessDocumentComplexity(content: string, sections: PRDSection[]): TaskComplexity {
    const wordCount = content.split(/\s+/).length;
    const sectionCount = sections.length;
    const technicalTerms = this.countTechnicalTerms(content);
    const actionItems = sections.reduce((sum, section) => sum + section.actionItems.length, 0);

    // Calculate complexity score
    let score = 0;
    
    if (wordCount > 1000) score += 0.3;
    else if (wordCount > 500) score += 0.2;
    else if (wordCount > 200) score += 0.1;

    if (sectionCount > 10) score += 0.2;
    else if (sectionCount > 5) score += 0.1;

    if (technicalTerms > 10) score += 0.3;
    else if (technicalTerms > 5) score += 0.2;
    else if (technicalTerms > 2) score += 0.1;

    if (actionItems > 20) score += 0.2;
    else if (actionItems > 10) score += 0.1;

    // Map score to complexity
    if (score >= 0.8) return TaskComplexity.VERY_COMPLEX;
    if (score >= 0.6) return TaskComplexity.COMPLEX;
    if (score >= 0.3) return TaskComplexity.MODERATE;
    return TaskComplexity.SIMPLE;
  }

  /**
   * Check if section contains requirements
   */
  private isRequirementsSection(title: string): boolean {
    const requirementKeywords = [
      'requirement', 'requirements', 'specification', 'specifications',
      'feature', 'features', 'functionality', 'acceptance criteria',
      'user story', 'user stories', 'use case', 'use cases'
    ];

    const lowerTitle = title.toLowerCase();
    return requirementKeywords.some(keyword => lowerTitle.includes(keyword));
  }

  /**
   * Extract acceptance criteria for a requirement
   */
  private extractAcceptanceCriteria(content: string, requirementTitle: string): string[] {
    const criteria: string[] = [];
    const lines = content.split('\n');
    
    let inCriteriaSection = false;
    
    for (const line of lines) {
      // Look for acceptance criteria sections
      if (/acceptance criteria|given.*when.*then|criteria/i.test(line)) {
        inCriteriaSection = true;
        continue;
      }

      // If we're in criteria section, extract list items
      if (inCriteriaSection) {
        const listItem = line.match(/^\s*[-*+•]\s+(.+)$/) || 
                        line.match(/^\s*\d+\.\s+(.+)$/);
        
        if (listItem) {
          criteria.push(listItem[1].trim());
        } else if (line.trim() === '' || /^#/.test(line)) {
          // End of criteria section
          break;
        }
      }
    }

    return criteria;
  }
}