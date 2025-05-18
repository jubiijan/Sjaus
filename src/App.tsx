import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider, useGame } from './contexts/GameContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import Tutorial from './pages/Tutorial';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <GameProvider>
          <div className="min-h-screen flex flex-col bg-[#0F172A]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/lobby" 
                  element={
                    <ProtectedRoute>
                      <Lobby />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/game/:roomId" 
                  element={
                    <ProtectedRoute>
                      <GameRoom />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/tutorial" element={<Tutorial />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/statistics" 
                  element={
                    <ProtectedRoute>
                      <Statistics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <footer className="bg-[#1E293B] p-4 text-center text-sm mt-auto">
              © 2025 Sjaus Digital • <a href="https://consult.fo" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:text-[#E9C85D]">consult.fo</a> - Jóhan Joensen
            </footer>
          </div>
        </GameProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;