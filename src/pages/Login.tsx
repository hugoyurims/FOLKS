import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LogIn, Mail } from 'lucide-react';
import { useState } from 'react';

export function Login() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    }
  };

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen relative w-full overflow-hidden bg-neutral-50 dark:bg-[#060B14]">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen"
        poster="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
      >
        <source src="https://cdn.pixabay.com/video/2020/07/22/45366-443301413_large.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-50 dark:to-[#060B14] z-0"></div>

      <div className="flex w-full max-w-md mx-auto flex-col justify-center px-4 sm:px-6 lg:px-8 z-10">
        <div className="bg-white/80 dark:bg-[#0B1221]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/40 dark:border-slate-800/60">
          <div className="flex justify-center mb-6">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="3" r="3" className="fill-[#8CB7F7]"/>
              <path d="M3.5 7 L12 11.5 L20.5 7 L20.5 10 L12 14.5 L3.5 10 Z" className="fill-[#8CB7F7]"/>
              <path d="M3.5 23 L12 18.5 L20.5 23 L20.5 20 L12 15.5 L3.5 20 Z" className="fill-[#8CB7F7]"/>
            </svg>
          </div>
          
          <h2 className="text-center text-4xl font-display font-black text-[#183764] dark:text-white tracking-tight mb-3">
            FOLKS<span className="text-blue-600 dark:text-blue-500 font-normal opacity-90 ml-1">Insight</span>
          </h2>
          <p className="text-center text-sm font-medium text-neutral-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">
            Integração. Bem-estar Digital. Tecnologia em Saúde.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
            <div>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail" 
                className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha" 
                className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 
              transition-colors duration-200 font-bold text-sm tracking-wide shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              <Mail size={18} />
              {isRegistering ? 'Criar Conta' : 'Entrar com E-mail'}
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-neutral-500 dark:text-neutral-400 text-center hover:text-blue-500"
            >
              {isRegistering ? 'Já tenho uma conta. Entrar.' : 'Não tem conta? Criar agora.'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 dark:bg-[#0B1221] text-neutral-500">ou</span>
            </div>
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-slate-700 dark:text-white bg-white dark:bg-slate-800 border-2 border-neutral-100 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700
            transition-colors duration-200 font-bold text-sm tracking-wide shadow-sm active:scale-[0.98]"
          >
            <LogIn size={18} />
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
