/**
 * Test Store - Zustand state management
 */

import { create } from 'zustand';

export interface TestRun {
  id: string;
  buildId: string;
  name: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  duration: number;
  tags?: string[];
}

export interface Build {
  id: string;
  name: string;
  branch: string;
  status: 'running' | 'passed' | 'failed' | 'completed';
  testCount: number;
  stats: {
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    passRate: number;
    failureRate: number;
  };
}

export interface TestStore {
  builds: Build[];
  currentBuild: Build | null;
  testRuns: TestRun[];
  selectedTest: TestRun | null;
  loading: boolean;
  error: string | null;

  // Actions
  setBuilds: (builds: Build[]) => void;
  setCurrentBuild: (build: Build) => void;
  setTestRuns: (testRuns: TestRun[]) => void;
  setSelectedTest: (test: TestRun) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addTestRun: (test: TestRun) => void;
  updateTestRun: (testId: string, updates: Partial<TestRun>) => void;
}

export const useTestStore = create<TestStore>((set) => ({
  builds: [],
  currentBuild: null,
  testRuns: [],
  selectedTest: null,
  loading: false,
  error: null,

  setBuilds: (builds) => set({ builds }),
  setCurrentBuild: (build) => set({ currentBuild: build }),
  setTestRuns: (testRuns) => set({ testRuns }),
  setSelectedTest: (test) => set({ selectedTest: test }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addTestRun: (test) =>
    set((state) => ({
      testRuns: [...state.testRuns, test],
    })),

  updateTestRun: (testId, updates) =>
    set((state) => ({
      testRuns: state.testRuns.map((test) =>
        test.id === testId ? { ...test, ...updates } : test
      ),
    })),
}));

export default useTestStore;
