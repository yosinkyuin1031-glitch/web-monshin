/**
 * 患者名のファジーマッチングユーティリティ
 * 正規化 → 8段階の優先度でマッチング
 */

// Normalize: remove all whitespace, fullwidth→halfwidth, katakana→hiragana, lowercase
export function normalizeName(name: string): string {
  return name
    .replace(/[\s\u3000\u00A0]+/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase()
}

interface PatientCandidate {
  id: string
  name: string
  furigana?: string | null
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

// Match priority: exact → normalized → furigana → partial → contains → furigana partial → surname → levenshtein
export function findBestMatch(query: string, patients: PatientCandidate[]): PatientCandidate | null {
  if (!query || patients.length === 0) return null

  const normalizedQuery = normalizeName(query)

  // Level 1: Exact match
  for (const p of patients) {
    if (p.name === query) return p
  }

  // Level 2: Normalized exact match
  for (const p of patients) {
    if (normalizeName(p.name) === normalizedQuery) return p
  }

  // Level 3: Furigana exact match (normalized)
  for (const p of patients) {
    if (p.furigana && normalizeName(p.furigana) === normalizedQuery) return p
  }

  // Level 4: Partial match (query starts with or ends with patient name, or vice versa)
  for (const p of patients) {
    const nn = normalizeName(p.name)
    if (nn.startsWith(normalizedQuery) || normalizedQuery.startsWith(nn)) return p
  }

  // Level 5: Contains match
  for (const p of patients) {
    const nn = normalizeName(p.name)
    if (nn.includes(normalizedQuery) || normalizedQuery.includes(nn)) return p
  }

  // Level 6: Furigana partial/contains match
  for (const p of patients) {
    if (!p.furigana) continue
    const nf = normalizeName(p.furigana)
    if (nf.includes(normalizedQuery) || normalizedQuery.includes(nf)) return p
  }

  // Level 7: Surname match (first character(s) of name)
  // Extract surname: for Japanese names, try first 1-3 chars
  for (const p of patients) {
    const nn = normalizeName(p.name)
    // If query matches the surname portion (at least 2 chars)
    if (normalizedQuery.length >= 2 && nn.length >= 2) {
      // Check if first 2+ chars match
      const minLen = Math.min(normalizedQuery.length, nn.length)
      for (let len = minLen; len >= 2; len--) {
        if (normalizedQuery.substring(0, len) === nn.substring(0, len)) return p
      }
    }
  }

  // Level 8: Levenshtein distance (threshold: 30% of query length, min 1, max 3)
  const threshold = Math.max(1, Math.min(3, Math.ceil(normalizedQuery.length * 0.3)))
  let bestMatch: PatientCandidate | null = null
  let bestDist = Infinity

  for (const p of patients) {
    const nn = normalizeName(p.name)
    const dist = levenshtein(normalizedQuery, nn)
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist
      bestMatch = p
    }

    // Also check furigana
    if (p.furigana) {
      const nf = normalizeName(p.furigana)
      const fDist = levenshtein(normalizedQuery, nf)
      if (fDist <= threshold && fDist < bestDist) {
        bestDist = fDist
        bestMatch = p
      }
    }
  }

  return bestMatch
}
