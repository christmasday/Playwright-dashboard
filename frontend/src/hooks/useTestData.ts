/**
 * Custom Hooks
 */

import { useEffect, useState } from 'react';
import apiService from '../services/api';
import { BuildResponse, BuildMetrics } from '../types/api';

export const useBuildData = (buildId: string) => {
  const [build, setBuild] = useState<BuildResponse | null>(null);
  const [metrics, setMetrics] = useState<BuildMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildData = async () => {
      try {
        setLoading(true);
        const [buildRes, metricsRes] = await Promise.all([
          apiService.getBuild(buildId),
          apiService.getBuildMetrics(buildId),
        ]);

        setBuild(buildRes.data);
        setMetrics(metricsRes.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch build data');
        console.error('Error fetching build data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (buildId) {
      fetchBuildData();
    }
  }, [buildId]);

  return { build, metrics, loading, error };
};

export const useFlakyTests = (limit = 50) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlakyTests = async () => {
      try {
        setLoading(true);
        const res = await apiService.getFlakyTests(limit);
        setTests(res.data.tests || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch flaky tests');
        console.error('Error fetching flaky tests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlakyTests();
  }, [limit]);

  return { tests, loading, error };
};

export default {
  useBuildData,
  useFlakyTests,
};
