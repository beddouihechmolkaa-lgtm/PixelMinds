import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { mockTickets, mockDriftData, defaultRuns, mockSuccessRun, mockFailRun, successSteps, failSteps } from './src/utils/mockData.js';
import { AgentRun, TrajectoryStep, AIJudgeVerdict, StepType } from './src/types';

const app = express();
app.use(express.json());

const PORT = 3000;

// Shared active memory of agent runs
let sessionRuns: AgentRun[] = [...defaultRuns];

// Helper to safely get Gemini SDK with custom agent-telemetry header
function getAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Get List of Tickets (Scenario A Grid Map)
app.get('/api/tickets', (req, res) => {
  res.json({
    status: 'success',
    total: mockTickets.length,
    tickets: mockTickets,
  });
});

// 2. Get Drift Historical Metrics (Scenario B Graphs)
app.get('/api/drift', (req, res) => {
  res.json({
    status: 'success',
    data: mockDriftData,
  });
});

// 3. Get All Recorded Trajectory Sessions
app.get('/api/runs', (req, res) => {
  res.json({
    status: 'success',
    count: sessionRuns.length,
    runs: sessionRuns.map(r => ({
      id: r.id,
      ticketId: r.ticketId,
      ticketTitle: r.ticketTitle,
      timestamp: r.timestamp,
      status: r.status,
      modelName: r.modelName,
      isReplay: r.isReplay,
      divergedAtStep: r.divergedAtStep,
      hasVerdict: !!r.verdict,
      evaluationStatus: r.verdict?.status || 'NOT_EVALUATED',
      evaluationConfidence: r.verdict?.confidenceScore || 0,
      cohesionScore: r.verdict?.cohesionScore || 0,
    })),
  });
});

// 4. Get a specific Run Trajectory
app.get('/api/run/:id', (req, res) => {
  const run = sessionRuns.find(r => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ status: 'error', message: 'Run trajectory session not found.' });
  }
  res.json({
    status: 'success',
    run,
  });
});

// 5. Delete or reset runs custom sessions
app.post('/api/runs/reset', (req, res) => {
  sessionRuns = [...defaultRuns];
  res.json({ status: 'success', message: 'Runs reset to default demonstration snapshots.' });
});

// 6. Use Case 3: Create and Run Autonomous Agent on Ticket
app.post('/api/run/active', async (req, res) => {
  const { ticketId, customPrompt, modelVariant } = req.body;
  const ticket = mockTickets.find(t => t.id === ticketId);
  
  if (!ticket) {
    return res.status(404).json({ status: 'error', message: 'JSM ticket reference not found.' });
  }

  const runId = `RUN-LIVE-${Date.now().toString().slice(-4)}`;
  const modelToUse = modelVariant || 'gemini-3.5-flash';
  const ai = getAIClient();

  let isSimulated = !ai;
  let finalHtml = '';
  let rationale = '';
  let intentClass = 'Auth_Issues';
  let qualityFactor = 0.88;

  // Let's call Gemini if available to make it truly full-stack autonomous
  if (ai) {
    try {
      const gResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are an Autonomous AI FAQ Agent. You are ingesting an Atlassian JSM Ticket:
        Ticket ID: ${ticket.id}
        Title: ${ticket.title}
        Description: ${ticket.description}
        Category: ${ticket.category}
        
        Optional Custom Prompt Guideline from administrator: "${customPrompt || 'None'}"
        
        Please produce:
        1. Core Intent Classification (e.g. Auth, Workflow, Infrastructure, Billing, Bug)
        2. A simulated draft Confluence FAQ HTML body (clean <div> layout with headings)
        3. A Cohesion Score (from 0.0 to 1.0 focusing on how relevant it is to the ticket without hallucinations).
        
        Respond in plain JSON formatting with fields: "intent", "html", "cohesionScore", "rationale".`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              html: { type: Type.STRING },
              cohesionScore: { type: Type.NUMBER },
              rationale: { type: Type.STRING },
            },
            required: ['intent', 'html', 'cohesionScore', 'rationale'],
          }
        }
      });

      const resText = gResponse.text || '{}';
      const parsedRes = JSON.parse(resText);
      finalHtml = parsedRes.html || '<p>Blank FAQ description.</p>';
      rationale = parsedRes.rationale || 'Generated autonomously via Gemini.';
      intentClass = parsedRes.intent || 'General_Support';
      qualityFactor = parsedRes.cohesionScore ?? 0.85;
    } catch (err: any) {
      console.error("Gemini Live Generation failed, using simulation: ", err.message);
      isSimulated = true;
    }
  }

  if (isSimulated) {
    // Elegant simulation based on input
    intentClass = ticket.category || 'General_Support';
    rationale = `Simulated reasoning chain for "${ticket.title}". Ingested successfully. Handled prompt guideline: ${customPrompt || 'Default'}.`;
    finalHtml = `<div class="confluence-page">
      <h3>FAQ: ${ticket.title} Help Guide</h3>
      <p>This FAQ page was created autonomously based on JSM ticket reference <strong>${ticket.id}</strong> reported by human client.</p>
      <div class="alert alert-info">
        <h5>Onboarding & Verification Steps:</h5>
        <p>${ticket.description}</p>
      </div>
      <p>Ensure client follows recommended procedures for ${ticket.category}. If problems persist, contact systems administration.</p>
    </div>`;
    qualityFactor = customPrompt?.toLowerCase().includes('hallucinate') ? 0.35 : 0.85;
  }

  // Construct steps
  const steps: TrajectoryStep[] = [
    {
      id: `${runId}_st1`,
      stepNumber: 1,
      name: 'JSM Ticket Ingestion',
      type: StepType.INGESTION,
      latencyMs: Math.round(80 + Math.random() * 50),
      status: 'SUCCESS',
      promptSent: `Fetch ticket data for ${ticket.id}`,
      toolParameters: { ticketId: ticket.id },
      toolResult: { ...ticket },
      memoryStateAfter: { activeTicket: ticket.id, title: ticket.title }
    },
    {
      id: `${runId}_st2`,
      stepNumber: 2,
      name: 'Semantic Intent Analysis',
      type: StepType.SEMANTIC_ANALYSIS,
      latencyMs: Math.round(200 + Math.random() * 150),
      status: 'SUCCESS',
      promptSent: `Categorize and cluster intent of: "${ticket.title}"`,
      rawResponse: rationale,
      toolParameters: { model: 'gemini-3.5-flash' },
      toolResult: { IntentClass: intentClass },
      memoryStateBefore: { activeTicket: ticket.id },
      memoryStateAfter: { activeTicket: ticket.id, intentClass }
    },
    {
      id: `${runId}_st3`,
      stepNumber: 3,
      name: 'Knowledge Article Search',
      type: StepType.KNOWLEDGE_SEARCH,
      latencyMs: Math.round(150 + Math.random() * 100),
      status: 'SUCCESS',
      promptSent: `Query Confluence templates matching: "${intentClass}"`,
      toolParameters: { query: intentClass },
      toolResult: {
        articlesFound: [
          { id: 'CONF-TEMPLATE-12', title: `FAQ Template for ${intentClass} Troubles`, matchScore: 0.89 }
        ]
      },
      memoryStateBefore: { intentClass },
      memoryStateAfter: { resolvedTemplate: 'CONF-TEMPLATE-12' }
    },
    {
      id: `${runId}_st4`,
      stepNumber: 4,
      name: 'Draft FAQ Generation',
      type: StepType.DRAFT_GENERATION,
      latencyMs: Math.round(700 + Math.random() * 500),
      status: qualityFactor < 0.6 ? 'FAILED' : 'SUCCESS',
      promptSent: `Generate high cohesive draft FAQ from JSM ticket details. Custom prompt guidelines: "${customPrompt || 'None'}"`,
      rawResponse: `Beginning draft formulation. Formulating HTML divs. Applied directive: ${customPrompt || 'standard draft'}.`,
      toolParameters: { format: 'HTML' },
      toolResult: {
        pageHtml: finalHtml,
        cohesion: qualityFactor,
        wordCount: finalHtml.split(' ').length
      },
      errorDetails: qualityFactor < 0.6 ? 'AI Gen Cohesion degraded below 0.6 threshold: Potential context cross-drift or hallucination requested.' : undefined,
      memoryStateBefore: { resolvedTemplate: 'CONF-TEMPLATE-12' },
      memoryStateAfter: { draftHtml: finalHtml, cohesionScore: qualityFactor }
    },
    {
      id: `${runId}_st5`,
      stepNumber: 5,
      name: 'Verdict & Publishing Policy',
      type: StepType.VERDICT_EMISSION,
      latencyMs: Math.round(100 + Math.random() * 60),
      status: qualityFactor < 0.6 ? 'WARNING' : 'SUCCESS',
      promptSent: 'Decide publishing status based on HTML draft quality.',
      toolResult: {
        action: qualityFactor < 0.6 ? 'PUBLISHED_DRAFT_WITH_FLAGS' : 'PUBLISHED_LIVE',
        publishedId: `CONF-PAGE-${Date.now().toString().slice(-4)}`
      },
      memoryStateBefore: { cohesionScore: qualityFactor },
      memoryStateAfter: { status: 'COMPLETE', success: true }
    }
  ];

  const newRun: AgentRun = {
    id: runId,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    timestamp: new Date().toISOString(),
    status: qualityFactor < 0.6 ? 'FAILED' : 'SUCCESS',
    steps,
    modelName: `${modelToUse} [Live run]`,
    isReplay: false
  };

  sessionRuns.unshift(newRun);
  res.json({
    status: 'success',
    runId,
    run: newRun,
    isSimulated
  });
});

// 7. Use Case 2: Step-by-Step Deterministic Replay (no live LLM used by default, just replay recorded steps)
app.post('/api/run/:id/replay', (req, res) => {
  const originalRun = sessionRuns.find(r => r.id === req.params.id);
  if (!originalRun) {
    return res.status(404).json({ status: 'error', message: 'Original run session not found.' });
  }

  // Create a duplicate replayed run snapshot in list
  const replayRunId = `REPLAY-${req.params.id}-${Date.now().toString().slice(-3)}`;
  
  // Replayed steps copy exactly the tool results to ensure absolute determinism!
  const replayedSteps = originalRun.steps.map(step => ({
    ...step,
    id: `${replayRunId}_${step.id.split('_').pop()}`,
    latencyMs: Math.round(step.latencyMs * 0.4), // Faster because it reads offline cache
  }));

  const replayedRun: AgentRun = {
    id: replayRunId,
    ticketId: originalRun.ticketId,
    ticketTitle: originalRun.ticketTitle,
    timestamp: new Date().toISOString(),
    status: originalRun.status,
    steps: replayedSteps,
    modelName: originalRun.modelName,
    isReplay: true,
    replayedFromId: originalRun.id,
  };

  sessionRuns.unshift(replayedRun);
  res.json({
    status: 'success',
    originalId: originalRun.id,
    replayId: replayedRun.id,
    run: replayedRun,
  });
});

// 8. Use Case 2: Replay with Divergence Injection (Branching execution)
app.post('/api/run/:id/diverge', async (req, res) => {
  const { stepNumber, modifiedPrompt, modifiedToolResult } = req.body;
  const originalRun = sessionRuns.find(r => r.id === req.params.id);
  
  if (!originalRun) {
    return res.status(404).json({ status: 'error', message: 'Run trajectory session not found.' });
  }

  const stepIndex = originalRun.steps.findIndex(s => s.stepNumber === Number(stepNumber));
  if (stepIndex === -1) {
    return res.status(400).json({ status: 'error', message: 'Step number specified was not found in trajectory.' });
  }

  const divergedRunId = `DIVERGE-RUN-${Date.now().toString().slice(-4)}`;

  // Construct trajectory steps up to the diverged index
  const pastSteps = originalRun.steps.slice(0, stepIndex).map(s => ({
    ...s,
    id: `${divergedRunId}_${s.id.split('_').pop()}`
  }));

  // Identify diverged step
  const origDivergedStep = originalRun.steps[stepIndex];
  
  // Apply the custom modifications
  const divergedStep: TrajectoryStep = {
    ...origDivergedStep,
    id: `${divergedRunId}_${origDivergedStep.id.split('_').pop()}`,
    promptSent: modifiedPrompt || origDivergedStep.promptSent,
    toolResult: modifiedToolResult ? JSON.parse(modifiedToolResult) : origDivergedStep.toolResult,
    status: 'SUCCESS', // Resets failure from this point of correction!
    errorDetails: undefined,
  };

  const currentSteps: TrajectoryStep[] = [...pastSteps, divergedStep];

  // From the diverged step onward, we regenerate!
  // We can call Gemini to formulate the next logic flow or simulate an adapted recovery flight.
  const ai = getAIClient();
  let finalRecoveryHtml = '';
  let finalStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
  let reasoning = '';
  let isSimulated = !ai;

  if (ai && origDivergedStep.type === StepType.SEMANTIC_ANALYSIS) {
    // If we changed semantic analysis (Step 2), we regenerate Step 4 HTML via Gemini
    try {
      const gResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `We are running a Divergent Trajectory Replay.
        At Step 2, the user injected a custom intent category override: "${divergedStep.toolResult?.IntentClass || 'Auth'}"
        
        The original ticket details:
        Title: ${originalRun.ticketTitle}
        
        Based on this custom classification category, please generate the appropriate Confluence FAQ HTML body (clean <div> layout with headings) and explain your reasoning in brief.
        
        Respond in plain JSON formatting with fields: "html", "reasoning".`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              html: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ['html', 'reasoning'],
          }
        }
      });
      const parsed = JSON.parse(gResponse.text || '{}');
      finalRecoveryHtml = parsed.html || '<p>Branch draft FAQ</p>';
      reasoning = parsed.reasoning || 'Regenerated step autonomously via Gemini.';
    } catch (err: any) {
      console.error("Divergence recovery AI call failed, using simulation: ", err.message);
      isSimulated = true;
    }
  }

  if (isSimulated || !finalRecoveryHtml) {
    // Simulation logic
    reasoning = `Divergent recovery initiated at step ${stepNumber}. Trajectory branched successfully to protect security parameters.`;
    finalRecoveryHtml = `<div class="confluence-page border border-primary p-3">
      <h4>[BRANCH REPLAY] Secure Recovery Guide: ${originalRun.ticketTitle}</h4>
      <p>This page was generated after human administrator injected a trajectory correction at Step ${stepNumber}.</p>
      <div class="p-2 bg-success bg-opacity-20 rounded">
        <strong>Verified Resolution Profile:</strong>
        <p>Credit systems reset safely. Never include credentials inside metadata objects. Redirect user to corporate secure Stripe renewal links.</p>
      </div>
    </div>`;
  }

  // Populate subsequent steps representing safe completion
  // Step 3 (Knowledge Search) subsequent adaptation
  if (stepNumber < 3) {
    currentSteps.push({
      id: `${divergedRunId}_st3`,
      stepNumber: 3,
      name: 'Knowledge Article Search',
      type: StepType.KNOWLEDGE_SEARCH,
      latencyMs: 140,
      status: 'SUCCESS',
      promptSent: 'Search articles using branched intent definitions.',
      toolResult: { articlesFound: [{ id: 'CONF-RECOVERY', title: 'SSO Payment Troubleshooting', matchScore: 0.99 }] },
      memoryStateAfter: { selectedGuide: 'CONF-RECOVERY' }
    });
  }

  // Step 4 (FAQ Synthesis) subsequent adaptation
  if (stepNumber < 4) {
    currentSteps.push({
      id: `${divergedRunId}_st4`,
      stepNumber: 4,
      name: 'Draft FAQ Generation',
      type: StepType.DRAFT_GENERATION,
      latencyMs: 400,
      status: 'SUCCESS',
      promptSent: 'Synthesize Confluence page using safe branched parameters.',
      rawResponse: reasoning,
      toolResult: {
        pageHtml: finalRecoveryHtml,
        cohesion: 0.94,
        wordCount: finalRecoveryHtml.split(' ').length
      },
      memoryStateAfter: { draftHtml: finalRecoveryHtml, cohesionScore: 0.94 }
    });
  }

  // Step 5 (Publishing) subsequent adaptation
  if (stepNumber < 5) {
    currentSteps.push({
      id: `${divergedRunId}_st5`,
      stepNumber: 5,
      name: 'Verdict & Publishing Policy',
      type: StepType.VERDICT_EMISSION,
      latencyMs: 90,
      status: 'SUCCESS',
      promptSent: 'Verify branched safety and authorize live Confluence page.',
      toolResult: { action: 'PUBLISHED_LIVE_SUCCESS', publishedId: 'CONF-SECURE-229' },
      memoryStateAfter: { finalStatus: 'CONF-SECURE-229' }
    });
  }

  const divergedRun: AgentRun = {
    id: divergedRunId,
    ticketId: originalRun.ticketId,
    ticketTitle: originalRun.ticketTitle,
    timestamp: new Date().toISOString(),
    status: 'SUCCESS', // Successfully recovered via divergence injection!
    steps: currentSteps,
    modelName: `${originalRun.modelName} [Diverged Run]`,
    isReplay: true,
    replayedFromId: originalRun.id,
    divergedAtStep: Number(stepNumber)
  };

  sessionRuns.unshift(divergedRun);
  res.json({
    status: 'success',
    divergedId: divergedRun.id,
    run: divergedRun
  });
});

// 9. Use Case 1: AI Evaluation Judge Diagnostic (End-to-End, failure attribution, cohesion, self-assessment)
app.post('/api/run/:id/evaluate', async (req, res) => {
  const run = sessionRuns.find(r => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ status: 'error', message: 'Trajectory run session not found.' });
  }

  let ai = getAIClient();
  let verdict: AIJudgeVerdict;

  if (ai) {
    try {
      const simplifiedTrajectory = run.steps.map(s => ({
        step: s.stepNumber,
        name: s.name,
        tool: s.targetTool,
        toolParams: s.toolParameters,
        resultSize: JSON.stringify(s.toolResult).length,
        status: s.status,
        errors: s.errorDetails
      }));

      const gResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are the AI Quality Judge (evaluating agent execution metrics).
        Please evaluate this trajectory run and detect silently failed behaviors, bad drafts, PCI compliance issues, or poor semantic consistency.
        
        Trajectory steps list:
        ${JSON.stringify(simplifiedTrajectory, null, 2)}
        
        Ticket context:
        Title: "${run.ticketTitle}"
        
        Please emit a structured audit verdict including:
        1. status: either "PASSED" (no fatal errors, accurate outcome), "FAILED" (silent failures, hallucinations, or step failures), or "FLAGGED" (unusual behavior)
        2. confidenceScore: self-assessment score (0.0 to 1.0) of your judging evaluation
        3. endToEndSuccess: boolean
        4. failedStepNumber: index of the step that triggered or introduced the core failure
        5. failureAttribution: a single concise sentence describing what went wrong and which component is to blame
        6. verdictMarkdown: a styled human-readable markdown breakdown (include sections like 'Core Analysis', 'PCI/Security Scan', and 'Engineering Verdict')
        7. cohesionScore: evaluate the coherence average (0.0 to 1.0) of steps
        8. temporalDriftAlert: boolean (if wordcount/coherence looks heavily misaligned)
        
        Respond in pure JSON using exactly the fields listed above.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              endToEndSuccess: { type: Type.BOOLEAN },
              failedStepNumber: { type: Type.NUMBER },
              failureAttribution: { type: Type.STRING },
              verdictMarkdown: { type: Type.STRING },
              cohesionScore: { type: Type.NUMBER },
              temporalDriftAlert: { type: Type.BOOLEAN },
            },
            required: ['status', 'confidenceScore', 'endToEndSuccess', 'failureAttribution', 'verdictMarkdown', 'cohesionScore', 'temporalDriftAlert']
          }
        }
      });

      const text = gResponse.text || '{}';
      verdict = JSON.parse(text);
    } catch (err: any) {
      console.error("Gemini AI Judge failed, falling back to heuristic diagnostics: ", err.message);
      // Fallback below
      ai = null as any; 
    }
  }

  // Purely deterministic fallback judging / default preset for preloads
  if (!ai) {
    if (run.id === 'RUN-SUCCESS-001') {
      verdict = mockSuccessRun.verdict!;
    } else if (run.id === 'RUN-FAIL-002') {
      verdict = mockFailRun.verdict!;
    } else {
      // Heuristic evaluation for custom new runs
      const failedStep = run.steps.find(s => s.status === 'FAILED');
      const coherence = run.steps.find(s => s.type === StepType.DRAFT_GENERATION)?.toolResult?.cohesion || 0.88;
      
      verdict = {
        status: failedStep || coherence < 0.60 ? 'FAILED' : 'PASSED',
        confidenceScore: 0.95,
        endToEndSuccess: !failedStep && coherence >= 0.60,
        failedStepNumber: failedStep ? failedStep.stepNumber : (coherence < 0.60 ? 4 : undefined),
        failureAttribution: failedStep 
          ? `Failure detected at Step ${failedStep.stepNumber} [${failedStep.name}].` 
          : (coherence < 0.60 ? 'Step 4: Generation wordiness and context drifted significantly.' : 'None. All steps successfully processed.'),
        cohesionScore: coherence,
        temporalDriftAlert: coherence < 0.65,
        verdictMarkdown: `### Simulated AI Judge Analysis
        
- **Status:** ${failedStep || coherence < 0.60 ? '❌ FAILED' : '✅ PASSED'}
- **Evaluator Self-Assessment Confidence:** 95%
- **Attribution details:** Active analysis checked for semantic overlap, template consistency, and prompt compliance.
        
#### Component Diagnostics:
1. **Ingest pipeline:** Complies with schema definitions.
2. **Intent classification:** Categorization was aligned to ticket patterns.
3. **Draft formulation:** ${coherence < 0.60 ? '❌ Quality score too low. High risk of confusing instructions.' : '✅ Secure and structured FAQ generated successfully.'}
        
*Evaluation performed autonomously by the AINS Continuous Verification Suite.*`
      };
    }
  }

  // Update run object with evaluation status
  run.verdict = verdict!;
  if (verdict!.status === 'FAILED') {
    run.status = 'FAILED';
  }

  res.json({
    status: 'success',
    verdict,
  });
});

// -------------------------------------------------------------
// VITE OR STATIC FILE STREAMING MIDDLEWARRE
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Configure Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving from /dist static directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AINS SERVER] running live on port http://localhost:${PORT}`);
  });
}

startServer();
