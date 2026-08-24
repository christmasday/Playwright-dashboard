import React, { useState } from 'react';

interface TestStep {
  id?: string;
  stepNumber?: number;
  step_number?: number;
  stepTitle?: string;
  step_title?: string;
  title?: string;
  name?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  errorLocation?: string;
  error_location?: string;
}

interface SuiteTestItem {
  id: string;
  name: string;
  title: string;
  file?: string;
  status: string;
  duration: number;
  steps?: TestStep[];
}

interface TestStepViewerProps {
  steps: TestStep[];
  suiteTests?: SuiteTestItem[];
  currentTestTitle?: string;
  onOpenTrace?: () => void;
  onOpenStackTrace?: (testItem?: SuiteTestItem) => void;
}

const TestStepViewer: React.FC<TestStepViewerProps> = ({
  steps,
  suiteTests = [],
  currentTestTitle,
  onOpenTrace,
  onOpenStackTrace,
}) => {
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (suiteTests.length > 0) {
      const current = suiteTests.find(
        (t) => t.name === currentTestTitle || t.title === currentTestTitle
      );
      if (current) {
        initial[current.id] = true;
      } else {
        initial[suiteTests[0].id] = true;
      }
    }
    return initial;
  });

  const toggleTestExpand = (id: string) => {
    setExpandedTestIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Generate synthetic lifecycle steps if a test case has no recorded sub-steps
  const getEffectiveStepsForTest = (test: { id?: string; name: string; title?: string; status: string; duration: number; steps?: TestStep[] }): TestStep[] => {
    const isCurrent = currentTestTitle && (test.name === currentTestTitle || test.title === currentTestTitle);
    if (isCurrent && steps && steps.length > 0) {
      return steps;
    }
    if (test.steps && test.steps.length > 0) {
      return test.steps;
    }
    const isFail = test.status === 'failed';
    const totalDuration = test.duration || 100;
    const step1Dur = Math.round(totalDuration * 0.2);
    const step2Dur = Math.round(totalDuration * 0.7);
    const step3Dur = totalDuration - step1Dur - step2Dur;

    return [
      {
        id: `synthetic-1-${test.name}`,
        stepNumber: 1,
        stepTitle: 'Before Hooks & Fixture Initialization',
        status: 'passed',
        duration: step1Dur,
      },
      {
        id: `synthetic-2-${test.name}`,
        stepNumber: 2,
        stepTitle: `Execute Test Assertion: ${test.name}`,
        status: isFail ? 'failed' : 'passed',
        duration: step2Dur,
        error: isFail ? 'Test assertion condition was not satisfied' : undefined,
      },
      {
        id: `synthetic-3-${test.name}`,
        stepNumber: 3,
        stepTitle: 'After Hooks & Teardown Cleanup',
        status: 'passed',
        duration: step3Dur,
      },
    ];
  };

  const displayTests: SuiteTestItem[] =
    suiteTests.length > 0
      ? suiteTests
      : [
          {
            id: 'current-test',
            name: currentTestTitle || 'Test Case',
            title: currentTestTitle || 'Test Case',
            status: steps.some((s) => s.status === 'failed') ? 'failed' : 'passed',
            duration: steps.reduce((acc, s) => acc + (s.duration || 0), 0),
            steps: steps,
          },
        ];

  return (
    <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#20202a]">
        <div>
          <h3 className="text-lg font-semibold text-[#f4f4f7]">Test Suite Execution Steps</h3>
          <p className="text-xs text-[#9a9aa5]">
            Granular action and assertion breakdown across all {displayTests.length} tests in this suite
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenStackTrace && (
            <button
              onClick={() => onOpenStackTrace()}
              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-bug text-xs"></i> View Stack Trace Information
            </button>
          )}
          {onOpenTrace && (
            <button
              onClick={onOpenTrace}
              className="px-3.5 py-1.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-play-circle text-xs"></i> Inspect In Trace Viewer
            </button>
          )}
        </div>
      </div>

      {/* All Suite Tests Steps Accordion */}
      <div className="space-y-4">
        {displayTests.map((t) => {
          const testSteps = getEffectiveStepsForTest(t);
          const isExpanded = !!expandedTestIds[t.id];
          const isFail = t.status === 'failed';
          const isCurrent = currentTestTitle && (t.name === currentTestTitle || t.title === currentTestTitle);

          return (
            <div
              key={t.id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                isCurrent
                  ? 'border-[#3b82f6]/40 bg-[#0e0e13]'
                  : 'border-[#20202a] bg-[#0e0e13]'
              }`}
            >
              <div
                onClick={() => toggleTestExpand(t.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#20202a]/40 transition-colors select-none"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      isFail
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {t.status}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-[#f4f4f7] truncate">
                        {t.name || t.title}
                      </h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30">
                          Active Test
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9a9aa5] font-mono mt-0.5">
                      Duration: {t.duration}ms • {testSteps.length} execution steps
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                  {isFail && onOpenStackTrace && (
                    <button
                      onClick={() => onOpenStackTrace(t)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fas fa-bug text-[10px]"></i> View Stack Trace
                    </button>
                  )}
                  <button
                    onClick={() => toggleTestExpand(t.id)}
                    className="flex items-center space-x-2 text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium"
                  >
                    <span>{isExpanded ? 'Hide Steps' : 'View Steps'}</span>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-[#5e5e68]`}></i>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-[#20202a] bg-[#121218] space-y-2">
                  <p className="text-xs font-semibold text-[#9a9aa5] mb-2 uppercase tracking-wider">
                    Execution Steps Breakdown:
                  </p>
                  {testSteps.map((s, idx) => {
                    const sNum = s.stepNumber || s.step_number || idx + 1;
                    const sTitle =
                      s.stepTitle ||
                      s.step_title ||
                      s.title ||
                      s.name ||
                      `Step ${sNum}`;
                    const stepFail = s.status === 'failed';
                    const errorLoc = s.errorLocation || s.error_location;

                    return (
                      <div
                        key={s.id || idx}
                        className={`p-3 rounded-lg border font-mono text-xs ${
                          stepFail
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-[#0e0e13] border-[#20202a] text-[#f4f4f7]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#5e5e68]">Step {sNum}:</span>
                            <span>{sTitle}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-[#9a9aa5]">{s.duration}ms</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                stepFail
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                        </div>

                        {stepFail && (
                          <div className="mt-2 pt-2 border-t border-red-500/20 text-xs space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="text-red-400 font-bold flex-shrink-0">Failure Reason:</span>
                              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-all leading-relaxed flex-1">
                                {s.error || `Assertion or execution failed during step: "${sTitle}"`}
                              </pre>
                            </div>
                            {errorLoc && (
                              <div className="flex items-center gap-1.5 text-[#9a9aa5]">
                                <span className="text-[#5e5e68]">Location: </span>
                                <code className="text-[#60a5fa]">{errorLoc}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestStepViewer;
