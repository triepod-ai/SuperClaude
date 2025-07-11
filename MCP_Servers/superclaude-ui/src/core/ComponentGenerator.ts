import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import * as parser from '@babel/parser';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { format } from 'prettier';
import {
  ComponentRequirements,
  GeneratedComponent,
  ComponentGenerationRequest,
  SupportedFramework,
  ComponentType,
  ComponentComplexity,
  ComponentCategory,
  GeneratedComponentSchema
} from '../types';

export interface ComponentGeneratorOptions {
  defaultFramework?: SupportedFramework;
  enableOptimization?: boolean;
  enableTypeGeneration?: boolean;
  enableTestGeneration?: boolean;
  enableStoryGeneration?: boolean;
  prettierConfig?: any;
}

interface ComponentTemplate {
  framework: SupportedFramework;
  type: ComponentType;
  template: string;
  complexity: ComponentComplexity;
  category: ComponentCategory;
  dependencies: string[];
  props: Record<string, any>;
}

export class ComponentGenerator extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<ComponentGeneratorOptions>;
  private templates: Map<string, ComponentTemplate> = new Map();
  private generatedComponents: Map<string, GeneratedComponent> = new Map();
  private metrics: {
    componentsGenerated: number;
    frameworkUsage: Record<string, number>;
    typeUsage: Record<string, number>;
    complexityDistribution: Record<string, number>;
    averageGenerationTime: number;
  };

  constructor(options: ComponentGeneratorOptions = {}) {
    super();
    this.logger = new Logger('ComponentGenerator');
    this.options = {
      defaultFramework: options.defaultFramework ?? 'react',
      enableOptimization: options.enableOptimization ?? true,
      enableTypeGeneration: options.enableTypeGeneration ?? true,
      enableTestGeneration: options.enableTestGeneration ?? false,
      enableStoryGeneration: options.enableStoryGeneration ?? false,
      prettierConfig: options.prettierConfig ?? {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        tabWidth: 2
      }
    };
    this.metrics = {
      componentsGenerated: 0,
      frameworkUsage: {},
      typeUsage: {},
      complexityDistribution: {},
      averageGenerationTime: 0
    };

    this.initializeTemplates();
  }

  /**
   * Generate a component based on requirements
   */
  async generateComponent(request: ComponentGenerationRequest): Promise<GeneratedComponent> {
    const startTime = Date.now();
    
    try {
      const { requirements } = request;
      
      // Validate requirements
      if (!this.isTypeSupported(requirements.type, requirements.framework)) {
        throw new Error(`Component type ${requirements.type} not supported for ${requirements.framework}`);
      }

      // Determine component metadata
      const complexity = this.calculateComplexity(requirements);
      const category = this.categorizeComponent(requirements.type);
      
      // Generate component code
      const componentCode = await this.generateComponentCode(requirements, complexity);
      
      // Generate additional files if enabled
      const stylesCode = await this.generateStyles(requirements);
      const typesCode = this.options.enableTypeGeneration 
        ? await this.generateTypes(requirements) 
        : undefined;
      const testsCode = this.options.enableTestGeneration 
        ? await this.generateTests(requirements) 
        : undefined;
      const storiesCode = this.options.enableStoryGeneration 
        ? await this.generateStories(requirements) 
        : undefined;
      const docsCode = await this.generateDocumentation(requirements);

      // Create component object
      const component: GeneratedComponent = {
        id: uuidv4(),
        name: requirements.name,
        type: requirements.type,
        framework: requirements.framework,
        category,
        complexity,
        code: {
          component: componentCode,
          styles: stylesCode,
          types: typesCode,
          tests: testsCode,
          stories: storiesCode,
          documentation: docsCode
        },
        props: this.extractProps(requirements),
        exports: this.determineExports(requirements),
        dependencies: this.calculateDependencies(requirements),
        accessibility: await this.generateAccessibilityInfo(requirements),
        responsive: this.generateResponsiveInfo(requirements),
        performance: this.generatePerformanceInfo(requirements, complexity),
        metadata: {
          generated: new Date(),
          version: '1.0.0',
          designSystem: request.designSystem,
          tags: this.generateTags(requirements)
        }
      };

      // Validate generated component
      const validatedComponent = GeneratedComponentSchema.parse(component);
      
      // Store component
      this.generatedComponents.set(validatedComponent.id, validatedComponent);
      
      // Update metrics
      const generationTime = Date.now() - startTime;
      this.updateMetrics(requirements.framework, requirements.type, complexity, generationTime);

      this.emit('componentGenerated', {
        componentId: validatedComponent.id,
        name: requirements.name,
        framework: requirements.framework,
        type: requirements.type,
        complexity,
        generationTime
      });

      this.logger.info(`Generated ${requirements.framework} ${requirements.type} component: ${requirements.name} (${generationTime}ms)`);

      return validatedComponent;
    } catch (error) {
      this.logger.error('Failed to generate component:', error);
      throw error;
    }
  }

  /**
   * Get generated component by ID
   */
  getComponent(componentId: string): GeneratedComponent | undefined {
    return this.generatedComponents.get(componentId);
  }

  /**
   * Get all generated components
   */
  getComponents(filter?: {
    framework?: SupportedFramework;
    type?: ComponentType;
    category?: ComponentCategory;
    complexity?: ComponentComplexity;
  }): GeneratedComponent[] {
    let components = Array.from(this.generatedComponents.values());

    if (filter) {
      if (filter.framework) {
        components = components.filter(c => c.framework === filter.framework);
      }
      if (filter.type) {
        components = components.filter(c => c.type === filter.type);
      }
      if (filter.category) {
        components = components.filter(c => c.category === filter.category);
      }
      if (filter.complexity) {
        components = components.filter(c => c.complexity === filter.complexity);
      }
    }

    return components;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Generate component code based on framework and type
   */
  private async generateComponentCode(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): Promise<string> {
    const { framework, type, name } = requirements;
    
    switch (framework) {
      case 'react':
        return this.generateReactComponent(requirements, complexity);
      case 'vue':
        return this.generateVueComponent(requirements, complexity);
      case 'angular':
        return this.generateAngularComponent(requirements, complexity);
      case 'vanilla':
        return this.generateVanillaComponent(requirements, complexity);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Generate React component
   */
  private async generateReactComponent(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): Promise<string> {
    const { name, type, props = {}, behavior = {} } = requirements;
    const isTypeScript = this.options.enableTypeGeneration;
    
    // Build imports
    const imports = ['React'];
    if (behavior.stateful) imports.push('useState');
    if (behavior.interactive) imports.push('useCallback');
    if (requirements.responsive?.enabled) imports.push('useEffect');

    // Build props interface
    const propsInterface = isTypeScript ? this.buildPropsInterface(name, props) : '';

    // Build component body
    const componentBody = this.buildReactComponentBody(requirements, complexity);

    // Build export
    const exportStatement = `export default ${name};`;

    const code = `
import { ${imports.join(', ')} } from 'react';
${this.buildAdditionalImports(requirements)}

${propsInterface}

const ${name}: React.FC<${isTypeScript ? `${name}Props` : 'any'}> = (${this.buildPropsDestructuring(props)}) => {
${componentBody}
};

${exportStatement}
`;

    return this.formatCode(code);
  }

  /**
   * Generate Vue component
   */
  private async generateVueComponent(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): Promise<string> {
    const { name, type, props = {}, behavior = {} } = requirements;

    const template = this.buildVueTemplate(requirements, complexity);
    const script = this.buildVueScript(requirements, complexity);
    const style = this.buildVueStyle(requirements);

    const code = `
<template>
${template}
</template>

<script>
${script}
</script>

<style scoped>
${style}
</style>
`;

    return this.formatCode(code, 'vue');
  }

  /**
   * Generate Angular component
   */
  private async generateAngularComponent(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): Promise<string> {
    const { name, type, props = {}, behavior = {} } = requirements;

    const selector = this.kebabCase(name);
    const className = this.pascalCase(name) + 'Component';

    const code = `
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-${selector}',
  template: \`
${this.buildAngularTemplate(requirements, complexity)}
  \`,
  styleUrls: ['./${selector}.component.css']
})
export class ${className} {
${this.buildAngularProperties(requirements)}

${this.buildAngularMethods(requirements, complexity)}
}
`;

    return this.formatCode(code);
  }

  /**
   * Generate vanilla JavaScript component
   */
  private async generateVanillaComponent(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): Promise<string> {
    const { name, type, props = {}, behavior = {} } = requirements;

    const code = `
class ${name} {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...this.defaultOptions, ...options };
    this.init();
  }

  get defaultOptions() {
    return ${JSON.stringify(this.buildDefaultOptions(requirements), null, 2)};
  }

  init() {
${this.buildVanillaInit(requirements, complexity)}
  }

${this.buildVanillaMethods(requirements, complexity)}

  destroy() {
    // Cleanup event listeners and references
    this.element = null;
    this.options = null;
  }
}

export default ${name};
`;

    return this.formatCode(code);
  }

  /**
   * Generate styles for component
   */
  private async generateStyles(requirements: ComponentRequirements): Promise<string | undefined> {
    if (!requirements.styling) return undefined;

    const { approach } = requirements.styling;
    
    switch (approach) {
      case 'css-modules':
        return this.generateCSSModules(requirements);
      case 'styled-components':
        return this.generateStyledComponents(requirements);
      case 'tailwind':
        return this.generateTailwindClasses(requirements);
      case 'vanilla-css':
        return this.generateVanillaCSS(requirements);
      default:
        return this.generateVanillaCSS(requirements);
    }
  }

  /**
   * Generate TypeScript types
   */
  private async generateTypes(requirements: ComponentRequirements): Promise<string> {
    const { name, props = {}, framework } = requirements;

    let types = '';

    // Generate props interface
    types += this.buildPropsInterface(name, props);

    // Generate framework-specific types
    if (framework === 'react') {
      types += `\nexport type ${name}Ref = React.RefObject<HTMLElement>;`;
    }

    // Generate event types if interactive
    if (requirements.behavior?.interactive && requirements.behavior?.events) {
      types += this.buildEventTypes(name, requirements.behavior.events);
    }

    return this.formatCode(types);
  }

  /**
   * Generate test file
   */
  private async generateTests(requirements: ComponentRequirements): Promise<string> {
    const { name, framework, behavior = {} } = requirements;

    switch (framework) {
      case 'react':
        return this.generateReactTests(requirements);
      case 'vue':
        return this.generateVueTests(requirements);
      case 'angular':
        return this.generateAngularTests(requirements);
      default:
        return this.generateVanillaTests(requirements);
    }
  }

  /**
   * Generate Storybook stories
   */
  private async generateStories(requirements: ComponentRequirements): Promise<string> {
    const { name, framework, props = {} } = requirements;

    const code = `
import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: ${JSON.stringify(this.buildStorybookArgTypes(props), null, 2)},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: ${JSON.stringify(this.buildDefaultProps(props), null, 2)},
};

${this.buildAdditionalStories(requirements)}
`;

    return this.formatCode(code);
  }

  /**
   * Generate documentation
   */
  private async generateDocumentation(requirements: ComponentRequirements): Promise<string> {
    const { name, type, description, props = {}, behavior = {} } = requirements;

    const doc = `
# ${name}

${description || `A ${type} component.`}

## Props

${this.buildPropsDocumentation(props)}

## Usage

\`\`\`jsx
import { ${name} } from './components';

<${name}${this.buildUsageExample(props)} />
\`\`\`

${behavior.interactive ? this.buildInteractionDocumentation(behavior) : ''}

## Accessibility

This component follows WCAG 2.1 AA guidelines and includes:

- Proper semantic markup
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
`;

    return doc.trim();
  }

  /**
   * Helper methods for building component parts
   */
  private buildPropsInterface(name: string, props: Record<string, any>): string {
    const interfaceName = `${name}Props`;
    const propEntries = Object.entries(props).map(([key, config]) => {
      const optional = config.required === false ? '?' : '';
      const type = this.mapPropTypeToTypeScript(config.type);
      const description = config.description ? `/** ${config.description} */\n  ` : '';
      return `${description}${key}${optional}: ${type};`;
    });

    return `
interface ${interfaceName} {
  ${propEntries.join('\n  ')}
}`;
  }

  private buildReactComponentBody(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): string {
    const { type, behavior = {}, responsive = {} } = requirements;
    
    let body = '';

    // State management
    if (behavior.stateful) {
      body += '  const [state, setState] = useState({});\n';
    }

    // Event handlers
    if (behavior.interactive && behavior.events) {
      body += this.buildEventHandlers(behavior.events);
    }

    // Responsive logic
    if (responsive.enabled) {
      body += '  const [isMobile, setIsMobile] = useState(false);\n';
      body += `
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
`;
    }

    // Component JSX
    body += '\n  return (\n';
    body += this.buildComponentJSX(requirements, complexity);
    body += '\n  );';

    return body;
  }

  private buildComponentJSX(
    requirements: ComponentRequirements,
    complexity: ComponentComplexity
  ): string {
    const { type, name } = requirements;
    
    switch (type) {
      case 'button':
        return this.buildButtonJSX(requirements);
      case 'input':
        return this.buildInputJSX(requirements);
      case 'modal':
        return this.buildModalJSX(requirements);
      case 'card':
        return this.buildCardJSX(requirements);
      case 'form':
        return this.buildFormJSX(requirements);
      default:
        return `    <div className="${this.kebabCase(name)}">\n      ${name} Component\n    </div>`;
    }
  }

  private buildButtonJSX(requirements: ComponentRequirements): string {
    const { name } = requirements;
    return `    <button
      className="${this.kebabCase(name)}"
      onClick={handleClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>`;
  }

  private buildInputJSX(requirements: ComponentRequirements): string {
    const { name } = requirements;
    return `    <div className="${this.kebabCase(name)}-wrapper">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className="${this.kebabCase(name)}"
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-describedby={helperTextId}
        {...rest}
      />
      {helperText && <span id={helperTextId} className="helper-text">{helperText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>`;
  }

  private buildModalJSX(requirements: ComponentRequirements): string {
    const { name } = requirements;
    return `    <>
      {isOpen && (
        <div className="${this.kebabCase(name)}-overlay" onClick={handleOverlayClick}>
          <div className="${this.kebabCase(name)}" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="${this.kebabCase(name)}-header">
              {title && <h2 id={titleId}>{title}</h2>}
              <button onClick={onClose} aria-label="Close">×</button>
            </div>
            <div className="${this.kebabCase(name)}-content">
              {children}
            </div>
            {footer && (
              <div className="${this.kebabCase(name)}-footer">
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
    </>`;
  }

  private buildCardJSX(requirements: ComponentRequirements): string {
    const { name } = requirements;
    return `    <div className="${this.kebabCase(name)}">
      {header && (
        <div className="${this.kebabCase(name)}-header">
          {header}
        </div>
      )}
      <div className="${this.kebabCase(name)}-content">
        {children}
      </div>
      {footer && (
        <div className="${this.kebabCase(name)}-footer">
          {footer}
        </div>
      )}
    </div>`;
  }

  private buildFormJSX(requirements: ComponentRequirements): string {
    const { name } = requirements;
    return `    <form className="${this.kebabCase(name)}" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={disabled}>
        {children}
      </fieldset>
      {submitButton && (
        <div className="${this.kebabCase(name)}-actions">
          {submitButton}
        </div>
      )}
    </form>`;
  }

  /**
   * Utility methods
   */
  private initializeTemplates(): void {
    // Initialize component templates for different frameworks and types
    // This would be expanded with actual templates
  }

  private isTypeSupported(type: ComponentType, framework: SupportedFramework): boolean {
    // Check if component type is supported for the framework
    return true; // Simplified for now
  }

  private calculateComplexity(requirements: ComponentRequirements): ComponentComplexity {
    let score = 0;
    
    // Base complexity by type
    const typeComplexity: Record<string, number> = {
      'button': 1, 'input': 2, 'select': 2, 'checkbox': 1,
      'form': 4, 'modal': 4, 'table': 5, 'chart': 5,
      'carousel': 4, 'calendar': 5, 'datepicker': 4
    };
    
    score += typeComplexity[requirements.type] || 2;
    
    // Interactive behavior
    if (requirements.behavior?.interactive) score += 1;
    if (requirements.behavior?.stateful) score += 1;
    if (requirements.behavior?.events && requirements.behavior.events.length > 2) score += 1;
    
    // Responsive design
    if (requirements.responsive?.enabled) score += 1;
    
    // Props complexity
    const propsCount = Object.keys(requirements.props || {}).length;
    if (propsCount > 5) score += 1;
    if (propsCount > 10) score += 1;

    if (score <= 2) return 'simple';
    if (score <= 4) return 'moderate';
    return 'complex';
  }

  private categorizeComponent(type: ComponentType): ComponentCategory {
    const categoryMap: Record<ComponentType, ComponentCategory> = {
      'button': 'input', 'input': 'input', 'textarea': 'input', 'select': 'input',
      'checkbox': 'input', 'radio': 'input', 'form': 'form',
      'modal': 'overlay', 'dialog': 'overlay', 'tooltip': 'overlay', 'popover': 'overlay',
      'card': 'display', 'table': 'data', 'list': 'data', 'grid': 'layout',
      'header': 'navigation', 'footer': 'navigation', 'sidebar': 'navigation',
      'alert': 'feedback', 'toast': 'feedback', 'progress': 'feedback',
      'spinner': 'feedback', 'avatar': 'display', 'badge': 'display',
      'accordion': 'interaction', 'tabs': 'interaction', 'carousel': 'media',
      'gallery': 'media', 'chart': 'data', 'calendar': 'input',
      'datepicker': 'input', 'pagination': 'navigation', 'breadcrumb': 'navigation',
      'stepper': 'navigation', 'slider': 'input', 'toggle': 'input',
      'rating': 'input', 'search': 'input', 'dropdown': 'overlay',
      'layout': 'layout', 'navigation': 'navigation', 'banner': 'display',
      'chip': 'display', 'tag': 'display'
    };
    
    return categoryMap[type] || 'display';
  }

  private extractProps(requirements: ComponentRequirements): Record<string, any> {
    return requirements.props || {};
  }

  private determineExports(requirements: ComponentRequirements): string[] {
    const exports = [requirements.name];
    
    if (this.options.enableTypeGeneration) {
      exports.push(`${requirements.name}Props`);
    }
    
    return exports;
  }

  private calculateDependencies(requirements: ComponentRequirements): string[] {
    const deps: string[] = [];
    
    // Framework dependencies
    if (requirements.framework === 'react') {
      deps.push('react');
    }
    
    // Styling dependencies
    if (requirements.styling?.approach === 'styled-components') {
      deps.push('styled-components');
    }
    
    return deps;
  }

  private async generateAccessibilityInfo(requirements: ComponentRequirements) {
    return {
      compliant: true,
      features: ['keyboard-navigation', 'screen-reader', 'aria-labels'],
      ariaLabels: {},
      keyboardSupport: true
    };
  }

  private generateResponsiveInfo(requirements: ComponentRequirements) {
    return {
      enabled: requirements.responsive?.enabled ?? true,
      breakpoints: requirements.responsive?.breakpoints || ['sm', 'md', 'lg'],
      strategy: requirements.responsive?.behavior || 'mobile-first'
    };
  }

  private generatePerformanceInfo(requirements: ComponentRequirements, complexity: ComponentComplexity) {
    return {
      optimized: this.options.enableOptimization,
      bundleSize: this.estimateBundleSize(complexity),
      renderComplexity: complexity === 'simple' ? 'low' : complexity === 'moderate' ? 'medium' : 'high'
    };
  }

  private generateTags(requirements: ComponentRequirements): string[] {
    const tags = [requirements.type, requirements.framework];
    
    if (requirements.behavior?.interactive) tags.push('interactive');
    if (requirements.responsive?.enabled) tags.push('responsive');
    
    return tags;
  }

  private estimateBundleSize(complexity: ComponentComplexity): number {
    const baseSize = { simple: 2, moderate: 5, complex: 12 };
    return baseSize[complexity] * 1024; // KB to bytes
  }

  private updateMetrics(
    framework: SupportedFramework,
    type: ComponentType,
    complexity: ComponentComplexity,
    generationTime: number
  ): void {
    this.metrics.componentsGenerated++;
    
    // Update framework usage
    this.metrics.frameworkUsage[framework] = (this.metrics.frameworkUsage[framework] || 0) + 1;
    
    // Update type usage
    this.metrics.typeUsage[type] = (this.metrics.typeUsage[type] || 0) + 1;
    
    // Update complexity distribution
    this.metrics.complexityDistribution[complexity] = 
      (this.metrics.complexityDistribution[complexity] || 0) + 1;
    
    // Update average generation time
    this.metrics.averageGenerationTime = 
      (this.metrics.averageGenerationTime * (this.metrics.componentsGenerated - 1) + generationTime) /
      this.metrics.componentsGenerated;
  }

  private async formatCode(code: string, parser: string = 'typescript'): Promise<string> {
    try {
      return format(code, { ...this.options.prettierConfig, parser });
    } catch (error) {
      this.logger.warn('Failed to format code:', error);
      return code;
    }
  }

  private kebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  }

  private pascalCase(str: string): string {
    return str.replace(/^[a-z]/, letter => letter.toUpperCase());
  }

  private mapPropTypeToTypeScript(type: any): string {
    if (typeof type === 'string') {
      switch (type) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'array': return 'any[]';
        case 'object': return 'Record<string, any>';
        case 'function': return '() => void';
        default: return 'any';
      }
    }
    return 'any';
  }

  // Additional helper methods would be implemented here...
  private buildPropsDestructuring(props: Record<string, any>): string {
    const propKeys = Object.keys(props);
    return `{ ${propKeys.join(', ')}, ...rest }`;
  }

  private buildAdditionalImports(requirements: ComponentRequirements): string {
    return ''; // Implementation would add framework-specific imports
  }

  private buildVueTemplate(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return `  <div class="${this.kebabCase(requirements.name)}">\n    <!-- Vue template -->\n  </div>`;
  }

  private buildVueScript(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return `export default {\n  name: '${requirements.name}',\n  props: {},\n  data() {\n    return {};\n  }\n}`;
  }

  private buildVueStyle(requirements: ComponentRequirements): string {
    return `.${this.kebabCase(requirements.name)} {\n  /* Component styles */\n}`;
  }

  private buildAngularTemplate(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return `    <div class="${this.kebabCase(requirements.name)}">\n      <!-- Angular template -->\n    </div>`;
  }

  private buildAngularProperties(requirements: ComponentRequirements): string {
    return '  // Component properties';
  }

  private buildAngularMethods(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return '  // Component methods';
  }

  private buildDefaultOptions(requirements: ComponentRequirements): Record<string, any> {
    return {};
  }

  private buildVanillaInit(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return '    // Initialize component';
  }

  private buildVanillaMethods(requirements: ComponentRequirements, complexity: ComponentComplexity): string {
    return '  // Component methods';
  }

  private generateCSSModules(requirements: ComponentRequirements): string {
    return `.${this.kebabCase(requirements.name)} {\n  /* CSS Modules styles */\n}`;
  }

  private generateStyledComponents(requirements: ComponentRequirements): string {
    return `import styled from 'styled-components';\n\nexport const Styled${requirements.name} = styled.div\`\n  /* Styled component styles */\n\`;`;
  }

  private generateTailwindClasses(requirements: ComponentRequirements): string {
    return 'flex items-center justify-center p-4 bg-blue-500 text-white rounded';
  }

  private generateVanillaCSS(requirements: ComponentRequirements): string {
    return `.${this.kebabCase(requirements.name)} {\n  /* Vanilla CSS styles */\n}`;
  }

  private buildEventTypes(name: string, events: string[]): string {
    return events.map(event => 
      `export type ${name}${this.pascalCase(event)}Handler = (event: Event) => void;`
    ).join('\n');
  }

  private generateReactTests(requirements: ComponentRequirements): string {
    return `import { render, screen } from '@testing-library/react';\nimport { ${requirements.name} } from './${requirements.name}';\n\ndescribe('${requirements.name}', () => {\n  it('renders correctly', () => {\n    render(<${requirements.name} />);\n    // Add test assertions\n  });\n});`;
  }

  private generateVueTests(requirements: ComponentRequirements): string {
    return `import { mount } from '@vue/test-utils';\nimport ${requirements.name} from './${requirements.name}.vue';\n\ndescribe('${requirements.name}', () => {\n  it('renders correctly', () => {\n    const wrapper = mount(${requirements.name});\n    // Add test assertions\n  });\n});`;
  }

  private generateAngularTests(requirements: ComponentRequirements): string {
    return `import { ComponentFixture, TestBed } from '@angular/core/testing';\nimport { ${requirements.name}Component } from './${this.kebabCase(requirements.name)}.component';\n\ndescribe('${requirements.name}Component', () => {\n  let component: ${requirements.name}Component;\n  let fixture: ComponentFixture<${requirements.name}Component>;\n\n  beforeEach(() => {\n    TestBed.configureTestingModule({\n      declarations: [${requirements.name}Component]\n    });\n    fixture = TestBed.createComponent(${requirements.name}Component);\n    component = fixture.componentInstance;\n  });\n\n  it('should create', () => {\n    expect(component).toBeTruthy();\n  });\n});`;
  }

  private generateVanillaTests(requirements: ComponentRequirements): string {
    return `import ${requirements.name} from './${requirements.name}';\n\ndescribe('${requirements.name}', () => {\n  let element;\n  let component;\n\n  beforeEach(() => {\n    element = document.createElement('div');\n    component = new ${requirements.name}(element);\n  });\n\n  afterEach(() => {\n    component.destroy();\n  });\n\n  it('initializes correctly', () => {\n    expect(component).toBeDefined();\n  });\n});`;
  }

  private buildStorybookArgTypes(props: Record<string, any>): Record<string, any> {
    const argTypes: Record<string, any> = {};
    
    for (const [key, config] of Object.entries(props)) {
      argTypes[key] = {
        description: config.description,
        control: this.getStorybookControl(config.type)
      };
    }
    
    return argTypes;
  }

  private getStorybookControl(type: any): any {
    switch (type) {
      case 'string': return { type: 'text' };
      case 'number': return { type: 'number' };
      case 'boolean': return { type: 'boolean' };
      default: return { type: 'object' };
    }
  }

  private buildDefaultProps(props: Record<string, any>): Record<string, any> {
    const defaults: Record<string, any> = {};
    
    for (const [key, config] of Object.entries(props)) {
      if (config.default !== undefined) {
        defaults[key] = config.default;
      }
    }
    
    return defaults;
  }

  private buildAdditionalStories(requirements: ComponentRequirements): string {
    // Generate additional story variants based on component type
    return '';
  }

  private buildPropsDocumentation(props: Record<string, any>): string {
    const entries = Object.entries(props).map(([key, config]) => {
      const required = config.required !== false ? 'Yes' : 'No';
      const type = config.type || 'any';
      const defaultValue = config.default !== undefined ? String(config.default) : '-';
      const description = config.description || '';
      
      return `| ${key} | ${type} | ${required} | ${defaultValue} | ${description} |`;
    });

    return `| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
${entries.join('\n')}`;
  }

  private buildUsageExample(props: Record<string, any>): string {
    const propExamples = Object.entries(props)
      .filter(([, config]) => config.default !== undefined)
      .map(([key, config]) => `${key}={${JSON.stringify(config.default)}}`)
      .join(' ');
    
    return propExamples ? ` ${propExamples}` : '';
  }

  private buildInteractionDocumentation(behavior: any): string {
    return `
## Interactions

${behavior.events ? `### Events
${behavior.events.map((event: string) => `- \`${event}\``).join('\n')}` : ''}
`;
  }

  private buildEventHandlers(events: string[]): string {
    return events.map(event => 
      `  const handle${this.pascalCase(event)} = useCallback(() => {\n    // Handle ${event}\n  }, []);\n`
    ).join('');
  }
}