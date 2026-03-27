import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-mono">
              IO
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              AlgoGen
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            Powered by Gemini 3 Pro
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col">
        {children}
      </main>
      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} AlgoGen. Competitive Programming Test Data Generator.</p>
      </footer>
    </div>
  );
};