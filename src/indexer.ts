import fs from 'node:fs';
import path from 'node:path';
import { Project, SourceFile, ExportDeclaration } from 'ts-morph';
import { FalkorDB } from 'falkordb';

export interface IndexerOptions {
  repoPath: string;
  graphName?: string;
  falkorHost?: string;
  falkorPort?: number;
}

export interface IndexResult {
  fileCount: number;
  edgeCount: number;
  unresolvedCount: number;
  durationMs: number;
}

export function normalizeRepoPath(fullPath: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, fullPath);
  return rel.replace(/\\/g, '/');
}

function getBarrelReExports(sourceFile: SourceFile): SourceFile[] {
  const reExportedFiles: SourceFile[] = [];

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    if (exportDecl.hasModuleSpecifier()) {
      const targetSource = exportDecl.getModuleSpecifierSourceFile();
      if (targetSource) {
        reExportedFiles.push(targetSource);
      }
    }
  }

  return reExportedFiles;
}

function tryResolveFallback(specifier: string, currentFileDir: string, allProjectFiles: Set<string>): string | undefined {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', ''];

  // Check if alias @/ or ~/
  let relativeCandidate = '';
  if (specifier.startsWith('@/')) {
    relativeCandidate = specifier.replace(/^@\//, 'src/');
  } else if (specifier.startsWith('~/')) {
    relativeCandidate = specifier.replace(/^~\//, 'src/');
  } else if (specifier.startsWith('.')) {
    relativeCandidate = path.resolve(currentFileDir, specifier);
  }

  if (!relativeCandidate) return undefined;

  for (const ext of extensions) {
    const candidate = (relativeCandidate + ext).replace(/\\/g, '/');
    for (const projectFile of allProjectFiles) {
      const normProjectFile = projectFile.replace(/\\/g, '/');
      if (normProjectFile.endsWith(candidate) || normProjectFile === candidate) {
        return projectFile;
      }
    }
  }

  return undefined;
}

export function extractFileImports(sourceFile: SourceFile, allProjectFiles: Set<string>): {
  resolvedFiles: Set<string>;
  unresolvedSpecs: string[];
} {
  const resolvedFiles = new Set<string>();
  const unresolvedSpecs: string[] = [];
  const currentDir = sourceFile.getDirectoryPath();

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();
    const targetSource = importDecl.getModuleSpecifierSourceFile();
    let targetFilePath: string | undefined = targetSource ? (targetSource.getFilePath() as string) : undefined;

    if (!targetFilePath) {
      targetFilePath = tryResolveFallback(specifier, currentDir, allProjectFiles);
    }

    if (!targetFilePath) {
      if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('~/')) {
        unresolvedSpecs.push(specifier);
      }
      continue;
    }

    if (!allProjectFiles.has(targetFilePath)) {
      continue;
    }

    resolvedFiles.add(targetFilePath);

    const baseName = path.basename(targetFilePath);
    if (/^index\.(ts|tsx|js|jsx|mts|cts)$/i.test(baseName) && targetSource) {
      const reExports = getBarrelReExports(targetSource);
      for (const reExported of reExports) {
        const reExportPath = reExported.getFilePath();
        if (allProjectFiles.has(reExportPath)) {
          resolvedFiles.add(reExportPath);
        }
      }
    }
  }

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    if (exportDecl.hasModuleSpecifier()) {
      const specifier = exportDecl.getModuleSpecifierValue() || '';
      const targetSource = exportDecl.getModuleSpecifierSourceFile();
      let targetFilePath: string | undefined = targetSource ? (targetSource.getFilePath() as string) : undefined;

      if (!targetFilePath) {
        targetFilePath = tryResolveFallback(specifier, currentDir, allProjectFiles);
      }

      if (!targetFilePath) {
        if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('~/')) {
          unresolvedSpecs.push(specifier);
        }
        continue;
      }

      if (allProjectFiles.has(targetFilePath)) {
        resolvedFiles.add(targetFilePath);
      }
    }
  }

  return { resolvedFiles, unresolvedSpecs };
}

export async function indexRepository(options: IndexerOptions): Promise<IndexResult> {
  const startTime = Date.now();
  const repoRoot = path.resolve(options.repoPath);
  const host = options.falkorHost || process.env.FALKOR_HOST || 'localhost';
  const port = options.falkorPort || (process.env.FALKOR_PORT ? parseInt(process.env.FALKOR_PORT, 10) : 6379);
  const graphName = options.graphName || process.env.FALKOR_GRAPH || 'ripple';

  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Repository path does not exist: ${repoRoot}`);
  }

  console.log(`[Sarvam-Ripple] Initializing AST project for ${repoRoot}...`);
  const project = new Project({
    skipAddingFilesFromTsConfig: false,
    skipFileDependencyResolution: false,
  });

  const tsConfigPath = path.join(repoRoot, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    console.log(`[Sarvam-Ripple] Loading tsconfig from ${tsConfigPath}...`);
    project.addSourceFilesFromTsConfig(tsConfigPath);
  } else {
    console.log(`[Sarvam-Ripple] No tsconfig.json found, loading all TypeScript/JavaScript files...`);
    project.addSourceFilesAtPaths([
      path.join(repoRoot, '**/*.{ts,tsx,js,jsx}'),
      `!${path.join(repoRoot, '**/node_modules/**')}`,
      `!${path.join(repoRoot, '**/dist/**')}`,
      `!${path.join(repoRoot, '**/.next/**')}`,
      `!${path.join(repoRoot, '**/build/**')}`,
    ]);
  }

  const allSourceFiles = project.getSourceFiles().filter((sf) => {
    const fp = sf.getFilePath();
    return !fp.includes('node_modules') && !fp.endsWith('.d.ts');
  });

  console.log(`[Sarvam-Ripple] Found ${allSourceFiles.length} source files to index.`);
  const allProjectFiles = new Set(allSourceFiles.map((sf) => sf.getFilePath()));

  const fileData: { path: string; loc: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  let totalUnresolved = 0;

  for (const sf of allSourceFiles) {
    const rawPath = sf.getFilePath();
    const relPath = normalizeRepoPath(rawPath, repoRoot);
    const loc = sf.getEndLineNumber();

    fileData.push({ path: relPath, loc });

    const { resolvedFiles, unresolvedSpecs } = extractFileImports(sf, allProjectFiles);
    totalUnresolved += unresolvedSpecs.length;

    for (const targetRaw of resolvedFiles) {
      const targetRel = normalizeRepoPath(targetRaw, repoRoot);
      if (relPath !== targetRel) {
        edges.push({ from: relPath, to: targetRel });
      }
    }
  }

  console.log(`[Sarvam-Ripple] Extracted ${fileData.length} files and ${edges.length} import edges.`);
  console.log(`[Sarvam-Ripple] Connecting to FalkorDB at ${host}:${port} (graph: ${graphName})...`);

  const username = process.env.FALKOR_USERNAME;
  const password = process.env.FALKOR_PASSWORD;
  const db = await FalkorDB.connect({
    ...(username && { username }),
    ...(password && { password }),
    socket: { host, port },
  });
  const graph = db.selectGraph(graphName);

  try {
    try {
      await graph.delete();
      console.log(`[Sarvam-Ripple] Cleared previous graph '${graphName}'.`);
    } catch {
      // Graph might not exist yet
    }

    try {
      await graph.query('CREATE INDEX FOR (f:File) ON (f.path)');
      console.log(`[Sarvam-Ripple] Enforced schema index on (:File {path}).`);
    } catch {
      // Index might already exist
    }

    console.log(`[Sarvam-Ripple] Ingesting nodes into FalkorDB...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < fileData.length; i += BATCH_SIZE) {
      const batch = fileData.slice(i, i + BATCH_SIZE);
      const query = `
        UNWIND $batch AS item
        CREATE (:File { path: item.path, loc: item.loc })
      `;
      await graph.query(query, { params: { batch } });
    }

    console.log(`[Sarvam-Ripple] Ingesting relationships into FalkorDB...`);
    const EDGE_BATCH = 100;
    for (let i = 0; i < edges.length; i += EDGE_BATCH) {
      const batch = edges.slice(i, i + EDGE_BATCH);
      const query = `
        UNWIND $batch AS edge
        MATCH (from:File { path: edge.from })
        MATCH (to:File { path: edge.to })
        MERGE (from)-[:IMPORTS]->(to)
      `;
      await graph.query(query, { params: { batch } });
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[Sarvam-Ripple] Successfully indexed in ${durationMs}ms: ${fileData.length} files, ${edges.length} edges, ${totalUnresolved} unresolved external specifiers.`
    );

    return {
      fileCount: fileData.length,
      edgeCount: edges.length,
      unresolvedCount: totalUnresolved,
      durationMs,
    };
  } finally {
    await db.close();
  }
}
