import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Target, Award, Flame, BookOpen, MessageCircleQuestion, ChevronRight, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { getDb } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import Confetti from 'react-confetti';

const LEVELS = [
  { id: 1, name: "Novato", req: 0, color: "text-slate-400", bg: "bg-slate-400/20", border: "border-slate-400/30" },
  { id: 2, name: "Aprendiz", req: 200, color: "text-blue-400", bg: "bg-blue-400/20", border: "border-blue-400/30" },
  { id: 3, name: "Especialista", req: 500, color: "text-violet-400", bg: "bg-violet-400/20", border: "border-violet-400/30" },
  { id: 4, name: "Mestre", req: 1000, color: "text-amber-400", bg: "bg-amber-400/20", border: "border-amber-400/30" }
];

export function Gamification() {
  const { profile } = useAuth();
  
  const [pendingNews, setPendingNews] = useState<any[]>([]);
  const [pendingQuizzes, setPendingQuizzes] = useState<any[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevelId, setPrevLevelId] = useState<number | null>(null);

  const points = profile?.points || 0;

  // Find current level
  const currentLevel = [...LEVELS].reverse().find(l => points >= l.req) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.req > points);
  
  const nextTarget = nextLevel ? nextLevel.req : currentLevel.req + 500;
  const currentBase = currentLevel.req;
  const progressPercent = nextLevel 
      ? Math.min(((points - currentBase) / (nextTarget - currentBase)) * 100, 100)
      : 100;

  // Level up detection
  useEffect(() => {
    // We only trigger level up if prevLevelId is set AND the new level is higher
    if (prevLevelId !== null && currentLevel.id > prevLevelId) {
      setShowLevelUp(true);
      const timer = setTimeout(() => setShowLevelUp(false), 5000); // hide after 5s
      return () => clearTimeout(timer);
    }
    // Update the ref to current level after checking
    setPrevLevelId(currentLevel.id);
  }, [currentLevel.id, prevLevelId]);

  useEffect(() => {
    async function loadPending() {
       try {
         const db = getDb();
         const snap = await getDocs(query(collection(db, 'articles'), where('status', '==', 'published')));
         
         const uniqueTitles = new Set<string>();
         const uniqueArticles: any[] = [];
         snap.forEach(d => {
           const data = { id: d.id, ...d.data() } as any;
           if (!uniqueTitles.has(data.title)) {
             uniqueTitles.add(data.title);
             uniqueArticles.push(data);
           }
         });
         
         const readIds = profile?.readArticles || [];
         const answeredIds = profile?.answeredQuizzes || [];
         
         setPendingNews(uniqueArticles.filter(a => !readIds.includes(a.id)));
         setPendingQuizzes(uniqueArticles.filter(a => a.quiz && !answeredIds.includes(a.id)));
       } catch (e) {
         console.error(e);
       }
    }
    if (profile) loadPending();
  }, [profile]);

  return (
    <div className="p-6 md:p-8 lg:max-w-5xl w-full mx-auto relative">
      {/* Confetti overlay for Level Up */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
           <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
           <motion.div 
             initial={{ scale: 0.5, opacity: 0, y: 50 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.8, opacity: 0 }}
             transition={{ type: "spring", bounce: 0.5 }}
             className="bg-slate-900 border border-slate-700 shadow-2xl p-8 rounded-3xl flex flex-col items-center text-center max-w-sm pointer-events-auto"
           >
              <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl border-4", currentLevel.bg, currentLevel.border, currentLevel.color)}>
                 <Trophy size={48} />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-2">Subiu de Nível!</h2>
              <p className="text-slate-300">Você alcançou a categoria <strong className={currentLevel.color}>{currentLevel.name}</strong>.</p>
              <button 
                onClick={() => setShowLevelUp(false)}
                className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
              >
                Continuar
              </button>
           </motion.div>
        </div>
      )}

      <header className="mb-10">
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">Evolução & Conquistas</h1>
        <p className="text-neutral-500 dark:text-slate-400 text-[15px] mt-2">Continue evoluindo na sua jornada de bem-estar corporativo.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <motion.div 
          layoutId="level-card"
          className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-800 rounded-3xl p-8 text-white shadow-xl md:col-span-2 relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-inner backdrop-blur-sm", currentLevel.bg, currentLevel.color)}>
                    <Award size={28} />
                 </div>
                 <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Seu Nível Atual</p>
                    <h2 className={cn("text-2xl font-bold tracking-tight", currentLevel.color)}>{currentLevel.name}</h2>
                 </div>
              </div>
              
              <div className="flex items-end gap-2 mb-8">
                <span className="text-6xl font-mono font-bold tracking-tighter text-white">{points}</span>
                <span className="text-xl text-slate-500 font-bold font-mono relative bottom-2">PTS</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                <span>Progresso para o Próximo Nível</span>
                <span>{nextLevel ? `${nextTarget - points} pts restantes` : 'Nível Máximo'}</span>
              </div>
              <div className="w-full bg-slate-900/80 rounded-full h-3 border border-slate-700/50 overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn("h-full rounded-full relative", currentLevel.color.replace('text-', 'bg-'))}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                </motion.div>
              </div>
            </div>
          </div>
          <Target className="absolute -right-8 -bottom-8 text-white/5 w-64 h-64 pointer-events-none transform rotate-12" />
        </motion.div>

        <div className="bg-white dark:bg-[#0B1221] rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
          
          <div>
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Flame size={24} />
            </div>
            <h3 className="text-xl font-bold font-display text-neutral-900 dark:text-white mb-2 tracking-tight">Missões Ativas</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">Complete leitura de notícias e quizzes para avançar de nível mais rápido.</p>
          </div>
          
          <div className="flex flex-col gap-3 mb-6 relative z-10">
             <Link to="/" className="bg-neutral-50 dark:bg-slate-900/50 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl p-4 border border-neutral-200 dark:border-slate-800/50 flex items-center justify-between transition-all group/link">
               <div className="flex items-center gap-3">
                 <BookOpen size={16} className="text-blue-500" />
                 <span className="text-[13px] font-bold text-neutral-700 dark:text-slate-300 tracking-wide">Notícias Recentes</span>
               </div>
               <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white bg-white dark:bg-slate-950 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-slate-800">{pendingNews.length}</span>
             </Link>
             
             <Link to="/" className="bg-neutral-50 dark:bg-slate-900/50 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl p-4 border border-neutral-200 dark:border-slate-800/50 flex items-center justify-between transition-all group/link">
               <div className="flex items-center gap-3">
                 <MessageCircleQuestion size={16} className="text-amber-500" />
                 <span className="text-[13px] font-bold text-neutral-700 dark:text-slate-300 tracking-wide">Quizzes Pendentes</span>
               </div>
               <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white bg-white dark:bg-slate-950 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-slate-800">{pendingQuizzes.length}</span>
             </Link>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-white mb-6">Estrutura de Níveis</h3>
        
        <div className="flex flex-col gap-4">
          {LEVELS.map((level, idx) => {
            const isUnlocked = points >= level.req;
            const isCurrent = currentLevel.id === level.id;
            
            return (
              <div 
                key={level.id} 
                className={cn(
                  "border rounded-2xl p-5 flex items-center gap-6 transition-all duration-300 relative overflow-hidden",
                  isCurrent ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-700 shadow-md ring-1 ring-blue-500/20" : 
                  isUnlocked ? "bg-white dark:bg-[#0B1221] border-neutral-200 dark:border-slate-800" : "bg-neutral-50 dark:bg-slate-900/30 border-neutral-100 dark:border-slate-800/50 opacity-60"
                )}
              >
                {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl"></div>}
                
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all",
                  isUnlocked ? cn(level.bg, level.border, level.color) : "bg-neutral-100 dark:bg-slate-950 border-neutral-200 dark:border-slate-800 text-neutral-400 dark:text-slate-600"
                )}>
                  {isUnlocked ? <Award size={24} /> : <Award size={24} className="opacity-50" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={cn("text-lg font-bold tracking-tight", isUnlocked ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-slate-500")}>
                      {level.name}
                    </h4>
                    {isCurrent && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded uppercase font-mono text-[9px] font-bold tracking-widest border border-blue-200 dark:border-blue-800/50">Você está aqui</span>}
                  </div>
                  <p className="text-xs font-mono font-semibold uppercase tracking-widest text-neutral-500 dark:text-slate-500">{level.req} PTS Necessários</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
