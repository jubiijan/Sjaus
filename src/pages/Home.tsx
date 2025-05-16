import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PlayCircle, BookOpen, User } from 'lucide-react';

const Home: React.FC = () => {
  const { currentUser } = useAuth();
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear all local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const moveX = (clientX - innerWidth / 2) / innerWidth * 15;
      const moveY = (clientY - innerHeight / 2) / innerHeight * 15;
      
      parallaxRef.current.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative h-[calc(100vh-8.5rem)] flex items-center justify-center overflow-hidden">
      <div 
        ref={parallaxRef}
        className="parallax-bg absolute inset-0"
        style={{ 
          backgroundImage: "url('https://images.pexels.com/photos/2581916/pexels-photo-2581916.jpeg')",
          backgroundPosition: '50% 30%',
          height: '100%'
        }}
      />
      
      <div className="relative z-10 w-full px-4 py-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 animate-fade-in">
            <span className="text-[#D4AF37]">Sjaus</span> - The Traditional Faeroese Card Game
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-6 animate-fade-in px-4">
            Experience the authentic Faeroese card game of Sjaus in this beautiful digital adaptation. 
            Play with friends, improve your skills, and become a master of this traditional game.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
            {currentUser ? (
              <Link 
                to="/lobby" 
                className="w-full sm:w-auto glass-panel bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:transform hover:scale-105"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Play Now
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="w-full sm:w-auto glass-panel bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:transform hover:scale-105"
              >
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            )}
            
            <Link 
              to="/tutorial" 
              className="w-full sm:w-auto glass-panel bg-[#8B4513] hover:bg-[#A65C2E] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:transform hover:scale-105"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Learn to Play
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;