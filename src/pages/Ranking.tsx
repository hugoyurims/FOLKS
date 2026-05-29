import React, { useEffect, useState } from 'react';
import { initFirebase } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Medal, Search, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { getFromCache, setInCache } from '../lib/cache';

export function Ranking() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = async () => {
    const cached = getFromCache('ranking');
    if (cached) {
      setUsers(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    
    try {
      const { db } = await initFirebase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('points', 'desc'), limit(50));
      
      const snapshot = await getDocs(q);
      const rankingData = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        position: index + 1,
        ...doc.data()
      }));
      
      setUsers(rankingData);
      setInCache('ranking', rankingData);
    } catch (e) {
      console.error("Error setting up ranking", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 md:p-8 max-w-4xl mx-auto w-full"
    >
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32} />
            Ranking Global
          </h1>
          <p className="text-neutral-500 dark:text-slate-400">Os maiores talentos e engajadores da plataforma.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0B1221] border border-neutral-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-slate-900/50 border-b border-neutral-200 dark:border-slate-800">
                  <th className="py-4 px-6 font-semibold text-neutral-600 dark:text-slate-300 w-24 text-center">Posição</th>
                  <th className="py-4 px-6 font-semibold text-neutral-600 dark:text-slate-300">Colaborador</th>
                  <th className="py-4 px-6 font-semibold text-neutral-600 dark:text-slate-300 text-center">Nível</th>
                  <th className="py-4 px-6 font-semibold text-neutral-600 dark:text-slate-300 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const isCurrent = user.email === profile?.email;
                  const isTop3 = index < 3;
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={cn(
                        "border-b border-neutral-100 dark:border-slate-800/50 transition-colors last:border-0",
                        isCurrent ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-neutral-50 dark:hover:bg-slate-900/30"
                      )}
                    >
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                           {index === 0 ? <Medal size={28} className="text-yellow-500 drop-shadow-md" /> :
                            index === 1 ? <Medal size={28} className="text-slate-400 drop-shadow-md" /> :
                            index === 2 ? <Medal size={28} className="text-orange-500 drop-shadow-md" /> :
                            <span className="font-mono font-bold text-neutral-500 dark:text-slate-500 text-lg">{index + 1}º</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm",
                            isTop3 ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-300"
                          )}>
                            {(user.email || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className={cn(
                              "font-bold block tracking-tight",
                              isCurrent ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-white"
                            )}>
                              {(user.email || 'Usuário').split('@')[0]}
                              {isCurrent && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">Você</span>}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-slate-500 hidden sm:block">{user.role === 'editor' ? 'Administrador' : 'Colaborador'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          <Star size={12} className={user.points >= 1000 ? "text-amber-500" : user.points >= 500 ? "text-violet-500" : "text-blue-500"} />
                          {user.points >= 1000 ? 'Mestre' : user.points >= 500 ? 'Especialista' : user.points >= 200 ? 'Aprendiz' : 'Novato'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "font-mono font-bold text-lg",
                            isTop3 ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-slate-300"
                          )}>
                            {user.points || 0}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400 dark:text-slate-500 uppercase tracking-widest">PTS</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
