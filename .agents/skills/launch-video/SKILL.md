---
name: launch-video
description: Create slick, high-energy launch, demo, and brag videos for projects, web apps, repositories, and hackathons (e.g. Embarko Challenge, Product Hunt, X/Twitter, LinkedIn). Use whenever the user asks to create a video, make a launch video, /brag, generate a promo or showcase video, or turn their repository or website into a video.
---

# Launch Video Generator

Turn any project, repository, or website into an engaging, high-production launch video complete with motion graphics, animated typography, UI breakdowns, synchronized soundtrack, poster frame, and social media share copy.

## Workflow Summary

1. **Inspect**: Read the project's brand identity, title, tagline, key features, logos, live deployment URLs, and repository details.
2. **Plan (`brag-plan.md`)**: Define the 5-scene narrative arc, pacing, target duration (e.g., 45s for Embarko Challenge or 20s for X/Twitter), and audio cues.
3. **Execute**: Run `render_video.py` to composite frames and stream directly to FFmpeg.
4. **Deliver**: Ensure `brag-output/brag.mp4`, `brag-output/brag.jpg` (baked into Frame 0), and `brag-output/share-copy.txt` are created.

## How to Run

Execute the bundled Python script:

```powershell
python .agents/skills/launch-video/scripts/render_video.py `
  --project-name "Ripple" `
  --tagline "Dependency Graph Intelligence for AI Coding Agents" `
  --live-url "https://sarvam-ripple.embarko.app" `
  --repo-url "github.com/trivikramkalagi91-commits/Ripple" `
  --hashtag "#DeployWithEmbarko" `
  --duration 45.0 `
  --output-dir "brag-output"
```

### Parameters

- `--project-name`: Name of the product or tool (e.g., `Ripple`).
- `--tagline`: Punchy one-line value proposition.
- `--live-url`: Deployed live application URL (e.g., Embarko, Vercel, Netlify).
- `--repo-url`: GitHub or GitLab repository link.
- `--hashtag`: Event or challenge tag (e.g., `#DeployWithEmbarko`).
- `--duration`: Total video duration in seconds (defaults to `45.0` to meet Embarko's 40s–3m rule).
- `--output-dir`: Output folder (defaults to `brag-output`).
- `--logo-1`, `--logo-2`, `--logo-3`: Paths to project logos or badges.

## Narrative Structure

- **Scene 1 (Hook / Problem)**: Illustrate the user pain point (e.g., IDE diff causing broken consumers, grep failing to detect dependencies).
- **Scene 2 (The Solution)**: Floating 3D/brand logo reveal, core tech pillars, and performance metrics (e.g., `<5ms` graph traversal).
- **Scene 3 (Product in Action)**: Interactive terminal/agent chat showing tool execution, topological sort, and live color-coded Mermaid flow.
- **Scene 4 (Deployment Showcase)**: Cloud hosting card, live status badge (`LIVE` indicator), and edge hosting performance.
- **Scene 5 (Outro & Call to Action)**: Dual logo lockup, clickable live URLs, repository links, challenge tags, and CC BY 4.0 music attribution.

## Deliverables Checklist

- `brag-output/brag.mp4`: 1080p landscape (1920×1080) at 30fps.
- `brag-output/brag.jpg`: Strongest settled frame baked into Frame 0.
- `brag-output/share-copy.txt`: 1–3 postable paragraphs tailored for X/Twitter and LinkedIn.
- `brag-output/brag-plan.md`: Storyboard and timing reference.
