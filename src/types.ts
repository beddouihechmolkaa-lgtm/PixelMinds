export interface JSMTicket {
  id: string; // JSM-442 etc.
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'FLAGGED';
  reporter: string;
  createdAt: string;
  assignedTo: string;
}

export interface ConfluencePage {
  id: string; // CONF-101
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'FLAGGED';
  cohesionScore: number;
  wordCount: number;
}

export enum StepType {
  INGESTION = 'INGESTION',
  SEMANTIC_ANALYSIS = 'SEMANTIC_ANALYSIS',
  KNOWLEDGE_SEARCH = 'KNOWLEDGE_SEARCH',
  DRAFT_GENERATION = 'DRAFT_GENERATION',
  VERDICT_EMISSION = 'VERDICT_EMISSION',
}

export interface TrajectoryStep {
  id: string;
  stepNumber: number;
  name: string;
  type: StepType;
  promptSent?: string;
  rawResponse?: string;
  targetTool?: string;
  toolParameters?: any;
  toolResult?: any;
  memoryStateBefore?: any;
  memoryStateAfter?: any;
  latencyMs: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  errorDetails?: string;
}

export interface AIJudgeVerdict {
  status: 'PASSED' | 'FAILED' | 'FLAGGED';
  confidenceScore: number; // 0.0 to 1.0 (Evaluator Self-Assessment)
  endToEndSuccess: boolean;
  failedStepNumber?: number;
  failureAttribution: string; // Exact step or logic that caused mismatch
  verdictMarkdown: string; // Explanatory report for engineers
  cohesionScore: number;
  temporalDriftAlert: boolean;
}

export interface AgentRun {
  id: string; // RUN-001
  ticketId: string;
  ticketTitle: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'PROCESSING';
  steps: TrajectoryStep[];
  verdict?: AIJudgeVerdict;
  modelName: string; // e.g. "gemini-3.5-flash-v1" or "v3.2-updated"
  isReplay?: boolean;
  replayedFromId?: string;
  divergedAtStep?: number;
}

export interface DriftDataPoint {
  runIndex: number;
  runId: string;
  model: string;
  wordCount: number;
  cohesionScore: number;
  hasFailure: boolean;
  timestamp: string;
}
