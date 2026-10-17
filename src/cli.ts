#!/usr/bin/env node
import { Command } from 'commander';
import { indexRepository } from './indexer.js';

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

program.parse(process.argv);
