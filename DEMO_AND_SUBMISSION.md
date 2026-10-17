# Ripple — 2-3 Minute Demo Video Script & Hackathon Submission

---

## Part 1: Demo Video Script (2-3 Minutes)

### [0:00 - 0:35] Scene 1: The Problem (Hook)
- **Screen**: Show a code editor with a complex repository open (e.g. `bulletproof-react`).
- **Voiceover**:
  > *"AI coding agents like Cursor, Claude, and Copilot are incredible at writing code, but they suffer from one fatal flaw: **tunnel vision**. When an agent edits an exported interface, helper function, or barrel file, it has no global view of the codebase. A single change in one file can silently break dozens of consumers 2, 3, or 4 hops away. Grep and keyword search can't fix this—they get drowned in thousands of false positives and fail on re-exports and tsconfig path aliases."*

---

### [0:35 - 1:15] Scene 2: The Graph in FalkorDB (The Secret Weapon)
- **Screen**: Switch to FalkorDB Browser at `http://localhost:3000`. Show the interactive force-directed graph with 128 nodes and 445 edges.
- **Voiceover**:
  > *"To solve this, we built **Ripple**, an MCP server powered by FalkorDB for Track 1 of Graph Hacks.*
  > *Ripple uses `ts-morph` AST analysis to parse repository imports, resolving complex barrel files and `@/` path aliases. It streams this directly into FalkorDB as a connected graph of `File` nodes and `IMPORTS` relationships.*
  > *FalkorDB's matrix-based graph engine allows our AI agents to perform sub-millisecond graph traversals and compute transitive blast radiuses on the fly."*

---

### [1:15 - 2:05] Scene 3: The 4 MCP Tools in Action
- **Screen**: Show Antigravity IDE with the `ripple` MCP server connected (4/4 tools active). Run the tools in chat or CLI.
- **Voiceover**:
  > *"Ripple equips coding agents with 4 high-leverage MCP tools:
  > 1. `blast_radius`: Before touching a file, the agent queries FalkorDB to find all transitively affected files grouped by hop distance. Modifying `api.ts` reveals a 58-file blast radius spanning 4 hops!
  > 2. `why_affected`: Explains the exact shortest import chain between any two files—like tracing `main.tsx` down through `provider.tsx` and `spinner.tsx` to `cn.ts`.
  > 3. `risk_hotspots`: Uses graph in-degree to instantly highlight the highest-risk files in the repo.
  > 4. `safe_edit_order`: Computes a topological edit plan so the agent refactors files in a safe, dependency-ordered sequence."*

---

### [2:05 - 2:30] Scene 4: Conclusion & Impact
- **Screen**: Show the agent successfully using the graph to perform a multi-file refactor without breaking anything. Show the GitHub repo.
- **Voiceover**:
  > *"With Ripple and FalkorDB, AI coding agents no longer code in the dark. They have graph intelligence, knowing the exact ripple effect of every single keystroke. Check out Ripple on GitHub!"*

---

## Part 2: Hackathon Submission Text

### Project Title
**Ripple: FalkorDB-Powered Dependency Graph & Blast Radius Intelligence for AI Coding Agents**

### Tagline
Empowering AI coding agents with graph intelligence so they know what breaks before they edit code.

### Track
**Track 1: Agents that act on connected data, powered by FalkorDB**

### GitHub Repository
https://github.com/trivikramkalagi91-commits/Ripple

### Inspiration & Problem Statement
Modern AI coding agents frequently introduce regressions when editing large codebases because they lack spatial graph awareness of the repository. When an agent modifies a shared type or utility function, it doesn't know which files depend on it across indirect import chains, barrel re-exports (`index.ts`), and `tsconfig` aliases. Grep search fails completely due to naming collisions and path abstractions.

### What Ripple Does
Ripple is an open-source Model Context Protocol (MCP) server that transforms any TypeScript/JavaScript repository into an ultra-fast property graph in FalkorDB. Coding agents consult Ripple prior to making code changes to:
1. **`blast_radius`**: Discover all transitive dependents up to N hops away.
2. **`why_affected`**: Trace the shortest import chain between any two files.
3. **`risk_hotspots`**: Identify central architectural bottlenecks via in-degree analysis.
4. **`safe_edit_order`**: Receive a topological sequence to refactor affected files safely.

### How FalkorDB Powers Ripple
FalkorDB is the engine behind Ripple:
- **Lightning-fast Cypher Queries**: Cypher patterns like `MATCH p = (a:File)-[:IMPORTS*1..4]->(b:File)` execute in single-digit milliseconds.
- **Property Indexing**: Fast indexed node merges on `(:File {path})`.
- **FalkorDB Browser Integration**: Provides visual graph inspection on `localhost:3000`.

### Technologies Used
- FalkorDB (Docker container & `falkordb` Node.js client)
- TypeScript & Node.js
- Model Context Protocol (`@modelcontextprotocol/sdk`)
- `ts-morph` AST Parser & `commander` CLI
