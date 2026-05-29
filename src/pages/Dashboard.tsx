import React, { useEffect, useState } from 'react';
import { initFirebase } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, FileText, Gift, Award, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activePoints: 0,
    articles: 0,
    benefits: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const { db } = await initFirebase();
        if (!isMounted) return;
        
        const [usersSnap, articlesSnap, benefitsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'articles')),
          getDocs(collection(db, 'benefits'))
        ]);
        if (!isMounted) return;
        
        const totalPoints = usersSnap.docs.reduce((acc, doc) => acc + (doc.data().points || 0), 0);
        
        setStats({
          users: usersSnap.size,
          activePoints: totalPoints,
          articles: articlesSnap.size,
          benefits: benefitsSnap.size
        });
      } catch (e) {
        console.error("Dashboard error", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">Painel Administrativo</h1>
        <p className="text-neutral-500 dark:text-slate-400">Visão geral da plataforma e engajamento dos colaboradores.</p>
      </header>

      {loading ? (
         <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           
           <div className="bg-white dark:bg-[#0B1221] p-6 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                 <Users size={24} />
              </div>
              <h3 className="text-neutral-500 dark:text-slate-400 text-sm font-medium mb-1">Total de Usuários</h3>
              <p className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">{stats.users}</p>
           </div>
           
           <div className="bg-white dark:bg-[#0B1221] p-6 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                 <TrendingUp size={24} />
              </div>
              <h3 className="text-neutral-500 dark:text-slate-400 text-sm font-medium mb-1">Pontos Distribuídos</h3>
              <p className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">{stats.activePoints}</p>
           </div>
           
           <div className="bg-white dark:bg-[#0B1221] p-6 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                 <FileText size={24} />
              </div>
              <h3 className="text-neutral-500 dark:text-slate-400 text-sm font-medium mb-1">Notícias Publicadas</h3>
              <p className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">{stats.articles}</p>
           </div>
           
           <div className="bg-white dark:bg-[#0B1221] p-6 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/20 text-violet-500 rounded-2xl flex items-center justify-center mb-4">
                 <Gift size={24} />
              </div>
              <h3 className="text-neutral-500 dark:text-slate-400 text-sm font-medium mb-1">Benefícios na Loja</h3>
              <p className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">{stats.benefits}</p>
           </div>
        </div>
      )}
    </div>
  )
}
