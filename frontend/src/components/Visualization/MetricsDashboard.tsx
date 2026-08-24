import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import apiService from '../../services/api';

interface BuildMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  passRate: number;
  failureRate: number;
  averageDuration: number;
  totalDuration: number;
}

interface MetricsDashboardProps {
  buildId?: string;
}

const COLORS = {
  passed: '#10b981',
  failed: '#ef4444',
  running: '#3b82f6',
  flaky: '#f59e0b',
  skipped: '#6b7280',
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

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ buildId }) => {
  const [currentMetrics, setCurrentMetrics] = useState<BuildMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!buildId) return;
      try {
        setLoading(true);
        const response = await apiService.getBuildSummary(buildId);
        if (response.data && response.data.stats) {
          setCurrentMetrics(response.data.stats);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [buildId]);

  if (loading) {
    return (
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 flex justify-center items-center text-[#9a9aa5]">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentMetrics) {
    return (
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 text-center text-[#9a9aa5]">
        No granular performance metrics recorded for this build.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Total Test Count</p>
          <p className="text-3xl font-extrabold text-[#f4f4f7] mt-2">{currentMetrics.total}</p>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Build Pass Rate</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{currentMetrics.passRate}%</p>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Average Duration</p>
          <p className="text-3xl font-extrabold text-[#3b82f6] mt-2">
            {currentMetrics.averageDuration}ms
          </p>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Total Suite Duration</p>
          <p className="text-3xl font-extrabold text-yellow-400 mt-2">
            {(currentMetrics.totalDuration / 1000).toFixed(2)}s
          </p>
        </div>
      </div>

      {/* Outcome Breakdown Chart */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#f4f4f7] mb-4">Build Test Outcome Breakdown</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: 'Build Execution',
                  Passed: currentMetrics.passed,
                  Failed: currentMetrics.failed,
                  Skipped: currentMetrics.skipped,
                  Flaky: currentMetrics.flaky,
                },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
              <XAxis dataKey="name" stroke="#5e5e68" fontSize={11} tickLine={false} />
              <YAxis stroke="#5e5e68" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Passed" fill={COLORS.passed} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Failed" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Skipped" fill={COLORS.skipped} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Flaky" fill={COLORS.flaky} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
