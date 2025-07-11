# SuperClaude Tasks MCP Server

A comprehensive Model Context Protocol (MCP) server for task management, decomposition, and Product Requirements Document (PRD) parsing within the SuperClaude framework.

## Features

### 🎯 **Queue-based Task Management**
- Persistent task storage with unique IDs
- Task states: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`
- Priority levels: `low`, `medium`, `high`, `critical`
- Complexity assessment: `simple`, `moderate`, `complex`, `very_complex`
- Dependency tracking and validation
- Multiple task queues with concurrency limits

### 🧠 **AI-driven Task Decomposition**
- Break down complex tasks into manageable subtasks
- Intelligent complexity assessment based on multiple factors
- Automatic dependency generation between subtasks
- Hour estimation distribution
- Configurable decomposition strategies
- Recursive decomposition with depth limits

### 📋 **PRD Parsing & Analysis**
- Parse Product Requirements Documents into structured tasks
- Extract actionable items from markdown and text documents
- Support for bullet points, numbered lists, and sections
- Automatic priority and complexity detection
- Acceptance criteria extraction
- Requirements hierarchy generation

### 🔄 **Advanced Task Operations**
- Task filtering and sorting
- Dependency and dependent tracking
- Subtask management
- Queue management and analytics
- Task statistics and reporting
- State transition validation

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# For development
npm run dev
```

## MCP Tools Reference

### Task Management

#### `create_task`
Create a new task with validation and dependency checking.

```json
{
  "name": "create_task",
  "arguments": {
    "title": "Implement user authentication",
    "description": "Create secure login system with JWT tokens",
    "priority": "high",
    "complexity": "complex",
    "dependencies": ["task-id-1", "task-id-2"],
    "tags": ["backend", "security"],
    "assignee": "developer@example.com",
    "estimatedHours": 16,
    "dueDate": "2024-12-31T23:59:59Z",
    "queueId": "backend-queue"
  }
}
```

#### `get_task`
Retrieve a task by ID.

```json
{
  "name": "get_task",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### `update_task`
Update an existing task.

```json
{
  "name": "update_task",
  "arguments": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "in_progress",
    "assignee": "new-developer@example.com",
    "actualHours": 8
  }
}
```

#### `list_tasks`
List tasks with filtering and sorting.

```json
{
  "name": "list_tasks",
  "arguments": {
    "filter": {
      "state": ["pending", "in_progress"],
      "priority": ["high", "critical"],
      "tags": ["backend"]
    },
    "sort": {
      "field": "priority",
      "direction": "desc"
    },
    "limit": 10,
    "offset": 0
  }
}
```

### Task Decomposition

#### `decompose_task`
Break down a complex task into subtasks.

```json
{
  "name": "decompose_task",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "maxDepth": 3,
    "targetComplexity": "simple",
    "estimateHours": true,
    "generateDependencies": true
  }
}
```

#### `assess_task_complexity`
Assess the complexity of a task.

```json
{
  "name": "assess_task_complexity",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### `suggest_breakdown_strategies`
Get suggestions for breaking down a task.

```json
{
  "name": "suggest_breakdown_strategies",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### PRD Parsing

#### `parse_prd`
Parse a complete PRD document.

```json
{
  "name": "parse_prd",
  "arguments": {
    "content": "# User Authentication System\n\n## Requirements\n- Implement secure login\n- Support JWT tokens\n- Add password reset functionality",
    "title": "Authentication System PRD"
  }
}
```

#### `parse_section_for_tasks`
Parse a specific section for tasks.

```json
{
  "name": "parse_section_for_tasks",
  "arguments": {
    "content": "## Security Requirements\n- Implement rate limiting\n- Add input validation\n- Enable HTTPS only",
    "sectionTitle": "Security Requirements"
  }
}
```

#### `parse_list_for_tasks`
Parse bullet points or numbered lists.

```json
{
  "name": "parse_list_for_tasks",
  "arguments": {
    "listContent": "- Create user registration form\n- Implement email verification\n- Add password strength validation"
  }
}
```

### Queue Management

#### `create_queue`
Create a new task queue.

```json
{
  "name": "create_queue",
  "arguments": {
    "name": "Frontend Development",
    "description": "Tasks related to frontend development",
    "maxConcurrentTasks": 5
  }
}
```

#### `get_next_executable_tasks`
Get next tasks that can be executed.

```json
{
  "name": "get_next_executable_tasks",
  "arguments": {
    "queueId": "frontend-queue"
  }
}
```

### Analytics

#### `get_task_statistics`
Get comprehensive task statistics.

```json
{
  "name": "get_task_statistics",
  "arguments": {}
}
```

#### `get_task_dependencies`
Get tasks that a task depends on.

```json
{
  "name": "get_task_dependencies",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Architecture

### Core Components

#### `TaskQueueManager`
- **Purpose**: Central task storage and queue management
- **Features**: CRUD operations, dependency validation, state transitions
- **Integration**: Persistent task IDs, queue-based organization

#### `TaskDecomposer`
- **Purpose**: AI-driven task breakdown and complexity analysis
- **Features**: Multi-factor complexity scoring, strategy suggestions
- **Integration**: Automatic subtask creation, dependency generation

#### `PRDParser`
- **Purpose**: Document parsing and task extraction
- **Features**: Markdown parsing, action item detection, priority extraction
- **Integration**: Structured document analysis, requirements extraction

#### `MCPServer`
- **Purpose**: MCP protocol implementation and tool orchestration
- **Features**: 20+ tools, error handling, validation
- **Integration**: Type-safe operations, comprehensive tool coverage

### Type System

The server uses a comprehensive TypeScript type system with Zod validation:

- **Core Types**: `Task`, `TaskQueue`, `PRDSection`, `PRDParseResult`
- **Enums**: `TaskState`, `TaskPriority`, `TaskComplexity`
- **Validation**: Runtime type checking with meaningful error messages
- **Error Types**: Custom error classes for different failure modes

### Integration Patterns

#### Research-Based Implementation
- **MCP TaskManager Pattern**: Queue-based storage with persistent IDs
- **Task Manager MCP Pattern**: AI-driven decomposition with complexity assessment
- **Claude Task Master Pattern**: PRD parsing with actionable item extraction

#### SuperClaude Framework Integration
- **Command Integration**: Works with `/task`, `/build`, `/analyze` commands
- **Hook System**: Integrates with task management hooks
- **Quality Gates**: Validation cycles and error handling
- **Wave Mode**: Multi-stage task orchestration support

## Usage Examples

### Basic Task Management

```typescript
// Create a task
const task = await createTask({
  title: "Implement search functionality",
  description: "Add full-text search with filters",
  priority: "high",
  complexity: "complex"
});

// Update task state
await updateTask({
  id: task.id,
  state: "in_progress",
  assignee: "developer@team.com"
});
```

### Task Decomposition

```typescript
// Decompose complex task
const result = await decomposeTask(complexTask.id, {
  maxDepth: 3,
  targetComplexity: "simple",
  estimateHours: true
});

console.log(`Created ${result.subtasks.length} subtasks`);
```

### PRD Processing

```typescript
// Parse PRD document
const prdContent = `
# E-commerce Platform

## Core Features
- User registration and authentication
- Product catalog with search
- Shopping cart functionality
- Payment processing
- Order management
`;

const parseResult = await parsePRD(prdContent);
console.log(`Extracted ${parseResult.extractedTasks.length} tasks`);
```

## Error Handling

The server implements comprehensive error handling:

- **Task Validation**: Schema validation with detailed error messages
- **Dependency Validation**: Circular dependency detection
- **State Transitions**: Valid state transition enforcement
- **Not Found Errors**: Clear error messages for missing resources
- **MCP Error Mapping**: Proper MCP error codes and messages

## Performance Considerations

- **In-Memory Storage**: Fast access with Map-based storage
- **Lazy Loading**: On-demand complexity assessment
- **Batch Operations**: Efficient bulk task operations
- **Caching**: Result caching for expensive operations
- **Validation**: Early validation to prevent invalid states

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Add tests** for new functionality
4. **Ensure type safety** with TypeScript
5. **Update documentation** as needed
6. **Submit pull request**

## License

MIT License - see LICENSE file for details.

## Integration with SuperClaude Framework

This MCP server is designed to work seamlessly with the SuperClaude framework:

- **Command Integration**: Supports `/task`, `/build`, `/analyze`, and other commands
- **Hook Integration**: Works with task management and quality validation hooks
- **Persona Integration**: Supports different personas for task assignment
- **Wave Mode**: Enables multi-stage task execution and validation
- **Quality Gates**: Implements validation cycles for task quality assurance

For more information about the SuperClaude framework, see the main project documentation.