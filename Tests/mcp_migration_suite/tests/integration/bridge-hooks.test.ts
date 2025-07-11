/**
 * Integration Tests for Bridge Hook System
 * Tests event routing, performance, and cross-hook communication
 */

import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

describe('Bridge Hook Integration', () => {
  const bridgeUrl = 'http://localhost:3006'; // Bridge system port
  let testSession: string;

  beforeAll(async () => {
    testSession = `test-session-${Date.now()}`;
    
    // Ensure bridge system is ready
    const maxRetries = 30;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await axios.get(`${bridgeUrl}/health`);
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('Bridge system not ready');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  describe('Event Routing Validation', () => {
    it('should route Read tool events correctly', async () => {
      const metricId = global.performanceMonitor.startMetric('route-read-event', 'bridge');
      
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'Read',
        parameters: {
          file_path: '/test/sample.py',
          limit: 100
        },
        user_message: 'Read this Python file for analysis',
        session_id: testSession
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        event_id: expect.any(String),
        routed_servers: expect.arrayContaining(['superclaude-quality']),
        complexity_score: expect.any(Number),
        processing_time_ms: expect.any(Number)
      });

      // Verify performance target
      expect(response.data.processing_time_ms).toBeWithinPerformanceThreshold(100);
    });

    it('should route MCP tool events correctly', async () => {
      const metricId = global.performanceMonitor.startMetric('route-mcp-event', 'bridge');
      
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'mcp__sequential-thinking__sequentialthinking',
        parameters: {
          thought: 'Complex analysis of system architecture',
          thought_number: 1,
          total_thoughts: 5
        },
        user_message: 'Analyze the system architecture',
        session_id: testSession
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        routed_servers: expect.arrayContaining(['superclaude-orchestrator']),
        complexity_score: expect.any(Number)
      });

      expect(response.data.complexity_score).toBeGreaterThan(0.5);
    });

    it('should handle multi-server routing', async () => {
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'Edit',
        parameters: {
          file_path: '/src/components/Button.tsx',
          old_string: 'const Button = () => {',
          new_string: 'const Button: React.FC<ButtonProps> = () => {'
        },
        user_message: 'Add TypeScript types to React component',
        session_id: testSession
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      expect(response.status).toBe(200);
      expect(response.data.routed_servers).toEqual(
        expect.arrayContaining([
          'superclaude-quality',     // For code quality analysis
          'superclaude-performance'  // For performance monitoring
        ])
      );
    });
  });

  describe('Performance Validation', () => {
    it('should meet <100ms performance targets for simple events', async () => {
      const iterations = 10;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await axios.post(`${bridgeUrl}/events/dispatch`, {
          event_type: 'PRE_TOOL_USE',
          tool_name: 'Read',
          parameters: { file_path: `/test/file${i}.txt` },
          session_id: testSession
        });
        
        const duration = Date.now() - startTime;
        timings.push(duration);
      }

      const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTime = Math.max(...timings);

      expect(averageTime).toBeWithinPerformanceThreshold(100);
      expect(maxTime).toBeWithinPerformanceThreshold(150); // Allow some variance for max
    });

    it('should handle concurrent events efficiently', async () => {
      const concurrentEvents = 20;
      const startTime = Date.now();
      
      const promises = Array(concurrentEvents).fill(null).map((_, index) => 
        axios.post(`${bridgeUrl}/events/dispatch`, {
          event_type: 'PRE_TOOL_USE',
          tool_name: 'Grep',
          parameters: {
            pattern: `test${index}`,
            path: '/test'
          },
          session_id: `${testSession}-concurrent-${index}`
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });

      // Average time per request should be reasonable
      const averageTimePerRequest = totalTime / concurrentEvents;
      expect(averageTimePerRequest).toBeWithinPerformanceThreshold(200);
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 10000; // 10 seconds
      const requestInterval = 100; // Every 100ms
      const startTime = Date.now();
      const requests: Promise<any>[] = [];
      let requestCount = 0;

      const loadTest = setInterval(() => {
        if (Date.now() - startTime >= loadTestDuration) {
          clearInterval(loadTest);
          return;
        }

        const request = axios.post(`${bridgeUrl}/events/dispatch`, {
          event_type: 'PRE_TOOL_USE',
          tool_name: 'Read',
          parameters: { file_path: `/load-test/file${requestCount}.txt` },
          session_id: `${testSession}-load-${requestCount}`
        });

        requests.push(request);
        requestCount++;
      }, requestInterval);

      // Wait for load test to complete
      await new Promise(resolve => setTimeout(resolve, loadTestDuration + 1000));

      // Wait for all requests to complete
      const results = await Promise.allSettled(requests);
      
      const successfulRequests = results.filter(result => 
        result.status === 'fulfilled' && 
        (result.value as any).status === 200
      );

      const successRate = successfulRequests.length / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate minimum
    });
  });

  describe('Fallback Mechanism Testing', () => {
    it('should fallback when MCP server is unavailable', async () => {
      // Simulate server unavailability by using non-existent server
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'mcp__nonexistent__test',
        parameters: { test: 'value' },
        session_id: testSession,
        force_server: 'nonexistent-server'
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        fallback_used: true,
        fallback_reason: expect.any(String)
      });
    });

    it('should retry failed requests with exponential backoff', async () => {
      const metricId = global.performanceMonitor.startMetric('retry-mechanism', 'bridge');
      
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'FailingTool',
        parameters: { simulate_failure: true },
        session_id: testSession,
        retry_config: {
          max_retries: 3,
          backoff_multiplier: 2
        }
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      global.performanceMonitor.endMetric(metricId);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: expect.any(Boolean),
        retry_attempts: expect.any(Number),
        total_retry_time_ms: expect.any(Number)
      });

      if (response.data.retry_attempts > 0) {
        expect(response.data.retry_attempts).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Cross-Hook Communication', () => {
    it('should share context between hooks', async () => {
      // First, capture some context
      const contextData = {
        session_id: testSession,
        context_type: 'tool_input',
        tool_name: 'Read',
        data: {
          file_path: '/test/shared-context.py',
          content: 'def shared_function(): pass'
        }
      };

      const contextResponse = await axios.post(`${bridgeUrl}/context/capture`, contextData);
      expect(contextResponse.status).toBe(200);

      // Then retrieve context from another hook
      const retrieveResponse = await axios.get(
        `${bridgeUrl}/context/retrieve?session_id=${testSession}&type=tool_input`
      );
      
      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.data).toMatchObject({
        session_id: testSession,
        contexts: expect.arrayContaining([
          expect.objectContaining({
            tool_name: 'Read',
            data: expect.objectContaining({
              file_path: '/test/shared-context.py'
            })
          })
        ])
      });
    });

    it('should aggregate performance metrics across hooks', async () => {
      // Generate some performance data across different hooks
      const hooks = ['SuperClaudeDispatcher', 'PerformanceBridge', 'ContextBridge'];
      
      for (const hook of hooks) {
        await axios.post(`${bridgeUrl}/performance/record`, {
          hook_name: hook,
          operation: 'test_operation',
          duration_ms: Math.random() * 100 + 50,
          session_id: testSession
        });
      }

      // Retrieve aggregated metrics
      const metricsResponse = await axios.get(
        `${bridgeUrl}/performance/aggregate?session_id=${testSession}`
      );
      
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data).toMatchObject({
        session_id: testSession,
        total_operations: expect.any(Number),
        hooks_involved: expect.arrayContaining(hooks),
        performance_summary: expect.objectContaining({
          total_time_ms: expect.any(Number),
          average_time_ms: expect.any(Number),
          slowest_operation: expect.objectContaining({
            hook: expect.any(String),
            duration_ms: expect.any(Number)
          })
        })
      });

      expect(metricsResponse.data.total_operations).toBeGreaterThanOrEqual(hooks.length);
    });
  });

  describe('Real-time Event Streaming', () => {
    it('should stream events via WebSocket', (done) => {
      const ws = new WebSocket(`ws://localhost:3006/events/stream`);
      let eventReceived = false;
      
      ws.on('open', () => {
        // Subscribe to events for our test session
        ws.send(JSON.stringify({
          action: 'subscribe',
          session_id: testSession,
          event_types: ['PRE_TOOL_USE', 'POST_TOOL_USE']
        }));

        // Send a test event
        setTimeout(() => {
          axios.post(`${bridgeUrl}/events/dispatch`, {
            event_type: 'PRE_TOOL_USE',
            tool_name: 'WebSocketTest',
            parameters: { test: 'streaming' },
            session_id: testSession
          });
        }, 100);
      });

      ws.on('message', (data) => {
        const event = JSON.parse(data.toString());
        
        if (event.type === 'event' && event.data.tool_name === 'WebSocketTest') {
          eventReceived = true;
          expect(event.data).toMatchObject({
            event_type: 'PRE_TOOL_USE',
            tool_name: 'WebSocketTest',
            session_id: testSession
          });
          
          ws.close();
        }
      });

      ws.on('close', () => {
        expect(eventReceived).toBe(true);
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!eventReceived) {
          ws.close();
          done(new Error('WebSocket event not received within timeout'));
        }
      }, 5000);
    });
  });

  describe('Quality Gates Integration', () => {
    it('should apply quality gates to dispatched events', async () => {
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'Edit',
        parameters: {
          file_path: '/src/critical-component.tsx',
          old_string: 'const Component = () => {',
          new_string: 'const Component: React.FC = () => {'
        },
        user_message: 'Add TypeScript types to critical component',
        session_id: testSession,
        apply_quality_gates: true
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        quality_gates: expect.objectContaining({
          syntax: expect.objectContaining({ passed: expect.any(Boolean) }),
          type: expect.objectContaining({ passed: expect.any(Boolean) }),
          lint: expect.objectContaining({ passed: expect.any(Boolean) }),
          security: expect.objectContaining({ passed: expect.any(Boolean) })
        })
      });

      expect(response.data.quality_gates).toMeetQualityGates();
    });

    it('should block operations that fail quality gates', async () => {
      const eventData = {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'Edit',
        parameters: {
          file_path: '/src/component.tsx',
          old_string: 'const safe = true;',
          new_string: 'eval("malicious code");' // This should fail security gate
        },
        session_id: testSession,
        apply_quality_gates: true,
        block_on_failure: true
      };

      const response = await axios.post(`${bridgeUrl}/events/dispatch`, eventData);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: false,
        blocked: true,
        blocked_reason: expect.stringContaining('security'),
        quality_gates: expect.objectContaining({
          security: expect.objectContaining({ passed: false })
        })
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      // Simulate network issues by rapid-fire requests
      const rapidRequests = Array(50).fill(null).map((_, index) =>
        axios.post(`${bridgeUrl}/events/dispatch`, {
          event_type: 'PRE_TOOL_USE',
          tool_name: 'Read',
          parameters: { file_path: `/rapid/file${index}.txt` },
          session_id: `${testSession}-rapid-${index}`
        }, { timeout: 1000 })
      );

      const results = await Promise.allSettled(rapidRequests);
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && 
        (result.value as any).status === 200
      );

      // Should have at least 80% success rate even under stress
      const successRate = successful.length / results.length;
      expect(successRate).toBeGreaterThan(0.8);
    });

    it('should maintain state consistency during failures', async () => {
      const sessionId = `${testSession}-consistency`;
      
      // Create some state
      await axios.post(`${bridgeUrl}/context/capture`, {
        session_id: sessionId,
        context_type: 'state_test',
        data: { counter: 1 }
      });

      // Simulate partial failure scenario
      const partiallyFailingRequest = axios.post(`${bridgeUrl}/events/dispatch`, {
        event_type: 'PRE_TOOL_USE',
        tool_name: 'PartiallyFailingTool',
        parameters: { simulate_partial_failure: true },
        session_id: sessionId
      });

      await expect(partiallyFailingRequest).resolves.toBeDefined();

      // Verify state is still consistent
      const stateResponse = await axios.get(
        `${bridgeUrl}/context/retrieve?session_id=${sessionId}&type=state_test`
      );
      
      expect(stateResponse.status).toBe(200);
      expect(stateResponse.data.contexts[0].data.counter).toBe(1);
    });
  });
});