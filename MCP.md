# MCP.md - SuperClaude MCP Server Reference

This is the comprehensive MCP (Model Context Protocol) server reference for Claude Code's SuperClaude framework. Claude Code will check this file for MCP server usage, integration patterns, and orchestration strategies.

## MCP Server Integration Architecture

### Context7 Integration (Documentation & Research)

**Purpose**: Official library documentation, code examples, and best practices
**Token Efficiency**: 2-5K tokens per query, cached results for session reuse

**Activation Patterns**: 
- **Automatic**: External library imports detected, framework-specific questions, version compatibility checks
- **Manual**: `--c7`, `--context7` flags explicitly used
- **Smart**: When commands detect need for official documentation patterns

**Enhanced Workflow Process**:
1. **Library Detection**: Scan imports, dependencies, package.json for library references
2. **Version Validation**: Check compatibility between detected versions and available documentation
3. **ID Resolution**: Use `resolve-library-id` to find Context7-compatible library ID
4. **Documentation Retrieval**: Call `get-library-docs` with specific topic focus and version constraints
5. **Pattern Extraction**: Extract relevant code patterns and implementation examples
6. **Implementation**: Apply patterns with proper attribution and version compatibility
7. **Validation**: Verify implementation against official documentation and best practices
8. **Caching**: Store successful patterns for session reuse and performance optimization

**Integration Commands**: `/build`, `/analyze`, `/improve`, `/review`, `/design`, `/dev-setup`

**Best Practices**:
- Always cite documentation sources with version information
- Cache successful patterns for session reuse
- Verify API compatibility before implementation
- Prefer official examples over custom implementations
- Use topic-focused queries to reduce token usage
- Cross-reference multiple sources for accuracy

**Error Recovery**:
- Library not found → WebSearch for alternatives → Manual implementation with citations
- Documentation timeout → Use cached knowledge → Note limitations explicitly
- Invalid library ID → Retry with broader search terms → Fallback to WebSearch
- Version mismatch → Find compatible version → Suggest upgrade path

### Sequential Integration (Complex Analysis & Thinking)

**Purpose**: Multi-step problem solving, architectural analysis, systematic debugging
**Token Efficiency**: 4-32K tokens depending on depth flags and problem complexity

**Activation Patterns**:
- **Automatic**: Complex debugging scenarios, system design questions, `--think` flags
- **Manual**: `--seq`, `--sequential` flags explicitly used
- **Smart**: Multi-step problems requiring systematic analysis, architectural reviews

**Enhanced Workflow Process**:
1. **Problem Decomposition**: Break complex problems into analyzable components with clear dependencies
2. **Systematic Analysis**: Apply structured thinking to each component with validation checkpoints
3. **Relationship Mapping**: Identify dependencies, interactions, and feedback loops
4. **Hypothesis Generation**: Create testable hypotheses for each component
5. **Evidence Gathering**: Collect supporting evidence through tool usage and analysis
6. **Synthesis**: Combine findings into coherent understanding with confidence levels
7. **Recommendation Generation**: Provide actionable next steps with priority ordering
8. **Validation**: Check reasoning for logical consistency and alternative approaches

**Integration with Thinking Modes**:
- `--think` (4K): Module-level analysis with context awareness and basic dependency mapping
- `--think-hard` (10K): System-wide analysis with architectural focus and cross-module dependencies
- `--ultrathink` (32K): Critical system analysis with comprehensive coverage and alternative scenarios

**Integration Commands**: `/analyze`, `/troubleshoot`, `/improve`, `/review`, `/design`, `/spawn`, `/task`

**Use Cases**:
- Root cause analysis for complex bugs across multiple system layers
- Performance bottleneck identification with system-wide impact analysis
- Architecture review and improvement planning with migration strategies
- Security threat modeling and vulnerability analysis with risk assessment
- Code quality assessment with improvement roadmaps and technical debt analysis

**Quality Control**:
- Hypothesis validation at each step with evidence requirements
- Alternative approach consideration with trade-off analysis
- Confidence level assessment with uncertainty acknowledgment
- Limitation recognition with scope boundary definition

### Magic Integration (UI Components & Design)

**Purpose**: Modern UI component generation, design system integration, responsive design
**Token Efficiency**: 1-3K tokens per component, pattern reuse for efficiency

**Activation Patterns**:
- **Automatic**: UI component requests, design system queries
- **Manual**: `--magic` flag explicitly used
- **Smart**: Frontend persona active, component-related queries, design system questions

**Enhanced Workflow Process**:
1. **Requirement Parsing**: Extract component specifications, constraints, and design system requirements
2. **Pattern Search**: Find similar components and design patterns from 21st.dev database
3. **Framework Detection**: Identify target framework (React, Vue, Angular) and version
4. **Code Generation**: Create component with modern best practices and framework conventions
5. **Design System Integration**: Apply existing themes, styles, tokens, and design patterns
6. **Accessibility Compliance**: Ensure WCAG compliance, semantic markup, and keyboard navigation
7. **Responsive Design**: Implement mobile-first responsive patterns with breakpoint considerations
8. **Optimization**: Apply performance optimizations and code splitting where appropriate

**Integration Commands**: `/build`, `/design`, `/review`, `/improve`

**Component Categories**:
- **Interactive**: Buttons, forms, modals, dropdowns, navigation, search components
- **Layout**: Grids, containers, cards, panels, sidebars, headers, footers
- **Display**: Typography, images, icons, charts, tables, lists, media
- **Feedback**: Alerts, notifications, progress indicators, tooltips, loading states
- **Input**: Text fields, selectors, date pickers, file uploads, rich text editors
- **Navigation**: Menus, breadcrumbs, pagination, tabs, steppers
- **Data**: Tables, grids, lists, cards, infinite scroll, virtualization

**Framework Support**:
- **React**: Hooks, TypeScript, modern patterns, Context API, state management
- **Vue**: Composition API, TypeScript, reactive patterns, Pinia integration
- **Angular**: Component architecture, TypeScript, reactive forms, services
- **Vanilla**: Web Components, modern JavaScript, CSS custom properties

**Quality Standards**:
- Accessibility by default (ARIA labels, keyboard navigation, screen reader support)
- Performance optimized (lazy loading, efficient renders, bundle size consideration)
- Type-safe implementations (TypeScript preferred with proper interfaces)
- Responsive design (mobile-first approach with fluid layouts)
- Design system compliance (consistent tokens, spacing, typography)

### Puppeteer Integration (Browser Automation & Testing)

**Purpose**: E2E testing, performance monitoring, browser automation, visual testing
**Token Efficiency**: 1-2K tokens per automation task with result caching

**Activation Patterns**:
- **Automatic**: Testing workflows, performance monitoring requests, E2E test generation
- **Manual**: `--pup`, `--puppeteer` flags explicitly used
- **Smart**: QA persona active, browser interaction needed, visual testing requirements

**Enhanced Workflow Process**:
1. **Browser Connection**: Connect to Chrome instance with debugging enabled and extensions configured
2. **Environment Setup**: Configure viewport, user agent, network conditions for testing scenarios
3. **Navigation**: Navigate to target URLs with proper waiting and error handling
4. **Interaction**: Perform user actions (clicks, form fills, navigation) with realistic timing
5. **Data Collection**: Capture screenshots, performance metrics, console logs, network activity
6. **Validation**: Verify expected behaviors, visual states, and performance thresholds
7. **Reporting**: Generate test reports with evidence, metrics, and actionable insights
8. **Cleanup**: Properly close browser connections and clean up resources

**Integration Commands**: `/test`, `/review`, `/improve`, `/deploy`, `/troubleshoot`

**Capabilities**:
- **Browser Control**: Navigation, page interaction, state management, cookie handling
- **Visual Testing**: Screenshot capture, visual regression detection, responsive testing
- **Performance Metrics**: Load times, rendering performance, resource usage, Core Web Vitals
- **User Simulation**: Real user interaction patterns, accessibility testing, form workflows
- **Data Extraction**: DOM content, API responses, console logs, network monitoring
- **Monitoring**: Continuous performance measurement, uptime monitoring, alerting

**Integration Patterns**:
- **Test Generation**: Create E2E tests based on user workflows and critical paths
- **Performance Monitoring**: Continuous performance measurement with threshold alerting
- **Visual Validation**: Screenshot-based testing and regression detection with diff analysis
- **User Experience Testing**: Accessibility validation, usability testing, conversion optimization

## Command-MCP Integration Matrix

### Commands by MCP Server Usage

| Command | Context7 | Sequential | Magic | Puppeteer | All MCP |
|---------|----------|------------|-------|-----------|---------|
| `/build` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/dev-setup` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/analyze` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/troubleshoot` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `/explain` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/review` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/improve` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/scan` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/cleanup` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/document` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/estimate` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/task` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/test` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `/deploy` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `/git` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/migrate` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/design` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/index` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/load` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/spawn` | ❌ | ❌ | ❌ | ❌ | ✅ |

### MCP Server Use Cases by Command Category

**Development Commands**:
- Context7: Framework patterns, library documentation
- Magic: UI component generation
- Sequential: Complex setup workflows

**Analysis Commands**:
- Context7: Best practices, patterns
- Sequential: Deep analysis, systematic review
- Puppeteer: Issue reproduction, visual testing

**Quality Commands**:
- Context7: Security patterns, improvement patterns
- Sequential: Code analysis, cleanup strategies

**Testing Commands**:
- Sequential: Test strategy development
- Puppeteer: E2E test execution, visual regression

**Documentation Commands**:
- Context7: Documentation patterns
- Sequential: Content analysis and structure

**Planning Commands**:
- Context7: Benchmarks and patterns
- Sequential: Complex planning and estimation

**Deployment Commands**:
- Sequential: Deployment planning
- Puppeteer: Deployment validation

**Meta Commands**:
- Sequential: Search intelligence, task orchestration
- All MCP: Comprehensive analysis and orchestration

## MCP Server Orchestration Patterns

### Resource Optimization

**Tool Coordination**:
- Batch related MCP server calls for parallel execution
- Intelligent server activation based on task requirements
- Token budget allocation across servers based on complexity
- Performance monitoring and optimization

**Caching Strategies**:
- Cache Context7 documentation lookups for session reuse
- Store Sequential analysis results for pattern matching
- Remember Magic component patterns for reuse
- Cache Puppeteer test results and screenshots

### Error Handling and Recovery

**Graceful Fallbacks**:
- Context7 unavailable → WebSearch for documentation → Manual implementation
- Sequential timeout → Use native Claude Code analysis → Note limitations
- Magic failure → Generate basic component → Suggest manual enhancement
- Puppeteer connection lost → Suggest manual testing → Provide test cases

**Recovery Strategies**:
- Automatic retry with exponential backoff
- Alternative approach suggestions
- Partial result handling
- Clear error reporting with context

### Best Practices

**Performance Optimization**:
1. Use flag-based activation to avoid unnecessary MCP calls
2. Batch operations when multiple MCP servers needed
3. Cache results aggressively for session reuse
4. Monitor token usage and adjust depth accordingly

**Integration Patterns**:
1. Start with minimal MCP usage
2. Progressively enhance with additional servers
3. Combine MCP results for comprehensive solutions
4. Fallback gracefully when servers unavailable

**Quality Assurance**:
1. Validate MCP results against project context
2. Cross-reference multiple sources when available
3. Test generated code before implementation
4. Document MCP usage for transparency

---

*MCP.md - SuperClaude MCP Server Reference v1.0 | Complete MCP Documentation for Claude Code*