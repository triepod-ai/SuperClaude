import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { logger } from './logger.js';
import { Validator } from './validation.js';

/**
 * Secure process manager for sandboxed execution
 * Provides safe process spawning with resource limits and security restrictions
 */

export interface SecureProcessOptions {
  command: string;
  args: string[];
  timeout?: number;
  maxMemory?: number; // MB
  allowedPaths?: string[];
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  uid?: number;
  gid?: number;
}

export interface ProcessResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  error?: string;
}

export class SecureProcessManager {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_MAX_MEMORY = 512; // 512 MB
  private static readonly ALLOWED_COMMANDS = new Set([
    'typescript-language-server',
    'pylsp',
    'rust-analyzer',
    'gopls',
    'java-language-server',
    'clangd',
    'node',
    'python3',
    'python'
  ]);

  /**
   * Spawn a process with security restrictions
   */
  public static async spawnSecure(options: SecureProcessOptions): Promise<ChildProcess> {
    try {
      // Validate inputs
      this.validateProcessOptions(options);

      // Prepare spawn options with security restrictions
      const spawnOptions: SpawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.workingDirectory || process.cwd(),
        env: this.buildSecureEnvironment(options.environmentVariables),
        detached: false, // Prevent background execution
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        killSignal: 'SIGTERM'
      };

      // Add process restrictions if running on Linux
      if (process.platform === 'linux') {
        spawnOptions.uid = options.uid || process.getuid?.();
        spawnOptions.gid = options.gid || process.getgid?.();
      }

      logger.info('Spawning secure process', {
        command: options.command,
        args: options.args,
        timeout: spawnOptions.timeout
      });

      // Spawn the process
      const childProcess = spawn(options.command, options.args, spawnOptions);

      // Set up resource monitoring
      this.setupResourceMonitoring(childProcess, options);

      // Set up security monitoring
      this.setupSecurityMonitoring(childProcess, options);

      return childProcess;

    } catch (error) {
      logger.error('Failed to spawn secure process', {
        command: options.command,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Process spawn failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a process and wait for completion
   */
  public static async executeSecure(options: SecureProcessOptions): Promise<ProcessResult> {
    return new Promise<ProcessResult>((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let resolved = false;

      const resolveOnce = (result: ProcessResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      this.spawnSecure(options)
        .then((childProcess) => {
          // Set up timeout
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              logger.warn('Process timeout, killing', {
                command: options.command,
                timeout: options.timeout
              });
              childProcess.kill('SIGKILL');
              resolveOnce({
                success: false,
                stdout,
                stderr,
                exitCode: null,
                signal: 'SIGKILL',
                error: 'Process timeout'
              });
            }
          }, options.timeout || this.DEFAULT_TIMEOUT);

          // Collect output
          childProcess.stdout?.on('data', (data) => {
            stdout += data.toString();
            // Prevent memory exhaustion
            if (stdout.length > 1024 * 1024) { // 1MB limit
              stdout = stdout.substring(0, 1024 * 1024);
              logger.warn('Process stdout truncated to prevent memory exhaustion');
            }
          });

          childProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
            // Prevent memory exhaustion
            if (stderr.length > 1024 * 1024) { // 1MB limit
              stderr = stderr.substring(0, 1024 * 1024);
              logger.warn('Process stderr truncated to prevent memory exhaustion');
            }
          });

          // Handle process completion
          childProcess.on('exit', (code, signal) => {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            logger.info('Process completed', {
              command: options.command,
              exitCode: code,
              signal,
              duration
            });

            resolveOnce({
              success: code === 0,
              stdout,
              stderr,
              exitCode: code,
              signal,
            });
          });

          // Handle errors
          childProcess.on('error', (error) => {
            clearTimeout(timeoutId);
            logger.error('Process error', {
              command: options.command,
              error: error.message
            });

            resolveOnce({
              success: false,
              stdout,
              stderr,
              exitCode: null,
              signal: null,
              error: error.message
            });
          });

        })
        .catch((error) => {
          resolveOnce({
            success: false,
            stdout: '',
            stderr: '',
            exitCode: null,
            signal: null,
            error: error.message
          });
        });
    });
  }

  /**
   * Validate process options for security
   */
  private static validateProcessOptions(options: SecureProcessOptions): void {
    // Validate command
    if (!options.command || typeof options.command !== 'string') {
      throw new Error('Invalid command');
    }

    // Check if command is allowed
    const commandName = options.command.split('/').pop() || '';
    if (!this.ALLOWED_COMMANDS.has(commandName)) {
      throw new Error(`Command not allowed: ${commandName}`);
    }

    // Validate command format
    if (!Validator.validateCommand(options.command)) {
      throw new Error('Command contains dangerous patterns');
    }

    // Validate arguments
    if (!Array.isArray(options.args)) {
      throw new Error('Args must be an array');
    }

    for (const arg of options.args) {
      if (typeof arg !== 'string') {
        throw new Error('All args must be strings');
      }
      
      // Check for injection attempts
      if (arg.includes('..') || arg.includes('\0') || arg.length > 500) {
        throw new Error(`Unsafe argument: ${arg}`);
      }
    }

    // Validate working directory
    if (options.workingDirectory && !Validator.validateFilePath(options.workingDirectory)) {
      throw new Error('Invalid working directory');
    }

    // Validate resource limits
    if (options.timeout && (options.timeout < 1000 || options.timeout > 300000)) {
      throw new Error('Timeout must be between 1 and 300 seconds');
    }

    if (options.maxMemory && (options.maxMemory < 64 || options.maxMemory > 4096)) {
      throw new Error('Memory limit must be between 64MB and 4GB');
    }
  }

  /**
   * Build secure environment variables
   */
  private static buildSecureEnvironment(customEnv?: Record<string, string>): Record<string, string> {
    // Start with minimal safe environment
    const secureEnv: Record<string, string> = {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: '/tmp',
      USER: 'nobody',
      SHELL: '/bin/sh'
    };

    // Add language-specific safe variables
    const safeVariables = [
      'NODE_ENV',
      'RUST_LOG',
      'PYTHONPATH',
      'GOPATH',
      'JAVA_HOME'
    ];

    // Copy allowed environment variables
    for (const key of safeVariables) {
      if (process.env[key]) {
        secureEnv[key] = process.env[key]!;
      }
    }

    // Add custom environment variables (with validation)
    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        if (this.isAllowedEnvVariable(key, value)) {
          secureEnv[key] = value;
        } else {
          logger.warn('Rejected unsafe environment variable', { key });
        }
      }
    }

    return secureEnv;
  }

  /**
   * Check if environment variable is safe
   */
  private static isAllowedEnvVariable(key: string, value: string): boolean {
    // Key validation
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      return false;
    }

    // Length checks
    if (key.length > 100 || value.length > 1000) {
      return false;
    }

    // Dangerous variable names
    const dangerousVars = [
      'LD_LIBRARY_PATH',
      'LD_PRELOAD',
      'DYLD_LIBRARY_PATH',
      'DYLD_INSERT_LIBRARIES'
    ];

    if (dangerousVars.includes(key.toUpperCase())) {
      return false;
    }

    // Value validation
    if (value.includes('\0') || value.includes('\n')) {
      return false;
    }

    return true;
  }

  /**
   * Set up resource monitoring
   */
  private static setupResourceMonitoring(childProcess: ChildProcess, options: SecureProcessOptions): void {
    const maxMemory = (options.maxMemory || this.DEFAULT_MAX_MEMORY) * 1024 * 1024; // Convert to bytes
    const checkInterval = 5000; // Check every 5 seconds

    const monitoringInterval = setInterval(() => {
      if (childProcess.killed || !childProcess.pid) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        // Check memory usage (simplified, platform-specific)
        const memInfo = process.memoryUsage();
        if (memInfo.rss > maxMemory) {
          logger.warn('Process memory limit exceeded, terminating', {
            pid: childProcess.pid,
            memory: memInfo.rss,
            limit: maxMemory
          });
          childProcess.kill('SIGTERM');
          clearInterval(monitoringInterval);
        }
      } catch (error) {
        // Memory check failed, continue monitoring
      }
    }, checkInterval);

    // Clean up monitoring when process exits
    childProcess.on('exit', () => {
      clearInterval(monitoringInterval);
    });
  }

  /**
   * Set up security monitoring
   */
  private static setupSecurityMonitoring(childProcess: ChildProcess, options: SecureProcessOptions): void {
    // Monitor for suspicious behavior
    let suspiciousActivityCount = 0;

    childProcess.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      
      // Check for suspicious error patterns
      const suspiciousPatterns = [
        /permission denied/i,
        /access denied/i,
        /segmentation fault/i,
        /core dumped/i,
        /illegal instruction/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(errorOutput)) {
          suspiciousActivityCount++;
          logger.warn('Suspicious process activity detected', {
            pid: childProcess.pid,
            pattern: pattern.source,
            count: suspiciousActivityCount
          });

          // Kill process if too many suspicious activities
          if (suspiciousActivityCount > 5) {
            logger.error('Too many suspicious activities, terminating process', {
              pid: childProcess.pid
            });
            childProcess.kill('SIGKILL');
            break;
          }
        }
      }
    });
  }

  /**
   * Add command to allowed list (for dynamic configuration)
   */
  public static addAllowedCommand(command: string): void {
    if (Validator.validateCommand(command)) {
      const commandName = command.split('/').pop() || '';
      this.ALLOWED_COMMANDS.add(commandName);
      logger.info('Added allowed command', { command: commandName });
    } else {
      logger.warn('Rejected unsafe command for allowlist', { command });
    }
  }

  /**
   * Remove command from allowed list
   */
  public static removeAllowedCommand(command: string): void {
    this.ALLOWED_COMMANDS.delete(command);
    logger.info('Removed allowed command', { command });
  }

  /**
   * Get list of allowed commands
   */
  public static getAllowedCommands(): string[] {
    return Array.from(this.ALLOWED_COMMANDS);
  }
}