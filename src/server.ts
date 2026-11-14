import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { blastRadius, whyAffected, riskHotspots, safeEditOrder } from './tools.js';
import { generateSarvamSafePlan } from './sarvam.js';

const server = new Server(
  {
    name: 'sarvam-ripple',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_safe_plan',
        description:
          'Flagship tool: Call BEFORE modifying any file! Combines FalkorDB graph analysis with Sarvam AI to return the visual blast radius graph AND a step-by-step safe refactoring plan for all affected files in topological order.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The file path being modified (e.g. src/types/api.ts)',
            },
            proposedChange: {
              type: 'string',
              description: 'Description of the intended change (e.g. rename field "id" to "userId")',
            },
          },
          required: ['path', 'proposedChange'],
        },
      },
      {
        name: 'blast_radius',
        description:
          'Calculates all files that transitively import the target file up to N hops away. Returns structured dependency counts and an in-chat visual Mermaid diagram.',
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
              description: 'The dependent consumer file (e.g. src/main.tsx)',
            },
            to: {
              type: 'string',
              description: 'The dependency file being edited (e.g. src/utils/cn.ts)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'risk_hotspots',
        description:
          'Returns the files with the highest number of incoming dependents (in-degree). Identifies architectural single points of failure.',
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_safe_plan': {
        if (!args?.path || typeof args.path !== 'string') {
          throw new Error('Missing required argument: "path" must be provided as a string');
        }
        const filePath = args.path.trim();
        const proposedChange = args?.proposedChange ? String(args.proposedChange).trim() : 'Refactor file';
        const radius = await blastRadius(filePath, 4);
        const order = await safeEditOrder(filePath);
        const sarvamPlan = await generateSarvamSafePlan(filePath, proposedChange, radius, order);

        const responseText = `
${sarvamPlan.markdownPlan}

---

### 📊 Dependency Blast Radius (Visual Graph)
${radius.mermaidDiagram}

---
*Powered by FalkorDB (Sub-5ms GraphBLAS Engine) & Sarvam AI (Architectural Reasoning)*
`.trim();

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'blast_radius': {
        if (!args?.path || typeof args.path !== 'string') {
          throw new Error('Missing required argument: "path" must be provided as a string');
        }
        const filePath = args.path.trim();
        const maxHops = args?.maxHops ? Number(args.maxHops) : 4;
        const result = await blastRadius(filePath, maxHops);
        return {
          content: [
            {
              type: 'text',
              text: `${JSON.stringify(result, null, 2)}\n\n### Visual Blast Radius:\n${result.mermaidDiagram}`,
            },
          ],
        };
      }

      case 'why_affected': {
        if (!args?.from || !args?.to) {
          throw new Error('Missing required arguments: both "from" and "to" are required');
        }
        const from = String(args.from).trim();
        const to = String(args.to).trim();
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
        if (!args?.path || typeof args.path !== 'string') {
          throw new Error('Missing required argument: "path" must be provided as a string');
        }
        const filePath = args.path.trim();
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
