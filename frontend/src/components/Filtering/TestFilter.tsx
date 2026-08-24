import React, { useState } from 'react';

interface TestRun {
  id: string;
  name: string;
  title: string;
  tags: string[];
  status: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timeout';
  duration: number;
}

interface TestFilterProps {
  tests: TestRun[];
  onFilterChange: (filteredTests: TestRun[]) => void;
  onStatusChange: (selectedStatuses: string[]) => void;
}

const TestFilter: React.FC<TestFilterProps> = ({ tests, onFilterChange, onStatusChange }) => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['passed', 'failed', 'skipped', 'flaky', 'timeout']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const extractAllTags = (tests: TestRun[]) => {
    const tags = new Set<string>();
    tests.forEach((test) => {
      test.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  };

  const allTags = extractAllTags(tests);

  const handleStatusToggle = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    setSelectedStatuses(newStatuses);
    onStatusChange(newStatuses);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newTags);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const applyFilters = () => {
    let filtered = tests;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((test) => selectedStatuses.includes(test.status));
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((test) =>
        test.tags.some((tag) => selectedTags.includes(tag))
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.name.toLowerCase().includes(query) ||
          test.title.toLowerCase().includes(query) ||
          test.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    onFilterChange(filtered);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Filter Tests</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Status</h4>
          <div className="flex flex-wrap gap-2">
            {['passed', 'failed', 'skipped', 'flaky', 'timeout'].map((status) => (
              <label key={status} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => handleStatusToggle(status)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    status === 'passed'
                      ? 'bg-green-100 text-green-800'
                      : status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : status === 'skipped'
                      ? 'bg-yellow-100 text-yellow-800'
                      : status === 'flaky'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {status}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {tag}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Search</h4>
        <input
          type="text"
          placeholder="Search by test name, title, or tag..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={() => {
            setSelectedStatuses(['passed', 'failed', 'skipped', 'flaky', 'timeout']);
            setSelectedTags([]);
            setSearchQuery('');
            onFilterChange(tests);
            onStatusChange(['passed', 'failed', 'skipped', 'flaky', 'timeout']);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default TestFilter;
