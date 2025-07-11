import { logger } from '@superclaude/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  SymbolEditRequest,
  CodeEdit,
  CodeGenerationRequest,
  RefactoringOperation,
  SupportedLanguage,
  RefactoringError,
  SymbolNotFoundError
} from '../types/index.js';
import { LSPManager } from './LSPManager.js';

/**
 * Symbol-level code editing and refactoring
 * Inspired by Serena patterns for precise code manipulation
 */
export class SymbolEditor {
  private lspManager: LSPManager;
  private codeTemplates: Map<SupportedLanguage, Map<string, string>>;

  constructor(lspManager: LSPManager) {
    this.lspManager = lspManager;
    this.codeTemplates = new Map();
    
    this.initializeTemplates();
    logger.info('SymbolEditor initialized');
  }

  /**
   * Initialize code templates for different languages
   */
  private initializeTemplates(): void {
    // TypeScript templates
    const tsTemplates = new Map([
      ['function', `function {{functionName}}({{parameters}}): {{returnType}} {\n  {{body}}\n}`],
      ['class', `class {{className}} {\n  {{methods}}\n}`],
      ['interface', `interface {{interfaceName}} {\n  {{properties}}\n}`],
      ['arrow-function', `const {{functionName}} = ({{parameters}}): {{returnType}} => {\n  {{body}}\n};`],
      ['async-function', `async function {{functionName}}({{parameters}}): Promise<{{returnType}}> {\n  {{body}}\n}`],
      ['method', `{{visibility}} {{functionName}}({{parameters}}): {{returnType}} {\n  {{body}}\n}`]
    ]);
    this.codeTemplates.set('typescript', tsTemplates);

    // JavaScript templates
    const jsTemplates = new Map([
      ['function', `function {{functionName}}({{parameters}}) {\n  {{body}}\n}`],
      ['class', `class {{className}} {\n  {{methods}}\n}`],
      ['arrow-function', `const {{functionName}} = ({{parameters}}) => {\n  {{body}}\n};`],
      ['async-function', `async function {{functionName}}({{parameters}}) {\n  {{body}}\n}`],
      ['method', `{{functionName}}({{parameters}}) {\n  {{body}}\n}`]
    ]);
    this.codeTemplates.set('javascript', jsTemplates);

    // Python templates
    const pyTemplates = new Map([
      ['function', `def {{functionName}}({{parameters}}):\n    {{body}}`],
      ['class', `class {{className}}:\n    {{methods}}`],
      ['async-function', `async def {{functionName}}({{parameters}}):\n    {{body}}`],
      ['method', `def {{functionName}}(self{{comma}}{{parameters}}):\n    {{body}}`]
    ]);
    this.codeTemplates.set('python', pyTemplates);

    logger.info('Code templates initialized', {
      languageCount: this.codeTemplates.size
    });
  }

  /**
   * Perform symbol editing operation
   */
  async editSymbol(request: SymbolEditRequest): Promise<CodeEdit[]> {
    try {
      logger.info('Performing symbol edit', {
        symbolId: request.symbolId,
        operation: request.operation
      });

      // Get symbol information
      const symbol = await this.findSymbol(request.symbolId);
      if (!symbol) {
        throw new SymbolNotFoundError(`Symbol not found: ${request.symbolId}`, request.symbolId);
      }

      // Perform operation based on type
      let edits: CodeEdit[] = [];

      switch (request.operation) {
        case 'extract-function':
          edits = await this.extractFunction(symbol, request.parameters);
          break;
        case 'extract-variable':
          edits = await this.extractVariable(symbol, request.parameters);
          break;
        case 'extract-interface':
          edits = await this.extractInterface(symbol, request.parameters);
          break;
        case 'rename-symbol':
          edits = await this.renameSymbolOperation(symbol, request.parameters);
          break;
        case 'move-symbol':
          edits = await this.moveSymbol(symbol, request.parameters);
          break;
        case 'inline-function':
          edits = await this.inlineFunction(symbol, request.parameters);
          break;
        case 'inline-variable':
          edits = await this.inlineVariable(symbol, request.parameters);
          break;
        case 'change-signature':
          edits = await this.changeSignature(symbol, request.parameters);
          break;
        case 'convert-to-arrow-function':
          edits = await this.convertToArrowFunction(symbol, request.parameters);
          break;
        case 'convert-to-async':
          edits = await this.convertToAsync(symbol, request.parameters);
          break;
        default:
          throw new RefactoringError(`Unsupported operation: ${request.operation}`, request.operation);
      }

      // Apply to references if requested
      if (request.applyToReferences && symbol.references.length > 0) {
        const referenceEdits = await this.applyToReferences(symbol, edits, request.operation);
        edits.push(...referenceEdits);
      }

      logger.info('Symbol edit completed', {
        symbolId: request.symbolId,
        operation: request.operation,
        editCount: edits.length
      });

      return edits;

    } catch (error) {
      logger.error('Symbol edit failed', {
        symbolId: request.symbolId,
        operation: request.operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Rename symbol across all references
   */
  async renameSymbol(
    uri: string,
    line: number,
    character: number,
    newName: string,
    preview: boolean = true
  ): Promise<CodeEdit[]> {
    try {
      logger.info('Renaming symbol', { uri, line, character, newName });

      // Find symbol at position
      const references = await this.lspManager.findReferences(uri, line, character);
      
      if (references.length === 0) {
        throw new SymbolNotFoundError(`No symbol found at position ${line}:${character}`, 'unknown');
      }

      const edits: CodeEdit[] = [];

      // Create edit for each reference
      for (const ref of references) {
        const edit: CodeEdit = {
          id: uuidv4(),
          uri: ref.uri,
          operation: 'rename-symbol',
          range: ref.range,
          newText: newName,
          description: `Rename '${ref.name}' to '${newName}'`,
          metadata: {
            originalName: ref.name,
            preview
          }
        };
        edits.push(edit);
      }

      logger.info('Symbol rename completed', {
        referenceCount: references.length,
        editCount: edits.length
      });

      return edits;

    } catch (error) {
      logger.error('Symbol rename failed', {
        uri, line, character, newName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate code from template
   */
  async generateCode(request: CodeGenerationRequest): Promise<string> {
    try {
      logger.info('Generating code', {
        language: request.language,
        template: request.template
      });

      // Get template
      const languageTemplates = this.codeTemplates.get(request.language);
      if (!languageTemplates) {
        throw new RefactoringError(`No templates available for language: ${request.language}`, 'generate-code');
      }

      let template = languageTemplates.get(request.template);
      if (!template) {
        // Use custom template if provided
        template = request.template;
      }

      // Apply context to template
      const code = this.applyTemplateContext(template, request.context);

      logger.info('Code generation completed', {
        language: request.language,
        generatedLength: code.length
      });

      return code;

    } catch (error) {
      logger.error('Code generation failed', {
        language: request.language,
        template: request.template,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ==================== REFACTORING OPERATIONS ====================

  /**
   * Extract function refactoring
   */
  private async extractFunction(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const functionName = parameters.functionName || 'extractedFunction';
    const returnType = parameters.returnType || 'void';

    // Extract selected code into a new function
    const extractedCode = this.getSymbolContent(symbol);
    const newFunction = this.generateFunctionFromCode(functionName, extractedCode, returnType);

    // Create edits
    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'extract-function',
        range: symbol.range,
        newText: `${functionName}();`,
        description: `Extract code into function '${functionName}'`,
        metadata: { extractedFunction: newFunction }
      }
    ];

    return edits;
  }

  /**
   * Extract variable refactoring
   */
  private async extractVariable(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const variableName = parameters.variableName || 'extractedVar';
    const variableType = parameters.variableType || 'auto';

    const extractedExpression = this.getSymbolContent(symbol);
    const variableDeclaration = this.generateVariableDeclaration(variableName, extractedExpression, variableType);

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'extract-variable',
        range: symbol.range,
        newText: variableName,
        description: `Extract expression into variable '${variableName}'`,
        metadata: { variableDeclaration }
      }
    ];

    return edits;
  }

  /**
   * Extract interface refactoring
   */
  private async extractInterface(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const interfaceName = parameters.interfaceName || 'ExtractedInterface';
    
    // Mock implementation - would analyze class and extract interface
    const interfaceDefinition = `interface ${interfaceName} {\n  // TODO: Add interface members\n}`;

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'extract-interface',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: interfaceDefinition,
        description: `Extract interface '${interfaceName}'`,
        metadata: {}
      }
    ];

    return edits;
  }

  /**
   * Rename symbol operation
   */
  private async renameSymbolOperation(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const newName = parameters.newName || 'renamedSymbol';

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'rename-symbol',
        range: symbol.range,
        newText: newName,
        description: `Rename '${symbol.name}' to '${newName}'`,
        metadata: { originalName: symbol.name }
      }
    ];

    return edits;
  }

  /**
   * Move symbol operation
   */
  private async moveSymbol(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const targetFile = parameters.targetFile || symbol.uri;
    const targetPosition = parameters.targetPosition || { line: 0, character: 0 };

    // Remove from current location
    const removeEdit: CodeEdit = {
      id: uuidv4(),
      uri: symbol.uri,
      operation: 'move-symbol',
      range: symbol.range,
      newText: '',
      description: `Remove '${symbol.name}' from current location`,
      metadata: {}
    };

    // Add to new location
    const addEdit: CodeEdit = {
      id: uuidv4(),
      uri: targetFile,
      operation: 'move-symbol',
      range: { start: targetPosition, end: targetPosition },
      newText: this.getSymbolContent(symbol),
      description: `Add '${symbol.name}' to new location`,
      metadata: {}
    };

    return [removeEdit, addEdit];
  }

  /**
   * Inline function operation
   */
  private async inlineFunction(symbol: any, parameters: any): Promise<CodeEdit[]> {
    // Mock implementation - would replace function calls with function body
    const functionBody = this.extractFunctionBody(symbol);

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'inline-function',
        range: symbol.range,
        newText: functionBody,
        description: `Inline function '${symbol.name}'`,
        metadata: {}
      }
    ];

    return edits;
  }

  /**
   * Inline variable operation
   */
  private async inlineVariable(symbol: any, parameters: any): Promise<CodeEdit[]> {
    // Mock implementation - would replace variable references with value
    const variableValue = this.extractVariableValue(symbol);

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'inline-variable',
        range: symbol.range,
        newText: variableValue,
        description: `Inline variable '${symbol.name}'`,
        metadata: {}
      }
    ];

    return edits;
  }

  /**
   * Change signature operation
   */
  private async changeSignature(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const newSignature = parameters.signature || symbol.name + '()';

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'change-signature',
        range: this.getFunctionSignatureRange(symbol),
        newText: newSignature,
        description: `Change signature of '${symbol.name}'`,
        metadata: { originalSignature: symbol.name }
      }
    ];

    return edits;
  }

  /**
   * Convert to arrow function
   */
  private async convertToArrowFunction(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const arrowFunction = this.convertFunctionToArrow(symbol);

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'convert-to-arrow-function',
        range: symbol.range,
        newText: arrowFunction,
        description: `Convert '${symbol.name}' to arrow function`,
        metadata: {}
      }
    ];

    return edits;
  }

  /**
   * Convert to async function
   */
  private async convertToAsync(symbol: any, parameters: any): Promise<CodeEdit[]> {
    const asyncFunction = this.convertFunctionToAsync(symbol);

    const edits: CodeEdit[] = [
      {
        id: uuidv4(),
        uri: symbol.uri,
        operation: 'convert-to-async',
        range: symbol.range,
        newText: asyncFunction,
        description: `Convert '${symbol.name}' to async function`,
        metadata: {}
      }
    ];

    return edits;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Find symbol by ID
   */
  private async findSymbol(symbolId: string): Promise<any | null> {
    // Mock implementation - would look up symbol in symbol table
    return {
      id: symbolId,
      name: 'mockSymbol',
      uri: 'file:///mock.ts',
      range: {
        start: { line: 10, character: 0 },
        end: { line: 15, character: 20 }
      },
      references: []
    };
  }

  /**
   * Apply edits to references
   */
  private async applyToReferences(symbol: any, edits: CodeEdit[], operation: RefactoringOperation): Promise<CodeEdit[]> {
    const referenceEdits: CodeEdit[] = [];

    for (const ref of symbol.references) {
      // Create corresponding edit for each reference
      const refEdit: CodeEdit = {
        id: uuidv4(),
        uri: ref.uri,
        operation,
        range: ref.range,
        newText: this.transformReferenceText(ref, edits[0]?.newText || ''),
        description: `Update reference to '${symbol.name}'`,
        metadata: { isReference: true }
      };
      referenceEdits.push(refEdit);
    }

    return referenceEdits;
  }

  /**
   * Apply template context
   */
  private applyTemplateContext(template: string, context: any): string {
    let result = template;

    // Replace template variables
    result = result.replace(/{{functionName}}/g, context.functionName || 'newFunction');
    result = result.replace(/{{className}}/g, context.className || 'NewClass');
    result = result.replace(/{{interfaceName}}/g, context.interfaceName || 'NewInterface');
    result = result.replace(/{{returnType}}/g, context.returnType || 'void');
    result = result.replace(/{{visibility}}/g, context.visibility || 'public');

    // Handle parameters
    if (context.parameters && Array.isArray(context.parameters)) {
      const paramString = context.parameters
        .map((p: any) => `${p.name}: ${p.type}`)
        .join(', ');
      result = result.replace(/{{parameters}}/g, paramString);
      result = result.replace(/{{comma}}/g, paramString ? ', ' : '');
    } else {
      result = result.replace(/{{parameters}}/g, '');
      result = result.replace(/{{comma}}/g, '');
    }

    // Default replacements
    result = result.replace(/{{body}}/g, context.body || '// TODO: Implement');
    result = result.replace(/{{methods}}/g, context.methods || '// TODO: Add methods');
    result = result.replace(/{{properties}}/g, context.properties || '// TODO: Add properties');

    return result;
  }

  /**
   * Get symbol content (mock)
   */
  private getSymbolContent(symbol: any): string {
    return symbol.metadata?.content || `// Content of ${symbol.name}`;
  }

  /**
   * Generate function from code
   */
  private generateFunctionFromCode(functionName: string, code: string, returnType: string): string {
    return `function ${functionName}(): ${returnType} {\n  ${code}\n}`;
  }

  /**
   * Generate variable declaration
   */
  private generateVariableDeclaration(variableName: string, expression: string, type: string): string {
    if (type === 'auto') {
      return `const ${variableName} = ${expression};`;
    }
    return `const ${variableName}: ${type} = ${expression};`;
  }

  /**
   * Extract function body (mock)
   */
  private extractFunctionBody(symbol: any): string {
    return `// Inlined body of ${symbol.name}`;
  }

  /**
   * Extract variable value (mock)
   */
  private extractVariableValue(symbol: any): string {
    return `/* value of ${symbol.name} */`;
  }

  /**
   * Get function signature range (mock)
   */
  private getFunctionSignatureRange(symbol: any): any {
    return {
      start: symbol.range.start,
      end: { line: symbol.range.start.line, character: symbol.range.start.character + symbol.name.length }
    };
  }

  /**
   * Convert function to arrow function (mock)
   */
  private convertFunctionToArrow(symbol: any): string {
    return `const ${symbol.name} = () => {\n  // Arrow function body\n};`;
  }

  /**
   * Convert function to async (mock)
   */
  private convertFunctionToAsync(symbol: any): string {
    return `async function ${symbol.name}() {\n  // Async function body\n}`;
  }

  /**
   * Transform reference text
   */
  private transformReferenceText(reference: any, newText: string): string {
    // Simple transformation - would be more sophisticated in production
    return newText;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.codeTemplates.clear();
      logger.info('SymbolEditor cleanup completed');
    } catch (error) {
      logger.error('Error during SymbolEditor cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}