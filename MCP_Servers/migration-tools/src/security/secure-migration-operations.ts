/**
 * Secure Migration Operations
 * Provides secure alternatives to unsafe filesystem and process operations
 */

import { 
  SecureFileSystem, 
  SecureProcessManager, 
  MCPValidationSchemas,
  Validator,
  logger 
} from '@superclaude/shared';
import { join, dirname } from 'path';

export interface SecureMigrationOptions {
  allowedPaths: string[];
  maxFileSize?: number;
  readOnly?: boolean;
  workingDirectory: string;
}

/**
 * Secure replacement for unsafe migration operations
 */
export class SecureMigrationOperations {
  private options: SecureMigrationOptions;

  constructor(options: SecureMigrationOptions) {
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      readOnly: false,
      ...options
    };

    // Validate working directory
    if (!Validator.validateFilePath(this.options.workingDirectory)) {
      throw new Error('Invalid working directory');
    }
  }

  /**
   * Secure file reading with validation
   */
  async readFile(filePath: string): Promise<string> {
    try {
      // Validate path
      const validated = MCPValidationSchemas.filePath.parse(filePath);
      
      return await SecureFileSystem.readFile(validated, {
        allowedPaths: this.options.allowedPaths,
        maxFileSize: this.options.maxFileSize,
        allowedExtensions: ['.json', '.yaml', '.yml', '.txt', '.md', '.js', '.ts']
      });
    } catch (error) {
      logger.error('Secure file read failed', { filePath, error });
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure file writing with validation
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      if (this.options.readOnly) {
        throw new Error('Write operations disabled in read-only mode');
      }

      // Validate path and content
      const validatedPath = MCPValidationSchemas.filePath.parse(filePath);
      
      if (content.length > (this.options.maxFileSize || 50 * 1024 * 1024)) {
        throw new Error('Content exceeds maximum file size');
      }

      await SecureFileSystem.writeFile(validatedPath, content, {
        allowedPaths: this.options.allowedPaths,
        maxFileSize: this.options.maxFileSize,
        allowedExtensions: ['.json', '.yaml', '.yml', '.txt', '.md', '.log']
      });
    } catch (error) {
      logger.error('Secure file write failed', { filePath, error });
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure directory creation
   */
  async createDirectory(dirPath: string): Promise<void> {
    try {
      const validatedPath = MCPValidationSchemas.filePath.parse(dirPath);
      
      // Use file info to check if we can create the directory
      const parentDir = dirname(validatedPath);
      const parentInfo = await SecureFileSystem.getFileInfo(parentDir, {
        allowedPaths: this.options.allowedPaths
      });

      if (!parentInfo.isWritable) {
        throw new Error('Parent directory is not writable');
      }

      // Create using Node.js fs with validation
      const fs = await import('fs/promises');
      await fs.mkdir(validatedPath, { recursive: true, mode: 0o755 });
      
      logger.debug('Directory created securely', { dirPath: validatedPath });
    } catch (error) {
      logger.error('Secure directory creation failed', { dirPath, error });
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure file copying with validation
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    try {
      // Read source file securely
      const content = await this.readFile(sourcePath);
      
      // Write to destination securely
      await this.writeFile(destPath, content);
      
      logger.debug('File copied securely', { sourcePath, destPath });
    } catch (error) {
      logger.error('Secure file copy failed', { sourcePath, destPath, error });
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure command execution for migration operations
   */
  async executeCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; success: boolean }> {
    try {
      // Validate command
      const validatedCommand = MCPValidationSchemas.command.parse(command);
      
      // Only allow specific migration-related commands
      const allowedCommands = [
        'node',
        'npm',
        'yarn',
        'git',
        'rsync',
        'tar',
        'gzip'
      ];

      const commandName = validatedCommand.split(' ')[0];
      if (!allowedCommands.includes(commandName)) {
        throw new Error(`Command not allowed: ${commandName}`);
      }

      // Execute using secure process manager
      const result = await SecureProcessManager.executeSecure({
        command: validatedCommand,
        args,
        timeout: 300000, // 5 minutes for migration operations
        maxMemory: 2048, // 2GB for migration processes
        workingDirectory: this.options.workingDirectory,
        environmentVariables: {
          NODE_ENV: 'migration',
          MIGRATION_MODE: 'secure'
        }
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.success
      };
    } catch (error) {
      logger.error('Secure command execution failed', { command, args, error });
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure backup creation
   */
  async createBackup(sourcePath: string, backupPath: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.tar.gz`;
      const fullBackupPath = join(backupPath, backupFileName);

      // Validate paths
      const validatedSource = MCPValidationSchemas.filePath.parse(sourcePath);
      const validatedBackup = MCPValidationSchemas.filePath.parse(fullBackupPath);

      // Create backup directory if needed
      await this.createDirectory(backupPath);

      // Use tar command through secure process manager
      const result = await this.executeCommand('tar', [
        '-czf',
        validatedBackup,
        '-C',
        dirname(validatedSource),
        '.'
      ]);

      if (!result.success) {
        throw new Error(`Backup creation failed: ${result.stderr}`);
      }

      logger.info('Backup created successfully', { 
        sourcePath: validatedSource,
        backupPath: validatedBackup
      });

      return validatedBackup;
    } catch (error) {
      logger.error('Secure backup creation failed', { sourcePath, backupPath, error });
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure file existence check
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const validatedPath = MCPValidationSchemas.filePath.parse(filePath);
      const info = await SecureFileSystem.getFileInfo(validatedPath, {
        allowedPaths: this.options.allowedPaths
      });
      return info.exists;
    } catch (error) {
      logger.debug('File existence check failed', { filePath, error });
      return false;
    }
  }

  /**
   * Secure directory listing
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const validatedPath = MCPValidationSchemas.filePath.parse(dirPath);
      const files = await SecureFileSystem.listDirectory(validatedPath, {
        allowedPaths: this.options.allowedPaths
      });
      
      return files.map(file => file.path);
    } catch (error) {
      logger.error('Secure directory listing failed', { dirPath, error });
      throw new Error(`Directory listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Secure file deletion with safety checks
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (this.options.readOnly) {
        throw new Error('Delete operations disabled in read-only mode');
      }

      const validatedPath = MCPValidationSchemas.filePath.parse(filePath);
      
      // Additional safety checks for file deletion
      if (!this.options.allowedPaths.some(allowed => validatedPath.startsWith(allowed))) {
        throw new Error('File deletion not allowed outside permitted paths');
      }

      // Check if file exists and get info
      const info = await SecureFileSystem.getFileInfo(validatedPath, {
        allowedPaths: this.options.allowedPaths
      });

      if (!info.exists) {
        logger.warn('Attempted to delete non-existent file', { filePath: validatedPath });
        return;
      }

      if (!info.isWritable) {
        throw new Error('File is not writable, cannot delete');
      }

      // Use Node.js fs with validation
      const fs = await import('fs/promises');
      await fs.unlink(validatedPath);
      
      logger.debug('File deleted securely', { filePath: validatedPath });
    } catch (error) {
      logger.error('Secure file deletion failed', { filePath, error });
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a read-only sandbox for secure operations
   */
  createReadOnlyContext(): SecureMigrationOperations {
    return new SecureMigrationOperations({
      ...this.options,
      readOnly: true
    });
  }

  /**
   * Get current configuration
   */
  getOptions(): SecureMigrationOptions {
    return { ...this.options };
  }
}