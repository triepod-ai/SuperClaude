import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@superclaude/shared';
import { ReasoningEngine } from './core/ReasoningEngine.js';
import { DecisionFramework } from './core/DecisionFramework.js';
import { KnowledgeGraphManager } from './core/KnowledgeGraph.js';
import { LearningSystem } from './core/LearningSystem.js';
import {
  ReasoningRequestSchema,
  DecisionRequestSchema,
  KnowledgeQuery,
  LearningRequestSchema,
  EvidenceSchema,
  ReasoningChainSchema,
  DecisionContextSchema
} from './types/index.js';

export class SuperClaudeIntelligenceServer {
  private server: Server;
  private reasoningEngine: ReasoningEngine;
  private decisionFramework: DecisionFramework;
  private knowledgeGraph: KnowledgeGraphManager;
  private learningSystem: LearningSystem;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SuperClaudeIntelligenceServer');
    
    this.server = new Server(
      {
        name: 'superclaude-intelligence',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize core systems
    this.reasoningEngine = new ReasoningEngine({
      maxSteps: 20,
      confidenceThreshold: 0.7,
      enableMetrics: true
    });

    this.decisionFramework = new DecisionFramework({
      defaultMethod: 'weighted-sum',
      enableRiskAssessment: true,
      confidenceThreshold: 0.6
    });

    this.knowledgeGraph = new KnowledgeGraphManager({
      maxNodes: 10000,
      maxEdges: 50000,
      enableInference: true,
      enableCaching: true
    });

    this.learningSystem = new LearningSystem({
      maxExamples: 10000,
      maxPatterns: 1000,
      enableAdaptiveLearning: true,
      confidenceThreshold: 0.6
    });

    this.setupToolHandlers();
    this.setupEventListeners();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Reasoning tools
        {
          name: 'create_reasoning_chain',
          description: 'Create a new reasoning chain for multi-step analysis',
          inputSchema: {
            type: 'object',
            properties: {
              goal: { type: 'string', description: 'The reasoning goal or question' },
              context: { type: 'object', description: 'Additional context information' },
              evidence: { 
                type: 'array', 
                items: { type: 'object' },
                description: 'Initial evidence items'
              },
              method: { 
                type: 'string', 
                enum: ['deductive', 'inductive', 'abductive', 'analogical'],
                description: 'Reasoning method to use'
              }
            },
            required: ['goal']
          }
        },
        {
          name: 'add_evidence',
          description: 'Add evidence to an existing reasoning chain',
          inputSchema: {
            type: 'object',
            properties: {
              chainId: { type: 'string', description: 'Reasoning chain ID' },
              evidence: { type: 'object', description: 'Evidence item to add' }
            },
            required: ['chainId', 'evidence']
          }
        },
        {
          name: 'reasoning_step',
          description: 'Perform a reasoning step in a chain',
          inputSchema: {
            type: 'object',
            properties: {
              chainId: { type: 'string', description: 'Reasoning chain ID' },
              type: { 
                type: 'string', 
                enum: ['analysis', 'synthesis', 'evaluation', 'inference', 'verification'],
                description: 'Type of reasoning step'
              },
              inputEvidenceIds: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Evidence IDs to use as input'
              },
              method: { type: 'string', description: 'Specific method for this step' },
              rationale: { type: 'string', description: 'Reasoning rationale' }
            },
            required: ['chainId', 'type', 'inputEvidenceIds', 'method', 'rationale']
          }
        },
        {
          name: 'complete_reasoning_chain',
          description: 'Complete a reasoning chain with a conclusion',
          inputSchema: {
            type: 'object',
            properties: {
              chainId: { type: 'string', description: 'Reasoning chain ID' },
              conclusion: { type: 'string', description: 'Final conclusion' }
            },
            required: ['chainId', 'conclusion']
          }
        },
        {
          name: 'get_reasoning_chain',
          description: 'Get a reasoning chain by ID',
          inputSchema: {
            type: 'object',
            properties: {
              chainId: { type: 'string', description: 'Reasoning chain ID' }
            },
            required: ['chainId']
          }
        },

        // Decision tools
        {
          name: 'make_decision',
          description: 'Make a decision using structured decision-making framework',
          inputSchema: {
            type: 'object',
            properties: {
              problem: { type: 'string', description: 'Problem statement' },
              criteria: { 
                type: 'array', 
                items: { type: 'object' },
                description: 'Decision criteria with weights'
              },
              options: { 
                type: 'array', 
                items: { type: 'object' },
                description: 'Available options with scores'
              },
              method: { 
                type: 'string', 
                enum: ['weighted-sum', 'topsis', 'ahp', 'fuzzy'],
                description: 'Decision method to use'
              },
              context: { type: 'object', description: 'Additional context' }
            },
            required: ['problem', 'criteria', 'options']
          }
        },
        {
          name: 'get_decision',
          description: 'Get a decision result by ID',
          inputSchema: {
            type: 'object',
            properties: {
              decisionId: { type: 'string', description: 'Decision result ID' }
            },
            required: ['decisionId']
          }
        },

        // Knowledge graph tools
        {
          name: 'create_knowledge_graph',
          description: 'Create a new knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Graph name' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['name']
          }
        },
        {
          name: 'add_knowledge_node',
          description: 'Add a node to a knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              graphId: { type: 'string', description: 'Knowledge graph ID' },
              type: { type: 'string', description: 'Node type' },
              label: { type: 'string', description: 'Node label' },
              properties: { type: 'object', description: 'Node properties' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              source: { type: 'string', description: 'Data source' }
            },
            required: ['graphId', 'type', 'label', 'properties']
          }
        },
        {
          name: 'add_knowledge_edge',
          description: 'Add an edge to a knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              graphId: { type: 'string', description: 'Knowledge graph ID' },
              sourceNodeId: { type: 'string', description: 'Source node ID' },
              targetNodeId: { type: 'string', description: 'Target node ID' },
              relationship: { type: 'string', description: 'Relationship type' },
              properties: { type: 'object', description: 'Edge properties' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['graphId', 'sourceNodeId', 'targetNodeId', 'relationship']
          }
        },
        {
          name: 'query_knowledge_graph',
          description: 'Query a knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              graphId: { type: 'string', description: 'Knowledge graph ID' },
              query: { type: 'string', description: 'Query string' },
              type: { 
                type: 'string', 
                enum: ['search', 'inference', 'similarity', 'path'],
                description: 'Query type'
              },
              parameters: { type: 'object', description: 'Query parameters' },
              limit: { type: 'number', minimum: 1, maximum: 100 }
            },
            required: ['graphId', 'query', 'type']
          }
        },

        // Learning tools
        {
          name: 'create_learning_model',
          description: 'Create a new learning model',
          inputSchema: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['pattern-recognition', 'outcome-prediction', 'optimization', 'classification'],
                description: 'Model type'
              },
              domain: { type: 'string', description: 'Domain or subject area' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['type', 'domain']
          }
        },
        {
          name: 'add_learning_example',
          description: 'Add a learning example to improve models',
          inputSchema: {
            type: 'object',
            properties: {
              example: { type: 'object', description: 'Learning example data' },
              updatePatterns: { type: 'boolean', description: 'Whether to update patterns' },
              domain: { type: 'string', description: 'Target domain' }
            },
            required: ['example']
          }
        },
        {
          name: 'predict_outcome',
          description: 'Predict outcome based on learned patterns',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: { type: 'string', description: 'Learning model ID' },
              input: { type: 'object', description: 'Input data for prediction' },
              context: { type: 'object', description: 'Additional context' }
            },
            required: ['modelId', 'input']
          }
        },
        {
          name: 'provide_feedback',
          description: 'Provide feedback on a prediction to improve learning',
          inputSchema: {
            type: 'object',
            properties: {
              predictionId: { type: 'string', description: 'Prediction ID' },
              actualOutcome: { description: 'Actual outcome that occurred' },
              wasCorrect: { type: 'boolean', description: 'Whether prediction was correct' },
              feedback: { type: 'string', description: 'Additional feedback text' }
            },
            required: ['predictionId', 'actualOutcome', 'wasCorrect']
          }
        },
        {
          name: 'update_context',
          description: 'Update context state for learning and reasoning',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'Session ID' },
              domain: { type: 'string', description: 'Domain context' },
              goals: { type: 'array', items: { type: 'string' }, description: 'Current goals' },
              constraints: { type: 'array', items: { type: 'string' }, description: 'Constraints' },
              preferences: { type: 'object', description: 'User preferences' }
            },
            required: ['sessionId']
          }
        },

        // Utility tools
        {
          name: 'get_system_metrics',
          description: 'Get performance metrics from all intelligence systems',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Reasoning tools
          case 'create_reasoning_chain': {
            const validated = ReasoningRequestSchema.parse(args);
            const chain = await this.reasoningEngine.createReasoningChain(validated);
            return { content: [{ type: 'text', text: JSON.stringify(chain, null, 2) }] };
          }

          case 'add_evidence': {
            const { chainId, evidence } = args;
            const validated = EvidenceSchema.parse(evidence);
            await this.reasoningEngine.addEvidence(chainId, validated);
            return { content: [{ type: 'text', text: 'Evidence added successfully' }] };
          }

          case 'reasoning_step': {
            const { chainId, type, inputEvidenceIds, method, rationale } = args;
            const step = await this.reasoningEngine.reasoningStep(
              chainId, type, inputEvidenceIds, method, rationale
            );
            return { content: [{ type: 'text', text: JSON.stringify(step, null, 2) }] };
          }

          case 'complete_reasoning_chain': {
            const { chainId, conclusion } = args;
            const chain = await this.reasoningEngine.completeChain(chainId, conclusion);
            return { content: [{ type: 'text', text: JSON.stringify(chain, null, 2) }] };
          }

          case 'get_reasoning_chain': {
            const { chainId } = args;
            const chain = this.reasoningEngine.getChain(chainId);
            if (!chain) {
              throw new McpError(ErrorCode.InvalidRequest, `Reasoning chain ${chainId} not found`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(chain, null, 2) }] };
          }

          // Decision tools
          case 'make_decision': {
            const validated = DecisionRequestSchema.parse(args);
            const result = await this.decisionFramework.makeDecision(validated);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'get_decision': {
            const { decisionId } = args;
            const decision = this.decisionFramework.getDecision(decisionId);
            if (!decision) {
              throw new McpError(ErrorCode.InvalidRequest, `Decision ${decisionId} not found`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(decision, null, 2) }] };
          }

          // Knowledge graph tools
          case 'create_knowledge_graph': {
            const { name, metadata } = args;
            const graph = await this.knowledgeGraph.createGraph(name, metadata);
            return { content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }] };
          }

          case 'add_knowledge_node': {
            const { graphId, type, label, properties, confidence, source } = args;
            const node = await this.knowledgeGraph.addNode(
              graphId, type, label, properties, confidence, source
            );
            return { content: [{ type: 'text', text: JSON.stringify(node, null, 2) }] };
          }

          case 'add_knowledge_edge': {
            const { graphId, sourceNodeId, targetNodeId, relationship, properties, confidence } = args;
            const edge = await this.knowledgeGraph.addEdge(
              graphId, sourceNodeId, targetNodeId, relationship, properties, confidence
            );
            return { content: [{ type: 'text', text: JSON.stringify(edge, null, 2) }] };
          }

          case 'query_knowledge_graph': {
            const { graphId, query, type, parameters, limit } = args;
            const queryObj: KnowledgeQuery = { query, type, parameters, limit };
            const result = await this.knowledgeGraph.query(graphId, queryObj);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          // Learning tools
          case 'create_learning_model': {
            const { type, domain, metadata } = args;
            const model = await this.learningSystem.createModel(type, domain, metadata);
            return { content: [{ type: 'text', text: JSON.stringify(model, null, 2) }] };
          }

          case 'add_learning_example': {
            const validated = LearningRequestSchema.parse(args);
            await this.learningSystem.addExample(validated);
            return { content: [{ type: 'text', text: 'Learning example added successfully' }] };
          }

          case 'predict_outcome': {
            const { modelId, input, context } = args;
            const result = await this.learningSystem.predict(modelId, input, context);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'provide_feedback': {
            const { predictionId, actualOutcome, wasCorrect, feedback } = args;
            await this.learningSystem.provideFeedback(predictionId, actualOutcome, wasCorrect, feedback);
            return { content: [{ type: 'text', text: 'Feedback provided successfully' }] };
          }

          case 'update_context': {
            const { sessionId, domain, goals, constraints, preferences } = args;
            const context = await this.learningSystem.updateContext(
              sessionId, domain, goals, constraints, preferences
            );
            return { content: [{ type: 'text', text: JSON.stringify(context, null, 2) }] };
          }

          // Utility tools
          case 'get_system_metrics': {
            const metrics = {
              reasoning: this.reasoningEngine.getMetrics(),
              decision: this.decisionFramework.getMetrics(),
              knowledge: this.knowledgeGraph.getMetrics(),
              learning: this.learningSystem.getMetrics()
            };
            return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Tool ${name} failed:`, error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupEventListeners() {
    // Reasoning engine events
    this.reasoningEngine.on('chainCreated', (data) => {
      this.logger.info(`Reasoning chain created: ${data.chainId}`);
    });

    this.reasoningEngine.on('chainCompleted', (data) => {
      this.logger.info(`Reasoning chain completed: ${data.chainId} with confidence ${data.confidence}`);
    });

    // Decision framework events
    this.decisionFramework.on('decisionMade', (data) => {
      this.logger.info(`Decision made: ${data.selectedOption} with confidence ${data.confidence}`);
    });

    // Knowledge graph events
    this.knowledgeGraph.on('graphCreated', (data) => {
      this.logger.info(`Knowledge graph created: ${data.graphId}`);
    });

    // Learning system events
    this.learningSystem.on('modelCreated', (data) => {
      this.logger.info(`Learning model created: ${data.modelId} for domain ${data.domain}`);
    });

    this.learningSystem.on('predictionMade', (data) => {
      this.logger.info(`Prediction made with confidence ${data.confidence} using ${data.patternsUsed} patterns`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('SuperClaude Intelligence Server started');
  }
}

export default SuperClaudeIntelligenceServer;