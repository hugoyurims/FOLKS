import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Newspaper, Trophy, MessageSquare, Menu, LogOut, Gift, Sun, Moon, Briefcase, Eye, Users, BarChart3, Medal } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Outlet, useLocation } from 'react-router-dom';

export function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, activeRole, setActiveRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isEditor = activeRole === 'editor';
  const canToggleRole = profile?.email === 'hugo.yuri.77@gmail.com' || profile?.email === 'teste@folks.com';

  const navItems = [
    { name: 'Notícias', path: '/', icon: <Newspaper size={20} /> },
    { name: 'Bem-estar IA', path: '/chat', icon: <MessageSquare size={20} /> },
    { name: 'Evolução', path: '/gamification', icon: <Trophy size={20} /> },
    { name: 'Loja', path: '/store', icon: <Gift size={20} /> },
  ];

  if (isEditor) {
    navItems.push({ name: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={20} /> });
    navItems.push({ name: 'Usuários', path: '/users', icon: <Users size={20} /> });
  } else {
    navItems.push({ name: 'Meu Perfil', path: '/users', icon: <Users size={20} /> });
  }

  const toggleRole = () => {
    setActiveRole(activeRole === 'editor' ? 'collaborator' : 'editor');
  };

  return (
    <div className="flex h-screen w-full bg-neutral-50 dark:bg-[#060B14] overflow-hidden text-neutral-900 dark:text-slate-200 font-sans transition-colors duration-300">
      <aside 
        className={cn(
          "bg-white dark:bg-[#0B1221] border-r border-neutral-200 dark:border-slate-800/60 transition-all duration-300 flex flex-col items-center sm:items-stretch z-20",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-slate-800/60 h-16">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="3" r="3" className="fill-[#8CB7F7]"/>
                <path d="M3.5 7 L12 11.5 L20.5 7 L20.5 10 L12 14.5 L3.5 10 Z" className="fill-[#8CB7F7]"/>
                <path d="M3.5 23 L12 18.5 L20.5 23 L20.5 20 L12 15.5 L3.5 20 Z" className="fill-[#8CB7F7]"/>
              </svg>
              <span className="font-display font-black text-[22px] tracking-wide dark:text-white text-[#183764] truncate">FOLKS<span className="text-blue-500 font-normal opacity-90 ml-1">Insight</span></span>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800/60 text-neutral-500 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mx-auto sm:mx-0 shrink-0"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 w-full relative z-10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative",
                location.pathname === item.path 
                  ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/10 font-medium" 
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/40"
              )}
            >
              <div className="flex-shrink-0 transition-transform group-hover:scale-110 duration-200">{item.icon}</div>
              {!collapsed && <span className="font-medium text-[15px]">{item.name}</span>}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-neutral-800 dark:bg-slate-800 text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  {item.name}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-slate-800/60 flex flex-col gap-3">
          <button 
            onClick={toggleTheme}
            className={cn("flex items-center gap-3 px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-300 rounded-lg transition-colors w-full", collapsed && "justify-center")}
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span className="font-medium text-sm">Tema {theme === 'dark' ? 'Claro' : 'Escuro'}</span>}
          </button>

          {canToggleRole && (
             <button 
             onClick={toggleRole}
             className={cn("flex items-center gap-3 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors w-full", collapsed && "justify-center")}
             title={`Alternar para ${activeRole === 'editor' ? 'Visor' : 'Editor'}`}
           >
             {activeRole === 'editor' ? <Eye size={20} /> : <Briefcase size={20} />}
             {!collapsed && <span className="font-medium text-sm text-left leading-tight">Alternar Perfil<br/><span className="text-[10px] opacity-70 uppercase tracking-widest">{activeRole === 'editor' ? 'Para Visor' : 'Para Editor'}</span></span>}
           </button>
          )}
          
          <div className={cn("flex items-center gap-3 py-2", collapsed ? "justify-center" : "justify-start px-3")}>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
              {activeRole === 'editor' ? 'E' : 'C'}
            </div>
            {!collapsed && (
              <div className="flex flex-col text-xs overflow-hidden">
                <span className="font-bold text-neutral-900 dark:text-slate-200 truncate">Meu Perfil</span>
                <span className="text-neutral-500 dark:text-slate-500 font-mono tracking-tight uppercase">{activeRole}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={logout}
            className={cn("flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 rounded-lg transition-colors w-full", collapsed && "justify-center")}
            title="Sair"
          >
            <LogOut size={20} />
            {!collapsed && <span className="font-medium text-sm">Sair da Conta</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative bg-neutral-50/50 dark:bg-slate-950/50 animate-in fade-in duration-300">
        <Outlet />
      </main>
    </div>
  );
}
