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

export interface PatientCandidate {
  id: string
  name: string
  furigana?: string | null
  phone?: string | null
  birth_date?: string | null
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

// Enhanced match: phone/birthdate → name matching
export function findBestMatch(
  query: string,
  patients: PatientCandidate[],
  options?: { phone?: string | null; birth_date?: string | null }
): PatientCandidate | null {
  if (!query || patients.length === 0) return null

  // Level 0: Phone number exact match (most reliable identifier)
  if (options?.phone) {
    const normalizedPhone = options.phone.replace(/[-\s\u3000()（）]/g, '')
    if (normalizedPhone.length >= 10) {
      for (const p of patients) {
        if (p.phone) {
          const pPhone = p.phone.replace(/[-\s\u3000()（）]/g, '')
          if (pPhone === normalizedPhone) return p
        }
      }
    }
  }

  // Level 0.5: Phone + partial name match (phone last 4 digits + surname match)
  if (options?.phone) {
    const normalizedPhone = options.phone.replace(/[-\s\u3000()（）]/g, '')
    const last4 = normalizedPhone.slice(-4)
    if (last4.length === 4) {
      const normalizedQuery = normalizeName(query)
      for (const p of patients) {
        if (p.phone) {
          const pLast4 = p.phone.replace(/[-\s\u3000()（）]/g, '').slice(-4)
          if (pLast4 === last4) {
            const nn = normalizeName(p.name)
            // Surname (first 2+ chars) match with phone confirmation
            if (normalizedQuery.length >= 2 && nn.length >= 2) {
              if (nn.substring(0, 2) === normalizedQuery.substring(0, 2)) return p
            }
          }
        }
      }
    }
  }

  // Level 0.7: Birth date + name match
  if (options?.birth_date) {
    const normalizedQuery = normalizeName(query)
    for (const p of patients) {
      if (p.birth_date === options.birth_date) {
        const nn = normalizeName(p.name)
        if (nn === normalizedQuery || nn.includes(normalizedQuery) || normalizedQuery.includes(nn)) {
          return p
        }
      }
    }
  }

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

  // Level 7: Surname match (Japanese full surname must match)
  // Only match when query is a complete surname (2-4 chars, no first name)
  if (normalizedQuery.length >= 2 && normalizedQuery.length <= 4) {
    const candidates: PatientCandidate[] = []
    for (const p of patients) {
      // Extract surname: split by common delimiters or take first 2-4 chars if no delimiter
      const parts = p.name.replace(/[\s\u3000]+/g, ' ').split(' ')
      const surname = parts.length > 1 ? normalizeName(parts[0]) : ''
      if (surname && surname === normalizedQuery) {
        candidates.push(p)
      }
    }
    // Only return if exactly one match (avoid ambiguity)
    if (candidates.length === 1) return candidates[0]
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
