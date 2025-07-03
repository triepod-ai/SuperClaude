---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite, TodoRead, Edit, MultiEdit, Write, WebFetch]
description: "Generate clear educational explanations of technical concepts, code patterns, and systems"
---

# /explain - Technical Explanation Generator

**Purpose**: Generate tailored explanations of technical concepts, code patterns, and systems  
**Category**: Analysis & Education  
**Syntax**: `/explain $ARGUMENTS`

## Examples

```bash
/explain "React hooks"                           # Basic explanation of React hooks
/explain @src/auth.js --detailed                # Explain code in specific file
/explain "async/await" --depth beginner         # Beginner-friendly explanation
/explain "microservices" --style tutorial       # Tutorial-style architecture guide
/explain !npm list --focus dependencies         # Explain project dependencies
/explain "B-tree indexing" --visual             # Include visual diagrams
```

## Command Arguments

**$ARGUMENTS Processing**:
- `[topic]` - Concept, code pattern, or system to explain
- `@<path>` - Explain code in specific file/directory
- `!<command>` - Execute command and explain results
- `--<flag>` - Control depth, style, and focus

### Depth Levels

- `--depth beginner`: Fundamental concepts with analogies
- `--depth intermediate`: Standard technical depth (default)
- `--depth advanced`: Deep technical details and edge cases
- `--depth expert`: Research-level analysis and internals

### Explanation Styles

- `--style tutorial`: Step-by-step learning format
- `--style reference`: Concise quick-lookup format (default)
- `--style conversational`: Natural dialogue approach
- `--style academic`: Formal with citations

### Focus Areas

- `--focus theory`: Theoretical foundations
- `--focus practical`: Implementation and usage
- `--focus performance`: Optimization strategies
- `--focus security`: Security implications
- `--focus debugging`: Common issues and solutions

### Enhancement Options

- `--examples [level]`: Code examples (minimal|standard|comprehensive)
- `--visual`: Include diagrams and visual aids
- `--quiz`: Add comprehension questions
- `--citations`: Include references and sources
- `--interactive`: Enable follow-up questions

### Universal SuperClaude Flags

- `--plan`: Show explanation outline first
- `--think`: Analyze topic complexity
- `--think-hard`: Deep conceptual analysis
- `--introspect`: Show reasoning process

### Persona Integration

- `--persona-mentor`: Teaching-focused approach
- `--persona-architect`: System design perspective
- `--persona-security`: Security-focused analysis
- `--persona-performance`: Optimization perspective

### MCP Server Control

- `--c7`: Enable Context7 for documentation
- `--seq`: Enable Sequential for complex analysis
- `--magic`: Enable Magic for UI explanations
- `--no-mcp`: Use only native Claude Code tools

## Workflow Process

### Phase 1: Topic Analysis
1. **Parse Request**: Extract key concepts to explain
2. **Assess Complexity**: Determine inherent difficulty
3. **Identify Prerequisites**: Required background knowledge
4. **Scope Definition**: Set explanation boundaries

### Phase 2: Content Generation
1. **Structure Selection**: Choose appropriate template
2. **Core Concepts**: Present fundamental ideas
3. **Examples Creation**: Build illustrative code
4. **Visual Design**: Plan diagrams if needed

### Phase 3: Quality Enhancement
1. **Verify Accuracy**: Check technical correctness
2. **Ensure Clarity**: Match language to depth level
3. **Add Context**: Include practical applications
4. **Polish Output**: Format for readability

## Explanation Templates

### Beginner Tutorial

```markdown
# Understanding [Topic]

## What is it?
[Simple definition with real-world analogy]

## Why use it?
[Practical benefits and use cases]

## Basic Example
```[code]
// Simple working example
// With line-by-line comments
```

## How it works
[Step-by-step explanation with visuals]

## Common Mistakes
- [Mistake 1]: How to avoid
- [Mistake 2]: Better approach

## Try it yourself
[Guided exercise]

## Next Steps
[Path to deeper understanding]
```

### Intermediate Reference

```markdown
# [Topic] Guide

## Overview
[Technical definition and context]

## Key Concepts
- **Concept 1**: [Explanation]
- **Concept 2**: [Explanation]

## Implementation
```[code]
// Practical example with annotations
```

## Common Patterns
[Typical usage scenarios]

## Best Practices
- [Practice 1]: [Rationale]
- [Practice 2]: [Benefits]

## Gotchas
⚠️ [Issue]: [Solution]

## Related Topics
- [Topic 1]: [Connection]
- [Topic 2]: [Relevance]
```

### Advanced Deep Dive

```markdown
# [Topic]: Technical Deep Dive

## Architecture
[System design and internals]

## Implementation Details
```[code]
// Complex example with performance notes
```

## Optimization Techniques
[Advanced strategies and benchmarks]

## Edge Cases
[Boundary conditions and handling]

## Production Considerations
[Scale, reliability, monitoring]

## Further Research
[Papers, specs, advanced resources]
```

## Example Workflows

### Basic Concept Explanation

```bash
/explain "closures in JavaScript"

📚 Closures in JavaScript
━━━━━━━━━━━━━━━━━━━━━━━━━

## What are closures?
Think of a closure like a backpack that a function carries around, 
containing variables from where it was created.

## Simple Example:
```javascript
function outerFunction(x) {
  // Variable 'x' is in the backpack
  return function innerFunction(y) {
    // Can access 'x' from the backpack
    return x + y;
  };
}

const addFive = outerFunction(5);
console.log(addFive(3)); // 8
```

## Why are they useful?
- Data privacy (encapsulation)
- Creating function factories
- Event handlers with state

💡 Key insight: Functions remember their birthplace!
```

### Code File Explanation

```bash
/explain @src/auth/jwt.js --focus security

🔍 Analyzing JWT Authentication Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## File Purpose
This module handles JWT token generation and validation
for user authentication.

## Security Analysis:
✅ Strong: RS256 algorithm (asymmetric)
✅ Strong: Token expiration (15 min)
⚠️ Consider: Refresh token rotation
❌ Issue: No rate limiting on verify

## Key Functions:

### generateToken(user)
- Creates JWT with user claims
- Signs with private key
- Includes expiration timestamp

### verifyToken(token)
- Validates signature with public key
- Checks expiration
- Returns decoded payload

## Recommendations:
1. Add refresh token rotation
2. Implement rate limiting
3. Consider JTI for revocation
```

### Tutorial-Style Explanation

```bash
/explain "Redux state management" --style tutorial --depth beginner

📖 Redux State Management Tutorial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Lesson 1: What is Redux?
Imagine your app as a classroom, and Redux as the
teacher's gradebook - one source of truth for all data.

## Core Concepts:

### 1. Store (The Gradebook)
```javascript
const store = createStore(reducer);
// This holds all your app's data
```

### 2. Actions (Student Requests)
```javascript
const action = {
  type: 'ADD_GRADE',
  payload: { student: 'Alice', grade: 95 }
};
// These describe what happened
```

### 3. Reducers (Gradebook Rules)
```javascript
function reducer(state = {}, action) {
  switch(action.type) {
    case 'ADD_GRADE':
      return {...state, grades: [...state.grades, action.payload]};
    default:
      return state;
  }
}
// These handle how state changes
```

## Try It Yourself:
1. Create a simple counter store
2. Dispatch increment/decrement actions
3. Subscribe to state changes

🎯 Next: Connect Redux to React components
```

### Visual Explanation

```bash
/explain "TCP handshake" --visual

🤝 TCP Three-Way Handshake
━━━━━━━━━━━━━━━━━━━━━━━━━

```
Client                    Server
  |                         |
  |    1. SYN (seq=x)      |
  |----------------------->|
  |                         |
  |  2. SYN-ACK (seq=y,     |
  |      ack=x+1)           |
  |<-----------------------|
  |                         |
  |    3. ACK (ack=y+1)     |
  |----------------------->|
  |                         |
  |   Connection Established |
  |<======================>|
```

## Step-by-Step:

1. **SYN (Synchronize)**
   - Client: "Hey, want to talk? My sequence number is X"
   
2. **SYN-ACK (Synchronize-Acknowledge)**
   - Server: "Sure! I got your X. My sequence number is Y"
   
3. **ACK (Acknowledge)**
   - Client: "Great! I got your Y. Let's communicate!"

## Why Three Steps?
- Ensures both sides can send AND receive
- Establishes initial sequence numbers
- Confirms connection before data transfer
```

### Advanced Topic Analysis

```bash
/explain "Rust ownership model" --depth advanced --think

🧠 Analyzing Rust Ownership Model...

🦀 Rust Ownership: Advanced Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Core Rules
1. Each value has one owner
2. When owner goes out of scope, value is dropped
3. There can only be one owner at a time

## Memory Safety Guarantees

### Stack vs Heap Allocation
```rust
// Stack: Known size, automatic cleanup
let x = 5; // Copy trait, duplicated on assignment

// Heap: Dynamic size, owned pointer
let s = String::from("hello"); // Move semantics
```

### Borrowing Rules
```rust
// Multiple immutable borrows OK
let r1 = &s;
let r2 = &s;

// But not with mutable borrow
let r3 = &mut s; // Error if r1/r2 still in scope
```

## Advanced Patterns

### Lifetime Annotations
```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    // Lifetime 'a = min(lifetime(x), lifetime(y))
}
```

### Smart Pointers
- `Box<T>`: Heap allocation
- `Rc<T>`: Reference counting
- `RefCell<T>`: Interior mutability

## Performance Implications
- Zero-cost abstractions
- No garbage collector overhead
- Compile-time memory safety
- Predictable deallocation

⚡ Optimization: Move semantics eliminate unnecessary copies
```

### Interactive Learning

```bash
/explain "async/await" --interactive --quiz

📚 Understanding Async/Await
━━━━━━━━━━━━━━━━━━━━━━━━━

## What is async/await?
A way to write asynchronous code that looks synchronous,
making it easier to read and understand.

## Basic Example:
```javascript
async function fetchUser(id) {
  const response = await fetch(`/api/user/${id}`);
  const user = await response.json();
  return user;
}
```

❓ **Quick Check**: What does the `await` keyword do?

a) Pauses the entire program
b) Pauses the async function until promise resolves
c) Creates a new thread
d) Blocks the event loop

[Waiting for your answer...]

✅ Correct! (b) - `await` pauses the async function,
but doesn't block other code from running.

🎯 Want to explore:
1. Error handling with try/catch
2. Parallel execution with Promise.all
3. Common pitfalls

Which topic interests you? (or type 'continue' for next)
```

## Quality Standards

### Accuracy
- Verify all code examples work
- Ensure version-specific details are noted
- Cross-reference with documentation
- Test in appropriate environment

### Clarity
- Match vocabulary to depth level
- Define terms before using them
- Progress from simple to complex
- Use consistent terminology

### Completeness
- Cover core concepts thoroughly
- Include practical examples
- Address common mistakes
- Provide learning path

## Integration with SuperClaude

### Intelligent Features
- **Context Awareness**: Use project code for examples
- **Progressive Learning**: Build on previous explanations
- **Adaptive Depth**: Adjust based on user responses
- **Cross-Reference**: Link related concepts

### Enhanced Capabilities
- **MCP Integration**: Access latest documentation
- **Persona System**: Multiple expert perspectives
- **Visual Generation**: ASCII diagrams and charts
- **Interactive Mode**: Dynamic Q&A sessions

---

*SuperClaude Enhanced | Clear Technical Explanations | Adaptive Learning*