import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0F172A] px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#D4AF37] mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-6">Page Not Found</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-6 rounded-lg inline-flex items-center"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;