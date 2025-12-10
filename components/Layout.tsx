import React from 'react';
import { LogOut, LayoutDashboard, Users, Building2, ShieldCheck, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  userRole: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, onLogout, userRole }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'superadmins', label: 'Super Admins', icon: ShieldCheck },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <span className="text-xl font-bold text-gray-800">Gym Services</span>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                SA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
                <p className="text-xs text-gray-500 truncate">{userRole}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="font-bold text-lg text-gray-800">Gym Services</div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
                <Menu />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};