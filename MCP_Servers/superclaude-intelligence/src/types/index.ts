import { z } from 'zod';

// Evidence and reasoning types
export const EvidenceSchema = z.object({
  id: z.string(),
  type: z.enum(['observation', 'inference', 'assumption', 'fact', 'hypothesis']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export const ReasoningStepSchema = z.object({
  id: z.string(),
  type: z.enum(['analysis', 'synthesis', 'evaluation', 'inference', 'verification']),
  input: z.array(z.string()), // Evidence IDs
  output: z.array(z.string()), // Evidence IDs
  method: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  timestamp: z.date()
});

export const ReasoningChainSchema = z.object({
  id: z.string(),
  goal: z.string(),
  context: z.record(z.any()),
  steps: z.array(ReasoningStepSchema),
  evidence: z.array(EvidenceSchema),
  conclusion: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['active', 'completed', 'failed', 'paused'])
});

// Decision framework types
export const DecisionCriteriaSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(1),
  type: z.enum(['boolean', 'numeric', 'categorical', 'fuzzy']),
  description: z.string(),
  evaluator: z.string() // Function name or expression
});

export const DecisionOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  scores: z.record(z.number()), // Criteria ID -> score
  metadata: z.record(z.any()).optional()
});

export const DecisionContextSchema = z.object({
  id: z.string(),
  problem: z.string(),
  criteria: z.array(DecisionCriteriaSchema),
  options: z.array(DecisionOptionSchema),
  constraints: z.array(z.string()).optional(),
  stakeholders: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional()
});

export const DecisionResultSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  selectedOption: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  alternativeOptions: z.array(z.string()),
  riskAssessment: z.string().optional(),
  timestamp: z.date()
});

// Knowledge graph types
export const KnowledgeNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  properties: z.record(z.any()),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  timestamp: z.date()
});

export const KnowledgeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // Node ID
  target: z.string(), // Node ID
  relationship: z.string(),
  properties: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  timestamp: z.date()
});

export const KnowledgeGraphSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
  metadata: z.record(z.any()).optional()
});

// Learning system types
export const LearningExampleSchema = z.object({
  id: z.string(),
  input: z.record(z.any()),
  output: z.record(z.any()),
  context: z.record(z.any()).optional(),
  outcome: z.enum(['success', 'failure', 'partial']),
  feedback: z.string().optional(),
  timestamp: z.date()
});

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  conditions: z.array(z.string()),
  actions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  examples: z.array(z.string()), // Learning example IDs
  metadata: z.record(z.any()).optional()
});

export const LearningModelSchema = z.object({
  id: z.string(),
  type: z.enum(['pattern-recognition', 'outcome-prediction', 'optimization', 'classification']),
  domain: z.string(),
  patterns: z.array(PatternSchema),
  examples: z.array(LearningExampleSchema),
  performance: z.record(z.number()).optional(),
  lastUpdated: z.date()
});

// Memory and context types
export const MemoryItemSchema = z.object({
  id: z.string(),
  type: z.enum(['episodic', 'semantic', 'procedural', 'working']),
  content: z.record(z.any()),
  importance: z.number().min(0).max(1),
  accessCount: z.number().min(0),
  lastAccessed: z.date(),
  created: z.date(),
  expires: z.date().optional(),
  associations: z.array(z.string()).optional() // Related memory IDs
});

export const ContextStateSchema = z.object({
  id: z.string(),
  session: z.string(),
  domain: z.string().optional(),
  goals: z.array(z.string()),
  constraints: z.array(z.string()),
  preferences: z.record(z.any()),
  workingMemory: z.array(z.string()), // Memory item IDs
  timestamp: z.date()
});

// Request/Response schemas
export const ReasoningRequestSchema = z.object({
  goal: z.string(),
  context: z.record(z.any()).optional(),
  evidence: z.array(EvidenceSchema).optional(),
  method: z.enum(['deductive', 'inductive', 'abductive', 'analogical']).optional(),
  maxSteps: z.number().min(1).max(50).optional()
});

export const DecisionRequestSchema = z.object({
  problem: z.string(),
  criteria: z.array(DecisionCriteriaSchema),
  options: z.array(DecisionOptionSchema),
  context: z.record(z.any()).optional(),
  method: z.enum(['weighted-sum', 'topsis', 'ahp', 'fuzzy']).optional()
});

export const KnowledgeQuerySchema = z.object({
  query: z.string(),
  type: z.enum(['search', 'inference', 'similarity', 'path']),
  parameters: z.record(z.any()).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const LearningRequestSchema = z.object({
  example: LearningExampleSchema,
  updatePatterns: z.boolean().optional(),
  domain: z.string().optional()
});

// Type exports
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
export type ReasoningChain = z.infer<typeof ReasoningChainSchema>;
export type DecisionCriteria = z.infer<typeof DecisionCriteriaSchema>;
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;
export type DecisionContext = z.infer<typeof DecisionContextSchema>;
export type DecisionResult = z.infer<typeof DecisionResultSchema>;
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;
export type KnowledgeEdge = z.infer<typeof KnowledgeEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type LearningExample = z.infer<typeof LearningExampleSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type LearningModel = z.infer<typeof LearningModelSchema>;
export type MemoryItem = z.infer<typeof MemoryItemSchema>;
export type ContextState = z.infer<typeof ContextStateSchema>;
export type ReasoningRequest = z.infer<typeof ReasoningRequestSchema>;
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;
export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;
export type LearningRequest = z.infer<typeof LearningRequestSchema>;