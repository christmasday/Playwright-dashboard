/**
 * Account-Wide Test Run Dashboard
 * Displays high-level test run analytics, multi-project trends, and health metrics across all projects.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import apiService from '../services/api';

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at?: string;
}

interface BuildItem {
  id: string;
  name: string;
  branch: string;
  status: string;
  project_id?: string | null;
  project_name?: string | null;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

// Color Palette for Dark Theme
const COLORS = {
  passed: '#10b981',
  failed: '#ef4444',
  running: '#3b82f6',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cardBg: '#1a1a22',
  border: '#20202a',
  textMuted: '#9a9aa5',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12121a] border border-[#2d2d3d] p-3 rounded-lg shadow-xl text-xs space-y-1 text-[#f4f4f7]">
        <p className="font-semibold text-sm border-b border-[#20202a] pb-1 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}:
            </span>
            <span className="font-mono font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projResp, buildsResp] = await Promise.all([
        apiService.listProjects().catch(() => ({ data: { data: [] } })),
        apiService.listBuilds(100, 0).catch(() => ({ data: { builds: [] } })),
      ]);

      const projectList: ProjectItem[] = projResp.data?.data || projResp.data?.projects || [];
      const buildList: BuildItem[] = buildsResp.data?.builds || buildsResp.data?.data || [];

      setProjects(projectList);
      setBuilds(buildList);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter builds based on selected project
  const filteredBuilds = useMemo(() => {
    if (selectedProjectId === 'all') return builds;
    return builds.filter(
      (b) => b.project_id === selectedProjectId || (projects.find((p) => p.id === selectedProjectId)?.name === b.project_name)
    );
  }, [builds, selectedProjectId, projects]);

  // Overall summary metrics
  const summary = useMemo(() => {
    const totalProjects = projects.length;
    const totalBuilds = filteredBuilds.length;
    const passedBuilds = filteredBuilds.filter((b) => b.status === 'passed').length;
    const failedBuilds = filteredBuilds.filter((b) => b.status === 'failed').length;
    const runningBuilds = filteredBuilds.filter((b) => b.status === 'running').length;
    const totalCompleted = passedBuilds + failedBuilds;
    const passRate = totalCompleted > 0 ? Math.round((passedBuilds / totalCompleted) * 100) : 0;

    return {
      totalProjects,
      totalBuilds,
      passedBuilds,
      failedBuilds,
      runningBuilds,
      passRate,
    };
  }, [projects, filteredBuilds]);

  // Test Run Execution Trend Data (grouped by date)
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; Passed: number; Failed: number; Running: number; Total: number }>();

    // Sort ascending by date
    const sorted = [...filteredBuilds].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sorted.forEach((b) => {
      const dateStr = new Date(b.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      if (!map.has(dateStr)) {
        map.set(dateStr, { date: dateStr, Passed: 0, Failed: 0, Running: 0, Total: 0 });
      }

      const entry = map.get(dateStr)!;
      entry.Total += 1;
      if (b.status === 'passed') entry.Passed += 1;
      else if (b.status === 'failed') entry.Failed += 1;
      else if (b.status === 'running') entry.Running += 1;
    });

    return Array.from(map.values());
  }, [filteredBuilds]);

  // Per-Project Performance Data
  const projectPerformanceData = useMemo(() => {
    if (projects.length === 0) return [];

    return projects.map((proj) => {
      const projBuilds = builds.filter(
        (b) => b.project_id === proj.id || b.project_name === proj.name
      );
      const passed = projBuilds.filter((b) => b.status === 'passed').length;
      const failed = projBuilds.filter((b) => b.status === 'failed').length;
      const running = projBuilds.filter((b) => b.status === 'running').length;
      const total = projBuilds.length;
      const passRate = total > 0 && passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

      return {
        id: proj.id,
        name: proj.name,
        total,
        passed,
        failed,
        running,
        passRate,
        recentBuilds: projBuilds.slice(0, 5),
      };
    });
  }, [projects, builds]);

  // Pie chart status distribution
  const pieData = useMemo(() => {
    return [
      { name: 'Passed', value: summary.passedBuilds, color: COLORS.passed },
      { name: 'Failed', value: summary.failedBuilds, color: COLORS.failed },
      { name: 'Running', value: summary.runningBuilds, color: COLORS.running },
    ].filter((item) => item.value > 0);
  }, [summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#9a9aa5] space-y-3">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading account-wide test analytics…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Account Scope Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f7]">Test Execution Dashboard</h1>
          <p className="text-sm text-[#9a9aa5]">
            High-level test run trends, project health metrics, and execution history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-[#9a9aa5] font-medium">Filter Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-2 bg-[#0e0e13] border border-[#20202a] rounded-xl text-sm text-[#f4f4f7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Account KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 hover:border-[#3b82f6]/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Total Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <i className="fas fa-folder-open text-sm"></i>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f4f4f7]">{summary.totalProjects}</div>
          <div className="text-xs text-[#9a9aa5] mt-1.5">Across user account</div>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 hover:border-green-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Pass Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <i className="fas fa-chart-line text-sm"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{summary.passRate}%</span>
          </div>
          <div className="text-xs text-[#9a9aa5] mt-1.5">
            {summary.passedBuilds} passed / {summary.failedBuilds} failed
          </div>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Total Test Builds</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <i className="fas fa-[#3b82f6] fa-cubes text-sm"></i>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f4f4f7]">{summary.totalBuilds}</div>
          <div className="text-xs text-[#9a9aa5] mt-1.5">{summary.runningBuilds} currently active</div>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Failed Runs</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <i className="fas fa-exclamation-triangle text-sm"></i>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-400">{summary.failedBuilds}</div>
          <div className="text-xs text-[#9a9aa5] mt-1.5">Requires attention</div>
        </div>
      </div>

      {/* High-Level Test Run Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Test Execution Trends (Area Chart) */}
        <div className="lg:col-span-2 bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#f4f4f7]">Test Execution Volume Trend</h3>
              <p className="text-xs text-[#9a9aa5]">Daily test run volume and result status over time</p>
            </div>
            <span className="text-xs bg-[#0e0e13] px-2.5 py-1 rounded-full text-[#9a9aa5]">
              {trendData.length} active periods
            </span>
          </div>

          {trendData.length > 0 ? (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.passed} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.passed} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.failed} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.failed} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
                  <XAxis dataKey="date" stroke="#5e5e68" fontSize={11} tickLine={false} />
                  <YAxis stroke="#5e5e68" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="Passed"
                    stroke={COLORS.passed}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPassed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Failed"
                    stroke={COLORS.failed}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-xs text-[#9a9aa5]">
              No trend data available for selected filter
            </div>
          )}
        </div>

        {/* Graph 2: Result Distribution (Pie/Donut Chart) */}
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#f4f4f7] mb-1">Status Distribution</h3>
            <p className="text-xs text-[#9a9aa5]">Breakdown of test run outcomes</p>
          </div>

          {pieData.length > 0 ? (
            <div className="h-56 relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1a1a22" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-[#f4f4f7]">{summary.passRate}%</span>
                <span className="text-[10px] uppercase text-[#9a9aa5] font-semibold">Pass Rate</span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-[#9a9aa5]">
              No test run outcomes recorded
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#20202a] text-center">
            <div>
              <div className="text-xs text-[#9a9aa5]">Passed</div>
              <div className="text-sm font-bold text-emerald-400">{summary.passedBuilds}</div>
            </div>
            <div>
              <div className="text-xs text-[#9a9aa5]">Failed</div>
              <div className="text-sm font-bold text-red-400">{summary.failedBuilds}</div>
            </div>
            <div>
              <div className="text-xs text-[#9a9aa5]">Running</div>
              <div className="text-sm font-bold text-blue-400">{summary.runningBuilds}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph 3: Project Health & Build Volume Comparison */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#f4f4f7]">Multi-Project Health Comparison</h3>
            <p className="text-xs text-[#9a9aa5]">Passed vs Failed test build runs by project</p>
          </div>
        </div>

        {projectPerformanceData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
                <XAxis dataKey="name" stroke="#5e5e68" fontSize={11} tickLine={false} />
                <YAxis stroke="#5e5e68" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="passed" name="Passed Builds" fill={COLORS.passed} radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed Builds" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-[#9a9aa5]">
            No project data available
          </div>
        )}
      </div>

      {/* Project Health Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#f4f4f7]">Projects Summary</h2>
          <Link to="/projects" className="text-xs text-[#3b82f6] hover:underline font-medium">
            Manage Projects →
          </Link>
        </div>

        {projectPerformanceData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectPerformanceData.map((proj) => (
              <div
                key={proj.id}
                className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 hover:border-[#3b82f6]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-[#f4f4f7] truncate">{proj.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        proj.passRate >= 80
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : proj.passRate >= 50
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {proj.total > 0 ? `${proj.passRate}% Pass Rate` : 'No Runs'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#9a9aa5] mb-4">
                    <span>Total Runs: <strong className="text-[#f4f4f7]">{proj.total}</strong></span>
                    <span>Passed: <strong className="text-emerald-400">{proj.passed}</strong></span>
                    <span>Failed: <strong className="text-red-400">{proj.failed}</strong></span>
                  </div>

                  {/* Visual Pass Rate Bar */}
                  <div className="w-full bg-[#0e0e13] rounded-full h-2 overflow-hidden flex mb-4">
                    {proj.total > 0 ? (
                      <>
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(proj.passed / proj.total) * 100}%` }}
                        ></div>
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${(proj.failed / proj.total) * 100}%` }}
                        ></div>
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${(proj.running / proj.total) * 100}%` }}
                        ></div>
                      </>
                    ) : (
                      <div className="bg-[#20202a] w-full h-full"></div>
                    )}
                  </div>
                </div>

                <Link
                  to={`/projects/${proj.id}/builds`}
                  className="w-full py-2 bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/50 text-center text-xs font-semibold text-[#3b82f6] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  View Project Builds <i className="fas fa-arrow-right text-[10px]"></i>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 text-center text-[#9a9aa5]">
            No projects found. Create a project to start tracking test metrics.
          </div>
        )}
      </div>

      {/* Recent Builds Across All Projects */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden shadow-none">
        <div className="p-5 border-b border-[#20202a] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#f4f4f7]">Recent Test Runs</h3>
            <p className="text-xs text-[#9a9aa5]">Latest test builds across user projects</p>
          </div>
          <Link to="/builds" className="text-xs text-[#3b82f6] hover:underline font-medium">
            View All Builds →
          </Link>
        </div>

        {filteredBuilds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0e0e13]/60 border-b border-[#20202a] text-xs font-semibold text-[#9a9aa5]">
                <tr>
                  <th className="px-5 py-3">Build Name</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20202a] text-sm">
                {filteredBuilds.slice(0, 10).map((build) => (
                  <tr key={build.id} className="hover:bg-[#20202a]/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#f4f4f7]">{build.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-[#0e0e13] border border-[#20202a] rounded-md text-xs text-[#3b82f6]">
                        {build.project_name || 'test project'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#9a9aa5] text-xs">{build.branch || 'main'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          build.status === 'running'
                            ? 'bg-blue-500/10 text-blue-400'
                            : build.status === 'passed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {build.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#9a9aa5]">
                      {new Date(build.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/builds/${build.id}`}
                        className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-[#9a9aa5]">No recent test runs found</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
