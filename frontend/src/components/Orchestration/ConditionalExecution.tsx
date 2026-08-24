import React, { useState } from 'react';

interface QuarantineRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'quarantine' | 'skip' | 'warn';
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

interface ConditionalExecutionConfig {
  ruleName: string;
  condition: string;
  action: string;
  description: string;
  enabled: boolean;
}

interface ConditionalExecutionProps {
  rules: QuarantineRule[];
  onAddRule: (rule: ConditionalExecutionConfig) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onDeleteRule: (ruleId: string) => void;
}

const ConditionalExecution: React.FC<ConditionalExecutionProps> = ({
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
}) => {
  const [newRule, setNewRule] = useState<ConditionalExecutionConfig>({
    ruleName: '',
    condition: '',
    action: 'quarantine',
    description: '',
    enabled: false,
  });

  const handleAddRule = () => {
    if (!newRule.ruleName || !newRule.condition) {
      return;
    }

    onAddRule({
      ...newRule,
    });

    setNewRule({
      ruleName: '',
      condition: '',
      action: 'quarantine',
      description: '',
      enabled: false,
    });
  };

  const ruleActionColors = {
    quarantine: 'bg-orange-100 text-orange-800',
    skip: 'bg-yellow-100 text-yellow-800',
    warn: 'bg-blue-100 text-blue-800',
  };

  const ruleActionLabels = {
    quarantine: 'Quarantine',
    skip: 'Skip',
    warn: 'Warn',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Conditional Execution Rules</h3>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Add New Rule</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              value={newRule.ruleName}
              onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
              placeholder="e.g., Slow tests"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <input
              type="text"
              value={newRule.condition}
              onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
              placeholder="e.g., duration > 5000ms or retries > 2"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="quarantine">Quarantine</option>
              <option value="skip">Skip</option>
              <option value="warn">Warn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              placeholder="e.g., Tests that take too long"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleAddRule}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Rule
        </button>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Active Rules</h4>
        {rules.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No rules configured
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4"
              >
                 <div className="flex items-center justify-between mb-2">
                   <h5 className="text-lg font-medium text-gray-900">{rule.name}</h5>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleRule(rule.id, !rule.enabled)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                    Condition: {rule.condition}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ruleActionColors[rule.action]}`}>
                    {ruleActionLabels[rule.action]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConditionalExecution;
