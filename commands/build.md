---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Intelligent project builder with framework detection, optimization, and deployment preparation"
---

# /build - Intelligent Project Builder

**Purpose**: Automated project building with framework detection, optimization, and deployment preparation  
**Category**: Development  
**Syntax**: `/build $ARGUMENTS`

## Examples

```bash
/build                           # Auto-detect and build project
/build --prod --optimize         # Production build with optimization
/build @src/ --dev --watch       # Development build with file watching
/build --test !npm run test      # Build with integrated testing
/build --deploy --env production # Deployment-ready production build
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Specific directory or files to build (default: auto-detect)
- `@<path>` - Explicit source directory targeting
- `!<command>` - Pre/post-build command execution
- `--<flag>` - Build configuration and optimization flags

### Build Types

- `--dev`: Development build (fast, unoptimized, source maps)
- `--prod`: Production build (optimized, minified, compressed)  
- `--test`: Testing build (coverage instrumentation, test integration)
- `--stage`: Staging build (production-like with debug capabilities)
- `--lib`: Library build (multiple formats: ESM, CJS, UMD)

### Build Modes

- `--watch`: Continuous build with file monitoring
- `--clean`: Clean build (remove all artifacts first)
- `--incremental`: Smart rebuilding of only changed files
- `--fast`: Prioritize speed over optimization
- `--optimize`: Enable all optimization features

### Framework Detection

- `--framework <name>`: Force specific framework (react|vue|angular|svelte|next)
- `--auto-detect`: Intelligent framework detection (default)
- `--custom`: Custom build configuration

### Analysis & Quality

- `--analyze`: Generate bundle analysis and size reports
- `--lint`: Run linting during build process
- `--security`: Enable security scanning and auditing
- `--performance`: Performance monitoring and budgets

### Universal SuperClaude Flags

- `--plan`: Show build execution plan before starting
- `--think`: Standard build analysis (~4K tokens)
- `--think-hard`: Deep build optimization analysis (~10K tokens)
- `--introspect`: Detailed build decision transparency

### Persona Integration

- `--persona-frontend`: UI/UX optimization focus
- `--persona-backend`: Server/API build optimization
- `--persona-performance`: Speed and efficiency focus
- `--persona-architect`: System design and scalability

### MCP Server Control

- `--c7`: Enable Context7 for framework documentation and best practices
- `--seq`: Enable Sequential for complex build planning
- `--magic`: Enable Magic for UI component optimization
- `--pup`: Enable Puppeteer for build verification testing

## Workflow Process

### Phase 1: Discovery & Planning
1. **Project Analysis**: Scan @target directory structure and dependencies
2. **Framework Detection**: Identify build tools, package.json, config files
3. **Dependency Resolution**: Analyze package dependencies and versions
4. **Build Strategy**: Select optimal build approach based on project type

### Phase 2: Configuration & Setup
1. **Environment Setup**: Configure build environment and variables
2. **Tool Selection**: Choose appropriate build tools (webpack, vite, rollup)
3. **Optimization Strategy**: Apply framework-specific optimizations
4. **Quality Gates**: Set up linting, testing, and security scanning

### Phase 3: Build Execution
1. **Preprocessing**: Handle assets, styles, and transformations
2. **Compilation**: Execute main build process with monitoring
3. **Optimization**: Apply minification, compression, and bundling
4. **Validation**: Run tests, security scans, and performance checks

### Phase 4: Output & Deployment
1. **Artifact Generation**: Create deployment-ready build outputs
2. **Analysis Reports**: Generate bundle analysis and metrics
3. **Documentation**: Create build reports and deployment guides
4. **Deployment Prep**: Optimize for target deployment platform

## Framework Support

### Frontend Frameworks

**React Ecosystem**:
- Create React App: `react-scripts build`
- Vite + React: `vite build` with React optimizations
- Next.js: `next build` with SSR/SSG support
- Remix: `remix build` with edge deployment prep

**Vue Ecosystem**:
- Vue CLI: `vue-cli-service build`
- Vite + Vue: `vite build` with SFC compilation
- Nuxt.js: `nuxt build` with universal rendering

**Angular**:
- Angular CLI: `ng build` with AOT compilation

**Other Frameworks**:
- Svelte/SvelteKit: `svelte-kit build`
- Astro: `astro build`
- Solid.js: `vite build` with Solid config

### Backend Frameworks

**Node.js**:
- Express: TypeScript compilation + asset bundling
- NestJS: Decorator compilation + DI optimization
- Fastify: Performance-optimized builds

**Python**:
- Django: Static collection + template compilation
- FastAPI: OpenAPI generation + async optimization

**Build Tools**:
- Webpack: Advanced configuration optimization
- Rollup: Tree shaking + multiple outputs
- Parcel: Zero-config builds
- esbuild: Ultra-fast compilation

## Build Optimization

### Performance Optimizations

**Bundle Optimization**:
- Tree shaking for dead code elimination
- Code splitting for lazy loading
- Dynamic imports for route-based splitting
- Vendor chunk separation

**Asset Optimization**:
- Image compression (WebP, AVIF with fallbacks)
- Font subsetting and optimization
- CSS optimization and critical path extraction
- SVG optimization and inlining

**Caching Strategies**:
- Content hashing for cache busting
- Build cache for faster rebuilds
- Dependency caching for CI/CD
- Incremental compilation caching

### Security Features

**Vulnerability Scanning**:
- Dependency audit with npm/yarn
- OWASP compliance checking
- Security header validation
- Content Security Policy generation

**Code Analysis**:
- Static analysis for security patterns
- Input validation checking
- Authentication flow analysis
- Data exposure risk assessment

## Quality Gates

### Automated Validation

**Code Quality**:
- ESLint/Prettier for code standards
- TypeScript type checking
- Import/export validation
- Circular dependency detection

**Testing Integration**:
- Unit test execution
- Integration test running
- E2E test coordination
- Coverage threshold enforcement

**Performance Budgets**:
- Bundle size limits
- Load time thresholds
- Memory usage monitoring
- Performance score targets

## Build Reports

### Bundle Analysis
```bash
📊 Build Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━
📦 Total Size: 245.7 KB (gzipped: 78.2 KB)
🎯 Performance Budget: ✅ Under 250 KB

📈 Bundle Breakdown:
├─ vendor.js: 156.2 KB (63.7%)
├─ main.js: 67.8 KB (27.6%)  
├─ styles.css: 21.7 KB (8.7%)
└─ assets: 12.3 KB (5.0%)

⚡ Optimization Opportunities:
├─ Remove unused lodash: -23.4 KB
├─ Dynamic import charts: -45.6 KB
└─ WebP image conversion: -15.2 KB
```

### Performance Metrics
```bash
🚀 Performance Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Build Time: 12.3s (baseline: 15.1s) ↗ 18% faster
🔄 Cache Hit Rate: 89% (dependencies: 94%)
💾 Memory Usage: Peak 1.2GB (avg: 800MB)
🎯 Quality Score: 94/100

📊 Framework Optimization:
├─ Tree shaking: 234KB removed
├─ Code splitting: 12 chunks
├─ Asset optimization: 45% reduction
└─ Compression: Gzip + Brotli enabled
```

## Error Handling

### Common Build Issues

**Dependency Conflicts**:
- Smart version resolution strategies
- Alternative package suggestions
- Lockfile optimization recommendations

**Memory Issues**:
- Build process optimization
- Incremental build activation
- Memory limit adjustments

**Performance Problems**:
- Build bottleneck identification
- Cache optimization strategies
- Parallel processing tuning

### Recovery Strategies
```bash
❌ Build failed: Memory limit exceeded
🔄 Applying recovery strategies:
  1. ✅ Enabled incremental builds
  2. ✅ Reduced parallel workers to 2
  3. ✅ Optimized memory allocation
✅ Recovery successful: Build completed in 18.4s
```

## Deployment Integration

### Platform Optimization

**Static Hosting**: Netlify, Vercel, GitHub Pages
- Static asset optimization
- Route configuration
- Redirect handling
- Performance optimization

**Server Deployment**: Node.js, Docker
- Container optimization
- Process management
- Environment configuration
- Health check setup

**Cloud Platforms**: AWS, GCP, Azure
- Platform-specific optimization
- Serverless configuration
- CDN integration
- Auto-scaling preparation

### Docker Integration
```dockerfile
# Auto-generated optimized Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Example Workflows

### Development Workflow
```bash
# Start development with watching
/build --dev --watch --lint @src/

🏗️ Starting development build...
🔍 Framework detected: React (Vite)
⚡ Fast build mode enabled
🔄 Watch mode activated
📊 Build completed in 1.2s
```

### Production Deployment
```bash
# Complete production build
/build --prod --optimize --analyze --security

🏗️ Production build starting...
📦 Optimizing bundles...
🛡️ Security scan passed
🚀 Build ready for deployment
📊 Analysis report: build-report.html
```

### Library Publishing
```bash
# Multi-format library build
/build --lib --formats esm,cjs,umd @src/

📚 Library build starting...
🔧 Generating multiple formats...
📝 TypeScript definitions created
✅ Ready for npm publishing
```

## Integration with SuperClaude

### Automatic MCP Activation
- **Context7**: Framework documentation lookup
- **Sequential**: Complex build planning
- **Magic**: UI component optimization
- **Puppeteer**: Build verification testing

### Persona Auto-Selection
- **Frontend builds**: persona-frontend activated
- **API/backend builds**: persona-backend activated  
- **Performance focus**: persona-performance activated
- **Complex projects**: persona-architect activated

### Token Optimization
- Standard mode: Balanced detail with progress updates
- `--uc` mode: Compressed output with essential metrics
- `--introspect`: Full transparency in build decisions

---

*SuperClaude Enhanced | Claude Code Native Integration | Evidence-Based Optimization*