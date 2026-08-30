import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/auth';
import Layout from './components/layout/Layout';
import Feed from './pages/Feed';
import AuthLogin from './pages/AutchLogin';
import AuthRegister from './pages/AutchRegister';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Channels from './pages/Channels';
import ChannelDetail from './pages/ChannelDetail';
import AdminPanel from './pages/AdminPanel';
import Events from './pages/Events';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/register" element={<AuthRegister />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Feed />} />
            {/* Post creation now happens in a modal opened from the bottom nav. */}
            <Route path="/create" element={<Navigate to="/" replace />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/channels/:id" element={<ChannelDetail />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/u/:username/edit" element={<EditProfile />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/events" element={<Events />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:userId" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;