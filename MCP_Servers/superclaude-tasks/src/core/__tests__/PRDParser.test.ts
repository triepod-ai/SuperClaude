import { PRDParser } from '../PRDParser.js';
import { TaskState, TaskPriority, TaskComplexity } from '../../types/index.js';

describe('PRDParser', () => {
  let parser: PRDParser;

  beforeEach(() => {
    parser = new PRDParser();
  });

  describe('Basic PRD Parsing', () => {
    it('should parse a simple PRD document', async () => {
      const prdContent = `
# User Authentication System

## Overview
This document outlines the requirements for implementing a user authentication system.

## Requirements
- Implement secure user registration
- Create login functionality with JWT tokens
- Add password reset capability
- Ensure proper session management

## Security
- Must implement rate limiting
- Should use HTTPS only
- Need to add input validation
`;

      const result = await parser.parsePRD(prdContent, 'Auth System PRD');

      expect(result.title).toBe('Auth System PRD');
      expect(result.sections).toHaveLength(3);
      expect(result.extractedTasks.length).toBeGreaterThan(0);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBeDefined();
    });

    it('should extract title from H1 header when not provided', async () => {
      const prdContent = `
# E-commerce Platform Requirements

This is the main content of the document.
`;

      const result = await parser.parsePRD(prdContent);
      expect(result.title).toBe('E-commerce Platform Requirements');
    });

    it('should use fallback title when no H1 found', async () => {
      const prdContent = `
This is a document without any headers.
It contains some requirements but no title.
`;

      const result = await parser.parsePRD(prdContent);
      expect(result.title).toBe('Untitled Document');
    });
  });

  describe('Section Parsing', () => {
    it('should parse document sections correctly', async () => {
      const prdContent = `
# Main Title

## Section 1
Content for section 1.

### Subsection 1.1
Content for subsection 1.1.

## Section 2
Content for section 2.

#### Deep Subsection
Deep content.
`;

      const result = await parser.parsePRD(prdContent);

      expect(result.sections).toHaveLength(4);
      expect(result.sections[0].title).toBe('Section 1');
      expect(result.sections[0].level).toBe(2);
      expect(result.sections[1].title).toBe('Subsection 1.1');
      expect(result.sections[1].level).toBe(3);
      expect(result.sections[3].level).toBe(4);
    });
  });

  describe('Task Extraction', () => {
    it('should extract tasks from action items', async () => {
      const prdContent = `
# Feature Requirements

## Core Features
- Must implement user registration
- Should create login functionality
- Need to add password reset
- Will implement two-factor authentication

## Additional Requirements
The system shall provide secure authentication.
Users must be able to reset their passwords.
`;

      const result = await parser.parsePRD(prdContent);

      expect(result.extractedTasks.length).toBeGreaterThan(4);
      
      // Check that tasks have required fields
      result.extractedTasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.state).toBe(TaskState.PENDING);
        expect(task.priority).toBeDefined();
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
        expect(task.metadata.source).toBe('PRD');
      });
    });

    it('should detect priorities correctly', async () => {
      const content = `
## Requirements
- This is a critical security feature that must be implemented
- This is an important user experience improvement
- This is a nice to have enhancement for the future
- This is an optional feature that could be added later
`;

      const result = await parser.parsePRD(content);
      
      const criticalTasks = result.extractedTasks.filter(t => t.priority === TaskPriority.CRITICAL);
      const highTasks = result.extractedTasks.filter(t => t.priority === TaskPriority.HIGH);
      const lowTasks = result.extractedTasks.filter(t => t.priority === TaskPriority.LOW);

      expect(criticalTasks.length).toBeGreaterThan(0);
      expect(highTasks.length).toBeGreaterThan(0);
      expect(lowTasks.length).toBeGreaterThan(0);
    });

    it('should detect complexity correctly', async () => {
      const content = `
## Requirements
- Create a simple user profile page
- Implement complex distributed authentication system
- Build sophisticated machine learning recommendation engine
`;

      const result = await parser.parsePRD(content);
      
      const simpleTasks = result.extractedTasks.filter(t => t.complexity === TaskComplexity.SIMPLE);
      const complexTasks = result.extractedTasks.filter(t => t.complexity === TaskComplexity.COMPLEX);

      expect(simpleTasks.length).toBeGreaterThan(0);
      expect(complexTasks.length).toBeGreaterThan(0);
    });

    it('should extract tags based on content', async () => {
      const content = `
## Backend Requirements
- Implement secure API endpoints
- Create database models
- Add authentication middleware

## Frontend Requirements
- Build user interface components
- Implement responsive design
- Add accessibility features

## Testing Requirements
- Write unit tests for all components
- Implement integration testing
- Add end-to-end test coverage
`;

      const result = await parser.parsePRD(content);

      const backendTasks = result.extractedTasks.filter(t => t.tags.includes('backend'));
      const frontendTasks = result.extractedTasks.filter(t => t.tags.includes('frontend'));
      const testingTasks = result.extractedTasks.filter(t => t.tags.includes('testing'));

      expect(backendTasks.length).toBeGreaterThan(0);
      expect(frontendTasks.length).toBeGreaterThan(0);
      expect(testingTasks.length).toBeGreaterThan(0);
    });
  });

  describe('List Parsing', () => {
    it('should parse bullet point lists', async () => {
      const listContent = `
- Implement user registration
- Create login functionality
- Add password reset feature
- Set up email verification
`;

      const tasks = await parser.parseListForTasks(listContent);

      expect(tasks).toHaveLength(4);
      expect(tasks[0].title).toContain('Implement user registration');
      expect(tasks[1].title).toContain('Create login functionality');
    });

    it('should parse numbered lists', async () => {
      const listContent = `
1. Design the database schema
2. Implement the API endpoints
3. Create the frontend components
4. Write comprehensive tests
`;

      const tasks = await parser.parseListForTasks(listContent);

      expect(tasks).toHaveLength(4);
      expect(tasks[0].title).toContain('Design the database schema');
      expect(tasks[3].title).toContain('Write comprehensive tests');
    });

    it('should parse mixed list formats', async () => {
      const listContent = `
- Implement core functionality
* Add security features  
+ Create user interface
1. Write documentation
2. Deploy to production
a. Monitor performance
b. Gather user feedback
`;

      const tasks = await parser.parseListForTasks(listContent);

      expect(tasks.length).toBeGreaterThan(4);
    });
  });

  describe('Section-specific Task Parsing', () => {
    it('should parse section content for tasks', async () => {
      const sectionContent = `
This section outlines the security requirements for the system.

The system must implement the following security measures:
- Secure user authentication
- Data encryption at rest and in transit
- Regular security audits
- Input validation and sanitization

Additionally, the system should provide comprehensive logging
and monitoring capabilities for security events.
`;

      const tasks = await parser.parseSectionForTasks(sectionContent, 'Security Requirements');

      expect(tasks.length).toBeGreaterThan(0);
      
      // Check that tasks are tagged with section
      tasks.forEach(task => {
        expect(task.tags).toContain('security-requirements');
        expect(task.metadata.section).toBe('Security Requirements');
      });
    });
  });

  describe('Requirements with Acceptance Criteria', () => {
    it('should parse requirements and extract acceptance criteria', async () => {
      const content = `
# User Authentication

## User Registration Requirement
Users must be able to register for new accounts.

Acceptance Criteria:
- User can enter email and password
- System validates email format
- Password must meet complexity requirements
- Confirmation email is sent
- User account is created in database

## Login Requirement  
Users must be able to log into their accounts.

Acceptance Criteria:
- User can enter credentials
- System validates credentials
- JWT token is generated on success
- User is redirected to dashboard
`;

      const result = await parser.parseRequirementsWithAcceptance(content);

      expect(result.requirements.length).toBeGreaterThan(0);
      expect(Object.keys(result.acceptanceCriteria).length).toBeGreaterThan(0);

      // Check that acceptance criteria are associated with requirements
      const requirementIds = result.requirements.map(r => r.id);
      const criteriaIds = Object.keys(result.acceptanceCriteria);
      
      expect(criteriaIds.some(id => requirementIds.includes(id))).toBe(true);
    });
  });

  describe('Document Complexity Assessment', () => {
    it('should assess simple document as simple complexity', async () => {
      const simpleContent = `
# Simple Feature

## Requirements
- Add a button
- Make it clickable
`;

      const result = await parser.parsePRD(simpleContent);
      expect(result.metadata.complexity).toBe(TaskComplexity.SIMPLE);
    });

    it('should assess complex document as complex complexity', async () => {
      const complexContent = `
# Enterprise Authentication Platform

## System Architecture Requirements
The system must implement a distributed microservices architecture with 
service mesh integration, comprehensive observability, advanced security 
protocols, multi-tenant isolation, horizontal scalability, fault tolerance,
disaster recovery, compliance monitoring, and enterprise-grade performance.

## Security Requirements
Implement OAuth 2.0, SAML integration, multi-factor authentication, biometric
authentication, risk-based authentication, session management, token lifecycle
management, certificate management, encryption at rest and in transit, key
rotation, audit logging, compliance reporting, vulnerability scanning,
penetration testing, and security incident response.

## Performance Requirements
Support 10,000+ concurrent users, sub-100ms response times, 99.99% uptime,
automatic scaling, load balancing, caching strategies, database optimization,
CDN integration, monitoring and alerting, capacity planning, and performance
testing automation.

## Integration Requirements  
REST APIs, GraphQL endpoints, webhook support, event streaming, message queues,
database connectors, third-party integrations, legacy system compatibility,
data synchronization, and API versioning.

## Compliance Requirements
GDPR, HIPAA, SOX, PCI DSS compliance with data protection, privacy controls,
audit trails, data retention policies, and regulatory reporting.
`;

      const result = await parser.parsePRD(complexContent);
      expect([TaskComplexity.COMPLEX, TaskComplexity.VERY_COMPLEX]).toContain(
        result.metadata.complexity
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await parser.parsePRD('');
      
      expect(result.sections).toHaveLength(0);
      expect(result.extractedTasks).toHaveLength(0);
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle content without actionable items', async () => {
      const content = `
# Information Document

This document contains only informational content.
There are no actionable requirements or tasks.
It is purely descriptive text without any imperatives.
`;

      const result = await parser.parsePRD(content);
      expect(result.extractedTasks).toHaveLength(0);
    });

    it('should handle malformed markdown', async () => {
      const content = `
### Skipped H1 and H2
This starts with H3.

#### Then H4
Some content here.

## Back to H2
More content.
`;

      const result = await parser.parsePRD(content);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should handle very long task titles', async () => {
      const content = `
- Implement a very long task description that exceeds the normal length limits and should be truncated appropriately while maintaining the essential information about what needs to be accomplished in this particular requirement which is quite detailed and comprehensive in its scope and specifications
`;

      const tasks = await parser.parseListForTasks(content);
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title.length).toBeLessThanOrEqual(100);
      expect(tasks[0].title).toContain('...');
    });
  });

  describe('Action Item Detection', () => {
    it('should detect various action indicators', async () => {
      const content = `
## Requirements
- Must implement authentication
- Should add validation
- Will create database schema
- Need to setup monitoring
- Required to add logging
- Shall provide documentation
- Have to ensure security
- Must support mobile devices
`;

      const result = await parser.parsePRD(content);
      
      // All items should be detected as actionable
      expect(result.extractedTasks.length).toBe(8);
    });

    it('should detect imperative mood', async () => {
      const content = `
## Tasks
- Create user registration form
- Build authentication middleware
- Implement password hashing
- Design database schema
- Configure deployment pipeline
- Setup monitoring dashboard
- Test all functionality
- Deploy to production
`;

      const result = await parser.parsePRD(content);
      
      // All items start with action verbs
      expect(result.extractedTasks.length).toBe(8);
    });

    it('should ignore non-actionable content', async () => {
      const content = `
## Background Information
The current system has some limitations.
Users have expressed concerns about performance.
The market research shows increasing demand.
Technical analysis reveals potential improvements.
`;

      const result = await parser.parsePRD(content);
      
      // These are informational, not actionable
      expect(result.extractedTasks.length).toBe(0);
    });
  });
});