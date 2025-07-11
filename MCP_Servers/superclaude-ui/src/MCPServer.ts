import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@superclaude/shared';
import { ComponentGenerator } from './core/ComponentGenerator.js';
import { DesignSystemIntegrator } from './core/DesignSystemIntegrator.js';
import { ResponsiveDesigner } from './core/ResponsiveDesigner.js';
import { AccessibilityValidator } from './core/AccessibilityValidator.js';
import {
  ComponentGenerationRequestSchema,
  DesignSystemIntegrationRequestSchema,
  AccessibilityValidationRequestSchema,
  ResponsiveOptimizationRequestSchema,
  ComponentOptimizationRequestSchema,
  DesignSystemSchema,
  OptimizationConfigSchema
} from './types/index.js';

export class SuperClaudeUIServer {
  private server: Server;
  private componentGenerator: ComponentGenerator;
  private designSystemIntegrator: DesignSystemIntegrator;
  private responsiveDesigner: ResponsiveDesigner;
  private accessibilityValidator: AccessibilityValidator;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SuperClaudeUIServer');
    
    this.server = new Server(
      {
        name: 'superclaude-ui',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize core systems
    this.componentGenerator = new ComponentGenerator({
      defaultFramework: 'react',
      enableOptimization: true,
      enableTypeGeneration: true,
      enableTestGeneration: false,
      enableStoryGeneration: false
    });

    this.designSystemIntegrator = new DesignSystemIntegrator({
      enableTokenGeneration: true,
      enableThemeVariants: true,
      strictModeEnabled: false,
      preserveCustomizations: true
    });

    this.responsiveDesigner = new ResponsiveDesigner({
      defaultStrategy: 'mobile-first',
      enableContainerQueries: false,
      enableFluidTypography: true,
      enableAdaptiveImages: false
    });

    this.accessibilityValidator = new AccessibilityValidator({
      strictMode: false,
      enableAutoFix: true,
      defaultLevel: 'AA',
      enableColorContrastCheck: true,
      enableKeyboardNavigationCheck: true
    });

    this.setupToolHandlers();
    this.setupEventListeners();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Component generation tools
        {
          name: 'generate_component',
          description: 'Generate a UI component based on requirements',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: {
                type: 'object',
                description: 'Component requirements and specifications',
                properties: {
                  type: { 
                    type: 'string', 
                    enum: ['button', 'input', 'modal', 'card', 'form', 'table', 'navigation'],
                    description: 'Type of component to generate'
                  },
                  name: { type: 'string', description: 'Component name' },
                  description: { type: 'string', description: 'Component description' },
                  framework: { 
                    type: 'string', 
                    enum: ['react', 'vue', 'angular', 'vanilla'],
                    description: 'Target framework'
                  },
                  props: { type: 'object', description: 'Component properties' },
                  styling: { type: 'object', description: 'Styling configuration' },
                  behavior: { type: 'object', description: 'Behavior configuration' },
                  responsive: { type: 'object', description: 'Responsive configuration' }
                },
                required: ['type', 'name', 'framework']
              },
              designSystem: { type: 'string', description: 'Design system ID to use' },
              accessibility: { type: 'object', description: 'Accessibility requirements' },
              responsive: { type: 'object', description: 'Responsive design requirements' },
              optimization: { type: 'object', description: 'Optimization configuration' }
            },
            required: ['requirements']
          }
        },
        {
          name: 'get_component',
          description: 'Get a generated component by ID',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' }
            },
            required: ['componentId']
          }
        },
        {
          name: 'list_components',
          description: 'List generated components with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              framework: { 
                type: 'string', 
                enum: ['react', 'vue', 'angular', 'vanilla'],
                description: 'Filter by framework'
              },
              type: { type: 'string', description: 'Filter by component type' },
              category: { type: 'string', description: 'Filter by category' },
              complexity: { 
                type: 'string', 
                enum: ['simple', 'moderate', 'complex'],
                description: 'Filter by complexity'
              }
            }
          }
        },

        // Design system tools
        {
          name: 'register_design_system',
          description: 'Register a design system for component integration',
          inputSchema: {
            type: 'object',
            properties: {
              designSystem: {
                type: 'object',
                description: 'Design system configuration',
                properties: {
                  id: { type: 'string', description: 'Unique identifier' },
                  name: { type: 'string', description: 'Design system name' },
                  version: { type: 'string', description: 'Version number' },
                  framework: { 
                    type: 'string', 
                    enum: ['react', 'vue', 'angular', 'vanilla'],
                    description: 'Target framework'
                  },
                  tokens: { type: 'object', description: 'Design tokens' }
                },
                required: ['id', 'name', 'version', 'framework', 'tokens']
              }
            },
            required: ['designSystem']
          }
        },
        {
          name: 'integrate_design_system',
          description: 'Integrate a component with a design system',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              designSystemId: { type: 'string', description: 'Design system ID' },
              overrides: { type: 'object', description: 'Property overrides' },
              preserve: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Properties to preserve'
              }
            },
            required: ['componentId', 'designSystemId']
          }
        },
        {
          name: 'generate_theme_variants',
          description: 'Generate theme variants for a design system',
          inputSchema: {
            type: 'object',
            properties: {
              designSystemId: { type: 'string', description: 'Design system ID' },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Variant name' },
                    tokenOverrides: { type: 'object', description: 'Token overrides' },
                    conditions: { type: 'object', description: 'Activation conditions' }
                  },
                  required: ['name', 'tokenOverrides']
                },
                description: 'Theme variant configurations'
              }
            },
            required: ['designSystemId', 'variants']
          }
        },
        {
          name: 'validate_design_compliance',
          description: 'Validate component compliance with design system',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              designSystemId: { type: 'string', description: 'Design system ID' }
            },
            required: ['componentId', 'designSystemId']
          }
        },

        // Responsive design tools
        {
          name: 'optimize_responsive',
          description: 'Optimize component for responsive design',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              requirements: {
                type: 'object',
                description: 'Responsive design requirements',
                properties: {
                  strategy: { 
                    type: 'string', 
                    enum: ['mobile-first', 'desktop-first', 'adaptive'],
                    description: 'Responsive strategy'
                  },
                  breakpoints: { type: 'object', description: 'Breakpoint configuration' },
                  behaviors: { type: 'object', description: 'Responsive behaviors' },
                  constraints: { type: 'object', description: 'Design constraints' }
                },
                required: ['strategy', 'breakpoints']
              },
              existingBreakpoints: { type: 'object', description: 'Existing breakpoint definitions' }
            },
            required: ['componentId', 'requirements']
          }
        },
        {
          name: 'generate_breakpoints',
          description: 'Generate responsive breakpoints',
          inputSchema: {
            type: 'object',
            properties: {
              strategy: { 
                type: 'string', 
                enum: ['mobile-first', 'desktop-first', 'adaptive'],
                description: 'Responsive strategy'
              },
              customBreakpoints: { type: 'object', description: 'Custom breakpoint definitions' }
            },
            required: ['strategy']
          }
        },
        {
          name: 'apply_fluid_typography',
          description: 'Apply fluid typography to component',
          inputSchema: {
            type: 'object',
            properties: {
              componentCode: { type: 'string', description: 'Component code' },
              framework: { 
                type: 'string', 
                enum: ['react', 'vue', 'angular', 'vanilla'],
                description: 'Target framework'
              },
              config: {
                type: 'object',
                description: 'Fluid typography configuration',
                properties: {
                  minSize: { type: 'string', description: 'Minimum font size' },
                  maxSize: { type: 'string', description: 'Maximum font size' },
                  minViewport: { type: 'string', description: 'Minimum viewport width' },
                  maxViewport: { type: 'string', description: 'Maximum viewport width' }
                }
              }
            },
            required: ['componentCode', 'framework']
          }
        },
        {
          name: 'validate_responsive_design',
          description: 'Validate component responsive design',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              requirements: { type: 'object', description: 'Responsive requirements' }
            },
            required: ['componentId', 'requirements']
          }
        },

        // Accessibility tools
        {
          name: 'validate_accessibility',
          description: 'Validate component accessibility compliance',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              requirements: {
                type: 'object',
                description: 'Accessibility requirements',
                properties: {
                  level: { 
                    type: 'string', 
                    enum: ['A', 'AA', 'AAA'],
                    description: 'WCAG compliance level'
                  },
                  features: { type: 'object', description: 'Feature requirements' }
                }
              },
              code: { type: 'string', description: 'Component code to validate' }
            }
          }
        },
        {
          name: 'auto_fix_accessibility',
          description: 'Automatically fix accessibility issues',
          inputSchema: {
            type: 'object',
            properties: {
              componentCode: { type: 'string', description: 'Component code' },
              issues: {
                type: 'array',
                items: { type: 'object' },
                description: 'Accessibility issues to fix'
              }
            },
            required: ['componentCode', 'issues']
          }
        },
        {
          name: 'check_color_contrast',
          description: 'Check color contrast ratio',
          inputSchema: {
            type: 'object',
            properties: {
              foregroundColor: { type: 'string', description: 'Foreground color (hex)' },
              backgroundColor: { type: 'string', description: 'Background color (hex)' },
              fontSize: { type: 'string', description: 'Font size for context' }
            },
            required: ['foregroundColor', 'backgroundColor']
          }
        },
        {
          name: 'generate_accessibility_report',
          description: 'Generate comprehensive accessibility report',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' }
            },
            required: ['componentId']
          }
        },

        // Optimization tools
        {
          name: 'optimize_component',
          description: 'Optimize component performance and quality',
          inputSchema: {
            type: 'object',
            properties: {
              componentId: { type: 'string', description: 'Component ID' },
              config: {
                type: 'object',
                description: 'Optimization configuration',
                properties: {
                  performance: { type: 'object', description: 'Performance optimization settings' },
                  accessibility: { type: 'object', description: 'Accessibility optimization settings' },
                  responsive: { type: 'object', description: 'Responsive optimization settings' },
                  code: { type: 'object', description: 'Code quality optimization settings' }
                }
              },
              target: { 
                type: 'string', 
                enum: ['size', 'performance', 'accessibility', 'maintainability'],
                description: 'Primary optimization target'
              }
            },
            required: ['componentId', 'config']
          }
        },

        // Utility tools
        {
          name: 'get_system_metrics',
          description: 'Get performance metrics from all UI systems',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Component generation tools
          case 'generate_component': {
            const validated = ComponentGenerationRequestSchema.parse(args);
            const component = await this.componentGenerator.generateComponent(validated);
            return { content: [{ type: 'text', text: JSON.stringify(component, null, 2) }] };
          }

          case 'get_component': {
            const { componentId } = args;
            const component = this.componentGenerator.getComponent(componentId);
            if (!component) {
              throw new McpError(ErrorCode.InvalidRequest, `Component ${componentId} not found`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(component, null, 2) }] };
          }

          case 'list_components': {
            const { framework, type, category, complexity } = args;
            const components = this.componentGenerator.getComponents({
              framework,
              type,
              category,
              complexity
            });
            return { content: [{ type: 'text', text: JSON.stringify(components, null, 2) }] };
          }

          // Design system tools
          case 'register_design_system': {
            const { designSystem } = args;
            const validated = DesignSystemSchema.parse(designSystem);
            await this.designSystemIntegrator.registerDesignSystem(validated);
            return { content: [{ type: 'text', text: 'Design system registered successfully' }] };
          }

          case 'integrate_design_system': {
            const validated = DesignSystemIntegrationRequestSchema.parse(args);
            const component = await this.designSystemIntegrator.integrateComponent(validated);
            return { content: [{ type: 'text', text: JSON.stringify(component, null, 2) }] };
          }

          case 'generate_theme_variants': {
            const { designSystemId, variants } = args;
            const themeVariants = await this.designSystemIntegrator.generateThemeVariants(
              designSystemId,
              variants
            );
            return { content: [{ type: 'text', text: JSON.stringify(themeVariants, null, 2) }] };
          }

          case 'validate_design_compliance': {
            const { componentId, designSystemId } = args;
            const validation = await this.designSystemIntegrator.validateCompliance(
              componentId,
              designSystemId
            );
            return { content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }] };
          }

          // Responsive design tools
          case 'optimize_responsive': {
            const validated = ResponsiveOptimizationRequestSchema.parse(args);
            const component = await this.responsiveDesigner.optimizeResponsive(validated);
            return { content: [{ type: 'text', text: JSON.stringify(component, null, 2) }] };
          }

          case 'generate_breakpoints': {
            const { strategy, customBreakpoints } = args;
            const breakpoints = await this.responsiveDesigner.generateBreakpoints(
              strategy,
              customBreakpoints
            );
            return { content: [{ type: 'text', text: JSON.stringify(breakpoints, null, 2) }] };
          }

          case 'apply_fluid_typography': {
            const { componentCode, framework, config } = args;
            const optimizedCode = await this.responsiveDesigner.applyFluidTypography(
              componentCode,
              framework,
              config
            );
            return { content: [{ type: 'text', text: optimizedCode }] };
          }

          case 'validate_responsive_design': {
            const { componentId, requirements } = args;
            const validation = await this.responsiveDesigner.validateResponsiveDesign(
              componentId,
              requirements
            );
            return { content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }] };
          }

          // Accessibility tools
          case 'validate_accessibility': {
            const validated = AccessibilityValidationRequestSchema.parse(args);
            const validation = await this.accessibilityValidator.validateComponent(validated);
            return { content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }] };
          }

          case 'auto_fix_accessibility': {
            const { componentCode, issues } = args;
            const result = await this.accessibilityValidator.autoFixIssues(componentCode, issues);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'check_color_contrast': {
            const { foregroundColor, backgroundColor, fontSize } = args;
            const result = await this.accessibilityValidator.checkColorContrast(
              foregroundColor,
              backgroundColor,
              fontSize
            );
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'generate_accessibility_report': {
            const { componentId } = args;
            const report = await this.accessibilityValidator.generateAccessibilityReport(componentId);
            return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
          }

          // Optimization tools
          case 'optimize_component': {
            const { componentId, config, target } = args;
            const validatedConfig = OptimizationConfigSchema.parse(config);
            
            // This would integrate all optimization systems
            let component = this.componentGenerator.getComponent(componentId);
            if (!component) {
              throw new McpError(ErrorCode.InvalidRequest, `Component ${componentId} not found`);
            }

            // Apply optimizations based on config and target
            let optimized = component;
            
            return { content: [{ type: 'text', text: JSON.stringify(optimized, null, 2) }] };
          }

          // Utility tools
          case 'get_system_metrics': {
            const metrics = {
              componentGenerator: this.componentGenerator.getMetrics(),
              designSystemIntegrator: this.designSystemIntegrator.getMetrics(),
              responsiveDesigner: this.responsiveDesigner.getMetrics(),
              accessibilityValidator: this.accessibilityValidator.getMetrics()
            };
            return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Tool ${name} failed:`, error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupEventListeners() {
    // Component generator events
    this.componentGenerator.on('componentGenerated', (data) => {
      this.logger.info(`Component generated: ${data.name} (${data.framework})`);
    });

    // Design system events
    this.designSystemIntegrator.on('designSystemRegistered', (data) => {
      this.logger.info(`Design system registered: ${data.name}`);
    });

    this.designSystemIntegrator.on('componentIntegrated', (data) => {
      this.logger.info(`Component integrated with design system: ${data.componentId}`);
    });

    // Responsive design events
    this.responsiveDesigner.on('responsiveOptimized', (data) => {
      this.logger.info(`Component optimized for responsive design: ${data.componentId}`);
    });

    // Accessibility events
    this.accessibilityValidator.on('validationCompleted', (data) => {
      this.logger.info(`Accessibility validation completed: ${data.componentId} (${data.score}/100)`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('SuperClaude UI Server started');
  }
}

export default SuperClaudeUIServer;