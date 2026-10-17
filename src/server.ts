import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { blastRadius, whyAffected, riskHotspots, safeEditOrder } from './tools.js';

const server = new Server(
  {
    name: 'ripple',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tool Definitions with explicit WHEN TO CALL guidance
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'blast_radius',
        description:
          'Call BEFORE editing, renaming, or changing the return type of any exported code. Returns all files that transitively import the target file, grouped by hop distance.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The file path in the repository (e.g. src/utils/cn.ts)',
            },
            maxHops: {
              type: 'number',
              description: 'Maximum hops to traverse (default 4)',
              default: 4,
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'why_affected',
        description:
          'Explains why modifying file "to" affects file "from" by returning the shortest import chain between the two files.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'The dependent consumer file that might be broken (e.g. src/main.tsx)',
            },
            to: {
              type: 'string',
              description: 'The dependency file being edited or changed (e.g. src/utils/cn.ts)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'risk_hotspots',
        description:
          'Returns the files in the repository with the highest number of incoming dependents (in-degree). Use this to see which core files carry the highest architectural risk.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of hotspots to return (default 10)',
              default: 10,
            },
          },
        },
      },
      {
        name: 'safe_edit_order',
        description:
          'Returns the target file and all its dependents ordered topologically by distance, ensuring changes and fixes can be applied in a safe, dependency-ordered sequence.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The file path being modified',
            },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'blast_radius': {
        const filePath = String(args?.path);
        const maxHops = args?.maxHops ? Number(args.maxHops) : 4;
        const result = await blastRadius(filePath, maxHops);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'why_affected': {
        const from = String(args?.from);
        const to = String(args?.to);
        const result = await whyAffected(from, to);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'risk_hotspots': {
        const limit = args?.limit ? Number(args.limit) : 10;
        const result = await riskHotspots(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'safe_edit_order': {
        const filePath = String(args?.path);
        const result = await safeEditOrder(filePath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message || String(error)}`,
        },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  process.stderr.write(`Fatal MCP error: ${err.message || err}\n`);
  process.exit(1);
});
