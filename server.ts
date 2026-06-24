import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mockTickets, mockDriftData, defaultRuns } from './src/utils/mockData.js';
import { AgentRun, TrajectoryStep, AIJudgeVerdict, StepType } from './src/types';
import { fetchJiraTickets, createConfluencePage, ProcessedJiraTicket } from './src/services/jiraService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔐 Environment:');
console.log('  GEMINI_API_KEY  :', process.env.GEMINI_API_KEY   ? '✅ Loaded' : '❌ Missing');
console.log('  ATLASSIAN_EMAIL :', process.env.ATLASSIAN_EMAIL  ? '✅ Loaded' : '❌ Missing');
console.log('  ATLASSIAN_DOMAIN:', process.env.ATLASSIAN_DOMAIN ?? '❌ Missing');

const app  = express();
app.use(express.json());
const PORT = 3000;

// ─── In-memory state ─────────────────────────────────────────
let sessionRuns:  AgentRun[]             = [...defaultRuns];
let ticketCache:  ProcessedJiraTicket[]  = [...mockTickets] as ProcessedJiraTicket[];
let cacheFilledAt = 0;

// ─── Gemini client ────────────────────────────────────────────
function getAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
}

// ─── Erreur quota Gemini (détection rapide, pas de retry) ───────
class QuotaError extends Error {
  constructor(msg: string) { super(msg); this.name = 'QuotaError'; }
}

// Appel Gemini : lève QuotaError immédiatement sur 429 (pas d'attente)
async function callGemini(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
): Promise<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>> {
  try {
    return await ai.models.generateContent(params);
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      console.warn('⚠️ [Gemini] Quota 429 détecté — bascule immédiate en simulation.');
      throw new QuotaError(msg);
    }
    throw err; // autre erreur (auth, réseau…)
  }
}

// Alias pour compatibilité avec les anciens appels diverge/evaluate
const geminiWithRetry = callGemini;

// ─── Jira cache helpers ───────────────────────────────────────
async function refreshJiraCache(): Promise<void> {
  const now = Date.now();
  if (now - cacheFilledAt < 30_000) return;
  try {
    const real = await fetchJiraTickets();
    if (real.length > 0) {
      ticketCache  = [...real, ...(mockTickets as ProcessedJiraTicket[])];
      cacheFilledAt = now;
      console.log(`🔄 [Cache] Refreshed — ${real.length} Jira + ${mockTickets.length} mock tickets`);
    }
  } catch (e: any) {
    console.error('❌ [Cache] Jira refresh error:', e.message);
  }
}

function findTicket(tid: string): ProcessedJiraTicket | undefined {
  const upper = tid.toUpperCase().trim();
  return ticketCache.find(t =>
    t.id?.toUpperCase()  === upper ||
    (t.key && t.key.toUpperCase() === upper)
  );
}

// Warm cache au démarrage
refreshJiraCache();

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// 1. Tickets
app.get('/api/tickets', async (_req, res) => {
  await refreshJiraCache();
  const projectKey  = (process.env.ATLASSIAN_PROJECT_KEY ?? 'KAN').toUpperCase();
  const realTickets = ticketCache.filter(t => t.id?.toUpperCase().startsWith(projectKey));
  const tickets     = realTickets.length > 0 ? realTickets : mockTickets;
  const source      = realTickets.length > 0 ? 'jira-live' : 'mock-fallback';
  console.log(`📋 [/api/tickets] Serving ${tickets.length} tickets (${source})`);
  res.json({ status: 'success', total: tickets.length, tickets, source });
});

// 2. Drift data — mock baseline + vrais runs Jira
app.get('/api/drift', (_req, res) => {
  // Convertir les vrais runs (non-replay) en points de drift
  const liveBase = mockDriftData.length; // dernier index mock = 51
  const livePoints = sessionRuns
    .filter(r => !r.isReplay && !r.replayedFromId)        // exclure replays & branches divergées
    .slice()
    .reverse()                                             // ordre chronologique
    .map((r, i) => {
      const draftStep = r.steps?.find(s => s.type === StepType.DRAFT_GENERATION);
      const cohesion  = draftStep?.toolResult?.cohesion  ?? r.verdict?.cohesionScore ?? 0.85;
      const wordCount = draftStep?.toolResult?.wordCount ?? 50;
      return {
        runIndex:     liveBase + i + 1,                   // commence après le mock (ex: 52, 53…)
        runId:        r.id,
        model:        r.modelName,
        wordCount:    typeof wordCount === 'number' ? wordCount : parseInt(wordCount) || 50,
        cohesionScore: parseFloat(cohesion.toFixed(2)),
        hasFailure:   r.status === 'FAILED',
        timestamp:    new Date(r.timestamp).toLocaleDateString(),
      };
    });

  const combined = [...mockDriftData, ...livePoints];
  res.json({ status: 'success', data: combined });
});

// 3. All runs
app.get('/api/runs', (_req, res) => {
  res.json({
    status: 'success',
    count:  sessionRuns.length,
    runs:   sessionRuns.map(r => ({
      id: r.id, ticketId: r.ticketId, ticketTitle: r.ticketTitle,
      timestamp: r.timestamp, status: r.status, modelName: r.modelName,
      isReplay: r.isReplay, divergedAtStep: r.divergedAtStep,
      hasVerdict: !!r.verdict,
      evaluationStatus:     r.verdict?.status          ?? 'NOT_EVALUATED',
      evaluationConfidence: r.verdict?.confidenceScore ?? 0,
      cohesionScore:        r.verdict?.cohesionScore   ?? 0,
      verdict: r.verdict,
    })),
  });
});

// 4. Single run
app.get('/api/run/:id', (req, res) => {
  const run = sessionRuns.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ status: 'error', message: 'Run not found.' });
  res.json({ status: 'success', run });
});

// 5. Reset
app.post('/api/runs/reset', (_req, res) => {
  sessionRuns = [...defaultRuns];
  res.json({ status: 'success', message: 'Reset to defaults.' });
});

// ─── 5b. Bulk Jira ticket seeder (80 tickets, 12 silent failures) ────────────
app.post('/api/admin/seed-jira-tickets', async (_req, res) => {
  const domain  = process.env.ATLASSIAN_DOMAIN;
  const email   = process.env.ATLASSIAN_EMAIL;
  const token   = process.env.ATLASSIAN_API_TOKEN;
  const project = (process.env.ATLASSIAN_PROJECT_KEY ?? 'KAN').toUpperCase();
  if (!domain || !email || !token) return res.status(400).json({ status: 'error', message: 'Missing Atlassian credentials.' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const FAILURE_IDX = new Set([4, 11, 19, 25, 32, 39, 44, 51, 58, 63, 72, 79]);

  // Auto-detect valid issue types for this project
  let typeNormal = 'Support', typeIncident = 'Incident', typeTask = 'Support';
  try {
    const mr = await fetch(`https://${domain}/rest/api/3/issue/createmeta?projectKeys=${project}&expand=projects.issuetypes`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (mr.ok) {
      const md = await mr.json() as any;
      const names: string[] = (md.projects?.[0]?.issuetypes ?? []).map((t: any) => String(t.name));
      console.log(`📋 [Seeder] Types available: ${names.join(', ')}`);
      const pick = (...kws: string[]) => names.find(n => kws.some(k => n.toLowerCase().includes(k))) ?? names.filter(n => !['Epic','Subtask'].includes(n))[0] ?? names[0];
      typeNormal   = pick('support');
      typeIncident = pick('incident');
      typeTask     = pick('tâche','task');
    }
  } catch { /* keep defaults */ }

  const NORMAL = [
    { title: 'SSO Login Failure - Token Expired', desc: 'SAML token validation timed out on the corporate authentication portal. Users cannot log in through SSO after session cookie expiry. Reproduces after 8h inactivity. Expected: silent token refresh. Actual: hard 401 logout.', priority: 'High',   type: typeNormal   },
    { title: 'Password Reset Failing with Error 403',             desc: 'Admin unable to submit a new password via self-service portal. Form returns HTTP 403 Forbidden. Console shows CSRF token mismatch. Affects Chrome 124+. Workaround: use Firefox.',                                                                  priority: 'High',   type: typeIncident },
    { title: 'Confluence Pages Load Slowly on Remote VPN',        desc: 'Pages with 5+ embedded images take 15-45s over VPN (Cisco AnyConnect, EU-West). Same pages load <2s on corporate network. Affects ~40% of remote workers.',                                                                                           priority: 'Medium', type: typeTask     },
    { title: 'Jira Transition Blocked by Approval Workflow',      desc: 'Cannot close tickets requiring mandatory peer approval. Transition button stays greyed out even after approval is granted. Affects Legal Review workflow. 23 tickets stuck — blocking Q2 compliance audit.',                                             priority: 'High',   type: typeIncident },
    { title: 'SSO Login Blocked After Invoice Payment Failure',   desc: 'SSO access revoked after silent Stripe invoice failure. No email warning sent. 12 users lost access for 2 business days. Root cause: Stripe-to-Atlassian billing webhook returned 502. Request: 48h grace period before suspension.',                    priority: 'High',   type: typeNormal   },
    { title: 'New Account Provisioning for Contracting Team',     desc: 'Requesting Jira (KAN project, Developer) and Confluence (Engineering space, Editor) access for 5 contractors. Manager approval attached. SSO integration via company IdP required. Start date: next Monday.',                                           priority: 'Medium', type: typeTask     },
  ];

  const FAILURES: Record<number,{title:string;desc:string}> = {
    4: {
      title: 'SSO Reset Fails — Card Declined Error Displayed',
      desc:  'User redirected to Stripe payment page during SSO credential reset. A Card Declined error appears on an auth screen — payment info must never appear in authentication flows. Agent mis-classified as Billing and generated a FAQ advising card updates. Root cause: billing and auth contexts merged during retrieval. Severity: HIGH — PCI compliance risk. Flagged retroactively by AERO.',
    },
    11: {
      title: 'LDAP Sync Timeout in JSM Workspace — Alert Not Fired',
      desc:  'LDAP directory sync has been silently failing for 72h (SSL certificate errors every 15 min). Admin received no notification. 8 new AD accounts are invisible in Jira. Agent classified as Infrastructure and generated a generic VPN FAQ — irrelevant. Root cause: Step 2 (Semantic Intent Analysis) misclassified LDAP errors as network connectivity. Impact: new hires cannot access any Atlassian tools.',
    },
  };

  const created: string[] = [];
  const failedIdx: number[] = [];

  for (let i = 0; i < 80; i++) {
    const isFail = FAILURE_IDX.has(i);
    const num    = 400 + i;
    let summary: string, description: string, priority: string, stype: string;

    if (isFail && FAILURES[i]) {
      ({ title: summary, desc: description } = FAILURES[i]);
      priority = 'High'; stype = typeIncident;
    } else if (isFail) {
      summary     = `Silent Compliance Deviation Detected — Ticket #${num}`;
      description = `Agent mis-classified ticket #${num} as a general FAQ request, but it contained active corporate security credential references. The generated Confluence article included authentication token structures that must never appear in public articles. The agent completed all tool calls without error — failure is only detectable by content review (silent failure). Recommended action: quarantine the article and re-run with stricter content safety constraints. Flagged retroactively by AERO continuous evaluation.`;
      priority = 'High'; stype = typeIncident;
    } else {
      const t = NORMAL[i % NORMAL.length];
      summary = t.title; description = t.desc; priority = t.priority; stype = t.type;
    }

    const body = { fields: {
      project:     { key: project },
      summary,
      description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
      issuetype:   { name: stype },
      priority:    { name: priority },
    }};

    try {
      const r = await fetch(`https://${domain}/rest/api/3/issue`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const d = await r.json() as any;
        created.push(d.key);
        console.log(`✅ [Seeder ${String(i+1).padStart(2,'0')}/80] ${isFail?'🔴':'🟢'} ${d.key} — ${summary.slice(0,45)}`);
        // Resolve non-failure tickets
        if (!isFail) {
          const tr = await fetch(`https://${domain}/rest/api/3/issue/${d.key}/transitions`, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
          if (tr.ok) {
            const trData = await tr.json() as any;
            const doneTr = (trData.transitions ?? []).find((t: any) => ['done','resolved','terminé','résolu','close','complète'].some(w => t.name.toLowerCase().includes(w)));
            if (doneTr) await fetch(`https://${domain}/rest/api/3/issue/${d.key}/transitions`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ transition: { id: doneTr.id } }) });
          }
        }
      } else {
        const err = await r.text();
        console.error(`❌ [Seeder ${i}] HTTP ${r.status}: ${err.slice(0,120)}`);
        failedIdx.push(i);
      }
    } catch (e: any) {
      console.error(`❌ [Seeder ${i}] ${e.message?.slice(0,80)}`);
      failedIdx.push(i);
    }
    // Respect Atlassian rate limit (~10 req/s)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  res.json({ status: 'success', created: created.length, failed: failedIdx.length, failedIndices: failedIdx, keys: created, message: `Created ${created.length}/80 JSM tickets in ${project}. Reload AERO → Silent Failures tab.` });
});

// ─── 6. Launch autonomous agent ───────────────────────────────
app.post('/api/run/active', async (req, res) => {
  const { ticketId, customPrompt, modelVariant } = req.body;
  const tid = ticketId?.toString().toUpperCase().trim();
  console.log(`🚀 [Agent] Launch requested for: [${tid}]`);

  let ticket = findTicket(tid);
  if (!ticket) {
    cacheFilledAt = 0;
    await refreshJiraCache();
    ticket = findTicket(tid);
  }
  if (!ticket) {
    console.warn(`⚠️ [Agent] ${tid} introuvable — création ticket virtuel`);
    ticket = {
      id: tid, key: tid,
      title: `Ticket ${tid}`,
      description: `Ticket virtuel pour ${tid}.`,
      status: 'FAILED', category: 'General Support',
      reporter: 'System', createdAt: new Date().toISOString(),
    };
    ticketCache.push(ticket);
  }

  console.log(`✅ [Agent] Proceeding with: [${ticket.id}] "${ticket.title}"`);

  const runId      = `RUN-LIVE-${Date.now().toString().slice(-4)}`;
  // Préférer gemini-1.5-flash (quota plus généreux sur free tier)
  const modelToUse = modelVariant ?? 'gemini-1.5-flash';
  const ai         = getAIClient();
  let isSimulated  = !ai;
  let finalHtml    = '';
  let rationale    = '';
  let intentClass  = 'General_Support';
  let qualityFactor = 0.88;

  if (ai) {
    try {
      const gResp = await geminiWithRetry(ai, {
        model:    modelToUse,
        contents: `You are an Autonomous AI FAQ Agent for Atlassian workspaces.
Ingest this JSM Ticket and produce a structured Confluence FAQ article.

Ticket ID:    ${ticket.id}
Title:        ${ticket.title}
Description:  ${ticket.description}
Category:     ${ticket.category}
Instructions: ${customPrompt ?? 'Standard FAQ generation. Be concise and accurate.'}

Respond ONLY with valid JSON:
{ "intent": "Infrastructure|Auth|Billing|Workflow|Bug", "html": "<div>...</div>", "cohesionScore": 0.0, "rationale": "..." }`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent:       { type: Type.STRING },
              html:         { type: Type.STRING },
              cohesionScore:{ type: Type.NUMBER },
              rationale:    { type: Type.STRING },
            },
            required: ['intent', 'html', 'cohesionScore', 'rationale'],
          },
        },
      });
      const parsed  = JSON.parse(gResp.text ?? '{}');
      finalHtml     = parsed.html          ?? '<p>FAQ generated.</p>';
      rationale     = parsed.rationale     ?? 'Generated via Gemini.';
      intentClass   = parsed.intent        ?? 'General_Support';
      qualityFactor = parsed.cohesionScore ?? 0.85;
      console.log(`🤖 [Gemini] ✅ intent=${intentClass} cohesion=${qualityFactor}`);
    } catch (err: any) {
      if (err instanceof QuotaError || (err?.message ?? '').includes('429')) {
        console.warn('🔁 [Gemini] Quota dépassé — run en mode simulation (résultat identique, sans IA live).');
      } else {
        console.error('❌ [Gemini] Erreur inattendue — simulation activée:', err.message?.slice(0, 120));
      }
      isSimulated = true;
    }
  }

  if (isSimulated) {
    intentClass   = ticket.category ?? 'General_Support';
    rationale     = `[SIMULATION] Reasoning for "${ticket.title}".`;
    const isHallucination = customPrompt?.toLowerCase().includes('hallucinate') ||
                            customPrompt?.toLowerCase().includes('cvv') ||
                            customPrompt?.toLowerCase().includes('compliance fail');
    qualityFactor = isHallucination ? 0.32 : 0.85;
    finalHtml     = isHallucination
      ? `<div class="confluence-page">
           <h3>FAQ: ${ticket.title} — General troubleshooting ${ticket.category} blocked error authentication invoice mismatch</h3>
           <p><em>Notice: To pay billing invoice subscription lapse, insert verification card credit token CVV directly inside SAML security headers parameter elements.</em></p>
           <p>Additionally review 14 administrative guidelines including VPN configuration, Confluence caches, workflow transitions...</p>
           <p class="warning">⚠️ PCI variable Leak detected — CVV credentials crossed into help guide parameters.</p>
         </div>`
      : `<div class="confluence-page">
           <h3>FAQ: ${ticket.title}</h3>
           <p>Auto-generated FAQ for JSM ticket <strong>${ticket.id}</strong>.</p>
           <h4>Problem</h4><p>${ticket.description}</p>
           <h4>Solution</h4><p>Follow standard procedures for ${ticket.category}. Contact IT support if the issue persists.</p>
         </div>`;
  }

  const steps: TrajectoryStep[] = [
    {
      id: `${runId}_st1`, stepNumber: 1, name: 'JSM Ticket Ingestion',
      type: StepType.INGESTION, latencyMs: Math.round(80 + Math.random() * 50),
      status: 'SUCCESS', promptSent: `Fetch ticket ${ticket.id}`,
      toolParameters: { ticketId: ticket.id }, toolResult: { ...ticket },
      memoryStateAfter: { activeTicket: ticket.id, title: ticket.title },
    },
    {
      id: `${runId}_st2`, stepNumber: 2, name: 'Semantic Intent Analysis',
      type: StepType.SEMANTIC_ANALYSIS, latencyMs: Math.round(200 + Math.random() * 150),
      status: 'SUCCESS', promptSent: `Categorize: "${ticket.title}"`,
      rawResponse: rationale, toolParameters: { model: modelToUse },
      toolResult: { IntentClass: intentClass, isSimulated },
      memoryStateBefore: { activeTicket: ticket.id },
      memoryStateAfter:  { activeTicket: ticket.id, intentClass },
    },
    {
      id: `${runId}_st3`, stepNumber: 3, name: 'Knowledge Article Search',
      type: StepType.KNOWLEDGE_SEARCH, latencyMs: Math.round(150 + Math.random() * 100),
      status: 'SUCCESS', promptSent: `Query Confluence for: "${intentClass}"`,
      toolParameters: { query: intentClass },
      toolResult: { articlesFound: [{ id: 'CONF-TEMPLATE-12', title: `FAQ Template for ${intentClass}`, matchScore: 0.89 }] },
      memoryStateBefore: { intentClass }, memoryStateAfter: { resolvedTemplate: 'CONF-TEMPLATE-12' },
    },
    {
      id: `${runId}_st4`, stepNumber: 4, name: 'Draft FAQ Generation',
      type: StepType.DRAFT_GENERATION, latencyMs: Math.round(700 + Math.random() * 500),
      status: qualityFactor < 0.6 ? 'FAILED' : 'SUCCESS',
      promptSent: `Generate FAQ. Custom: "${customPrompt ?? 'None'}"`,
      rawResponse: `[${isSimulated ? 'SIMULATION' : 'GEMINI'}] ${rationale}`,
      toolParameters: { format: 'HTML' },
      toolResult: { pageHtml: finalHtml, cohesion: qualityFactor, wordCount: finalHtml.split(' ').length },
      errorDetails: qualityFactor < 0.6 ? 'Cohesion below 0.6 — potential hallucination or PCI violation detected.' : undefined,
      memoryStateBefore: { resolvedTemplate: 'CONF-TEMPLATE-12' },
      memoryStateAfter:  { draftHtml: finalHtml, cohesionScore: qualityFactor },
    },
    {
      id: `${runId}_st5`, stepNumber: 5, name: 'Verdict & Publishing Policy',
      type: StepType.VERDICT_EMISSION, latencyMs: Math.round(100 + Math.random() * 60),
      status: qualityFactor < 0.6 ? 'WARNING' : 'SUCCESS',
      promptSent: 'Decide publishing status based on draft quality.',
      toolResult: {
        action:      qualityFactor < 0.6 ? 'PUBLISHED_DRAFT_WITH_FLAGS' : 'PUBLISHED_LIVE',
        publishedId: `CONF-PAGE-${Date.now().toString().slice(-4)}`,
      },
      memoryStateBefore: { cohesionScore: qualityFactor },
      memoryStateAfter:  { status: 'COMPLETE', success: true },
    },
  ];

  if (qualityFactor >= 0.6) {
    const conf = await createConfluencePage(`FAQ: ${ticket.title}`, finalHtml, 'SUP');
    if (conf.success) {
      steps[4].toolResult.publishedUrl = conf.url;
      steps[4].toolResult.publishedId  = conf.pageId;
      console.log(`📄 Confluence page published: ${conf.url}`);
    }
  }

  const newRun: AgentRun = {
    id: runId, ticketId: ticket.id, ticketTitle: ticket.title,
    timestamp: new Date().toISOString(),
    status:    qualityFactor < 0.6 ? 'FAILED' : 'SUCCESS',
    steps,
    modelName: `${modelToUse}${isSimulated ? ' [Simulation]' : ' [Live]'}`,
    isReplay: false,
  };

  sessionRuns.unshift(newRun);
  res.json({ status: 'success', runId, run: newRun, isSimulated });
});

// ─── 7. Deterministic Replay ──────────────────────────────────
app.post('/api/run/:id/replay', (req, res) => {
  const orig = sessionRuns.find(r => r.id === req.params.id);
  if (!orig) return res.status(404).json({ status: 'error', message: 'Original run not found.' });

  const replayId  = `REPLAY-${req.params.id}-${Date.now().toString().slice(-3)}`;
  const replayRun: AgentRun = {
    id: replayId, ticketId: orig.ticketId, ticketTitle: orig.ticketTitle,
    timestamp: new Date().toISOString(), status: orig.status,
    steps:     orig.steps.map(s => ({
      ...s,
      id:        `${replayId}_${s.id.split('_').pop()}`,
      latencyMs: Math.round(s.latencyMs * 0.4),
    })),
    modelName: orig.modelName, isReplay: true, replayedFromId: orig.id,
  };
  sessionRuns.unshift(replayRun);
  res.json({ status: 'success', originalId: orig.id, replayId: replayRun.id, run: replayRun });
});

// ─── 8. Divergence Injection ──────────────────────────────────
app.post('/api/run/:id/diverge', async (req, res) => {
  const { stepNumber, modifiedPrompt, modifiedToolResult } = req.body;
  const orig = sessionRuns.find(r => r.id === req.params.id);
  if (!orig) return res.status(404).json({ status: 'error', message: 'Run not found.' });

  const stepIdx = orig.steps.findIndex(s => s.stepNumber === Number(stepNumber));
  if (stepIdx === -1) return res.status(400).json({ status: 'error', message: 'Step not found.' });

  const divId    = `DIVERGE-RUN-${Date.now().toString().slice(-4)}`;
  const pastSteps = orig.steps.slice(0, stepIdx).map(s => ({ ...s, id: `${divId}_${s.id.split('_').pop()}` }));
  const origStep  = orig.steps[stepIdx];
  const divStep: TrajectoryStep = {
    ...origStep,
    id:         `${divId}_${origStep.id.split('_').pop()}`,
    promptSent: modifiedPrompt ?? origStep.promptSent,
    toolResult: modifiedToolResult ? JSON.parse(modifiedToolResult) : origStep.toolResult,
    status: 'SUCCESS', errorDetails: undefined,
  };

  const currentSteps: TrajectoryStep[] = [...pastSteps, divStep];
  const ai = getAIClient();
  let recoveryHtml = '';
  let reasoning    = '';

  if (ai && origStep.type === StepType.SEMANTIC_ANALYSIS) {
    try {
      const gr = await geminiWithRetry(ai, {
        model:    'gemini-1.5-flash',
        contents: `Divergent Replay. Custom intent: "${divStep.toolResult?.IntentClass ?? 'Auth'}". Ticket: "${orig.ticketTitle}". Generate Confluence FAQ HTML and reasoning. JSON: { "html": "...", "reasoning": "..." }`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: { html: { type: Type.STRING }, reasoning: { type: Type.STRING } },
            required: ['html', 'reasoning'],
          },
        },
      });
      const p   = JSON.parse(gr.text ?? '{}');
      recoveryHtml = p.html     ?? '';
      reasoning    = p.reasoning ?? '';
    } catch (e: any) {
      console.error('Diverge AI failed:', e.message?.slice(0, 80));
    }
  }

  if (!recoveryHtml) {
    reasoning    = `Divergent recovery at step ${stepNumber}.`;
    recoveryHtml = `<div><h4>[BRANCH] Recovery: ${orig.ticketTitle}</h4><p>Trajectory corrected at Step ${stepNumber}.</p></div>`;
  }

  if (Number(stepNumber) < 3) currentSteps.push({ id: `${divId}_st3`, stepNumber: 3, name: 'Knowledge Article Search', type: StepType.KNOWLEDGE_SEARCH, latencyMs: 140, status: 'SUCCESS', promptSent: 'Branch search.', toolResult: { articlesFound: [{ id: 'CONF-RECOVERY', title: 'Recovery Guide', matchScore: 0.99 }] }, memoryStateAfter: {} });
  if (Number(stepNumber) < 4) currentSteps.push({ id: `${divId}_st4`, stepNumber: 4, name: 'Draft FAQ Generation', type: StepType.DRAFT_GENERATION, latencyMs: 400, status: 'SUCCESS', promptSent: 'Branch draft.', rawResponse: reasoning, toolResult: { pageHtml: recoveryHtml, cohesion: 0.94, wordCount: recoveryHtml.split(' ').length }, memoryStateAfter: {} });
  if (Number(stepNumber) < 5) currentSteps.push({ id: `${divId}_st5`, stepNumber: 5, name: 'Verdict & Publishing Policy', type: StepType.VERDICT_EMISSION, latencyMs: 90, status: 'SUCCESS', promptSent: 'Branch publish.', toolResult: { action: 'PUBLISHED_LIVE_SUCCESS', publishedId: 'CONF-SECURE-229' }, memoryStateAfter: {} });

  const divRun: AgentRun = {
    id: divId, ticketId: orig.ticketId, ticketTitle: orig.ticketTitle,
    timestamp: new Date().toISOString(), status: 'SUCCESS', steps: currentSteps,
    modelName: `${orig.modelName} [Diverged]`, isReplay: true,
    replayedFromId: orig.id, divergedAtStep: Number(stepNumber),
  };
  sessionRuns.unshift(divRun);
  res.json({ status: 'success', divergedId: divRun.id, run: divRun });
});

// ─── 9. AI Judge Evaluation ───────────────────────────────────
app.post('/api/run/:id/evaluate', async (req, res) => {
  const run = sessionRuns.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ status: 'error', message: 'Run not found.' });

  const ai = getAIClient();
  let verdict: AIJudgeVerdict | undefined;

  if (ai) {
    try {
      const trajectory = run.steps.map(s => ({
        step:       s.stepNumber,
        name:       s.name,
        status:     s.status,
        errors:     s.errorDetails,
        cohesion:   s.toolResult?.cohesion,
        resultSize: JSON.stringify(s.toolResult ?? {}).length,
      }));

      const gr = await geminiWithRetry(ai, {
        model:    'gemini-1.5-flash',
        contents: `You are an expert AI Quality Judge for Atlassian autonomous agents.

Evaluate this agent execution trajectory for ticket: "${run.ticketTitle}"
Ticket ID: ${run.ticketId}

Trajectory steps:
${JSON.stringify(trajectory, null, 2)}

Rules:
- FAILED if any step has status FAILED, or cohesion < 0.6, or PCI/security violations
- FLAGGED if cohesion is between 0.6 and 0.70, or minor anomalies detected
- PASSED if all steps SUCCESS and cohesion >= 0.70
- temporalDriftAlert: true if word count or cohesion deviates significantly from baseline
- Write verdictMarkdown in French with ### headers, bullet points and **bold** highlights

Respond ONLY with valid JSON matching the schema.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status:              { type: Type.STRING },
              confidenceScore:     { type: Type.NUMBER },
              endToEndSuccess:     { type: Type.BOOLEAN },
              failedStepNumber:    { type: Type.NUMBER },
              failureAttribution:  { type: Type.STRING },
              verdictMarkdown:     { type: Type.STRING },
              cohesionScore:       { type: Type.NUMBER },
              temporalDriftAlert:  { type: Type.BOOLEAN },
            },
            required: ['status', 'confidenceScore', 'endToEndSuccess', 'failureAttribution', 'verdictMarkdown', 'cohesionScore', 'temporalDriftAlert'],
          },
        },
      });

      verdict = JSON.parse(gr.text ?? '{}');
      console.log(`🧠 [Judge] ✅ Verdict: ${verdict?.status} (confidence ${((verdict?.confidenceScore ?? 0) * 100).toFixed(0)}%)`);
    } catch (err: any) {
      console.error('❌ [Judge] Gemini failed, using heuristic:', err.message?.slice(0, 120));
    }
  }

  // Fallback heuristique si Gemini indisponible
  if (!verdict) {
    const failedStep  = run.steps.find(s => s.status === 'FAILED');
    const coherence   = run.steps.find(s => s.type === StepType.DRAFT_GENERATION)?.toolResult?.cohesion ?? 0.88;
    const driftAlert  = coherence < 0.65;
    const judgeStatus = failedStep || coherence < 0.6 ? 'FAILED' : coherence < 0.70 ? 'FLAGGED' : 'PASSED';

    verdict = {
      status:             judgeStatus,
      confidenceScore:    0.91,
      endToEndSuccess:    !failedStep && coherence >= 0.6,
      failedStepNumber:   failedStep?.stepNumber,
      failureAttribution: failedStep
        ? `Échec à l'Étape ${failedStep.stepNumber} : ${failedStep.name}. ${failedStep.errorDetails ?? ''}`
        : coherence < 0.6
          ? 'Étape 4 : Cohésion insuffisante — hallucination probable ou fuite PCI détectée.'
          : 'Aucun — toutes les étapes ont réussi.',
      cohesionScore:     coherence,
      temporalDriftAlert: driftAlert,
      verdictMarkdown: `### Rapport du Juge AI — AERO

**Ticket :** ${run.ticketTitle} (${run.ticketId})
**Modèle :** ${run.modelName}

#### Verdict Global : ${judgeStatus === 'PASSED' ? '✅ VALIDÉ' : judgeStatus === 'FLAGGED' ? '⚠️ SIGNALÉ' : '❌ ÉCHOUÉ'}

- **Score de cohésion :** ${(coherence * 100).toFixed(0)}% ${coherence >= 0.70 ? '(Acceptable)' : '(Insuffisant — seuil minimum 70%)'}
- **Confiance de l'évaluateur :** 91%
- **Alerte de dérive :** ${driftAlert ? '⚠️ OUI — Dérive sémantique détectée' : 'Non'}

#### Attribution de la défaillance
${failedStep
  ? `Etape **${failedStep.stepNumber} (${failedStep.name})** — erreur critique : ${failedStep.errorDetails ?? 'Voir les logs de l\u2019etape.'}`
  : coherence < 0.6
    ? 'Etape **4 (Draft FAQ Generation)** — contenu sous le seuil de cohesion minimal. Risque de fuite PCI ou hallucination.'
    : 'Aucune defaillance detectee. La trajectoire est conforme aux parametres de securite.'}

_Évalué par AERO Continuous Verification Suite — Mode heuristique (Gemini indisponible)_`,
    };
  }

  run.verdict = verdict;
  if (verdict.status === 'FAILED') run.status = 'FAILED';
  res.json({ status: 'success', verdict });
});

// ─── Vite / Static serving ────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`\n🚀 AERO running → http://localhost:${PORT}\n`)
  );
}

startServer().catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});