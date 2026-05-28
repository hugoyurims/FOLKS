import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { getDb, getFirebaseAuth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function Chat() {
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string, feedbackSubmitted?: boolean}[]>([
    { role: 'bot', content: 'Olá! Sou o FolksInsight AI. Como posso te ajudar hoje com dicas de bem-estar digital e saúde mental?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const recordError = async (message: string) => {
    try {
      const db = getDb();
      const auth = getFirebaseAuth();
      await addDoc(collection(db, 'error_logs'), {
        userId: auth?.currentUser?.uid || 'anonymous',
        message: message,
        timestamp: new Date().toISOString(),
        context: 'AI Chat'
      });
    } catch(e) {
      console.error("Could not write error log", e);
    }
  };

  const submitFeedback = async (msgIndex: number, isPositive: boolean) => {
    try {
      const db = getDb();
      const auth = getFirebaseAuth();
      const msg = messages[msgIndex];
      
      await addDoc(collection(db, 'feedbacks'), {
        userId: auth?.currentUser?.uid || 'anonymous',
        botMessage: msg.content,
        isPositive,
        timestamp: new Date().toISOString(),
        context: 'AI Chatbot Satisfaction'
      });

      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[msgIndex] = { ...newMsgs[msgIndex], feedbackSubmitted: true };
        return newMsgs;
      });
    } catch(e) {
      console.error("Could not write feedback", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Server error');
      
      setMessages(prev => [...prev, { role: 'bot', content: data.text }]);
    } catch (e: any) {
      console.error(e);
      recordError(e.message);
      // Circuit Breaker / Fallback message
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Desculpe, meu assistente de IA parece estar indisponível no momento. Por favor, tente novamente em alguns instantes. Se o problema persistir, fale com o suporte da Folks Solutions.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-6 lg:p-8 h-full bg-white md:bg-transparent">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-700 text-blue-400 p-2 rounded-lg">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight leading-none">Bem-Estar IA</h2>
          <p className="text-sm text-slate-400 mt-1">Chat seguro focado em saúde digital</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-2xl md:shadow-xl md:shadow-black/20 md:border border-slate-800 overflow-hidden flex flex-col relative w-full pb-4">
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex items-start gap-4 max-w-[85%] mb-4", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", 
                 msg.role === 'user' ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]")}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn("px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm font-mono text-xs relative group", 
                 msg.role === 'user' 
                   ? "bg-slate-800 text-slate-300 rounded-tr-sm border border-slate-700" 
                   : "bg-blue-900/30 text-blue-200 rounded-tl-sm border border-blue-800/50")}>
                {msg.content}
                
                {msg.role === 'bot' && idx > 0 && !msg.feedbackSubmitted && (
                  <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button onClick={() => submitFeedback(idx, true)} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:bg-emerald-900/50 hover:text-emerald-400 text-slate-400 transition-colors">
                      <ThumbsUp size={12} />
                    </button>
                    <button onClick={() => submitFeedback(idx, false)} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:bg-red-900/50 hover:text-red-400 text-slate-400 transition-colors">
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
                {msg.feedbackSubmitted && (
                  <div className="absolute -bottom-6 left-0 text-[9px] text-slate-500 uppercase tracking-widest">
                    Feedback Registrado
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex items-start gap-4">
               <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  <Bot size={16} />
               </div>
               <div className="px-4 py-4 rounded-b-2xl rounded-tr-2xl bg-blue-900/30 border border-blue-800/50 flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                 <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-150"></div>
               </div>
             </div>
          )}
        </div>

        <div className="px-4 md:px-6 pt-2 pb-2">
          <form onSubmit={handleSend} className="relative flex items-center bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <input 
              disabled={loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre gestão de tela, pausas ativas..."
              className="w-full bg-transparent border-transparent focus:ring-0 px-5 py-3.5 pr-14 outline-none text-slate-200 placeholder:text-slate-500 font-mono text-xs"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 rounded-lg text-blue-500 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono uppercase">
            <AlertTriangle size={10} /> A IA foca estritamente em saúde corporativa. Pode estar sujeita a imprecisões.
          </div>
        </div>
      </div>
    </div>
  );
}
