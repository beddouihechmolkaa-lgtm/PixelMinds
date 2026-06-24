import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronRight, GitFork, Edit3, Settings, Clock, Brain, Database, Save, FileCode, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react';
import { AgentRun, TrajectoryStep, StepType } from '../types';

interface FlightRecorderProps {
  runs: AgentRun[];
  selectedRunId: string;
  onSelectRun: (id: string) => void;
  onDivergeRun: (stepNumber: number, modifiedPrompt: string, modifiedToolResult: string) => Promise<void>;
  onTriggerReplay: (runId: string) => Promise<void>;
  isProcessing: boolean;
}

export default function FlightRecorder({
  runs,
  selectedRunId,
  onSelectRun,
  onDivergeRun,
  onTriggerReplay,
  isProcessing
}: FlightRecorderProps) {
  const run = runs.find(r => r.id === selectedRunId) || runs[0];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1000 | 500 | 200>(1000); // ms delay per step
  const [activeTab, setActiveTab] = useState<'PROMPT' | 'TOOL' | 'MEMORY'>('PROMPT');
  
  // Divergence editing forms
  const [isDiverging, setIsDiverging] = useState(false);
  const [modifiedPrompt, setModifiedPrompt] = useState('');
  const [modifiedToolResult, setModifiedToolResult] = useState('');

  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  // Sync index when loaded run changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsDiverging(false);
  }, [selectedRunId]);

  // Handle auto-playing steps
  useEffect(() => {
    if (isPlaying && run?.steps) {
      playbackRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= run.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }

    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, playbackSpeed, run?.steps]);

  if (!run || !run.steps || run.steps.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 bg-slate-900/10 border border-slate-800 rounded-xl">
        <div className="text-slate-500 text-sm">
          {runs.length === 0
            ? '🚀 Aucune trajectoire enregistrée. Va dans "Sandbox Trigger" pour lancer un agent.'
            : '⏳ Chargement de la trajectoire...'}
        </div>
      </div>
    );
  }

  const stepsCount = run.steps.length;
  const activeStep: TrajectoryStep = run.steps[currentStepIndex] || run.steps[0];

  const handleStepSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentStepIndex(Number(e.target.value));
    setIsPlaying(false);
    setIsDiverging(false);
  };

  // Pre-populate divergence fields when opening editor
  const handleOpenDivergeForm = () => {
    setModifiedPrompt(activeStep.promptSent || '');
    setModifiedToolResult(JSON.stringify(activeStep.toolResult, null, 2) || '{}');
    setIsDiverging(true);
  };

  const handleApplyDivergence = async () => {
    setIsPlaying(false);
    await onDivergeRun(activeStep.stepNumber, modifiedPrompt, modifiedToolResult);
    setIsDiverging(false);
  };

  return (
    <div className="space-y-6" id="flight-recorder-sec">
      {/* Flight selection selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
              USE CASE 2 ENGINE
            </span>
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <Clock className="text-violet-400" size={20} /> Replay Engine <span className="italic">Command Deck</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            A real-time proxy intercepts every prompt/tool transaction. Re-run any captured run 100% offline. Or inject divergences mid-run to test safe paths.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <span className="text-xs text-slate-400 font-medium font-sans">Trajectory Session:</span>
          <select
            value={selectedRunId}
            onChange={(e) => onSelectRun(e.target.value)}
            id="run-session-selector"
            className="bg-slate-950 border border-slate-800 text-xs rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} - {r.ticketTitle} ({r.isReplay ? 'Replay' : 'Original'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main interactive player setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Playback Controls and Steps bento view (8 columns) */}
        <div className="lg:col-span-8 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800 uppercase">
                  {run.id}
                </span>
                <span className="text-xs text-slate-500 font-mono">Model: {run.modelName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTriggerReplay(run.id)}
                  disabled={isProcessing}
                  id="btn-trigger-replay"
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RotateCcw size={10} /> Deterministic Replay (Offline Mock)
                </button>
              </div>
            </div>

            {/* Steps interactive timeline list */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3" id="timeline-grid-steps">
              {run.steps.map((st, index) => {
                const isActive = index === currentStepIndex;
                const isFail = st.status === 'FAILED';
                const isWarning = st.status === 'WARNING';

                let borderStyle = 'border-slate-800 bg-slate-950/60';
                if (isActive) {
                  borderStyle = 'border-violet-500 bg-violet-950/20 shadow-md shadow-violet-950/20';
                } else if (isFail) {
                  borderStyle = 'border-red-500/30 bg-red-950/15';
                } else if (isWarning) {
                  borderStyle = 'border-amber-500/30 bg-amber-950/15';
                }

                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setCurrentStepIndex(index);
                      setIsPlaying(false);
                      setIsDiverging(false);
                    }}
                    id={`step-node-${st.stepNumber}`}
                    className={`p-3 border rounded-xl text-left transition-all relative flex flex-col justify-between hover:border-violet-500/40 min-h-[90px] cursor-pointer ${borderStyle}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 font-bold">STEP 0{st.stepNumber}</span>
                        {isFail ? (
                          <AlertTriangle size={10} className="text-red-400 animate-pulse" />
                        ) : isWarning ? (
                          <AlertTriangle size={10} className="text-amber-400" />
                        ) : (
                          <CheckCircle2 size={10} className="text-emerald-500" />
                        )}
                      </div>
                      <h4 className="text-[11px] font-extrabold text-white leading-tight mt-1 truncate">
                        {st.name}
                      </h4>
                    </div>

                    <p className="text-[9px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-900">
                      <span>{st.latencyMs}ms</span>
                      <span className="text-slate-500 truncate max-w-[50px]">{st.type}</span>
                    </p>

                    {/* Active slide indicator pill */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-violet-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player control deck widgets */}
          <div className="space-y-3 bg-slate-950/90 p-4 border border-slate-800 rounded-xl" id="control-player-deck">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Play buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  id="btn-play-pause"
                  className={`p-2.5 rounded-full transition-all cursor-pointer ${
                    isPlaying 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-950/50'
                  }`}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <div className="text-xs">
                  <span className="font-bold text-white block">
                    {isPlaying ? 'Replaying Trajectory...' : 'Playback Paused'}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">
                    Step {currentStepIndex + 1} of {stepsCount}: {activeStep.name}
                  </span>
                </div>
              </div>

              {/* Slider timeline */}
              <div className="flex-1 w-full flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={stepsCount - 1}
                  value={currentStepIndex}
                  onChange={handleStepSliderChange}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Speed modifiers */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setPlaybackSpeed(1000)}
                  className={`px-2 py-1 rounded text-[9px] font-bold ${playbackSpeed === 1000 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  1.0x
                </button>
                <button
                  onClick={() => setPlaybackSpeed(500)}
                  className={`px-2 py-1 rounded text-[9px] font-bold ${playbackSpeed === 500 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  2.0x
                </button>
                <button
                  onClick={() => setPlaybackSpeed(200)}
                  className={`px-2 py-1 rounded text-[9px] font-bold ${playbackSpeed === 200 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  5.0x
                </button>
              </div>
            </div>

            {run.divergedAtStep && (
              <div className="border-t border-slate-900/60 pt-2.5 flex items-center gap-2 text-[10px] text-fuchsia-400 font-medium">
                <GitFork size={12} />
                <span>Branched trajectory reconstructed from **Step {run.divergedAtStep}** using safe parameters. Check subsequent draft safety!</span>
              </div>
            )}
          </div>
        </div>

        {/* State details & Divergence Injector Form (4 columns) */}
        <div className="lg:col-span-4 flex" id="step-state-panel">
          <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <div className="text-left">
                  <span className="text-[10px] tracking-wider text-slate-500 font-bold font-mono">TRACE SELECTOR</span>
                  <h4 className="text-xs font-extrabold text-white">
                    Step {activeStep.stepNumber}: {activeStep.name}
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  activeStep.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {activeStep.status}
                </span>
              </div>

              {/* Tabs buttons */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-900 text-[10px] font-bold">
                <button
                  onClick={() => { setActiveTab('PROMPT'); setIsDiverging(false); }}
                  className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'PROMPT' && !isDiverging ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Brain size={11} /> AI Prompt
                </button>
                <button
                  onClick={() => { setActiveTab('TOOL'); setIsDiverging(false); }}
                  className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'TOOL' && !isDiverging ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Database size={11} /> Tool IO
                </button>
                <button
                  onClick={() => { setActiveTab('MEMORY'); setIsDiverging(false); }}
                  className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'MEMORY' && !isDiverging ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Settings size={11} /> Memory state
                </button>
              </div>

              {/* Tab Contents Frame */}
              <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 mt-2.5">
                {isDiverging ? (
                  // Overriding form for divergence
                  <div className="space-y-3" id="divergence-edit-form">
                    <div className="flex items-center gap-1 px-2 py-1 bg-violet-600/10 border border-violet-500/30 rounded text-[10px] text-violet-300 font-semibold mb-2">
                      <GitFork size={12} className="animate-spin" /> Custom Divergent Injection Setup
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Modify Prompt Sent to Agent</span>
                        <span className="text-[9px] text-violet-400 font-normal">Step {activeStep.stepNumber}</span>
                      </label>
                      <textarea
                        value={modifiedPrompt}
                        onChange={(e) => setModifiedPrompt(e.target.value)}
                        rows={3}
                        className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-violet-500"
                        placeholder="Write specialized safety directives..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Modify Tool Output Response (JSON)
                      </label>
                      <textarea
                        value={modifiedToolResult}
                        onChange={(e) => setModifiedToolResult(e.target.value)}
                        rows={5}
                        className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-violet-500"
                        placeholder="{}"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleApplyDivergence}
                        disabled={isProcessing}
                        className="flex-1 py-1 px-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded hover:shadow-violet-900/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Save size={12} /> Inject and Branch
                      </button>
                      <button
                        onClick={() => setIsDiverging(false)}
                        className="py-1 px-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal tab structures
                  <div className="space-y-3 font-mono text-[10px] leading-relaxed text-slate-400">
                    {activeTab === 'PROMPT' && (
                      <div className="space-y-3">
                        {activeStep.promptSent && (
                          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
                            <span className="text-[9px] text-violet-400 font-bold uppercase block mb-1">PROMPT SENT (INTERCEPTED)</span>
                            <p className="text-slate-300">{activeStep.promptSent}</p>
                          </div>
                        )}
                        {activeStep.rawResponse && (
                          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
                            <span className="text-[9px] text-violet-400 font-bold uppercase block mb-1">AGENT RAW REASONING</span>
                            <p className="text-slate-300">{activeStep.rawResponse}</p>
                          </div>
                        )}
                        {!activeStep.promptSent && !activeStep.rawResponse && (
                          <div className="text-center italic text-slate-600 py-4">No model call occurred in this step.</div>
                        )}
                      </div>
                    )}

                    {activeTab === 'TOOL' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-2">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase block">TOOL CALL TRANSACTIONS</span>
                          <div>
                            <span className="text-slate-500">Method:</span> <strong className="text-white">{activeStep.type}</strong>
                          </div>
                          {activeStep.toolParameters && (
                            <div>
                              <span className="text-slate-500 block mb-0.5">Parameters:</span>
                              <pre className="text-slate-300 bg-slate-900 p-1.5 rounded overflow-x-auto max-h-[80px]">{JSON.stringify(activeStep.toolParameters, null, 2)}</pre>
                            </div>
                          )}
                          {activeStep.toolResult && (
                            <div>
                              <span className="text-slate-500 block mb-0.5">Response:</span>
                              <pre className="text-slate-300 bg-slate-900 p-1.5 rounded overflow-x-auto max-h-[140px]">{JSON.stringify(activeStep.toolResult, null, 2)}</pre>
                            </div>
                          )}
                        </div>

                        {activeStep.errorDetails && (
                          <div className="p-3 bg-red-950/25 border border-red-500/20 text-red-400 rounded-lg">
                            <span className="text-[9px] font-bold block mb-1">Downstream Quality Alert:</span>
                            <p>{activeStep.errorDetails}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'MEMORY' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-2">
                          <span className="text-[9px] text-sky-400 font-bold uppercase block">Context Trajectory State</span>
                          {activeStep.memoryStateBefore && (
                            <div>
                              <span className="text-slate-500 block">State Before Step:</span>
                              <pre className="text-slate-300 bg-slate-900 p-1.5 rounded overflow-x-auto max-h-[90px]">{JSON.stringify(activeStep.memoryStateBefore, null, 2)}</pre>
                            </div>
                          )}
                          {activeStep.memoryStateAfter && (
                            <div>
                              <span className="text-slate-500 block">State After Step:</span>
                              <pre className="text-slate-300 bg-[#0f172a] p-1.5 rounded overflow-x-auto max-h-[90px]">{JSON.stringify(activeStep.memoryStateAfter, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dive button launcher */}
            {!isDiverging && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleOpenDivergeForm}
                  id="btn-open-diverge"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={11} className="text-violet-400" /> Apply Divergence Correction here
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
