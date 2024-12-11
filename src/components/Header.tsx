import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-indigo-600">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Shield className="h-8 w-8 text-white" />
              <span className="ml-2 text-white font-bold text-xl">FakeGuard</span>
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link to="/" className="text-white hover:bg-indigo-700 px-3 py-2 rounded-md">
              Home
            </Link>
            <Link to="/report" className="text-white hover:bg-indigo-700 px-3 py-2 rounded-md">
              Report Account
            </Link>
            <Link to="/admin" className="text-white hover:bg-indigo-700 px-3 py-2 rounded-md">
              Admin Panel
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}