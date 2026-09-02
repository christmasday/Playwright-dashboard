/**
 * Builds Page - List all builds with search, status filtering, and pagination
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiService from '../services/api';
import Pagination from '../components/Common/Pagination';

const Builds: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const [builds, setBuilds] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalBuilds, setTotalBuilds] = useState(0);
  const [selectedBuildIds, setSelectedBuildIds] = useState<string[]>([]);

  const toggleSelectBuild = (id: string) => {
    setSelectedBuildIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Keep the most recent selection and add the new one
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      if (projectId) {
        const response = await apiService.getProjectBuilds(projectId, {
          page,
          limit: pageSize,
          search: searchQuery,
          status: statusFilter,
        });
        const projectBuilds = response.data?.data || response.data?.builds || [];
        setBuilds(projectBuilds);
        setTotalBuilds(response.data?.total ?? projectBuilds.length);

        if (response.data?.project) {
          setProject(response.data.project);
        } else {
          try {
            const pResp = await apiService.getProject(projectId);
            setProject(pResp.data?.data || pResp.data);
          } catch (_) {}
        }
      } else {
        const response = await apiService.listBuilds({
          page,
          limit: pageSize,
          search: searchQuery,
          status: statusFilter,
        });
        const allBuilds = response.data?.builds || response.data?.data || [];
        setBuilds(allBuilds);
        setTotalBuilds(response.data?.total ?? allBuilds.length);
        setProject(null);
      }
    } catch (error) {
      console.error('Error fetching builds:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, [projectId, page, pageSize, searchQuery, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#f4f4f7]">
              {project ? `Builds: ${project.name}` : 'Build History'}
            </h1>
            {project && (
              <Link
                to="/builds"
                className="text-xs text-[#3b82f6] hover:underline ml-2 flex items-center gap-1"
              >
                <i className="fas fa-times-circle"></i> Clear filter
              </Link>
            )}
          </div>
          <p className="text-xs text-[#9a9aa5] mt-0.5">
            Test execution runs, commit metadata, and deployment build statuses
          </p>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e68] text-xs"></i>
            <input
              type="text"
              placeholder="Search builds or branches..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-[#14141b] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5e5e68] hover:text-[#f4f4f7]"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#14141b] border border-[#20202a] text-xs font-semibold text-[#f4f4f7] px-3 py-2 rounded-xl focus:outline-none focus:border-[#3b82f6] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>

          {/* Compare Link */}
          <Link
            to="/builds/compare"
            className="px-3.5 py-2 bg-[#1c1c26] hover:bg-blue-600/20 hover:text-blue-400 border border-[#20202a] hover:border-blue-500/30 text-xs font-semibold text-[#f4f4f7] rounded-xl transition-all flex items-center gap-1.5"
          >
            <i className="fas fa-code-compare text-blue-400"></i>
            Compare Runs
          </Link>
        </div>
      </div>

      {/* Main Builds Table Container */}
      <div className="bg-[#14141b] border border-[#20202a] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
        <div>
          {loading ? (
            <div className="p-12 text-center text-xs text-[#9a9aa5] flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
              <span>Loading builds...</span>
            </div>
          ) : builds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0e0e13] border-b border-[#20202a] text-[#9a9aa5] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-3 py-4 w-8 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-6 py-4">Build Name</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#20202a] text-[#9a9aa5]">
                  {builds.map((build: any) => (
                    <tr
                      key={build.id}
                      className={`hover:bg-[#1c1c26] transition-colors ${
                        selectedBuildIds.includes(build.id) ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBuildIds.includes(build.id)}
                          onChange={() => toggleSelectBuild(build.id)}
                          className="rounded bg-[#0a0a0f] border-[#20202a] text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
                          title="Select build to compare"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#f4f4f7] text-sm">{build.name}</div>
                        {build.commit_message && (
                          <div className="text-[11px] text-[#5e5e68] truncate max-w-xs mt-0.5">
                            {build.commit_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#f4f4f7]">
                        {build.project_name || build.projects?.name ? (
                          <span className="px-2.5 py-1 bg-[#101017] border border-[#20202a] rounded-lg text-xs">
                            {build.project_name || build.projects?.name}
                          </span>
                        ) : (
                          <span className="text-[#5e5e68]">General</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs px-2 py-0.5 bg-[#08080a] border border-[#20202a] rounded text-[#9a9aa5]">
                          {build.branch || 'main'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            build.status === 'running'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : build.status === 'passed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {build.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9a9aa5]">
                        {new Date(build.created_at || build.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/builds/compare?targetBuildId=${build.id}`}
                            className="px-2.5 py-1.5 bg-[#14141b] hover:bg-[#20202a] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-lg font-semibold transition-all inline-flex items-center gap-1 text-[11px]"
                            title="Compare this build"
                          >
                            <i className="fas fa-code-compare text-xs"></i>
                          </Link>
                          <Link
                            to={`/builds/${build.id}`}
                            className="px-3 py-1.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#3b82f6] hover:text-[#60a5fa] rounded-lg font-semibold transition-all inline-flex items-center gap-1"
                          >
                            View <i className="fas fa-arrow-right text-[10px]"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#9a9aa5]">
              <i className="fas fa-folder-open text-2xl mb-2 block text-[#5e5e68]"></i>
              No builds found matching filter parameters.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalBuilds > pageSize && (
          <div className="p-4 border-t border-[#20202a] bg-[#101017]">
            <Pagination
              currentPage={page}
              totalItems={totalBuilds}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="builds"
            />
          </div>
        )}
      </div>

      {/* Floating Comparison Selection Bar */}
      {selectedBuildIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#101017]/95 border border-blue-500/50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="text-xs text-[#f4f4f7] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
              {selectedBuildIds.length}
            </span>
            <span>
              {selectedBuildIds.length === 1
                ? 'Select 1 more build to compare'
                : '2 builds selected for comparison'}
            </span>
          </div>

          {selectedBuildIds.length === 2 && (
            <Link
              to={`/builds/compare?targetBuildId=${selectedBuildIds[0]}&baseBuildId=${selectedBuildIds[1]}`}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <i className="fas fa-code-compare"></i>
              Compare Runs Now
            </Link>
          )}

          <button
            onClick={() => setSelectedBuildIds([])}
            className="text-xs text-[#5e5e68] hover:text-[#f4f4f7] px-2 py-1 rounded transition-colors"
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Builds;
