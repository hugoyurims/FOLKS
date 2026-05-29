import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SidebarLayout } from './components/SidebarLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';

import { Login } from './pages/Login';
import { News } from './pages/News';
import { Chat } from './pages/Chat';
import { Gamification } from './pages/Gamification';
import { Store } from './pages/Store';
import { Users } from './pages/Users';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
