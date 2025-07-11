import { SuperClaudeQualityServer } from '../src/MCPServer';
import { ValidationStep, QualityLevel, DEFAULT_VALIDATION_CONFIG } from '../src/types/index';

describe('SuperClaude Quality Server - Basic Tests', () => {
  let server: SuperClaudeQualityServer;

  beforeEach(() => {
    server = new SuperClaudeQualityServer();
  });

  describe('Server Initialization', () => {
    it('should create server instance successfully', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(SuperClaudeQualityServer);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct ValidationStep enum values', () => {
      expect(ValidationStep.SYNTAX).toBe('syntax');
      expect(ValidationStep.TYPE_CHECK).toBe('type_check');
      expect(ValidationStep.LINT).toBe('lint');
      expect(ValidationStep.SECURITY).toBe('security');
      expect(ValidationStep.TEST).toBe('test');
      expect(ValidationStep.PERFORMANCE).toBe('performance');
      expect(ValidationStep.DOCUMENTATION).toBe('documentation');
      expect(ValidationStep.INTEGRATION).toBe('integration');
    });

    it('should have correct QualityLevel enum values', () => {
      expect(QualityLevel.CRITICAL).toBe('critical');
      expect(QualityLevel.HIGH).toBe('high');
      expect(QualityLevel.MEDIUM).toBe('medium');
      expect(QualityLevel.LOW).toBe('low');
      expect(QualityLevel.INFO).toBe('info');
    });

    it('should have valid default configuration', () => {
      expect(DEFAULT_VALIDATION_CONFIG).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.steps).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.thresholds).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.semantic).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.caching).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.integration).toBeDefined();

      // Check that all validation steps are configured
      Object.values(ValidationStep).forEach(step => {
        expect(DEFAULT_VALIDATION_CONFIG.steps[step]).toBeDefined();
        expect(DEFAULT_VALIDATION_CONFIG.steps[step].enabled).toBeDefined();
        expect(DEFAULT_VALIDATION_CONFIG.steps[step].timeout).toBeGreaterThan(0);
        expect(DEFAULT_VALIDATION_CONFIG.steps[step].weight).toBeGreaterThanOrEqual(0);
      });

      // Check thresholds
      expect(DEFAULT_VALIDATION_CONFIG.thresholds.overallScore).toBeGreaterThan(0);
      expect(DEFAULT_VALIDATION_CONFIG.thresholds.overallScore).toBeLessThanOrEqual(100);

      // Check semantic configuration
      expect(DEFAULT_VALIDATION_CONFIG.semantic.enabled).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.semantic.complexityThreshold).toBeGreaterThan(0);
      expect(DEFAULT_VALIDATION_CONFIG.semantic.maintainabilityThreshold).toBeGreaterThan(0);

      // Check caching configuration
      expect(DEFAULT_VALIDATION_CONFIG.caching.enabled).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.caching.ttl).toBeGreaterThan(0);
      expect(DEFAULT_VALIDATION_CONFIG.caching.maxSize).toBeGreaterThan(0);

      // Check integration configuration
      expect(DEFAULT_VALIDATION_CONFIG.integration.orchestrator).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.integration.code).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.integration.tasks).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should have reasonable timeout values for all steps', () => {
      Object.entries(DEFAULT_VALIDATION_CONFIG.steps).forEach(([stepName, config]) => {
        expect(config.timeout).toBeGreaterThan(1000); // At least 1 second
        expect(config.timeout).toBeLessThan(60000); // No more than 1 minute
      });
    });

    it('should have weights that sum to a reasonable total', () => {
      const totalWeight = Object.values(DEFAULT_VALIDATION_CONFIG.steps)
        .reduce((sum, config) => sum + config.weight, 0);
      
      expect(totalWeight).toBeGreaterThan(50);
      expect(totalWeight).toBeLessThan(200);
    });

    it('should have reasonable threshold values', () => {
      Object.entries(DEFAULT_VALIDATION_CONFIG.thresholds.stepMinimums).forEach(([step, threshold]) => {
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Error Classes', () => {
    it('should create validation errors correctly', () => {
      const { QualityValidationError } = require('../src/types/index');
      
      const error = new QualityValidationError('Test error', ValidationStep.SYNTAX, '/path/to/file');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.step).toBe(ValidationStep.SYNTAX);
      expect(error.filePath).toBe('/path/to/file');
      expect(error.name).toBe('QualityValidationError');
    });

    it('should create semantic analysis errors correctly', () => {
      const { SemanticAnalysisError } = require('../src/types/index');
      
      const error = new SemanticAnalysisError('Analysis failed', '/path/to/file', 'typescript');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Analysis failed');
      expect(error.filePath).toBe('/path/to/file');
      expect(error.language).toBe('typescript');
      expect(error.name).toBe('SemanticAnalysisError');
    });

    it('should create cross-server integration errors correctly', () => {
      const { CrossServerIntegrationError } = require('../src/types/index');
      
      const error = new CrossServerIntegrationError('Integration failed', 'test-server', 'test-operation');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Integration failed');
      expect(error.server).toBe('test-server');
      expect(error.operation).toBe('test-operation');
      expect(error.name).toBe('CrossServerIntegrationError');
    });
  });
});