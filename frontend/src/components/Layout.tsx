import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Folder, Receipt, Users, BarChart3, Download, X, Globe, Mail, User } from 'lucide-react';
import devPhoto from '../assets/dev_photo_no_bg.png';
import appLogo from '../assets/app_logo.png';

export default function Layout() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Batches', path: '/batches', icon: <Folder size={20} /> },
    { name: 'Receipts', path: '/receipts', icon: <Receipt size={20} /> },
    { name: 'Vendors', path: '/vendors', icon: <Users size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Exports', path: '/exports', icon: <Download size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1F4E79] text-white flex flex-col shrink-0 shadow-lg">
        <div 
          className="px-4 py-6 border-b border-white/10 flex flex-row items-center cursor-pointer hover:bg-white/5 transition-colors gap-3"
          onClick={() => setIsAboutOpen(true)}
        >
          <img src={appLogo} alt="App Logo" className="w-12 h-12 object-contain drop-shadow-md rounded bg-[#1F4E79]/50" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-wide leading-tight">
              AuditArk
            </h1>
            <p className="text-[9px] text-white/60 tracking-wider uppercase mt-0.5">Financial Ledger</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-[#F2F7FB] text-[#1F4E79] font-semibold' : 'hover:bg-white/10 text-slate-300 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white m-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <Outlet />
      </main>

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row">
            
            {/* Modal Header/Sidebar (App Info) */}
            <div className="bg-[#1F4E79] p-6 text-white relative md:w-5/12 flex flex-col items-center justify-center">
              <img src={appLogo} alt="AuditArk Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-lg rounded-2xl" />
              <h2 className="text-xl font-bold tracking-wide text-center">AuditArk</h2>
              <p className="text-white/80 text-xs mt-1 uppercase tracking-wider font-medium text-center">Financial Ledger System</p>
              
              <div className="mt-8 space-y-3 w-full bg-black/10 p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Type:</span>
                  <span className="font-medium text-right ml-2 text-white">Offline Ledger System</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Version:</span>
                  <span className="font-bold text-white">v1.0</span>
                </div>
              </div>
            </div>
            
            {/* Modal Body (Details & Dev Info) */}
            <div className="p-6 text-slate-700 md:w-7/12 flex flex-col relative w-full">
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors bg-slate-100/50 p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>

              <h3 className="text-lg font-bold text-slate-800 mb-2">About Application</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 italic border-l-2 border-blue-200 pl-3">
                "A privacy-first financial processing and reporting system for managing receipt data, vendor tracking, and institutional reporting."
              </p>

              <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Developer Info</h3>
              <div className="flex flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="shrink-0 w-20 h-20 rounded-full bg-blue-100 overflow-hidden border-2 border-white shadow-md flex items-center justify-center">
                   <img src={devPhoto} alt="Alok Nath" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col space-y-1.5 flex-1 overflow-hidden">
                  <div className="flex items-center text-sm">
                    <User size={14} className="text-slate-400 mr-2 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">Alok Nath</span>
                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">Developer</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail size={14} className="text-slate-400 mr-2 shrink-0" />
                    <a href="mailto:alokgorithm@gmail.com" className="text-blue-600 hover:underline truncate">alokgorithm@gmail.com</a>
                  </div>
                  <div className="flex items-center text-sm">
                    <Globe size={14} className="text-slate-400 mr-2 shrink-0" />
                    <a href="https://github.com/alokgorithm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">github.com/alokgorithm</a>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 flex justify-end">
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
