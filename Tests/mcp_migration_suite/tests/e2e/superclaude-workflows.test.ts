/**
 * End-to-End Tests for SuperClaude Workflows
 * Tests complete command execution, wave mode, and persona integration
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

describe('SuperClaude End-to-End Workflows', () => {
  const claudeCodeUrl = global.mockClaudeCode.getUrl();
  const testProjectPath = global.testEnvironment.getTestDataPath('sample-project');
  let sessionId: string;

  beforeAll(async () => {
    sessionId = `e2e-session-${Date.now()}`;
    
    // Reset mock Claude Code state
    global.mockClaudeCode.clearHistory();
    
    // Verify test project exists
    const projectExists = await fs.access(testProjectPath).then(() => true).catch(() => false);
    if (!projectExists) {
      throw new Error(`Test project not found: ${testProjectPath}`);
    }
  });

  describe('/analyze Command Workflow', () => {
    it('should execute complete /analyze workflow with MCP integration', async () => {
      const workflowMetricId = global.performanceMonitor.startMetric('analyze-workflow', 'e2e');
      
      // Step 1: Simulate /analyze command initiation
      const analyzeRequest = {
        command: '/analyze',
        arguments: ['@sample-project/', '--think', '--focus', 'performance'],
        session_id: sessionId,
        user_message: 'Analyze the sample project for performance issues'
      };

      const analyzeResponse = await axios.post(`${claudeCodeUrl}/workflows/analyze`, analyzeRequest);
      
      expect(analyzeResponse.status).toBe(200);
      expect(analyzeResponse.data).toMatchObject({
        workflow_id: expect.any(String),
        status: 'initiated',
        steps: expect.arrayContaining([
          expect.objectContaining({ name: 'project_scan', status: 'pending' }),
          expect.objectContaining({ name: 'performance_analysis', status: 'pending' }),
          expect.objectContaining({ name: 'report_generation', status: 'pending' })
        ])
      });

      const workflowId = analyzeResponse.data.workflow_id;

      // Step 2: Monitor workflow execution
      let workflowComplete = false;
      const maxPolls = 30;
      let polls = 0;

      while (!workflowComplete && polls < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await axios.get(
          `${claudeCodeUrl}/workflows/${workflowId}/status`
        );
        
        expect(statusResponse.status).toBe(200);
        
        if (statusResponse.data.status === 'completed') {
          workflowComplete = true;
          
          // Verify all steps completed successfully
          expect(statusResponse.data.steps.every((step: any) => step.status === 'completed')).toBe(true);
          
          // Verify MCP servers were involved
          expect(statusResponse.data.mcp_servers_used).toEqual(
            expect.arrayContaining(['superclaude-orchestrator', 'superclaude-performance'])
          );
          
          // Verify performance analysis results
          expect(statusResponse.data.results).toMatchObject({
            analysis_type: 'performance',
            project_path: expect.stringContaining('sample-project'),
            findings: expect.any(Array),
            recommendations: expect.any(Array),
            complexity_score: expect.any(Number)
          });
        }
        
        polls++;
      }

      expect(workflowComplete).toBe(true);
      global.performanceMonitor.endMetric(workflowMetricId);
    });

    it('should handle /analyze with sequential thinking integration', async () => {
      const analyzeRequest = {
        command: '/analyze',
        arguments: ['@sample-project/src/', '--think-hard', '--focus', 'architecture'],
        session_id: sessionId,
        user_message: 'Deep analysis of project architecture'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/analyze`, analyzeRequest);
      
      expect(response.status).toBe(200);
      
      // Wait for completion
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      // Verify sequential thinking was used
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      expect(finalStatus.data.mcp_servers_used).toContain('superclaude-orchestrator');
      expect(finalStatus.data.tool_calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'mcp__sequential-thinking__sequentialthinking'
          })
        ])
      );
    });
  });

  describe('/build Command Workflow', () => {
    it('should execute complete /build workflow with UI component generation', async () => {
      const workflowMetricId = global.performanceMonitor.startMetric('build-workflow', 'e2e');
      
      const buildRequest = {
        command: '/build',
        arguments: ['@sample-project/', '--ui', '--persona-frontend'],
        session_id: sessionId,
        user_message: 'Build a login form component with validation'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/build`, buildRequest);
      
      expect(response.status).toBe(200);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify frontend persona was activated
      expect(finalStatus.data.persona_activated).toBe('frontend');
      
      // Verify UI component was generated
      expect(finalStatus.data.artifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'component',
            name: expect.stringMatching(/login|form/i),
            file_path: expect.stringContaining('.tsx')
          })
        ])
      );

      global.performanceMonitor.endMetric(workflowMetricId);
    });

    it('should handle /build with Context7 integration for framework patterns', async () => {
      const buildRequest = {
        command: '/build',
        arguments: ['@sample-project/', '--c7', '--framework', 'react'],
        session_id: sessionId,
        user_message: 'Build using React best practices and patterns'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/build`, buildRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify Context7 was used for React patterns
      expect(finalStatus.data.mcp_servers_used).toContain('superclaude-code');
      expect(finalStatus.data.documentation_lookups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            library: expect.stringMatching(/react/i),
            topics: expect.arrayContaining(['hooks', 'components'])
          })
        ])
      );
    });
  });

  describe('Wave Mode Workflows', () => {
    it('should execute wave mode for complex multi-domain operations', async () => {
      const waveMetricId = global.performanceMonitor.startMetric('wave-mode-workflow', 'e2e');
      
      const waveRequest = {
        command: '/improve',
        arguments: ['@sample-project/', '--wave-mode', 'force', '--comprehensive'],
        session_id: sessionId,
        user_message: 'Comprehensive improvement of entire project with security, performance, and quality enhancements'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/improve`, waveRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        workflow_id: expect.any(String),
        wave_mode: true,
        wave_strategy: expect.any(String),
        estimated_waves: expect.any(Number)
      });

      const workflowId = response.data.workflow_id;
      
      // Monitor wave progression
      let currentWave = 0;
      const maxWaves = response.data.estimated_waves;
      let allWavesComplete = false;

      while (!allWavesComplete && currentWave < maxWaves + 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const waveStatus = await axios.get(
          `${claudeCodeUrl}/workflows/${workflowId}/waves`
        );
        
        expect(waveStatus.status).toBe(200);
        
        if (waveStatus.data.all_waves_complete) {
          allWavesComplete = true;
          
          // Verify wave execution details
          expect(waveStatus.data.waves).toHaveLength(maxWaves);
          waveStatus.data.waves.forEach((wave: any, index: number) => {
            expect(wave).toMatchObject({
              wave_number: index + 1,
              status: 'completed',
              focus_area: expect.any(String),
              improvements_made: expect.any(Number),
              quality_score_improvement: expect.any(Number)
            });
          });
          
          // Verify multiple domains were addressed
          const focusAreas = waveStatus.data.waves.map((wave: any) => wave.focus_area);
          expect(focusAreas).toEqual(
            expect.arrayContaining(['security', 'performance', 'quality'])
          );
          
        } else if (waveStatus.data.current_wave > currentWave) {
          currentWave = waveStatus.data.current_wave;
          console.log(`Wave ${currentWave} completed`);
        }
      }

      expect(allWavesComplete).toBe(true);
      global.performanceMonitor.endMetric(waveMetricId);
    });

    it('should execute adaptive wave strategy based on project complexity', async () => {
      const adaptiveRequest = {
        command: '/review',
        arguments: ['@sample-project/', '--wave-mode', 'auto', '--adaptive-waves'],
        session_id: sessionId,
        user_message: 'Comprehensive code review with adaptive strategy'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/review`, adaptiveRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId, 60000); // Allow more time for waves
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/waves`);
      
      // Verify adaptive strategy was applied
      expect(finalStatus.data.strategy_used).toBe('adaptive');
      expect(finalStatus.data.strategy_adjustments).toBeGreaterThan(0);
      
      // Verify each wave had appropriate focus based on findings
      finalStatus.data.waves.forEach((wave: any) => {
        expect(wave).toMatchObject({
          focus_rationale: expect.any(String),
          findings_from_previous_wave: expect.any(Array),
          strategy_adjustment: expect.any(String)
        });
      });
    });
  });

  describe('Persona Integration Workflows', () => {
    it('should auto-activate appropriate personas based on context', async () => {
      const securityRequest = {
        command: '/scan',
        arguments: ['@sample-project/', '--focus', 'security'],
        session_id: sessionId,
        user_message: 'Security audit of the project'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/scan`, securityRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify security persona was auto-activated
      expect(finalStatus.data.persona_activated).toBe('security');
      expect(finalStatus.data.persona_activation_reason).toContain('security');
      
      // Verify security-specific analysis was performed
      expect(finalStatus.data.results.security_findings).toBeDefined();
      expect(finalStatus.data.results.vulnerability_scan).toBeDefined();
    });

    it('should handle multi-persona collaboration', async () => {
      const collaborationRequest = {
        command: '/design',
        arguments: ['@sample-project/', '--architecture', '--frontend', '--performance'],
        session_id: sessionId,
        user_message: 'Design system architecture with frontend and performance considerations'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/design`, collaborationRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify multiple personas were involved
      expect(finalStatus.data.personas_involved).toEqual(
        expect.arrayContaining(['architect', 'frontend', 'performance'])
      );
      
      // Verify each persona contributed to the design
      expect(finalStatus.data.persona_contributions).toMatchObject({
        architect: expect.objectContaining({
          system_design: expect.any(Object),
          scalability_considerations: expect.any(Array)
        }),
        frontend: expect.objectContaining({
          ui_patterns: expect.any(Array),
          accessibility_guidelines: expect.any(Array)
        }),
        performance: expect.objectContaining({
          optimization_recommendations: expect.any(Array),
          performance_budgets: expect.any(Object)
        })
      });
    });
  });

  describe('Quality Gates Integration', () => {
    it('should apply quality gates throughout workflow execution', async () => {
      const qualityRequest = {
        command: '/improve',
        arguments: ['@sample-project/src/index.ts', '--quality-gates', '--validate'],
        session_id: sessionId,
        user_message: 'Improve code with strict quality validation'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/improve`, qualityRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify quality gates were applied
      expect(finalStatus.data.quality_gates_applied).toBe(true);
      expect(finalStatus.data.quality_results).toMeetQualityGates();
      
      // Verify each step passed quality validation
      finalStatus.data.steps.forEach((step: any) => {
        if (step.quality_gates) {
          expect(step.quality_gates).toMeetQualityGates();
        }
      });
    });

    it('should handle quality gate failures appropriately', async () => {
      // Create a file with intentional quality issues
      const problematicFile = await global.testEnvironment.createTempFile(
        'problematic.ts',
        `
        // This file has intentional quality issues
        var unsafeCode = eval("dangerous"); // Security issue
        function badFunction() { // Missing types
          console.log("test"); // Lint issue
        }
        `
      );

      const qualityRequest = {
        command: '/improve',
        arguments: [`@${problematicFile}`, '--quality-gates', '--strict'],
        session_id: sessionId,
        user_message: 'Improve problematic code with strict validation'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/improve`, qualityRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId);
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Should identify and address quality issues
      expect(finalStatus.data.quality_issues_found).toBeGreaterThan(0);
      expect(finalStatus.data.quality_improvements_made).toBeGreaterThan(0);
      
      // Final result should pass quality gates
      expect(finalStatus.data.final_quality_check).toMeetQualityGates();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large project workflows efficiently', async () => {
      // Create a simulated large project structure
      const largeProjectPath = await this.createLargeTestProject();
      
      const largeProjectMetricId = global.performanceMonitor.startMetric('large-project-workflow', 'e2e');
      
      const largeProjectRequest = {
        command: '/analyze',
        arguments: [`@${largeProjectPath}`, '--comprehensive', '--delegate'],
        session_id: sessionId,
        user_message: 'Analyze large project with delegation'
      };

      const response = await axios.post(`${claudeCodeUrl}/workflows/analyze`, largeProjectRequest);
      
      const workflowId = response.data.workflow_id;
      await this.waitForWorkflowCompletion(workflowId, 120000); // Allow more time
      
      const finalStatus = await axios.get(`${claudeCodeUrl}/workflows/${workflowId}/status`);
      
      // Verify delegation was used
      expect(finalStatus.data.delegation_used).toBe(true);
      expect(finalStatus.data.sub_agents_spawned).toBeGreaterThan(1);
      
      // Verify reasonable completion time despite size
      expect(finalStatus.data.total_duration_ms).toBeLessThan(120000); // 2 minutes max
      
      global.performanceMonitor.endMetric(largeProjectMetricId);
    });

    it('should maintain performance under concurrent workflows', async () => {
      const concurrentWorkflows = 5;
      const startTime = Date.now();
      
      const workflowPromises = Array(concurrentWorkflows).fill(null).map((_, index) =>
        axios.post(`${claudeCodeUrl}/workflows/analyze`, {
          command: '/analyze',
          arguments: ['@sample-project/', '--focus', 'quality'],
          session_id: `${sessionId}-concurrent-${index}`,
          user_message: `Concurrent analysis ${index + 1}`
        })
      );

      const responses = await Promise.all(workflowPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for all to complete
      const completionPromises = responses.map(response =>
        this.waitForWorkflowCompletion(response.data.workflow_id)
      );
      
      await Promise.all(completionPromises);
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentWorkflows;
      
      // Should handle concurrency efficiently
      expect(averageTime).toBeWithinPerformanceThreshold(30000); // 30s average max
    });
  });

  // Helper methods
  private async waitForWorkflowCompletion(workflowId: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const statusResponse = await axios.get(
        `${claudeCodeUrl}/workflows/${workflowId}/status`
      );
      
      if (statusResponse.data.status === 'completed') {
        return;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error(`Workflow failed: ${statusResponse.data.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Workflow ${workflowId} did not complete within timeout`);
  }

  private async createLargeTestProject(): Promise<string> {
    const projectPath = global.testEnvironment.getTempPath('large-project');
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create multiple directories with files
    const directories = ['src', 'components', 'utils', 'services', 'types', 'tests'];
    
    for (const dir of directories) {
      const dirPath = path.join(projectPath, dir);
      await fs.mkdir(dirPath, { recursive: true });
      
      // Create 10 files per directory
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(dirPath, `file${i}.ts`);
        await fs.writeFile(filePath, `
// File ${i} in ${dir}
export interface ${dir.charAt(0).toUpperCase() + dir.slice(1)}${i} {
  id: string;
  name: string;
  created: Date;
}

export function process${dir.charAt(0).toUpperCase() + dir.slice(1)}${i}(
  data: ${dir.charAt(0).toUpperCase() + dir.slice(1)}${i}
): boolean {
  return data.id.length > 0 && data.name.length > 0;
}
        `);
      }
    }
    
    return projectPath;
  }
});