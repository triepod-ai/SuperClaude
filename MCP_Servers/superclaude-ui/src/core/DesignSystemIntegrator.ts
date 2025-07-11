import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  DesignSystem,
  DesignTokens,
  GeneratedComponent,
  DesignSystemIntegrationRequest,
  SupportedFramework,
  DesignSystemSchema
} from '../types';

export interface DesignSystemIntegratorOptions {
  enableTokenGeneration?: boolean;
  enableThemeVariants?: boolean;
  strictModeEnabled?: boolean;
  preserveCustomizations?: boolean;
}

export interface TokenMapping {
  componentProperty: string;
  tokenPath: string;
  fallback?: string;
  transform?: (value: any) => any;
}

export interface ThemeVariant {
  id: string;
  name: string;
  tokens: Partial<DesignTokens>;
  conditions?: Record<string, any>;
}

export class DesignSystemIntegrator extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<DesignSystemIntegratorOptions>;
  private designSystems: Map<string, DesignSystem> = new Map();
  private tokenMappings: Map<string, TokenMapping[]> = new Map(); // componentType -> mappings
  private themeVariants: Map<string, ThemeVariant[]> = new Map(); // designSystemId -> variants
  private integrationHistory: Map<string, any> = new Map();
  private metrics: {
    integrationsPerformed: number;
    designSystemsRegistered: number;
    tokensApplied: number;
    themesGenerated: number;
    conflictsResolved: number;
  };

  constructor(options: DesignSystemIntegratorOptions = {}) {
    super();
    this.logger = new Logger('DesignSystemIntegrator');
    this.options = {
      enableTokenGeneration: options.enableTokenGeneration ?? true,
      enableThemeVariants: options.enableThemeVariants ?? true,
      strictModeEnabled: options.strictModeEnabled ?? false,
      preserveCustomizations: options.preserveCustomizations ?? true
    };
    this.metrics = {
      integrationsPerformed: 0,
      designSystemsRegistered: 0,
      tokensApplied: 0,
      themesGenerated: 0,
      conflictsResolved: 0
    };

    this.initializeDefaultMappings();
  }

  /**
   * Register a design system
   */
  async registerDesignSystem(designSystem: DesignSystem): Promise<void> {
    try {
      const validated = DesignSystemSchema.parse(designSystem);
      this.designSystems.set(validated.id, validated);
      this.metrics.designSystemsRegistered++;

      // Initialize token mappings for this design system
      await this.analyzeDesignSystemTokens(validated);

      this.emit('designSystemRegistered', {
        designSystemId: validated.id,
        name: validated.name,
        framework: validated.framework
      });

      this.logger.info(`Registered design system: ${validated.name} (${validated.framework})`);
    } catch (error) {
      this.logger.error('Failed to register design system:', error);
      throw error;
    }
  }

  /**
   * Integrate component with design system
   */
  async integrateComponent(request: DesignSystemIntegrationRequest): Promise<GeneratedComponent> {
    const { componentId, designSystemId, overrides = {}, preserve = [] } = request;

    try {
      const designSystem = this.designSystems.get(designSystemId);
      if (!designSystem) {
        throw new Error(`Design system ${designSystemId} not found`);
      }

      // Get component (this would come from ComponentGenerator)
      const component = await this.getComponentById(componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      // Validate framework compatibility
      if (component.framework !== designSystem.framework) {
        throw new Error(
          `Framework mismatch: component (${component.framework}) vs design system (${designSystem.framework})`
        );
      }

      // Apply design system integration
      const integratedComponent = await this.applyDesignSystemToComponent(
        component,
        designSystem,
        overrides,
        preserve
      );

      // Store integration history
      this.integrationHistory.set(componentId, {
        designSystemId,
        timestamp: new Date(),
        overrides,
        preserve,
        tokensApplied: this.calculateTokensApplied(integratedComponent, designSystem)
      });

      this.metrics.integrationsPerformed++;
      this.metrics.tokensApplied += this.calculateTokensApplied(integratedComponent, designSystem);

      this.emit('componentIntegrated', {
        componentId,
        designSystemId,
        tokensApplied: this.calculateTokensApplied(integratedComponent, designSystem)
      });

      this.logger.info(`Integrated component ${component.name} with design system ${designSystem.name}`);

      return integratedComponent;
    } catch (error) {
      this.logger.error('Failed to integrate component:', error);
      throw error;
    }
  }

  /**
   * Generate theme variants for a design system
   */
  async generateThemeVariants(
    designSystemId: string,
    variants: Array<{
      name: string;
      tokenOverrides: Partial<DesignTokens>;
      conditions?: Record<string, any>;
    }>
  ): Promise<ThemeVariant[]> {
    const designSystem = this.designSystems.get(designSystemId);
    if (!designSystem) {
      throw new Error(`Design system ${designSystemId} not found`);
    }

    try {
      const themeVariants: ThemeVariant[] = [];

      for (const variant of variants) {
        const themeVariant: ThemeVariant = {
          id: uuidv4(),
          name: variant.name,
          tokens: this.mergeTokens(designSystem.tokens, variant.tokenOverrides),
          conditions: variant.conditions
        };

        themeVariants.push(themeVariant);
      }

      // Store theme variants
      this.themeVariants.set(designSystemId, themeVariants);
      this.metrics.themesGenerated += themeVariants.length;

      this.emit('themeVariantsGenerated', {
        designSystemId,
        variantCount: themeVariants.length
      });

      this.logger.info(`Generated ${themeVariants.length} theme variants for design system ${designSystem.name}`);

      return themeVariants;
    } catch (error) {
      this.logger.error('Failed to generate theme variants:', error);
      throw error;
    }
  }

  /**
   * Apply design tokens to component styles
   */
  async applyDesignTokens(
    componentCode: string,
    designSystemId: string,
    framework: SupportedFramework,
    componentType?: string
  ): Promise<string> {
    const designSystem = this.designSystems.get(designSystemId);
    if (!designSystem) {
      throw new Error(`Design system ${designSystemId} not found`);
    }

    try {
      let updatedCode = componentCode;

      // Get token mappings for component type
      const mappings = componentType ? this.tokenMappings.get(componentType) || [] : [];

      // Apply framework-specific token integration
      switch (framework) {
        case 'react':
          updatedCode = await this.applyReactTokens(updatedCode, designSystem, mappings);
          break;
        case 'vue':
          updatedCode = await this.applyVueTokens(updatedCode, designSystem, mappings);
          break;
        case 'angular':
          updatedCode = await this.applyAngularTokens(updatedCode, designSystem, mappings);
          break;
        case 'vanilla':
          updatedCode = await this.applyVanillaTokens(updatedCode, designSystem, mappings);
          break;
      }

      return updatedCode;
    } catch (error) {
      this.logger.error('Failed to apply design tokens:', error);
      throw error;
    }
  }

  /**
   * Validate design system compliance
   */
  async validateCompliance(
    componentId: string,
    designSystemId: string
  ): Promise<{
    compliant: boolean;
    score: number;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      category: string;
      description: string;
      suggestion?: string;
    }>;
    recommendations: string[];
  }> {
    const designSystem = this.designSystems.get(designSystemId);
    if (!designSystem) {
      throw new Error(`Design system ${designSystemId} not found`);
    }

    const component = await this.getComponentById(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    try {
      const issues: any[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check token usage
      const tokenUsage = await this.analyzeTokenUsage(component, designSystem);
      if (tokenUsage.missingTokens.length > 0) {
        issues.push({
          type: 'warning',
          category: 'tokens',
          description: `Missing design tokens: ${tokenUsage.missingTokens.join(', ')}`,
          suggestion: 'Apply design system tokens for consistent styling'
        });
        score -= tokenUsage.missingTokens.length * 5;
      }

      // Check naming conventions
      const namingCompliance = await this.checkNamingConventions(component, designSystem);
      if (!namingCompliance.compliant) {
        issues.push({
          type: 'info',
          category: 'naming',
          description: 'Component naming does not follow design system conventions',
          suggestion: namingCompliance.suggestion
        });
        score -= 10;
      }

      // Check accessibility compliance
      if (!component.accessibility.compliant) {
        issues.push({
          type: 'error',
          category: 'accessibility',
          description: 'Component does not meet accessibility requirements',
          suggestion: 'Implement WCAG 2.1 AA compliance features'
        });
        score -= 20;
      }

      // Check responsive design
      if (!component.responsive.enabled) {
        issues.push({
          type: 'warning',
          category: 'responsive',
          description: 'Component lacks responsive design implementation',
          suggestion: 'Add responsive breakpoints and behaviors'
        });
        score -= 15;
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push('Consider updating component to fully align with design system');
      }
      if (tokenUsage.missingTokens.length > 5) {
        recommendations.push('Perform comprehensive token integration');
      }

      const compliant = score >= 80 && issues.filter(i => i.type === 'error').length === 0;

      return {
        compliant,
        score: Math.max(0, score),
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to validate compliance:', error);
      throw error;
    }
  }

  /**
   * Get design system by ID
   */
  getDesignSystem(designSystemId: string): DesignSystem | undefined {
    return this.designSystems.get(designSystemId);
  }

  /**
   * Get all registered design systems
   */
  getDesignSystems(framework?: SupportedFramework): DesignSystem[] {
    let systems = Array.from(this.designSystems.values());
    
    if (framework) {
      systems = systems.filter(ds => ds.framework === framework);
    }
    
    return systems;
  }

  /**
   * Get theme variants for design system
   */
  getThemeVariants(designSystemId: string): ThemeVariant[] {
    return this.themeVariants.get(designSystemId) || [];
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Private methods
   */
  private async applyDesignSystemToComponent(
    component: GeneratedComponent,
    designSystem: DesignSystem,
    overrides: Record<string, any>,
    preserve: string[]
  ): Promise<GeneratedComponent> {
    // Clone component to avoid mutation
    const integratedComponent: GeneratedComponent = JSON.parse(JSON.stringify(component));

    // Apply design tokens to component code
    if (component.code.component) {
      integratedComponent.code.component = await this.applyDesignTokens(
        component.code.component,
        designSystem.id,
        component.framework,
        component.type
      );
    }

    // Apply design tokens to styles
    if (component.code.styles) {
      integratedComponent.code.styles = await this.integrateStyleTokens(
        component.code.styles,
        designSystem.tokens,
        preserve
      );
    }

    // Apply overrides while preserving specified properties
    for (const [key, value] of Object.entries(overrides)) {
      if (!preserve.includes(key)) {
        this.setNestedProperty(integratedComponent, key, value);
      }
    }

    // Update metadata
    integratedComponent.metadata.designSystem = designSystem.id;
    integratedComponent.metadata.version = this.incrementVersion(component.metadata.version);

    return integratedComponent;
  }

  private async applyReactTokens(
    code: string,
    designSystem: DesignSystem,
    mappings: TokenMapping[]
  ): Promise<string> {
    let updatedCode = code;

    // Replace hardcoded values with design tokens
    const { colors, spacing, typography } = designSystem.tokens;

    // Color replacements
    for (const [colorName, colorValue] of Object.entries(colors)) {
      const colorRegex = new RegExp(`(['"\`])${colorValue}\\1`, 'g');
      updatedCode = updatedCode.replace(colorRegex, `$1{theme.colors.${colorName}}$1`);
    }

    // Spacing replacements
    for (const [spacingName, spacingValue] of Object.entries(spacing)) {
      const spacingRegex = new RegExp(`(['"\`])${spacingValue}\\1`, 'g');
      updatedCode = updatedCode.replace(spacingRegex, `$1{theme.spacing.${spacingName}}$1`);
    }

    // Typography replacements
    for (const [typeName, typeValue] of Object.entries(typography)) {
      const typeRegex = new RegExp(`(['"\`])${typeValue}\\1`, 'g');
      updatedCode = updatedCode.replace(typeRegex, `$1{theme.typography.${typeName}}$1`);
    }

    // Add theme provider import if not present
    if (!updatedCode.includes('useTheme') && updatedCode.includes('theme.')) {
      updatedCode = `import { useTheme } from 'styled-components';\n${updatedCode}`;
      updatedCode = updatedCode.replace(
        /const (\w+): React\.FC/,
        'const $1: React.FC = (props) => {\n  const theme = useTheme();\n  return ('
      );
      updatedCode = updatedCode.replace(/return \(/, 'return (');
      updatedCode = updatedCode.replace(/\);$/, '  );\n};');
    }

    return updatedCode;
  }

  private async applyVueTokens(
    code: string,
    designSystem: DesignSystem,
    mappings: TokenMapping[]
  ): Promise<string> {
    let updatedCode = code;

    // Apply Vue-specific token integration
    const { colors, spacing, typography } = designSystem.tokens;

    // Replace CSS custom properties
    for (const [colorName, colorValue] of Object.entries(colors)) {
      const colorRegex = new RegExp(colorValue, 'g');
      updatedCode = updatedCode.replace(colorRegex, `var(--color-${colorName})`);
    }

    for (const [spacingName, spacingValue] of Object.entries(spacing)) {
      const spacingRegex = new RegExp(spacingValue, 'g');
      updatedCode = updatedCode.replace(spacingRegex, `var(--spacing-${spacingName})`);
    }

    return updatedCode;
  }

  private async applyAngularTokens(
    code: string,
    designSystem: DesignSystem,
    mappings: TokenMapping[]
  ): Promise<string> {
    let updatedCode = code;

    // Apply Angular-specific token integration using CSS custom properties
    const { colors, spacing, typography } = designSystem.tokens;

    // Generate CSS custom properties
    let cssVariables = ':root {\n';
    
    for (const [colorName, colorValue] of Object.entries(colors)) {
      cssVariables += `  --color-${colorName}: ${colorValue};\n`;
    }
    
    for (const [spacingName, spacingValue] of Object.entries(spacing)) {
      cssVariables += `  --spacing-${spacingName}: ${spacingValue};\n`;
    }
    
    cssVariables += '}\n\n';

    // Replace hardcoded values with CSS variables
    for (const [colorName, colorValue] of Object.entries(colors)) {
      const colorRegex = new RegExp(colorValue, 'g');
      updatedCode = updatedCode.replace(colorRegex, `var(--color-${colorName})`);
    }

    // Prepend CSS variables to styles
    updatedCode = cssVariables + updatedCode;

    return updatedCode;
  }

  private async applyVanillaTokens(
    code: string,
    designSystem: DesignSystem,
    mappings: TokenMapping[]
  ): Promise<string> {
    let updatedCode = code;

    // Apply vanilla JavaScript token integration
    const { colors, spacing, typography } = designSystem.tokens;

    // Create token object
    const tokenObject = {
      colors,
      spacing,
      typography,
      ...designSystem.tokens.borderRadius && { borderRadius: designSystem.tokens.borderRadius },
      ...designSystem.tokens.shadows && { shadows: designSystem.tokens.shadows }
    };

    // Add token object to code
    const tokenDeclaration = `const designTokens = ${JSON.stringify(tokenObject, null, 2)};\n\n`;
    updatedCode = tokenDeclaration + updatedCode;

    // Replace hardcoded values with token references
    for (const [colorName, colorValue] of Object.entries(colors)) {
      const colorRegex = new RegExp(`['"\`]${colorValue}['"\`]`, 'g');
      updatedCode = updatedCode.replace(colorRegex, `designTokens.colors.${colorName}`);
    }

    return updatedCode;
  }

  private async integrateStyleTokens(
    styles: string,
    tokens: DesignTokens,
    preserve: string[]
  ): Promise<string> {
    let updatedStyles = styles;

    // Apply color tokens
    for (const [colorName, colorValue] of Object.entries(tokens.colors)) {
      if (!preserve.includes(`colors.${colorName}`)) {
        const colorRegex = new RegExp(colorValue, 'g');
        updatedStyles = updatedStyles.replace(colorRegex, `var(--color-${colorName})`);
      }
    }

    // Apply spacing tokens
    for (const [spacingName, spacingValue] of Object.entries(tokens.spacing)) {
      if (!preserve.includes(`spacing.${spacingName}`)) {
        const spacingRegex = new RegExp(spacingValue, 'g');
        updatedStyles = updatedStyles.replace(spacingRegex, `var(--spacing-${spacingName})`);
      }
    }

    // Apply typography tokens
    for (const [typeName, typeValue] of Object.entries(tokens.typography)) {
      if (!preserve.includes(`typography.${typeName}`)) {
        const typeRegex = new RegExp(typeValue, 'g');
        updatedStyles = updatedStyles.replace(typeRegex, `var(--typography-${typeName})`);
      }
    }

    return updatedStyles;
  }

  private async analyzeDesignSystemTokens(designSystem: DesignSystem): Promise<void> {
    // Analyze tokens and create default mappings
    const commonMappings: TokenMapping[] = [
      {
        componentProperty: 'backgroundColor',
        tokenPath: 'colors.primary',
        fallback: '#000000'
      },
      {
        componentProperty: 'color',
        tokenPath: 'colors.text',
        fallback: '#ffffff'
      },
      {
        componentProperty: 'padding',
        tokenPath: 'spacing.md',
        fallback: '16px'
      },
      {
        componentProperty: 'margin',
        tokenPath: 'spacing.sm',
        fallback: '8px'
      },
      {
        componentProperty: 'fontSize',
        tokenPath: 'typography.base',
        fallback: '16px'
      }
    ];

    // Store mappings for each component type
    const componentTypes = ['button', 'input', 'card', 'modal', 'form'];
    for (const type of componentTypes) {
      this.tokenMappings.set(type, [...commonMappings]);
    }
  }

  private initializeDefaultMappings(): void {
    // Initialize default token mappings for common component types
    const buttonMappings: TokenMapping[] = [
      { componentProperty: 'backgroundColor', tokenPath: 'colors.primary' },
      { componentProperty: 'color', tokenPath: 'colors.white' },
      { componentProperty: 'padding', tokenPath: 'spacing.md' },
      { componentProperty: 'borderRadius', tokenPath: 'borderRadius.md' }
    ];

    const inputMappings: TokenMapping[] = [
      { componentProperty: 'borderColor', tokenPath: 'colors.neutral' },
      { componentProperty: 'padding', tokenPath: 'spacing.sm' },
      { componentProperty: 'fontSize', tokenPath: 'typography.base' }
    ];

    this.tokenMappings.set('button', buttonMappings);
    this.tokenMappings.set('input', inputMappings);
  }

  private mergeTokens(baseTokens: DesignTokens, overrides: Partial<DesignTokens>): DesignTokens {
    return {
      colors: { ...baseTokens.colors, ...overrides.colors },
      typography: { ...baseTokens.typography, ...overrides.typography },
      spacing: { ...baseTokens.spacing, ...overrides.spacing },
      breakpoints: { ...baseTokens.breakpoints, ...overrides.breakpoints },
      borderRadius: { ...baseTokens.borderRadius, ...overrides.borderRadius },
      shadows: { ...baseTokens.shadows, ...overrides.shadows },
      animation: { ...baseTokens.animation, ...overrides.animation }
    };
  }

  private calculateTokensApplied(component: GeneratedComponent, designSystem: DesignSystem): number {
    // Count how many tokens were applied to the component
    let count = 0;
    const codeStr = component.code.component + (component.code.styles || '');
    
    // Count color tokens
    for (const colorName of Object.keys(designSystem.tokens.colors)) {
      if (codeStr.includes(`colors.${colorName}`) || codeStr.includes(`--color-${colorName}`)) {
        count++;
      }
    }
    
    // Count spacing tokens
    for (const spacingName of Object.keys(designSystem.tokens.spacing)) {
      if (codeStr.includes(`spacing.${spacingName}`) || codeStr.includes(`--spacing-${spacingName}`)) {
        count++;
      }
    }
    
    return count;
  }

  private async analyzeTokenUsage(
    component: GeneratedComponent,
    designSystem: DesignSystem
  ): Promise<{ appliedTokens: string[]; missingTokens: string[] }> {
    const appliedTokens: string[] = [];
    const missingTokens: string[] = [];
    const codeStr = component.code.component + (component.code.styles || '');

    // Check color tokens
    for (const [colorName, colorValue] of Object.entries(designSystem.tokens.colors)) {
      if (codeStr.includes(`colors.${colorName}`) || codeStr.includes(`--color-${colorName}`)) {
        appliedTokens.push(`colors.${colorName}`);
      } else if (codeStr.includes(colorValue)) {
        missingTokens.push(`colors.${colorName}`);
      }
    }

    return { appliedTokens, missingTokens };
  }

  private async checkNamingConventions(
    component: GeneratedComponent,
    designSystem: DesignSystem
  ): Promise<{ compliant: boolean; suggestion?: string }> {
    // Check if component follows design system naming conventions
    const expectedPrefix = designSystem.metadata?.componentPrefix || '';
    
    if (expectedPrefix && !component.name.startsWith(expectedPrefix)) {
      return {
        compliant: false,
        suggestion: `Component name should start with '${expectedPrefix}' prefix`
      };
    }

    return { compliant: true };
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async getComponentById(componentId: string): Promise<GeneratedComponent | null> {
    // This would integrate with ComponentGenerator to get the component
    // For now, return null as this is a placeholder
    return null;
  }
}