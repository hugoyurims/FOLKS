import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SidebarLayout } from './components/SidebarLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';

const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const News = React.lazy(() => import('./pages/News').then(m => ({ default: m.News })));
const Chat = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Gamification = React.lazy(() => import('./pages/Gamification').then(m => ({ default: m.Gamification })));
const Store = React.lazy(() => import('./pages/Store').then(m => ({ default: m.Store })));
const Users = React.lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Ranking = React.lazy(() => import('./pages/Ranking').then(m => ({ default: m.Ranking })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 dark:bg-[#060B14]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }>
            <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<PrivateRoute><SidebarLayout /></PrivateRoute>}>
              <Route path="/" element={<News />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/gamification" element={<Gamification />} />
              <Route path="/store" element={<Store />} />
              <Route path="/users" element={<Users />} />
              <Route path="/ranking" element={<Ranking />} />
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
