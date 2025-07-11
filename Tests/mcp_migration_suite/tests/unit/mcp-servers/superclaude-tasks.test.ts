/**
 * Unit Tests for SuperClaude Tasks MCP Server
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

describe('SuperClaude Tasks MCP Server', () => {
  const serverUrl = 'http://localhost:3001';
  let taskId: string;

  beforeAll(async () => {
    // Wait for server to be ready
    const maxRetries = 30;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await axios.get(`${serverUrl}/health`);
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('SuperClaude Tasks server not ready');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await axios.get(`${serverUrl}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'healthy',
        server: 'superclaude-tasks',
        version: expect.any(String),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Task Management', () => {
    it('should create a new task', async () => {
      const metricId = global.performanceMonitor.startMetric('create-task', 'mcp');
      
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task for unit testing',
        priority: 'high',
        type: 'development',
        estimated_hours: 2,
        tags: ['testing', 'unit-test']
      };

      const response = await axios.post(`${serverUrl}/tasks`, taskData);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        id: expect.any(String),
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        type: taskData.type,
        status: 'pending',
        created_at: expect.any(String)
      });

      taskId = response.data.id;
    });

    it('should retrieve task by ID', async () => {
      const metricId = global.performanceMonitor.startMetric('get-task', 'mcp');
      
      const response = await axios.get(`${serverUrl}/tasks/${taskId}`);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        id: taskId,
        title: 'Test Task',
        status: 'pending'
      });
    });

    it('should update task status', async () => {
      const metricId = global.performanceMonitor.startMetric('update-task', 'mcp');
      
      const updateData = {
        status: 'in_progress',
        progress: 25
      };

      const response = await axios.patch(`${serverUrl}/tasks/${taskId}`, updateData);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('in_progress');
      expect(response.data.progress).toBe(25);
    });

    it('should list all tasks', async () => {
      const metricId = global.performanceMonitor.startMetric('list-tasks', 'mcp');
      
      const response = await axios.get(`${serverUrl}/tasks`);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      const createdTask = response.data.find((task: any) => task.id === taskId);
      expect(createdTask).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const response = await axios.get(`${serverUrl}/tasks?status=in_progress`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        response.data.forEach((task: any) => {
          expect(task.status).toBe('in_progress');
        });
      }
    });

    it('should delete task', async () => {
      const metricId = global.performanceMonitor.startMetric('delete-task', 'mcp');
      
      const response = await axios.delete(`${serverUrl}/tasks/${taskId}`);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(204);
      
      // Verify task is deleted
      try {
        await axios.get(`${serverUrl}/tasks/${taskId}`);
        fail('Task should not exist after deletion');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Task Decomposition', () => {
    it('should decompose a complex task into subtasks', async () => {
      const metricId = global.performanceMonitor.startMetric('decompose-task', 'mcp');
      
      const complexTask = {
        title: 'Build React Component Library',
        description: 'Create a comprehensive React component library with TypeScript, Storybook, and testing',
        complexity: 'high',
        estimated_hours: 40
      };

      const response = await axios.post(`${serverUrl}/tasks/decompose`, complexTask);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        parent_task: expect.objectContaining({
          title: complexTask.title,
          type: 'epic'
        }),
        subtasks: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            type: expect.stringMatching(/^(story|task)$/),
            estimated_hours: expect.any(Number)
          })
        ])
      });

      expect(response.data.subtasks.length).toBeGreaterThan(0);
      
      // Verify total estimated hours matches
      const totalEstimated = response.data.subtasks.reduce(
        (sum: number, task: any) => sum + task.estimated_hours, 0
      );
      expect(totalEstimated).toBeCloseTo(complexTask.estimated_hours, 0);
    });

    it('should handle task dependencies', async () => {
      const taskWithDeps = {
        title: 'Deploy to Production',
        description: 'Deploy application with proper testing and monitoring',
        dependencies: ['run-tests', 'code-review', 'security-scan']
      };

      const response = await axios.post(`${serverUrl}/tasks/decompose`, taskWithDeps);
      
      expect(response.status).toBe(200);
      expect(response.data.subtasks).toBeDefined();
      
      // Check that dependencies are properly ordered
      const subtasks = response.data.subtasks;
      const deployTask = subtasks.find((task: any) => 
        task.title.toLowerCase().includes('deploy')
      );
      expect(deployTask).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should respond within performance thresholds', async () => {
      const startTime = Date.now();
      
      await axios.get(`${serverUrl}/tasks`);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeWithinPerformanceThreshold(500); // 500ms threshold for MCP servers
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map((_, index) =>
        axios.get(`${serverUrl}/tasks`).then(response => ({
          index,
          status: response.status,
          duration: response.headers['x-response-time'] || 'unknown'
        }))
      );

      const results = await Promise.all(concurrentRequests);
      
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task data', async () => {
      const invalidTask = {
        // Missing required fields
        description: 'Task without title'
      };

      try {
        await axios.post(`${serverUrl}/tasks`, invalidTask);
        fail('Should throw validation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toMatchObject({
          error: expect.any(String),
          validation_errors: expect.any(Array)
        });
      }
    });

    it('should handle non-existent task requests', async () => {
      const nonExistentId = uuidv4();
      
      try {
        await axios.get(`${serverUrl}/tasks/${nonExistentId}`);
        fail('Should return 404 for non-existent task');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle malformed requests gracefully', async () => {
      try {
        await axios.post(`${serverUrl}/tasks`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        fail('Should reject malformed JSON');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should respond with valid MCP format', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tasks/list',
        params: {}
      };

      const response = await axios.post(`${serverUrl}/mcp`, mcpRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveValidMCPResponse();
      expect(response.data.jsonrpc).toBe('2.0');
      expect(response.data.id).toBe(1);
    });

    it('should handle MCP batch requests', async () => {
      const batchRequest = [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tasks/list',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'health',
          params: {}
        }
      ];

      const response = await axios.post(`${serverUrl}/mcp`, batchRequest);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(2);
      
      response.data.forEach((resp: any) => {
        expect(resp).toHaveValidMCPResponse();
      });
    });
  });

  describe('Integration with Bridge System', () => {
    it('should register with bridge system on startup', async () => {
      const response = await axios.get(`${serverUrl}/bridge/status`);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        registered: true,
        bridge_url: expect.any(String),
        last_heartbeat: expect.any(String)
      });
    });

    it('should send heartbeat to bridge system', async () => {
      const response = await axios.post(`${serverUrl}/bridge/heartbeat`);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(Number)
      });
    });

    it('should handle bridge disconnection gracefully', async () => {
      // Simulate bridge disconnection
      const response = await axios.post(`${serverUrl}/bridge/disconnect`);
      
      expect(response.status).toBe(200);
      
      // Server should continue functioning
      const healthResponse = await axios.get(`${serverUrl}/health`);
      expect(healthResponse.status).toBe(200);
    });
  });
});