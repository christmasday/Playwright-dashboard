/**
 * Projects Page - List, create, and manage projects with search and pagination
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import ProjectMembersModal from '../components/Projects/ProjectMembersModal';
import Pagination from '../components/Common/Pagination';
import type { Project, ProjectStatus } from '../types/api';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  archived: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  inactive: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeModalProject, setActiveModalProject] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalProjects, setTotalProjects] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiService.listProjects({
        page,
        limit: pageSize,
        search: searchQuery,
      });
      const data = resp.data.data || resp.data.projects || [];
      setProjects(data);
      setTotalProjects(resp.data.total ?? data.length);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiService.createProject({
        name: form.name,
        description: form.description,
      });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setPage(1);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create project');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f7]">Projects</h1>
          <p className="text-xs text-[#9a9aa5] mt-0.5">
            Manage test projects, build histories, and team member permissions
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e68] text-xs"></i>
            <input
              type="text"
              placeholder="Search projects..."
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

          {/* Create Button */}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="px-4 py-2 rounded-xl font-medium text-xs text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0"
          >
            <i className={`fas fa-${showCreate ? 'times' : 'plus'}`}></i>
            {showCreate ? 'Cancel' : 'New Project'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <h3 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
            <i className="fas fa-plus-circle text-[#3b82f6]"></i> Create New Project
          </h3>
          <div className="space-y-3">
            <input
              required
              type="text"
              placeholder="Project name (e.g. E-Commerce Web App)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-sm text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            <textarea
              placeholder="Project description and repository information (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-sm text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl font-medium text-xs text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
          >
            Create Project
          </button>
        </form>
      )}

      {/* Projects Grid Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#9a9aa5] flex flex-col items-center justify-center space-y-3 bg-[#14141b] border border-[#20202a] rounded-2xl">
            <div className="w-8 h-8 border-3 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading projects...</span>
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 hover:border-[#3b82f6]/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-xs font-bold text-[#3b82f6]">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-base font-bold text-[#f4f4f7] group-hover:text-[#60a5fa] transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                          STATUS_COLORS[project.status] || 'bg-[#20202a] text-[#9a9aa5] border-[#30303f]'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#9a9aa5] mb-4 line-clamp-2 min-h-[32px]">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#20202a] flex items-center justify-between gap-2 mt-2">
                    <button
                      onClick={() => setActiveModalProject({ id: project.id, name: project.name })}
                      className="px-3 py-1.5 bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <i className="fas fa-users text-[#3b82f6] text-[10px]"></i> Members & Access
                    </button>

                    <Link
                      to={`/projects/${project.id}/builds`}
                      className="px-3 py-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/20 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      Builds <i className="fas fa-arrow-right text-[10px]"></i>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalProjects > pageSize && (
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl px-4 py-2 mt-4 shadow-xl">
                <Pagination
                  currentPage={page}
                  totalItems={totalProjects}
                  pageSize={pageSize}
                  pageSizeOptions={[6, 12, 24, 48]}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="projects"
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[#9a9aa5] py-16 bg-[#14141b] border border-[#20202a] rounded-2xl">
            <i className="fas fa-folder-plus text-3xl text-[#5e5e68] mb-3 block"></i>
            <p className="text-sm font-semibold text-[#f4f4f7]">No projects found</p>
            <p className="text-xs text-[#9a9aa5] mt-1">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Create your first project to organize test suites.'}
            </p>
          </div>
        )}
      </div>

      {/* Project Members & Access Modal */}
      {activeModalProject && (
        <ProjectMembersModal
          projectId={activeModalProject.id}
          projectName={activeModalProject.name}
          onClose={() => setActiveModalProject(null)}
        />
      )}
    </div>
  );
};

export default Projects;
