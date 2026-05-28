import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Target, Award, Star, Flame, BookOpen, MessageCircleQuestion } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { getDb } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function Gamification() {
  const { profile } = useAuth();
  
  const [pendingNews, setPendingNews] = useState<any[]>([]);
  const [pendingQuizzes, setPendingQuizzes] = useState<any[]>([]);

  const points = profile?.points || 0;
  const badges = profile?.badges || [];

  const ALL_BADGES = [
    { name: "Iniciante", req: 100 },
    { name: "Leitor Assíduo", req: 300 },
    { name: "Expert", req: 600 },
    { name: "Mestre Folks", req: 1000 }
  ];
  
  // Also calculate implicit badges based on points to match UI logic
  const currentBadges = ALL_BADGES.filter(b => points >= b.req).map(b => b.name);
  // merge array
  const finalBadges = Array.from(new Set([...badges, ...currentBadges]));
  const nextBadge = ALL_BADGES.find(b => !finalBadges.includes(b.name));
  const nextTarget = nextBadge ? nextBadge.req : 1500;
  const progress = Math.min((points / nextTarget) * 100, 100);

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
    <div className="p-6 md:p-8 lg:max-w-5xl w-full mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Progresso & Conquistas</h1>
        <p className="text-slate-400 text-sm mt-1">Acompanhe seu engajamento com a cultura da Folks.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-700 rounded-2xl p-6 text-white shadow-xl shadow-black/20 md:col-span-2 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total de InsightCoins</p>
            <h2 className="text-5xl font-mono font-bold mb-6 tracking-tight text-blue-400">{points} <span className="text-2xl text-blue-500/50">PTS</span></h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span>Nível Atual</span>
                <span>{nextTarget - points > 0 ? `${nextTarget - points} pts faltam para ${nextBadge?.name || 'Próximo'}` : 'Máximo'}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
          <Target className="absolute -right-4 -bottom-4 text-blue-500/5 w-48 h-48 pointer-events-none" />
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center shadow-sm">
          <div className="w-10 h-10 bg-slate-800 border border-slate-700 text-orange-500 rounded-xl flex items-center justify-center mb-4">
            <Flame size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Missões e Recompensas</h3>
          
          <div className="flex flex-col gap-3 mb-4 flex-1">
             <Link to="/" className="bg-slate-800/50 hover:bg-slate-800 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between transition-colors">
               <div className="flex items-center gap-2">
                 <BookOpen size={14} className="text-blue-400" />
                 <span className="text-sm font-medium text-slate-300">Notícias Pendentes</span>
               </div>
               <span className="font-mono text-sm font-bold text-white">{pendingNews.length}</span>
             </Link>
             
             <Link to="/" className="bg-slate-800/50 hover:bg-slate-800 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between transition-colors">
               <div className="flex items-center gap-2">
                 <MessageCircleQuestion size={14} className="text-amber-400" />
                 <span className="text-sm font-medium text-slate-300">Quizzes Pendentes</span>
               </div>
               <span className="font-mono text-sm font-bold text-white">{pendingQuizzes.length}</span>
             </Link>
          </div>
          
          <Link to="/" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest text-[10px]">
            Cumprir Missões &rarr;
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          Suas Insígnias
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ALL_BADGES.map((badge, idx) => {
            const hasBadge = finalBadges.includes(badge.name);
            return (
              <div key={idx} className={cn("bg-slate-900 border rounded-xl p-4 flex flex-col items-center text-center transition-colors relative overflow-hidden", hasBadge ? "border-slate-700 hover:border-blue-500/50 shadow-sm" : "border-slate-800/50 opacity-50 grayscale")}>
                <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center mb-3 shadow-lg", hasBadge ? "bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-blue-800/50 text-blue-400 shadow-blue-900/20" : "bg-slate-800 border-slate-700 text-slate-500")}>
                  <Award size={20} />
                </div>
                <span className="font-semibold text-sm text-slate-200 mb-1 leading-tight">{badge.name}</span>
                {!hasBadge && <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{badge.req} PTS</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
