# SuperClaude UI Server

The SuperClaude UI Server provides advanced UI component generation, design system integration, responsive design, and accessibility validation capabilities for the SuperClaude framework.

## Overview

This MCP server implements four core UI systems:

- **ComponentGenerator**: React/Vue/Angular/Vanilla component creation
- **DesignSystemIntegrator**: Theme and design system compliance
- **ResponsiveDesigner**: Mobile-first responsive patterns
- **AccessibilityValidator**: WCAG compliance checking

## Features

### Component Generator
- Multi-framework support (React, Vue, Angular, Vanilla JS)
- Component type coverage (buttons, forms, modals, tables, etc.)
- TypeScript generation and type safety
- Code formatting and optimization
- Performance analysis and bundle size estimation

### Design System Integrator
- Design token application and management
- Theme variant generation
- Design system compliance validation
- Token mapping and transformation
- Custom override preservation

### Responsive Designer
- Mobile-first, desktop-first, and adaptive strategies
- Fluid typography and container queries
- Breakpoint generation and optimization
- Adaptive image handling
- Responsive behavior validation

### Accessibility Validator
- WCAG 2.1 A/AA/AAA compliance checking
- Color contrast validation
- Keyboard navigation verification
- Screen reader compatibility
- Auto-fix capabilities for common issues

## Installation

```bash
cd /path/to/superclaude-ui
npm install
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

### Example Tool Calls

#### Generate Component
```json
{
  "name": "generate_component",
  "arguments": {
    "requirements": {
      "type": "button",
      "name": "PrimaryButton",
      "description": "Main call-to-action button",
      "framework": "react",
      "props": {
        "variant": {
          "type": "string",
          "default": "primary",
          "description": "Button variant style"
        },
        "size": {
          "type": "string",
          "default": "medium",
          "description": "Button size"
        },
        "disabled": {
          "type": "boolean",
          "default": false,
          "description": "Whether button is disabled"
        },
        "children": {
          "type": "node",
          "required": true,
          "description": "Button content"
        }
      },
      "styling": {
        "approach": "styled-components",
        "theme": "material-design"
      },
      "behavior": {
        "interactive": true,
        "events": ["click", "focus", "blur"],
        "accessibility": true
      },
      "responsive": {
        "enabled": true,
        "behavior": "mobile-first"
      }
    },
    "accessibility": {
      "level": "AA",
      "features": {
        "keyboardNavigation": true,
        "screenReader": true,
        "highContrast": true
      }
    }
  }
}
```

#### Register Design System
```json
{
  "name": "register_design_system",
  "arguments": {
    "designSystem": {
      "id": "company-design-system",
      "name": "Company Design System",
      "version": "2.0.0",
      "framework": "react",
      "tokens": {
        "colors": {
          "primary": "#007bff",
          "secondary": "#6c757d",
          "success": "#28a745",
          "warning": "#ffc107",
          "error": "#dc3545",
          "neutral": "#f8f9fa"
        },
        "typography": {
          "xs": "12px",
          "sm": "14px",
          "base": "16px",
          "lg": "18px",
          "xl": "20px"
        },
        "spacing": {
          "xs": "4px",
          "sm": "8px",
          "md": "16px",
          "lg": "24px",
          "xl": "32px"
        },
        "breakpoints": {
          "sm": "576px",
          "md": "768px",
          "lg": "992px",
          "xl": "1200px"
        }
      }
    }
  }
}
```

#### Optimize for Responsive Design
```json
{
  "name": "optimize_responsive",
  "arguments": {
    "componentId": "button-component-123",
    "requirements": {
      "strategy": "mobile-first",
      "breakpoints": {
        "sm": "576px",
        "md": "768px",
        "lg": "992px",
        "xl": "1200px"
      },
      "behaviors": {
        "layout": "flex",
        "typography": true,
        "spacing": true
      },
      "constraints": {
        "minWidth": "320px",
        "maxWidth": "1200px"
      }
    }
  }
}
```

#### Validate Accessibility
```json
{
  "name": "validate_accessibility",
  "arguments": {
    "componentId": "modal-component-456",
    "requirements": {
      "level": "AA",
      "features": {
        "keyboardNavigation": true,
        "screenReader": true,
        "highContrast": true,
        "focusManagement": true
      }
    }
  }
}
```

## API Reference

### Component Generation Tools
- `generate_component`: Generate UI component
- `get_component`: Retrieve generated component
- `list_components`: List components with filtering

### Design System Tools
- `register_design_system`: Register design system
- `integrate_design_system`: Apply design system to component
- `generate_theme_variants`: Create theme variations
- `validate_design_compliance`: Check design system compliance

### Responsive Design Tools
- `optimize_responsive`: Optimize component for responsive design
- `generate_breakpoints`: Create responsive breakpoints
- `apply_fluid_typography`: Add fluid typography
- `validate_responsive_design`: Validate responsive implementation

### Accessibility Tools
- `validate_accessibility`: Check WCAG compliance
- `auto_fix_accessibility`: Automatically fix issues
- `check_color_contrast`: Validate color contrast ratios
- `generate_accessibility_report`: Create detailed accessibility report

### Optimization Tools
- `optimize_component`: Comprehensive component optimization

### Utility Tools
- `get_system_metrics`: Get performance metrics

## Component Types Supported

### Input Components
- `button`: Interactive buttons with variants
- `input`: Text inputs with validation
- `textarea`: Multi-line text inputs
- `select`: Dropdown selections
- `checkbox`: Boolean selections
- `radio`: Single choice selections

### Layout Components
- `card`: Content containers
- `grid`: Layout grids
- `layout`: Page layouts
- `header`: Page headers
- `footer`: Page footers
- `sidebar`: Navigation sidebars

### Navigation Components
- `navigation`: Main navigation menus
- `breadcrumb`: Breadcrumb navigation
- `pagination`: Page navigation
- `tabs`: Tabbed interfaces

### Feedback Components
- `modal`: Modal dialogs
- `alert`: Alert messages
- `toast`: Notification toasts
- `progress`: Progress indicators
- `spinner`: Loading indicators

### Data Components
- `table`: Data tables
- `list`: Item lists
- `chart`: Data visualizations

## Framework Support

### React
- Functional components with hooks
- TypeScript support
- Styled-components integration
- Storybook stories generation
- Jest test generation

### Vue
- Vue 3 Composition API
- TypeScript support
- Scoped CSS styles
- Vue Test Utils integration

### Angular
- Component architecture
- TypeScript by default
- Angular Material integration
- Jasmine/Karma testing

### Vanilla JavaScript
- ES6+ modern JavaScript
- CSS custom properties
- Web Components support
- Native testing frameworks

## Design System Integration

### Token Types
- **Colors**: Primary, secondary, semantic colors
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Margins, padding, gaps
- **Breakpoints**: Responsive breakpoints
- **Shadows**: Box shadows and elevations
- **Border Radius**: Corner radius values
- **Animation**: Transition and animation values

### Theme Variants
- Light/dark theme support
- High contrast modes
- Custom brand themes
- Seasonal variations

## Accessibility Features

### WCAG 2.1 Compliance
- **Level A**: Basic accessibility
- **Level AA**: Standard compliance (recommended)
- **Level AAA**: Enhanced accessibility

### Features Validated
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios
- Focus management
- Semantic markup
- ARIA attributes
- Alternative text for images
- Form labels and descriptions

### Auto-Fix Capabilities
- Missing alt attributes
- Form label associations
- Basic ARIA attributes
- Focus indicators
- Color contrast adjustments

## Performance Optimization

### Bundle Size
- Tree shaking support
- Code splitting recommendations
- Dependency analysis
- Size budgets and warnings

### Runtime Performance
- Virtual DOM optimization
- Event handler efficiency
- Memory leak prevention
- Render cycle optimization

## Configuration

```typescript
const server = new SuperClaudeUIServer({
  componentGenerator: {
    defaultFramework: 'react',
    enableOptimization: true,
    enableTypeGeneration: true
  },
  designSystem: {
    enableTokenGeneration: true,
    enableThemeVariants: true,
    strictModeEnabled: false
  },
  responsive: {
    defaultStrategy: 'mobile-first',
    enableFluidTypography: true,
    enableContainerQueries: false
  },
  accessibility: {
    defaultLevel: 'AA',
    enableAutoFix: true,
    enableColorContrastCheck: true
  }
});
```

## Testing

```bash
npm test
npm run test:coverage
```

## Contributing

See the main SuperClaude MCP project documentation for contribution guidelines.

## License

MIT License - see LICENSE file for details.