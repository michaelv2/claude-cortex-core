/**
 * Text Similarity Utilities
 *
 * Provides Jaccard similarity and related text comparison functions
 * for memory enrichment and relationship detection.
 */

/**
 * Tokenize text into a set of normalized words
 * Removes punctuation, lowercases, and filters short words
 */
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter very short words
  );
}

/**
 * Calculate Jaccard similarity between two pre-tokenized sets
 * Avoids redundant tokenization in hot loops (e.g., O(n²) merge clustering).
 */
export function jaccardFromSets(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Calculate Jaccard similarity between two texts
 * Returns a value between 0 (completely different) and 1 (identical)
 *
 * Jaccard Index = |A ∩ B| / |A ∪ B|
 *
 * @param textA - First text to compare
 * @param textB - Second text to compare
 * @returns Similarity score between 0 and 1
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  return jaccardFromSets(tokenize(textA), tokenize(textB));
}

/**
 * Extract key phrases/concepts from text
 * Used for topic comparison in relationship detection
 *
 * Extracts:
 * - Quoted phrases ("like this")
 * - Backticked code/terms (`like_this`)
 * - Capitalized terms (LikeThis)
 *
 * @param text - Text to extract key phrases from
 * @returns Array of unique key phrases (lowercased)
 */
// Pre-compiled regex for tech term extraction (avoids re-creation per call)
const TECH_TERMS_RE = /\b(?:api|sql|css|html|json|xml|http|rest|graphql|docker|kubernetes|redis|postgres|sqlite|mongodb|react|vue|angular|node|npm|yarn|git|github|aws|gcp|azure)\b/gi;

export function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];

  // Extract quoted phrases
  const quotedMatches = text.match(/"[^"]+"/g);
  if (quotedMatches) {
    phrases.push(...quotedMatches.map(m => m.replace(/"/g, '').toLowerCase()));
  }

  // Extract backticked code/terms
  const backtickMatches = text.match(/`[^`]+`/g);
  if (backtickMatches) {
    phrases.push(...backtickMatches.map(m => m.replace(/`/g, '').toLowerCase()));
  }

  // Extract capitalized terms (likely proper nouns/tech terms)
  const capitalMatches = text.match(/\b[A-Z][a-zA-Z0-9]+\b/g);
  if (capitalMatches) {
    phrases.push(...capitalMatches.map(m => m.toLowerCase()));
  }

  // Extract common tech terms that might not be capitalized
  TECH_TERMS_RE.lastIndex = 0;
  const techTerms = text.match(TECH_TERMS_RE);
  if (techTerms) {
    phrases.push(...techTerms.map(m => m.toLowerCase()));
  }

  return [...new Set(phrases)];
}

/**
 * Calculate word overlap between two texts
 * Returns the count of shared words
 *
 * @param textA - First text
 * @param textB - Second text
 * @returns Number of shared words
 */
export function wordOverlap(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap++;
  }

  return overlap;
}

/**
 * Check if two texts share significant content
 * Quick check before running full similarity calculation
 *
 * @param textA - First text
 * @param textB - Second text
 * @param minOverlap - Minimum word overlap required
 * @returns True if texts share at least minOverlap words
 */
export function hasSignificantOverlap(
  textA: string,
  textB: string,
  minOverlap: number = 3
): boolean {
  return wordOverlap(textA, textB) >= minOverlap;
}
