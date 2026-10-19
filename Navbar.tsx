import React, { useState } from 'react';
import { 
  MapPin, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Sliders, 
  FileText, 
  Heart,
  Globe,
  Compass,
  Search,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ALL_PAKISTAN_CITIES } from '../data/pakistanLocations.ts';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenProfile: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  onOpenExplore: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenProfile,
  activeNavTab,
  setActiveNavTab,
  onOpenExplore
}) => {
  const { user, selectedCity, setSelectedCity, unreadCount, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const isMoreActive = ['explore', 'impact', 'organizations', 'how-it-works', 'trust'].includes(activeNavTab);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D5] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & City Selector */}
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={() => setActiveNavTab('home')} 
            className="flex items-center gap-2.5 focus:outline-none group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#176B45] text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform duration-200">
              🍲
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[#16201A] tracking-tight block">PlateShare</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#E8F6EF] text-[#176B45]">PK</span>
              </div>
              <span className="text-[10px] font-medium text-[#57685F] block -mt-0.5">Pakistan Food Relief</span>
            </div>
          </button>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2EFE6] text-xs font-semibold text-[#2C3A32] transition-colors border border-[#E8E4D5] shadow-xs cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
              <span className="max-w-[110px] sm:max-w-none truncate font-medium">{selectedCity}</span>
              <ChevronDown className="w-3 h-3 text-[#57685F] ml-0.5" />
            </button>

            {cityDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E8E4D5] py-2 z-50 max-h-72 overflow-y-auto">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#65776D] border-b border-[#F4F1E6]">
                  Select Focus City
                </div>
                <button
                  onClick={() => { setSelectedCity('All Cities'); setCityDropdownOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                    selectedCity === 'All Cities' ? 'bg-[#E8F6EF] text-[#176B45]' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <span>🇵🇰 All Pakistan</span>
                  {selectedCity === 'All Cities' && <span className="text-[10px] text-[#176B45]">✓</span>}
                </button>
                {ALL_PAKISTAN_CITIES.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { setSelectedCity(c.name); setCityDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedCity === c.name ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#495A50] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-[#899C92]">{c.province}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Public Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#495A50]">
          <button
            onClick={() => { setActiveNavTab('home'); setMoreDropdownOpen(false); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeNavTab === 'home' ? 'text-[#176B45] bg-[#E8F6EF] font-bold' : 'hover:text-[#16201A] hover:bg-white/60'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => { setActiveNavTab('food'); setMoreDropdownOpen(false); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeNavTab === 'food' ? 'text-[#176B45] bg-[#E8F6EF] font-bold' : 'hover:text-[#16201A] hover:bg-white/60'
            }`}
          >
            Surplus Food
          </button>

          {(!user || user.role === 'Donor') && (
            <button
              onClick={() => { setActiveNavTab('donate-ngos'); setMoreDropdownOpen(false); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                activeNavTab === 'donate-ngos' 
                  ? 'bg-[#176B45] text-white shadow-xs' 
                  : 'text-[#176B45] bg-[#E8F6EF] hover:bg-[#d8f2e3]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeNavTab === 'donate-ngos' ? 'fill-white text-white' : 'fill-[#176B45] text-[#176B45]'}`} />
              <span>Donate to NGOs</span>
            </button>
          )}

          <button
            onClick={() => { setActiveNavTab('apply-assistance'); setMoreDropdownOpen(false); }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              activeNavTab === 'apply-assistance' ? 'text-[#176B45] bg-[#E8F6EF] font-bold' : 'hover:text-[#16201A] hover:bg-white/60'
            }`}
          >
            Apply for Food
          </button>

          {/* Secondary Links grouped under "More" */}
          <div className="relative">
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                isMoreActive || moreDropdownOpen 
                  ? 'text-[#176B45] bg-[#E8F6EF] font-bold' 
                  : 'hover:text-[#16201A] hover:bg-white/60'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setMoreDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E8E4D5] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#65776D] border-b border-[#F4F1E6] mb-1">
                    Platform Navigation
                  </div>

                  <button
                    onClick={() => { onOpenExplore(); setMoreDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      activeNavTab === 'explore' ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-[#2FA66A]" />
                    <span>Explore Cities</span>
                  </button>

                  <button
                    onClick={() => { setActiveNavTab('how-it-works'); setMoreDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      activeNavTab === 'how-it-works' ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4 text-[#899C92]" />
                    <span>How It Works</span>
                  </button>

                  <button
                    onClick={() => { setActiveNavTab('impact'); setMoreDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      activeNavTab === 'impact' ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-[#899C92]" />
                    <span>Impact Summary</span>
                  </button>

                  <button
                    onClick={() => { setActiveNavTab('organizations'); setMoreDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      activeNavTab === 'organizations' ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-[#899C92]" />
                    <span>NGOs &amp; Partners</span>
                  </button>

                  <div className="border-t border-[#F4F1E6] mt-1 pt-1">
                    <button
                      onClick={() => { setActiveNavTab('trust'); setMoreDropdownOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                        activeNavTab === 'trust' ? 'bg-[#E8F6EF] text-[#176B45] font-bold' : 'text-[#2C3A32] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-[#2FA66A]" />
                      <span>Trust &amp; Safety</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Right Section: Auth & Profile */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {/* Notifications Icon */}
              <button
                onClick={() => setActiveNavTab('notifications')}
                className="relative p-2 rounded-xl text-[#495A50] hover:text-[#16201A] hover:bg-white transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#FAF9F5]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-[#E8E4D5] hover:border-[#CFCEBE] bg-white transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#176B45] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-[#16201A] leading-tight block truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[#176B45] uppercase block -mt-0.5">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#65776D]" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#E8E4D5] py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-[#F4F1E6]">
                      <span className="font-extrabold text-[#16201A] block truncate">{user.name}</span>
                      <span className="text-[11px] text-[#65776D] font-mono block truncate">{user.email}</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45] uppercase">
                          {user.role}
                        </span>
                        <span className="text-[9px] text-[#65776D] font-medium">📍 {user.city}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { onOpenProfile(); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF9F5] text-[#2C3A32] font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-[#899C92]" /> My Profile &amp; Settings
                      </button>

                      <button
                        onClick={() => { setActiveNavTab('dashboard'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF9F5] text-[#2C3A32] font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-[#176B45]" /> {user.role} Dashboard
                      </button>
                    </div>

                    <div className="border-t border-[#F4F1E6] pt-1">
                      <button
                        onClick={() => { logout(); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> End Session (Logout)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-2 text-xs font-bold text-[#2C3A32] hover:text-[#16201A] hover:bg-white rounded-xl transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={onOpenRegister}
                className="px-4 py-2 text-xs font-bold text-white bg-[#176B45] hover:bg-[#125235] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
