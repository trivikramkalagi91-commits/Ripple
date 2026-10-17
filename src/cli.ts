#!/usr/bin/env node
import { Command } from 'commander';
import { indexRepository } from './indexer.js';
import { blastRadius, whyAffected, riskHotspots, safeEditOrder } from './tools.js';

const program = new Command();

program
  .name('ripple')
  .description('FalkorDB-powered dependency graph and blast radius analyzer')
  .version('0.1.0');

program
  .command('index <repoPath>')
  .description('Index a TypeScript/JavaScript repository into FalkorDB')
  .option('-g, --graph <name>', 'FalkorDB graph name', 'ripple')
  .option('-H, --host <host>', 'FalkorDB host', 'localhost')
  .option('-p, --port <port>', 'FalkorDB port', (val) => parseInt(val, 10), 6379)
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
