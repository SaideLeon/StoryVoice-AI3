import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Key, Upload, Loader2, X, Maximize2, Minimize2, Command, FileText, LayoutList, ChevronRight, Wand2, Sparkles, Save, FolderOpen, AlertCircle, SlidersHorizontal, LogOut, User } from 'lucide-react';
import JSZip from 'jszip';
import Controls from './components/Controls';
import WaveformVisualizer from './components/WaveformVisualizer';
import StoryboardPanel from './components/StoryboardPanel';
import LandingPage from './components/LandingPage';
import ProjectHistoryModal from './components/ProjectHistoryModal';
import AuthModal from './components/AuthModal';
import { generateSpeech, generateStoryboard, generateSceneImage, checkImageForCharacter, generateDramaticScript } from './services/geminiService';
import { decodeBase64, decodeAudioData, pcmToWav } from './utils/audioUtils';
import { renderVideoFromSegments, RenderProgress } from './utils/videoUtils';
import { VoiceName, STORY_STYLES, VISUAL_STYLES, StoryboardSegment } from './types';
import { supabase } from './services/supabaseClient';

const DEFAULT_STORY = `O que aconteceria se você ficasse entediado por tempo demais?

Dia 1
O tédio começa leve.
Você olha para o teto.
Checa o celular a cada 30 segundos em busca de dopamina.
Não há nada de novo.
Seu cérebro implora por um estímulo que não vem.

Dia 2
A irritação surge.
Você anda de um lado para o outro.
Sua mente tenta criar problemas onde não existem.
O silêncio começa a incomodar.
A falta de ruído se torna barulhenta.

Dia 5
Sua percepção do tempo muda.
Um minuto parece durar uma hora.
A criatividade tenta aflorar, mas morre por falta de combustível.
Você começa a falar sozinho apenas para ouvir uma voz.
O mundo começa a perder a cor.

Dia 10
O cérebro entra em "modo de segurança".
A apatia total se instala.
Você não sente fome, nem sono, apenas um vazio constante.
Sem desafios, sua mente começa a se desligar.
O nada é mais pesado que a dor.

Dia 20
Começam as distorções.
Sem estímulos externos, sua mente cria os próprios.
Sombras parecem se mover no canto do olho.
Sons que não existem ecoam na sala.
O tédio virou alucinação.

Dia 30
Seu cérebro começa a sofrer atrofia.
Áreas responsáveis pela memória e emoção encolhem.
A falta de novidade é veneno para os neurônios.
Você esquece quem era antes do vazio.

O tédio não é apenas falta do que fazer.
É o grito do seu cérebro por vida.

Sem o novo, a mente não descansa.
Ela simplesmente se apaga.`;

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [text, setText] = useState<string>(DEFAULT_STORY);
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Audio State
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Fenrir);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('experienced');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Visual Generation State
  const [selectedVisualStyleId, setSelectedVisualStyleId] = useState<string>('cinematic');

  // Storyboard State
  const [mode, setMode] = useState<'editor' | 'storyboard'>('editor');
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardSegments, setStoryboardSegments] = useState<StoryboardSegment[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // Script Generation State
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptTopic, setScriptTopic] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  // Generation Queues
  const [generatingIndices, setGeneratingIndices] = useState<number[]>([]);
  const [generatingAudioIndices, setGeneratingAudioIndices] = useState<number[]>([]);

  // Video Render State
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // API Key Management State
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keyIndex, setKeyIndex] = useState(0);
  const keyIndexRef = useRef(0);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // --- Auth Initialization ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserKeys(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserKeys(session.user.id);
      else {
        setApiKeys([]); // Clear keys on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserKeys = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('key_value')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        const keys = data.map(k => k.key_value);
        setApiKeys(prev => {
          // Merge with any locally uploaded keys, avoiding duplicates
          const combined = Array.from(new Set([...prev, ...keys]));
          return combined;
        });
      }
    } catch (err) {
      console.error("Error fetching keys", err);
    }
  };

  const saveKeysToSupabase = async (keys: string[]) => {
    if (!user) return;
    try {
      // For simplicity in this demo, we just insert. Real app should handle duplicates/upserts better.
      const inserts = keys.map(k => ({
        user_id: user.id,
        key_value: k,
        is_active: true
      }));
      
      const { error } = await supabase.from('user_api_keys').insert(inserts);
      if (error) console.error("Error saving keys", error);
      else setStatusMessage("Chaves salvas na nuvem!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // --- API Key Rotation Logic ---
  const handleKeyFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      // Filter keys that are long enough AND start with the Google API key prefix 'AIzaSy'
      const keys = text.split(/\r?\n/)
        .map(k => k.trim())
        .filter(k => k.length > 20 && k.startsWith("AIzaSy"));
      
      if (keys.length === 0) {
        setError("Nenhuma chave válida (iniciada com 'AIzaSy') encontrada no arquivo.");
        return;
      }
      
      // Update state
      setApiKeys(prev => {
          const unique = Array.from(new Set([...prev, ...keys]));
          return unique;
      });
      setKeyIndex(0);
      keyIndexRef.current = 0;

      // Automatically save to Supabase if logged in
      if (user) {
         saveKeysToSupabase(keys);
      } else {
        setStatusMessage("Faça login para salvar chaves permanentemente.");
        setTimeout(() => setStatusMessage(null), 4000);
      }

    } catch (err) {
      setError("Erro ao ler o arquivo de chaves.");
    }
    if (keyInputRef.current) keyInputRef.current.value = '';
  };

  const getNextKey = useCallback(() => {
    if (apiKeys.length > 0) {
      const currentIdx = keyIndexRef.current;
      const key = apiKeys[currentIdx];
      const nextIdx = (currentIdx + 1) % apiKeys.length;
      keyIndexRef.current = nextIdx;
      setKeyIndex(nextIdx);
      return key;
    }
    return undefined; 
  }, [apiKeys]);

  const clearKeys = () => {
    setApiKeys([]);
    setKeyIndex(0);
    keyIndexRef.current = 0;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowSettings(false);
  };

  // --- Handlers requiring Auth ---
  const checkAuth = () => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  const openHistory = () => {
    if (checkAuth()) {
      setShowHistory(true);
    }
  };

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const handleGenerateAudio = async () => {
    if (!text.trim()) return;
    setIsGeneratingAudio(true);
    setError(null);
    setAudioBuffer(null);
    setAudioBase64(null);
    stopAudio();

    try {
      const style = STORY_STYLES.find(s => s.id === selectedStyleId) || STORY_STYLES[0];
      const activeKey = getNextKey();
      const base64Audio = await generateSpeech(text, selectedVoice, style.prompt, activeKey);
      
      if (!base64Audio) throw new Error("Nenhum dado de áudio recebido.");

      setAudioBase64(base64Audio);

      initAudioContext();
      if (!audioContextRef.current) return;

      const rawBytes = decodeBase64(base64Audio);
      const buffer = await decodeAudioData(rawBytes, audioContextRef.current, 24000, 1);
      setAudioBuffer(buffer);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar narração.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDownloadMainAudio = () => {
    if (!audioBase64) return;
    const pcmData = decodeBase64(audioBase64);
    const wavBlob = pcmToWav(pcmData);
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyvoice_audio_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateStoryboard = async () => {
    if (!text.trim()) return;
    setIsGeneratingStoryboard(true);
    setError(null);

    try {
      const activeKey = getNextKey();
      const segments = await generateStoryboard(text, activeKey);
      setStoryboardSegments(segments);
      setMode('storyboard');
    } catch (err: any) {
      setError("Falha ao gerar storyboard.");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleGenerateDramaticScript = async () => {
    if (!scriptTopic.trim()) return;
    setIsGeneratingScript(true);
    setError(null);
    try {
      const activeKey = getNextKey();
      const generatedScript = await generateDramaticScript(scriptTopic, activeKey);
      setText(generatedScript);
      setShowScriptModal(false);
      setScriptTopic('');
    } catch (err: any) {
      setError("Falha ao gerar roteiro.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateSegmentAudio = async (index: number, narrativeText: string) => {
    if (generatingAudioIndices.includes(index)) return;
    setGeneratingAudioIndices(prev => [...prev, index]);
    setError(null);

    try {
       const style = STORY_STYLES.find(s => s.id === selectedStyleId) || STORY_STYLES[0];
       const activeKey = getNextKey();
       const base64Audio = await generateSpeech(narrativeText, selectedVoice, style.prompt, activeKey);

       if (base64Audio) {
        setStoryboardSegments(prev => {
          const newSegments = [...prev];
          newSegments[index] = { ...newSegments[index], audio: base64Audio };
          return newSegments;
        });
       } else {
         throw new Error("Nenhum áudio gerado.");
       }
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gerar áudio para a cena ${index + 1}.`);
    } finally {
      setGeneratingAudioIndices(prev => prev.filter(i => i !== index));
    }
  };

  const handleGenerateImage = async (index: number, prompt: string, overrideReference?: string): Promise<{ image: string, hasCharacter: boolean } | null> => {
    if (generatingIndices.includes(index)) return null;
    setGeneratingIndices(prev => [...prev, index]);
    setError(null);

    try {
      let effectiveReference = overrideReference;
      if (!effectiveReference) {
        for (let i = index - 1; i >= 0; i--) {
           const seg = storyboardSegments[i];
           if (seg.generatedImage && seg.hasCharacter !== false) {
                 effectiveReference = seg.generatedImage;
                 break; 
           }
        }
        if (!effectiveReference) effectiveReference = referenceImage || undefined;
      }

      const visualStyle = VISUAL_STYLES.find(v => v.id === selectedVisualStyleId) || VISUAL_STYLES[0];
      const finalPrompt = `SCENE DESCRIPTION: ${prompt}. \n\nVISUAL STYLE INSTRUCTIONS: ${visualStyle.promptSuffix}`;
      const activeKey = getNextKey();
      const base64Image = await generateSceneImage(finalPrompt, effectiveReference || undefined, activeKey);
      
      if (base64Image) {
        const checkKey = getNextKey();
        const hasCharacter = await checkImageForCharacter(base64Image, checkKey);
        setStoryboardSegments(prev => {
          const newSegments = [...prev];
          newSegments[index] = { ...newSegments[index], generatedImage: base64Image, hasCharacter: hasCharacter };
          return newSegments;
        });
        return { image: base64Image, hasCharacter };
      } else {
        throw new Error("Nenhuma imagem gerada.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gerar imagem para a cena ${index + 1}.`);
      return null;
    } finally {
      setGeneratingIndices(prev => prev.filter(i => i !== index));
    }
  };

  const handleGenerateAllImages = async () => {
    let currentReference = referenceImage;
    for (let i = 0; i < storyboardSegments.length; i++) {
      const segment = storyboardSegments[i];
      if (segment.generatedImage) {
        if (segment.hasCharacter !== false) currentReference = segment.generatedImage;
        continue;
      }
      const result = await handleGenerateImage(i, segment.imagePrompt, currentReference || undefined);
      if (result && result.hasCharacter !== false) currentReference = result.image;
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const playAudio = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    if (analyserRef.current) {
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } else {
      source.connect(audioContextRef.current.destination);
    }
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  }, [audioBuffer]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleDownloadImage = (index: number) => {
     const segment = storyboardSegments[index];
     if (!segment.generatedImage) return;
     const link = document.createElement('a');
     link.href = segment.generatedImage;
     link.download = `cena_${index + 1}_imagem.png`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const handleDownloadAudio = (index: number) => {
    const segment = storyboardSegments[index];
    if (!segment.audio) return;
    const pcmData = decodeBase64(segment.audio);
    const wavBlob = pcmToWav(pcmData);
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cena_${index + 1}_audio.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllAssets = async () => {
    const zip = new JSZip();
    const folder = zip.folder("assets_storyboard");
    if (!folder) return;

    storyboardSegments.forEach((segment, i) => {
      const idx = (i + 1).toString().padStart(2, '0');
      folder.file(`cena_${idx}_texto.txt`, segment.narrativeText);
      folder.file(`cena_${idx}_prompt.txt`, segment.imagePrompt);
      if (segment.generatedImage) {
        const imgData = segment.generatedImage.split(',')[1];
        folder.file(`cena_${idx}_imagem.png`, imgData, { base64: true });
      }
      if (segment.audio) {
         const pcmData = decodeBase64(segment.audio);
         const wavBlob = pcmToWav(pcmData);
         folder.file(`cena_${idx}_audio.wav`, wavBlob);
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = "storyboard_completo.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportVideo = async () => {
    const segmentsToRender = storyboardSegments.filter(s => s.generatedImage && s.audio);
    if (segmentsToRender.length === 0) {
      setError("Gere pelo menos uma cena completa (imagem + áudio) para exportar.");
      return;
    }
    setIsRenderingVideo(true);
    setRenderProgress({ currentSegment: 0, totalSegments: storyboardSegments.length, status: 'preparing' });
    setError(null);
    try {
      const blob = await renderVideoFromSegments(storyboardSegments, (progress) => {
        setRenderProgress(progress);
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story_video_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError("Erro de renderização: " + err.message);
    } finally {
      setIsRenderingVideo(false);
      setRenderProgress(null);
    }
  };

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className={`h-[100dvh] md:h-screen flex flex-col bg-[--bg-base] text-[--text-main] overflow-hidden`}>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setUser(user);
          setStatusMessage("Login realizado com sucesso!");
          setTimeout(() => setStatusMessage(null), 3000);
        }}
      />

      {/* Project History Modal */}
      <ProjectHistoryModal 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        currentData={{
          text,
          segments: storyboardSegments,
          mode
        }}
        onLoad={(data, id) => {
          setText(data.text);
          setStoryboardSegments(data.segments);
          setMode(data.mode);
          setCurrentProjectId(id);
          setShowHistory(false);
          setStatusMessage("Projeto carregado com sucesso!");
          setTimeout(() => setStatusMessage(null), 3000);
        }}
        currentProjectId={currentProjectId}
        onUpdateCurrentId={setCurrentProjectId}
        user={user}
      />

      {/* Settings Modal - Styled Minimal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-[#141414] border border-[#333] w-full max-w-lg">
             <div className="flex justify-between items-center p-4 border-b border-fine">
               <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[--accent]">Configuração do Sistema</h3>
               <button onClick={() => setShowSettings(false)} className="text-[#666] hover:text-white transition-colors">
                 <X size={18} />
               </button>
             </div>
             <div className="p-6 space-y-6">
                
                {/* Auth Section in Settings */}
                <div className="space-y-4 pb-4 border-b border-fine">
                  <label className="block text-xs font-mono text-[#888] uppercase">Conta</label>
                  {user ? (
                    <div className="flex justify-between items-center bg-[#1a1a1a] p-3 border border-fine">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-[--accent]" />
                        <span className="text-xs font-mono">{user.email}</span>
                      </div>
                      <button onClick={handleSignOut} className="text-red-400 hover:text-red-300 transition-colors">
                        <LogOut size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-2 border border-[--accent] text-[--accent] font-mono text-xs uppercase hover:bg-[--accent] hover:text-black transition-colors"
                    >
                      Entrar / Cadastrar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-mono text-[#888] uppercase">Rotação de Chaves API</label>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-[#0c0c0c] border border-fine hover:border-[#444] text-[#ccc] py-3 px-4 flex items-center justify-center gap-2 transition-all font-mono text-xs">
                      <Upload size={14} />
                      CARREGAR CHAVES .TXT
                      <input type="file" ref={keyInputRef} onChange={handleKeyFileUpload} accept=".txt" className="hidden" />
                    </label>
                    <button onClick={clearKeys} disabled={apiKeys.length === 0} className="px-4 border border-fine hover:bg-red-900/20 text-red-400 disabled:opacity-20 font-mono">
                      LIMPAR
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#555] pt-2 border-t border-fine">
                     <span>CHAVES CARREGADAS: {apiKeys.length}</span>
                     <span>ÍNDICE ATUAL: {keyIndex}</span>
                  </div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Script Generation Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#333] w-full max-w-lg shadow-2xl shadow-black">
            <div className="flex justify-between items-center p-4 border-b border-fine bg-[#1a1a1a]">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2 text-[--accent]">
                <Sparkles size={16} />
                Gerador de Roteiro Viral
              </h3>
              <button onClick={() => setShowScriptModal(false)} className="text-[#666] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-[#888] uppercase">TEMA DO ROTEIRO "O QUE ACONTECERIA SE..."</label>
                <textarea 
                  value={scriptTopic}
                  onChange={(e) => setScriptTopic(e.target.value)}
                  placeholder="Ex: O que aconteceria se você não dormisse por 7 dias?"
                  className="w-full h-32 bg-[#0c0c0c] border border-fine p-4 text-[#ccc] focus:outline-none focus:border-[--accent] resize-none font-serif text-lg"
                />
              </div>
              <button 
                onClick={handleGenerateDramaticScript}
                disabled={isGeneratingScript || !scriptTopic.trim()}
                className="w-full py-4 bg-[--accent] hover:bg-[#d4c5a8] text-black font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingScript ? <Loader2 size={16} className="animate-spin" /> : "GERAR ROTEIRO COMPLETO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Rendering Overlay */}
      {isRenderingVideo && renderProgress && (
        <div className="fixed inset-0 z-[70] bg-[#0c0c0c]/90 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-full max-w-md p-8 border border-fine bg-[#141414] text-center space-y-6">
            <Loader2 size={32} className="animate-spin text-[--accent] mx-auto" />
            <div className="space-y-1">
               <h2 className="text-sm font-mono uppercase tracking-widest text-[#888]">Exportando Vídeo</h2>
               <p className="text-xs font-mono text-[--accent]">CENA {renderProgress.currentSegment} / {renderProgress.totalSegments}</p>
            </div>
            <div className="w-full bg-[#222] h-0.5">
               <div className="bg-[--accent] h-full transition-all duration-300" style={{ width: `${(renderProgress.currentSegment / renderProgress.totalSegments) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid: flex-col on mobile, flex-row on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left/Main Panel: Editor or Storyboard */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-fine bg-[--bg-base]">
          
          {/* Header */}
          <header className="h-14 min-h-[56px] border-b border-fine flex items-center justify-between px-4 md:px-6 bg-[--bg-base]">
            <div className="flex items-center gap-2 md:gap-4">
              <span className="font-serif italic text-lg md:text-xl text-[--text-main]">StoryVoice <span className="text-[--accent] text-[10px] md:text-sm font-sans font-normal not-italic tracking-widest uppercase ml-0.5 md:ml-1">AI</span></span>
              
              {/* Mode Switcher as Tabs */}
              <div className="h-4 md:h-6 w-[1px] bg-[#222] mx-1 md:mx-2"></div>
              <div className="flex gap-2 md:gap-4">
                 <button 
                   onClick={() => setMode('editor')}
                   className={`text-[10px] md:text-xs font-mono uppercase tracking-wider transition-colors ${mode === 'editor' ? 'text-[--accent]' : 'text-[#555] hover:text-[#888]'}`}
                 >
                   Editor
                 </button>
                 <button 
                   onClick={() => {
                     if(storyboardSegments.length > 0) setMode('storyboard');
                     else setError("Gere o storyboard primeiro.");
                   }}
                   className={`text-[10px] md:text-xs font-mono uppercase tracking-wider transition-colors ${mode === 'storyboard' ? 'text-[--accent]' : 'text-[#555] hover:text-[#888]'}`}
                 >
                   Storyboard
                 </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Status Message */}
              {statusMessage && (
                <span className="hidden md:flex text-[--accent] text-xs font-mono uppercase animate-fade-in mr-4 items-center gap-2">
                   {statusMessage}
                </span>
              )}
              
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-3">
                 {error && (
                   <span className="text-red-400 text-xs font-mono flex items-center gap-2 mr-4 animate-pulse">
                     <AlertCircle size={12} />
                     <span className="cursor-pointer" onClick={() => setError(null)}>{error}</span>
                   </span>
                 )}
                 <button onClick={openHistory} className="text-[#444] hover:text-[--accent] transition-colors" title="Salvar/Carregar Projetos">
                   <FolderOpen size={16} />
                 </button>
                 <div className="h-4 w-[1px] bg-[#333] mx-1"></div>
                 <button onClick={() => setShowSettings(true)} className={`transition-colors ${user ? 'text-[--accent]' : 'text-[#444] hover:text-[#ccc]'}`} title="Configurações">
                   {user ? <User size={16} /> : <Settings size={16} />}
                 </button>
                 <button onClick={toggleFullscreen} className="text-[#444] hover:text-[#ccc] transition-colors" title="Tela Cheia">
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                 </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setShowMobileControls(!showMobileControls)}
                className="md:hidden text-[--accent] hover:text-white p-2"
              >
                 <SlidersHorizontal size={20} />
              </button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-hidden relative">
            {mode === 'editor' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 relative group/editor overflow-hidden flex flex-col">
                   {/* Magic Script Button */}
                   <div className="absolute top-4 right-4 md:right-8 z-10 md:opacity-0 group-hover/editor:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowScriptModal(true)}
                        className="bg-[#141414]/80 backdrop-blur border border-fine text-[#888] hover:border-[--accent] hover:text-[--accent] px-3 py-2 flex items-center gap-2 transition-all text-[10px] md:text-xs font-mono uppercase"
                      >
                         <Wand2 size={14} />
                         Script Mágico
                      </button>
                   </div>

                  <textarea
                    className="flex-1 w-full bg-[--bg-base] p-6 md:p-12 text-[#ccc] placeholder-[#333] resize-none focus:outline-none font-serif text-lg md:text-2xl leading-relaxed selection:bg-[--accent] selection:text-black custom-scrollbar pb-20"
                    placeholder="Comece a escrever sua história..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    spellCheck={false}
                  />
                  {/* Floating Action Button for Storyboard Generation inside Editor */}
                  <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
                     <button
                        onClick={handleGenerateStoryboard}
                        disabled={isGeneratingStoryboard || !text.trim()}
                        className="bg-[#141414] border border-fine text-[--text-main] hover:border-[--accent] hover:text-[--accent] px-4 py-3 md:px-6 md:py-3 flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg"
                      >
                        {isGeneratingStoryboard ? <Loader2 size={16} className="animate-spin" /> : <LayoutList size={16} />}
                        <span className="font-mono text-[10px] md:text-xs uppercase tracking-wider">Gerar Storyboard</span>
                        {!isGeneratingStoryboard && <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                      </button>
                  </div>
                </div>
                
                {/* Minimal Waveform at bottom of editor */}
                <div className="h-20 md:h-32 border-t border-fine bg-[#0e0e0e] flex items-center justify-center p-4 flex-shrink-0">
                   <div className="w-full max-w-2xl h-full">
                      <WaveformVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
                   </div>
                </div>
              </div>
            )}

            {mode === 'storyboard' && (
               <StoryboardPanel 
                 segments={storyboardSegments}
                 onGenerateImage={handleGenerateImage}
                 generatingIndices={generatingIndices}
                 onGenerateAudio={handleGenerateSegmentAudio}
                 generatingAudioIndices={generatingAudioIndices}
                 onGenerateAll={handleGenerateAllImages}
                 referenceImage={referenceImage}
                 onReferenceImageChange={setReferenceImage}
                 onDownloadImage={handleDownloadImage}
                 onDownloadAudio={handleDownloadAudio}
                 onDownloadAllAssets={handleDownloadAllAssets}
                 onExportVideo={handleExportVideo}
               />
            )}
          </main>
        </div>

        {/* Right Sidebar: Responsive Drawer/Fixed Panel */}
        {/* Mobile Overlay Background */}
        {showMobileControls && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setShowMobileControls(false)}
          ></div>
        )}

        <aside 
          className={`
            fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[360px] bg-[#111] border-l border-fine flex flex-col 
            transform transition-transform duration-300 ease-in-out
            md:relative md:transform-none md:w-[360px] md:flex
            ${showMobileControls ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
           {/* Mobile Sidebar Header */}
           <div className="flex md:hidden justify-between items-center p-4 border-b border-fine bg-[#111]">
              <h2 className="text-xs font-mono font-bold uppercase text-[#888]">Controles do Estúdio</h2>
              <button onClick={() => setShowMobileControls(false)}>
                <X size={18} className="text-[#666]" />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar">
             <Controls
                onGenerate={handleGenerateAudio}
                onDownload={handleDownloadMainAudio}
                onPlay={playAudio}
                onStop={stopAudio}
                isPlaying={isPlaying}
                isGenerating={isGeneratingAudio}
                hasAudio={!!audioBuffer}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                selectedStyleId={selectedStyleId}
                onStyleChange={setSelectedStyleId}
                selectedVisualStyleId={selectedVisualStyleId}
                onVisualStyleChange={setSelectedVisualStyleId}
             />
             
             {/* Mobile Extra Settings that are usually in Header */}
             <div className="md:hidden p-6 border-t border-fine space-y-4">
                 <div className="flex items-center gap-4 text-[#666]">
                    <button onClick={openHistory} className="flex flex-col items-center gap-1 hover:text-[--accent]">
                       <FolderOpen size={20} />
                       <span className="text-[9px] font-mono uppercase">Projetos</span>
                    </button>
                    <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1 hover:text-[--accent]">
                       <Settings size={20} />
                       <span className="text-[9px] font-mono uppercase">Settings</span>
                    </button>
                 </div>
                 {error && (
                   <div className="text-red-400 text-xs font-mono p-2 border border-red-900/50 bg-red-900/10">
                     {error}
                   </div>
                 )}
             </div>
           </div>
        </aside>

      </div>
    </div>
  );
}

export default App;