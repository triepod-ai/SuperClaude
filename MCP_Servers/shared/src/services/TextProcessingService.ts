import { logger } from '../utils/logger.js';

/**
 * Text analysis result
 */
export interface TextAnalysis {
  wordCount: number;
  technicalTerms: string[];
  actionVerbs: string[];
  keyPhrases: string[];
  sentences: string[];
  scope: 'narrow' | 'medium' | 'broad';
  sentiment?: 'positive' | 'neutral' | 'negative';
  complexity: number;
  readabilityScore: number;
}

/**
 * Keyword extraction options
 */
export interface KeywordExtractionOptions {
  minLength?: number;
  maxKeywords?: number;
  includeNgrams?: boolean;
  filterStopWords?: boolean;
  customDictionary?: string[];
  language?: string;
}

/**
 * Pattern matching configuration
 */
export interface PatternMatchConfig {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  multiline?: boolean;
  maxMatches?: number;
}

/**
 * Text parsing result
 */
export interface ParseResult {
  tokens: string[];
  sentences: string[];
  paragraphs: string[];
  structure: {
    headers: string[];
    lists: string[];
    codeBlocks: string[];
    links: string[];
  };
  metadata: Record<string, any>;
}

/**
 * Unified text processing service
 * Consolidates text analysis, keyword extraction, and parsing utilities
 */
export class TextProcessingService {
  // Technical keywords for different domains
  private static readonly TECHNICAL_KEYWORDS = {
    programming: [
      'implement', 'algorithm', 'architecture', 'optimization', 'integration',
      'database', 'api', 'security', 'performance', 'scalability', 'framework',
      'authentication', 'authorization', 'encryption', 'deployment', 'testing',
      'debugging', 'refactoring', 'migration', 'infrastructure', 'monitoring',
      'class', 'function', 'method', 'variable', 'interface', 'module',
      'package', 'library', 'dependency', 'compilation', 'runtime'
    ],
    devops: [
      'kubernetes', 'docker', 'container', 'orchestration', 'pipeline',
      'ci/cd', 'terraform', 'ansible', 'jenkins', 'gitlab', 'github',
      'cloud', 'aws', 'azure', 'gcp', 'microservices', 'serverless'
    ],
    security: [
      'vulnerability', 'exploit', 'malware', 'encryption', 'decryption',
      'authentication', 'authorization', 'oauth', 'jwt', 'ssl', 'tls',
      'firewall', 'intrusion', 'penetration', 'security', 'privacy'
    ],
    general: [
      'analyze', 'design', 'develop', 'test', 'deploy', 'maintain',
      'improve', 'optimize', 'scale', 'monitor', 'troubleshoot'
    ]
  };

  // Action verbs indicating work complexity
  private static readonly ACTION_VERBS = [
    'create', 'build', 'implement', 'develop', 'design', 'configure',
    'optimize', 'integrate', 'test', 'deploy', 'analyze', 'refactor',
    'migrate', 'setup', 'install', 'document', 'review', 'validate',
    'research', 'investigate', 'troubleshoot', 'fix', 'update', 'enhance',
    'modify', 'extend', 'upgrade', 'maintain', 'monitor', 'backup'
  ];

  // Common stop words for filtering
  private static readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'you', 'your', 'this', 'these',
    'those', 'they', 'them', 'their', 'we', 'us', 'our', 'i', 'me', 'my'
  ]);

  private readonly cache: Map<string, TextAnalysis> = new Map();

  /**
   * Analyze text comprehensively
   */
  async analyzeText(text: string, options: {
    includeSentiment?: boolean;
    customTerms?: string[];
    language?: string;
  } = {}): Promise<TextAnalysis> {
    const cacheKey = this.getCacheKey(text, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached text analysis');
      return cached;
    }

    const words = this.tokenize(text);
    const sentences = this.extractSentences(text);
    const keyPhrases = this.extractKeyPhrases(text, { maxKeywords: 10 });
    
    // Find technical terms
    const allTechnicalTerms = [
      ...TextProcessingService.TECHNICAL_KEYWORDS.programming,
      ...TextProcessingService.TECHNICAL_KEYWORDS.devops,
      ...TextProcessingService.TECHNICAL_KEYWORDS.security,
      ...TextProcessingService.TECHNICAL_KEYWORDS.general,
      ...(options.customTerms || [])
    ];
    
    const technicalTerms = words.filter(word => 
      allTechnicalTerms.includes(word.toLowerCase())
    );

    // Find action verbs
    const actionVerbs = words.filter(word => 
      TextProcessingService.ACTION_VERBS.includes(word.toLowerCase())
    );

    // Assess scope
    let scope: 'narrow' | 'medium' | 'broad' = 'narrow';
    if (words.length > 50 || technicalTerms.length > 3) scope = 'medium';
    if (words.length > 100 || technicalTerms.length > 5) scope = 'broad';

    // Calculate complexity
    const complexity = this.calculateTextComplexity(text, technicalTerms, actionVerbs);
    
    // Calculate readability
    const readabilityScore = this.calculateReadabilityScore(text, words, sentences);
    
    // Sentiment analysis (basic)
    let sentiment: 'positive' | 'neutral' | 'negative' | undefined;
    if (options.includeSentiment) {
      sentiment = this.analyzeSentiment(text);
    }

    const analysis: TextAnalysis = {
      wordCount: words.length,
      technicalTerms: [...new Set(technicalTerms)], // Remove duplicates
      actionVerbs: [...new Set(actionVerbs)], // Remove duplicates
      keyPhrases,
      sentences,
      scope,
      sentiment,
      complexity,
      readabilityScore
    };

    this.cache.set(cacheKey, analysis);
    
    logger.info('Text analysis completed', {
      wordCount: analysis.wordCount,
      technicalTerms: analysis.technicalTerms.length,
      actionVerbs: analysis.actionVerbs.length,
      scope: analysis.scope
    });

    return analysis;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, options: KeywordExtractionOptions = {}): string[] {
    const {
      minLength = 3,
      maxKeywords = 20,
      includeNgrams = true,
      filterStopWords = true,
      customDictionary = [],
      language = 'en'
    } = options;

    const words = this.tokenize(text);
    let keywords: string[] = [];

    // Single word keywords
    const singleWords = words
      .filter(word => word.length >= minLength)
      .filter(word => !filterStopWords || !TextProcessingService.STOP_WORDS.has(word.toLowerCase()))
      .map(word => word.toLowerCase());

    keywords.push(...singleWords);

    // N-gram keywords (2-3 words)
    if (includeNgrams) {
      const bigrams = this.extractNgrams(words, 2)
        .filter(phrase => phrase.length >= minLength * 2);
      const trigrams = this.extractNgrams(words, 3)
        .filter(phrase => phrase.length >= minLength * 3);
      
      keywords.push(...bigrams, ...trigrams);
    }

    // Add custom dictionary terms if found
    customDictionary.forEach(term => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        keywords.push(term.toLowerCase());
      }
    });

    // Count frequency and sort
    const frequency = new Map<string, number>();
    keywords.forEach(keyword => {
      frequency.set(keyword, (frequency.get(keyword) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([keyword]) => keyword);
  }

  /**
   * Extract key phrases from text
   */
  extractKeyPhrases(text: string, options: KeywordExtractionOptions = {}): string[] {
    const { maxKeywords = 10, minLength = 5 } = options;
    const phrases: string[] = [];
    const words = text.split(/\s+/);
    
    // Extract 2-4 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      for (let len = 2; len <= Math.min(4, words.length - i); len++) {
        const phrase = words.slice(i, i + len).join(' ').toLowerCase();
        if (phrase.length >= minLength && !phrases.includes(phrase)) {
          phrases.push(phrase);
        }
      }
    }
    
    return phrases.slice(0, maxKeywords);
  }

  /**
   * Find pattern matches in text
   */
  findPatterns(text: string, patterns: (string | RegExp)[], config: PatternMatchConfig = {}): Array<{
    pattern: string | RegExp;
    matches: Array<{
      text: string;
      index: number;
      line?: number;
      column?: number;
    }>;
  }> {
    const {
      caseSensitive = false,
      wholeWords = false,
      multiline = false,
      maxMatches = 100
    } = config;

    const results: Array<{
      pattern: string | RegExp;
      matches: Array<{
        text: string;
        index: number;
        line?: number;
        column?: number;
      }>;
    }> = [];

    patterns.forEach(pattern => {
      const matches: Array<{
        text: string;
        index: number;
        line?: number;
        column?: number;
      }> = [];

      let regex: RegExp;
      if (pattern instanceof RegExp) {
        regex = pattern;
      } else {
        let flags = 'g';
        if (!caseSensitive) flags += 'i';
        if (multiline) flags += 'm';
        
        let regexPattern = pattern;
        if (wholeWords) {
          regexPattern = `\\b${regexPattern}\\b`;
        }
        
        regex = new RegExp(regexPattern, flags);
      }

      let match;
      let count = 0;
      
      while ((match = regex.exec(text)) !== null && count < maxMatches) {
        const position = this.getPositionFromIndex(text, match.index);
        
        matches.push({
          text: match[0],
          index: match.index,
          line: position.line,
          column: position.column
        });
        
        count++;
        
        // Prevent infinite loop with global regex
        if (!regex.global) break;
      }

      results.push({ pattern, matches });
    });

    return results;
  }

  /**
   * Parse structured text
   */
  parseStructuredText(text: string): ParseResult {
    const tokens = this.tokenize(text);
    const sentences = this.extractSentences(text);
    const paragraphs = this.extractParagraphs(text);
    
    // Extract structure elements
    const headers = this.extractHeaders(text);
    const lists = this.extractLists(text);
    const codeBlocks = this.extractCodeBlocks(text);
    const links = this.extractLinks(text);

    return {
      tokens,
      sentences,
      paragraphs,
      structure: {
        headers,
        lists,
        codeBlocks,
        links
      },
      metadata: {
        totalTokens: tokens.length,
        totalSentences: sentences.length,
        totalParagraphs: paragraphs.length,
        hasStructure: headers.length > 0 || lists.length > 0 || codeBlocks.length > 0
      }
    };
  }

  /**
   * Calculate text similarity between two texts
   */
  calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.tokenize(text1.toLowerCase()));
    const tokens2 = new Set(this.tokenize(text2.toLowerCase()));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate text summary
   */
  generateSummary(text: string, maxSentences: number = 3): string {
    const sentences = this.extractSentences(text);
    
    if (sentences.length <= maxSentences) {
      return text;
    }

    // Simple extractive summarization based on sentence scoring
    const sentenceScores = sentences.map(sentence => {
      const analysis = this.analyzeText(sentence, { includeSentiment: false });
      // Score based on technical terms, action verbs, and length
      return {
        sentence,
        score: analysis.technicalTerms.length * 2 + 
               analysis.actionVerbs.length * 1.5 + 
               Math.min(analysis.wordCount / 20, 2) // Prefer medium-length sentences
      };
    });

    // Select top-scoring sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)) // Restore original order
      .map(item => item.sentence);

    return topSentences.join(' ');
  }

  // ==================== PRIVATE IMPLEMENTATION ====================

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  private extractParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0);
  }

  private extractNgrams(words: string[], n: number): string[] {
    const ngrams: string[] = [];
    
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ').toLowerCase();
      ngrams.push(ngram);
    }
    
    return ngrams;
  }

  private calculateTextComplexity(text: string, technicalTerms: string[], actionVerbs: string[]): number {
    const words = this.tokenize(text);
    const sentences = this.extractSentences(text);
    
    // Complexity factors
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const technicalDensity = technicalTerms.length / Math.max(words.length, 1);
    const actionDensity = actionVerbs.length / Math.max(words.length, 1);
    
    // Normalize to 0-1 scale
    let complexity = 0;
    complexity += Math.min(avgWordsPerSentence / 20, 1) * 0.3; // Sentence length
    complexity += Math.min(technicalDensity * 10, 1) * 0.4;   // Technical density
    complexity += Math.min(actionDensity * 10, 1) * 0.3;     // Action density
    
    return Math.min(complexity, 1);
  }

  private calculateReadabilityScore(text: string, words: string[], sentences: string[]): number {
    // Simplified Flesch Reading Ease formula
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / Math.max(words.length, 1);
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllables);
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    // Simple syllable counting heuristic
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis using word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'wonderful', 'fantastic', 'improve', 'enhance', 'optimize'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'broken', 'fail', 'error', 'problem', 'issue', 'bug'];
    
    const words = this.tokenize(text);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractHeaders(text: string): string[] {
    const headers: string[] = [];
    
    // Markdown headers
    const markdownHeaders = text.match(/^#{1,6}\s+.+$/gm);
    if (markdownHeaders) {
      headers.push(...markdownHeaders);
    }
    
    // Lines that look like headers (all caps, short)
    const lines = text.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 60 && trimmed === trimmed.toUpperCase()) {
        headers.push(trimmed);
      }
    });
    
    return headers;
  }

  private extractLists(text: string): string[] {
    const lists: string[] = [];
    
    // Bullet points
    const bulletPoints = text.match(/^\s*[•\-\*]\s+.+$/gm);
    if (bulletPoints) {
      lists.push(...bulletPoints);
    }
    
    // Numbered lists
    const numberedLists = text.match(/^\s*\d+\.\s+.+$/gm);
    if (numberedLists) {
      lists.push(...numberedLists);
    }
    
    return lists;
  }

  private extractCodeBlocks(text: string): string[] {
    const codeBlocks: string[] = [];
    
    // Markdown code blocks
    const markdownBlocks = text.match(/```[\s\S]*?```/g);
    if (markdownBlocks) {
      codeBlocks.push(...markdownBlocks);
    }
    
    // Inline code
    const inlineCode = text.match(/`[^`]+`/g);
    if (inlineCode) {
      codeBlocks.push(...inlineCode);
    }
    
    return codeBlocks;
  }

  private extractLinks(text: string): string[] {
    const links: string[] = [];
    
    // Markdown links
    const markdownLinks = text.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (markdownLinks) {
      links.push(...markdownLinks);
    }
    
    // URL patterns
    const urls = text.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      links.push(...urls);
    }
    
    return links;
  }

  private getPositionFromIndex(text: string, index: number): { line: number; column: number } {
    const lines = text.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  private getCacheKey(text: string, options: any): string {
    const textHash = this.simpleHash(text);
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `${textHash}-${optionsHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('TextProcessingService cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cacheSize: number } {
    return { cacheSize: this.cache.size };
  }
}