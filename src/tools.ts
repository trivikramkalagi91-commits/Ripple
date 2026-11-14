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
  mermaidDiagram?: string;
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
}

export interface SafeEditOrderItem {
  step: number;
  distanceFromTarget: number;
  path: string;
}

async function getGraph(ctx?: ToolContext) {
  const host = ctx?.host || process.env.FALKOR_HOST || 'localhost';
  const port = ctx?.port || (process.env.FALKOR_PORT ? parseInt(process.env.FALKOR_PORT, 10) : 6379);
  const graphName = ctx?.graphName || process.env.FALKOR_GRAPH || 'ripple';
  const username = process.env.FALKOR_USERNAME;
  const password = process.env.FALKOR_PASSWORD;
  const db = await FalkorDB.connect({
    ...(username && { username }),
    ...(password && { password }),
    socket: { host, port },
  });
  const graph = db.selectGraph(graphName);
  return { db, graph };
}

function normalizeQueryPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function sanitizeMermaid(label: string): string {
  return label.replace(/["`[\]()]/g, '');
}

/**
 * Generates an interactive, color-coded Mermaid diagram representing the blast radius.
 */
export function generateMermaidGraph(target: string, byDistance: Record<number, string[]>): string {
  const cleanTarget = sanitizeMermaid(target);
  let mermaid = '```mermaid\nflowchart TD\n';
  mermaid += `    target["🎯 ${cleanTarget} (Target)"]:::targetNode\n`;

  const nodeMap = new Map<string, string>();
  nodeMap.set(target, 'target');
  let idCounter = 1;

  const distances = Object.keys(byDistance)
    .map(Number)
    .sort((a, b) => a - b);

  for (const dist of distances) {
    const files = byDistance[dist];
    for (const f of files) {
      const nodeId = `node_${idCounter++}`;
      nodeMap.set(f, nodeId);
      const shortName = sanitizeMermaid(f.split('/').pop() || f);
      mermaid += `    ${nodeId}["Hop ${dist}: ${shortName}"]:::hop${Math.min(dist, 4)}Node\n`;
    }
  }

  // Draw connections from target to hop 1, and between subsequent hops
  if (byDistance[1]) {
    for (const f of byDistance[1]) {
      const id = nodeMap.get(f);
      if (id) mermaid += `    target -.->|breaks| ${id}\n`;
    }
  }

  for (let d = 1; d < distances.length; d++) {
    const currentDist = distances[d];
    const prevDist = distances[d - 1];
    if (byDistance[currentDist] && byDistance[prevDist]) {
      // Connect each current node to at least one previous node for visual flow
      for (let i = 0; i < byDistance[currentDist].length; i++) {
        const currId = nodeMap.get(byDistance[currentDist][i]);
        const prevId = nodeMap.get(byDistance[prevDist][i % byDistance[prevDist].length]);
        if (currId && prevId) {
          mermaid += `    ${prevId} -.->|propagates to| ${currId}\n`;
        }
      }
    }
  }

  // Color styles
  mermaid += `\n    classDef targetNode fill:#ef4444,stroke:#dc2626,color:#ffffff,stroke-width:2px;\n`;
  mermaid += `    classDef hop1Node fill:#f97316,stroke:#ea580c,color:#ffffff,stroke-width:2px;\n`;
  mermaid += `    classDef hop2Node fill:#eab308,stroke:#ca8a04,color:#000000,stroke-width:2px;\n`;
  mermaid += `    classDef hop3Node fill:#3b82f6,stroke:#2563eb,color:#ffffff,stroke-width:1px;\n`;
  mermaid += `    classDef hop4Node fill:#6b7280,stroke:#4b5563,color:#ffffff,stroke-width:1px;\n`;
  mermaid += '```';

  return mermaid;
}

/**
 * Tool 1: blast_radius
 * Calculates transitive dependent files and returns structured metrics + visual Mermaid graph.
 */
export async function blastRadius(
  filePath: string,
  maxHops = 4,
  ctx?: ToolContext
): Promise<BlastRadiusResult> {
  const normPath = normalizeQueryPath(filePath);
  const { db, graph } = await getGraph(ctx);

  try {
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

    const mermaidDiagram = generateMermaidGraph(resolvedTarget, byDistance);

    return {
      target: resolvedTarget,
      totalDependents: seen.size,
      byDistance,
      maxHops,
      mermaidDiagram,
    };
  } finally {
    await db.close();
  }
}

/**
 * Tool 2: why_affected
 * Finds the shortest import chain between two files.
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
 * Identifies architectural bottlenecks using in-degree centrality.
 */
export async function riskHotspots(
  limit = 10,
  ctx?: ToolContext
): Promise<RiskHotspot[]> {
  const { db, graph } = await getGraph(ctx);

  try {
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
 * Returns dependent files ordered topologically by distance from target.
 */
export async function safeEditOrder(
  filePath: string,
  ctx?: ToolContext
): Promise<SafeEditOrderItem[]> {
  const radius = await blastRadius(filePath, 8, ctx);
  const items: SafeEditOrderItem[] = [];
  let step = 1;

  const seen = new Set<string>();
  seen.add(radius.target);

  // The target file itself is step 1 (distance 0)
  items.push({
    step: step++,
    distanceFromTarget: 0,
    path: radius.target,
  });

  const distances = Object.keys(radius.byDistance)
    .map(Number)
    .sort((a, b) => a - b);

  for (const dist of distances) {
    const files = radius.byDistance[dist];
    for (const f of files) {
      if (!seen.has(f)) {
        seen.add(f);
        items.push({
          step: step++,
          distanceFromTarget: dist,
          path: f,
        });
      }
    }
  }

  return items;
}
