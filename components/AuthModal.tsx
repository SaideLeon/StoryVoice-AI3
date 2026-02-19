import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { X, Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          onSuccess(data.user);
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          // Check if email confirmation is required by Supabase settings
          if (data.session) {
             onSuccess(data.user);
             onClose();
          } else {
             setError("Cadastro realizado! Verifique seu email para confirmar a conta.");
             setLoading(false); // Stop loading but keep modal open to show message
             return;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro de autenticação");
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333] w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
             <h2 className="font-serif text-2xl text-[--accent] mb-2">
               {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
             </h2>
             <p className="text-xs font-mono text-[#666]">
               {isLogin ? 'Acesse seus projetos e chaves salvas' : 'Comece a criar suas histórias'}
             </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/10 border border-red-900/30 text-red-400 text-xs font-mono flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#555] uppercase">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3.5 text-[#444]" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#222] text-[#ccc] py-3 pl-10 pr-4 text-sm focus:border-[--accent] focus:outline-none transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#555] uppercase">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-[#444]" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#222] text-[#ccc] py-3 pl-10 pr-4 text-sm focus:border-[--accent] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[--accent] hover:bg-[#d4c5a8] text-black font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Cadastrar'}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#222] text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-xs text-[#666] hover:text-[--accent] transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {isLogin ? (
                <>
                  <UserPlus size={14} /> Não tem conta? Cadastre-se
                </>
              ) : (
                <>
                  <LogIn size={14} /> Já tem conta? Entre
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;