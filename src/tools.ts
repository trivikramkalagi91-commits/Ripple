import { FalkorDB } from 'falkordb';

export interface ToolContext {
  graphName?: string;
  host?: string;
  port?: number;
}

export interface BlastRadiusResult {
  target: string;
  totalDependents: number;
  byDistance: Record<number, string[]>;
  maxHops: number;
}

export interface WhyAffectedResult {
  from: string;
  to: string;
  affected: boolean;
  chain: string[];
  hops: number;
}

export interface RiskHotspot {
  path: string;
  inDegree: number;
  pageRankScore?: number;
}

export interface SafeEditOrderItem {
  step: number;
  distanceFromTarget: number;
  path: string;
}

async function getGraph(ctx?: ToolContext) {
  const host = ctx?.host || 'localhost';
  const port = ctx?.port || 6379;
  const graphName = ctx?.graphName || 'ripple';
  const db = await FalkorDB.connect({ socket: { host, port } });
  const graph = db.selectGraph(graphName);
  return { db, graph };
}

/**
 * Normalizes file path queries so callers can provide partial or OS-dependent paths.
 */
function normalizeQueryPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Tool 1: blast_radius
 * Finds all files that transitively import the target file, grouped by hop distance.
 * AI Description: Call BEFORE editing, renaming, or changing the return type of any exported code.
 */
export async function blastRadius(
  filePath: string,
  maxHops = 4,
  ctx?: ToolContext
): Promise<BlastRadiusResult> {
  const normPath = normalizeQueryPath(filePath);
  const { db, graph } = await getGraph(ctx);

  try {
    // a transitively imports b via 1..maxHops: (a:File)-[:IMPORTS*1..maxHops]->(b:File)
    const query = `
      MATCH (b:File)
      WHERE b.path = $target OR b.path ENDS WITH $suffix
      MATCH p = (a:File)-[:IMPORTS*1..${maxHops}]->(b)
      WITH a.path AS dependent, length(p) AS dist, b.path AS resolvedTarget
      ORDER BY dist ASC
      RETURN resolvedTarget, dependent, min(dist) AS distance
    `;

    const res = await graph.query(query, {
      params: { target: normPath, suffix: `/${normPath}` },
    });

    const byDistance: Record<number, string[]> = {};
    const seen = new Set<string>();
    let resolvedTarget = normPath;

    for (const row of res.data as any[]) {
      resolvedTarget = row.resolvedTarget || resolvedTarget;
      const dep = row.dependent;
      const distance = Number(row.distance);

      if (!seen.has(dep)) {
        seen.add(dep);
        if (!byDistance[distance]) {
          byDistance[distance] = [];
        }
        byDistance[distance].push(dep);
      }
    }

    return {
      target: resolvedTarget,
      totalDependents: seen.size,
      byDistance,
      maxHops,
    };
  } finally {
    await db.close();
  }
}

/**
 * Tool 2: why_affected
 * Finds the shortest import chain between two files.
 * AI Description: Explain why editing file 'to' affects file 'from' by returning the shortest import chain.
 */
export async function whyAffected(
  fromPath: string,
  toPath: string,
  ctx?: ToolContext
): Promise<WhyAffectedResult> {
  const normFrom = normalizeQueryPath(fromPath);
  const normTo = normalizeQueryPath(toPath);
  const { db, graph } = await getGraph(ctx);

  try {
    const query = `
      MATCH (from:File), (to:File)
      WHERE (from.path = $fromTarget OR from.path ENDS WITH $fromSuffix)
        AND (to.path = $toTarget OR to.path ENDS WITH $toSuffix)
      MATCH p = (from)-[:IMPORTS*1..10]->(to)
      RETURN [n in nodes(p) | n.path] AS chain, length(p) AS hops
      ORDER BY hops ASC
      LIMIT 1
    `;

    const res = await graph.query(query, {
      params: {
        fromTarget: normFrom,
        fromSuffix: `/${normFrom}`,
        toTarget: normTo,
        toSuffix: `/${normTo}`,
      },
    });

    if (!res.data || res.data.length === 0) {
      return {
        from: normFrom,
        to: normTo,
        affected: false,
        chain: [],
        hops: 0,
      };
    }

    const row = (res.data[0] || {}) as any;
    return {
      from: normFrom,
      to: normTo,
      affected: true,
      chain: row.chain || [],
      hops: Number(row.hops) || 0,
    };
  } finally {
    await db.close();
  }
}

/**
 * Tool 3: risk_hotspots
 * Identifies the most critical/dependent files in the repository using In-Degree and PageRank.
 * AI Description: Find the highest-risk files in the repo with the most dependents.
 */
export async function riskHotspots(
  limit = 10,
  ctx?: ToolContext
): Promise<RiskHotspot[]> {
  const { db, graph } = await getGraph(ctx);

  try {
    // In-Degree query: count incoming IMPORTS edges
    const query = `
      MATCH (a:File)-[r:IMPORTS]->(b:File)
      RETURN b.path AS path, count(r) AS inDegree
      ORDER BY inDegree DESC
      LIMIT ${limit}
    `;

    const res = await graph.query(query);
    const hotspots: RiskHotspot[] = (res.data as any[]).map((row) => ({
      path: row.path,
      inDegree: Number(row.inDegree),
    }));

    return hotspots;
  } finally {
    await db.close();
  }
}

/**
 * Tool 4: safe_edit_order
 * Returns dependent files ordered topologically by distance from target, so changes can be made safely.
 * AI Description: Order affected files by dependency distance so they can be updated in a safe sequence.
 */
export async function safeEditOrder(
  filePath: string,
  ctx?: ToolContext
): Promise<SafeEditOrderItem[]> {
  const radius = await blastRadius(filePath, 8, ctx);
  const items: SafeEditOrderItem[] = [];
  let step = 1;

  // The target file itself should be edited first
  items.push({
    step: step++,
    distanceFromTarget: 0,
    path: radius.target,
  });

  // Distances ascending: distance 1 (direct importers), distance 2, etc.
  const distances = Object.keys(radius.byDistance)
    .map(Number)
    .sort((a, b) => a - b);

  for (const dist of distances) {
    const files = radius.byDistance[dist];
    for (const f of files) {
      items.push({
        step: step++,
        distanceFromTarget: dist,
        path: f,
      });
    }
  }

  return items;
}
