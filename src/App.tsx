import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SidebarLayout } from './components/SidebarLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const News = lazy(() => import('./pages/News').then((m) => ({ default: m.News })));
const Chat = lazy(() => import('./pages/Chat').then((m) => ({ default: m.Chat })));
const Gamification = lazy(() => import('./pages/Gamification').then((m) => ({ default: m.Gamification })));
const Store = lazy(() => import('./pages/Store').then((m) => ({ default: m.Store })));
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] text-blue-500">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-500" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 dark:bg-[#060B14]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute><SidebarLayout /></PrivateRoute>}>
                <Route path="/" element={<News />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/gamification" element={<Gamification />} />
                <Route path="/store" element={<Store />} />
                <Route path="/users" element={<Users />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
