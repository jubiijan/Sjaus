import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Home } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/lobby');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (error) {
      setError('Invalid email or password');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-[#0F172A] to-[#1E293B]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37] mb-4"></div>
          <p className="text-gray-400">Signing in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0F172A] to-[#1E293B]">
      <div className="max-w-md w-full bg-[#1E293B] rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-8 md:px-8">
          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Link 
                to="/register" 
                className="text-[#D4AF37] hover:text-[#E9C85D] text-sm"
              >
                Need an account?
              </Link>
              
              <Link 
                to="/" 
                className="text-gray-400 hover:text-white flex items-center text-sm"
              >
                <Home className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;