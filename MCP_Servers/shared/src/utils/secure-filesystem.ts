import { promises as fs, constants } from 'fs';
import * as path from 'path';
import { logger } from './logger.js';
import { Validator } from './validation.js';

/**
 * Secure filesystem access layer with path traversal protection
 * Provides safe file operations with comprehensive security checks
 */

export interface FileAccessOptions {
  allowedPaths?: string[];
  blockedPaths?: string[];
  maxFileSize?: number; // bytes
  allowedExtensions?: string[];
  blockedExtensions?: string[];
  readOnly?: boolean;
}

export interface SecureFileInfo {
  path: string;
  size: number;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  isReadable: boolean;
  isWritable: boolean;
  mimeType?: string;
}

export class SecureFileSystem {
  private static readonly DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.scr',
    '.dll', '.so', '.dylib', '.deb', '.rpm', '.msi'
  ]);
  
  private static readonly SAFE_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.csv',
    '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h',
    '.html', '.css', '.sql', '.log', '.config', '.conf'
  ]);

  private static readonly BLOCKED_DIRECTORIES = new Set([
    '/etc', '/proc', '/sys', '/dev', '/boot', '/root',
    '/var/run', '/var/log', '/tmp', '/var/tmp',
    'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'
  ]);

  /**
   * Safely resolve and validate a file path
   */
  public static resolvePath(inputPath: string, basePath?: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Invalid input path');
    }

    // Basic validation first
    if (!Validator.validateFilePath(inputPath)) {
      throw new Error('Path validation failed');
    }

    try {
      // Resolve path to handle relative references
      const resolvedPath = basePath ? 
        path.resolve(basePath, inputPath) : 
        path.resolve(inputPath);

      // Normalize path to handle different separators
      const normalizedPath = path.normalize(resolvedPath);

      // Additional security checks
      this.validateResolvedPath(normalizedPath, basePath);

      return normalizedPath;
    } catch (error) {
      logger.error('Path resolution failed', {
        inputPath,
        basePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Path resolution failed');
    }
  }

  /**
   * Check if a path is safe to access
   */
  public static isPathSafe(filePath: string, options: FileAccessOptions = {}): boolean {
    try {
      const resolvedPath = this.resolvePath(filePath);
      
      // Check against allowed paths
      if (options.allowedPaths && options.allowedPaths.length > 0) {
        const isAllowed = options.allowedPaths.some(allowedPath => {
          const resolvedAllowed = path.resolve(allowedPath);
          return resolvedPath.startsWith(resolvedAllowed);
        });
        
        if (!isAllowed) {
          logger.warn('Path not in allowed list', { filePath: resolvedPath });
          return false;
        }
      }

      // Check against blocked paths
      if (options.blockedPaths) {
        const isBlocked = options.blockedPaths.some(blockedPath => {
          const resolvedBlocked = path.resolve(blockedPath);
          return resolvedPath.startsWith(resolvedBlocked);
        });
        
        if (isBlocked) {
          logger.warn('Path is blocked', { filePath: resolvedPath });
          return false;
        }
      }

      // Check file extension
      const extension = path.extname(resolvedPath).toLowerCase();
      
      if (options.blockedExtensions && options.blockedExtensions.includes(extension)) {
        logger.warn('File extension is blocked', { filePath: resolvedPath, extension });
        return false;
      }

      if (this.BLOCKED_EXTENSIONS.has(extension)) {
        logger.warn('File extension is globally blocked', { filePath: resolvedPath, extension });
        return false;
      }

      if (options.allowedExtensions && options.allowedExtensions.length > 0) {
        if (!options.allowedExtensions.includes(extension)) {
          logger.warn('File extension not in allowed list', { filePath: resolvedPath, extension });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Path safety check failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Safely read a file with security checks
   */
  public static async readFile(
    filePath: string, 
    options: FileAccessOptions = {}
  ): Promise<string> {
    try {
      const safePath = this.resolvePath(filePath);
      
      if (!this.isPathSafe(safePath, options)) {
        throw new Error('File access denied for security reasons');
      }

      // Check file size before reading
      const stats = await fs.stat(safePath);
      const maxSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
      
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      // Check file permissions
      try {
        await fs.access(safePath, constants.R_OK);
      } catch {
        throw new Error('File is not readable');
      }

      // Read file content
      const content = await fs.readFile(safePath, 'utf8');
      
      logger.debug('File read successfully', {
        filePath: safePath,
        size: stats.size
      });

      return content;
    } catch (error) {
      logger.error('File read failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Safely write a file with security checks
   */
  public static async writeFile(
    filePath: string,
    content: string,
    options: FileAccessOptions = {}
  ): Promise<void> {
    try {
      if (options.readOnly) {
        throw new Error('Write operation not allowed in read-only mode');
      }

      const safePath = this.resolvePath(filePath);
      
      if (!this.isPathSafe(safePath, options)) {
        throw new Error('File access denied for security reasons');
      }

      // Validate content size
      const contentSize = Buffer.byteLength(content, 'utf8');
      const maxSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
      
      if (contentSize > maxSize) {
        throw new Error(`Content too large: ${contentSize} bytes (max: ${maxSize})`);
      }

      // Check if directory exists, create if needed (safely)
      const directory = path.dirname(safePath);
      await this.ensureDirectoryExists(directory, options);

      // Check write permissions for directory
      try {
        await fs.access(directory, constants.W_OK);
      } catch {
        throw new Error('Directory is not writable');
      }

      // Write file atomically
      const tempPath = `${safePath}.tmp.${Date.now()}`;
      try {
        await fs.writeFile(tempPath, content, 'utf8');
        await fs.rename(tempPath, safePath);
      } catch (error) {
        // Clean up temp file on failure
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }

      logger.debug('File written successfully', {
        filePath: safePath,
        size: contentSize
      });

    } catch (error) {
      logger.error('File write failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get secure file information
   */
  public static async getFileInfo(
    filePath: string,
    options: FileAccessOptions = {}
  ): Promise<SecureFileInfo> {
    try {
      const safePath = this.resolvePath(filePath);
      
      if (!this.isPathSafe(safePath, options)) {
        throw new Error('File access denied for security reasons');
      }

      let stats;
      let exists = true;
      
      try {
        stats = await fs.stat(safePath);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          exists = false;
          return {
            path: safePath,
            size: 0,
            exists: false,
            isDirectory: false,
            isFile: false,
            isReadable: false,
            isWritable: false
          };
        }
        throw error;
      }

      // Check permissions
      let isReadable = false;
      let isWritable = false;

      try {
        await fs.access(safePath, constants.R_OK);
        isReadable = true;
      } catch {
        // Not readable
      }

      try {
        await fs.access(safePath, constants.W_OK);
        isWritable = true;
      } catch {
        // Not writable
      }

      return {
        path: safePath,
        size: stats.size,
        exists,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isReadable,
        isWritable: isWritable && !options.readOnly,
        mimeType: this.getMimeType(safePath)
      };

    } catch (error) {
      logger.error('Get file info failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List directory contents safely
   */
  public static async listDirectory(
    dirPath: string,
    options: FileAccessOptions = {}
  ): Promise<SecureFileInfo[]> {
    try {
      const safePath = this.resolvePath(dirPath);
      
      if (!this.isPathSafe(safePath, options)) {
        throw new Error('Directory access denied for security reasons');
      }

      const dirInfo = await this.getFileInfo(safePath, options);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        throw new Error('Path is not a directory or does not exist');
      }

      const entries = await fs.readdir(safePath);
      const fileInfos: SecureFileInfo[] = [];

      for (const entry of entries) {
        try {
          const entryPath = path.join(safePath, entry);
          if (this.isPathSafe(entryPath, options)) {
            const info = await this.getFileInfo(entryPath, options);
            fileInfos.push(info);
          }
        } catch (error) {
          // Skip entries that can't be accessed
          logger.debug('Skipping directory entry', { entry, error });
        }
      }

      return fileInfos.sort((a, b) => a.path.localeCompare(b.path));

    } catch (error) {
      logger.error('Directory listing failed', {
        dirPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate resolved path for additional security
   */
  private static validateResolvedPath(resolvedPath: string, basePath?: string): void {
    // Check for path traversal even after resolution
    if (resolvedPath.includes('..')) {
      throw new Error('Path traversal detected after resolution');
    }

    // Check against blocked directories
    for (const blockedDir of this.BLOCKED_DIRECTORIES) {
      if (resolvedPath.startsWith(blockedDir)) {
        throw new Error(`Access to system directory denied: ${blockedDir}`);
      }
    }

    // If base path provided, ensure resolved path is within it
    if (basePath) {
      const resolvedBase = path.resolve(basePath);
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error('Resolved path is outside base directory');
      }
    }

    // Additional platform-specific checks
    if (process.platform === 'win32') {
      // Windows-specific dangerous paths
      if (/^[A-Z]:\\Windows\\/i.test(resolvedPath) || 
          /^[A-Z]:\\Program Files/i.test(resolvedPath)) {
        throw new Error('Access to Windows system directory denied');
      }
    }
  }

  /**
   * Safely ensure directory exists
   */
  private static async ensureDirectoryExists(
    dirPath: string, 
    options: FileAccessOptions
  ): Promise<void> {
    if (!this.isPathSafe(dirPath, options)) {
      throw new Error('Directory creation denied for security reasons');
    }

    try {
      await fs.access(dirPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
      logger.debug('Directory created', { dirPath });
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private static getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'application/xml',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.h': 'text/x-chdr'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Create a sandboxed file access context
   */
  public static createSandbox(basePath: string, options: FileAccessOptions = {}): FileAccessSandbox {
    const resolvedBase = this.resolvePath(basePath);
    
    return new FileAccessSandbox(resolvedBase, {
      ...options,
      allowedPaths: [resolvedBase, ...(options.allowedPaths || [])]
    });
  }
}

/**
 * Sandboxed file access context
 */
export class FileAccessSandbox {
  constructor(
    private basePath: string,
    private options: FileAccessOptions
  ) {}

  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, relativePath);
    return SecureFileSystem.readFile(fullPath, this.options);
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.basePath, relativePath);
    return SecureFileSystem.writeFile(fullPath, content, this.options);
  }

  async getFileInfo(relativePath: string): Promise<SecureFileInfo> {
    const fullPath = path.join(this.basePath, relativePath);
    return SecureFileSystem.getFileInfo(fullPath, this.options);
  }

  async listDirectory(relativePath: string = ''): Promise<SecureFileInfo[]> {
    const fullPath = path.join(this.basePath, relativePath);
    return SecureFileSystem.listDirectory(fullPath, this.options);
  }

  getBasePath(): string {
    return this.basePath;
  }
}