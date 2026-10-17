# Ripple 🌊

> **FalkorDB-powered dependency graph and blast radius analyzer for AI coding agents.**  
> Built for the **Graph Hacks Hackathon (Track 1: Agents that act on connected data)**.

---

## 💥 The Problem: Coding Agents Break Code in the Dark
When AI coding agents (Claude, Cursor, Copilot, Antigravity) edit or refactor code in large codebases, they operate with a narrow view. A simple change to a core interface, utility function, or barrel export silently breaks consumers 2, 3, or 4 hops away.

Plain text search / grep cannot solve this:
- Re-exports and barrel files (`export * from './...'`) mask true dependency chains.
- Path aliases (`@/components`, `~/utils`) confuse simple directory searches.
- Common identifier names (`id`, `name`, `status`) generate thousands of false positive grep matches.

---

## ⚡ The Solution: Ripple
**Ripple** is a high-performance Model Context Protocol (MCP) server powered by **FalkorDB**. It ingests a repository AST into a connected property graph:
- **Nodes**: `(:File {path, loc})`
- **Edges**: `(:File)-[:IMPORTS]->(:File)`
- Automatic resolution of `tsconfig.json` path aliases and barrel re-exports.

AI coding agents query Ripple *before* making changes to know the real blast radius, the exact shortest import chain, and the safe topological edit order.

---

## 🛠️ The 4 MCP Tools

| Tool | When AI Coding Agents Call It | What It Returns |
| :--- | :--- | :--- |
| **`blast_radius(path, maxHops=4)`** | **Before** editing, renaming, or modifying any function/type/component | All transitively affected files grouped by hop distance (1 to N) |
| **`why_affected(from, to)`** | When diagnosing how a change in `to` impacts a distant file `from` | The shortest direct import chain connecting the two files |
| **`risk_hotspots(limit=10)`** | When prioritizing tests or assessing architectural risk | Top files in the repo with highest incoming dependents (in-degree / PageRank) |
| **`safe_edit_order(path)`** | Before performing a multi-file refactor | Affected files ordered topologically by distance from target for safe incremental refactoring |

---

## 🚀 Quickstart

### 1. Start FalkorDB
```bash
docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest
```
*(FalkorDB Browser UI is available at `http://localhost:3000`)*

### 2. Install & Build Ripple
```bash
git clone https://github.com/trivikramkalagi91-commits/Ripple.git
cd Ripple
npm install
npm run build
```

### 3. Index Any Repository
Index any TypeScript/JavaScript project into FalkorDB in seconds:
```bash
node dist/cli.js index <path-to-target-repo>
```

### 4. Query from CLI
```bash
# Calculate blast radius:
node dist/cli.js query blast_radius src/types/api.ts

# Explain dependency chain:
node dist/cli.js query why_affected src/main.tsx src/utils/cn.ts

# View architectural risk hotspots:
node dist/cli.js query risk_hotspots

# Get safe edit sequence:
node dist/cli.js query safe_edit_order src/components/ui/button/button.tsx
```

---

## 🤖 Connecting to Your AI Agent (MCP Config)

Add Ripple to your MCP configuration (e.g., `mcp_config.json`, Cursor, Claude Desktop, or Antigravity IDE):

```json
{
  "mcpServers": {
    "ripple": {
      "command": "node",
      "args": [
        "<FULL_PATH_TO_RIPPLE>/dist/server.js"
      ],
      "env": {}
    }
  }
}
```

### Enforcement Rule for AI Agents
Add this to your target project's `AGENTS.md` or `CLAUDE.md`:
```markdown
Before modifying, renaming, or updating the signature of any exported type, component, or function,
you MUST call the `blast_radius` MCP tool on its file and ensure all downstream affected files are updated.
```

---

## 🏆 Hackathon Details
- **Event**: Graph Hacks
- **Track**: Track 1 — Agents that act on connected data, powered by FalkorDB
- **Built with**: FalkorDB, TypeScript, ts-morph, @modelcontextprotocol/sdk
