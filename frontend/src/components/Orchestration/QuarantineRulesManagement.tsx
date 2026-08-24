import React, { useState } from 'react';
import apiService from '../../services/api';

interface FlakyTest {
  id: string;
  testName: string;
  file: string;
  flakinessScore: number;
  failureCount: number;
  totalRuns: number;
  lastSeen: string;
  status: 'active' | 'quarantined' | 'resolved';
}

interface QuarantineRule {
  id: string;
  name: string;
  ruleName: string;
  condition: string;
  action: 'auto_quarantine' | 'auto_skip' | 'auto_warn';
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

interface QuarantineRulesManagementProps {
  flakyTests: FlakyTest[];
  quarantineRules: QuarantineRule[];
  onUpdateStatus: (testId: string, status: 'active' | 'quarantined' | 'resolved') => void;
  onAddRule: (rule: QuarantineRule) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

const QuarantineRulesManagement: React.FC<QuarantineRulesManagementProps> = ({
  flakyTests,
  quarantineRules,
  onUpdateStatus,
  onToggleRule,
}) => {
  const [quarantineForm, setQuarantineForm] = useState({
    testName: '',
    duration: '',
    retries: '',
    status: 'quarantined',
  });

  const handleQuarantineTest = async (testId: string) => {
    try {
      await apiService.updateTestStatus(testId, {
        status: 'quarantined',
        quarantineReason: 'Flaky test identified',
      });
      onUpdateStatus(testId, 'quarantined');
    } catch (error) {
      console.error('Error quarantining test:', error);
    }
  };

  const handleResolveTest = async (testId: string) => {
    try {
      await apiService.updateTestStatus(testId, {
        status: 'active',
        resolvedAt: new Date().toISOString(),
      });
      onUpdateStatus(testId, 'resolved');
    } catch (error) {
      console.error('Error resolving test:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Quarantine Management</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setQuarantineForm({
              testName: '',
              duration: '',
              retries: '',
              status: 'quarantined',
            })}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Add Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Add to Quarantine</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name
              </label>
              <input
                type="text"
                value={quarantineForm.testName}
                onChange={(e) => setQuarantineForm({ ...quarantineForm, testName: e.target.value })}
                placeholder="Enter test name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Duration (ms)
              </label>
              <input
                type="text"
                value={quarantineForm.duration}
                onChange={(e) => setQuarantineForm({ ...quarantineForm, duration: e.target.value })}
                placeholder="e.g., 5000"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="text"
                value={quarantineForm.retries}
                onChange={(e) => setQuarantineForm({ ...quarantineForm, retries: e.target.value })}
                placeholder="e.g., 2"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quarantine Status
              </label>
              <select
                value={quarantineForm.status}
                onChange={(e) => setQuarantineForm({ ...quarantineForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="quarantined">Quarantined</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Quarantine Rules</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {quarantineRules.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No quarantine rules configured
              </div>
            ) : (
              quarantineRules.map((rule) => (
                <div
                  key={rule.id}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                      <p className="text-xs text-gray-600">Condition: {rule.condition}</p>
                    </div>
                    <button
                      onClick={() => onToggleRule(rule.id, !rule.enabled)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Flaky Tests</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {flakyTests.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No flaky tests detected
            </div>
          ) : (
            flakyTests.map((test) => (
              <div
                key={test.id}
                className="border rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{test.testName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-600">Flakiness: {Number(test.flakinessScore || 0).toFixed(1)}%</span>
                      <span className="text-xs text-gray-600">Failures: {test.failureCount}/{test.totalRuns}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuarantineTest(test.id)}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold hover:bg-orange-200 transition-colors"
                    >
                      Quarantine
                    </button>
                    <button
                      onClick={() => handleResolveTest(test.id)}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold hover:bg-green-200 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuarantineRulesManagement;
