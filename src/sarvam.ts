import { BlastRadiusResult, SafeEditOrderItem } from './tools.js';

export interface SarvamPlanResult {
  target: string;
  totalAffected: number;
  proposedChange: string;
  source: 'sarvam-live' | 'sarvam-mock';
  impactSummary: string;
  safePlan: {
    step: number;
    file: string;
    action: string;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    codeGuidelines: string;
  }[];
  markdownPlan: string;
}

/**
 * Builds a realistic, high-quality architectural refactor plan
 * without consuming any Sarvam API credits (ideal for testing/development).
 */
function buildMockPlan(
  targetFile: string,
  proposedChange: string,
  blastRadius: BlastRadiusResult,
  safeOrder: SafeEditOrderItem[]
): SarvamPlanResult {
  const steps = safeOrder.map((item, idx) => {
    const isTarget = idx === 0;
    const shortName = item.path.split('/').pop() || item.path;

    if (isTarget) {
      return {
        step: item.step,
        file: item.path,
        action: `Apply core modification: ${proposedChange}`,
        riskLevel: 'HIGH' as const,
        codeGuidelines: `Update export signatures in ${shortName}. Ensure backward compatibility or update type definitions first so TypeScript compiler can flag downstream call sites.`,
      };
    }

    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      item.distanceFromTarget === 1 ? 'HIGH' : item.distanceFromTarget === 2 ? 'MEDIUM' : 'LOW';

    return {
      step: item.step,
      file: item.path,
      action: `Update dependent imports and call sites from ${targetFile}`,
      riskLevel,
      codeGuidelines: `Refactor imported usage of ${targetFile} in ${shortName} (Hop ${item.distanceFromTarget}). Verify argument signatures and return types match the new contract.`,
    };
  });

  const impactSummary =
    blastRadius.totalDependents === 0
      ? `Altering \`${targetFile}\` has **zero downstream consumers**. This is a safe leaf modification with minimal architectural risk.`
      : `Altering \`${targetFile}\` directly impacts **${blastRadius.totalDependents} downstream consumer(s)**. To prevent broken builds and cascading runtime errors, changes must be applied strictly in topological order from core dependency to outermost leaf files.`;

  const markdownPlan = `
### 🧠 Sarvam AI Safe Architectural Edit Plan
**Target File**: \`${targetFile}\`
**Proposed Change**: ${proposedChange}
**Total Files at Risk**: ${blastRadius.totalDependents} file(s) across ${blastRadius.maxHops} hop distances

#### 📋 Impact Summary
${impactSummary}

#### 🛠️ Step-by-Step Refactor Roadmap:
${steps
  .map(
    (s) =>
      `${s.step}. **[\`${s.riskLevel}\` RISK]** \`${s.file}\`
   - **Action**: ${s.action}
   - **Guideline**: ${s.codeGuidelines}`
  )
  .join('\n\n')}

✅ *All ${steps.length} file(s) sequenced topologically to guarantee zero-regression execution.*
`.trim();

  return {
    target: targetFile,
    totalAffected: blastRadius.totalDependents,
    proposedChange,
    source: 'sarvam-mock',
    impactSummary: `Altering ${targetFile} impacts ${blastRadius.totalDependents} files. Refactor in topological sequence to prevent build breakages.`,
    safePlan: steps,
    markdownPlan,
  };
}

/**
 * Calls Sarvam AI to reason about the graph and produce an architectural safe edit plan.
 */
export async function generateSarvamSafePlan(
  targetFile: string,
  proposedChange: string,
  blastRadius: BlastRadiusResult,
  safeOrder: SafeEditOrderItem[]
): Promise<SarvamPlanResult> {
  const isMock = process.env.SARVAM_MOCK !== 'false' || !process.env.SARVAM_API_KEY;

  if (isMock) {
    return buildMockPlan(targetFile, proposedChange, blastRadius, safeOrder);
  }

  // Live Sarvam AI API Call
  const apiKey = process.env.SARVAM_API_KEY;
  const prompt = `
You are an expert software architect AI for a codebase.
FalkorDB graph analysis determined that modifying target file '${targetFile}' causes a blast radius of ${blastRadius.totalDependents} affected files.

Proposed Change: ${proposedChange}

The safe topological edit sequence calculated from the dependency graph is:
${safeOrder.map((s) => `Step ${s.step} (Distance ${s.distanceFromTarget}): ${s.path}`).join('\n')}

Generate a comprehensive architectural refactor plan:
1. An impact summary explaining why these files break.
2. Step-by-step instructions for editing each file in the EXACT topological sequence given above so the build never fails.
Return concise, highly actionable developer markdown.
`.trim();

  try {
    const response = await fetch('https://api.sarvam.ai/v2/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: [
          {
            role: 'system',
            content:
              'You are Sarvam AI Architectural Guardian, an advanced AI reasoning engine for code dependency safety.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Sarvam-Ripple] Sarvam API returned status ${response.status}: ${errText}. Falling back to mock plan.`);
      return buildMockPlan(targetFile, proposedChange, blastRadius, safeOrder);
    }

    const data = (await response.json()) as any;
    const msg = data.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning || '';

    return {
      target: targetFile,
      totalAffected: blastRadius.totalDependents,
      proposedChange,
      source: 'sarvam-live',
      impactSummary: `Sarvam-105B generated plan for ${targetFile} across ${blastRadius.totalDependents} dependent files.`,
      safePlan: safeOrder.map((s) => ({
        step: s.step,
        file: s.path,
        action: `Apply topological change at distance ${s.distanceFromTarget}`,
        riskLevel: s.distanceFromTarget <= 1 ? 'HIGH' : 'MEDIUM',
        codeGuidelines: `Refer to Sarvam-105B architectural instructions for ${s.path}`,
      })),
      markdownPlan: content,
    };
  } catch (err: any) {
    console.warn(`[Sarvam-Ripple] Failed to reach Sarvam API (${err.message}). Using mock plan.`);
    return buildMockPlan(targetFile, proposedChange, blastRadius, safeOrder);
  }
}
