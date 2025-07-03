---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Comprehensive design system for architecture, APIs, databases, UI/UX, security, and infrastructure"
---

# /design - System Design Framework

**Purpose**: Create comprehensive system designs with validation, patterns, and implementation guidance  
**Category**: System & Setup  
**Syntax**: `/design $ARGUMENTS`

## Examples

```bash
/design --architecture microservices                # Design microservices architecture
/design --api rest --openapi user-management       # RESTful API with OpenAPI spec
/design --database --relational e-commerce         # Database schema design
/design --ui --design-system admin-dashboard       # UI/UX design system
/design --security --threat-model banking-app       # Security architecture
/design @existing-system/ --validate                # Validate existing design
/design !npm run build --infrastructure k8s         # Infrastructure from build output
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[domain]` - Design focus area or system name
- `@<path>` - Analyze existing system for design
- `!<command>` - Execute command and design based on output
- `--<flag>` - Design options and specifications

### Design Domains

- `--architecture`: System architecture and patterns
- `--api`: API design and specifications
- `--database`: Data architecture and schemas
- `--ui` / `--ux`: User interface and experience
- `--security`: Security patterns and threat models
- `--infrastructure`: Deployment and operations

### Design Process

- `--design-thinking`: Empathize → Define → Ideate → Prototype → Test
- `--lean`: Build → Measure → Learn cycles
- `--agile`: Iterative design development

### Quality Levels

- `--concept`: High-level strategic design
- `--detailed`: Component-level specifications
- `--implementation-ready`: Complete with code templates

### Validation Options

- `--validate`: Pattern compliance checking
- `--review`: Quality assessment
- `--analyze`: Complexity and debt analysis

### Output Formats

- `--documentation`: Comprehensive docs
- `--diagrams`: Visual architectures
- `--specifications`: Technical specs
- `--prototypes`: Interactive demos
- `--implementation-guide`: Step-by-step guide

### Universal SuperClaude Flags

- `--plan`: Show design strategy
- `--think`: Standard analysis
- `--think-hard`: Deep design analysis
- `--ultrathink`: Maximum depth
- `--introspect`: Show reasoning

### Persona Integration

- `--persona-architect`: System design focus
- `--persona-security`: Security perspective
- `--persona-frontend`: UI/UX emphasis
- `--persona-backend`: Server architecture

### MCP Server Control

- `--seq`: Sequential for planning
- `--c7`: Context7 for patterns
- `--magic`: Magic for UI components
- `--pup`: Puppeteer for validation
- `--no-mcp`: Native tools only

## Design Patterns

### Architecture Patterns

#### Microservices
```yaml
Architecture: Event-Driven Microservices
Services:
  UserService: Authentication, profiles
  OrderService: Order processing
  PaymentService: Payment handling
  NotificationService: Communications

Communication:
  Sync: REST for queries
  Async: Events for workflows
  
Data: Database per service
Resilience: Circuit breakers, retries
```

#### Cloud-Native
```yaml
Platform: Kubernetes Multi-Tenant
Components:
  API Gateway: Kong/Istio
  Service Mesh: Istio
  Observability: Prometheus/Jaeger
  Storage: PV/PVC patterns
  
Security:
  RBAC: Fine-grained permissions
  Network Policies: Zero-trust
  Secrets: Encrypted at rest
```

### API Design

#### RESTful API
```yaml
Resource: /api/v1/products
Methods:
  GET: List with pagination
  POST: Create new product
  GET /{id}: Retrieve specific
  PUT /{id}: Full update
  PATCH /{id}: Partial update
  DELETE /{id}: Remove

Response Format:
  Success: { data, meta, links }
  Error: { error, meta }
  
Security: OAuth 2.0 + API keys
```

#### GraphQL Design
```graphql
type Product {
  id: ID!
  name: String!
  price: Float!
  category: Category
  reviews: [Review!]!
}

type Query {
  products(filter: ProductFilter): ProductConnection!
  product(id: ID!): Product
}

type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
}
```

### Database Design

#### Relational Schema
```sql
-- Users table with audit
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Optimized indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);

-- Partitioned for scale
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);
```

#### NoSQL Patterns
```javascript
// Document store (MongoDB)
{
  _id: ObjectId(),
  userId: "user-123",
  orderItems: [
    { productId: "prod-456", quantity: 2, price: 29.99 }
  ],
  status: "pending",
  createdAt: ISODate()
}

// Key-value (Redis)
user:123:session -> { token, expires }
product:456:cache -> { data, ttl }
```

### UI/UX Design

#### Design System
```yaml
Design Tokens:
  Colors:
    primary: { 50: "#f0f9ff", 500: "#3b82f6" }
    semantic: { success: "#10b981", error: "#ef4444" }
    
  Typography:
    family: "Inter, system-ui"
    scale: { sm: 14px, base: 16px, lg: 18px }
    
  Spacing: { 1: 4px, 2: 8px, 4: 16px, 8: 32px }

Components:
  Button:
    variants: [primary, secondary, outline]
    sizes: [sm, md, lg]
    states: [default, hover, disabled]
```

### Security Architecture

#### Authentication Flow
```yaml
Multi-Factor Auth:
  Primary: Username/password
  Secondary: TOTP/SMS/Hardware
  Biometric: Mobile devices

Session Management:
  Storage: Secure HTTP-only cookies
  Duration: 12 hours with refresh
  Revocation: Immediate blacklist

API Security:
  Rate Limiting: 1000/hour/user
  CORS: Whitelist origins
  CSP: Strict policies
```

## Workflow Examples

### System Architecture Design

```bash
/design --architecture microservices e-commerce --think-hard

🏗️ Architecture Design: E-commerce Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Domain Analysis:
├─ Core Domains: User, Product, Order, Payment
├─ Supporting: Notification, Analytics, Search
└─ Generic: Auth, Logging, Monitoring

🎯 Service Decomposition:
├─ UserService: Registration, profiles, auth
├─ CatalogService: Products, categories, search
├─ OrderService: Cart, checkout, fulfillment
├─ PaymentService: Processing, refunds, reconciliation
└─ NotificationService: Email, SMS, push

🔗 Integration Patterns:
├─ Sync: REST for queries (product details)
├─ Async: Events for workflows (order flow)
└─ Hybrid: GraphQL gateway for mobile

💾 Data Strategy:
├─ PostgreSQL: Transactional data
├─ MongoDB: Product catalog
├─ Redis: Session cache
└─ Elasticsearch: Search index
```

### API Design

```bash
/design --api rest --openapi payment-api --validate

📋 API Design: Payment Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ OpenAPI 3.0 Specification Generated

Endpoints:
POST   /payments          Create payment
GET    /payments/{id}     Get payment status
POST   /payments/{id}/capture    Capture auth
POST   /payments/{id}/refund     Issue refund
GET    /payments          List payments

Security: Bearer token (JWT)
Rate Limit: 100 req/min
Versioning: URL path (/v1/)

📄 Generated: payment-api-spec.yaml
```

### Database Design

```bash
/design --database --relational analytics --performance

💾 Database Design: Analytics System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Schema Design:
├─ Fact Tables: events, transactions
├─ Dimensions: users, products, time
└─ Aggregates: daily_stats, user_metrics

🚀 Performance Optimizations:
├─ Partitioning: By date (monthly)
├─ Indexes: Covering indexes on queries
├─ Materialized Views: Common aggregations
└─ Compression: Historical data

📈 Scaling Strategy:
├─ Read Replicas: Analytics queries
├─ Connection Pooling: PgBouncer
└─ Caching: Redis for hot data
```

### Security Design

```bash
/design --security --threat-model banking-app

🔒 Security Architecture: Banking Application
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Threat Model (STRIDE):
├─ Spoofing: MFA, device fingerprinting
├─ Tampering: Request signing, integrity checks
├─ Repudiation: Audit logs, immutable ledger
├─ Info Disclosure: E2E encryption, PII masking
├─ DoS: Rate limiting, circuit breakers
└─ Elevation: RBAC, principle of least privilege

🛡️ Security Controls:
├─ Network: WAF, DDoS protection, VPN
├─ Application: Input validation, OWASP Top 10
├─ Data: Encryption at rest/transit, tokenization
└─ Compliance: PCI DSS, SOC 2, GDPR
```

## Validation & Analysis

### Design Validation

```bash
/design @existing-system/ --validate

📊 Design Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Score: 82/100

✅ Strengths:
├─ Consistent API patterns
├─ Strong security posture
└─ Good separation of concerns

⚠️ Issues Found:
├─ Missing API versioning strategy
├─ No caching layer defined
└─ Hardcoded configurations (12 files)

💡 Recommendations:
1. Implement API versioning
2. Add Redis caching layer
3. Use environment variables
```

### Anti-Pattern Detection

```bash
⚠️ Anti-Patterns Detected:

1. God Object: UserService
   Impact: High maintenance cost
   Fix: Split into focused services

2. N+1 Queries: Product API
   Impact: Performance degradation
   Fix: Eager loading or batch queries

3. Chatty Services: 47 API calls/page
   Impact: High latency
   Fix: API aggregation layer
```

## Implementation Guidance

### Generated Artifacts

1. **Architecture Diagrams**: Mermaid/PlantUML
2. **API Specifications**: OpenAPI 3.0
3. **Database Schemas**: SQL DDL scripts
4. **Design Documentation**: Markdown guides
5. **Implementation Plan**: Phased approach
6. **Test Strategies**: Coverage requirements

### Step-by-Step Guide

```markdown
# Implementation Guide

## Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure
- [ ] Configure development environment
- [ ] Implement core domain models
- [ ] Set up CI/CD pipeline

## Phase 2: Services (Week 3-4)
- [ ] Implement user service
- [ ] Build product catalog
- [ ] Create order management
- [ ] Add payment processing

## Phase 3: Integration (Week 5)
- [ ] API gateway setup
- [ ] Service communication
- [ ] Error handling
- [ ] Monitoring setup
```

## Integration with SuperClaude

### Intelligent Features
- **Pattern Recognition**: Auto-detect existing patterns
- **Anti-Pattern Detection**: Find design smells
- **Performance Modeling**: Predict characteristics
- **Security Assessment**: Vulnerability analysis

### Quality Assurance
- **Consistency Checking**: Cross-domain validation
- **Impact Analysis**: Change assessment
- **Compliance Verification**: Standards adherence
- **Evolution Planning**: Future-proof design

---

*SuperClaude Enhanced | Comprehensive Design System | Pattern-Based Architecture*