---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Comprehensive testing workflows with generation, execution, and quality assurance"
---

# /test - Comprehensive Testing Framework

**Purpose**: Complete testing workflows including generation, execution, and quality assurance  
**Category**: Testing  
**Syntax**: `/test $ARGUMENTS`

## Examples

```bash
/test                               # Auto-detect and run appropriate tests
/test @src/ --unit --coverage       # Unit tests with coverage for src directory
/test --e2e --browser chrome        # End-to-end tests in Chrome browser
/test !npm run test --watch         # Run npm test command in watch mode
/test --performance --baseline      # Performance testing with baseline establishment
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[target]` - Files/directories to test (default: auto-detect test files)
- `@<path>` - Explicit file or directory targeting
- `!<command>` - Execute specific test command
- `--<flag>` - Test type and configuration options

### Test Types

- `--unit`: Fast, isolated unit tests with mocking
- `--integration`: Component interaction and service integration tests
- `--e2e`: End-to-end browser automation testing
- `--api`: REST/GraphQL API endpoint testing
- `--performance`: Load testing, benchmarking, and performance analysis
- `--security`: Security vulnerability scanning and penetration testing

### Test Execution Modes

- `--watch`: Continuous testing on file changes
- `--parallel`: Run tests in parallel workers for speed
- `--sequential`: Run tests sequentially for debugging
- `--bail`: Stop execution on first test failure
- `--retry <count>`: Retry failed tests specified number of times

### Coverage & Quality

- `--coverage`: Generate comprehensive coverage reports
- `--threshold <percentage>`: Coverage threshold requirement (default: 80%)
- `--mutation`: Mutation testing to verify test quality
- `--snapshot`: Update and verify snapshot tests

### Test Generation

- `--generate`: Auto-generate test scaffolding and basic tests
- `--scaffold`: Create test structure and configuration
- `--template <type>`: Use specific test template (unit|integration|e2e)
- `--mock`: Generate mock objects and test doubles

### Framework Selection

- `--jest`: Use Jest testing framework (default for JavaScript/TypeScript)
- `--vitest`: Use Vitest for modern Vite-based projects
- `--playwright`: Use Playwright for cross-browser E2E testing
- `--cypress`: Use Cypress for E2E testing and debugging

### Universal SuperClaude Flags

- `--plan`: Show test execution plan before running
- `--think`: Standard test strategy analysis (~4K tokens)
- `--think-hard`: Deep testing strategy and coverage analysis (~10K tokens)
- `--introspect`: Show test selection and strategy reasoning

### Persona Integration

- `--persona-qa`: Quality assurance specialist, comprehensive testing focus
- `--persona-performance`: Performance testing and optimization expert
- `--persona-security`: Security testing and vulnerability assessment

### MCP Server Control

- `--c7`: Enable Context7 for testing framework documentation and patterns
- `--seq`: Enable Sequential for complex test planning and strategy
- `--pup`: Enable Puppeteer for browser-based E2E testing
- `--all-mcp`: Comprehensive testing with all available tools

## Workflow Process

### Phase 1: Test Discovery & Planning
1. **Test Detection**: Discover existing test files and patterns
2. **Framework Identification**: Identify testing frameworks and tools in use
3. **Strategy Planning**: Determine optimal test approach and coverage
4. **Configuration Review**: Analyze test configuration and setup

### Phase 2: Test Preparation
1. **Environment Setup**: Configure test environment and dependencies
2. **Mock Preparation**: Set up mocks, stubs, and test doubles
3. **Data Preparation**: Prepare test data and fixtures
4. **Infrastructure Setup**: Configure test databases and services

### Phase 3: Test Execution
1. **Test Running**: Execute tests according to strategy and configuration
2. **Progress Monitoring**: Track test progress and collect metrics
3. **Failure Analysis**: Analyze and categorize test failures
4. **Coverage Collection**: Gather code coverage data and metrics

### Phase 4: Results & Reporting
1. **Results Analysis**: Analyze test results and identify patterns
2. **Coverage Reporting**: Generate comprehensive coverage reports
3. **Quality Assessment**: Evaluate test quality and effectiveness
4. **Recommendations**: Provide improvement suggestions

## Testing Strategies

### Unit Testing Strategy

**Unit Test Characteristics**:
- Fast execution (<100ms per test)
- Isolated from external dependencies
- High code coverage (>90% for critical paths)
- Clear, descriptive test names

**Unit Testing Report**:
```bash
🧪 Unit Testing Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tests Passed: 247/250 (98.8%)
❌ Tests Failed: 3/250 (1.2%)
⏱️ Execution Time: 12.3s

📊 Coverage Report:
├─ Line Coverage: 94.2% (target: >90%) ✅
├─ Branch Coverage: 87.6% (target: >80%) ✅
├─ Function Coverage: 96.8% (target: >95%) ✅
└─ Statement Coverage: 93.1% (target: >90%) ✅

🎯 Quality Metrics:
├─ Test-to-Code Ratio: 1.3:1
├─ Average Test Time: 49ms
├─ Flaky Tests: 0 (excellent)
└─ Assertion Density: 3.2 per test
```

### Integration Testing Strategy

**Integration Test Focus**:
- API endpoint testing
- Database integration validation
- Service-to-service communication
- Configuration and environment validation

**Integration Testing Results**:
```bash
🔗 Integration Testing Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ API Tests: 89/92 (96.7%)
✅ Database Tests: 45/45 (100%)
✅ Service Tests: 67/72 (93.1%)
⚠️ Config Tests: 23/25 (92.0%)

🌐 API Endpoint Coverage:
├─ GET endpoints: 45/45 (100%) ✅
├─ POST endpoints: 23/25 (92%) ⚠️
├─ PUT endpoints: 12/12 (100%) ✅
└─ DELETE endpoints: 9/10 (90%) ⚠️

📊 Performance Metrics:
├─ Response Time: 156ms avg (target: <200ms) ✅
├─ Throughput: 247 req/s (target: >200) ✅
├─ Error Rate: 0.8% (target: <2%) ✅
└─ Timeout Rate: 0.0% (target: <1%) ✅
```

### End-to-End Testing Strategy

**E2E Test Coverage**:
- Critical user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility compliance

**E2E Testing Results**:
```bash
🌍 End-to-End Testing Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ Browser Coverage:
├─ Chrome: 23/23 tests (100%) ✅
├─ Firefox: 22/23 tests (95.7%) ⚠️
├─ Safari: 21/23 tests (91.3%) ⚠️
└─ Edge: 23/23 tests (100%) ✅

📱 Mobile Testing:
├─ iOS Safari: 18/20 tests (90%) ⚠️
├─ Android Chrome: 20/20 tests (100%) ✅
└─ Responsive Design: 15/15 tests (100%) ✅

♿ Accessibility Testing:
├─ WCAG 2.1 AA: 94% compliance ✅
├─ Keyboard Navigation: 100% functional ✅
├─ Screen Reader: 89% compatible ⚠️
└─ Color Contrast: 100% compliant ✅
```

### Performance Testing Strategy

**Performance Test Types**:
- Load testing (normal traffic simulation)
- Stress testing (beyond normal capacity)
- Spike testing (sudden traffic increases)
- Volume testing (large data sets)

**Performance Testing Results**:
```bash
⚡ Performance Testing Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Load Testing (1000 concurrent users):
├─ Response Time: 234ms avg (target: <500ms) ✅
├─ Throughput: 1247 req/s (target: >1000) ✅
├─ Error Rate: 0.3% (target: <1%) ✅
└─ Resource Usage: 67% CPU, 45% Memory ✅

🚀 Stress Testing (2500 concurrent users):
├─ Response Time: 567ms avg (degraded gracefully) ✅
├─ Throughput: 1893 req/s (sustained) ✅
├─ Breaking Point: 3200 users identified ✅
└─ Recovery Time: 45s after load reduction ✅

📊 Performance Metrics:
├─ Database Response: 23ms avg ✅
├─ Cache Hit Rate: 87% ✅
├─ Memory Leaks: None detected ✅
└─ Connection Pool: Stable utilization ✅
```

## Test Generation & Scaffolding

### Automated Test Generation

**Test Generation Capabilities**:
- Unit test scaffolding based on function signatures
- Integration test templates for API endpoints
- E2E test scenarios for user workflows
- Mock generation for external dependencies

**Test Generation Example**:
```bash
/test --generate @src/services/UserService.ts

🏗️ Generating tests for UserService...
📝 Created test scaffolding:

✅ Generated Files:
├─ __tests__/UserService.unit.test.ts (15 test cases)
├─ __tests__/UserService.integration.test.ts (8 scenarios)
├─ __mocks__/UserRepository.ts (mock implementation)
└─ fixtures/user-test-data.json (test data)

🧪 Test Coverage Preview:
├─ createUser(): 5 test cases
├─ getUserById(): 3 test cases
├─ updateUser(): 4 test cases
├─ deleteUser(): 3 test cases
└─ validateUser(): 3 test cases

💡 Next Steps:
1. Review generated tests and customize as needed
2. Add edge cases and error scenarios
3. Run tests: /test @__tests__/UserService*
```

### Test Template System

**Available Templates**:
- React Component Testing (with React Testing Library)
- Node.js API Testing (with Supertest)
- Database Testing (with test containers)
- Frontend E2E Testing (with Playwright/Cypress)

## Quality Assurance Integration

### Test Quality Metrics

**Test Quality Assessment**:
- Test coverage completeness
- Test execution speed
- Test reliability (flakiness detection)
- Test maintainability score

**Quality Report**:
```bash
📊 Test Quality Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Overall Test Quality Score: 87/100

📈 Quality Metrics:
├─ Coverage Quality: 92/100 ✅
├─ Test Reliability: 95/100 ✅
├─ Execution Speed: 78/100 ⚠️
├─ Maintainability: 84/100 ✅
└─ Assertion Quality: 89/100 ✅

🔍 Improvement Opportunities:
├─ Slow tests: 23 tests >1s execution time
├─ Missing edge cases: 12 functions need additional tests
├─ Flaky tests: 2 tests with intermittent failures
└─ Low assertion density: 15 tests need more assertions
```

### Continuous Testing Integration

**CI/CD Pipeline Integration**:
- Automated test execution on commits
- Parallel test running for faster feedback
- Test result reporting and notifications
- Quality gate enforcement

## Example Workflows

### Basic Test Execution
```bash
/test @src/ --unit --coverage

🧪 Unit Testing Starting...
📊 Discovered 247 test files
⚡ Running tests in parallel...

✅ Test Results:
├─ Passed: 243/247 (98.4%)
├─ Failed: 4/247 (1.6%)
├─ Skipped: 0/247 (0%)
└─ Duration: 15.3s

📊 Coverage: 89.2% (target: 80%) ✅
📋 Report: coverage/index.html
```

### E2E Testing with Multiple Browsers
```bash
/test --e2e --browsers chrome,firefox,safari

🌍 E2E Testing Starting...
🖥️ Launching browser environments...
🧪 Running 23 test scenarios...

✅ Results by Browser:
├─ Chrome: 23/23 (100%) ✅
├─ Firefox: 22/23 (95.7%) ⚠️
└─ Safari: 21/23 (91.3%) ⚠️

⚠️ Failed Tests:
├─ firefox: "Payment form validation" (timeout)
└─ safari: "File upload workflow" (compatibility)

📊 Overall Success Rate: 95.7%
```

### Performance Testing with Baselines
```bash
/test --performance --baseline --load 1000

⚡ Performance Testing Starting...
📊 Establishing baseline with 100 users...
🚀 Scaling to 1000 concurrent users...

📈 Performance Results:
├─ Baseline: 145ms avg response time
├─ Load Test: 234ms avg response time (+61%)
├─ Throughput: 1247 req/s (target: >1000) ✅
└─ Error Rate: 0.3% (excellent)

🎯 Performance Grade: A- (91/100)
📋 Detailed report: performance-report.html
```

### Test Generation for New Feature
```bash
/test --generate @src/features/payment/ --template api

🏗️ Generating API tests for payment feature...
🔍 Analyzing 12 endpoint functions...
📝 Creating comprehensive test suite...

✅ Generated Test Suite:
├─ payment.unit.test.ts (45 test cases)
├─ payment.integration.test.ts (23 scenarios)
├─ payment.e2e.test.ts (8 user journeys)
└─ payment-mocks.ts (test doubles)

🧪 Coverage Estimate: 94% line coverage
⏱️ Estimated Test Time: 8.2s
💡 Ready for customization and execution
```

## Integration with SuperClaude

### Intelligent Test Strategy
- **Framework Detection**: Automatic identification of testing tools and patterns
- **Smart Test Selection**: Choose optimal tests based on code changes
- **Quality Optimization**: Suggest improvements for test coverage and quality
- **Performance Monitoring**: Track test execution performance trends

### Automated Workflows
- **Progress Tracking**: TodoWrite integration for complex testing projects
- **Results Analysis**: Automated analysis of test results and trends
- **Quality Gates**: Enforce quality standards before deployment
- **Continuous Improvement**: Learn from test patterns and optimize strategies

---

*SuperClaude Enhanced | Comprehensive Testing | Quality Assurance Excellence*