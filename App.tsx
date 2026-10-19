import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  MapPin, 
  Building, 
  Utensils, 
  Heart, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  PhoneCall,
  Info,
  Calendar,
  Layers,
  Leaf
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { PublicExplore } from './components/PublicExplore.tsx';
import { PakistanCityExplorer } from './components/PakistanCityExplorer.tsx';
import { AuthModals } from './components/AuthModals.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { DemoAccountsBar } from './components/DemoAccountsBar.tsx';
import { 
  RestaurantDashboard, 
  NgoDashboard, 
  DonorDashboard, 
  BeneficiaryDashboard, 
  AdminDashboard 
} from './components/RoleDashboards.tsx';
import { ALL_PAKISTAN_CITIES } from './data/pakistanLocations.ts';
import { api } from './services/api.ts';
import { TiltCard } from './components/TiltCard.tsx';

function PlateShareMainApp() {
  const { user, selectedCity, setSelectedCity, notifications, markNotifAsRead, markAllNotifsAsRead } = useAuth();

  const [activeNavTab, setActiveNavTab] = useState<string>('home');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Push notification alert toast
  const [toastNotification, setToastNotification] = useState<any | null>(null);

  // Live national directory
  const [partners, setPartners] = useState<any[]>([]);

  // Automatically transition to dashboard upon successful login or registration
  useEffect(() => {
    if (user && (loginModalOpen || registerModalOpen)) {
      setLoginModalOpen(false);
      setRegisterModalOpen(false);
      setActiveNavTab('dashboard');
    }
  }, [user, loginModalOpen, registerModalOpen]);

  // If a non-donor somehow has activeNavTab === 'donate-ngos', redirect to 'home'
  useEffect(() => {
    if (user && user.role !== 'Donor' && activeNavTab === 'donate-ngos') {
      setActiveNavTab('home');
    }
  }, [user, activeNavTab]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latestUnread = notifications.find(n => !n.isRead);
      if (latestUnread) {
        setToastNotification(latestUnread);
        const timer = setTimeout(() => setToastNotification(null), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications]);

  useEffect(() => {
    const loadDirectory = async () => {
      try {
        const res = await api.auth.getAllUsers();
        setPartners(res.users || []);
      } catch (err) {
        console.warn('Directory load error:', err);
      }
    };
    loadDirectory();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F6EF] text-[#16201A] flex flex-col font-sans selection:bg-[#E8F6EF] selection:text-[#176B45]">
      
      {/* 1. TOP RESPONSIVE NAVIGATION BAR */}
      <Navbar
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        onOpenExplore={() => setActiveNavTab('explore')}
      />

      {/* 2. REAL-TIME NOTIFICATION POPUP TOAST */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 right-4 z-50 w-full max-w-sm bg-[#16201A] text-white rounded-2xl shadow-2xl border border-[#2D3B34] p-4 cursor-pointer"
            onClick={() => {
              setActiveNavTab('notifications');
              markNotifAsRead(toastNotification.id);
              setToastNotification(null);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="bg-[#176B45]/40 p-2 rounded-xl text-[#7ED4A5] shrink-0 border border-[#176B45]/30">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between text-[10px] text-[#899C92]">
                  <span>PlateShare Pakistan Alert</span>
                  <span className="bg-[#2FA66A]/20 text-[#7ED4A5] px-1.5 py-0.5 rounded font-mono">Live</span>
                </div>
                <h5 className="font-bold text-white mt-0.5 text-xs">{toastNotification.title}</h5>
                <p className="text-[#DAE3DE] mt-1 leading-snug line-clamp-2">{toastNotification.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. LOGGED-IN ROLE BANNER & SHORTCUT BAR */}
      {user && (
        <div className="bg-[#FAF9F5] border-b border-[#E8E4D5] shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2FA66A]" />
              <span className="text-[#65776D]">Logged in as:</span>
              <span className="font-extrabold text-[#16201A]">{user.name}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F6EF] text-[#176B45] uppercase">
                {user.role}
              </span>
              <span className="text-[#CFCEBE]">•</span>
              <span className="text-[#495A50] font-medium">📍 {user.city}, {user.area || 'Pakistan'}</span>
              <span className="text-[#CFCEBE]">•</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                user.verificationStatus === 'Verified' || user.verificationStatus === 'Approved'
                  ? 'bg-[#E8F6EF] text-[#176B45]'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {user.verificationStatus}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveNavTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeNavTab === 'dashboard'
                    ? 'bg-[#176B45] text-white shadow-xs'
                    : 'bg-white hover:bg-[#F2EFE6] text-[#2C3A32] border border-[#E8E4D5]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open {user.role} Dashboard</span>
              </button>

              <button
                onClick={() => setProfileModalOpen(true)}
                className="px-3 py-1.5 rounded-xl font-bold bg-white hover:bg-[#F2EFE6] text-[#2C3A32] border border-[#E8E4D5] transition-colors cursor-pointer text-xs"
              >
                Profile &amp; Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE / CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        
        <AnimatePresence mode="wait">
          {/* VIEW 1: Home & Surplus Food Feed */}
          {(activeNavTab === 'home' || activeNavTab === 'food') && (
            <motion.div
              key="view-home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PublicExplore
                onOpenLogin={() => setLoginModalOpen(true)}
                onOpenRegister={() => setRegisterModalOpen(true)}
                onNavigateToTab={setActiveNavTab}
              />
            </motion.div>
          )}

          {/* VIEW 2: Explore Cities across Pakistan */}
          {activeNavTab === 'explore' && (
            <motion.div
              key="view-explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PakistanCityExplorer onClose={() => setActiveNavTab('home')} />
            </motion.div>
          )}

          {/* VIEW: Donate to Verified NGOs (Financial Relief) */}
          {activeNavTab === 'donate-ngos' && (
            <motion.div
              key="view-donate-ngos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {!user ? (
                <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E8E4D5] shadow-sm text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#E8F6EF] text-[#176B45] flex items-center justify-center text-2xl shadow-2xs">
                    💚
                  </div>
                  <h3 className="text-xl font-black text-[#16201A] font-display">
                    Direct Financial Donations to Verified NGOs
                  </h3>
                  <p className="text-xs text-[#57685F] max-w-md leading-relaxed">
                    PlateShare policy mandates that financial donors support verified hunger-relief NGOs directly with auditable transaction records and PKR receipts. Restaurants donate surplus food and never receive financial gifts.
                  </p>
                  <div className="flex gap-2.5 mt-3">
                    <button
                      onClick={() => setLoginModalOpen(true)}
                      className="px-6 py-2.5 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      Log In to Donate
                    </button>
                    <button
                      onClick={() => setRegisterModalOpen(true)}
                      className="px-6 py-2.5 bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#2C3A32] font-bold rounded-xl text-xs transition-colors border border-[#E8E4D5] cursor-pointer"
                    >
                      Register as Donor
                    </button>
                  </div>
                </div>
              ) : user?.role === 'Donor' ? (
                <DonorDashboard />
              ) : (
                <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E8E4D5] shadow-sm text-center flex flex-col items-center justify-center gap-3">
                  <p className="text-sm font-bold text-[#57685F]">
                    Financial donations are available to Donor accounts only.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW: Apply for Food Assistance */}
          {activeNavTab === 'apply-assistance' && (
            <motion.div
              key="view-apply"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {!user ? (
                <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E8E4D5] shadow-sm text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#E8F6EF] text-[#176B45] flex items-center justify-center text-2xl shadow-2xs">
                    🍲
                  </div>
                  <h3 className="text-xl font-black text-[#16201A] font-display">
                    Apply for Dignified Food Assistance
                  </h3>
                  <p className="text-xs text-[#57685F] max-w-md leading-relaxed">
                    Community members and families facing temporary or persistent hardship can submit assistance applications evaluated confidentially by authorized local NGOs.
                  </p>
                  <div className="flex gap-2.5 mt-3">
                    <button
                      onClick={() => setLoginModalOpen(true)}
                      className="px-6 py-2.5 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => setRegisterModalOpen(true)}
                      className="px-6 py-2.5 bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#2C3A32] font-bold rounded-xl text-xs transition-colors border border-[#E8E4D5] cursor-pointer"
                    >
                      Register Beneficiary Account
                    </button>
                  </div>
                </div>
              ) : (
                <BeneficiaryDashboard />
              )}
            </motion.div>
          )}

          {/* VIEW 3: Role-Specific Authorized Dashboard */}
          {activeNavTab === 'dashboard' && (
            <motion.div
              key="view-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {!user ? (
                <div className="bg-white p-12 rounded-3xl border border-[#E8E4D5] shadow-sm text-center flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl">🔒</span>
                  <h3 className="text-lg font-black text-[#16201A] font-display">Sign In Required</h3>
                  <p className="text-xs text-[#57685F] max-w-md">
                    Please log in with your authorized PlateShare account to access role-specific workflows (Restaurant food creation, NGO pickups, meal allocation, or Admin moderation).
                  </p>
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="mt-2 px-6 py-2.5 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Log In Now
                  </button>
                </div>
              ) : (
                <>
                  {user.role === 'Restaurant' && <RestaurantDashboard onRefresh={() => {}} />}
                  {user.role === 'NGO' && <NgoDashboard onRefresh={() => {}} />}
                  {user.role === 'Donor' && <DonorDashboard />}
                  {user.role === 'Beneficiary' && <BeneficiaryDashboard />}
                  {user.role === 'Admin' && <AdminDashboard />}
                </>
              )}
            </motion.div>
          )}

          {/* VIEW 4: Verified Organizations Directory */}
          {activeNavTab === 'organizations' && (
            <motion.div
              key="view-organizations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">
                    Verified PlateShare Partners &amp; NGOs
                  </h2>
                  <p className="text-xs text-[#57685F] mt-1">
                    Browse authorized hunger-relief organizations, registered community kitchens, and donating restaurants across Pakistan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#65776D]">Filter:</span>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="px-3 py-1.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-bold text-[#2C3A32]"
                  >
                    <option value="All Cities">🇵🇰 All Pakistan</option>
                    {ALL_PAKISTAN_CITIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.province})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners
                  .filter(p => selectedCity === 'All Cities' || (p.city && p.city.toLowerCase() === selectedCity.toLowerCase()))
                  .map(partner => (
                    <TiltCard key={partner.id} maxTilt={4} depthZ={8}>
                      <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs hover:border-[#176B45]/40 transition-colors flex flex-col justify-between h-full gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              partner.role === 'NGO' ? 'bg-[#E8F6EF] text-[#176B45]' :
                              partner.role === 'Restaurant' ? 'bg-amber-50 text-amber-800' :
                              'bg-[#FAF9F5] text-[#57685F]'
                            }`}>
                              {partner.role}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                              partner.verificationStatus === 'Verified' ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {partner.verificationStatus}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-base text-[#16201A] mt-2.5">{partner.name}</h4>
                          <p className="text-xs text-[#57685F] mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#899C92]" />
                            {partner.area ? `${partner.area}, ` : ''}{partner.city}, {partner.province || 'Pakistan'}
                          </p>

                          {partner.role === 'NGO' && partner.capacity && (
                            <div className="mt-3 p-2 bg-[#FAF9F5] rounded-xl text-[11px] text-[#2C3A32] border border-[#F4F1E6]">
                              <b>Daily Capacity:</b> {partner.capacity} meals/day
                              {partner.registrationNumber && <span className="block font-mono text-[10px] text-[#899C92]">Reg: {partner.registrationNumber}</span>}
                            </div>
                          )}

                          {partner.role === 'Restaurant' && partner.operatingHours && (
                            <div className="mt-3 p-2 bg-[#FAF9F5] rounded-xl text-[11px] text-[#2C3A32] border border-[#F4F1E6]">
                              <b>Operating Hours:</b> {partner.operatingHours}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#F4F1E6] flex items-center justify-between text-[11px] text-[#899C92]">
                          <span>Contact: {partner.phone}</span>
                          <span className="text-[#176B45] font-bold">Active Partner</span>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
              </div>
            </motion.div>
          )}

          {/* VIEW 5: National Impact Metrics */}
          {activeNavTab === 'impact' && (
            <motion.div
              key="view-impact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B45] block">Auditable Civic Metrics</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#16201A] tracking-tight mt-1 font-display">
                  PlateShare Pakistan Impact Analytics
                </h2>
                <p className="text-xs text-[#57685F] mt-1">Real-time indicators measuring food security, waste mitigation, and civic mobilization.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs text-center">
                  <span className="text-[10px] font-bold text-[#899C92] uppercase tracking-wider block">Meals Redistributed</span>
                  <span className="text-3xl font-black text-[#176B45] block mt-1 font-display">12,840+</span>
                  <span className="text-[11px] text-[#2FA66A] font-semibold block mt-1">↑ 18% this month</span>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs text-center">
                  <span className="text-[10px] font-bold text-[#899C92] uppercase tracking-wider block">CO2 Emissions Averted</span>
                  <span className="text-3xl font-black text-[#2FA66A] block mt-1 font-display">15.4 Tons</span>
                  <span className="text-[11px] text-[#57685F] font-semibold block mt-1">Landfill diversion</span>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs text-center">
                  <span className="text-[10px] font-bold text-[#899C92] uppercase tracking-wider block">Partner Restaurants</span>
                  <span className="text-3xl font-black text-[#16201A] block mt-1 font-display">48</span>
                  <span className="text-[11px] text-[#176B45] font-semibold block mt-1">Across 7 cities</span>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs text-center">
                  <span className="text-[10px] font-bold text-[#899C92] uppercase tracking-wider block">Verified NGOs</span>
                  <span className="text-3xl font-black text-[#176B45] block mt-1 font-display">32</span>
                  <span className="text-[11px] text-[#57685F] font-semibold block mt-1">100% vetted</span>
                </div>
              </div>

              {/* City Distribution Summary with Animated Progress Bars */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E4D5] shadow-xs">
                <h3 className="font-extrabold text-base text-[#16201A] mb-4 font-display">Operations by Region</h3>
                <div className="space-y-3.5">
                  {[
                    { city: 'Islamabad / Rawalpindi', meals: 4200, pct: 33 },
                    { city: 'Lahore', meals: 3850, pct: 30 },
                    { city: 'Abbottabad & Hazara', meals: 2450, pct: 19 },
                    { city: 'Peshawar', meals: 1320, pct: 10 },
                    { city: 'Karachi & Other Cities', meals: 1020, pct: 8 }
                  ].map(r => (
                    <div key={r.city} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold text-[#2C3A32]">
                        <span>{r.city}</span>
                        <span>{r.meals.toLocaleString()} meals ({r.pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F4F1E6] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${r.pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-[#176B45] rounded-full" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 6: Notifications Inbox */}
          {activeNavTab === 'notifications' && (
            <motion.div
              key="view-notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-[#F4F1E6] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#16201A] tracking-tight font-display">Notification Center</h3>
                  <p className="text-xs text-[#57685F]">Live operational alerts, food matchings, and handover statuses</p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotifsAsRead}
                    className="text-xs font-bold text-[#176B45] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-[#899C92] text-xs">
                  No notifications right now.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotifAsRead(notif.id)}
                      className={`p-3.5 rounded-2xl border transition-colors cursor-pointer text-xs flex items-start gap-3 ${
                        notif.isRead
                          ? 'bg-[#FAF9F5] border-[#E8E4D5] text-[#57685F]'
                          : 'bg-[#E8F6EF]/70 border-[#7ED4A5] text-[#16201A] font-medium'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${notif.isRead ? 'bg-[#E8E4D5] text-[#57685F]' : 'bg-[#176B45] text-white'}`}>
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-xs">{notif.title}</h5>
                          <span className="text-[10px] text-[#899C92]">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5 text-[#495A50] leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW 7: How PlateShare Works */}
          {activeNavTab === 'how-it-works' && (
            <motion.div
              key="view-how-it-works"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-8 max-w-4xl mx-auto"
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E4D5] shadow-xs text-center">
                <span className="px-3 py-1 rounded-full bg-[#E8F6EF] text-[#176B45] text-xs font-bold uppercase tracking-wider">
                  End-to-End Food Rescue Protocol
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#16201A] tracking-tight mt-3 font-display">
                  How PlateShare Connects Pakistan
                </h2>
                <p className="text-xs sm:text-sm text-[#57685F] mt-2 max-w-2xl mx-auto leading-relaxed">
                  From commercial kitchens to vulnerable households: An automated, verified, and dignified food redistribution workflow across Pakistani cities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: 1,
                    title: 'Surplus Food Posting',
                    desc: 'Verified restaurants and banquet halls log available surplus food, specifying meal portions, storage requirements (Hot/Refrigerated), preparation times, and strict pickup deadlines.'
                  },
                  {
                    step: 2,
                    title: 'Intelligent Geo-Matching',
                    desc: 'PlateShare calculates distances using the Haversine formula and evaluates NGO verification, vehicle capacity, and localized service areas to match and notify the most suitable local NGOs.'
                  },
                  {
                    step: 3,
                    title: 'Confirmed Handover',
                    desc: 'When an NGO accepts, they schedule a pickup time. Once the NGO collects the food, the restaurant confirms the handover in its dashboard and the donation is marked Collected.'
                  },
                  {
                    step: 4,
                    title: 'Dignified Delivery & Protection',
                    desc: 'Food is delivered to digital beneficiaries or NGO-managed offline assistance cases. The system enforces atomic anti-duplicate locks to prevent duplicate distributions within the same period.'
                  }
                ].map(item => (
                  <div key={item.step} className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#176B45] text-white flex items-center justify-center font-bold text-base">
                      {item.step}
                    </div>
                    <h4 className="font-extrabold text-base text-[#16201A]">{item.title}</h4>
                    <p className="text-xs text-[#57685F] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* VIEW 8: Trust & Safety */}
          {activeNavTab === 'trust' && (
            <motion.div
              key="view-trust"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-8 max-w-4xl mx-auto"
            >
              <div className="bg-gradient-to-br from-[#0D3E27] via-[#176B45] to-[#125235] text-white p-6 sm:p-10 rounded-3xl shadow-lg border border-[#176B45]/40">
                <span className="px-3 py-1 rounded-full bg-white/10 text-[#DAF4E5] text-xs font-bold uppercase tracking-wider border border-white/20">
                  Integrity &amp; Privacy First
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3 font-display">
                  PlateShare Trust &amp; Safety Standard
                </h2>
                <p className="text-xs sm:text-sm text-[#E8F6EF] mt-2 max-w-2xl leading-relaxed">
                  Protecting donor trust, humanitarian dignity, and food safety across Pakistan through role-based governance, strict verification, and privacy preservation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-2">
                  <span className="text-2xl">🛡️</span>
                  <h4 className="font-extrabold text-sm text-[#16201A]">Vetted Partner Network</h4>
                  <p className="text-xs text-[#57685F] leading-relaxed">
                    Restaurants and NGOs must complete verification before publishing donations or handling food. Accounts start in <b>Pending Verification</b> until authorized by platform administrators.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-2">
                  <span className="text-2xl">🔒</span>
                  <h4 className="font-extrabold text-sm text-[#16201A]">Beneficiary Privacy &amp; CNIC Masking</h4>
                  <p className="text-xs text-[#57685F] leading-relaxed">
                    Vulnerable beneficiaries are never exposed to donors, restaurants, or the public. National CNIC numbers are masked (<code>****-****1234</code>) and accessed strictly on a need-to-know basis.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-2">
                  <span className="text-2xl">📋</span>
                  <h4 className="font-extrabold text-sm text-[#16201A]">Anti-Duplicate Protection</h4>
                  <p className="text-xs text-[#57685F] leading-relaxed">
                    Atomic concurrency controls block double food allocations within the active distribution period (Daily/Weekly). Every action is permanently recorded in immutable audit logs.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 5. AUTH MODALS (LOGIN & REGISTER) */}
      <AuthModals
        loginOpen={loginModalOpen}
        registerOpen={registerModalOpen}
        onCloseLogin={() => setLoginModalOpen(false)}
        onCloseRegister={() => setRegisterModalOpen(false)}
        onSwitchToRegister={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }}
        onSwitchToLogin={() => { setRegisterModalOpen(false); setLoginModalOpen(true); }}
      />

      {/* 6. USER PROFILE MODAL */}
      {profileModalOpen && (
        <UserProfileModal onClose={() => setProfileModalOpen(false)} />
      )}

      {/* 7. EVALUATION TEST ACCOUNTS DRAWER */}
      {import.meta.env.DEV && typeof window !== 'undefined' && window.location.search.includes('demo=true') && (
        <DemoAccountsBar />
      )}

      {/* 8. FOOTER */}
      <footer className="mt-auto bg-[#FAF9F5] border-t border-[#E8E4D5] py-8 text-xs text-[#57685F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🍲</span>
            <div>
              <span className="font-black text-[#16201A] block">PlateShare Pakistan</span>
              <span className="text-[10px] text-[#899C92] block -mt-0.5">National Food Redistribution Network</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <button onClick={() => setActiveNavTab('home')} className="hover:text-[#16201A] cursor-pointer">Home</button>
            <button onClick={() => setActiveNavTab('explore')} className="hover:text-[#16201A] cursor-pointer">Explore Cities</button>
            <button onClick={() => setActiveNavTab('organizations')} className="hover:text-[#16201A] cursor-pointer">Organizations</button>
            <button onClick={() => setActiveNavTab('impact')} className="hover:text-[#16201A] cursor-pointer">Impact</button>
            <span className="text-[#CFCEBE]">|</span>
            <span className="text-[#2C3A32]">Pakistan Helpline: <b>1129</b> / Citizen Portal Integration</span>
          </div>

          <div className="text-[10px] text-[#899C92]">
            © 2026 PlateShare Pakistan. Secure Role-Based Redistribution Platform.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlateShareMainApp />
    </AuthProvider>
  );
}
