import React, { useEffect, useState } from 'react';
import { getDb, getFirebaseAuth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Loader2, AlertCircle, CheckCircle2, BookOpen, MessageCircleQuestion, Plus, RefreshCcw, Edit, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Article {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'internal';
  status: string;
  quiz?: {
    question: string;
    options: string[];
    answerIndex: number;
  };
  createdAt: string;
}

export function News() {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  // Editor states
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'general'|'internal'>('general');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [generateQuiz, setGenerateQuiz] = useState(true);
  const [savingMsg, setSavingMsg] = useState('');
  const [syncingNews, setSyncingNews] = useState(false);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const { profile, activeRole, markArticleAsRead } = useAuth();
  const readArticles = profile?.readArticles || [];
  const answeredQuizzes = profile?.answeredQuizzes || [];
  const isEditor = activeRole === 'editor';

  useEffect(() => {
    let unsubscribe: () => void;
    
    const setupNews = async () => {
      try {
        const db = getDb();
        let newsQuery = query(collection(db, 'articles'));
        // If collaborator, only show published. If editor, show all (including drafts).
        if (!isEditor) {
          newsQuery = query(collection(db, 'articles'), where('status', '==', 'published'));
        }
        
        unsubscribe = onSnapshot(newsQuery, (snap) => {
          const uniqueTitles = new Set<string>();
          const data = snap.docs.reduce((acc, doc) => {
            const article = { 
              id: doc.id, 
              ...doc.data(),
              category: doc.data().category || 'general'
            } as Article;
              
              if (!uniqueTitles.has(article.title)) {
                uniqueTitles.add(article.title);
                acc.push(article);
              }
              return acc;
            }, [] as Article[]);
            data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNews(data);
            setLoading(false);
        }, (error) => {
          console.error("Error loading news", error);
          setLoading(false);
        });
      } catch (e) {
        console.error("Error setting up news", e);
        setLoading(false);
      }
    };
    
    setupNews();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isEditor]);

  const handleSyncNews = async () => {
    setSyncingNews(true);
    try {
      const auth = getFirebaseAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const res = await fetch('/api/fetch-external-news', { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
      });
      const articles = await res.json();
      
      const db = getDb();
      for (const article of articles) {
         await addDoc(collection(db, 'articles'), {
           title: article.title,
           content: article.content,
           category: article.category || 'general',
           status: 'draft',
           authorId: auth.currentUser!.uid,
           createdAt: new Date().toISOString()
         });
      }
      setSavingMsg('Notícias importadas como rascunho com sucesso!');
      setTimeout(() => setSavingMsg(''), 4000);
    } catch(e) {
       console.error("Sync error", e);
       alert("Erro ao sincronizar notícias");
    } finally {
       setSyncingNews(false);
    }
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const db = getDb();
      const errSnap = await getDocs(collection(db, 'error_logs'));
      const errors = errSnap.docs.map(d => d.data().message || '');
      
      const feedSnap = await getDocs(collection(db, 'feedbacks'));
      const feeds = feedSnap.docs.map(d => {
        const data = d.data();
        return `O bot disse: "${data.botMessage}" e o usuário avaliou como ${data.isPositive ? 'POSITIVO' : 'NEGATIVO'}`;
      });

      const allFeedbacks = [...errors, ...feeds];
      
      const auth = getFirebaseAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const res = await fetch('/api/feedback-summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ feedbacks: allFeedbacks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.text);
    } catch(e) {
      console.error(e);
      alert('Erro ao gerar resumo inteligênte.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const openArticle = (article: Article) => {
    setReadingArticle(article);
    setSelectedAnswer(null);
    setQuizStatus('idle');
    markArticleAsRead(article.id, false);
  };

  const handleQuizAnswer = (index: number) => {
    if (quizStatus !== 'idle' || !readingArticle?.quiz) return;
    
    setSelectedAnswer(index);
    if (index === readingArticle.quiz.answerIndex) {
       setQuizStatus('correct');
       markArticleAsRead(readingArticle.id, true);
    } else {
       setQuizStatus('incorrect');
    }
  };

  const handleEdit = (a: Article, e: React.MouseEvent) => {
     e.stopPropagation();
     setEditingId(a.id);
     setTitle(a.title);
     setContent(a.content);
     setCategory(a.category);
     setIsEditorModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     try {
       await deleteDoc(doc(getDb(), 'articles', id));
     } catch (e) {
       console.error("Delete error", e);
     }
  };

  const handleSave = async (isDraft: boolean) => {
    if (!title || !content) return;
    setSavingMsg('Salvando...');
    try {
      const db = getDb();
      const auth = getFirebaseAuth();
      
      let quizData = null;
      if (!isDraft && generateQuiz) {
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
          const res = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ content })
          });
          const js = await res.json();
          if (js.question && js.options && typeof js.answerIndex === 'number') {
            quizData = js;
          }
        } catch (e) {
          console.error("Quiz generation failed", e);
        }
      }

      const payload: any = {
        title,
        content,
        category,
        status: isDraft ? 'draft' : 'published',
        authorId: auth.currentUser!.uid,
        createdAt: new Date().toISOString()
      };

      if (quizData) {
        payload.quiz = quizData;
      }

      if (editingId) {
        await updateDoc(doc(db, 'articles', editingId), payload);
      } else {
        await addDoc(collection(db, 'articles'), payload);
      }
      
      setIsEditorModalOpen(false);
      setTitle('');
      setContent('');
      setCategory('general');
      setGenerateQuiz(true);
      setEditingId(null);
      setSavingMsg('Salvo com sucesso!');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar');
    }
  };

  const filteredNews = news.filter(a => filterStatus === 'all' || a.status === filterStatus);
  const generalNews = filteredNews.filter(a => a.category === 'general');
  const internalComms = filteredNews.filter(a => a.category === 'internal');

  const renderArticleList = (articlesList: Article[]) => {
    if (articlesList.length === 0) {
      return <div className="text-sm font-mono text-neutral-500 py-4">Nenhum artigo nesta seção.</div>
    }
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articlesList.map(article => {
          const isRead = readArticles.includes(article.id);
          return (
            <article 
              key={article.id} 
              onClick={() => openArticle(article)}
              className={cn(
                "flex flex-col cursor-pointer transition-all duration-300 group rounded-2xl overflow-hidden border bg-white dark:bg-slate-900/60",
                isRead ? "border-neutral-200 dark:border-slate-800/80 opacity-80" : "border-neutral-200 dark:border-slate-700 shadow-lg shadow-neutral-200/50 dark:shadow-black/20 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl"
              )}
            >
              <div className={cn("h-44 p-6 flex flex-col justify-between relative overflow-hidden", article.category === 'internal' ? 'bg-gradient-to-br from-violet-900 to-[#1e1136] dark:from-neutral-100 dark:to-neutral-300' : 'bg-gradient-to-br from-blue-900 to-[#0B1121] dark:from-neutral-50 dark:to-neutral-200')}>
                {isRead && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white rounded-full p-1 shadow-md z-20">
                    <CheckCircle2 size={16} />
                  </div>
                )}
                {isEditor && article.status === 'draft' && (
                  <div className="absolute top-4 left-4 bg-orange-500 text-white rounded px-2 py-1 shadow-md z-20 text-[10px] font-bold uppercase tracking-widest">
                    Rascunho
                  </div>
                )}
                <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10 flex items-center justify-between">
                   <div className="flex gap-2">
                     <span className="px-2.5 py-1 bg-white/10 dark:bg-black/5 backdrop-blur-md border border-white/20 dark:border-black/10 text-white dark:text-neutral-700 text-[10px] font-mono rounded-full uppercase tracking-widest font-semibold">+10 PTS</span>
                     {article.quiz && !answeredQuizzes.includes(article.id) && <span className="px-2.5 py-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white border border-white/20 text-[10px] font-mono rounded-full uppercase tracking-widest font-bold flex items-center gap-1 shadow-sm"><MessageCircleQuestion size={10} /> QUIZ +50</span>}
                   </div>
                </div>
                
                <h2 className={cn("text-lg font-display font-bold text-white dark:text-neutral-900 leading-snug relative z-10 transition-colors drop-shadow-md dark:drop-shadow-none", !isRead && "group-hover:text-blue-200 dark:group-hover:text-blue-700")}>
                  {article.title}
                </h2>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex-1 text-sm text-neutral-600 dark:text-slate-400 line-clamp-3 mb-5 leading-relaxed">
                  {article.content}
                </div>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <BookOpen size={14} /> 
                    {isRead ? 'Lida' : 'Ler artigo'}
                  </div>
                  {isEditor ? (
                    <div className="flex gap-2 z-20 relative">
                       <button onClick={(e) => handleEdit(article, e)} className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 rounded-lg shadow-sm border border-neutral-200 dark:border-slate-700 transition-colors"><Edit size={14}/></button>
                       <button onClick={(e) => handleDelete(article.id, e)} className="p-1.5 bg-white hover:bg-red-50 text-red-600 dark:bg-slate-800 dark:text-red-400 rounded-lg shadow-sm border border-neutral-200 dark:border-slate-700 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-400 dark:text-slate-500 font-mono">
                      {new Date(article.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-10 lg:max-w-7xl w-full mx-auto overflow-y-auto relative">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">Painel de Atualizações</h1>
          <p className="text-neutral-500 dark:text-slate-400 text-[15px] mt-2 max-w-2xl">Descubra como estruturar a adoção de novas tecnologias e práticas de saúde digital na sua rotina.</p>
        </div>
        
         {isEditor && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
             <select
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value as any)}
                 className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-mono font-bold outline-none cursor-pointer"
             >
                 <option value="all">TODAS</option>
                 <option value="published">PUBLICADAS</option>
                 <option value="draft">RASCUNHOS</option>
             </select>
             <button 
                onClick={generateSummary}
                disabled={loadingSummary}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-600/10 dark:border dark:border-blue-500/30 dark:text-blue-400 px-4 py-2.5 rounded-xl font-bold dark:hover:bg-blue-600/20 transition-colors disabled:opacity-50 text-[11px] uppercase tracking-widest font-mono shrink-0"
             >
                {loadingSummary ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4" />}
                Resumo IA
             </button>
             <button 
                onClick={handleSyncNews}
                disabled={syncingNews}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-slate-800 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-[11px] uppercase tracking-widest font-mono"
             >
                {syncingNews ? <Loader2 className="animate-spin w-4 h-4"/> : <RefreshCcw size={16} />}
                Buscar Notícias
             </button>
             <button 
                onClick={() => {
                  setTitle(''); setContent(''); setEditingId(null); setCategory('general'); setIsEditorModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors text-[11px] uppercase tracking-widest font-mono shadow-md"
             >
                <Plus size={16} />
                Nova Notícia
             </button>
          </div>
        )}
      </header>

      {summary && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
           <h3 className="font-bold text-blue-800 dark:text-blue-400 font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
             <Sparkles size={16} /> Resumo Analítico de Engajamento
           </h3>
           <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-none text-neutral-700 dark:text-slate-300 whitespace-pre-wrap">
             {summary}
           </div>
           <button onClick={() => setSummary('')} className="mt-4 text-[10px] font-bold text-neutral-500 hover:text-neutral-700 dark:text-slate-500 dark:hover:text-slate-300 uppercase tracking-widest font-mono">
             Fechar Relatório
           </button>
        </div>
      )}

      {savingMsg && (
        <div className="mb-8 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 font-mono text-sm max-w-md">
           <CheckCircle2 className="text-emerald-500 shrink-0" />
           <span>{savingMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-blue-600 dark:text-blue-500"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : news.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-neutral-200 dark:border-slate-800 p-12 text-center flex flex-col items-center">
          <AlertCircle className="text-neutral-400 dark:text-slate-600 w-12 h-12 mb-4" />
          <h3 className="text-lg font-bold text-neutral-800 dark:text-slate-200">Nenhuma atualização no momento</h3>
          <p className="text-neutral-500 dark:text-slate-500 mt-2">Nossas publicações aparecerão aqui em breve.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="text-xl font-bold font-display tracking-tight text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
               <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} />
               </span>
               Comunicações Internas
            </h2>
            {renderArticleList(internalComms)}
          </section>
          
          <section>
            <h2 className="text-xl font-bold font-display tracking-tight text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
               <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen size={16} />
               </span>
               Notícias Gerais
            </h2>
            {renderArticleList(generalNews)}
          </section>
        </div>
      )}

      {/* Reader Modal */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0B1221] border border-neutral-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-neutral-100 dark:border-slate-800/60 flex justify-between items-start">
              <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white leading-tight mr-4">{readingArticle.title}</h2>
              <button 
                onClick={() => setReadingArticle(null)}
                className="p-2 bg-neutral-100 dark:bg-slate-800/50 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
               <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-neutral-600 dark:prose-p:text-slate-300 mb-8 markdown-body">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{readingArticle.content}</ReactMarkdown>
               </div>
               
               {/* Quiz Section */}
               {readingArticle.quiz && (
                 <div className="bg-neutral-50 dark:bg-slate-900 rounded-2xl p-6 border border-blue-500/20 dark:border-blue-900/30">
                   <h3 className="font-bold text-blue-600 dark:text-blue-400 font-mono tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                     <MessageCircleQuestion size={16} /> QUIZ RELÂMPAGO (+50 PTS)
                   </h3>
                   {answeredQuizzes.includes(readingArticle.id) ? (
                      <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                        <CheckCircle2 size={24} />
                        <span className="font-bold">Você já respondeu corretamente a este quiz e garantiu seus pontos!</span>
                      </div>
                   ) : (
                     <div className="flex flex-col gap-4">
                       <p className="font-medium text-neutral-900 dark:text-white text-[15px]">{readingArticle.quiz.question}</p>
                       <div className="flex flex-col gap-2">
                         {readingArticle.quiz.options.map((opt, idx) => {
                            const isSelected = selectedAnswer === idx;
                            const isCorrect = quizStatus === 'correct' && isSelected;
                            const isWrong = quizStatus === 'incorrect' && isSelected;
                            return (
                              <button 
                                key={idx}
                                disabled={quizStatus === 'correct'}
                                onClick={() => handleQuizAnswer(idx)}
                                className={cn(
                                  "text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                                  isCorrect ? "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 font-medium font-bold" :
                                  isWrong ? "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300" :
                                  "bg-white dark:bg-slate-950 border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
                                )}
                              >
                                {opt}
                              </button>
                            );
                         })}
                       </div>
                       {quizStatus === 'correct' && <p className="text-emerald-600 text-sm font-bold mt-2">Resposta correta! Você ganhou +50 pts.</p>}
                       {quizStatus === 'incorrect' && <p className="text-red-600 text-sm font-bold mt-2">Ops, tente novamente.</p>}
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      
      {/* Editor Modal Form */}
      {isEditorModalOpen && isEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-full max-w-2xl max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="border-b border-neutral-100 dark:border-slate-800 p-5 bg-neutral-50 dark:bg-slate-950 flex items-center justify-between">
              <h2 className="font-bold text-sm text-neutral-800 dark:text-slate-200 uppercase tracking-widest font-mono">
                {editingId ? 'Editar Publicação' : 'Nova Publicação'}
              </h2>
              <button onClick={() => setIsEditorModalOpen(false)} className="text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Título do Artigo</label>
                <input 
                  value={title}
                  onChange={e=>setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 rounded-xl px-5 py-3 outline-none transition-all font-display font-medium text-lg"
                  placeholder="Insira um título atrativo..."
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Corpo do Texto</label>
                <textarea 
                  value={content}
                  onChange={e=>setContent(e.target.value)}
                  className="w-full min-h-[250px] bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-800 dark:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 rounded-xl px-5 py-4 outline-none transition-all resize-none text-[15px] leading-relaxed"
                  placeholder="Escreva a mensagem aqui..."
                />
              </div>
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 rounded-xl px-5 py-3 outline-none"
                  >
                    <option value="general">Notícias Gerais</option>
                    <option value="internal">Comunicados Internos</option>
                  </select>
                </div>
                <div className="flex-1 flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-700 dark:text-slate-300">
                    <input 
                      type="checkbox"
                      checked={generateQuiz}
                      onChange={(e) => setGenerateQuiz(e.target.checked)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
                    />
                    <span>Gerar Quiz Automático com IA (+50 pts)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-3 p-5 border-t border-neutral-100 dark:border-slate-800/50 bg-neutral-50 dark:bg-slate-950">
                <button onClick={() => handleSave(true)} disabled={loading || !title || !content} className="px-6 py-3 bg-neutral-200 text-neutral-800 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl hover:bg-neutral-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest font-mono shadow-sm">
                  Salvar Rascunho
                </button>
                <button onClick={() => handleSave(false)} disabled={loading || !title || !content} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-md dark:shadow-blue-900/40 text-xs uppercase tracking-widest font-mono">
                  Publicar Agora
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
