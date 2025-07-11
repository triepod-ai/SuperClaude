import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@superclaude/shared';
import {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeQuery,
  KnowledgeNodeSchema,
  KnowledgeEdgeSchema,
  KnowledgeGraphSchema
} from '../types';

export interface KnowledgeGraphOptions {
  maxNodes?: number;
  maxEdges?: number;
  enableInference?: boolean;
  confidenceThreshold?: number;
  enableCaching?: boolean;
}

export interface QueryResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  score?: number;
  explanation?: string;
}

export class KnowledgeGraphManager extends EventEmitter {
  private readonly logger: Logger;
  private readonly options: Required<KnowledgeGraphOptions>;
  private graphs: Map<string, KnowledgeGraph> = new Map();
  private nodeIndex: Map<string, Set<string>> = new Map(); // type -> graph IDs
  private edgeIndex: Map<string, Set<string>> = new Map(); // relationship -> graph IDs
  private queryCache: Map<string, QueryResult> = new Map();
  private metrics: {
    nodesTotal: number;
    edgesTotal: number;
    queriesTotal: number;
    queriesCached: number;
    inferenceOperations: number;
  };

  constructor(options: KnowledgeGraphOptions = {}) {
    super();
    this.logger = new Logger('KnowledgeGraphManager');
    this.options = {
      maxNodes: options.maxNodes ?? 10000,
      maxEdges: options.maxEdges ?? 50000,
      enableInference: options.enableInference ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 0.5,
      enableCaching: options.enableCaching ?? true
    };
    this.metrics = {
      nodesTotal: 0,
      edgesTotal: 0,
      queriesTotal: 0,
      queriesCached: 0,
      inferenceOperations: 0
    };
  }

  /**
   * Create a new knowledge graph
   */
  async createGraph(name: string, metadata?: Record<string, any>): Promise<KnowledgeGraph> {
    try {
      const graph: KnowledgeGraph = {
        id: uuidv4(),
        name,
        nodes: [],
        edges: [],
        metadata: metadata || {}
      };

      const validatedGraph = KnowledgeGraphSchema.parse(graph);
      this.graphs.set(validatedGraph.id, validatedGraph);

      this.emit('graphCreated', { graphId: validatedGraph.id, name });
      this.logger.info(`Created knowledge graph ${validatedGraph.id}: ${name}`);

      return validatedGraph;
    } catch (error) {
      this.logger.error('Failed to create knowledge graph:', error);
      throw error;
    }
  }

  /**
   * Add node to knowledge graph
   */
  async addNode(
    graphId: string,
    type: string,
    label: string,
    properties: Record<string, any>,
    confidence?: number,
    source?: string
  ): Promise<KnowledgeNode> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Knowledge graph ${graphId} not found`);
    }

    if (graph.nodes.length >= this.options.maxNodes) {
      throw new Error(`Maximum nodes (${this.options.maxNodes}) reached for graph ${graphId}`);
    }

    try {
      const node: KnowledgeNode = {
        id: uuidv4(),
        type,
        label,
        properties,
        confidence,
        source,
        timestamp: new Date()
      };

      const validatedNode = KnowledgeNodeSchema.parse(node);
      graph.nodes.push(validatedNode);

      // Update indexes
      if (!this.nodeIndex.has(type)) {
        this.nodeIndex.set(type, new Set());
      }
      this.nodeIndex.get(type)!.add(graphId);

      this.metrics.nodesTotal++;
      this.clearQueryCache();

      this.emit('nodeAdded', { graphId, nodeId: validatedNode.id, type, label });
      this.logger.debug(`Added node ${validatedNode.id} to graph ${graphId}`);

      return validatedNode;
    } catch (error) {
      this.logger.error('Failed to add node:', error);
      throw error;
    }
  }

  /**
   * Add edge to knowledge graph
   */
  async addEdge(
    graphId: string,
    sourceNodeId: string,
    targetNodeId: string,
    relationship: string,
    properties?: Record<string, any>,
    confidence?: number
  ): Promise<KnowledgeEdge> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Knowledge graph ${graphId} not found`);
    }

    if (graph.edges.length >= this.options.maxEdges) {
      throw new Error(`Maximum edges (${this.options.maxEdges}) reached for graph ${graphId}`);
    }

    // Validate that source and target nodes exist
    const sourceExists = graph.nodes.some(n => n.id === sourceNodeId);
    const targetExists = graph.nodes.some(n => n.id === targetNodeId);
    
    if (!sourceExists) {
      throw new Error(`Source node ${sourceNodeId} not found in graph ${graphId}`);
    }
    if (!targetExists) {
      throw new Error(`Target node ${targetNodeId} not found in graph ${graphId}`);
    }

    try {
      const edge: KnowledgeEdge = {
        id: uuidv4(),
        source: sourceNodeId,
        target: targetNodeId,
        relationship,
        properties,
        confidence,
        timestamp: new Date()
      };

      const validatedEdge = KnowledgeEdgeSchema.parse(edge);
      graph.edges.push(validatedEdge);

      // Update indexes
      if (!this.edgeIndex.has(relationship)) {
        this.edgeIndex.set(relationship, new Set());
      }
      this.edgeIndex.get(relationship)!.add(graphId);

      this.metrics.edgesTotal++;
      this.clearQueryCache();

      this.emit('edgeAdded', { graphId, edgeId: validatedEdge.id, relationship });
      this.logger.debug(`Added edge ${validatedEdge.id} to graph ${graphId}`);

      return validatedEdge;
    } catch (error) {
      this.logger.error('Failed to add edge:', error);
      throw error;
    }
  }

  /**
   * Query knowledge graph
   */
  async query(graphId: string, query: KnowledgeQuery): Promise<QueryResult> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Knowledge graph ${graphId} not found`);
    }

    this.metrics.queriesTotal++;

    // Check cache
    const cacheKey = this.generateCacheKey(graphId, query);
    if (this.options.enableCaching && this.queryCache.has(cacheKey)) {
      this.metrics.queriesCached++;
      return this.queryCache.get(cacheKey)!;
    }

    try {
      let result: QueryResult;

      switch (query.type) {
        case 'search':
          result = await this.searchQuery(graph, query);
          break;
        case 'inference':
          result = await this.inferenceQuery(graph, query);
          break;
        case 'similarity':
          result = await this.similarityQuery(graph, query);
          break;
        case 'path':
          result = await this.pathQuery(graph, query);
          break;
        default:
          throw new Error(`Unknown query type: ${query.type}`);
      }

      // Apply limit
      if (query.limit) {
        result.nodes = result.nodes.slice(0, query.limit);
        result.edges = result.edges.slice(0, query.limit);
      }

      // Cache result
      if (this.options.enableCaching) {
        this.queryCache.set(cacheKey, result);
      }

      this.emit('queryExecuted', { graphId, queryType: query.type, resultCount: result.nodes.length });
      this.logger.debug(`Executed ${query.type} query on graph ${graphId}, found ${result.nodes.length} nodes`);

      return result;
    } catch (error) {
      this.logger.error('Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Search query - find nodes/edges matching criteria
   */
  private async searchQuery(graph: KnowledgeGraph, query: KnowledgeQuery): Promise<QueryResult> {
    const queryText = query.query.toLowerCase();
    const parameters = query.parameters || {};
    
    const matchingNodes: KnowledgeNode[] = [];
    const matchingEdges: KnowledgeEdge[] = [];

    // Search nodes
    for (const node of graph.nodes) {
      let matches = false;
      let score = 0;

      // Text search in label and properties
      if (node.label.toLowerCase().includes(queryText)) {
        matches = true;
        score += 0.5;
      }

      // Search in properties
      for (const [key, value] of Object.entries(node.properties)) {
        if (typeof value === 'string' && value.toLowerCase().includes(queryText)) {
          matches = true;
          score += 0.3;
        }
      }

      // Type filter
      if (parameters.type && node.type !== parameters.type) {
        matches = false;
      }

      // Confidence filter
      if (parameters.minConfidence && (!node.confidence || node.confidence < parameters.minConfidence)) {
        matches = false;
      }

      if (matches && (!node.confidence || node.confidence >= this.options.confidenceThreshold)) {
        matchingNodes.push(node);
      }
    }

    // Search edges
    for (const edge of graph.edges) {
      let matches = false;

      if (edge.relationship.toLowerCase().includes(queryText)) {
        matches = true;
      }

      // Relationship filter
      if (parameters.relationship && edge.relationship !== parameters.relationship) {
        matches = false;
      }

      if (matches && (!edge.confidence || edge.confidence >= this.options.confidenceThreshold)) {
        matchingEdges.push(edge);
      }
    }

    return {
      nodes: matchingNodes,
      edges: matchingEdges,
      explanation: `Search found ${matchingNodes.length} nodes and ${matchingEdges.length} edges matching "${queryText}"`
    };
  }

  /**
   * Inference query - derive new knowledge
   */
  private async inferenceQuery(graph: KnowledgeGraph, query: KnowledgeQuery): Promise<QueryResult> {
    if (!this.options.enableInference) {
      throw new Error('Inference is disabled');
    }

    this.metrics.inferenceOperations++;

    const inferredNodes: KnowledgeNode[] = [];
    const inferredEdges: KnowledgeEdge[] = [];
    const parameters = query.parameters || {};

    // Simple transitivity inference: if A->B and B->C, then A->C
    if (parameters.rule === 'transitivity') {
      const relationship = parameters.relationship || 'related_to';
      
      for (const edge1 of graph.edges) {
        if (edge1.relationship !== relationship) continue;
        
        for (const edge2 of graph.edges) {
          if (edge2.relationship !== relationship) continue;
          if (edge1.target === edge2.source && edge1.source !== edge2.target) {
            // Check if direct edge already exists
            const directExists = graph.edges.some(e => 
              e.source === edge1.source && 
              e.target === edge2.target && 
              e.relationship === relationship
            );
            
            if (!directExists) {
              const confidence = Math.min(
                edge1.confidence || 0.5,
                edge2.confidence || 0.5
              ) * 0.8; // Reduce confidence for inferred relations
              
              if (confidence >= this.options.confidenceThreshold) {
                inferredEdges.push({
                  id: `inferred-${uuidv4()}`,
                  source: edge1.source,
                  target: edge2.target,
                  relationship,
                  confidence,
                  properties: { inferred: true, rule: 'transitivity' },
                  timestamp: new Date()
                });
              }
            }
          }
        }
      }
    }

    // Similarity inference based on shared relationships
    if (parameters.rule === 'similarity') {
      const threshold = parameters.similarityThreshold || 0.7;
      
      for (let i = 0; i < graph.nodes.length; i++) {
        for (let j = i + 1; j < graph.nodes.length; j++) {
          const node1 = graph.nodes[i];
          const node2 = graph.nodes[j];
          
          if (node1.type === node2.type) {
            const similarity = this.calculateNodeSimilarity(graph, node1, node2);
            
            if (similarity >= threshold) {
              const existingSimilarity = graph.edges.some(e =>
                (e.source === node1.id && e.target === node2.id) ||
                (e.source === node2.id && e.target === node1.id)
              );
              
              if (!existingSimilarity) {
                inferredEdges.push({
                  id: `inferred-${uuidv4()}`,
                  source: node1.id,
                  target: node2.id,
                  relationship: 'similar_to',
                  confidence: similarity,
                  properties: { inferred: true, rule: 'similarity', score: similarity },
                  timestamp: new Date()
                });
              }
            }
          }
        }
      }
    }

    return {
      nodes: inferredNodes,
      edges: inferredEdges,
      explanation: `Inference using rule "${parameters.rule}" generated ${inferredEdges.length} new relationships`
    };
  }

  /**
   * Similarity query - find similar nodes
   */
  private async similarityQuery(graph: KnowledgeGraph, query: KnowledgeQuery): Promise<QueryResult> {
    const parameters = query.parameters || {};
    const targetNodeId = parameters.nodeId;
    const threshold = parameters.threshold || 0.5;
    
    if (!targetNodeId) {
      throw new Error('Similarity query requires nodeId parameter');
    }

    const targetNode = graph.nodes.find(n => n.id === targetNodeId);
    if (!targetNode) {
      throw new Error(`Node ${targetNodeId} not found`);
    }

    const similarNodes: Array<{ node: KnowledgeNode; similarity: number }> = [];

    for (const node of graph.nodes) {
      if (node.id === targetNodeId) continue;
      
      const similarity = this.calculateNodeSimilarity(graph, targetNode, node);
      
      if (similarity >= threshold) {
        similarNodes.push({ node, similarity });
      }
    }

    // Sort by similarity descending
    similarNodes.sort((a, b) => b.similarity - a.similarity);

    return {
      nodes: similarNodes.map(item => ({
        ...item.node,
        properties: {
          ...item.node.properties,
          similarity: item.similarity
        }
      })),
      edges: [],
      explanation: `Found ${similarNodes.length} nodes similar to "${targetNode.label}" with threshold ${threshold}`
    };
  }

  /**
   * Path query - find paths between nodes
   */
  private async pathQuery(graph: KnowledgeGraph, query: KnowledgeQuery): Promise<QueryResult> {
    const parameters = query.parameters || {};
    const sourceId = parameters.sourceId;
    const targetId = parameters.targetId;
    const maxDepth = parameters.maxDepth || 5;
    
    if (!sourceId || !targetId) {
      throw new Error('Path query requires sourceId and targetId parameters');
    }

    const paths = this.findPaths(graph, sourceId, targetId, maxDepth);
    
    // Collect all nodes and edges in paths
    const pathNodes = new Set<string>();
    const pathEdges = new Set<string>();
    
    for (const path of paths) {
      for (const nodeId of path.nodes) {
        pathNodes.add(nodeId);
      }
      for (const edgeId of path.edges) {
        pathEdges.add(edgeId);
      }
    }

    return {
      nodes: graph.nodes.filter(n => pathNodes.has(n.id)),
      edges: graph.edges.filter(e => pathEdges.has(e.id)),
      explanation: `Found ${paths.length} paths between nodes with max depth ${maxDepth}`
    };
  }

  /**
   * Get knowledge graph by ID
   */
  getGraph(graphId: string): KnowledgeGraph | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * Get all graphs
   */
  getGraphs(): KnowledgeGraph[] {
    return Array.from(this.graphs.values());
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Helper methods
   */
  private calculateNodeSimilarity(graph: KnowledgeGraph, node1: KnowledgeNode, node2: KnowledgeNode): number {
    let similarity = 0;
    let factors = 0;

    // Type similarity
    if (node1.type === node2.type) {
      similarity += 0.3;
    }
    factors++;

    // Property similarity
    const props1 = Object.keys(node1.properties);
    const props2 = Object.keys(node2.properties);
    const commonProps = props1.filter(p => props2.includes(p));
    
    if (props1.length > 0 || props2.length > 0) {
      const propSimilarity = commonProps.length / Math.max(props1.length, props2.length);
      similarity += propSimilarity * 0.3;
      factors++;
    }

    // Relationship similarity
    const edges1 = graph.edges.filter(e => e.source === node1.id || e.target === node1.id);
    const edges2 = graph.edges.filter(e => e.source === node2.id || e.target === node2.id);
    
    const relationships1 = new Set(edges1.map(e => e.relationship));
    const relationships2 = new Set(edges2.map(e => e.relationship));
    const commonRels = Array.from(relationships1).filter(r => relationships2.has(r));
    
    if (relationships1.size > 0 || relationships2.size > 0) {
      const relSimilarity = commonRels.length / Math.max(relationships1.size, relationships2.size);
      similarity += relSimilarity * 0.4;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private findPaths(
    graph: KnowledgeGraph,
    sourceId: string,
    targetId: string,
    maxDepth: number
  ): Array<{ nodes: string[]; edges: string[]; depth: number }> {
    const paths: Array<{ nodes: string[]; edges: string[]; depth: number }> = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, currentPath: string[], currentEdges: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (visited.has(currentId)) return;
      
      visited.add(currentId);
      
      if (currentId === targetId && depth > 0) {
        paths.push({
          nodes: [...currentPath, currentId],
          edges: [...currentEdges],
          depth
        });
        visited.delete(currentId);
        return;
      }

      // Find outgoing edges
      for (const edge of graph.edges) {
        if (edge.source === currentId && !visited.has(edge.target)) {
          dfs(
            edge.target,
            [...currentPath, currentId],
            [...currentEdges, edge.id],
            depth + 1
          );
        }
      }
      
      visited.delete(currentId);
    };

    dfs(sourceId, [], [], 0);
    
    return paths.sort((a, b) => a.depth - b.depth); // Sort by shortest path first
  }

  private generateCacheKey(graphId: string, query: KnowledgeQuery): string {
    return `${graphId}:${query.type}:${JSON.stringify(query)}`;
  }

  private clearQueryCache(): void {
    if (this.options.enableCaching) {
      this.queryCache.clear();
    }
  }
}