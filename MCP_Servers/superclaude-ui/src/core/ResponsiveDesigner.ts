import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  GeneratedComponent,
  ResponsiveRequirements,
  ResponsiveOptimizationRequest,
  SupportedFramework,
  ResponsiveRequirementsSchema
} from '../types';

export interface ResponsiveDesignerOptions {
  defaultStrategy?: 'mobile-first' | 'desktop-first' | 'adaptive';
  enableContainerQueries?: boolean;
  enableFluidTypography?: boolean;
  enableAdaptiveImages?: boolean;
  maxBreakpoints?: number;
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: string;
  maxWidth?: string;
  conditions?: Record<string, any>;
}

export interface ResponsiveRule {
  id: string;
  property: string;
  values: Record<string, string>; // breakpoint -> value
  conditions?: Record<string, any>;
  priority: number;
}

export interface FluidTypographyConfig {
  minSize: string;
  maxSize: string;
  minViewport: string;
  maxViewport: string;
}

export class ResponsiveDesigner extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<ResponsiveDesignerOptions>;
  private breakpointSets: Map<string, ResponsiveBreakpoint[]> = new Map();
  private responsiveRules: Map<string, ResponsiveRule[]> = new Map(); // componentId -> rules
  private fluidTypographyConfigs: Map<string, FluidTypographyConfig> = new Map();
  private metrics: {
    responsiveOptimizations: number;
    breakpointsGenerated: number;
    fluidTypographyApplied: number;
    containerQueriesUsed: number;
    adaptiveImagesOptimized: number;
  };

  constructor(options: ResponsiveDesignerOptions = {}) {
    super();
    this.logger = new Logger('ResponsiveDesigner');
    this.options = {
      defaultStrategy: options.defaultStrategy ?? 'mobile-first',
      enableContainerQueries: options.enableContainerQueries ?? false,
      enableFluidTypography: options.enableFluidTypography ?? true,
      enableAdaptiveImages: options.enableAdaptiveImages ?? false,
      maxBreakpoints: options.maxBreakpoints ?? 6
    };
    this.metrics = {
      responsiveOptimizations: 0,
      breakpointsGenerated: 0,
      fluidTypographyApplied: 0,
      containerQueriesUsed: 0,
      adaptiveImagesOptimized: 0
    };

    this.initializeDefaultBreakpoints();
  }

  /**
   * Optimize component for responsive design
   */
  async optimizeResponsive(request: ResponsiveOptimizationRequest): Promise<GeneratedComponent> {
    const { componentId, requirements, existingBreakpoints } = request;

    try {
      // Validate requirements
      const validatedRequirements = ResponsiveRequirementsSchema.parse(requirements);

      // Get component (this would come from ComponentGenerator)
      const component = await this.getComponentById(componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      // Create optimized component
      const optimizedComponent = await this.applyResponsiveOptimizations(
        component,
        validatedRequirements,
        existingBreakpoints
      );

      this.metrics.responsiveOptimizations++;

      this.emit('responsiveOptimized', {
        componentId,
        strategy: validatedRequirements.strategy,
        breakpointCount: Object.keys(validatedRequirements.breakpoints).length
      });

      this.logger.info(`Optimized component ${component.name} for responsive design using ${validatedRequirements.strategy} strategy`);

      return optimizedComponent;
    } catch (error) {
      this.logger.error('Failed to optimize component for responsive design:', error);
      throw error;
    }
  }

  /**
   * Generate responsive breakpoints
   */
  async generateBreakpoints(
    strategy: 'mobile-first' | 'desktop-first' | 'adaptive',
    customBreakpoints?: Record<string, string>
  ): Promise<ResponsiveBreakpoint[]> {
    try {
      let breakpoints: ResponsiveBreakpoint[];

      if (customBreakpoints) {
        breakpoints = this.parseCustomBreakpoints(customBreakpoints);
      } else {
        breakpoints = this.getDefaultBreakpoints(strategy);
      }

      // Validate breakpoint count
      if (breakpoints.length > this.options.maxBreakpoints) {
        this.logger.warn(`Too many breakpoints (${breakpoints.length}), limiting to ${this.options.maxBreakpoints}`);
        breakpoints = breakpoints.slice(0, this.options.maxBreakpoints);
      }

      // Sort breakpoints by width
      breakpoints.sort((a, b) => {
        const aWidth = parseInt(a.minWidth);
        const bWidth = parseInt(b.minWidth);
        return strategy === 'mobile-first' ? aWidth - bWidth : bWidth - aWidth;
      });

      const setId = uuidv4();
      this.breakpointSets.set(setId, breakpoints);
      this.metrics.breakpointsGenerated += breakpoints.length;

      this.emit('breakpointsGenerated', {
        setId,
        strategy,
        count: breakpoints.length
      });

      return breakpoints;
    } catch (error) {
      this.logger.error('Failed to generate breakpoints:', error);
      throw error;
    }
  }

  /**
   * Apply fluid typography
   */
  async applyFluidTypography(
    componentCode: string,
    framework: SupportedFramework,
    config?: FluidTypographyConfig
  ): Promise<string> {
    if (!this.options.enableFluidTypography) {
      return componentCode;
    }

    try {
      const fluidConfig = config || {
        minSize: '14px',
        maxSize: '18px',
        minViewport: '320px',
        maxViewport: '1200px'
      };

      let optimizedCode = componentCode;

      switch (framework) {
        case 'react':
          optimizedCode = await this.applyReactFluidTypography(optimizedCode, fluidConfig);
          break;
        case 'vue':
          optimizedCode = await this.applyVueFluidTypography(optimizedCode, fluidConfig);
          break;
        case 'angular':
          optimizedCode = await this.applyAngularFluidTypography(optimizedCode, fluidConfig);
          break;
        case 'vanilla':
          optimizedCode = await this.applyVanillaFluidTypography(optimizedCode, fluidConfig);
          break;
      }

      this.metrics.fluidTypographyApplied++;
      return optimizedCode;
    } catch (error) {
      this.logger.error('Failed to apply fluid typography:', error);
      throw error;
    }
  }

  /**
   * Generate container queries (if supported)
   */
  async generateContainerQueries(
    componentCode: string,
    containerName: string,
    queries: Record<string, string>
  ): Promise<string> {
    if (!this.options.enableContainerQueries) {
      return componentCode;
    }

    try {
      let containerQueries = `@container ${containerName} {\n`;

      for (const [condition, styles] of Object.entries(queries)) {
        containerQueries += `  (${condition}) {\n`;
        containerQueries += `    ${styles}\n`;
        containerQueries += `  }\n`;
      }

      containerQueries += `}\n`;

      // Add container queries to component styles
      const updatedCode = componentCode + '\n\n' + containerQueries;
      this.metrics.containerQueriesUsed++;

      return updatedCode;
    } catch (error) {
      this.logger.error('Failed to generate container queries:', error);
      throw error;
    }
  }

  /**
   * Optimize images for responsive design
   */
  async optimizeAdaptiveImages(
    componentCode: string,
    framework: SupportedFramework,
    imageConfigs: Array<{
        src: string;
        sizes: string;
        srcSet?: string;
      }>
  ): Promise<string> {
    if (!this.options.enableAdaptiveImages) {
      return componentCode;
    }

    try {
      let optimizedCode = componentCode;

      for (const config of imageConfigs) {
        switch (framework) {
          case 'react':
            optimizedCode = await this.applyReactAdaptiveImages(optimizedCode, config);
            break;
          case 'vue':
            optimizedCode = await this.applyVueAdaptiveImages(optimizedCode, config);
            break;
          case 'angular':
            optimizedCode = await this.applyAngularAdaptiveImages(optimizedCode, config);
            break;
          case 'vanilla':
            optimizedCode = await this.applyVanillaAdaptiveImages(optimizedCode, config);
            break;
        }
      }

      this.metrics.adaptiveImagesOptimized += imageConfigs.length;
      return optimizedCode;
    } catch (error) {
      this.logger.error('Failed to optimize adaptive images:', error);
      throw error;
    }
  }

  /**
   * Generate responsive CSS
   */
  async generateResponsiveCSS(
    rules: ResponsiveRule[],
    breakpoints: ResponsiveBreakpoint[],
    strategy: 'mobile-first' | 'desktop-first' | 'adaptive'
  ): Promise<string> {
    try {
      let css = '';

      // Sort rules by priority
      const sortedRules = rules.sort((a, b) => a.priority - b.priority);

      for (const rule of sortedRules) {
        // Generate base styles (mobile-first: smallest, desktop-first: largest)
        const baseBreakpoint = strategy === 'mobile-first' 
          ? breakpoints[0] 
          : breakpoints[breakpoints.length - 1];
        
        if (rule.values[baseBreakpoint.name]) {
          css += `${rule.property}: ${rule.values[baseBreakpoint.name]};\n`;
        }

        // Generate media queries
        for (const breakpoint of breakpoints) {
          if (rule.values[breakpoint.name] && breakpoint.name !== baseBreakpoint.name) {
            const mediaQuery = this.generateMediaQuery(breakpoint, strategy);
            css += `\n${mediaQuery} {\n`;
            css += `  ${rule.property}: ${rule.values[breakpoint.name]};\n`;
            css += `}\n`;
          }
        }
      }

      return css;
    } catch (error) {
      this.logger.error('Failed to generate responsive CSS:', error);
      throw error;
    }
  }

  /**
   * Validate responsive design
   */
  async validateResponsiveDesign(
    componentId: string,
    requirements: ResponsiveRequirements
  ): Promise<{
    valid: boolean;
    score: number;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      description: string;
      suggestion?: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const component = await this.getComponentById(componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      const issues: any[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check if responsive is enabled
      if (!component.responsive.enabled) {
        issues.push({
          type: 'error',
          description: 'Component does not have responsive design enabled',
          suggestion: 'Enable responsive design and add breakpoint configurations'
        });
        score -= 40;
      }

      // Check breakpoint coverage
      const requiredBreakpoints = Object.keys(requirements.breakpoints);
      const componentBreakpoints = component.responsive.breakpoints || [];
      const missingBreakpoints = requiredBreakpoints.filter(bp => !componentBreakpoints.includes(bp));
      
      if (missingBreakpoints.length > 0) {
        issues.push({
          type: 'warning',
          description: `Missing breakpoints: ${missingBreakpoints.join(', ')}`,
          suggestion: 'Add responsive configurations for all required breakpoints'
        });
        score -= missingBreakpoints.length * 10;
      }

      // Check fluid typography
      if (this.options.enableFluidTypography && !this.hasFluidTypography(component.code.styles || '')) {
        issues.push({
          type: 'info',
          description: 'Component could benefit from fluid typography',
          suggestion: 'Consider implementing fluid typography for better scalability'
        });
        score -= 5;
      }

      // Check container queries usage
      if (this.options.enableContainerQueries && !this.hasContainerQueries(component.code.styles || '')) {
        issues.push({
          type: 'info',
          description: 'Component could use container queries for better responsive behavior',
          suggestion: 'Consider implementing container queries where appropriate'
        });
        score -= 5;
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push('Review responsive design implementation');
      }
      if (score < 80) {
        recommendations.push('Consider comprehensive responsive optimization');
      }

      return {
        valid: score >= 70 && issues.filter(i => i.type === 'error').length === 0,
        score: Math.max(0, score),
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to validate responsive design:', error);
      throw error;
    }
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
  private async applyResponsiveOptimizations(
    component: GeneratedComponent,
    requirements: ResponsiveRequirements,
    existingBreakpoints?: Record<string, string>
  ): Promise<GeneratedComponent> {
    const optimizedComponent: GeneratedComponent = JSON.parse(JSON.stringify(component));

    // Generate breakpoints
    const breakpoints = await this.generateBreakpoints(
      requirements.strategy,
      existingBreakpoints || requirements.breakpoints
    );

    // Apply responsive behavior configurations
    if (requirements.behaviors) {
      optimizedComponent.code.component = await this.applyResponsiveBehaviors(
        component.code.component,
        component.framework,
        requirements.behaviors
      );
    }

    // Apply constraints
    if (requirements.constraints) {
      optimizedComponent.code.styles = await this.applyResponsiveConstraints(
        component.code.styles || '',
        requirements.constraints
      );
    }

    // Apply fluid typography if enabled
    if (this.options.enableFluidTypography) {
      optimizedComponent.code.component = await this.applyFluidTypography(
        optimizedComponent.code.component,
        component.framework
      );
    }

    // Update component metadata
    optimizedComponent.responsive = {
      enabled: true,
      breakpoints: breakpoints.map(bp => bp.name),
      strategy: requirements.strategy
    };

    return optimizedComponent;
  }

  private initializeDefaultBreakpoints(): void {
    const mobileFirstBreakpoints: ResponsiveBreakpoint[] = [
      { name: 'xs', minWidth: '0px' },
      { name: 'sm', minWidth: '576px' },
      { name: 'md', minWidth: '768px' },
      { name: 'lg', minWidth: '992px' },
      { name: 'xl', minWidth: '1200px' },
      { name: '2xl', minWidth: '1400px' }
    ];

    const desktopFirstBreakpoints: ResponsiveBreakpoint[] = [
      { name: '2xl', minWidth: '1400px' },
      { name: 'xl', minWidth: '1200px', maxWidth: '1399px' },
      { name: 'lg', minWidth: '992px', maxWidth: '1199px' },
      { name: 'md', minWidth: '768px', maxWidth: '991px' },
      { name: 'sm', minWidth: '576px', maxWidth: '767px' },
      { name: 'xs', minWidth: '0px', maxWidth: '575px' }
    ];

    this.breakpointSets.set('mobile-first-default', mobileFirstBreakpoints);
    this.breakpointSets.set('desktop-first-default', desktopFirstBreakpoints);
  }

  private parseCustomBreakpoints(customBreakpoints: Record<string, string>): ResponsiveBreakpoint[] {
    return Object.entries(customBreakpoints).map(([name, minWidth]) => ({
      name,
      minWidth
    }));
  }

  private getDefaultBreakpoints(strategy: string): ResponsiveBreakpoint[] {
    const setId = `${strategy}-default`;
    return this.breakpointSets.get(setId) || [];
  }

  private generateMediaQuery(
    breakpoint: ResponsiveBreakpoint,
    strategy: 'mobile-first' | 'desktop-first' | 'adaptive'
  ): string {
    if (strategy === 'mobile-first') {
      return `@media (min-width: ${breakpoint.minWidth})`;
    } else if (strategy === 'desktop-first') {
      if (breakpoint.maxWidth) {
        return `@media (max-width: ${breakpoint.maxWidth})`;
      } else {
        return `@media (min-width: ${breakpoint.minWidth})`;
      }
    } else {
      // Adaptive strategy
      if (breakpoint.maxWidth) {
        return `@media (min-width: ${breakpoint.minWidth}) and (max-width: ${breakpoint.maxWidth})`;
      } else {
        return `@media (min-width: ${breakpoint.minWidth})`;
      }
    }
  }

  private async applyReactFluidTypography(
    code: string,
    config: FluidTypographyConfig
  ): Promise<string> {
    const fluidCalc = this.generateFluidCalc(config);
    
    // Replace static font sizes with fluid calculations
    const fluidFontSize = `fontSize: 'clamp(${config.minSize}, ${fluidCalc}, ${config.maxSize})'`;
    
    // Look for fontSize properties and replace them
    let updatedCode = code.replace(
      /fontSize:\s*['"`][\d.]+[a-z%]+['"`]/g,
      fluidFontSize
    );

    return updatedCode;
  }

  private async applyVueFluidTypography(
    code: string,
    config: FluidTypographyConfig
  ): Promise<string> {
    const fluidCalc = this.generateFluidCalc(config);
    
    // Add CSS custom property for fluid typography
    const fluidCSS = `
  --fluid-font-size: clamp(${config.minSize}, ${fluidCalc}, ${config.maxSize});
  font-size: var(--fluid-font-size);
`;

    return code.replace(/font-size:\s*[\d.]+[a-z%]+;/g, fluidCSS);
  }

  private async applyAngularFluidTypography(
    code: string,
    config: FluidTypographyConfig
  ): Promise<string> {
    const fluidCalc = this.generateFluidCalc(config);
    
    // Add clamp function to CSS
    const fluidCSS = `font-size: clamp(${config.minSize}, ${fluidCalc}, ${config.maxSize});`;
    
    return code.replace(/font-size:\s*[\d.]+[a-z%]+;/g, fluidCSS);
  }

  private async applyVanillaFluidTypography(
    code: string,
    config: FluidTypographyConfig
  ): Promise<string> {
    const fluidCalc = this.generateFluidCalc(config);
    
    // Add CSS clamp function
    const fluidCSS = `element.style.fontSize = 'clamp(${config.minSize}, ${fluidCalc}, ${config.maxSize})';`;
    
    return code + '\n' + fluidCSS;
  }

  private generateFluidCalc(config: FluidTypographyConfig): string {
    // Generate viewport-based fluid calculation
    const minSizePx = parseInt(config.minSize);
    const maxSizePx = parseInt(config.maxSize);
    const minViewportPx = parseInt(config.minViewport);
    const maxViewportPx = parseInt(config.maxViewport);
    
    const slope = (maxSizePx - minSizePx) / (maxViewportPx - minViewportPx);
    const yAxisIntersection = -minViewportPx * slope + minSizePx;
    
    return `${yAxisIntersection}px + ${slope * 100}vw`;
  }

  private async applyReactAdaptiveImages(
    code: string,
    config: { src: string; sizes: string; srcSet?: string }
  ): Promise<string> {
    const imgTag = config.srcSet
      ? `<img src="${config.src}" srcSet="${config.srcSet}" sizes="${config.sizes}" />`
      : `<img src="${config.src}" sizes="${config.sizes}" />`;
    
    return code.replace(/<img[^>]*src=["']([^"']*)[^>]*>/g, imgTag);
  }

  private async applyVueAdaptiveImages(
    code: string,
    config: { src: string; sizes: string; srcSet?: string }
  ): Promise<string> {
    const imgTag = config.srcSet
      ? `<img :src="'${config.src}'" :srcset="'${config.srcSet}'" :sizes="'${config.sizes}'" />`
      : `<img :src="'${config.src}'" :sizes="'${config.sizes}'" />`;
    
    return code.replace(/<img[^>]*>/g, imgTag);
  }

  private async applyAngularAdaptiveImages(
    code: string,
    config: { src: string; sizes: string; srcSet?: string }
  ): Promise<string> {
    const imgTag = config.srcSet
      ? `<img [src]="'${config.src}'" [srcset]="'${config.srcSet}'" [sizes]="'${config.sizes}'" />`
      : `<img [src]="'${config.src}'" [sizes]="'${config.sizes}'" />`;
    
    return code.replace(/<img[^>]*>/g, imgTag);
  }

  private async applyVanillaAdaptiveImages(
    code: string,
    config: { src: string; sizes: string; srcSet?: string }
  ): Promise<string> {
    let imageCode = `
const img = document.createElement('img');
img.src = '${config.src}';
img.sizes = '${config.sizes}';
`;

    if (config.srcSet) {
      imageCode += `img.srcset = '${config.srcSet}';\n`;
    }

    return code + '\n' + imageCode;
  }

  private async applyResponsiveBehaviors(
    code: string,
    framework: SupportedFramework,
    behaviors: any
  ): Promise<string> {
    let updatedCode = code;

    // Apply layout behaviors
    if (behaviors.layout) {
      switch (framework) {
        case 'react':
          updatedCode = await this.applyReactLayoutBehaviors(updatedCode, behaviors.layout);
          break;
        case 'vue':
          updatedCode = await this.applyVueLayoutBehaviors(updatedCode, behaviors.layout);
          break;
        case 'angular':
          updatedCode = await this.applyAngularLayoutBehaviors(updatedCode, behaviors.layout);
          break;
        case 'vanilla':
          updatedCode = await this.applyVanillaLayoutBehaviors(updatedCode, behaviors.layout);
          break;
      }
    }

    return updatedCode;
  }

  private async applyResponsiveConstraints(
    styles: string,
    constraints: any
  ): Promise<string> {
    let updatedStyles = styles;

    if (constraints.minWidth) {
      updatedStyles += `\nmin-width: ${constraints.minWidth};`;
    }

    if (constraints.maxWidth) {
      updatedStyles += `\nmax-width: ${constraints.maxWidth};`;
    }

    if (constraints.aspectRatio) {
      updatedStyles += `\naspect-ratio: ${constraints.aspectRatio};`;
    }

    return updatedStyles;
  }

  private hasFluidTypography(styles: string): boolean {
    return styles.includes('clamp(') || styles.includes('calc(') && styles.includes('vw');
  }

  private hasContainerQueries(styles: string): boolean {
    return styles.includes('@container');
  }

  private async applyReactLayoutBehaviors(code: string, layout: string): Promise<string> {
    // Implementation for React layout behaviors
    return code;
  }

  private async applyVueLayoutBehaviors(code: string, layout: string): Promise<string> {
    // Implementation for Vue layout behaviors
    return code;
  }

  private async applyAngularLayoutBehaviors(code: string, layout: string): Promise<string> {
    // Implementation for Angular layout behaviors
    return code;
  }

  private async applyVanillaLayoutBehaviors(code: string, layout: string): Promise<string> {
    // Implementation for vanilla JS layout behaviors
    return code;
  }

  private async getComponentById(componentId: string): Promise<GeneratedComponent | null> {
    // This would integrate with ComponentGenerator to get the component
    // For now, return null as this is a placeholder
    return null;
  }
}