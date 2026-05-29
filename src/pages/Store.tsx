import React, { useEffect, useState } from 'react';
import { initFirebase } from '../lib/firebase';
import { collection, doc, runTransaction, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Gift, Lock, Loader2, CheckCircle2, ShoppingBag, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getFromCache, setInCache } from '../lib/cache';
import folksMugImage from '../assets/images/folks_mug_1779894900152.png';
// @ts-ignore
import ifoodVoucherImage from '../assets/images/ifood_voucher_1779894329011.png';
// @ts-ignore
import dayOffImage from '../assets/images/day_off_1779894871806.png';

interface Benefit {
  id: string;
  name: string;
  cost: number;
  stock: number;
  imageUrl?: string;
}

export function Store() {
  const { profile, activeRole } = useAuth();
  const isEditor = activeRole === 'editor';
  
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Editor states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState(100);
  const [stock, setStock] = useState(10);
  const [imageUrl, setImageUrl] = useState('');
  const [savingMsg, setSavingMsg] = useState('');

  const loadBenefits = async () => {
    const cached = getFromCache<Benefit[]>('benefits');
    if (cached) {
      setBenefits(cached);
    }

    if (!cached) {
      setLoading(true);
    }

    try {
      const { db } = await initFirebase();

      const snap = await getDocs(collection(db, 'benefits'));
      const uniqueMap = new Map<string, Benefit>();

      snap.docs.forEach((doc) => {
        let b = { id: doc.id, ...doc.data() } as Benefit;

        if (b.name.includes('Day Off Acadêmico') || b.name.includes('Day Off')) {
          b.name = 'Day Off';
          b.imageUrl = dayOffImage;
        }
        if (b.name.includes('Caneca')) {
          b.name = 'Caneca FOLKS';
          b.imageUrl = folksMugImage;
        }
        if (b.name.includes('iFood')) {
          b.imageUrl = ifoodVoucherImage;
        }

        if (!uniqueMap.has(b.name)) {
          uniqueMap.set(b.name, b);
        }
      });
      const data = Array.from(uniqueMap.values());
      // Sort by cost ascending
      data.sort((a, b) => a.cost - b.cost);
      setBenefits(data);
      setInCache('benefits', data);
    } catch (e) {
      console.error('Error loading benefits', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBenefits();
  }, []);

  const handleRedeem = async (b: Benefit) => {
    if ((profile?.points || 0) < b.cost) return;
    
    setPurchasing(b.id);
    const { auth, db } = await initFirebase();
    
    try {
      await runTransaction(db, async (t) => {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const benefitRef = doc(db, 'benefits', b.id);
        
        const userDoc = await t.get(userRef);
        const benefitDoc = await t.get(benefitRef);
        
        if (!userDoc.exists() || !benefitDoc.exists()) throw "Not found";
        
        const currentPoints = userDoc.data().points;
        const currentStock = benefitDoc.data().stock;
        
        if (currentPoints < b.cost) throw "Pontos insuficientes";
        if (currentStock <= 0) throw "Sem estoque";
        
        t.update(userRef, { points: currentPoints - b.cost });
        t.update(benefitRef, { stock: currentStock - 1 });
      });
      
      setSuccessMsg("Tu solicitud de retiro de este beneficio fue solicitada");
      // Update local UI state
      setBenefits(prev => prev.map(item => item.id === b.id ? { ...item, stock: item.stock - 1 } : item));
      setTimeout(() => setSuccessMsg(''), 5000);
      
    } catch(e) {
      console.error(e);
      alert("Erro ao resgatar benefício. Tente novamente.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleEdit = (b: Benefit, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(b.id);
    setName(b.name);
    setCost(b.cost);
    setStock(b.stock);
    setImageUrl(b.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const { db } = await initFirebase();
      await deleteDoc(doc(db, 'benefits', id));
    } catch(e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if(!name || cost <= 0) return;
    setSavingMsg('Salvando...');
    try {
      const { db } = await initFirebase();
      const payload = { name, cost, stock, imageUrl };
      if (editingId) {
        await updateDoc(doc(db, 'benefits', editingId), payload);
      } else {
        await addDoc(collection(db, 'benefits'), payload);
      }
      setIsModalOpen(false);
      setName(''); setCost(100); setStock(10); setImageUrl(''); setEditingId(null);
      setSavingMsg('Salvo com sucesso!');
      setTimeout(()=>setSavingMsg(''), 3000);
    } catch(e) {
      alert("Erro");
    }
  };

  return (
    <div className="p-6 md:p-10 lg:max-w-7xl w-full mx-auto overflow-y-auto relative">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white tracking-tight">Loja de Benefícios</h1>
          <p className="text-neutral-500 dark:text-slate-400 text-[15px] mt-2 max-w-xl">Troque seus <strong>InsightCoins</strong> por recompensas corporativas exclusivas.</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-xl shrink-0">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-orange-500 flex items-center justify-center">
              <Gift size={24} />
            </div>
            <div className="pr-2">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-mono uppercase tracking-widest leading-none mb-2">Saldo Global</div>
              <div className="text-2xl font-display font-bold text-neutral-900 dark:text-white leading-none"><span className="text-blue-600 dark:text-blue-400">{profile?.points || 0}</span> PTS</div>
            </div>
          </div>
          {isEditor && (
             <button 
                onClick={() => { setName(''); setCost(100); setStock(10); setImageUrl(''); setEditingId(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors text-[11px] uppercase tracking-widest font-mono shadow-md"
             >
                <Plus size={16} />
                Novo Benefício
             </button>
          )}
        </div>
      </header>
      
      {(successMsg || savingMsg) && (
         <div className="mb-8 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 font-mono text-sm max-w-md">
            <CheckCircle2 className="text-emerald-500 shrink-0" />
            <span>{successMsg || savingMsg}</span>
         </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-blue-600"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : benefits.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-neutral-200 dark:border-slate-800 p-12 text-center flex flex-col items-center">
          <ShoppingBag className="text-neutral-300 dark:text-slate-600 w-16 h-16 mb-4" />
          <h3 className="text-lg font-bold text-neutral-800 dark:text-slate-200">Catálogo vazio no momento</h3>
          <p className="text-neutral-500 dark:text-slate-500 mt-2">A loja corporativa está sendo atualizada. Volte logo!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {benefits.map(b => {
             const canAfford = (profile?.points || 0) >= b.cost;
             const inStock = b.stock > 0;
             return (
               <div key={b.id} className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm hover:shadow-md dark:shadow-xl transition-all relative overflow-hidden group">
                 {/* Image Area */}
                 <div className="h-48 bg-neutral-100 dark:bg-slate-800 w-full relative overflow-hidden flex items-center justify-center">
                   {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                   ) : (
                      <Gift size={48} className="text-neutral-300 dark:text-slate-700" />
                   )}
                   <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm border border-neutral-200 dark:border-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">{b.cost}</span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">PTS</span>
                   </div>
                   {!inStock && (
                     <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                       <span className="bg-neutral-900 text-white dark:bg-white dark:text-black font-bold uppercase tracking-widest text-xs px-4 py-2 rounded-lg">Esgotado</span>
                     </div>
                   )}
                   {isEditor && (
                     <div className="absolute top-3 left-3 flex gap-2 z-20">
                       <button onClick={(e) => handleEdit(b, e)} className="p-2 bg-white/90 hover:bg-blue-50 text-blue-600 dark:bg-slate-900/90 dark:text-blue-400 rounded-xl shadow-lg border border-neutral-200 dark:border-slate-700 transition-colors backdrop-blur-sm"><Edit size={14}/></button>
                       <button onClick={(e) => handleDelete(b.id, e)} className="p-2 bg-white/90 hover:bg-red-50 text-red-600 dark:bg-slate-900/90 dark:text-red-400 rounded-xl shadow-lg border border-neutral-200 dark:border-slate-700 transition-colors backdrop-blur-sm"><Trash2 size={14}/></button>
                     </div>
                   )}
                 </div>
                 
                 <div className="p-5 flex-1 flex flex-col">
                   <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-snug mb-4">{b.name}</h3>
                   
                   <div className="mt-auto pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-slate-800/60">
                     <span className="text-[11px] font-mono font-semibold text-neutral-500 dark:text-slate-500 uppercase tracking-wider">
                       {inStock ? `Estoque: ${b.stock}` : 'Sem Estoque'}
                     </span>
                     <button 
                       onClick={() => handleRedeem(b)}
                       disabled={!canAfford || !inStock || purchasing === b.id}
                       className={cn(
                         "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all",
                         canAfford && inStock 
                           ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-md dark:shadow-blue-900/20"
                           : "bg-neutral-100 text-neutral-400 dark:bg-slate-800 dark:text-slate-500 border border-transparent dark:border-slate-700"
                       )}
                     >
                       {purchasing === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        !inStock ? 'Esgotado' :
                        !canAfford ? `Faltam ${b.cost - (profile?.points || 0)} pts` : 'Resgatar'}
                     </button>
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      )}

      {/* Editor Modal Form */}
      {isModalOpen && isEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="border-b border-neutral-100 dark:border-slate-800 p-5 bg-neutral-50 dark:bg-slate-950 flex items-center justify-between">
                <h2 className="font-bold text-sm text-neutral-800 dark:text-slate-200 uppercase tracking-widest font-mono">
                  {editingId ? 'Editar Benefício' : 'Novo Benefício'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold">✕</button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Nome do Benefício</label>
                  <input 
                    value={name}
                    onChange={e=>setName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 focus:border-blue-500 focus:ring-2 rounded-xl px-4 py-3 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Custo (PTS)</label>
                    <input type="number" min="0" value={cost} onChange={e=>setCost(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 focus:border-blue-500 focus:ring-2 rounded-xl px-4 py-3 outline-none transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">Estoque</label>
                    <input type="number" min="0" value={stock} onChange={e=>setStock(Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 focus:border-blue-500 focus:ring-2 rounded-xl px-4 py-3 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-widest mb-2">URL da Imagem (opcional)</label>
                  <input 
                    value={imageUrl}
                    onChange={e=>setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 text-neutral-900 dark:text-slate-200 focus:border-blue-500 focus:ring-2 rounded-xl px-4 py-3 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 p-5 border-t border-neutral-100 dark:border-slate-800/50 bg-neutral-50 dark:bg-slate-950">
                  <button onClick={handleSave} disabled={!name || cost <= 0} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest font-mono shadow-md w-full">
                    Salvar Benefício
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
