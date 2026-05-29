import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { initFirebase, getSecondaryAuth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { ShieldCheck, User, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Navigate } from 'react-router-dom';

interface UserItem {
  id: string;
  email?: string;
  role: 'editor' | 'collaborator';
  points: number;
}

export function Users() {
  const { profile, activeRole } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'editor' | 'collaborator'>('collaborator');
  const [creating, setCreating] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { db } = await initFirebase();
      const snap = await getDocs(collection(db, 'users'));
      
      const loaded = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserItem[];
      // Sort editors first, then by points
      loaded.sort((a, b) => {
        if (a.role === 'editor' && b.role !== 'editor') return -1;
        if (b.role === 'editor' && a.role !== 'editor') return 1;
        return b.points - a.points;
      });
      setUsers(loaded);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (activeRole === 'editor') {
      loadUsers().catch(console.error);
    }
    
    return () => {
      isMounted = false;
    };
  }, [activeRole]);

  const toggleRole = async (userId: string, currentRole: string) => {
    if (!confirm(`Deseja alterar o perfil deste usuário?`)) return;
    try {
      const { db } = await initFirebase();
      const nextRole = currentRole === 'editor' ? 'collaborator' : 'editor';
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: nextRole } : u
      ));
    } catch (e) {
      console.error("Error updating role:", e);
      alert("Falha ao atualizar o perfil. Você tem permissão?");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    
    setCreating(true);
    try {
      const auth2 = await getSecondaryAuth();
      // This creates the user in Firebase Auth without logging out the main user because it's a separate app instance
      const cred = await createUserWithEmailAndPassword(auth2, newEmail.trim(), "Senha123");
      const { db } = await initFirebase();
      
      // Initialize their profile in firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: newEmail.trim(),
        role: newRole,
        points: 0,
        badges: [],
        readArticles: [],
        answeredQuizzes: [],
        createdAt: new Date().toISOString()
      });
      
      await signOut(auth2); // Clean up secondary auth state
      
      alert(`Usuário criado com sucesso! Senha padrão: Senha123`);
      setNewEmail('');
      setNewRole('collaborator');
      loadUsers(); // Refresh the list
    } catch (err: any) {
      console.error("Erro ao criar:", err);
      // Format friendly message
      if(err.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado.");
      else alert("Erro ao criar usuário: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setChangingPassword(true);
    try {
      const { auth } = await initFirebase();
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Senha atualizada com sucesso!");
        setNewPassword('');
      } else {
        alert("Usuário não autenticado.");
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
         alert("Por questões de segurança, você precisa fazer login novamente para alterar a senha.");
         const { auth } = await initFirebase();
         signOut(auth);
      } else {
         alert("Erro ao alterar senha: " + e.message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (activeRole !== 'editor') {
    return (
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-[#060B14]">
        <header className="px-6 py-5 border-b border-neutral-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 sticky top-0 flex flex-col justify-between">
          <div>
            <h1 className="text-[22px] font-bold font-display tracking-tight text-neutral-900 dark:text-white">Meu Perfil</h1>
            <p className="text-[13px] text-neutral-500 dark:text-slate-400 mt-1">Veja seus detalhes e configure sua conta.</p>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div className="max-w-xl mx-auto bg-white dark:bg-[#0B1221] border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 flex items-center gap-4 border-b border-neutral-200 dark:border-slate-800">
               <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-2xl shrink-0">
                  <User size={32} />
               </div>
               <div>
                  <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white">{profile?.email}</h2>
                  <div className="text-[14px] text-neutral-500 dark:text-slate-400 font-mono mt-1">
                     Nível: <span className="text-blue-500 font-bold uppercase tracking-wider">{profile?.role}</span>
                  </div>
               </div>
            </div>
            
            <div className="p-6">
               <h3 className="text-[15px] font-bold mb-4 dark:text-white">Alterar Senha</h3>
               <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <input 
                    type="password" 
                    placeholder="Nova senha (min. 6 caracteres)" 
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border border-neutral-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-[14px] outline-none focus:border-blue-500 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[13px] tracking-wide transition-colors disabled:opacity-50"
                  >
                    {changingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
               </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-[#060B14]">
      <header className="px-6 py-5 border-b border-neutral-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 sticky top-0 flex flex-col justify-between">
        <div>
          <h1 className="text-[22px] font-bold font-display tracking-tight text-neutral-900 dark:text-white">Gerenciar Usuários</h1>
          <p className="text-[13px] text-neutral-500 dark:text-slate-400 mt-1">Conceda permissões e adicione novos colaboradores.</p>
        </div>
      </header>

      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        
        {/* Create User Form */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#0B1221] border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2 dark:text-white"><UserPlus size={18}/> Novo Usuário</h2>
          <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
             <input 
               type="email" 
               placeholder="E-mail do colaborador" 
               required
               value={newEmail}
               onChange={e => setNewEmail(e.target.value)}
               className="flex-1 bg-transparent border border-neutral-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-[14px] outline-none focus:border-blue-500 dark:text-white"
             />
             <select 
               value={newRole}
               onChange={e => setNewRole(e.target.value as 'editor'|'collaborator')}
               className="bg-transparent border border-neutral-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-[14px] outline-none focus:border-blue-500 dark:text-white"
             >
               <option value="collaborator">Colaborador</option>
               <option value="editor">Editor</option>
             </select>
             <button
               type="submit"
               disabled={creating}
               className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[13px] tracking-wide transition-colors disabled:opacity-50"
             >
               {creating ? 'Criando...' : 'Adicionar Usuário'}
             </button>
          </form>
          <p className="text-xs text-neutral-500 dark:text-slate-500 mt-3 font-mono">A senha inicial gerada será "Senha123". O usuário poderá alterá-la via login.</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white dark:bg-[#0B1221] border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-neutral-500 animate-pulse font-mono text-sm uppercase tracking-widest">
              Carregando usuários...
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-slate-800">
              {users.map(u => (
                <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-slate-900/50 transition-colors">
                  
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                      u.role === 'editor' 
                        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" 
                        : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}>
                      {u.role === 'editor' ? <ShieldCheck size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] text-neutral-900 dark:text-slate-200">
                        {u.email || 'Email desconhecido' }
                        {u.email === 'hugo.yuri.77@gmail.com' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">Admin</span>}
                      </div>
                      <div className="text-[12px] font-mono text-neutral-500 dark:text-slate-500 mt-0.5 uppercase tracking-wide">
                        {u.points} pts • UID: {u.id.substring(0,6)}...
                      </div>
                    </div>
                  </div>

                  {u.email !== 'hugo.yuri.77@gmail.com' && (
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      className={cn(
                        "px-4 py-2 rounded-xl font-bold transition-all text-[11px] uppercase tracking-widest font-mono shadow-sm",
                        u.role === 'editor'
                          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50"
                      )}
                    >
                      {u.role === 'editor' ? 'Tornar Colaborador' : 'Tornar Editor'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
