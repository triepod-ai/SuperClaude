/**
 * Migration Testing - Feature Parity Validation
 * Ensures new MCP system maintains all functionality of legacy system
 */

import axios from 'axios';
import { promises as fs } from 'fs';

describe('Migration Feature Parity', () => {
  const legacySystemUrl = 'http://localhost:3100'; // Legacy system
  const newSystemUrl = global.mockClaudeCode.getUrl(); // New MCP system
  let testSession: string;

  beforeAll(async () => {
    testSession = `migration-test-${Date.now()}`;
  });

  describe('Core Command Parity', () => {
    it('should maintain /analyze command functionality', async () => {
      const analyzeCommand = {
        command: '/analyze',
        arguments: ['@sample-project/', '--focus', 'performance'],
        session_id: testSession,
        user_message: 'Analyze project performance'
      };

      // Test legacy system
      const legacyMetricId = global.performanceMonitor.startMetric('legacy-analyze', 'migration');
      const legacyResponse = await axios.post(`${legacySystemUrl}/commands/analyze`, analyzeCommand);
      global.performanceMonitor.endMetric(legacyMetricId);

      // Test new system
      const newMetricId = global.performanceMonitor.startMetric('new-analyze', 'migration');
      const newResponse = await axios.post(`${newSystemUrl}/workflows/analyze`, analyzeCommand);
      global.performanceMonitor.endMetric(newMetricId);

      // Both should succeed
      expect(legacyResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);

      // Compare essential functionality
      expect(newResponse.data).toMatchObject({
        workflow_id: expect.any(String),
        status: expect.stringMatching(/^(initiated|in_progress|completed)$/),
        focus_area: 'performance',
        project_path: expect.stringContaining('sample-project')
      });

      // Wait for completion and compare results
      const legacyResult = await this.waitForCommandCompletion(legacySystemUrl, legacyResponse.data.task_id);
      const newResult = await this.waitForWorkflowCompletion(newSystemUrl, newResponse.data.workflow_id);

      // Compare result structure and content
      this.compareAnalysisResults(legacyResult, newResult);
    });

    it('should maintain /build command functionality', async () => {
      const buildCommand = {
        command: '/build',
        arguments: ['@sample-project/', '--ui', '--framework', 'react'],
        session_id: testSession,
        user_message: 'Build React components'
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/commands/build`, buildCommand);
      const newResponse = await axios.post(`${newSystemUrl}/workflows/build`, buildCommand);

      expect(legacyResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);

      const legacyResult = await this.waitForCommandCompletion(legacySystemUrl, legacyResponse.data.task_id);
      const newResult = await this.waitForWorkflowCompletion(newSystemUrl, newResponse.data.workflow_id);

      // Verify build artifacts are equivalent
      this.compareBuildResults(legacyResult, newResult);
    });

    it('should maintain /improve command functionality', async () => {
      const improveCommand = {
        command: '/improve',
        arguments: ['@sample-project/src/index.ts', '--quality', '--performance'],
        session_id: testSession,
        user_message: 'Improve code quality and performance'
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/commands/improve`, improveCommand);
      const newResponse = await axios.post(`${newSystemUrl}/workflows/improve`, improveCommand);

      const legacyResult = await this.waitForCommandCompletion(legacySystemUrl, legacyResponse.data.task_id);
      const newResult = await this.waitForWorkflowCompletion(newSystemUrl, newResponse.data.workflow_id);

      // Compare improvement metrics
      this.compareImprovementResults(legacyResult, newResult);
    });
  });

  describe('Tool Integration Parity', () => {
    it('should maintain Read tool behavior', async () => {
      const readRequest = {
        tool: 'Read',
        parameters: {
          file_path: global.testEnvironment.getTestDataPath('sample-project/src/index.ts')
        },
        session_id: testSession
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/tools/execute`, readRequest);
      const newResponse = await axios.post(`${newSystemUrl}/tools/execute`, readRequest);

      expect(legacyResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);

      // Content should be identical
      expect(newResponse.data.result.content).toBe(legacyResponse.data.result.content);
      expect(newResponse.data.result.lines).toBe(legacyResponse.data.result.lines);
    });

    it('should maintain Edit tool behavior', async () => {
      // Create test file
      const testFile = await global.testEnvironment.createTempFile(
        'edit-test.ts',
        'const oldValue = "old";\nconsole.log(oldValue);'
      );

      const editRequest = {
        tool: 'Edit',
        parameters: {
          file_path: testFile,
          old_string: 'const oldValue = "old";',
          new_string: 'const newValue = "new";'
        },
        session_id: testSession
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/tools/execute`, editRequest);
      
      // Reset file for new system test
      await fs.writeFile(testFile, 'const oldValue = "old";\nconsole.log(oldValue);');
      
      const newResponse = await axios.post(`${newSystemUrl}/tools/execute`, editRequest);

      expect(legacyResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);

      // Verify both systems made identical changes
      expect(newResponse.data.result.changes_made).toBe(legacyResponse.data.result.changes_made);
    });

    it('should maintain Grep tool behavior', async () => {
      const grepRequest = {
        tool: 'Grep',
        parameters: {
          pattern: 'function.*\\(',
          path: global.testEnvironment.getTestDataPath('sample-project/src'),
          output_mode: 'content'
        },
        session_id: testSession
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/tools/execute`, grepRequest);
      const newResponse = await axios.post(`${newSystemUrl}/tools/execute`, grepRequest);

      expect(legacyResponse.status).toBe(200);
      expect(newResponse.status).toBe(200);

      // Results should be functionally equivalent (may differ in exact formatting)
      expect(newResponse.data.result.total_matches).toBe(legacyResponse.data.result.total_matches);
      expect(newResponse.data.result.files_searched).toBe(legacyResponse.data.result.files_searched);
    });
  });

  describe('Performance Parity', () => {
    it('should maintain or improve response times', async () => {
      const testCommand = {
        command: '/analyze',
        arguments: ['@sample-project/', '--quick'],
        session_id: testSession,
        user_message: 'Quick analysis for performance comparison'
      };

      // Measure legacy system performance
      const legacyStartTime = Date.now();
      const legacyResponse = await axios.post(`${legacySystemUrl}/commands/analyze`, testCommand);
      await this.waitForCommandCompletion(legacySystemUrl, legacyResponse.data.task_id);
      const legacyDuration = Date.now() - legacyStartTime;

      // Measure new system performance
      const newStartTime = Date.now();
      const newResponse = await axios.post(`${newSystemUrl}/workflows/analyze`, testCommand);
      await this.waitForWorkflowCompletion(newSystemUrl, newResponse.data.workflow_id);
      const newDuration = Date.now() - newStartTime;

      // New system should be no more than 20% slower (allowing for MCP overhead)
      const performanceRatio = newDuration / legacyDuration;
      expect(performanceRatio).toBeLessThan(1.2);

      console.log(`Performance comparison - Legacy: ${legacyDuration}ms, New: ${newDuration}ms, Ratio: ${performanceRatio.toFixed(2)}`);
    });

    it('should handle concurrent operations as well as legacy system', async () => {
      const concurrentOps = 5;
      const testOperation = {
        tool: 'Read',
        parameters: { file_path: global.testEnvironment.getTestDataPath('sample-project/README.md') },
        session_id: testSession
      };

      // Test legacy system concurrency
      const legacyStartTime = Date.now();
      const legacyPromises = Array(concurrentOps).fill(null).map(() =>
        axios.post(`${legacySystemUrl}/tools/execute`, testOperation)
      );
      await Promise.all(legacyPromises);
      const legacyConcurrentDuration = Date.now() - legacyStartTime;

      // Test new system concurrency
      const newStartTime = Date.now();
      const newPromises = Array(concurrentOps).fill(null).map(() =>
        axios.post(`${newSystemUrl}/tools/execute`, testOperation)
      );
      await Promise.all(newPromises);
      const newConcurrentDuration = Date.now() - newStartTime;

      // New system should handle concurrency as well as legacy
      const concurrencyRatio = newConcurrentDuration / legacyConcurrentDuration;
      expect(concurrencyRatio).toBeLessThan(1.3); // Allow 30% overhead for MCP
    });
  });

  describe('Error Handling Parity', () => {
    it('should handle file not found errors consistently', async () => {
      const invalidRequest = {
        tool: 'Read',
        parameters: { file_path: '/nonexistent/file.txt' },
        session_id: testSession
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/tools/execute`, invalidRequest).catch(e => e.response);
      const newResponse = await axios.post(`${newSystemUrl}/tools/execute`, invalidRequest).catch(e => e.response);

      // Both should handle error consistently
      expect(legacyResponse.status).toBe(newResponse.status);
      expect(newResponse.data.error).toBeDefined();
      expect(legacyResponse.data.error).toBeDefined();
    });

    it('should handle invalid tool parameters consistently', async () => {
      const invalidRequest = {
        tool: 'Edit',
        parameters: {
          file_path: '/valid/file.txt',
          old_string: '', // Invalid empty string
          new_string: 'replacement'
        },
        session_id: testSession
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/tools/execute`, invalidRequest).catch(e => e.response);
      const newResponse = await axios.post(`${newSystemUrl}/tools/execute`, invalidRequest).catch(e => e.response);

      expect(legacyResponse.status).toBe(newResponse.status);
      expect(both.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Data Format Compatibility', () => {
    it('should maintain compatible output formats', async () => {
      const analyzeCommand = {
        command: '/analyze',
        arguments: ['@sample-project/', '--output-format', 'json'],
        session_id: testSession,
        user_message: 'Analysis with JSON output'
      };

      const legacyResponse = await axios.post(`${legacySystemUrl}/commands/analyze`, analyzeCommand);
      const newResponse = await axios.post(`${newSystemUrl}/workflows/analyze`, analyzeCommand);

      const legacyResult = await this.waitForCommandCompletion(legacySystemUrl, legacyResponse.data.task_id);
      const newResult = await this.waitForWorkflowCompletion(newSystemUrl, newResponse.data.workflow_id);

      // Check that both outputs contain essential fields
      const essentialFields = ['analysis_type', 'project_path', 'findings', 'recommendations'];
      
      essentialFields.forEach(field => {
        expect(legacyResult.results).toHaveProperty(field);
        expect(newResult.results).toHaveProperty(field);
      });

      // Verify data structure compatibility
      expect(typeof legacyResult.results.findings).toBe(typeof newResult.results.findings);
      expect(Array.isArray(legacyResult.results.recommendations)).toBe(Array.isArray(newResult.results.recommendations));
    });

    it('should maintain session data compatibility', async () => {
      // Create session in legacy system
      await axios.post(`${legacySystemUrl}/session/create`, { session_id: testSession });
      
      // Add some data
      await axios.post(`${legacySystemUrl}/session/data`, {
        session_id: testSession,
        key: 'test_data',
        value: { test: 'value', number: 42 }
      });

      // Export session data
      const legacyExport = await axios.get(`${legacySystemUrl}/session/export?session_id=${testSession}`);

      // Import into new system
      const importResponse = await axios.post(`${newSystemUrl}/session/import`, {
        session_id: testSession,
        data: legacyExport.data
      });

      expect(importResponse.status).toBe(200);

      // Verify data accessibility
      const newSessionData = await axios.get(`${newSystemUrl}/session/data?session_id=${testSession}&key=test_data`);
      
      expect(newSessionData.status).toBe(200);
      expect(newSessionData.data.value).toEqual({ test: 'value', number: 42 });
    });
  });

  describe('Configuration Migration', () => {
    it('should support legacy configuration formats', async () => {
      const legacyConfig = {
        personas: {
          default: 'architect',
          auto_activation: true
        },
        performance: {
          thresholds: {
            response_time: 100,
            memory_usage: 512
          }
        },
        mcp_servers: {
          enabled: ['tasks', 'orchestrator'],
          fallback_mode: true
        }
      };

      // Apply legacy config to new system
      const configResponse = await axios.post(`${newSystemUrl}/config/migrate`, {
        legacy_config: legacyConfig,
        session_id: testSession
      });

      expect(configResponse.status).toBe(200);
      expect(configResponse.data.migration_successful).toBe(true);

      // Verify config was applied correctly
      const currentConfig = await axios.get(`${newSystemUrl}/config/current?session_id=${testSession}`);
      
      expect(currentConfig.data.personas.default).toBe('architect');
      expect(currentConfig.data.performance.thresholds.response_time).toBe(100);
      expect(currentConfig.data.mcp_servers.enabled).toContain('tasks');
    });
  });

  // Helper methods

  private async waitForCommandCompletion(baseUrl: string, taskId: string): Promise<any> {
    const maxPolls = 30;
    let polls = 0;

    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(`${baseUrl}/tasks/${taskId}/status`);
      
      if (statusResponse.data.status === 'completed') {
        return statusResponse.data;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error(`Command failed: ${statusResponse.data.error}`);
      }
      
      polls++;
    }
    
    throw new Error('Command did not complete within timeout');
  }

  private async waitForWorkflowCompletion(baseUrl: string, workflowId: string): Promise<any> {
    const maxPolls = 30;
    let polls = 0;

    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(`${baseUrl}/workflows/${workflowId}/status`);
      
      if (statusResponse.data.status === 'completed') {
        return statusResponse.data;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error(`Workflow failed: ${statusResponse.data.error}`);
      }
      
      polls++;
    }
    
    throw new Error('Workflow did not complete within timeout');
  }

  private compareAnalysisResults(legacyResult: any, newResult: any): void {
    // Compare essential analysis components
    expect(newResult.results.analysis_type).toBe(legacyResult.results.analysis_type);
    expect(newResult.results.findings.length).toBeGreaterThanOrEqual(legacyResult.results.findings.length * 0.8);
    expect(newResult.results.recommendations.length).toBeGreaterThanOrEqual(legacyResult.results.recommendations.length * 0.8);
    
    // Quality scores should be similar (within 10%)
    if (legacyResult.results.quality_score && newResult.results.quality_score) {
      const scoreDiff = Math.abs(newResult.results.quality_score - legacyResult.results.quality_score);
      expect(scoreDiff).toBeLessThan(0.1);
    }
  }

  private compareBuildResults(legacyResult: any, newResult: any): void {
    // Both should generate artifacts
    expect(newResult.artifacts).toBeDefined();
    expect(legacyResult.artifacts).toBeDefined();
    
    expect(newResult.artifacts.length).toBeGreaterThanOrEqual(legacyResult.artifacts.length * 0.8);
    
    // Check artifact types are similar
    const legacyTypes = legacyResult.artifacts.map((a: any) => a.type).sort();
    const newTypes = newResult.artifacts.map((a: any) => a.type).sort();
    
    // At least 80% overlap in artifact types
    const overlap = legacyTypes.filter((type: string) => newTypes.includes(type)).length;
    const overlapPercentage = overlap / legacyTypes.length;
    expect(overlapPercentage).toBeGreaterThan(0.8);
  }

  private compareImprovementResults(legacyResult: any, newResult: any): void {
    // Both should identify improvements
    expect(newResult.improvements_made).toBeGreaterThan(0);
    expect(legacyResult.improvements_made).toBeGreaterThan(0);
    
    // Improvement categories should be similar
    if (legacyResult.improvement_categories && newResult.improvement_categories) {
      const commonCategories = legacyResult.improvement_categories.filter(
        (cat: string) => newResult.improvement_categories.includes(cat)
      );
      
      const similarityRatio = commonCategories.length / legacyResult.improvement_categories.length;
      expect(similarityRatio).toBeGreaterThan(0.7);
    }
  }
});