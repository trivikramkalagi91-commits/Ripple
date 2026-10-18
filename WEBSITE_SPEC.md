# Ripple Landing Page Specification & Content Blueprint

This document contains the complete aesthetic design system, component hierarchy, copy, visual wireframes, and section-by-section breakdown for building the **Ripple** showcase website (styled after the clean, editorial, neo-brutalist / soft-paper aesthetic of Litigo AI).

---

## 🎨 Visual Identity & Design System (Litigo Aesthetic)

### Typography
- **Headings / Display**: `'Playfair Display', Georgia, serif` (Editorial, elegant, humanistic)
- **Body / Interface**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` (Clean, crisp, readable)
- **Code & Graph Monospace**: `'JetBrains Mono', 'Fira Code', monospace`

### Color Palette
- **Background Cream**: `#FDF8F0` (Warm paper foundation)
- **Primary Ink**: `#1A1A1A` (Deep soft black)
- **Secondary Ink**: `#333333`
- **Muted Text**: `#666666`
- **Soft Accent Pastels**:
  - Sky Blue (Graph & FalkorDB): `#C7E4F5` / `#A8D4EC`
  - Soft Lavender (MCP & AI): `#E5DEFF`
  - Soft Peach (Blast Radius & Danger): `#FFE8D6`
  - Soft Sage Green (Safety & Success): `#C8E6C9`
  - Crisp White (Card surfaces): `#FFFFFF`

### Core Design Motifs
- **Floating Pill Navigation**: Glassmorphic blur (`backdrop-filter: blur(20px)`), pill shape (`border-radius: 100px`), soft drop shadow.
- **Card Styling**: Generous border radius (`border-radius: 24px`), 1px subtle translucent border, pastel block backgrounds.
- **Product Mockup Window**: macOS window header with red/yellow/green traffic lights, split-view interactive comparison (Broken vs. Safe).
- **Halftone & Paper Texture**: Subtle dot-matrix radial gradient in hero and accents.

---

## 🏗️ Website Structure & Sections (Page Flow)

### 1. Floating Pill Navigation Bar
- **Left**: `Ripple 🌊` (Bold, italic skew lettermark)
- **Center Links**:
  - `Problem` (Anchors to #problem)
  - `How It Works` (Anchors to #architecture)
  - `MCP Tools` (Anchors to #tools)
  - `FalkorDB Graph` (Anchors to #graph)
  - `Quickstart` (Anchors to #quickstart)
- **Right CTA Button**: `GitHub ↗` (Links to repository)

---

### 2. Hero Section
- **Badge Pill**: `FalkorDB Powered — Graph Intelligence for Coding Agents`
- **Headline (Playfair Display)**:  
  *Never let your AI coding agent edit code in the dark.*
- **Subheadline**:  
  AI agents edit one file and silently break consumers 4 hops away. **Ripple** gives them real-time dependency graph intelligence powered by **FalkorDB** over MCP — before a single line is modified.
- **CTA Group**:
  - Primary Button: `Install Ripple (npm / docker)`
  - Secondary Button: `View 2-Min Demo Video`
- **Interactive Product Showcase Window**:
  - macOS window with title bar: `Antigravity IDE / Cursor — Blast Radius Comparison`
  - **Left Panel (Without Ripple — Red Warning Tint)**:
    - User asks: *"Refactor BaseEntity in src/types/api.ts"*
    - Agent status: *Grep search completed (3 files edited)*
    - Result: `❌ TypeScript Build Failed — 58 broken consumers across 4 hops`
  - **Right Panel (With Ripple + FalkorDB — Green Success Tint)**:
    - User asks: *"Refactor BaseEntity in src/types/api.ts"*
    - Agent status: `⚡ Called blast_radius('api.ts') via FalkorDB MCP in 4ms`
    - Output: `58 files detected across 4 hop distances. Applying edits in safe_edit_order.`
    - Result: `✅ 0 Errors. Zero Regressions. 100% Graph-Aware.`

---

### 3. Capability Grid (Icons + Micro-Copy)
4 micro-cards showing the technical pillars:
1. **Sub-Millisecond Graph Traversal**: Matrix-based Cypher queries in FalkorDB traverse 4+ hops in <10ms.
2. **AST Deep Resolution**: Automatically resolves barrel re-exports (`export *`) and tsconfig `@/` path aliases.
3. **Native MCP Protocol**: Direct stdio integration with Antigravity IDE, Cursor, Claude Code, and VS Code.
4. **Topological Safety**: Automatically calculates safe edit sequences to prevent broken intermediate states.

---

### 4. Interactive Feature Showcase (Pastel Bento Cards)

#### Feature Card 1 (Soft Peach): The Blast Radius Engine
- **Title**: *See the ripple effect before touching code.*
- **Copy**: When an AI agent modifies an interface or helper, Ripple instantly maps the downstream blast radius across the whole repository, grouped by distance.
- **Visual**: Mini terminal showing the JSON response:
  ```json
  {
    "target": "src/types/api.ts",
    "totalDependents": 58,
    "hops": { "1": 13, "2": 30, "3": 9, "4": 6 }
  }
  ```

#### Feature Card 2 (Soft Blue): Shortest Import Chain (`why_affected`)
- **Title**: *Trace the "why" behind every broken file.*
- **Copy**: Don't guess why a distant view broke. Ripple computes the exact shortest import path connecting any consumer to the root file.
- **Visual**: Node chain diagram:
  `main.tsx` ➔ `app/index.tsx` ➔ `provider.tsx` ➔ `spinner.tsx` ➔ `cn.ts`

#### Feature Card 3 (Soft Lavender): Architectural Risk Hotspots
- **Title**: *Know your codebase's most dangerous files.*
- **Copy**: Analyzes in-degree centrality and PageRank in FalkorDB to rank files with the most incoming dependents.
- **Visual**: Ranked leaderboard card:
  1. `button.tsx` (27 dependents)
  2. `cn.ts` (15 dependents)
  3. `auth.tsx` (14 dependents)

#### Feature Card 4 (Soft Green): Topological Safe Edit Order
- **Title**: *Refactor in the exact order of dependency.*
- **Copy**: Returns an automated step-by-step recipe from distance 0 to distance N, ensuring tests and types stay aligned at every stage.
- **Visual**: Step-by-step checklist preview (Step 1: target ➔ Step 2: primitives ➔ Step 3: routes).

---

### 5. FalkorDB Architecture & Graph Model
- **Headline**: *Why FalkorDB is the engine for coding agents*
- **Content Blocks**:
  - **Graph Schema**:
    - Nodes: `(:File {path, loc})`
    - Relationships: `(:File)-[:IMPORTS]->(:File)`
  - **Interactive Browser Experience**:
    - Screenshot/Preview of FalkorDB Browser at `http://localhost:3000` showing force-directed network graph of 128 nodes and 445 edges.
  - **Cypher Query Highlight**:
    ```cypher
    MATCH (b:File {path: $target})
    MATCH p = (a:File)-[:IMPORTS*1..4]->(b)
    RETURN a.path AS dependent, min(length(p)) AS distance
    ORDER BY distance ASC
    ```

---

### 6. Quickstart / Developer Onboarding (Interactive Terminal Tabs)
3 tabbed steps matching our README:
- **Tab 1: Start FalkorDB** (`docker run -d --name falkordb --restart unless-stopped -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest`)
- **Tab 2: Index Codebase** (`ripple index ./my-project`)
- **Tab 3: Add to MCP Config** (JSON snippet for Cursor, Claude, Antigravity)

---

### 7. Footer
- **Logo Mark**: `Ripple 🌊`
- **Info**: Graph Intelligence for AI Coding Agents (FalkorDB Connected Data)
- **Links**: GitHub Repository, Documentation, FalkorDB Official Docs, MIT License.
