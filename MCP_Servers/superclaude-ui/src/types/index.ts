import { z } from 'zod';

// Framework types
export const SupportedFrameworkSchema = z.enum(['react', 'vue', 'angular', 'vanilla']);
export type SupportedFramework = z.infer<typeof SupportedFrameworkSchema>;

// Component types
export const ComponentTypeSchema = z.enum([
  'button', 'input', 'textarea', 'select', 'checkbox', 'radio',
  'form', 'modal', 'dialog', 'tooltip', 'popover', 'dropdown',
  'card', 'table', 'list', 'grid', 'layout', 'navigation',
  'header', 'footer', 'sidebar', 'banner', 'alert', 'toast',
  'progress', 'spinner', 'avatar', 'badge', 'chip', 'tag',
  'accordion', 'tabs', 'carousel', 'gallery', 'chart',
  'calendar', 'datepicker', 'pagination', 'breadcrumb',
  'stepper', 'slider', 'toggle', 'rating', 'search'
]);

export const ComponentComplexitySchema = z.enum(['simple', 'moderate', 'complex']);
export const ComponentCategorySchema = z.enum([
  'input', 'display', 'feedback', 'navigation', 'layout', 
  'overlay', 'data', 'media', 'form', 'interaction'
]);

// Design system types
export const ColorSchemeSchema = z.object({
  primary: z.string(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  neutral: z.string().optional(),
  success: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
  info: z.string().optional()
});

export const TypographyScaleSchema = z.object({
  xs: z.string(),
  sm: z.string(),
  base: z.string(),
  lg: z.string(),
  xl: z.string(),
  '2xl': z.string().optional(),
  '3xl': z.string().optional()
});

export const SpacingScaleSchema = z.object({
  xs: z.string(),
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
  '2xl': z.string().optional(),
  '3xl': z.string().optional()
});

export const BreakpointsSchema = z.object({
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
  '2xl': z.string().optional()
});

export const DesignTokensSchema = z.object({
  colors: ColorSchemeSchema,
  typography: TypographyScaleSchema,
  spacing: SpacingScaleSchema,
  breakpoints: BreakpointsSchema,
  borderRadius: z.record(z.string()).optional(),
  shadows: z.record(z.string()).optional(),
  animation: z.record(z.string()).optional()
});

export const DesignSystemSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  framework: SupportedFrameworkSchema,
  tokens: DesignTokensSchema,
  components: z.record(z.any()).optional(),
  patterns: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Component generation types
export const ComponentRequirementsSchema = z.object({
  type: ComponentTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  framework: SupportedFrameworkSchema,
  props: z.record(z.any()).optional(),
  styling: z.object({
    approach: z.enum(['css-modules', 'styled-components', 'emotion', 'tailwind', 'css-in-js', 'vanilla-css']),
    theme: z.string().optional(),
    customStyles: z.record(z.string()).optional()
  }).optional(),
  behavior: z.object({
    interactive: z.boolean().optional(),
    stateful: z.boolean().optional(),
    events: z.array(z.string()).optional(),
    accessibility: z.boolean().default(true)
  }).optional(),
  responsive: z.object({
    enabled: z.boolean().default(true),
    breakpoints: z.array(z.string()).optional(),
    behavior: z.enum(['adaptive', 'responsive', 'mobile-first']).default('mobile-first')
  }).optional(),
  constraints: z.object({
    maxComplexity: ComponentComplexitySchema.optional(),
    dependencies: z.array(z.string()).optional(),
    compatibility: z.array(z.string()).optional()
  }).optional()
});

export const GeneratedComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ComponentTypeSchema,
  framework: SupportedFrameworkSchema,
  category: ComponentCategorySchema,
  complexity: ComponentComplexitySchema,
  code: z.object({
    component: z.string(),
    styles: z.string().optional(),
    types: z.string().optional(),
    tests: z.string().optional(),
    stories: z.string().optional(),
    documentation: z.string().optional()
  }),
  props: z.record(z.any()),
  exports: z.array(z.string()),
  dependencies: z.array(z.string()),
  accessibility: z.object({
    compliant: z.boolean(),
    features: z.array(z.string()),
    ariaLabels: z.record(z.string()).optional(),
    keyboardSupport: z.boolean()
  }),
  responsive: z.object({
    enabled: z.boolean(),
    breakpoints: z.array(z.string()).optional(),
    strategy: z.string()
  }),
  performance: z.object({
    optimized: z.boolean(),
    bundleSize: z.number().optional(),
    renderComplexity: z.enum(['low', 'medium', 'high'])
  }),
  metadata: z.object({
    generated: z.date(),
    version: z.string(),
    designSystem: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

// Accessibility types
export const AccessibilityRequirementsSchema = z.object({
  level: z.enum(['A', 'AA', 'AAA']).default('AA'),
  features: z.object({
    keyboardNavigation: z.boolean().default(true),
    screenReader: z.boolean().default(true),
    highContrast: z.boolean().default(true),
    reducedMotion: z.boolean().default(true),
    focusManagement: z.boolean().default(true)
  }).optional(),
  ariaLabels: z.record(z.string()).optional(),
  customAttributes: z.record(z.string()).optional()
});

export const AccessibilityValidationSchema = z.object({
  componentId: z.string(),
  level: z.enum(['A', 'AA', 'AAA']),
  results: z.object({
    compliant: z.boolean(),
    score: z.number().min(0).max(100),
    issues: z.array(z.object({
      type: z.enum(['error', 'warning', 'info']),
      rule: z.string(),
      description: z.string(),
      element: z.string().optional(),
      suggestion: z.string().optional()
    })),
    features: z.record(z.boolean())
  }),
  timestamp: z.date()
});

// Responsive design types
export const ResponsiveRequirementsSchema = z.object({
  strategy: z.enum(['mobile-first', 'desktop-first', 'adaptive']).default('mobile-first'),
  breakpoints: z.record(z.string()),
  behaviors: z.object({
    layout: z.enum(['stack', 'grid', 'flex', 'custom']).optional(),
    navigation: z.enum(['drawer', 'collapse', 'tabs', 'accordion']).optional(),
    typography: z.boolean().default(true),
    spacing: z.boolean().default(true),
    components: z.record(z.any()).optional()
  }).optional(),
  constraints: z.object({
    minWidth: z.string().optional(),
    maxWidth: z.string().optional(),
    aspectRatio: z.string().optional()
  }).optional()
});

// Optimization types
export const OptimizationConfigSchema = z.object({
  performance: z.object({
    bundleSplitting: z.boolean().default(true),
    treeshaking: z.boolean().default(true),
    minification: z.boolean().default(true),
    compression: z.boolean().default(false)
  }).optional(),
  accessibility: z.object({
    autoAria: z.boolean().default(true),
    semanticMarkup: z.boolean().default(true),
    focusManagement: z.boolean().default(true)
  }).optional(),
  responsive: z.object({
    fluidTypography: z.boolean().default(true),
    adaptiveImages: z.boolean().default(false),
    containerQueries: z.boolean().default(false)
  }).optional(),
  code: z.object({
    formatting: z.boolean().default(true),
    linting: z.boolean().default(true),
    typeGeneration: z.boolean().default(true)
  }).optional()
});

// Request/Response schemas
export const ComponentGenerationRequestSchema = z.object({
  requirements: ComponentRequirementsSchema,
  designSystem: z.string().optional(), // Design system ID
  accessibility: AccessibilityRequirementsSchema.optional(),
  responsive: ResponsiveRequirementsSchema.optional(),
  optimization: OptimizationConfigSchema.optional(),
  context: z.record(z.any()).optional()
});

export const DesignSystemIntegrationRequestSchema = z.object({
  componentId: z.string(),
  designSystemId: z.string(),
  overrides: z.record(z.any()).optional(),
  preserve: z.array(z.string()).optional() // Properties to preserve from original
});

export const AccessibilityValidationRequestSchema = z.object({
  componentId: z.string(),
  requirements: AccessibilityRequirementsSchema.optional(),
  code: z.string().optional() // Component code to validate
});

export const ResponsiveOptimizationRequestSchema = z.object({
  componentId: z.string(),
  requirements: ResponsiveRequirementsSchema,
  existingBreakpoints: z.record(z.string()).optional()
});

export const ComponentOptimizationRequestSchema = z.object({
  componentId: z.string(),
  config: OptimizationConfigSchema,
  target: z.enum(['size', 'performance', 'accessibility', 'maintainability']).optional()
});

// Type exports
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type ComponentComplexity = z.infer<typeof ComponentComplexitySchema>;
export type ComponentCategory = z.infer<typeof ComponentCategorySchema>;
export type DesignTokens = z.infer<typeof DesignTokensSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;
export type ComponentRequirements = z.infer<typeof ComponentRequirementsSchema>;
export type GeneratedComponent = z.infer<typeof GeneratedComponentSchema>;
export type AccessibilityRequirements = z.infer<typeof AccessibilityRequirementsSchema>;
export type AccessibilityValidation = z.infer<typeof AccessibilityValidationSchema>;
export type ResponsiveRequirements = z.infer<typeof ResponsiveRequirementsSchema>;
export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;
export type ComponentGenerationRequest = z.infer<typeof ComponentGenerationRequestSchema>;
export type DesignSystemIntegrationRequest = z.infer<typeof DesignSystemIntegrationRequestSchema>;
export type AccessibilityValidationRequest = z.infer<typeof AccessibilityValidationRequestSchema>;
export type ResponsiveOptimizationRequest = z.infer<typeof ResponsiveOptimizationRequestSchema>;
export type ComponentOptimizationRequest = z.infer<typeof ComponentOptimizationRequestSchema>;