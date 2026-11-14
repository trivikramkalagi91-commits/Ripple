#!/usr/bin/env node
import { Command } from 'commander';
import { indexRepository } from './indexer.js';
import { blastRadius, whyAffected, riskHotspots, safeEditOrder } from './tools.js';
import { generateSarvamSafePlan } from './sarvam.js';

const program = new Command();

program
  .name('sarvam-ripple')
  .description('FalkorDB-powered dependency graph and Sarvam AI architectural safe plan generator')
  .version('1.0.0');

program
  .command('index <repoPath>')
  .description('Index a TypeScript/JavaScript repository into FalkorDB')
  .option('-g, --graph <name>', 'FalkorDB graph name', process.env.FALKOR_GRAPH || 'ripple')
  .option('-H, --host <host>', 'FalkorDB host', process.env.FALKOR_HOST || 'localhost')
  .option('-p, --port <port>', 'FalkorDB port', (val) => parseInt(val, 10), process.env.FALKOR_PORT ? parseInt(process.env.FALKOR_PORT, 10) : 6379)
  .action(async (repoPath, options) => {
    try {
      await indexRepository({
        repoPath,
        graphName: options.graph,
        falkorHost: options.host,
        falkorPort: options.port,
      });
    } catch (err: any) {
      console.error('Indexing failed:', err.message || err);
      process.exit(1);
    }
  });

program
  .command('plan <filePath>')
  .description('Generate a complete Sarvam AI safe refactoring plan for a proposed file modification')
  .argument('<filePath>', 'File to modify')
  .option('-c, --change <description>', 'Proposed code change', 'Refactor file')
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .action(async (filePath, options) => {
    try {
      console.log(`[Sarvam-Ripple] Evaluating blast radius for ${filePath} in FalkorDB...`);
      const radius = await blastRadius(filePath, 4, { graphName: options.graph });
      const order = await safeEditOrder(filePath, { graphName: options.graph });
      console.log(`[Sarvam-Ripple] Generating architectural safe plan via Sarvam AI...`);
      const plan = await generateSarvamSafePlan(filePath, options.change, radius, order);

      console.log('\n======================================================');
      console.log(plan.markdownPlan);
      console.log('======================================================\n');
      console.log('Visual Blast Radius (Mermaid):');
      console.log(radius.mermaidDiagram);
    } catch (err: any) {
      console.error('Planning failed:', err.message || err);
      process.exit(1);
    }
  });

const queryCmd = program
  .command('query')
  .description('Query the FalkorDB dependency graph');

queryCmd
  .command('blast_radius <filePath>')
  .description('Calculate blast radius for a file')
  .option('-m, --max-hops <hops>', 'Maximum traversal hops', (v) => parseInt(v, 10), 4)
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .action(async (filePath, options) => {
    try {
      const res = await blastRadius(filePath, options.maxHops, { graphName: options.graph });
      console.log(JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.error('Query failed:', err.message || err);
      process.exit(1);
    }
  });

queryCmd
  .command('why_affected <from> <to>')
  .description('Find the shortest import chain between two files')
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .action(async (from, to, options) => {
    try {
      const res = await whyAffected(from, to, { graphName: options.graph });
      console.log(JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.error('Query failed:', err.message || err);
      process.exit(1);
    }
  });

queryCmd
  .command('risk_hotspots')
  .description('Find files with highest number of incoming dependents')
  .option('-l, --limit <limit>', 'Number of hotspots', (v) => parseInt(v, 10), 10)
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .action(async (options) => {
    try {
      const res = await riskHotspots(options.limit, { graphName: options.graph });
      console.log(JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.error('Query failed:', err.message || err);
      process.exit(1);
    }
  });

queryCmd
  .command('safe_edit_order <filePath>')
  .description('Get topological edit order for affected files')
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .action(async (filePath, options) => {
    try {
      const res = await safeEditOrder(filePath, { graphName: options.graph });
      console.log(JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.error('Query failed:', err.message || err);
      process.exit(1);
    }
  });

program.parse(process.argv);
