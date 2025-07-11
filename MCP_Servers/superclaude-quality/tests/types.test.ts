import { 
  ValidationStep, 
  QualityLevel, 
  DEFAULT_VALIDATION_CONFIG,
  QualityValidationError,
  SemanticAnalysisError,
  CrossServerIntegrationError
} from '../src/types/index';

describe('SuperClaude Quality Server - Types', () => {
  describe('ValidationStep enum', () => {
    it('should have correct enum values', () => {
      expect(ValidationStep.SYNTAX).toBe('syntax');
      expect(ValidationStep.TYPE_CHECK).toBe('type_check');
      expect(ValidationStep.LINT).toBe('lint');
      expect(ValidationStep.SECURITY).toBe('security');
      expect(ValidationStep.TEST).toBe('test');
      expect(ValidationStep.PERFORMANCE).toBe('performance');
      expect(ValidationStep.DOCUMENTATION).toBe('documentation');
      expect(ValidationStep.INTEGRATION).toBe('integration');
    });

    it('should have all 8 validation steps', () => {
      const steps = Object.values(ValidationStep);
      expect(steps).toHaveLength(8);
    });
  });

  describe('QualityLevel enum', () => {
    it('should have correct enum values', () => {
      expect(QualityLevel.CRITICAL).toBe('critical');
      expect(QualityLevel.HIGH).toBe('high');
      expect(QualityLevel.MEDIUM).toBe('medium');
      expect(QualityLevel.LOW).toBe('low');
      expect(QualityLevel.INFO).toBe('info');
    });

    it('should have 5 quality levels', () => {
      const levels = Object.values(QualityLevel);
      expect(levels).toHaveLength(5);
    });
  });

  describe('DEFAULT_VALIDATION_CONFIG', () => {
    it('should have all required sections', () => {
      expect(DEFAULT_VALIDATION_CONFIG).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.steps).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.thresholds).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.semantic).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.caching).toBeDefined();
      expect(DEFAULT_VALIDATION_CONFIG.integration).toBeDefined();
    });

    it('should configure all validation steps', () => {
      Object.values(ValidationStep).forEach(step => {
        const stepConfig = DEFAULT_VALIDATION_CONFIG.steps[step];
        expect(stepConfig).toBeDefined();
        expect(typeof stepConfig.enabled).toBe('boolean');
        expect(typeof stepConfig.timeout).toBe('number');
        expect(typeof stepConfig.retries).toBe('number');
        expect(typeof stepConfig.weight).toBe('number');
        
        expect(stepConfig.timeout).toBeGreaterThan(0);
        expect(stepConfig.retries).toBeGreaterThanOrEqual(0);
        expect(stepConfig.weight).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have reasonable timeout values', () => {
      Object.entries(DEFAULT_VALIDATION_CONFIG.steps).forEach(([stepName, config]) => {
        expect(config.timeout).toBeGreaterThan(1000); // At least 1 second
        expect(config.timeout).toBeLessThan(60000); // No more than 1 minute
      });
    });

    it('should have valid threshold configuration', () => {
      const { thresholds } = DEFAULT_VALIDATION_CONFIG;
      expect(thresholds.overallScore).toBeGreaterThan(0);
      expect(thresholds.overallScore).toBeLessThanOrEqual(100);
      
      Object.entries(thresholds.stepMinimums).forEach(([step, threshold]) => {
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(100);
      });
    });

    it('should have valid semantic configuration', () => {
      const { semantic } = DEFAULT_VALIDATION_CONFIG;
      expect(typeof semantic.enabled).toBe('boolean');
      expect(semantic.complexityThreshold).toBeGreaterThan(0);
      expect(semantic.maintainabilityThreshold).toBeGreaterThan(0);
      expect(semantic.maintainabilityThreshold).toBeLessThanOrEqual(100);
    });

    it('should have valid caching configuration', () => {
      const { caching } = DEFAULT_VALIDATION_CONFIG;
      expect(typeof caching.enabled).toBe('boolean');
      expect(caching.ttl).toBeGreaterThan(0);
      expect(caching.maxSize).toBeGreaterThan(0);
    });

    it('should have valid integration configuration', () => {
      const { integration } = DEFAULT_VALIDATION_CONFIG;
      expect(typeof integration.orchestrator).toBe('boolean');
      expect(typeof integration.code).toBe('boolean');
      expect(typeof integration.tasks).toBe('boolean');
    });
  });

  describe('Error Classes', () => {
    describe('QualityValidationError', () => {
      it('should create error with all parameters', () => {
        const error = new QualityValidationError('Test error', ValidationStep.SYNTAX, '/path/to/file');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
        expect(error.step).toBe(ValidationStep.SYNTAX);
        expect(error.filePath).toBe('/path/to/file');
        expect(error.name).toBe('QualityValidationError');
      });

      it('should work without optional filePath', () => {
        const error = new QualityValidationError('Test error', ValidationStep.LINT);
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
        expect(error.step).toBe(ValidationStep.LINT);
        expect(error.filePath).toBeUndefined();
      });
    });

    describe('SemanticAnalysisError', () => {
      it('should create error with all parameters', () => {
        const error = new SemanticAnalysisError('Analysis failed', '/path/to/file', 'typescript');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Analysis failed');
        expect(error.filePath).toBe('/path/to/file');
        expect(error.language).toBe('typescript');
        expect(error.name).toBe('SemanticAnalysisError');
      });

      it('should work with minimal parameters', () => {
        const error = new SemanticAnalysisError('Analysis failed');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Analysis failed');
        expect(error.filePath).toBeUndefined();
        expect(error.language).toBeUndefined();
      });
    });

    describe('CrossServerIntegrationError', () => {
      it('should create error with all parameters', () => {
        const error = new CrossServerIntegrationError('Integration failed', 'test-server', 'test-operation');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Integration failed');
        expect(error.server).toBe('test-server');
        expect(error.operation).toBe('test-operation');
        expect(error.name).toBe('CrossServerIntegrationError');
      });

      it('should work with minimal parameters', () => {
        const error = new CrossServerIntegrationError('Integration failed');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Integration failed');
        expect(error.server).toBeUndefined();
        expect(error.operation).toBeUndefined();
      });
    });
  });

  describe('Validation Weight Distribution', () => {
    it('should have balanced weight distribution', () => {
      const weights = Object.values(DEFAULT_VALIDATION_CONFIG.steps).map(step => step.weight);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      
      expect(totalWeight).toBeGreaterThan(50);
      expect(totalWeight).toBeLessThan(200);
      
      // No single step should dominate
      weights.forEach(weight => {
        expect(weight / totalWeight).toBeLessThan(0.4); // No more than 40% of total weight
      });
    });

    it('should prioritize critical validation steps', () => {
      const { steps } = DEFAULT_VALIDATION_CONFIG;
      
      // Security and type checking should have high weights
      expect(steps[ValidationStep.SECURITY].weight).toBeGreaterThanOrEqual(15);
      expect(steps[ValidationStep.TYPE_CHECK].weight).toBeGreaterThanOrEqual(15);
      
      // Documentation typically has lower weight
      expect(steps[ValidationStep.DOCUMENTATION].weight).toBeLessThanOrEqual(10);
    });
  });

  describe('Step Configuration Consistency', () => {
    it('should have consistent timeout scaling with complexity', () => {
      const { steps } = DEFAULT_VALIDATION_CONFIG;
      
      // More complex operations should have longer timeouts
      expect(steps[ValidationStep.TEST].timeout).toBeGreaterThan(steps[ValidationStep.SYNTAX].timeout);
      expect(steps[ValidationStep.INTEGRATION].timeout).toBeGreaterThan(steps[ValidationStep.LINT].timeout);
    });

    it('should have appropriate retry counts', () => {
      Object.values(DEFAULT_VALIDATION_CONFIG.steps).forEach(step => {
        expect(step.retries).toBeGreaterThanOrEqual(1);
        expect(step.retries).toBeLessThanOrEqual(3); // Reasonable retry limit
      });
    });
  });
});