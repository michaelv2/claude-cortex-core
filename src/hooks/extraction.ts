/**
 * PreCompact Hook - Auto-extraction Logic
 * Analyzes conversation history to extract high-salience memories
 */

import {
  ConversationMessage,
  ExtractionPattern,
  PatternMatch,
  ConversationSegment,
  ExtractedMemory,
  PreCompactConfig,
} from './types.js';
import {
  calculateSalience,
  suggestCategory,
  extractTags,
  analyzeSalienceFactors,
} from '../memory/salience.js';
import { jaccardSimilarity } from '../memory/similarity.js';
import { MemoryInput } from '../memory/types.js';
import { generateTitle, normalizeText } from './utils.js';

/**
 * Extraction patterns for different types of important content
 */
const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // Architecture decisions
  {
    name: 'architecture_decision',
    pattern: /(?:we(?:'ll| will)?\s+use|decided?\s+(?:to|on)|architecture|approach|design|structure|built?\s+(?:with|using)|implemented?\s+(?:with|using))[^.!?]*[.!?]/gi,
    category: 'architecture',
    salienceBoost: 0.4,
    minLength: 30,
  },
  // Error resolutions
  {
    name: 'error_resolution',
    pattern: /(?:fixed?\s+(?:by|with|the)|bug\s+was|solution|workaround|resolved?\s+by|turned?\s+out)[^.!?]*[.!?]/gi,
    category: 'error',
    salienceBoost: 0.35,
    minLength: 25,
  },
  // Learning/discoveries
  {
    name: 'learning',
    pattern: /(?:learned?\s+that|discovered?|realized?|found\s+out|turns?\s+out|interesting|key\s+insight)[^.!?]*[.!?]/gi,
    category: 'learning',
    salienceBoost: 0.3,
    minLength: 25,
  },
  // Code patterns
  {
    name: 'pattern',
    pattern: /(?:pattern|practice|approach|method|technique|always|never|should\s+(?:always|never)|best\s+to)[^.!?]*[.!?]/gi,
    category: 'pattern',
    salienceBoost: 0.25,
    minLength: 30,
  },
  // User preferences
  {
    name: 'preference',
    pattern: /(?:prefer|like\s+to|want\s+to|convention|style|standard|rule)[^.!?]*[.!?]/gi,
    category: 'preference',
    salienceBoost: 0.25,
    minLength: 20,
  },
  // Explicit remember requests
  {
    name: 'explicit_request',
    pattern: /(?:remember\s+(?:this|that)|don'?t\s+forget|keep\s+in\s+mind|note\s+(?:this|that)|important[:\s])[^.!?]*[.!?]/gi,
    category: 'note',
    salienceBoost: 0.5,
    minLength: 15,
  },
];

/**
 * Extract pattern matches from text
 */
function extractPatternMatches(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const pattern of EXTRACTION_PATTERNS) {
    const regex = new RegExp(pattern.pattern);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const content = match[0].trim();

      // Skip if too short
      if (pattern.minLength && content.length < pattern.minLength) {
        continue;
      }

      matches.push({
        pattern,
        content,
        startIndex: match.index,
        endIndex: match.index + content.length,
      });
    }
  }

  return matches;
}

/**
 * Get surrounding context for a match
 */
function getContext(text: string, match: PatternMatch, contextWords: number = 50): string {
  const words = text.split(/\s+/);
  const matchText = match.content;
  const matchStart = text.indexOf(matchText);

  if (matchStart === -1) return match.content;

  // Find word boundaries
  const beforeText = text.substring(0, matchStart);
  const afterText = text.substring(matchStart + matchText.length);

  const beforeWords = beforeText.split(/\s+/).slice(-contextWords);
  const afterWords = afterText.split(/\s+/).slice(0, contextWords);

  return [...beforeWords, matchText, ...afterWords].join(' ').trim();
}

/**
 * Analyze a conversation message for extractable segments
 */
function analyzeMessage(message: ConversationMessage): ConversationSegment[] {
  const segments: ConversationSegment[] = [];
  const text = normalizeText(message.content);
  const matches = extractPatternMatches(text);

  // Group overlapping matches
  const groupedMatches: PatternMatch[][] = [];
  let currentGroup: PatternMatch[] = [];

  for (const match of matches) {
    if (currentGroup.length === 0) {
      currentGroup.push(match);
    } else {
      const lastMatch = currentGroup[currentGroup.length - 1];
      // Check if matches overlap or are close (within 100 chars)
      if (match.startIndex - lastMatch.endIndex < 100) {
        currentGroup.push(match);
      } else {
        groupedMatches.push(currentGroup);
        currentGroup = [match];
      }
    }
  }
  if (currentGroup.length > 0) {
    groupedMatches.push(currentGroup);
  }

  // Create segments from grouped matches
  for (const group of groupedMatches) {
    const firstMatch = group[0];
    const lastMatch = group[group.length - 1];

    // Get context around the entire group
    const segmentContent = getContext(text, firstMatch, 50);

    // Calculate salience for this segment
    const memoryInput: MemoryInput = {
      title: generateTitle(segmentContent, 60),
      content: segmentContent,
      category: firstMatch.pattern.category as any,
      tags: [],
    };

    const salience = calculateSalience(memoryInput);
    const suggestedCategory = suggestCategory(memoryInput);
    const extractedTags = extractTags(memoryInput);

    segments.push({
      content: segmentContent,
      role: message.role === 'system' ? 'assistant' : message.role,
      matches: group,
      salience,
      suggestedCategory,
      extractedTags,
    });
  }

  return segments;
}

/**
 * Deduplicate segments by checking similarity
 */
function deduplicateSegments(segments: ConversationSegment[]): ConversationSegment[] {
  const unique: ConversationSegment[] = [];

  for (const segment of segments) {
    const isDuplicate = unique.some(
      existing => jaccardSimilarity(existing.content, segment.content) > 0.7
    );

    if (!isDuplicate) {
      unique.push(segment);
    }
  }

  return unique;
}

/**
 * Check if segment is similar to existing memories
 */
export async function isSegmentDuplicate(
  segment: ConversationSegment,
  existingMemories: Array<{ title: string; content: string }>
): Promise<boolean> {
  for (const memory of existingMemories) {
    const titleSimilarity = jaccardSimilarity(
      generateTitle(segment.content),
      memory.title
    );
    const contentSimilarity = jaccardSimilarity(segment.content, memory.content);

    // Consider duplicate if either title or content is very similar
    if (titleSimilarity > 0.7 || contentSimilarity > 0.7) {
      return true;
    }
  }

  return false;
}

/**
 * Extract memories from conversation history
 */
export async function extractMemoriesFromConversation(
  messages: ConversationMessage[],
  config: PreCompactConfig,
  existingMemories: Array<{ title: string; content: string }> = []
): Promise<ExtractedMemory[]> {
  // Analyze all messages for extractable segments
  const allSegments: ConversationSegment[] = [];

  for (const message of messages) {
    // Skip system messages and very short messages
    if (message.role === 'system' || message.content.length < 50) {
      continue;
    }

    const segments = analyzeMessage(message);
    allSegments.push(...segments);
  }

  // Deduplicate similar segments
  const uniqueSegments = deduplicateSegments(allSegments);

  // Filter by salience threshold
  const highSalienceSegments = uniqueSegments.filter(
    segment => segment.salience >= config.minSalience
  );

  // Sort by salience (highest first)
  highSalienceSegments.sort((a, b) => b.salience - a.salience);

  // Extract memories from top segments
  const extractedMemories: ExtractedMemory[] = [];

  for (const segment of highSalienceSegments) {
    // Stop if we've reached the limit
    if (extractedMemories.length >= config.maxMemoriesPerCompact) {
      break;
    }

    // Check for duplicates against existing memories
    const isDuplicate = await isSegmentDuplicate(segment, existingMemories);
    if (isDuplicate) {
      continue;
    }

    // Filter by allowed categories
    if (!config.categories.includes(segment.suggestedCategory || 'note')) {
      continue;
    }

    const title = generateTitle(segment.content, 80);
    const tags = [...segment.extractedTags, config.autoTag];

    extractedMemories.push({
      title,
      content: segment.content,
      category: segment.suggestedCategory || 'note',
      tags,
      salience: segment.salience,
      source: 'auto-extracted:preCompact',
    });
  }

  return extractedMemories;
}

/**
 * Analyze conversation for extraction statistics (dry-run mode)
 */
export function analyzeConversationStats(messages: ConversationMessage[]): {
  totalMessages: number;
  analyzableMessages: number;
  segmentsFound: number;
  highSalienceCount: number;
  categoryCounts: Record<string, number>;
} {
  const allSegments: ConversationSegment[] = [];

  for (const message of messages) {
    if (message.role === 'system' || message.content.length < 50) {
      continue;
    }
    const segments = analyzeMessage(message);
    allSegments.push(...segments);
  }

  const uniqueSegments = deduplicateSegments(allSegments);
  const highSalience = uniqueSegments.filter(s => s.salience >= 0.3);

  const categoryCounts: Record<string, number> = {};
  for (const segment of highSalience) {
    const cat = segment.suggestedCategory || 'note';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return {
    totalMessages: messages.length,
    analyzableMessages: messages.filter(m => m.role !== 'system' && m.content.length >= 50).length,
    segmentsFound: allSegments.length,
    highSalienceCount: highSalience.length,
    categoryCounts,
  };
}
