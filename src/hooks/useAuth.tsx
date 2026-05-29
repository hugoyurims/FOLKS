import React, { useEffect, useState, createContext, useContext } from 'react';
import { initFirebase } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface UserProfile {
  email?: string;
  role: 'editor' | 'collaborator'; // This is their true/maximum role
  points: number;
  badges: string[];
  readArticles?: string[];
  answeredQuizzes?: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  markArticleAsRead: (id: string, isQuiz?: boolean) => Promise<void>;
  activeRole: 'editor' | 'collaborator';
  setActiveRole: (role: 'editor' | 'collaborator') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  markArticleAsRead: async () => {},
  activeRole: 'collaborator',
  setActiveRole: () => {}
});

export const useAuth = () => useContext(AuthContext);

async function seedDatabase(db: any, uid: string) {
  // Seed News
  const newsSnap = await getDocs(collection(db, 'articles'));
  if (newsSnap.empty) {
    try {
      await setDoc(doc(collection(db, 'articles')), {
        title: 'O impacto da IA Generativa na saúde digital em 2024',
        content: 'A Inteligência Artificial está transformando a forma como cuidamos do bem-estar dos profissionais. Descubra como a Folks Solutions está implementando ferramentas de IA para promover pausas ativas e reduzir o cansaço ocular...',
        status: 'published',
        authorId: uid,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(collection(db, 'articles')), {
        title: 'Dicas de Ergonomia para o Home Office',
        content: 'Manter a postura correta e o equipamento adequado são fundamentais para evitar dores. Ajuste seu monitor na altura dos olhos e certifique-se de que a cadeira suporta a lombar.',
        status: 'published',
        authorId: uid,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      });
    } catch(e) { console.error('Seed news error', e); }
  }

  // Seed Benefits
  const benefitsSnap = await getDocs(collection(db, 'benefits'));
  if (benefitsSnap.empty) {
    try {
      await setDoc(doc(collection(db, 'benefits')), {
        name: 'Caneca Exclusiva FolksInsight',
        cost: 800,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80'
      });
      await setDoc(doc(collection(db, 'benefits')), {
        name: 'Day Off Acadêmico',
        cost: 2500,
        stock: 10,
        imageUrl: 'https://images.unsplash.com/photo-1540304473527-99447bd57a14?auto=format&fit=crop&w=400&q=80'
      });
      await setDoc(doc(collection(db, 'benefits')), {
        name: 'Voucher iFood R$50',
        cost: 1500,
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1621217036688-6934c9c6f212?auto=format&fit=crop&w=400&q=80'
      });
    } catch(e) { console.error('Seed benefits error', e); }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'editor' | 'collaborator'>('collaborator');

  const markArticleAsRead = async (articleId: string, isQuiz: boolean = false) => {
    if (!profile || !user) return;
    
    // Check if already read/answered to prevent duplicate points
    if (isQuiz) {
      const currentQuizzes = profile.answeredQuizzes || [];
      if (currentQuizzes.includes(articleId)) return;
      
      const newQuizzes = [...currentQuizzes, articleId];
      const newPoints = profile.points + 50;
      
      try {
        const { db } = await initFirebase();
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          answeredQuizzes: newQuizzes,
          points: newPoints
        });
        setProfile({ ...profile, answeredQuizzes: newQuizzes, points: newPoints });
        toast.success('+50 InsightCoins pelo Quiz!', {
          icon: '🏆',
          style: {
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
          },
        });
      } catch (e) {
        console.error("Failed to mark quiz", e);
      }
    } else {
      const currentRead = profile.readArticles || [];
      if (currentRead.includes(articleId)) return;
      
      const newRead = [...currentRead, articleId];
      const newPoints = profile.points + 10;
      
      try {
        const { db } = await initFirebase();
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          readArticles: newRead,
          points: newPoints
        });
        setProfile({ ...profile, readArticles: newRead, points: newPoints });
        toast.success('+10 InsightCoins pela Leitura!', {
          icon: '📖',
          style: {
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
          },
        });
      } catch (e) {
        console.error("Failed to mark as read", e);
      }
    }
  };

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeDoc = () => {};

    initFirebase().then(({ auth, db }) => {
      unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        unsubscribeDoc();
        
        if (u) {
          try {
            const userRef = doc(db, 'users', u.uid);
            unsubscribeDoc = onSnapshot(userRef, async (userSnap) => {
              let p: UserProfile;
              
              const isTargetEmail = u.email === 'hugo.yuri.77@gmail.com';
              
              if (!userSnap.exists()) {
                p = {
                  email: u.email || undefined,
                  role: isTargetEmail ? 'editor' : 'collaborator',
                  points: isTargetEmail ? 1250 : 0,
                  badges: isTargetEmail ? ['🛡️ Leitor Assíduo', '📖 Mestre do Foco'] : [],
                  readArticles: [],
                  answeredQuizzes: []
                };
                await setDoc(userRef, { ...p, createdAt: new Date().toISOString() });
              } else {
                p = userSnap.data() as UserProfile;
                let needsUpdate = false;
                
                if (!p.email && u.email) {
                  p.email = u.email;
                  needsUpdate = true;
                }
                
                if (isTargetEmail && (p.role !== 'editor' || p.points === 0)) {
                  p = { ...p, role: 'editor', points: Math.max(p.points || 0, 1250), badges: Array.from(new Set([...(p.badges || []), '🛡️ Leitor Assíduo', '📖 Mestre do Foco'])) };
                  needsUpdate = true;
                }
                
                if (needsUpdate) {
                  await updateDoc(userRef, p as any);
                }
              }
              setProfile(p);
              setActiveRole(p.role); // Default to their real role
            });
            
            const isTargetEmail = u.email === 'hugo.yuri.77@gmail.com';
            if (isTargetEmail) {
              await seedDatabase(db, u.uid);
            }
          } catch (e) {
            console.error("Error fetching/updating profile", e);
          }
        } else {
          setProfile(null);
          setActiveRole('collaborator');
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    const { auth } = await initFirebase();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const { auth } = await initFirebase();
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const { auth } = await initFirebase();
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    const { auth } = await initFirebase();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, markArticleAsRead, activeRole, setActiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}
