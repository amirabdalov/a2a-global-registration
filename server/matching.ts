/**
 * Expert-Client Matching Engine
 *
 * Algorithm:
 * 1. Filter experts by domain match (engagement domain must be in expert's domains array)
 * 2. Filter by availability (only 'available' experts)
 * 3. Score each expert:
 *    - Tier weight: guru=3, pro=2, standard=1
 *    - avg_rating (0–5)
 *    - domain relevance bonus: +2 if domain is expert's first/primary domain
 * 4. Return top 5 matches sorted by score descending
 */

export interface ExpertProfile {
  id: number;
  user_id: number;
  domains: string; // JSON array string
  tier: string;    // 'standard' | 'pro' | 'guru'
  bio: string | null;
  hourly_rate: number;
  test_scores: string; // JSON object string
  total_reviews: number;
  avg_rating: number;
  total_earned: number;
  availability: string; // 'available' | 'busy' | 'away'
  created_at: string;
}

export interface EngagementTask {
  id: number;
  domain: string;
  budget: number;
  title: string;
  description: string | null;
}

export interface MatchResult {
  expert: ExpertProfile;
  score: number;
  matchReasons: string[];
}

function tierWeight(tier: string): number {
  switch (tier) {
    case "guru":     return 3;
    case "pro":      return 2;
    case "standard": return 1;
    default:         return 1;
  }
}

export function matchExpertsToTask(
  experts: ExpertProfile[],
  task: EngagementTask
): MatchResult[] {
  const taskDomain = (task.domain || "").toLowerCase().trim();

  const results: MatchResult[] = [];

  for (const expert of experts) {
    // Filter: must be available
    if (expert.availability !== "available") continue;

    // Parse domains
    let domains: string[] = [];
    try {
      domains = JSON.parse(expert.domains || "[]");
    } catch {
      domains = [];
    }

    const normalizedDomains = domains.map((d: string) => d.toLowerCase().trim());

    // Filter: must have matching domain
    if (!normalizedDomains.includes(taskDomain)) continue;

    // Score calculation
    const matchReasons: string[] = [];
    let score = 0;

    // Tier weight (1–3)
    const tw = tierWeight(expert.tier);
    score += tw;
    matchReasons.push(`Tier: ${expert.tier} (+${tw})`);

    // Average rating (0–5)
    const rating = expert.avg_rating || 0;
    score += rating;
    if (rating > 0) {
      matchReasons.push(`Avg rating: ${rating.toFixed(1)} (+${rating.toFixed(1)})`);
    }

    // Domain relevance: +2 if this is the expert's primary (first) domain
    if (normalizedDomains.length > 0 && normalizedDomains[0] === taskDomain) {
      score += 2;
      matchReasons.push(`Primary domain match (+2)`);
    } else {
      matchReasons.push(`Domain match`);
    }

    // Experience bonus: +0.5 per 10 completed reviews (capped at 2)
    const reviewBonus = Math.min(2, Math.floor(expert.total_reviews / 10) * 0.5);
    if (reviewBonus > 0) {
      score += reviewBonus;
      matchReasons.push(`Experience bonus: ${expert.total_reviews} reviews (+${reviewBonus})`);
    }

    results.push({ expert, score, matchReasons });
  }

  // Sort descending by score, return top 5
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}
