import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, FolderOpen, Clock, FileText, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { StoryboardSegment } from '../types';
import { supabase } from '../services/supabaseClient';
import { Project, Json } from '../types/schema';

interface ProjectData {
  text: string;
  segments: StoryboardSegment[];
  mode: 'editor' | 'storyboard';
}

interface ProjectHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: ProjectData;
  onLoad: (data: ProjectData, id: string) => void;
  currentProjectId: string | null;
  onUpdateCurrentId: (id: string) => void;
  user: any; // User object from Supabase auth
}

const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onLoad,
  currentProjectId,
  onUpdateCurrentId,
  user
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'save'>('list');
  const [isLoading, setIsLoading] = useState(false);

  // Load project list on mount/open
  useEffect(() => {
    if (isOpen && user) {
      loadProjects();
    }
  }, [isOpen, user]);

  // Set initial view logic
  useEffect(() => {
    if (isOpen && user) {
      // If we just opened and have no projects loaded yet, wait for loadProjects
      // Logic moved to inside loadProjects to set view based on result
    }
  }, [isOpen, user]);

  const loadProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      // If user has no projects, default to save screen
      if ((!data || data.length === 0) && view === 'list') {
        setView('save');
        const suggestedName = currentData.text.split('\n')[0]?.substring(0, 30) || 'Novo Projeto';
        setNewProjectName(suggestedName);
      }
    } catch (e: any) {
      console.error("Failed to load projects", e);
      setError("Erro ao carregar projetos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newProjectName.trim() || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: newProjectName,
          text_content: currentData.text,
          segments: currentData.segments as unknown as Json,
          mode: currentData.mode,
          preview: currentData.text.substring(0, 100).replace(/\n/g, ' ') + '...',
          scene_count: currentData.segments.length
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onUpdateCurrentId(data.id);
        await loadProjects(); // Refresh list
        setView('list');
      }
    } catch (e: any) {
      console.error(e);
      setError("Erro ao salvar projeto: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCurrent = async () => {
    if (!currentProjectId || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      // If user wants to update, we just update content, keeping name unless we add rename logic later
      // For now, let's keep the name simple or get it from existing list
      const existing = projects.find(p => p.id === currentProjectId);
      const name = existing ? existing.name : (newProjectName || 'Projeto Atualizado');

      const { error } = await supabase
        .from('projects')
        .update({
          text_content: currentData.text,
          segments: currentData.segments as unknown as Json,
          mode: currentData.mode,
          preview: currentData.text.substring(0, 100).replace(/\n/g, ' ') + '...',
          scene_count: currentData.segments.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProjectId);

      if (error) throw error;

      await loadProjects();
      setView('list');
    } catch (e: any) {
      console.error(e);
      setError("Erro ao atualizar projeto: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (id: string) => {
    if (!user) return;
    // We already have the data in the projects list locally, but let's be safe and allow fetching specifically if needed
    // Since we fetch `select('*')` in loadProjects, we can just use local state for speed
    const project = projects.find(p => p.id === id);
    
    if (project) {
        onLoad({
            text: project.text_content || '',
            segments: (project.segments as unknown as StoryboardSegment[]) || [],
            mode: (project.mode as 'editor' | 'storyboard') || 'editor'
        }, id);
    } else {
        // Fallback fetch if not in list for some reason
        setIsLoading(true);
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        setIsLoading(false);
        if (data) {
             onLoad({
                text: data.text_content || '',
                segments: (data.segments as unknown as StoryboardSegment[]) || [],
                mode: (data.mode as 'editor' | 'storyboard') || 'editor'
            }, id);
        } else {
            setError("Projeto não encontrado.");
        }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este projeto?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      
      if (currentProjectId === id) onUpdateCurrentId('');
      await loadProjects();
    } catch (e: any) {
      setError("Erro ao excluir projeto: " + e.message);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#1a1a1a]">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[#e5e5e5] flex items-center gap-2">
            <FolderOpen size={16} className="text-[--accent]" />
            Histórico de Projetos
          </h2>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-[#222] flex gap-2">
          <button 
            onClick={() => setView('list')}
            className={`flex-1 py-2 px-4 text-xs font-mono uppercase tracking-wider border transition-all ${view === 'list' ? 'bg-[#222] border-[#444] text-white' : 'border-transparent text-[#666] hover:text-[#ccc]'}`}
          >
            Meus Projetos
          </button>
          <button 
            onClick={() => {
              setView('save');
              if (!currentProjectId && !newProjectName) {
                 const suggested = currentData.text.split('\n')[0]?.substring(0, 30) || 'Novo Projeto';
                 setNewProjectName(suggested);
              }
            }}
            className={`flex-1 py-2 px-4 text-xs font-mono uppercase tracking-wider border transition-all ${view === 'save' ? 'bg-[#222] border-[#444] text-white' : 'border-transparent text-[#666] hover:text-[#ccc]'}`}
          >
            Salvar Atual
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0c0c0c] relative">
          {isLoading && (
              <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                  <Loader2 size={32} className="text-[--accent] animate-spin" />
              </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {view === 'save' && (
             <div className="space-y-6 max-w-md mx-auto mt-8">
                <div className="space-y-2">
                   <label className="text-xs font-mono text-[#666] uppercase">Nome do Projeto</label>
                   <input 
                     type="text" 
                     value={newProjectName}
                     onChange={(e) => setNewProjectName(e.target.value)}
                     className="w-full bg-[#1a1a1a] border border-[#333] text-white p-3 focus:border-[--accent] focus:outline-none font-sans"
                     placeholder="Digite um nome..."
                   />
                </div>

                <button 
                  onClick={handleSaveNew}
                  disabled={!newProjectName.trim() || isLoading}
                  className="w-full py-4 bg-[--accent] text-black font-mono text-xs uppercase font-bold hover:bg-[#d4c5a8] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Salvar como Novo Projeto
                </button>

                {currentProjectId && (
                  <div className="relative pt-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#222]"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0c0c0c] px-2 text-[#444]">Ou</span></div>
                  </div>
                )}

                {currentProjectId && (
                  <button 
                    onClick={handleUpdateCurrent}
                    disabled={isLoading}
                    className="w-full py-4 bg-[#222] text-[#ccc] font-mono text-xs uppercase font-bold hover:bg-[#333] hover:text-white transition-colors flex items-center justify-center gap-2 border border-[#333]"
                  >
                    <RefreshCw size={14} />
                    Atualizar Projeto Existente
                  </button>
                )}
             </div>
          )}

          {view === 'list' && (
            <div className="space-y-3">
              {projects.length === 0 && !isLoading ? (
                <div className="text-center py-20 text-[#444]">
                   <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
                   <p className="font-mono text-xs">Nenhum projeto salvo encontrado.</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => handleLoad(project.id)}
                    className={`group p-4 border transition-all cursor-pointer hover:border-[--accent] relative ${currentProjectId === project.id ? 'bg-[#1a1a1a] border-[--accent-dim]' : 'bg-[#111] border-[#222]'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-serif text-lg ${currentProjectId === project.id ? 'text-[--accent]' : 'text-[#ddd] group-hover:text-white'}`}>
                          {project.name}
                        </h3>
                        {currentProjectId === project.id && <span className="text-[10px] bg-[--accent] text-black px-2 py-0.5 font-mono uppercase rounded-sm">Atual</span>}
                     </div>
                     
                     <p className="text-xs text-[#666] line-clamp-2 mb-3 font-serif italic border-l-2 border-[#333] pl-2">
                       "{project.preview}"
                     </p>

                     <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-4 text-[10px] font-mono text-[#555] uppercase">
                           <span className="flex items-center gap-1"><Clock size={10} /> {new Date(project.updated_at).toLocaleDateString()}</span>
                           <span className="flex items-center gap-1"><FileText size={10} /> {project.scene_count} Cenas</span>
                        </div>
                        
                        <button 
                          onClick={(e) => handleDelete(project.id, e)}
                          className="p-2 text-[#444] hover:text-red-400 hover:bg-red-900/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir"
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProjectHistoryModal;
