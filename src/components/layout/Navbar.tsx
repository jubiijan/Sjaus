import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, User, Shield, LogOut, LogIn, Home, BookOpen, Users, BarChart } from 'lucide-react';
import ShareButton from '../ShareButton';

const Navbar: React.FC = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const shareUrl = window.location.origin;
  const shareTitle = 'Play Sjaus - The Traditional Faeroese Card Game Online';
  const shareDescription = 'Experience the authentic Faeroese card game of Sjaus in this beautiful digital adaptation. Play with friends, improve your skills, and become a master of this traditional game.';

  return (
    <nav className="bg-[#1E293B] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold text-white">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#D4AF37" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="mr-2"
              >
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M12 11v4"/>
                <path d="M9 11v1"/>
                <path d="M15 11v1"/>
                <path d="M8 7v1"/>
                <path d="M16 7v1"/>
                <path d="M12 7v1"/>
              </svg>
              Sjaus
            </Link>
          </div>
          
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link 
              to="/" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <Home className="mr-1 h-4 w-4" />
              Home
            </Link>
            
            <Link 
              to="/tutorial" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <BookOpen className="mr-1 h-4 w-4" />
              Tutorial
            </Link>
            
            {currentUser && (
              <>
                <Link 
                  to="/lobby" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Users className="mr-1 h-4 w-4" />
                  Lobby
                </Link>
                
                <Link 
                  to="/statistics" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <BarChart className="mr-1 h-4 w-4" />
                  Statistics
                </Link>
              </>
            )}
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <Shield className="mr-1 h-4 w-4" />
                Admin
              </Link>
            )}

            <ShareButton url={shareUrl} title={shareTitle} description={shareDescription} />
            
            {currentUser ? (
              <>
                <Link 
                  to="/profile" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <User className="mr-1 h-4 w-4" />
                  Profile
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <LogIn className="mr-1 h-4 w-4" />
                Login
              </Link>
            )}
          </div>
          
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#1E293B] shadow-lg z-50">
            <Link
              to="/"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            <Link
              to="/tutorial"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Tutorial
            </Link>
            
            {currentUser && (
              <>
                <Link
                  to="/lobby"
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Lobby
                </Link>
                
                <Link
                  to="/statistics"
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Statistics
                </Link>
              </>
            )}
            
            {isAdmin && (
              <Link
                to="/admin"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}

            <div className="px-3 py-2">
              <ShareButton url={shareUrl} title={shareTitle} description={shareDescription} />
            </div>
            
            {currentUser ? (
              <>
                <Link
                  to="/profile"
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;