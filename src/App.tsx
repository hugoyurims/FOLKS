import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SidebarLayout } from './components/SidebarLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { News } from './pages/News';
import { Chat } from './pages/Chat';
import { Gamification } from './pages/Gamification';
import { Store } from './pages/Store';
import { Users } from './pages/Users';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<PrivateRoute><SidebarLayout /></PrivateRoute>}>
              <Route path="/" element={<News />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/gamification" element={<Gamification />} />
              <Route path="/store" element={<Store />} />
              <Route path="/users" element={<Users />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
