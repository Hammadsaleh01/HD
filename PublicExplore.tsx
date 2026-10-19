import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Search, 
  Filter, 
  Building, 
  Heart, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  ShieldAlert,
  Coins,
  QrCode,
  Users
} from 'lucide-react';
import { useAuth, FoodListing, User } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { ALL_PAKISTAN_CITIES } from '../data/pakistanLocations.ts';
import { TiltCard } from './TiltCard.tsx';

interface PublicExploreProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const PublicExplore: React.FC<PublicExploreProps> = ({
  onOpenLogin,
  onOpenRegister,
  onNavigateToTab
}) => {
  const { user, selectedCity, setSelectedCity } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimLoading, setClaimLoading] = useState<string | null>(null);

  // Load surplus food listings
  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.listings.getAll();
      setListings(res.listings || []);
    } catch (err) {
      console.warn('Load listings error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load verified NGO campaigns
  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const res = await api.campaigns.getAll();
      const list = (res.campaigns || []).filter((c: any) => c.status === 'Active' || c.status === 'Approved');
      setCampaigns(list);
    } catch (err) {
      console.warn('Load campaigns error:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    loadCampaigns();
  }, []);

  const handleClaim = async (listingId: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    if (user.role !== 'NGO') {
      alert('Only registered and verified NGOs can claim surplus food for distribution.');
      return;
    }
    if (user.verificationStatus !== 'Verified' && user.verificationStatus !== 'Approved') {
      alert('Your NGO is still Pending Admin Verification. Only verified NGOs can claim donations.');
      return;
    }

    setClaimLoading(listingId);
    try {
      await api.listings.acceptListing(listingId);
      alert('Donation successfully claimed! Please schedule pickup time in your NGO dashboard.');
      loadListings();
      onNavigateToTab('dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to claim donation');
    } finally {
      setClaimLoading(null);
    }
  };

  const filteredListings = listings.filter(item => {
    const matchesCity = selectedCity === 'All Cities' || 
      (item.city && item.city.toLowerCase() === selectedCity.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.foodCategory === categoryFilter;
    const matchesSearch = !searchQuery || 
      item.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesCategory && matchesSearch;
  });

  const filteredCampaigns = campaigns.filter(c => {
    if (selectedCity === 'All Cities') return true;
    const cCity = c.city || c.ngoCity || '';
    return cCity.toLowerCase() === selectedCity.toLowerCase();
  });

  const availableCount = listings.filter(l => l.status === 'Available').length;
  const totalMeals = listings.reduce((sum, l) => sum + (l.quantity || 0), 0);

  // Stagger animation container
  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  return (
    <div className="flex flex-col gap-10 pb-16">
      
      {/* 1. HERO SECTION WITH SUBTLE FLOATING ELEMENTS & 3D DEPTH */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0D3E27] via-[#176B45] to-[#125235] text-white p-7 sm:p-12 shadow-xl border border-[#176B45]/40">
        
        {/* Subtle decorative floating elements (Pakistan hunger relief motifs) */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#2FA66A]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#10462F]/40 blur-3xl pointer-events-none" />
        
        {/* Status badge 1: Live Status */}
        <div className="hidden md:flex absolute top-8 right-8 items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-md text-xs pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2FA66A]" />
          <span className="font-semibold text-white/95">Active Across Pakistan</span>
        </div>

        {/* Status badge 2: Verified NGO Shield */}
        <div className="hidden lg:flex absolute bottom-12 right-12 items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-md text-xs pointer-events-none">
          <ShieldCheck className="w-4 h-4 text-[#7ED4A5]" />
          <span className="font-semibold text-[#DAF4E5]">100% Admin-Verified NGOs</span>
        </div>

        <div className="relative z-10 max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 text-[#DAF4E5] text-xs font-semibold mb-5 shadow-xs">
            <span className="text-sm">🇵🇰</span>
            <span>National Hunger-Relief &amp; Food Rescue Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight font-display">
            Bridge Surplus Food. <br />
            <span className="text-[#7ED4A5]">Empower Verified NGOs.</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#E8F6EF]/90 max-w-2xl leading-relaxed font-sans">
            PlateShare connects restaurants donating surplus meals with vetted Pakistani NGOs, and allows financial donors to fund transparent, auditable hunger-relief campaigns—ensuring dignity and transparency without waste.
          </p>

          {/* Action CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {(!user || user.role === 'Donor') && (
              <button
                onClick={() => onNavigateToTab('donate-ngos')}
                className="bg-[#2FA66A] hover:bg-[#268f5a] text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
              >
                <Heart className="w-4 h-4 fill-white text-white" />
                <span>Donate to Verified NGOs</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}

            <button
              onClick={() => {
                const el = document.getElementById('surplus-food-feed');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/15 hover:bg-white/25 text-white font-bold px-5 py-3 rounded-2xl text-xs transition-colors border border-white/25 cursor-pointer backdrop-blur-xs flex items-center gap-2"
            >
              <Utensils className="w-4 h-4 text-[#DAF4E5]" />
              <span>Explore Surplus Food</span>
            </button>

            <button
              onClick={() => onNavigateToTab('apply-assistance')}
              className="bg-white/10 hover:bg-white/20 text-[#E8F6EF] font-semibold px-4 py-3 rounded-2xl text-xs transition-colors border border-white/15 cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Apply for Assistance</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid inside Hero */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-9 pt-7 border-t border-white/15 text-xs">
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/15 shadow-xs">
            <span className="text-[#DAF4E5] text-[10px] uppercase font-bold tracking-wider block">Available Food Portions</span>
            <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">{availableCount} active lots</span>
            <span className="text-[10px] text-white/70 block mt-0.5">Ready for NGO dispatch</span>
          </div>
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/15 shadow-xs">
            <span className="text-[#DAF4E5] text-[10px] uppercase font-bold tracking-wider block">Total Meals Saved</span>
            <span className="text-2xl sm:text-3xl font-black text-[#7ED4A5] block mt-0.5">{(totalMeals + 12840).toLocaleString()}+</span>
            <span className="text-[10px] text-white/70 block mt-0.5">Dignified allocations</span>
          </div>
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/15 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[#DAF4E5] text-[10px] uppercase font-bold tracking-wider block">Active City Focus</span>
            <span className="text-2xl sm:text-3xl font-black text-[#F4F1E6] block mt-0.5 truncate">{selectedCity}</span>
            <span className="text-[10px] text-white/70 block mt-0.5">Cross-provincial coordination</span>
          </div>
        </div>
      </section>

      {/* 2. VERIFIED NGO RELIEF CAMPAIGNS (FINANCIAL DONATIONS MODULE) */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#176B45]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#176B45]">
                Direct Donor Support
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#16201A] tracking-tight mt-1 font-display">
              Verified NGO Relief Campaigns
            </h2>
            <p className="text-xs text-[#57685F] mt-0.5 max-w-xl">
              Donors donate exclusively to verified NGOs and their auditable relief drives. Restaurants donate surplus food, never receiving financial donations.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('donate-ngos')}
            className="text-xs font-bold text-[#176B45] hover:text-[#10462F] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>View All Campaigns &amp; NGOs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {campaignsLoading ? (
          <div className="p-10 text-center text-xs text-[#899C92] bg-white rounded-3xl border border-[#E8E4D5]">
            Loading verified campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#57685F] bg-white rounded-3xl border border-[#E8E4D5] flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">🌱</span>
            <p className="font-bold text-[#16201A]">No active campaigns found in {selectedCity}</p>
            <p className="text-[11px] text-[#899C92]">Explore drives across all Pakistan or support verified NGOs directly.</p>
            <button
              onClick={() => setSelectedCity('All Cities')}
              className="text-xs font-bold text-[#176B45] hover:underline cursor-pointer mt-1"
            >
              Switch to All Pakistan
            </button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredCampaigns.slice(0, 3).map((campaign) => {
              const progressPct = Math.min(100, Math.round(((campaign.raisedAmountPkr || 0) / (campaign.targetAmountPkr || 1)) * 100));
              const remaining = Math.max(0, (campaign.targetAmountPkr || 0) - (campaign.raisedAmountPkr || 0));

              return (
                <motion.div key={campaign.id} variants={itemVariants}>
                  <TiltCard className="h-full">
                    <div className="bg-white rounded-3xl border border-[#E8E4D5] p-5 shadow-sm hover:border-[#176B45]/40 transition-colors flex flex-col justify-between h-full gap-4">
                      <div>
                        {/* Header: NGO and Status */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[#E8F6EF] text-[#176B45] flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                              {campaign.ngoName?.charAt(0) || 'N'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-extrabold text-xs text-[#16201A] leading-tight block">
                                  {campaign.ngoName}
                                </span>
                                <span title="Admin Verified NGO" className="inline-flex items-center">
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
                                </span>
                              </div>
                              <span className="text-[10px] text-[#899C92] block">📍 {campaign.city || campaign.ngoCity || 'Pakistan'}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F6EF] text-[#176B45] uppercase">
                            Verified Drive
                          </span>
                        </div>

                        <h4 className="font-black text-base text-[#16201A] leading-snug line-clamp-2">
                          {campaign.title}
                        </h4>

                        <p className="mt-2 text-xs text-[#57685F] line-clamp-2 leading-relaxed">
                          {campaign.description}
                        </p>

                        {/* Progress Bar with Motion */}
                        <div className="mt-4 pt-3 border-t border-[#F4F1E6]">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <div>
                              <span className="font-black text-[#176B45] text-sm">
                                PKR {(campaign.raisedAmountPkr || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-[#899C92] ml-1">raised</span>
                            </div>
                            <span className="font-black text-[#16201A] text-xs">
                              {progressPct}%
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-[#F4F1E6] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPct}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-[#176B45] to-[#2FA66A] rounded-full"
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-[#65776D] mt-1.5 font-medium">
                            <span>Goal: PKR {(campaign.targetAmountPkr || 0).toLocaleString()}</span>
                            <span>Remaining: PKR {remaining.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      {(!user || user.role === 'Donor') && (
                        <button
                          onClick={() => onNavigateToTab('donate-ngos')}
                          className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 fill-white text-white" />
                          <span>Donate in PKR</span>
                        </button>
                      )}
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* 3. FOUR-STEP FOOD RESCUE WORKFLOW SECTION */}
      <section className="bg-white rounded-3xl border border-[#E8E4D5] p-6 sm:p-9 shadow-sm flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B45] block">
            End-to-End Humanitarian Pipeline
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-[#16201A] tracking-tight mt-1 font-display">
            How Food Rescue Operates Across Pakistan
          </h3>
          <p className="text-xs text-[#57685F] mt-1 max-w-2xl">
            An auditable, digital protocol protecting food safety, donor trust, and beneficiary dignity in every handover.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Surplus Logging',
              desc: 'Kitchens log portion counts, expiry deadlines, and storage (Hot/Chilled). No financial donations accepted by restaurants.',
              icon: Utensils
            },
            {
              step: '02',
              title: 'Geo-Distance Pairing',
              desc: 'PlateShare calculates Haversine distance, notifying verified local NGOs with appropriate fleet capacity.',
              icon: MapPin
            },
            {
              step: '03',
              title: 'Confirmed Handover',
              desc: 'The restaurant confirms the handover once the NGO collects the food, and every confirmation is recorded in the audit log.',
              icon: QrCode
            },
            {
              step: '04',
              title: 'Dignified Delivery',
              desc: 'Nutritious meals are delivered to vulnerable families with anti-duplicate locks and complete privacy preservation.',
              icon: PackageCheck
            }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.step} 
                className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#E8E4D5] flex flex-col justify-between gap-3 group hover:border-[#176B45]/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-black text-[#176B45] bg-[#E8F6EF] px-2 py-0.5 rounded-md">
                      {item.step}
                    </span>
                    <Icon className="w-4 h-4 text-[#57685F] group-hover:text-[#176B45] transition-colors" />
                  </div>
                  <h4 className="font-bold text-sm text-[#16201A]">{item.title}</h4>
                  <p className="text-xs text-[#57685F] mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. SURPLUS FOOD LISTINGS FEED */}
      <section id="surplus-food-feed" className="flex flex-col gap-6">
        
        {/* Filter and Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-[#899C92] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search food name, city, area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs focus:outline-none focus:border-[#176B45] font-medium text-[#16201A]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-bold text-[#2C3A32] cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Biryani & Rice">Biryani &amp; Rice</option>
              <option value="Curry & Gravy">Curry &amp; Gravy</option>
              <option value="Bread & Naan">Bread &amp; Naan</option>
              <option value="BBQ & Grilled">BBQ &amp; Grilled</option>
              <option value="Snacks & Bakery">Snacks &amp; Bakery</option>
              <option value="Vegetable Dishes">Vegetable Dishes</option>
            </select>
          </div>

          {/* City Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 text-xs">
            <span className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider mr-1">City:</span>
            {['All Cities', 'Islamabad', 'Lahore', 'Karachi', 'Abbottabad', 'Peshawar'].map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#176B45] text-white shadow-xs'
                    : 'bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#495A50]'
                }`}
              >
                {city === 'All Cities' ? '🇵🇰 All Pakistan' : city}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#16201A] tracking-tight font-display">
              Available Surplus Food Listings
            </h3>
            <p className="text-xs text-[#57685F]">
              Showing fresh surplus food posted in <b>{selectedCity}</b> ready for NGO pickup
            </p>
          </div>
          <span className="text-xs font-bold text-[#57685F]">{filteredListings.length} listing(s)</span>
        </div>

        {/* Listings Grid with 3D Tilt Cards */}
        {loading ? (
          <div className="p-12 text-center text-[#899C92] text-xs bg-white rounded-3xl border border-[#E8E4D5]">
            Loading live surplus food donations...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#E8E4D5] text-center flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">🍲</span>
            <h4 className="font-black text-sm text-[#16201A]">No surplus food currently available in this filter</h4>
            <p className="text-xs text-[#57685F] max-w-md">
              Switch city filter to <b>All Pakistan</b> or check back when restaurants finish lunch/dinner service.
            </p>
            <button
              onClick={() => setSelectedCity('All Cities')}
              className="mt-2 text-xs font-bold text-[#176B45] hover:underline cursor-pointer"
            >
              Show all Pakistani cities
            </button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredListings.map(item => (
              <motion.div key={item.id} variants={itemVariants}>
                <TiltCard className="h-full">
                  <div className="bg-white rounded-3xl border border-[#E8E4D5] p-5 shadow-sm hover:border-[#176B45]/40 transition-colors flex flex-col justify-between h-full gap-4">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF9F5] text-[#2C3A32] border border-[#E8E4D5] uppercase">
                          {item.foodCategory}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'Available' ? 'bg-[#E8F6EF] text-[#176B45] border border-[#7ED4A5]' :
                          item.status === 'Accepted' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          item.status === 'Pickup_Scheduled' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-[#FAF9F5] text-[#57685F]'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-[#16201A] leading-snug">
                        {item.foodName}
                      </h4>
                      
                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-[#495A50]">
                        <div className="flex items-center gap-1.5 font-bold text-[#16201A]">
                          <Utensils className="w-3.5 h-3.5 text-[#176B45]" />
                          <span>{item.quantity} {item.unit}</span>
                          <span className="text-[#CFCEBE]">•</span>
                          <span className="text-[11px] font-medium text-[#57685F]">{item.storageCondition}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#57685F]">
                          <MapPin className="w-3.5 h-3.5 text-[#899C92] shrink-0" />
                          <span className="truncate">{item.area}, {item.city}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>
                            Pickup Deadline: {isNaN(new Date(item.pickupDeadline).getTime()) 
                              ? item.pickupDeadline 
                              : new Date(item.pickupDeadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-3 text-xs text-[#57685F] bg-[#FAF9F5] p-2.5 rounded-xl border border-[#F4F1E6] line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.claimedByNgoName && (
                        <div className="mt-3 p-2 bg-[#E8F6EF] rounded-xl text-xs text-[#176B45] border border-[#7ED4A5]/40">
                          <b>Claimed by:</b> {item.claimedByNgoName}
                        </div>
                      )}
                    </div>

                    {/* Claim CTA for NGOs */}
                    {item.status === 'Available' && (
                      <button
                        onClick={() => handleClaim(item.id)}
                        disabled={claimLoading === item.id}
                        className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-2xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {claimLoading === item.id ? 'Claiming...' : (
                          user?.role === 'NGO' ? 'Claim Food Donation for Distribution' : 'Claim Donation (NGO Verification Required)'
                        )}
                      </button>
                    )}
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

    </div>
  );
};
