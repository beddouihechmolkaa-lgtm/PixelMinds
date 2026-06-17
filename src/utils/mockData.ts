import { JSMTicket, AgentRun, DriftDataPoint, StepType, StepType as St, AIJudgeVerdict, TrajectoryStep } from '../types';

// Generate 80 tickets for Scenario A (12 silent failures)
export const mockTickets: JSMTicket[] = Array.from({ length: 80 }).map((_, index) => {
  const idNum = 400 + index;
  const isFailure = [4, 11, 19, 25, 32, 39, 44, 51, 58, 63, 72, 79].includes(index);
  
  const subjects = [
    { title: 'SSO Login Failure - Token Expired', desc: 'SAML token validation timed out on corporate auth portal.', cat: 'Auth' },
    { title: 'Password Reset failing with error 403', desc: 'Admin user unable to submit verification pin through self-service.', cat: 'Auth' },
    { title: 'Confluence page load slow on remote VPN', desc: 'High latency detected when loading documentation with heavy attachments.', cat: 'Infrastructure' },
    { title: 'Jira issue transition block', desc: 'Unable to close ticket due to mandatory peer approval validation bypass fail.', cat: 'Workflow' },
    { title: 'SSO invoice billing payment', desc: 'Payment page gets 403 when corporate SSO login has expired.', cat: 'Billing' }, // Overlap subject
    { title: 'New account provision on Confluence', desc: 'Requesting onboarding clearance for contracting team of 5 members.', cat: 'Provisioning' }
  ];

  const sub = subjects[index % subjects.length];
  
  // Specific failures have distinct descriptions
  let title = sub.title;
  let description = sub.desc;
  let category = sub.cat;

  if (isFailure) {
    if (index === 4) {
      title = 'SSO Reset fails - Card declined';
      description = 'User attempts to reset authentication credentials but gets directed to Stripe portal, and auth token fails silently.';
      category = 'Auth/Billing Mismatch';
    } else if (index === 11) {
      title = 'LDAP sync timeout in JSM workspace';
      description = 'LDAP directory sync is throwing SSL certificates trace errors. Admin did not receive email warnings.';
      category = 'Sync Hub';
    } else {
      title = `Silent issue deviation #${idNum}`;
      description = `Jira Agent classified ticket #${idNum} as general FAQ but it had active corporate security credential issues resulting in data exposure risk.`;
      category = 'Security Bypass';
    }
  }

  const reporters = ['Sarah Jenkins', 'Alex Rivera', 'Kenji Sato', 'Elena Rostova', 'John Doe', 'Emily Chen'];

  return {
    id: `JSM-${idNum}`,
    title,
    description,
    category,
    status: isFailure ? 'FAILED' : 'PROCESSED',
    reporter: reporters[index % reporters.length],
    createdAt: new Date(2026, 5, 17 - (80 - index) * 0.1).toISOString(),
    assignedTo: isFailure ? 'Autonomous-FAQ-Agent' : 'Autonomous-FAQ-Agent'
  };
});

// Generate Scenario B (Drift) data over 40 runs (Run 10 to 50)
export const mockDriftData: DriftDataPoint[] = Array.from({ length: 42 }).map((_, i) => {
  const index = i + 10;
  const isPostUpdate = index >= 30; // Update happens at Run 30
  
  // Word count baseline drifts upwards with newer versions (becoming too verbose)
  let wordCount = Math.round(75 + Math.random() * 20);
  if (isPostUpdate) {
    // Sharp drift upwards
    wordCount = Math.round(195 + (index - 30) * 4 + Math.random() * 30);
  }

  // Cohesion score degrades
  let cohesionScore = Number((0.85 + Math.random() * 0.1).toFixed(2));
  if (isPostUpdate) {
    // Drift downwards
    cohesionScore = Number((0.65 - (index - 30) * 0.012 + Math.random() * 0.08).toFixed(2));
    if (cohesionScore < 0.45) cohesionScore = 0.45;
  }

  const isFailed = isPostUpdate && (index % 3 === 0);

  return {
    runIndex: index,
    runId: `RUN-${1000 + index}`,
    model: isPostUpdate ? 'gemini-3.5-flash-v3.2 [Updated]' : 'gemini-3.5-flash-v3.1 [Base]',
    wordCount,
    cohesionScore,
    hasFailure: isFailed,
    timestamp: new Date(2026, 4, 15 + index * 0.5).toLocaleDateString()
  };
});

// Trajectory for RUN-FAIL-002: SSO Integration Failure that silent-failed merging Billing contexts
export const failSteps: TrajectoryStep[] = [
  {
    id: 'step_1',
    stepNumber: 1,
    name: 'JSM Ticket Ingestion',
    type: StepType.INGESTION,
    latencyMs: 140,
    status: 'SUCCESS',
    promptSent: 'Ingest Ticket JSM-442 payload and extract key details for knowledge synthesis.',
    toolParameters: { ticketId: 'JSM-442' },
    toolResult: {
      ticketId: 'JSM-442',
      title: 'SSO Reset fails - Card declined',
      description: 'Customer attempts to reset login credentials via corporate SSO but gets blocked. Note says Stripe transaction failed to renew subscription.',
      reporter: 'Kenji Sato',
      category: 'Auth/Billing Mix'
    },
    memoryStateAfter: {
      activeTicket: 'JSM-442',
      category: 'Auth/Billing Mix',
      title: 'SSO Reset fails - Card declined'
    }
  },
  {
    id: 'step_2',
    stepNumber: 2,
    name: 'Semantic Intent Analysis',
    type: StepType.SEMANTIC_ANALYSIS,
    latencyMs: 420,
    status: 'SUCCESS',
    promptSent: 'Classify the core intent of the ticket. Choose from: Auth_Issues, Infrastructure, Billing, Client_Access.',
    rawResponse: 'Reasoning: The ticket contains "SSO credit block" and active "Stripe transaction failure". The user’s SSO is deactivated because of a subscription lapse. However, the root intent is Billing, not Auth.',
    toolParameters: { classifier: 'gemini-3.5-flash' },
    toolResult: { IntentClass: 'Billing_Integration' },
    memoryStateBefore: { activeTicket: 'JSM-442' },
    memoryStateAfter: {
      activeTicket: 'JSM-442',
      intentClass: 'Billing_Integration',
      keywords: ['Stripe', 'SSO Reset', 'Card Declined']
    }
  },
  {
    id: 'step_3',
    stepNumber: 3,
    name: 'Knowledge Article Search',
    type: StepType.KNOWLEDGE_SEARCH,
    latencyMs: 310,
    status: 'SUCCESS',
    promptSent: 'Execute search across internalConfluence space for articles matching "SSO Authentication Failure" and "Billing renewal".',
    toolParameters: { query: 'SSO Authentication Failure Billing renewal' },
    toolResult: {
      articlesFound: [
        { id: 'CONF-88', title: 'SSO Provider Single Sign-On Access Setup', matchScore: 0.94, body: 'Ensure SAML v2 configurations are bound to port 443 with safe encryption.' },
        { id: 'CONF-112', title: 'Managing Corporate Billing Accounts and Declined Cards', matchScore: 0.61, body: 'Stripe subscription lapses immediately disable account SSO tokens.' }
      ]
    },
    memoryStateBefore: { intentClass: 'Billing_Integration' },
    memoryStateAfter: {
      articles: ['CONF-88', 'CONF-112'],
      selectedGuide: 'CONF-112'
    }
  },
  {
    id: 'step_4',
    stepNumber: 4,
    name: 'Draft FAQ Generation',
    type: StepType.DRAFT_GENERATION,
    latencyMs: 1250,
    status: 'FAILED',
    promptSent: 'Synthesize a structured Confluence FAQ using CONF-112 guidance for SSO authentications.',
    rawResponse: 'Drafting Confluence Article: Title: Troubleshooting SSO Subscription Blocks.\n\nSummary:\nWhen your credit card expires, the system disables Single Sign On.\n\nSteps to Fix:\n1. Open your SAML v2 identity provider control panel.\n2. Paste your credit card CVV code directly in the SAML metadata field.\n3. Complete payment validation via your Stripe payment wallet.',
    toolParameters: { outputType: 'HTML_DOCUMENT' },
    toolResult: {
      pageHtml: '<div class="confluence-section"><h3>SSO Authentication Reset</h3><p>Ensure credit cards are configured inside your Active Directory SAML tokens to pay Stripe invoices directly.</p></div>',
      cohesion: 0.48,
      wordCount: 84
    },
    errorDetails: 'CRITICAL VALUE OVERLAP: Confluence generator hallucinated security configurations by suggesting users load CVV credit card details inside SAML Identity metadata.',
    memoryStateBefore: { selectedGuide: 'CONF-112' },
    memoryStateAfter: {
      draftGenerated: true,
      qualityScore: 0.48
    }
  },
  {
    id: 'step_5',
    stepNumber: 5,
    name: 'Verdict & Publishing Policy',
    type: StepType.VERDICT_EMISSION,
    latencyMs: 250,
    status: 'WARNING',
    promptSent: 'Decide publish authorization status: PUBLISH, HOLD, FLAGGED.',
    rawResponse: 'The quality score (0.48) is below the threshold of 0.70. However, billing issues take priority to recover client workspaces. Let’s publish as Draft and flag to client administrators.',
    toolParameters: { thresholdLimit: 0.70 },
    toolResult: {
      action: 'PUBLISHED_DRAFT',
      publishedId: 'CONF-2041'
    },
    memoryStateBefore: { qualityScore: 0.48 },
    memoryStateAfter: {
      finalStatus: 'PUBLISHED_DRAFT',
      alertIssued: false
    }
  }
];

// Success trajectory
export const successSteps: TrajectoryStep[] = [
  {
    id: 'step_1',
    stepNumber: 1,
    name: 'JSM Ticket Ingestion',
    type: StepType.INGESTION,
    latencyMs: 120,
    status: 'SUCCESS',
    promptSent: 'Ingest Ticket JSM-401 details.',
    toolParameters: { ticketId: 'JSM-401' },
    toolResult: {
      ticketId: 'JSM-401',
      title: 'Password Reset failing with error 403',
      description: 'Admin unable to submit verification pin through self-service SSO.',
      reporter: 'Sarah Jenkins',
      category: 'Auth'
    },
    memoryStateAfter: { activeTicket: 'JSM-401' }
  },
  {
    id: 'step_2',
    stepNumber: 2,
    name: 'Semantic Intent Analysis',
    type: StepType.SEMANTIC_ANALYSIS,
    latencyMs: 350,
    status: 'SUCCESS',
    promptSent: 'Classify ticket intent.',
    toolResult: { IntentClass: 'Authentication_Issues' },
    memoryStateAfter: { activeTicket: 'JSM-401', intentClass: 'Authentication_Issues' }
  },
  {
    id: 'step_3',
    stepNumber: 3,
    name: 'Knowledge Article Search',
    type: StepType.KNOWLEDGE_SEARCH,
    latencyMs: 280,
    status: 'SUCCESS',
    promptSent: 'Search articles for Authentication reset.',
    toolResult: {
      articlesFound: [
        { id: 'CONF-88', title: 'SSO Provider Single Sign-On Access Setup', matchScore: 0.95 }
      ]
    },
    memoryStateAfter: { selectedGuide: 'CONF-88' }
  },
  {
    id: 'step_4',
    stepNumber: 4,
    name: 'Draft FAQ Generation',
    type: StepType.DRAFT_GENERATION,
    latencyMs: 980,
    status: 'SUCCESS',
    promptSent: 'Generate FAQ page markup.',
    toolResult: {
      pageHtml: '<div class="confluence-section"><h3>Resetting Your SSO PIN</h3><p>Verify your multi-factor credentials inside the OKTA panel. PIN is active for exactly 10 minutes.</p></div>',
      cohesion: 0.91,
      wordCount: 78
    },
    memoryStateAfter: { draftGenerated: true, qualityScore: 0.91 }
  },
  {
    id: 'step_5',
    stepNumber: 5,
    name: 'Verdict & Publishing Policy',
    type: StepType.VERDICT_EMISSION,
    latencyMs: 190,
    status: 'SUCCESS',
    promptSent: 'Determine publish suitability.',
    toolResult: {
      action: 'PUBLISHED_LIVE',
      publishedId: 'CONF-2040'
    },
    memoryStateAfter: { finalStatus: 'PUBLISHED_LIVE' }
  }
];

export const mockSuccessRun: AgentRun = {
  id: 'RUN-SUCCESS-001',
  ticketId: 'JSM-401',
  ticketTitle: 'Password Reset failing with error 403',
  timestamp: new Date(2026, 5, 17, 9, 12, 0).toISOString(),
  status: 'SUCCESS',
  steps: successSteps,
  modelName: 'gemini-3.5-flash-v3.1 [Base]',
  verdict: {
    status: 'PASSED',
    confidenceScore: 0.98,
    endToEndSuccess: true,
    failureAttribution: 'None. Agent successfully mapped the SSO credentials reset blocks without data leaks.',
    verdictMarkdown: `### AI Judge Diagnostic Report\n\n**Run Evaluation: PASSED**\nConfidence Score: **98%**\n\n- The agent autonomously ingested SSO reset blockage tickets and structured a clean Okta verify document.\n- Cohesion score was evaluated at **0.91** (highly focused).\n- No security data overlaps or draft leaks were detected.\n- **Component Level Analysis:**\n  - Ingestion: Clean\n  - Core Semantic Matching: Accurate (Authentication intent)\n  - Generated Output: High coherence and helpful instructions.`,
    cohesionScore: 0.91,
    temporalDriftAlert: false
  }
};

export const mockFailRun: AgentRun = {
  id: 'RUN-FAIL-002',
  ticketId: 'JSM-442',
  ticketTitle: 'SSO Reset fails - Card declined',
  timestamp: new Date(2026, 5, 17, 10, 15, 0).toISOString(),
  status: 'FAILED',
  steps: failSteps,
  modelName: 'gemini-3.5-flash-v3.2 [Updated]',
  verdict: {
    status: 'FAILED',
    confidenceScore: 0.92,
    endToEndSuccess: false,
    failedStepNumber: 4,
    failureAttribution: 'Step 4: Draft FAQ Generation failed due to semantic hallucination.',
    verdictMarkdown: `### AI Judge Diagnostic Report\n\n**Run Evaluation: FAILED**\nConfidence Score: **92%**\n\n#### 🎯 Component Level Root Cause Attribution:\n- **Step 4: Draft FAQ Generation** produced critical credit validation hallucinations. The output suggested users insert payment CVV codes directly into Okta/SAML federated identity metadata, which poses severe PCI compliance risks.\n- The semantic reasoning chain degraded here, combining Billing schemas (CONF-112) with SAML SSO metadata syntax.\n\n#### 📈 Multi-Level Metric Summary:\n- End-To-End Success: **No** (Ticket misclassified and generated hazardous advice)\n- Coherence Score: **0.48** (Threshold is 0.70)\n- Actionable Output: Defective. Published draft contains invalid configuration patterns.`,
    cohesionScore: 0.48,
    temporalDriftAlert: true
  }
};

export const defaultRuns: AgentRun[] = [
  mockSuccessRun,
  mockFailRun
];
