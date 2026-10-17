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

/**
 * Normalizes file paths to POSIX format relative to repository root.
 */
export function normalizeRepoPath(fullPath: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, fullPath);
  return rel.replace(/\\/g, '/');
}

/**
 * Checks whether a target file is a barrel file (e.g. index.ts that re-exports everything from other files).
 * Returns array of source files it re-exports from.
 */
function getBarrelReExports(sourceFile: SourceFile): SourceFile[] {
  const reExportedFiles: SourceFile[] = [];

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    // Only look at export declarations with a module specifier e.g. export * from './foo' or export { x } from './foo'
    if (exportDecl.hasModuleSpecifier()) {
      const targetSource = exportDecl.getModuleSpecifierSourceFile();
      if (targetSource) {
        reExportedFiles.push(targetSource);
      }
    }
  }

  return reExportedFiles;
}

/**
 * Resolves imported files from a source file.
 * Handles:
 * - Direct relative imports (./foo, ../bar)
 * - Tsconfig path aliases (@/*, ~/*) via ts-morph's built-in module resolution
 * - Barrel files / re-exports (traverses through index files re-exporting modules)
 */
export function extractFileImports(sourceFile: SourceFile, allProjectFiles: Set<string>): {
  resolvedFiles: Set<string>;
  unresolvedSpecs: string[];
} {
  const resolvedFiles = new Set<string>();
  const unresolvedSpecs: string[] = [];

  // 1. Process regular imports (import ... from '...')
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();
    const targetSource = importDecl.getModuleSpecifierSourceFile();

    if (!targetSource) {
      // Third-party packages (e.g. 'react', 'lodash') are ignored, but relative or aliased project imports that failed are counted
      if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('~/')) {
        unresolvedSpecs.push(specifier);
      }
      continue;
    }

    const targetFilePath = targetSource.getFilePath();

    // Check if target is inside the project
    if (!allProjectFiles.has(targetFilePath)) {
      continue;
    }

    // Add direct import target
    resolvedFiles.add(targetFilePath);

    // If target is a barrel file, also resolve what it re-exports so transitive dependencies are captured
    const baseName = path.basename(targetFilePath);
    if (/^index\.(ts|tsx|js|jsx|mts|cts)$/i.test(baseName)) {
      const reExports = getBarrelReExports(targetSource);
      for (const reExported of reExports) {
        const reExportPath = reExported.getFilePath();
        if (allProjectFiles.has(reExportPath)) {
          resolvedFiles.add(reExportPath);
        }
      }
    }
  }

  // 2. Process re-exports declared directly in this file (export * from '...', export { x } from '...')
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    if (exportDecl.hasModuleSpecifier()) {
      const specifier = exportDecl.getModuleSpecifierValue();
      const targetSource = exportDecl.getModuleSpecifierSourceFile();

      if (!targetSource) {
        if (specifier?.startsWith('.') || specifier?.startsWith('@/') || specifier?.startsWith('~/')) {
          unresolvedSpecs.push(specifier);
        }
        continue;
      }

      const targetFilePath = targetSource.getFilePath();
      if (allProjectFiles.has(targetFilePath)) {
        resolvedFiles.add(targetFilePath);
      }
    }
  }

  return { resolvedFiles, unresolvedSpecs };
}

/**
 * Main indexer function that parses a repository and loads its File nodes and IMPORTS edges into FalkorDB.
 */
export async function indexRepository(options: IndexerOptions): Promise<IndexResult> {
  const startTime = Date.now();
  const repoPath = path.resolve(options.repoPath);
  const graphName = options.graphName || 'ripple';
  const host = options.falkorHost || 'localhost';
  const port = options.falkorPort || 6379;

  if (!fs.existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  console.log(`\n--- Ripple Indexer ---`);
  console.log(`Repository: ${repoPath}`);
  console.log(`FalkorDB Graph: ${graphName} (${host}:${port})`);

  // Detect tsconfig.json if present
  let tsConfigFilePath: string | undefined = path.join(repoPath, 'tsconfig.json');
  if (!fs.existsSync(tsConfigFilePath)) {
    // Check apps or nested tsconfig
    tsConfigFilePath = undefined;
  }

  console.log(`Analyzing project structure... (tsconfig: ${tsConfigFilePath ? 'found' : 'not found, using glob'})`);

  const project = new Project({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: false,
  });

  if (!tsConfigFilePath) {
    project.addSourceFilesAtPaths([
      path.join(repoPath, '**/*.{ts,tsx,js,jsx,mjs,cjs}'),
      `!${path.join(repoPath, '**/node_modules/**')}`,
      `!${path.join(repoPath, '**/dist/**')}`,
      `!${path.join(repoPath, '**/build/**')}`,
      `!${path.join(repoPath, '**/.git/**')}`,
    ]);
  }

  const allSourceFiles = project.getSourceFiles().filter(sf => {
    const p = sf.getFilePath();
    return !p.includes('/node_modules/') && !p.includes('\\node_modules\\') &&
           !p.includes('/dist/') && !p.includes('\\dist\\') &&
           !p.includes('/.git/') && !p.includes('\\.git\\');
  });

  console.log(`Discovered ${allSourceFiles.length} source files.`);

  const allProjectFilesSet = new Set<string>(allSourceFiles.map(sf => sf.getFilePath()));

  // Connect to FalkorDB
  const db = await FalkorDB.connect({
    socket: { host, port }
  });
  const graph = db.selectGraph(graphName);

  // Clear old graph data
  console.log(`Clearing existing graph data in "${graphName}"...`);
  try {
    await graph.query('MATCH (n) DETACH DELETE n');
  } catch {
    // Graph might be newly initialized, continue
  }

  // Create index on File path for fast MERGE & lookups
  try {
    await graph.query('CREATE INDEX FOR (f:File) ON (f.path)');
  } catch (err: any) {
    // Index might already exist, ignore
  }

  console.log(`Extracting imports and building graph nodes...`);

  let edgeCount = 0;
  let totalUnresolved = 0;

  // Insert all File nodes in batches
  const batchSize = 100;
  for (let i = 0; i < allSourceFiles.length; i += batchSize) {
    const batch = allSourceFiles.slice(i, i + batchSize);
    for (const sf of batch) {
      const normPath = normalizeRepoPath(sf.getFilePath(), repoPath);
      const loc = sf.getEndLineNumber();
      await graph.query(
        'MERGE (f:File {path: $path}) ON CREATE SET f.loc = $loc ON MATCH SET f.loc = $loc',
        { params: { path: normPath, loc } }
      );
    }
  }

  // Insert IMPORTS edges: (importer:File)-[:IMPORTS]->(imported:File)
  for (const sf of allSourceFiles) {
    const fromPath = normalizeRepoPath(sf.getFilePath(), repoPath);
    const { resolvedFiles, unresolvedSpecs } = extractFileImports(sf, allProjectFilesSet);
    totalUnresolved += unresolvedSpecs.length;

    for (const resolvedTarget of resolvedFiles) {
      const toPath = normalizeRepoPath(resolvedTarget, repoPath);
      if (fromPath === toPath) continue; // Skip self-imports

      await graph.query(
        `MATCH (a:File {path: $fromPath}), (b:File {path: $toPath})
         MERGE (a)-[:IMPORTS]->(b)`,
        { params: { fromPath, toPath } }
      );
      edgeCount++;
    }
  }

  await db.close();

  const durationMs = Date.now() - startTime;
  console.log(`\nIndexing complete!`);
  console.log(`- Files indexed: ${allSourceFiles.length}`);
  console.log(`- IMPORTS edges created: ${edgeCount}`);
  console.log(`- Unresolved project imports: ${totalUnresolved}`);
  console.log(`- Time taken: ${(durationMs / 1000).toFixed(2)}s\n`);

  return {
    fileCount: allSourceFiles.length,
    edgeCount,
    unresolvedCount: totalUnresolved,
    durationMs,
  };
}
