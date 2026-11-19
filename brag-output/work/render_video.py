import sys
import os
import math
import subprocess
import time
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_SECONDS = 45.0
TOTAL_FRAMES = int(TOTAL_SECONDS * FPS)  # 1350 frames

WORKSPACE_DIR = r"c:\Users\trivi\Documents\antigravity\epic-noether"
WORK_DIR = os.path.join(WORKSPACE_DIR, "brag-output", "work")
OUTPUT_VIDEO = os.path.join(WORKSPACE_DIR, "brag-output", "brag.mp4")
OUTPUT_POSTER = os.path.join(WORKSPACE_DIR, "brag-output", "brag.jpg")
MUSIC_PATH = os.path.join(WORK_DIR, "music.mp3")

WINDIR = os.environ.get("WINDIR", r"C:\Windows")
FONTS_DIR = os.path.join(WINDIR, "Fonts")

def get_font(name, size):
    path = os.path.join(FONTS_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

font_serif_xl = get_font("georgiab.ttf", 64)
font_serif_lg = get_font("georgiab.ttf", 46)
font_serif_md = get_font("georgia.ttf", 32)

font_sans_xl = get_font("segoeuib.ttf", 52)
font_sans_lg = get_font("segoeuib.ttf", 36)
font_sans_md = get_font("segoeui.ttf", 26)
font_sans_sm = get_font("segoeui.ttf", 20)

font_mono_lg = get_font("consolab.ttf", 32)
font_mono_md = get_font("consola.ttf", 24)
font_mono_sm = get_font("consola.ttf", 19)

# Load Images
def load_img(rel_path, target_size=None):
    full_path = os.path.join(WORKSPACE_DIR, rel_path)
    if os.path.exists(full_path):
        img = Image.open(full_path).convert("RGBA")
        if target_size:
            img = img.resize(target_size, Image.Resampling.LANCZOS)
        return img
    return None

cube_img = load_img("cube-logo.png", (220, 214))
brain_img = load_img("logo.png", (230, 186))
embarko_img = load_img("embarko-logo.png", (200, 200))
graph_img = load_img("falkordb-graph.png", (780, 412))

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_header(draw, title_suffix=""):
    # Clean top editorial banner
    draw.rectangle([0, 0, WIDTH, 80], fill=(250, 249, 246, 255))
    draw.line([0, 80, WIDTH, 80], fill=(227, 226, 224), width=2)
    
    # Brand logo text
    draw.text((80, 22), "RIPPLE", fill=(26, 28, 26), font=font_serif_md)
    # v1.0 badge
    draw.rounded_rectangle([210, 26, 275, 54], radius=6, fill=(233, 232, 229))
    draw.text((220, 30), "v1.0", fill=(68, 71, 72), font=font_mono_sm)
    
    # Embarko challenge tag
    draw.rounded_rectangle([WIDTH - 360, 22, WIDTH - 80, 58], radius=8, fill=(244, 243, 241), outline=(227, 226, 224), width=1)
    draw.text((WIDTH - 345, 29), "#DeployWithEmbarko", fill=(99, 102, 241), font=font_sans_sm)
    
    if title_suffix:
        draw.text((320, 28), f"|  {title_suffix}", fill=(112, 90, 68), font=font_sans_md)

def render_scene_1(t, frame_idx):
    # Scene 1: The Blind Edit Trap (0s - 8s)
    # Dark IDE aesthetic
    img = Image.new("RGB", (WIDTH, HEIGHT), (13, 17, 23))
    draw = ImageDraw.Draw(img)
    
    # Grid lines texture
    for x in range(0, WIDTH, 60):
        draw.line([x, 0, x, HEIGHT], fill=(22, 27, 34), width=1)
    for y in range(0, HEIGHT, 60):
        draw.line([0, y, WIDTH, y], fill=(22, 27, 34), width=1)
        
    # Top Headline
    head_alpha = min(1.0, t / 0.8)
    draw.text((100, 100), "THE BLIND AGENT PROBLEM", fill=(239, 68, 68), font=font_sans_lg)
    draw.text((100, 160), "AI Agents Are Editing Code In The Dark.", fill=(240, 246, 252), font=font_serif_xl)
    
    # Subtext
    draw.text((100, 250), "A simple refactor in one file causes silent cascading breaks 4 hops away.", fill=(139, 148, 158), font=font_sans_md)
    
    # IDE Window Card
    ide_x1, ide_y1, ide_x2, ide_y2 = 100, 320, 1150, 920
    draw.rounded_rectangle([ide_x1, ide_y1, ide_x2, ide_y2], radius=16, fill=(22, 27, 34), outline=(48, 54, 61), width=2)
    
    # Window titlebar
    draw.rounded_rectangle([ide_x1, ide_y1, ide_x2, ide_y1 + 50], radius=16, fill=(33, 38, 45))
    draw.rectangle([ide_x1, ide_y1 + 30, ide_x2, ide_y1 + 50], fill=(33, 38, 45))
    # Window dots
    draw.ellipse([ide_x1 + 20, ide_y1 + 18, ide_x1 + 34, ide_y1 + 32], fill=(255, 95, 86))
    draw.ellipse([ide_x1 + 44, ide_y1 + 18, ide_x1 + 58, ide_y1 + 32], fill=(255, 189, 46))
    draw.ellipse([ide_x1 + 68, ide_y1 + 18, ide_x1 + 82, ide_y1 + 32], fill=(39, 201, 63))
    draw.text((ide_x1 + 105, ide_y1 + 14), "packages/utils/format.ts — diff preview", fill=(139, 148, 158), font=font_mono_sm)
    
    # Code content
    lines = [
        ("1", " export interface FormatterConfig {", (139, 148, 158)),
        ("2", "   currency: string;", (139, 148, 158)),
        ("3", " }", (139, 148, 158)),
        ("4", "", (139, 148, 158)),
        ("5", "- export function formatPrice(cents: number) {", (248, 81, 73)),
        ("6", "+ export function formatPrice(cents: number, config: FormatterConfig) {", (63, 185, 80)),
        ("7", "   return `${config.currency} ${(cents / 100).toFixed(2)}`;", (63, 185, 80)),
        ("8", " }", (139, 148, 158)),
        ("9", "", (139, 148, 158)),
        ("10", " export function parsePrice(input: string): number { ... }", (139, 148, 158)),
    ]
    
    cy = ide_y1 + 75
    for num, txt, col in lines:
        draw.text((ide_x1 + 25, cy), num, fill=(72, 79, 88), font=font_mono_md)
        draw.text((ide_x1 + 75, cy), txt, fill=col, font=font_mono_md)
        cy += 42
        
    # Right Side Warning Cards (Animated in)
    if t > 2.0:
        c1_progress = min(1.0, (t - 2.0) / 0.5)
        rx1 = int(1220 + (1.0 - c1_progress) * 100)
        draw.rounded_rectangle([rx1, 320, 1820, 520], radius=16, fill=(33, 16, 18), outline=(248, 81, 73), width=2)
        draw.text((rx1 + 30, 350), "⚠️ CRITICAL BLAST RADIUS", fill=(248, 81, 73), font=font_sans_lg)
        draw.text((rx1 + 30, 410), "58 Consumer Files Broken", fill=(255, 255, 255), font=font_serif_lg)
        draw.text((rx1 + 30, 465), "Across 4 hops of barrel exports & aliases", fill=(255, 160, 160), font=font_sans_md)
        
    if t > 4.5:
        c2_progress = min(1.0, (t - 4.5) / 0.5)
        rx2 = int(1220 + (1.0 - c2_progress) * 100)
        draw.rounded_rectangle([rx2, 560, 1820, 860], radius=16, fill=(22, 27, 34), outline=(72, 79, 88), width=2)
        draw.text((rx2 + 30, 590), "WHY GREP & RG FAIL:", fill=(230, 160, 30), font=font_sans_lg)
        
        reasons = [
            "✗ Misses barrel re-exports (`index.ts`)",
            "✗ Blind to path aliases (`@/utils/*`)",
            "✗ Cannot compute safe edit sequence",
            "✗ Causes cascading test suite failures"
        ]
        ry = 650
        for r in reasons:
            draw.text((rx2 + 30, ry), r, fill=(201, 209, 217), font=font_mono_sm)
            ry += 42
            
    # Bottom callout ticker
    draw.rectangle([0, HEIGHT - 70, WIDTH, HEIGHT], fill=(22, 27, 34))
    draw.line([0, HEIGHT - 70, WIDTH, HEIGHT - 70], fill=(48, 54, 61), width=1)
    draw.text((100, HEIGHT - 48), "PROBLEM: LLMs modify files in isolation without AST-level dependency graph comprehension.", fill=(139, 148, 158), font=font_mono_sm)
    
    return img

def render_scene_2(t, frame_idx):
    # Scene 2: Meet Ripple — Graph Intelligence (8s - 17s)
    # Warm alabaster editorial background
    img = Image.new("RGB", (WIDTH, HEIGHT), (250, 249, 246))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "The Architectural Guardian")
    
    # Sub-timer
    st = t - 8.0
    
    # Hero Title with smooth float
    float_y = int(math.sin(st * 3.0) * 8)
    
    # Logos
    if cube_img:
        img.paste(cube_img, (100, 120 + float_y), cube_img)
    if brain_img:
        img.paste(brain_img, (330, 135 - float_y), brain_img)
        
    draw.text((600, 130), "RIPPLE", fill=(26, 28, 26), font=font_serif_xl)
    draw.text((600, 215), "Dependency Graph Intelligence for AI Coding Agents", fill=(112, 90, 68), font=font_sans_lg)
    draw.text((600, 265), "Powered by FalkorDB Property Graphs & Model Context Protocol (MCP)", fill=(68, 71, 72), font=font_sans_md)
    
    # 3 Pillar Cards
    card_w = 540
    card_h = 360
    card_y = 350
    
    pillars = [
        ("AST Ingestion", "< 5ms Graph Traversal", "Parses TypeScript & JavaScript ASTs into nodes (files, functions, classes) and imports/calls edges with microsecond Cypher queries.", (99, 102, 241), "⚡ FAST"),
        ("FalkorDB Powered", "Connected Graph Memory", "High-performance GraphBLAS linear algebra engine turns entire repositories into connected knowledge networks.", (239, 68, 68), "🧠 GRAPH"),
        ("Model Context Protocol", "Native AI Agent Tools", "Standardized MCP interface gives Claude, Cursor, Antigravity, and Gemini real-time architectural vision.", (16, 185, 129), "🔌 PLUG & PLAY")
    ]
    
    for i, (title, highlight, desc, col, badge) in enumerate(pillars):
        cx1 = 100 + i * (card_w + 30)
        cx2 = cx1 + card_w
        
        # Subtle entrance stagger
        card_t = max(0.0, min(1.0, (st - i * 0.4) / 0.5))
        cy_offset = int((1.0 - card_t) * 50)
        
        draw.rounded_rectangle([cx1, card_y + cy_offset, cx2, card_y + card_h + cy_offset], radius=16, fill=(244, 243, 241), outline=(227, 226, 224), width=2)
        
        # Color bar top
        draw.rounded_rectangle([cx1, card_y + cy_offset, cx2, card_y + 12 + cy_offset], radius=6, fill=col)
        
        # Badge
        draw.rounded_rectangle([cx1 + 30, card_y + 35 + cy_offset, cx1 + 150, card_y + 70 + cy_offset], radius=8, fill=(233, 232, 229))
        draw.text((cx1 + 45, card_y + 42 + cy_offset), badge, fill=col, font=font_sans_sm)
        
        draw.text((cx1 + 30, card_y + 90 + cy_offset), title, fill=(26, 28, 26), font=font_sans_lg)
        draw.text((cx1 + 30, card_y + 140 + cy_offset), highlight, fill=col, font=font_serif_md)
        
        # Description wrapped
        words = desc.split()
        cur_line = ""
        desc_y = card_y + 200 + cy_offset
        for w in words:
            test = cur_line + (" " if cur_line else "") + w
            if len(test) > 34:
                draw.text((cx1 + 30, desc_y), cur_line, fill=(68, 71, 72), font=font_sans_sm)
                desc_y += 28
                cur_line = w
            else:
                cur_line = test
        if cur_line:
            draw.text((cx1 + 30, desc_y), cur_line, fill=(68, 71, 72), font=font_sans_sm)

    # Bottom Banner: Native Agent Intelligence (Zero Lock-In)
    draw.rounded_rectangle([100, 780, WIDTH - 100, 940], radius=16, fill=(255, 255, 255), outline=(99, 102, 241), width=2)
    draw.text((140, 810), "✨ 100% NATIVE AGENT INTELLIGENCE", fill=(99, 102, 241), font=font_sans_lg)
    draw.text((140, 865), "No mandatory cloud AI keys required. The MCP server computes topological order directly from graph math.", fill=(26, 28, 26), font=font_serif_md)
    draw.text((140, 905), "Works out of the box with any MCP client: Claude Code, Antigravity, Cursor, and Windsurf.", fill=(112, 90, 68), font=font_sans_sm)

    return img

def render_scene_3(t, frame_idx):
    # Scene 3: The 4 Guardian MCP Tools in Action (17s - 28s)
    img = Image.new("RGB", (WIDTH, HEIGHT), (250, 249, 246))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Core MCP Tools & Live Reasoning")
    
    st = t - 17.0
    
    # Left Column: The 4 Tools
    draw.text((100, 110), "THE MCP GUARDIAN SUITE", fill=(112, 90, 68), font=font_sans_md)
    draw.text((100, 150), "4 Tools That Protect Every Diff", fill=(26, 28, 26), font=font_serif_xl)
    
    tools = [
        ("blast_radius", "Computes full transitive closure of impacted files across all hops.", (239, 68, 68)),
        ("safe_edit_order", "Topological sort: gives exact order to apply edits with zero intermediate breakage.", (16, 185, 129)),
        ("why_affected", "Finds the exact shortest path explaining why File A impacts File B.", (99, 102, 241)),
        ("risk_hotspots", "Centrality metrics flag dangerous choke-points before refactoring.", (245, 158, 11))
    ]
    
    ty = 240
    for name, desc, col in tools:
        draw.rounded_rectangle([100, ty, 880, ty + 120], radius=12, fill=(255, 255, 255), outline=(227, 226, 224), width=1)
        draw.rounded_rectangle([100, ty, 115, ty + 120], radius=6, fill=col)
        draw.text((135, ty + 18), f"`{name}`", fill=(26, 28, 26), font=font_mono_lg)
        
        # Wrap description
        words = desc.split()
        l1, l2 = "", ""
        for w in words:
            if len(l1) + len(w) < 55 and not l2:
                l1 += (" " if l1 else "") + w
            else:
                l2 += (" " if l2 else "") + w
        draw.text((135, ty + 60), l1, fill=(68, 71, 72), font=font_sans_sm)
        if l2:
            draw.text((135, ty + 85), l2, fill=(68, 71, 72), font=font_sans_sm)
        ty += 140

    # Right Column: Simulated Live Agent Interaction & Mermaid Output
    terminal_x1 = 940
    terminal_y1 = 140
    terminal_x2 = WIDTH - 80
    terminal_y2 = 940
    
    draw.rounded_rectangle([terminal_x1, terminal_y1, terminal_x2, terminal_y2], radius=16, fill=(15, 23, 42), outline=(51, 65, 85), width=2)
    
    # Titlebar
    draw.rounded_rectangle([terminal_x1, terminal_y1, terminal_x2, terminal_y1 + 45], radius=16, fill=(30, 41, 59))
    draw.rectangle([terminal_x1, terminal_y1 + 25, terminal_x2, terminal_y1 + 45], fill=(30, 41, 59))
    draw.ellipse([terminal_x1 + 20, terminal_y1 + 16, terminal_x1 + 32, terminal_y1 + 28], fill=(239, 68, 68))
    draw.ellipse([terminal_x1 + 40, terminal_y1 + 16, terminal_x1 + 52, terminal_y1 + 28], fill=(245, 158, 11))
    draw.ellipse([terminal_x1 + 60, terminal_y1 + 16, terminal_x1 + 72, terminal_y1 + 28], fill=(16, 185, 129))
    draw.text((terminal_x1 + 95, terminal_y1 + 12), "Claude Code / Antigravity Agent Chat Session", fill=(148, 163, 184), font=font_mono_sm)
    
    # Agent query simulation
    draw.text((terminal_x1 + 30, terminal_y1 + 70), "🤖 AGENT CALLING RIPPLE MCP:", fill=(99, 102, 241), font=font_mono_md)
    draw.text((terminal_x1 + 30, terminal_y1 + 110), "> ripple.safe_edit_order({ target: 'src/types/user.ts' })", fill=(248, 250, 252), font=font_mono_sm)
    
    # Terminal Response
    draw.rounded_rectangle([terminal_x1 + 30, terminal_y1 + 155, terminal_x2 - 30, terminal_y1 + 440], radius=10, fill=(30, 41, 59), outline=(71, 85, 105), width=1)
    draw.text((terminal_x1 + 50, terminal_y1 + 175), "⚡ FalkorDB Cypher Resolution (4.1ms):", fill=(52, 211, 153), font=font_mono_sm)
    
    flow_steps = [
        ("Step 1 (Root):", "src/types/user.ts", "(0 dependencies)"),
        ("Step 2 (Hop 1):", "src/auth/session.ts", "(depends on user.ts)"),
        ("Step 3 (Hop 2):", "src/api/routes.ts", "(depends on session.ts)"),
        ("Step 4 (Sink):", "src/pages/Dashboard.tsx", "(depends on routes.ts)")
    ]
    sy = terminal_y1 + 220
    for step, fpath, note in flow_steps:
        draw.text((terminal_x1 + 50, sy), step, fill=(245, 158, 11), font=font_mono_sm)
        draw.text((terminal_x1 + 200, sy), fpath, fill=(248, 250, 252), font=font_mono_sm)
        draw.text((terminal_x1 + 450, sy), note, fill=(148, 163, 184), font=font_mono_sm)
        sy += 44
        
    draw.text((terminal_x1 + 50, terminal_y1 + 400), "✓ Topological safety verified. Zero runtime circularity.", fill=(52, 211, 153), font=font_mono_sm)

    # In-chat Visual Graph
    draw.text((terminal_x1 + 30, terminal_y1 + 470), "📊 IN-CHAT COLOR-CODED MERMAID BLAST RADIUS:", fill=(245, 158, 11), font=font_mono_md)
    
    # Graph Box
    draw.rounded_rectangle([terminal_x1 + 30, terminal_y1 + 510, terminal_x2 - 30, terminal_y2 - 30], radius=12, fill=(15, 23, 42), outline=(71, 85, 105), width=1)
    
    # Draw graph diagram nodes
    nodes = [
        ("user.ts\n(Root)", terminal_x1 + 80, terminal_y1 + 590, (239, 68, 68)),
        ("session.ts\n(Hop 1)", terminal_x1 + 260, terminal_y1 + 590, (245, 158, 11)),
        ("routes.ts\n(Hop 2)", terminal_x1 + 450, terminal_y1 + 590, (99, 102, 241)),
        ("Dashboard.tsx\n(Sink)", terminal_x1 + 650, terminal_y1 + 590, (16, 185, 129))
    ]
    for i in range(len(nodes) - 1):
        x_a = nodes[i][1] + 110
        y_a = nodes[i][2] + 40
        x_b = nodes[i+1][1]
        y_b = nodes[i+1][2] + 40
        draw.line([x_a, y_a, x_b, y_b], fill=(148, 163, 184), width=3)
        # Arrowhead
        draw.polygon([(x_b, y_b), (x_b - 12, y_b - 7), (x_b - 12, y_b + 7)], fill=(148, 163, 184))
        
    for label, nx, ny, ncol in nodes:
        draw.rounded_rectangle([nx, ny, nx + 110, ny + 80], radius=8, fill=(30, 41, 59), outline=ncol, width=2)
        lines = label.split("\n")
        draw.text((nx + 10, ny + 15), lines[0], fill=(255, 255, 255), font=font_mono_sm)
        draw.text((nx + 10, ny + 45), lines[1], fill=ncol, font=font_sans_sm)

    draw.text((terminal_x1 + 180, terminal_y2 - 65), "Agents edit along arrows with ZERO broken builds.", fill=(248, 250, 252), font=font_sans_md)

    return img

def render_scene_4(t, frame_idx):
    # Scene 4: Deployed on Embarko & Student Challenge Showcase (28s - 38s)
    img = Image.new("RGB", (WIDTH, HEIGHT), (250, 249, 246))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Live Production Deployment")
    
    st = t - 28.0
    
    # Left Hero Banner: Embarko Platform
    draw.text((100, 110), "PRODUCTION CLOUD HOSTING", fill=(112, 90, 68), font=font_sans_md)
    draw.text((100, 150), "Deployed On Embarko Cloud", fill=(26, 28, 26), font=font_serif_xl)
    
    # Live URL Badge with green live pulse
    pulse = (math.sin(st * 4.0) + 1.0) / 2.0
    pulse_col = (int(16 + pulse * 20), int(185 + pulse * 40), int(129 - pulse * 20))
    
    draw.rounded_rectangle([100, 240, 950, 330], radius=16, fill=(244, 243, 241), outline=pulse_col, width=3)
    draw.ellipse([135, 275, 155, 295], fill=pulse_col)
    draw.text((175, 267), "https://sarvam-ripple.embarko.app", fill=(26, 28, 26), font=font_mono_lg)
    draw.rounded_rectangle([820, 260, 920, 310], radius=8, fill=pulse_col)
    draw.text((840, 272), "LIVE", fill=(255, 255, 255), font=font_sans_sm)
    
    # 4 Highlights of Embarko Hosting
    highlights = [
        ("⚡ Instant Edge Deployment", "Continuous auto-deployment directly from git commits. No custom Dockerfiles or Kubernetes manifests required."),
        ("🌐 Permanent Public Domain", "Claimed and permanently routed at sarvam-ripple.embarko.app with instant TLS encryption."),
        ("🛡️ Verified Student Submission", "Built for the Deploy With Embarko Student Challenge with full compliance."),
        ("📊 Live Real-time Status", "HTTP 200 OK — serving the interactive web dashboard and MCP status 24/7.")
    ]
    
    hy = 360
    for title, desc in highlights:
        draw.rounded_rectangle([100, hy, 950, hy + 120], radius=12, fill=(255, 255, 255), outline=(227, 226, 224), width=1)
        draw.text((130, hy + 18), title, fill=(26, 28, 26), font=font_sans_lg)
        
        # Word wrap desc
        words = desc.split()
        l1, l2 = "", ""
        for w in words:
            if len(l1) + len(w) < 60 and not l2:
                l1 += (" " if l1 else "") + w
            else:
                l2 += (" " if l2 else "") + w
        draw.text((130, hy + 60), l1, fill=(68, 71, 72), font=font_sans_sm)
        if l2:
            draw.text((130, hy + 86), l2, fill=(68, 71, 72), font=font_sans_sm)
        hy += 135

    # Right Card: Embarko Showcase Card
    rc_x1 = 1010
    rc_y1 = 140
    rc_x2 = WIDTH - 80
    rc_y2 = 910
    
    draw.rounded_rectangle([rc_x1, rc_y1, rc_x2, rc_y2], radius=20, fill=(23, 26, 30), outline=(51, 65, 85), width=2)
    
    # Embarko Logo
    if embarko_img:
        img.paste(embarko_img, (rc_x1 + int((rc_x2 - rc_x1 - 200) / 2), rc_y1 + 50), embarko_img)
        
    draw.text((rc_x1 + 160, rc_y1 + 270), "EMBARKO", fill=(255, 255, 255), font=font_serif_xl)
    draw.text((rc_x1 + 105, rc_y1 + 355), "Student Challenge Entry", fill=(201, 209, 217), font=font_sans_lg)
    
    draw.line([rc_x1 + 60, rc_y1 + 420, rc_x2 - 60, rc_y1 + 420], fill=(51, 65, 85), width=1)
    
    draw.text((rc_x1 + 60, rc_y1 + 460), "Official Hashtag:", fill=(148, 163, 184), font=font_sans_md)
    draw.rounded_rectangle([rc_x1 + 60, rc_y1 + 505, rc_x2 - 60, rc_y1 + 575], radius=10, fill=(99, 102, 241))
    draw.text((rc_x1 + 120, rc_y1 + 525), "#DeployWithEmbarko", fill=(255, 255, 255), font=font_sans_lg)
    
    # Requirement badges
    reqs = [
        "✓ Deployed & Live on Embarko",
        "✓ Video Duration: 45s (Meets 40s - 3m rule)",
        "✓ Open Source & Documented",
        "✓ 100% Original Work & Permissive Music"
    ]
    ry = rc_y1 + 610
    for r in reqs:
        draw.text((rc_x1 + 80, ry), r, fill=(52, 211, 153), font=font_sans_md)
        ry += 44

    return img

def render_scene_5(t, frame_idx):
    # Scene 5: Outro, Hero Call to Action & Poster (38s - 45s)
    img = Image.new("RGB", (WIDTH, HEIGHT), (250, 249, 246))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Launch & Open Source")
    
    st = t - 38.0
    
    # Center Hero Card
    card_x1 = 140
    card_y1 = 120
    card_x2 = WIDTH - 140
    card_y2 = HEIGHT - 100
    
    draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=24, fill=(255, 255, 255), outline=(227, 226, 224), width=3)
    
    # Floating Logos Lockup
    float_y = int(math.sin(st * 3.5) * 6)
    
    lx = card_x1 + 180
    if cube_img:
        img.paste(cube_img, (lx, card_y1 + 45 + float_y), cube_img)
    if brain_img:
        img.paste(brain_img, (lx + 260, card_y1 + 60 - float_y), brain_img)
    if embarko_img:
        img.paste(embarko_img, (lx + 540, card_y1 + 55 + float_y), embarko_img)
        
    # Main Headline
    draw.text((card_x1 + 180, card_y1 + 290), "NEVER LET YOUR AGENT EDIT IN THE DARK.", fill=(26, 28, 26), font=font_serif_xl)
    draw.text((card_x1 + 240, card_y1 + 375), "Give your AI coding agents graph vision before they modify a single file.", fill=(112, 90, 68), font=font_sans_lg)
    
    # Action Links Box
    link_y = card_y1 + 460
    
    # Live URL Button
    draw.rounded_rectangle([card_x1 + 120, link_y, card_x1 + 750, link_y + 110], radius=16, fill=(244, 243, 241), outline=(99, 102, 241), width=2)
    draw.text((card_x1 + 150, link_y + 18), "🌐 LIVE WEB APPLICATION:", fill=(99, 102, 241), font=font_sans_sm)
    draw.text((card_x1 + 150, link_y + 52), "https://sarvam-ripple.embarko.app", fill=(26, 28, 26), font=font_mono_md)
    
    # GitHub URL Button
    draw.rounded_rectangle([card_x1 + 780, link_y, card_x2 - 120, link_y + 110], radius=16, fill=(244, 243, 241), outline=(16, 185, 129), width=2)
    draw.text((card_x1 + 810, link_y + 18), "💻 GITHUB REPOSITORY (OPEN SOURCE):", fill=(16, 185, 129), font=font_sans_sm)
    draw.text((card_x1 + 810, link_y + 52), "github.com/trivikramkalagi91-commits/Ripple", fill=(26, 28, 26), font=font_mono_md)
    
    # Embarko Banner & Hashtag
    draw.rounded_rectangle([card_x1 + 120, link_y + 140, card_x2 - 120, link_y + 240], radius=16, fill=(23, 26, 30))
    draw.text((card_x1 + 160, link_y + 165), "Built for the Deploy With Embarko Student Challenge", fill=(255, 255, 255), font=font_sans_lg)
    draw.text((card_x1 + 160, link_y + 205), "Share Tag: #DeployWithEmbarko  •  Duration: 45s  •  Powered by FalkorDB + MCP", fill=(52, 211, 153), font=font_mono_sm)
    
    # Copyright & Audio License Compliance Footnote (Meets Section 4)
    draw.text((card_x1 + 120, link_y + 270), "Music: 'Happy Beats / Business Moves' by Sascha Ende, ende.app (CC BY 4.0 Standard License) — Fully Licensed & Attributed", fill=(116, 120, 120), font=font_sans_sm)
    
    return img

def get_frame(i):
    t = i / FPS
    if t < 8.0:
        return render_scene_1(t, i)
    elif t < 17.0:
        return render_scene_2(t, i)
    elif t < 28.0:
        return render_scene_3(t, i)
    elif t < 38.0:
        return render_scene_4(t, i)
    else:
        return render_scene_5(t, i)

def main():
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    print(f"Starting render of {TOTAL_FRAMES} frames ({TOTAL_SECONDS}s @ {FPS}fps)...", flush=True)
    
    # First, render and save poster frame from Scene 5 (settled at t=41.0s, frame 1230)
    poster_frame_idx = int(41.0 * FPS)
    poster_img = get_frame(poster_frame_idx)
    poster_img.save(OUTPUT_POSTER, "JPEG", quality=95)
    print(f"Poster frame saved to: {OUTPUT_POSTER}", flush=True)
    
    # Start ffmpeg process reading raw frames from stdin
    # Fade music out smoothly over the last 1.5 seconds
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",  # Video from stdin
        "-i", MUSIC_PATH,  # Audio track
        "-filter_complex", "[1:a]afade=t=out:st=43.5:d=1.5[a]",
        "-map", "0:v",
        "-map", "[a]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-crf", "19",
        "-t", str(TOTAL_SECONDS),
        OUTPUT_VIDEO
    ]
    
    log_path = os.path.join(WORK_DIR, "ffmpeg.log")
    with open(log_path, "w", encoding="utf-8") as f_err:
        proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=f_err)
        
        start_time = time.time()
        for i in range(TOTAL_FRAMES):
            if i == 0:
                # Bake poster frame as frame 0 for guaranteed social media thumbnail preview
                frame_img = poster_img
            else:
                frame_img = get_frame(i)
                
            raw_bytes = frame_img.tobytes()
            try:
                proc.stdin.write(raw_bytes)
            except BrokenPipeError:
                print(f"Broken pipe at frame {i}", flush=True)
                break
                
            if i % 150 == 0 or i == TOTAL_FRAMES - 1:
                elapsed = time.time() - start_time
                fps_speed = (i + 1) / max(0.001, elapsed)
                print(f"Rendered frame {i+1}/{TOTAL_FRAMES} ({((i+1)/TOTAL_FRAMES)*100:.1f}%) @ {fps_speed:.1f} fps", flush=True)
                
        proc.stdin.close()
        proc.wait()
    
    if proc.returncode != 0:
        print("FFmpeg error:", stderr.decode("utf-8", errors="ignore"))
        sys.exit(1)
        
    print(f"Video successfully rendered to: {OUTPUT_VIDEO}")
    total_time = time.time() - start_time
    print(f"Finished in {total_time:.2f}s ({TOTAL_FRAMES / total_time:.1f} fps)")

if __name__ == "__main__":
    main()
