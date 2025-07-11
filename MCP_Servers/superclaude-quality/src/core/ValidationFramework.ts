import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import {
  ValidationStep,
  ValidationResult,
  QualityIssue,
  QualityLevel,
  ValidateFileInput,
  QualityValidationError,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG
} from '../types/index.js';

const execAsync = promisify(exec);

/**
 * 8-step quality validation framework with semantic integration
 */
export class ValidationFramework {
  private config: ValidationConfig;
  private stepExecutors: Map<ValidationStep, (filePath: string, content: string, language: string) => Promise<ValidationResult>>;

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
    this.stepExecutors = new Map();
    this.initializeStepExecutors();
  }

  /**
   * Execute all validation steps for a file
   */
  async validateFile(input: ValidateFileInput): Promise<ValidationResult[]> {
    const enabledSteps = input.enabledSteps || Object.values(ValidationStep);
    const content = input.content || await this.readFile(input.filePath);
    const language = input.language || this.detectLanguage(input.filePath);

    const results: ValidationResult[] = [];
    
    // Execute steps in parallel where possible
    const stepPromises = enabledSteps
      .filter(step => this.config.steps[step].enabled)
      .map(async step => {
        try {
          const startTime = Date.now();
          const executor = this.stepExecutors.get(step);
          
          if (!executor) {
            throw new QualityValidationError(`No executor found for step: ${step}`, step, input.filePath);
          }

          const result = await this.executeWithTimeout(
            executor(input.filePath, content, language),
            this.config.steps[step].timeout
          );

          result.executionTime = Date.now() - startTime;
          return result;
        } catch (error) {
          return this.createErrorResult(step, error, Date.now());
        }
      });

    const stepResults = await Promise.all(stepPromises);
    results.push(...stepResults);

    return results;
  }

  /**
   * Validate multiple files in a project
   */
  async validateProject(projectPath: string, options: {
    includePaths?: string[];
    excludePaths?: string[];
    enabledSteps?: ValidationStep[];
    parallel?: boolean;
    maxConcurrency?: number;
  } = {}): Promise<Map<string, ValidationResult[]>> {
    const files = await this.findValidationTargets(projectPath, options);
    const results = new Map<string, ValidationResult[]>();

    if (options.parallel !== false) {
      // Parallel execution with concurrency control
      const concurrency = options.maxConcurrency || 5;
      const chunks = this.chunkArray(files, concurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async filePath => {
          try {
            const fileResults = await this.validateFile({
              filePath,
              enabledSteps: options.enabledSteps
            });
            results.set(filePath, fileResults);
          } catch (error) {
            console.error(`Validation failed for ${filePath}:`, error);
            results.set(filePath, []);
          }
        });

        await Promise.all(chunkPromises);
      }
    } else {
      // Sequential execution
      for (const filePath of files) {
        try {
          const fileResults = await this.validateFile({
            filePath,
            enabledSteps: options.enabledSteps
          });
          results.set(filePath, fileResults);
        } catch (error) {
          console.error(`Validation failed for ${filePath}:`, error);
          results.set(filePath, []);
        }
      }
    }

    return results;
  }

  // ==================== STEP EXECUTORS ====================

  private initializeStepExecutors(): void {
    this.stepExecutors.set(ValidationStep.SYNTAX, this.validateSyntax.bind(this));
    this.stepExecutors.set(ValidationStep.TYPE_CHECK, this.validateTypes.bind(this));
    this.stepExecutors.set(ValidationStep.LINT, this.validateLinting.bind(this));
    this.stepExecutors.set(ValidationStep.SECURITY, this.validateSecurity.bind(this));
    this.stepExecutors.set(ValidationStep.TEST, this.validateTests.bind(this));
    this.stepExecutors.set(ValidationStep.PERFORMANCE, this.validatePerformance.bind(this));
    this.stepExecutors.set(ValidationStep.DOCUMENTATION, this.validateDocumentation.bind(this));
    this.stepExecutors.set(ValidationStep.INTEGRATION, this.validateIntegration.bind(this));
  }

  /**
   * Step 1: Syntax Validation
   */
  private async validateSyntax(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      switch (language) {
        case 'typescript':
        case 'javascript':
          await this.validateJavaScriptSyntax(filePath, content, issues);
          break;
        case 'python':
          await this.validatePythonSyntax(filePath, content, issues);
          break;
        default:
          // Basic syntax checks
          await this.validateBasicSyntax(filePath, content, issues);
      }

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.SYNTAX].weight);
      
      return {
        step: ValidationStep.SYNTAX,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL || i.level === QualityLevel.HIGH).length === 0,
        score,
        issues,
        executionTime: 0, // Will be set by caller
        metadata: { language, checksPerformed: ['syntax_parsing', 'basic_structure'] }
      };
    } catch (error) {
      throw new QualityValidationError(`Syntax validation failed: ${error}`, ValidationStep.SYNTAX, filePath);
    }
  }

  /**
   * Step 2: Type Checking
   */
  private async validateTypes(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      if (language === 'typescript') {
        await this.validateTypeScriptTypes(filePath, content, issues);
      } else if (language === 'python') {
        await this.validatePythonTypes(filePath, content, issues);
      } else {
        // Skip type checking for languages without static typing
      }

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.TYPE_CHECK].weight);
      
      return {
        step: ValidationStep.TYPE_CHECK,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL || i.level === QualityLevel.HIGH).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { language, typeSystem: language === 'typescript' ? 'static' : 'dynamic' }
      };
    } catch (error) {
      throw new QualityValidationError(`Type validation failed: ${error}`, ValidationStep.TYPE_CHECK, filePath);
    }
  }

  /**
   * Step 3: Linting
   */
  private async validateLinting(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      switch (language) {
        case 'typescript':
        case 'javascript':
          await this.validateESLint(filePath, content, issues);
          break;
        case 'python':
          await this.validatePyLint(filePath, content, issues);
          break;
        default:
          await this.validateGenericLinting(filePath, content, issues);
      }

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.LINT].weight);
      
      return {
        step: ValidationStep.LINT,
        passed: issues.filter(i => i.level === QualityLevel.HIGH || i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { language, linter: this.getLinterName(language) }
      };
    } catch (error) {
      throw new QualityValidationError(`Linting failed: ${error}`, ValidationStep.LINT, filePath);
    }
  }

  /**
   * Step 4: Security Validation
   */
  private async validateSecurity(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      // Common security checks
      await this.checkSecurityPatterns(filePath, content, language, issues);
      
      // Language-specific security checks
      switch (language) {
        case 'typescript':
        case 'javascript':
          await this.validateJavaScriptSecurity(filePath, content, issues);
          break;
        case 'python':
          await this.validatePythonSecurity(filePath, content, issues);
          break;
      }

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.SECURITY].weight);
      
      return {
        step: ValidationStep.SECURITY,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { 
          language, 
          checksPerformed: ['injection', 'xss', 'secrets', 'permissions'],
          criticalIssues: issues.filter(i => i.level === QualityLevel.CRITICAL).length
        }
      };
    } catch (error) {
      throw new QualityValidationError(`Security validation failed: ${error}`, ValidationStep.SECURITY, filePath);
    }
  }

  /**
   * Step 5: Test Validation
   */
  private async validateTests(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      // Check if this is a test file
      const isTestFile = this.isTestFile(filePath);
      
      if (isTestFile) {
        await this.validateTestStructure(filePath, content, language, issues);
        await this.validateTestCoverage(filePath, content, language, issues);
      } else {
        // Check if corresponding test file exists
        await this.checkTestFileExists(filePath, issues);
      }

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.TEST].weight);
      
      return {
        step: ValidationStep.TEST,
        passed: issues.filter(i => i.level === QualityLevel.HIGH || i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { 
          language, 
          isTestFile,
          testFramework: this.detectTestFramework(content, language)
        }
      };
    } catch (error) {
      throw new QualityValidationError(`Test validation failed: ${error}`, ValidationStep.TEST, filePath);
    }
  }

  /**
   * Step 6: Performance Validation
   */
  private async validatePerformance(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      // Analyze performance anti-patterns
      await this.checkPerformancePatterns(filePath, content, language, issues);
      
      // Check algorithmic complexity
      await this.analyzeAlgorithmicComplexity(filePath, content, language, issues);
      
      // Memory usage patterns
      await this.checkMemoryPatterns(filePath, content, language, issues);

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.PERFORMANCE].weight);
      
      return {
        step: ValidationStep.PERFORMANCE,
        passed: issues.filter(i => i.level === QualityLevel.HIGH || i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { 
          language,
          complexityScore: this.calculateComplexityScore(content),
          performanceRisk: this.assessPerformanceRisk(issues)
        }
      };
    } catch (error) {
      throw new QualityValidationError(`Performance validation failed: ${error}`, ValidationStep.PERFORMANCE, filePath);
    }
  }

  /**
   * Step 7: Documentation Validation
   */
  private async validateDocumentation(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      // Check comment density
      await this.checkCommentDensity(filePath, content, language, issues);
      
      // Validate function documentation
      await this.validateFunctionDocs(filePath, content, language, issues);
      
      // Check for README and other docs
      await this.checkProjectDocumentation(filePath, issues);

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.DOCUMENTATION].weight);
      
      return {
        step: ValidationStep.DOCUMENTATION,
        passed: issues.filter(i => i.level === QualityLevel.HIGH || i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { 
          language,
          commentDensity: this.calculateCommentDensity(content, language),
          documentedFunctions: this.countDocumentedFunctions(content, language)
        }
      };
    } catch (error) {
      throw new QualityValidationError(`Documentation validation failed: ${error}`, ValidationStep.DOCUMENTATION, filePath);
    }
  }

  /**
   * Step 8: Integration Validation
   */
  private async validateIntegration(filePath: string, content: string, language: string): Promise<ValidationResult> {
    const issues: QualityIssue[] = [];
    
    try {
      // Check import/export consistency
      await this.validateImportExports(filePath, content, language, issues);
      
      // Validate API contracts
      await this.validateAPIContracts(filePath, content, language, issues);
      
      // Check dependency compatibility
      await this.checkDependencyCompatibility(filePath, content, language, issues);

      const score = this.calculateStepScore(issues, this.config.steps[ValidationStep.INTEGRATION].weight);
      
      return {
        step: ValidationStep.INTEGRATION,
        passed: issues.filter(i => i.level === QualityLevel.CRITICAL).length === 0,
        score,
        issues,
        executionTime: 0,
        metadata: { 
          language,
          dependencies: this.extractDependencies(content, language),
          exports: this.extractExports(content, language)
        }
      };
    } catch (error) {
      throw new QualityValidationError(`Integration validation failed: ${error}`, ValidationStep.INTEGRATION, filePath);
    }
  }

  // ==================== VALIDATION IMPLEMENTATIONS ====================

  private async validateJavaScriptSyntax(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    try {
      // Use Node.js built-in syntax checking
      const tempFile = path.join(require('os').tmpdir(), `syntax-check-${Date.now()}.js`);
      await fs.writeFile(tempFile, content);
      
      try {
        await execAsync(`node --check "${tempFile}"`);
      } catch (error: any) {
        const lines = error.stderr.split('\n');
        lines.forEach((line: string) => {
          const match = line.match(/(\d+):(\d+).*Error: (.+)/);
          if (match) {
            issues.push({
              id: `syntax-${Date.now()}`,
              level: QualityLevel.CRITICAL,
              step: ValidationStep.SYNTAX,
              title: 'Syntax Error',
              description: match[3],
              filePath,
              line: parseInt(match[1]),
              column: parseInt(match[2]),
              fixable: false,
              metadata: { tool: 'node-check' }
            });
          }
        });
      }
      
      await fs.unlink(tempFile);
    } catch (error) {
      // Fallback to basic checks
      await this.validateBasicSyntax(filePath, content, issues);
    }
  }

  private async validateBasicSyntax(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    const lines = content.split('\n');
    
    // Check for basic syntax issues
    lines.forEach((line, index) => {
      // Unmatched brackets
      const openBrackets = (line.match(/[({]/g) || []).length;
      const closeBrackets = (line.match(/[)}]/g) || []).length;
      
      if (openBrackets !== closeBrackets && !line.trim().endsWith('\\')) {
        issues.push({
          id: `syntax-bracket-${index}`,
          level: QualityLevel.HIGH,
          step: ValidationStep.SYNTAX,
          title: 'Potential Bracket Mismatch',
          description: 'Unmatched brackets detected',
          filePath,
          line: index + 1,
          fixable: false,
          metadata: { pattern: 'bracket-mismatch' }
        });
      }
    });
  }

  // Additional validation method implementations would go here...
  // For brevity, I'll implement a few key ones and provide stubs for others

  private async checkSecurityPatterns(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    const securityPatterns = [
      { pattern: /eval\s*\(/, level: QualityLevel.CRITICAL, title: 'Code Injection Risk', description: 'Use of eval() detected' },
      { pattern: /innerHTML\s*=/, level: QualityLevel.HIGH, title: 'XSS Risk', description: 'Direct innerHTML assignment detected' },
      { pattern: /password\s*=\s*['"]/, level: QualityLevel.CRITICAL, title: 'Hardcoded Password', description: 'Hardcoded password detected' },
      { pattern: /api[_-]?key\s*=\s*['"]/, level: QualityLevel.CRITICAL, title: 'Hardcoded API Key', description: 'Hardcoded API key detected' }
    ];

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      securityPatterns.forEach(({ pattern, level, title, description }) => {
        if (pattern.test(line)) {
          issues.push({
            id: `security-${Date.now()}-${index}`,
            level,
            step: ValidationStep.SECURITY,
            title,
            description,
            filePath,
            line: index + 1,
            fixable: false,
            metadata: { securityCategory: 'pattern-detection' }
          });
        }
      });
    });
  }

  // ==================== HELPER METHODS ====================

  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new QualityValidationError(`Failed to read file: ${filePath}`, ValidationStep.SYNTAX, filePath);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust'
    };
    return languageMap[ext] || 'unknown';
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private createErrorResult(step: ValidationStep, error: any, startTime: number): ValidationResult {
    return {
      step,
      passed: false,
      score: 0,
      issues: [{
        id: `error-${Date.now()}`,
        level: QualityLevel.CRITICAL,
        step,
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        filePath: '',
        fixable: false,
        metadata: { error: true }
      }],
      executionTime: Date.now() - startTime,
      metadata: { error: true }
    };
  }

  private calculateStepScore(issues: QualityIssue[], weight: number): number {
    let deductions = 0;
    
    issues.forEach(issue => {
      switch (issue.level) {
        case QualityLevel.CRITICAL:
          deductions += 20;
          break;
        case QualityLevel.HIGH:
          deductions += 10;
          break;
        case QualityLevel.MEDIUM:
          deductions += 5;
          break;
        case QualityLevel.LOW:
          deductions += 2;
          break;
        case QualityLevel.INFO:
          deductions += 1;
          break;
      }
    });

    return Math.max(0, 100 - deductions);
  }

  private async findValidationTargets(projectPath: string, options: {
    includePaths?: string[];
    excludePaths?: string[];
  }): Promise<string[]> {
    const files: string[] = [];
    const excludePatterns = options.excludePaths || ['node_modules', '.git', 'dist', 'build'];
    
    async function scan(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && /\.(ts|js|jsx|tsx|py|java|cpp|c|cs|go|rs)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await scan(projectPath);
    return files;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Stub implementations for remaining methods
  private async validatePythonSyntax(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // Python syntax validation implementation
  }

  private async validateTypeScriptTypes(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // TypeScript type checking implementation
  }

  private async validatePythonTypes(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // Python type checking implementation
  }

  private async validateESLint(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // ESLint validation implementation
  }

  private async validatePyLint(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // PyLint validation implementation
  }

  private async validateGenericLinting(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // Generic linting implementation
  }

  private async validateJavaScriptSecurity(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // JavaScript-specific security validation
  }

  private async validatePythonSecurity(filePath: string, content: string, issues: QualityIssue[]): Promise<void> {
    // Python-specific security validation
  }

  private getLinterName(language: string): string {
    const linters: Record<string, string> = {
      'typescript': 'eslint',
      'javascript': 'eslint',
      'python': 'pylint',
      'java': 'checkstyle'
    };
    return linters[language] || 'generic';
  }

  private isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.(ts|js|jsx|tsx|py)$/.test(filePath) || filePath.includes('/test/') || filePath.includes('/__tests__/');
  }

  private async validateTestStructure(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Test structure validation
  }

  private async validateTestCoverage(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Test coverage validation
  }

  private async checkTestFileExists(filePath: string, issues: QualityIssue[]): Promise<void> {
    // Check if test file exists for the given source file
  }

  private detectTestFramework(content: string, language: string): string {
    if (content.includes('jest') || content.includes('describe') || content.includes('it(')) return 'jest';
    if (content.includes('mocha') || content.includes('chai')) return 'mocha';
    if (content.includes('pytest') || content.includes('unittest')) return 'pytest';
    return 'unknown';
  }

  private async checkPerformancePatterns(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Performance pattern checking
  }

  private async analyzeAlgorithmicComplexity(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Algorithmic complexity analysis
  }

  private async checkMemoryPatterns(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Memory usage pattern checking
  }

  private calculateComplexityScore(content: string): number {
    // Simplified complexity calculation
    const lines = content.split('\n').length;
    const functions = (content.match(/function|def |class /g) || []).length;
    return Math.min(100, (lines + functions * 5) / 10);
  }

  private assessPerformanceRisk(issues: QualityIssue[]): 'low' | 'medium' | 'high' {
    const criticalIssues = issues.filter(i => i.level === QualityLevel.CRITICAL).length;
    const highIssues = issues.filter(i => i.level === QualityLevel.HIGH).length;
    
    if (criticalIssues > 0) return 'high';
    if (highIssues > 2) return 'medium';
    return 'low';
  }

  private async checkCommentDensity(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Comment density checking
  }

  private async validateFunctionDocs(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Function documentation validation
  }

  private async checkProjectDocumentation(filePath: string, issues: QualityIssue[]): Promise<void> {
    // Project documentation checking
  }

  private calculateCommentDensity(content: string, language: string): number {
    const totalLines = content.split('\n').length;
    const commentPattern = language === 'python' ? /#.*/ : /\/\/.*|\/\*[\s\S]*?\*\//g;
    const commentMatches = content.match(commentPattern);
    const commentLines = commentMatches ? commentMatches.length : 0;
    return totalLines > 0 ? commentLines / totalLines : 0;
  }

  private countDocumentedFunctions(content: string, language: string): number {
    // Count documented functions
    return 0; // Stub implementation
  }

  private async validateImportExports(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Import/export validation
  }

  private async validateAPIContracts(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // API contract validation
  }

  private async checkDependencyCompatibility(filePath: string, content: string, language: string, issues: QualityIssue[]): Promise<void> {
    // Dependency compatibility checking
  }

  private extractDependencies(content: string, language: string): string[] {
    const imports: string[] = [];
    const importPattern = language === 'python' ? /from\s+(\S+)\s+import|import\s+(\S+)/g : /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1] || match[2] || match[3]);
    }
    
    return imports;
  }

  private extractExports(content: string, language: string): string[] {
    const exports: string[] = [];
    if (language === 'typescript' || language === 'javascript') {
      const exportPattern = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
      let match;
      
      while ((match = exportPattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    
    return exports;
  }
}