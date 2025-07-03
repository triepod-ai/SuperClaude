---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write]
description: "Automate complete development environment setup with CI/CD, tools, and team collaboration"
---

# /dev-setup - Development Environment Setup

**Purpose**: Configure professional development environments, CI/CD pipelines, and team collaboration tools  
**Category**: System & Setup  
**Syntax**: `/dev-setup $ARGUMENTS`

## Examples

```bash
/dev-setup                                   # Auto-detect and setup current project
/dev-setup --stack node --ci github          # Node.js with GitHub Actions
/dev-setup --stack python --docker           # Python with containerization
/dev-setup --stack react --teamspace         # React with team collaboration
/dev-setup --fullstack --enterprise          # Enterprise full-stack setup
/dev-setup @existing-project/ --validate     # Validate existing setup
/dev-setup !npm init --tools                 # Setup tools after npm init
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Project directory (defaults to current)
- `@<path>` - Setup specific directory
- `!<command>` - Execute command then setup
- `--<flag>` - Setup options and configurations

### Technology Stacks

- `--stack [type]`: Technology stack (node|python|react|vue|django|fastapi|nextjs)
- `--fullstack`: Complete frontend + backend
- `--monorepo`: Multi-package repository
- `--microservices`: Microservices architecture
- `--mobile`: React Native/Flutter setup
- `--desktop`: Electron/Tauri setup

### CI/CD Platforms

- `--ci [platform]`: CI/CD system (github|gitlab|azure|jenkins|circleci)
- `--github-actions`: GitHub workflows
- `--gitlab-ci`: GitLab pipelines
- `--self-hosted`: Self-hosted CI/CD

### Development Tools

- `--tools`: Linters, formatters, debuggers
- `--testing`: Test framework setup
- `--quality`: ESLint, Prettier, SonarQube
- `--security`: Security scanning tools
- `--monitoring`: Observability setup
- `--docs`: Documentation generation

### Environment Options

- `--docker`: Docker + Docker Compose
- `--devcontainer`: VS Code DevContainer
- `--codespaces`: GitHub Codespaces
- `--cloud`: Gitpod/CodeSandbox
- `--local`: Local optimization

### Team Features

- `--teamspace`: Team collaboration setup
- `--shared-config`: Shared standards
- `--onboarding`: New member automation
- `--conventions`: Style guides
- `--workflows`: Team processes

### Advanced Options

- `--enterprise`: Enterprise-grade setup
- `--minimal`: Essential tools only
- `--template [name]`: Use template
- `--interactive`: Setup wizard
- `--validate`: Verify environment

### Universal SuperClaude Flags

- `--plan`: Show setup strategy
- `--think`: Analyze requirements
- `--introspect`: Show reasoning

### Persona Integration

- `--persona-backend`: Server focus
- `--persona-frontend`: UI focus
- `--persona-architect`: System design
- `--persona-qa`: Testing emphasis

### MCP Server Control

- `--c7`: Context7 for best practices
- `--seq`: Sequential for planning
- `--no-mcp`: Native tools only

## Setup Workflows

### Node.js/TypeScript Setup

```bash
/dev-setup --stack node

📦 Node.js Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Environment Foundation:
├─ Node.js v20.x detected
├─ Package manager: npm
├─ Created: .nvmrc, .npmrc
└─ TypeScript configured

✅ Development Tools:
├─ ESLint + TypeScript rules
├─ Prettier formatting
├─ Husky pre-commit hooks
└─ Jest testing framework

✅ Build Configuration:
├─ Development server ready
├─ Hot reload enabled
├─ Build optimization set
└─ Environment configs

📄 Generated Files:
├─ package.json
├─ tsconfig.json
├─ .eslintrc.json
├─ .prettierrc
├─ jest.config.js
└─ .gitignore
```

### Python Development Setup

```bash
/dev-setup --stack python --tools

🐍 Python Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Python Environment:
├─ Python 3.11 detected
├─ Virtual env: .venv created
├─ Poetry dependency management
└─ Requirements files generated

✅ Development Tools:
├─ Black code formatter
├─ Flake8 + mypy linting
├─ pytest testing framework
└─ pre-commit hooks

📄 Generated Files:
├─ pyproject.toml
├─ .flake8
├─ mypy.ini
├─ pytest.ini
└─ .pre-commit-config.yaml
```

### React Frontend Setup

```bash
/dev-setup --stack react --testing

⚛️ React Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Project Structure:
├─ Vite + React + TypeScript
├─ TailwindCSS configured
├─ Component structure ready
└─ Routing configured

✅ Testing Setup:
├─ React Testing Library
├─ Jest + DOM Testing
├─ Cypress E2E tests
└─ Coverage reporting

✅ Development Experience:
├─ Fast refresh enabled
├─ ESLint React rules
├─ Accessibility linting
└─ Bundle analysis
```

## CI/CD Configurations

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - security
  - build
  - deploy

variables:
  NODE_VERSION: "20"

lint:
  stage: validate
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run lint
    - npm run prettier:check

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
```

## Development Tools

### ESLint Configuration

```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal"],
      "newlines-between": "always"
    }]
  }
}
```

### Testing Setup

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
```

## Docker Configuration

### Multi-Stage Dockerfile

```dockerfile
# Development
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## VS Code DevContainer

```json
{
  "name": "Development Container",
  "build": {
    "dockerfile": "Dockerfile",
    "target": "dev"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install"
}
```

## Team Collaboration

### Git Configuration

```gitignore
# Dependencies
node_modules/
.venv/
__pycache__/

# Build outputs
dist/
build/
*.egg-info/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
```

## Security Configuration

### Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=changeme

# Auth
JWT_SECRET=your-secret-here
SESSION_SECRET=your-session-secret

# External Services
API_KEY=your-api-key
SENTRY_DSN=your-sentry-dsn
```

## Validation & Verification

```bash
/dev-setup --validate

✅ Environment Validation
━━━━━━━━━━━━━━━━━━━━━━━━
Runtime: Node.js v20.x ✓
Package Manager: npm ✓
TypeScript: v5.x ✓
Linting: ESLint configured ✓
Formatting: Prettier ready ✓
Testing: Jest configured ✓
Git Hooks: Husky active ✓
CI/CD: GitHub Actions ✓
Docker: Compose ready ✓

🎉 Development environment ready!
```

## Integration with SuperClaude

### Intelligent Features
- **Auto-Detection**: Identifies project type and requirements
- **Best Practices**: Applies industry standards automatically
- **Tool Selection**: Chooses optimal tools for stack
- **Configuration**: Generates production-ready configs

### Quality Assurance
- **Validation**: Verifies all tools work correctly
- **Documentation**: Generates setup guides
- **Onboarding**: Creates team onboarding docs
- **Maintenance**: Setup update procedures

---

*SuperClaude Enhanced | Professional Dev Setup | Production-Ready Environments*