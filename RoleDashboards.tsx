import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Users, 
  Utensils, 
  DollarSign, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Receipt,
  Heart,
  FileText,
  BadgeAlert,
  Layers,
  Calendar,
  Building,
  CreditCard,
  Ban,
  PackageCheck,
  Sparkles,
  Key,
  Eye
} from 'lucide-react';
import { 
  useAuth, 
  FoodListing, 
  User, 
  NgoCampaign, 
  FinancialDonation, 
  CampaignExpense, 
  BeneficiaryApplication 
} from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { PAKISTAN_PROVINCES, ALL_PAKISTAN_CITIES, getCityDetails } from '../data/pakistanLocations.ts';
import { TiltCard } from './TiltCard.tsx';

// ----------------------------------------------------------------------
// RESTAURANT DASHBOARD (SURPLUS FOOD ONLY - NO FINANCIAL RECIPIENTS)
// ----------------------------------------------------------------------
export const RestaurantDashboard: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { user, selectedCity } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myListings, setMyListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmListing, setConfirmListing] = useState<FoodListing | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Form states
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Biryani & Rice');
  const [quantity, setQuantity] = useState('30');
  const [unit, setUnit] = useState<'meals' | 'kg' | 'packs'>('meals');
  const [description, setDescription] = useState('');
  const [storageCondition, setStorageCondition] = useState<'Hot/Insulated' | 'Refrigerated' | 'Ambient'>('Hot/Insulated');
  const [pickupDeadline, setPickupDeadline] = useState(() => {
    const d = new Date(Date.now() + 6 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [formCity, setFormCity] = useState(user?.city || 'Lahore');
  const [formArea, setFormArea] = useState(user?.area || 'Gulberg');
  const [pickupAddress, setPickupAddress] = useState(user?.address || 'Main Commercial Area');
  const [submitting, setSubmitting] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await api.listings.getMyListings();
      setMyListings(res.listings || []);
    } catch (err) {
      console.warn('Load my listings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [user]);

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Quantity must be a positive number');
      return;
    }
    if (!pickupAddress || pickupAddress.trim().length < 5) {
      alert('Pickup address must be at least 5 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.listings.create({
        foodName,
        foodCategory,
        quantity: qtyNum,
        unit,
        description,
        preparationTime: 'Prepared recently today',
        availableTime: 'Immediately',
        pickupDeadline: new Date(pickupDeadline).toISOString(),
        storageCondition,
        city: formCity,
        area: formArea,
        pickupAddress: pickupAddress.trim()
      });
      alert(`Donation listed! Matched with ${res.matchedNgos?.length || 0} verified NGOs in ${formCity}.`);
      setShowCreateModal(false);
      setFoodName('');
      setDescription('');
      loadListings();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!confirmListing) return;
    setVerifying(true);
    try {
      await api.listings.confirmHandover(confirmListing.id);
      alert('Handover confirmed! Food marked as Collected.');
      setConfirmListing(null);
      loadListings();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = user?.verificationStatus === 'Verified' || user?.verificationStatus === 'Approved';

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E4D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">{user?.name}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
              isVerified ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {user?.verificationStatus}
            </span>
          </div>
          <p className="text-xs text-[#57685F] mt-1">
            📍 Operating in <b>{user?.city}</b> • Food Categories: {user?.foodCategories?.join(', ') || 'Hot Cooked Meals'}
          </p>
          <div className="mt-2 text-[11px] text-[#176B45] font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PlateShare Policy: Surplus food donation hub. Financial donations are strictly reserved for verified NGOs.</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (!isVerified) {
              alert('Your restaurant account is pending PlateShare verification. Only verified restaurants can create donations.');
              return;
            }
            setShowCreateModal(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-[#176B45] hover:bg-[#125235] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Post Surplus Food Donation
        </button>
      </div>

      {!isVerified && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <b>Verification in Progress:</b> PlateShare administrators verify every restaurant's hygiene standards and physical address before authorizing surplus listings. You will receive an alert once approved.
          </div>
        </div>
      )}

      {/* Donations List */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E4D5] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#16201A] font-display">My Restaurant Food Donations</h3>
            <span className="text-xs text-[#57685F]">Manage pickup schedules and confirm handovers to NGOs</span>
          </div>
          <button onClick={loadListings} className="text-xs font-bold text-[#176B45] flex items-center gap-1 hover:underline cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#899C92]">Loading listings...</div>
        ) : myListings.length === 0 ? (
          <div className="py-12 text-center text-[#899C92] text-xs bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E8E4D5]">
            No surplus donations posted yet. Click "Post Surplus Food Donation" above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myListings.map(item => (
              <TiltCard key={item.id} maxTilt={4} depthZ={6}>
                <div className="p-4.5 rounded-2xl border border-[#E8E4D5] hover:border-[#176B45]/40 bg-white transition-all flex flex-col justify-between h-full gap-3 shadow-xs">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#176B45] uppercase">{item.foodCategory}</span>
                        <h4 className="font-extrabold text-sm text-[#16201A] mt-0.5">{item.foodName}</h4>
                        <p className="text-xs text-[#57685F] mt-1">{item.quantity} {item.unit} • {item.area}, {item.city}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                        item.status === 'Available' ? 'bg-[#E8F6EF] text-[#176B45]' :
                        item.status === 'Accepted' ? 'bg-blue-50 text-blue-800' :
                        item.status === 'Pickup_Scheduled' ? 'bg-amber-50 text-amber-800' :
                        'bg-[#FAF9F5] text-[#57685F]'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {item.claimedByNgoName && (
                      <div className="mt-3 p-2.5 bg-[#FAF9F5] rounded-xl text-xs text-[#2C3A32] border border-[#F4F1E6]">
                        <b>Claimed by:</b> {item.claimedByNgoName}
                        {item.pickupScheduledTime && (
                          <div className="text-[11px] text-[#176B45] font-semibold mt-0.5">
                            Pickup Time: {new Date(item.pickupScheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm Handover Button */}
                  {item.status === 'Pickup_Scheduled' && (
                    <button
                      onClick={() => setConfirmListing(item)}
                      className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Confirm NGO Pickup Handover
                    </button>
                  )}
                </div>
              </TiltCard>
            ))}
          </div>
        )}
      </div>

      {/* CREATE DONATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-[#E8E4D5] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-[#16201A] font-display">Post Surplus Food Donation</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#899C92] hover:text-[#16201A] font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateDonation} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Food Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Biryani & Roghani Naan"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Category</label>
                  <select
                    value={foodCategory}
                    onChange={e => setFoodCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Biryani & Rice">Biryani &amp; Rice</option>
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Fresh Bread">Fresh Bread</option>
                    <option value="Dry Ration">Dry Ration</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Quantity</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      required
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-2/3 px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-bold text-[#16201A]"
                    />
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value as any)}
                      className="w-1/3 px-1 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[10px] text-[#16201A]"
                    >
                      <option value="meals">meals</option>
                      <option value="kg">kg</option>
                      <option value="packs">packs</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">City in Pakistan</label>
                  <select
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {ALL_PAKISTAN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Storage Condition</label>
                  <select
                    value={storageCondition}
                    onChange={e => setStorageCondition(e.target.value as any)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Hot/Insulated">Hot/Insulated</option>
                    <option value="Refrigerated">Refrigerated</option>
                    <option value="Ambient">Ambient</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Pickup Deadline (Date &amp; Time)</label>
                  <input
                    type="datetime-local"
                    required
                    value={pickupDeadline}
                    onChange={e => setPickupDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-semibold text-rose-600 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Pickup Address (min 5 chars)</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    value={pickupAddress}
                    onChange={e => setPickupAddress(e.target.value)}
                    placeholder="e.g. 14-C Main Boulevard, Gulberg III"
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Description / Safety Notes</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Sealed containers, stored hot, untouched buffet surplus."
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl h-16 resize-none text-[#16201A]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl text-xs transition shadow-xs mt-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Surplus Food & Notify Local NGOs'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM HANDOVER DIALOG */}
      {confirmListing && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-[#E8E4D5] animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-sm text-[#16201A] mb-1 font-display">Confirm Food Handover</h4>
            <p className="text-xs text-[#57685F] mb-4">
              Confirm that <b>{confirmListing.claimedByNgoName || 'the claiming NGO'}</b> has collected <b>{confirmListing.foodName}</b> from you. This marks the donation as Collected.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={verifying}
                className="w-full bg-[#176B45] hover:bg-[#125235] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                {verifying ? 'Confirming...' : 'Confirm Handover (Mark Collected)'}
              </button>
              <button type="button" onClick={() => setConfirmListing(null)} className="text-xs text-[#899C92] hover:text-[#16201A] font-bold cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ----------------------------------------------------------------------
// NGO DASHBOARD (CAMPAIGNS, FOOD PICKUPS & ASSISTANCE LOGISTICS)
// ----------------------------------------------------------------------
export const NgoDashboard: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { user, selectedCity, setSelectedCity } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'collected' | 'applications' | 'needy' | 'allocate'>('available');
  const [availableListings, setAvailableListings] = useState<FoodListing[]>([]);
  const [allNationalCount, setAllNationalCount] = useState(0);
  const [collectedFood, setCollectedFood] = useState<FoodListing[]>([]);
  const [pendingPickups, setPendingPickups] = useState<FoodListing[]>([]);
  const [collectedFoodError, setCollectedFoodError] = useState('');
  const [needyPeople, setNeedyPeople] = useState<any[]>([]);
  const [applications, setApplications] = useState<BeneficiaryApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // Pickup details dialog (shown after claiming/scheduling, and reopenable from claimed listings)
  const [pickupDetails, setPickupDetails] = useState<{
    id: string;
    foodName: string;
    donorName: string;
    pickupAddress?: string;
    scheduledTime?: string;
  } | null>(null);

  // Offline beneficiary form
  const [needyName, setNeedyName] = useState('');
  const [needyCnic, setNeedyCnic] = useState('');
  const [needyPhone, setNeedyPhone] = useState('');
  const [needyCity, setNeedyCity] = useState(user?.city || 'Lahore');
  const [needyArea, setNeedyArea] = useState('Central');
  const [needyAddress, setNeedyAddress] = useState('');
  const [needySize, setNeedySize] = useState('4');
  const [needyUrgency, setNeedyUrgency] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [addingNeedy, setAddingNeedy] = useState(false);
  const [needyError, setNeedyError] = useState('');
  const [needySuccess, setNeedySuccess] = useState('');

  // Allocation form state
  const [allocDonationId, setAllocDonationId] = useState('');
  const [allocBeneficiaryComposite, setAllocBeneficiaryComposite] = useState('');
  const [allocQty, setAllocQty] = useState('1');
  const [allocError, setAllocError] = useState('');
  const [allocSuccess, setAllocSuccess] = useState('');
  const [allocating, setAllocating] = useState(false);

  const isVerified = user?.verificationStatus === 'Verified' || user?.verificationStatus === 'Approved';

  const loadNgoData = async () => {
    setLoading(true);
    setCollectedFoodError('');
    try {
      const [listingsRes, allNationalRes, needyRes, appsRes, myListingsRes] = await Promise.all([
        api.listings.getAll({ city: selectedCity !== 'All Cities' ? selectedCity : undefined }).catch(err => {
          console.warn('Load listings warning:', err);
          return { listings: [] };
        }),
        api.listings.getAll().catch(() => ({ listings: [] })),
        api.assistance.getAll(selectedCity !== 'All Cities' ? selectedCity : undefined).catch(err => {
          console.warn('Load assistance warning:', err);
          return { assistanceCases: [] };
        }),
        api.applications.getAll({ city: selectedCity !== 'All Cities' ? selectedCity : undefined }).catch(err => {
          console.warn('Load applications warning:', err);
          return { applications: [] };
        }),
        api.listings.getMyListings().catch(err => {
          const msg = err.message || 'Failed to fetch collected surplus food.';
          setCollectedFoodError(msg);
          console.warn('Load my listings error:', err);
          return { listings: [] };
        })
      ]);

      const all: FoodListing[] = listingsRes?.listings || [];
      const nationalListings: FoodListing[] = allNationalRes?.listings || [];

      const isEligibleAvailable = (l: FoodListing) =>
        l.status === 'Available' || l.status === 'Matched' || (l.status as any) === 'Approved';

      setAvailableListings(all.filter(isEligibleAvailable));
      setAllNationalCount(nationalListings.filter(isEligibleAvailable).length);

      // Filter only food genuinely confirmed as collected through the existing workflow
      // Belonging to the currently logged-in NGO
      const myClaimed: FoodListing[] = Array.isArray(myListingsRes)
        ? myListingsRes
        : (myListingsRes?.listings || []);

      const currentNgoId = (user?.id || '').trim().toLowerCase();
      const currentNgoName = ((user as any)?.organizationName || user?.name || '').trim().toLowerCase();

      // Consolidate candidate listings from both getMyListings and getAll
      const candidateMap = new Map<string, FoodListing>();
      
      // All items returned from getMyListings belong to the authenticated NGO
      for (const item of myClaimed) {
        if (item && item.id) {
          candidateMap.set(item.id, item);
        }
      }

      // Also incorporate matched listings from all listings that belong to this NGO
      for (const l of [...all, ...nationalListings]) {
        if (!l || !l.id) continue;
        const claimedId = (l.claimedByNgoId || '').trim().toLowerCase();
        const claimedName = (l.claimedByNgoName || '').trim().toLowerCase();
        const belongsToMe = (currentNgoId && (claimedId === currentNgoId || claimedId === (user?.id || '').toLowerCase())) || 
                            (currentNgoName && claimedName && claimedName === currentNgoName);
        if (belongsToMe) {
          const existing = candidateMap.get(l.id);
          candidateMap.set(l.id, { ...l, ...existing } as FoodListing);
        }
      }

      const candidateListings = Array.from(candidateMap.values());

      // Genuinely collected: must be confirmed collected through the existing workflow
      const genuinelyCollected = candidateListings.filter((l: FoodListing) => {
        return (
          l.status === 'Picked_Up' ||
          (l.status as any) === 'Collected' ||
          l.status === 'Distributed' ||
          l.status === 'Completed' ||
          l.pickupStatus === 'Picked_Up' ||
          (l.pickupStatus as any) === 'Collected'
        );
      });

      // Pending pickups: claimed or scheduled, awaiting handover confirmation
      const pending = candidateListings.filter((l: FoodListing) => {
        return (
          (l.status === 'Accepted' || l.status === 'Pickup_Scheduled') &&
          (l.status as any) !== 'Collected' &&
          l.pickupStatus !== 'Picked_Up' &&
          (l.pickupStatus as any) !== 'Collected'
        );
      });

      setCollectedFood(genuinelyCollected);
      setPendingPickups(pending);
      setNeedyPeople(needyRes?.assistanceCases || needyRes?.needyPeople || []);
      setApplications(appsRes?.applications || []);
    } catch (err: any) {
      console.warn('Load NGO data error:', err);
      setCollectedFoodError(err.message || 'Failed to fetch collected surplus food.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNgoData();
    // Auto-refresh periodically and on focus to automatically reflect restaurant handover confirmation
    const interval = setInterval(() => {
      loadNgoData();
    }, 5000);
    const handleFocus = () => loadNgoData();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, selectedCity]);

  // Combined list of eligible beneficiaries (offline community cases + approved digital accounts)
  const eligibleBeneficiaries = [
    ...needyPeople
      .filter(p => p.eligibilityStatus === 'Verified' || p.eligibilityStatus === 'Approved' || !p.eligibilityStatus)
      .map(p => ({
        compositeKey: `AssistanceCase:${p.id}`,
        name: p.name,
        city: p.city,
        typeLabel: 'Offline Community Beneficiary',
        detail: `CNIC: ${p.cnic || 'Masked'}`
      })),
    ...applications
      .filter(a => (a.status === 'Approved' || (a.status as any) === 'Verified') && a.applicantId)
      .map(a => ({
        compositeKey: `User:${a.applicantId}`,
        name: a.name,
        city: a.city,
        typeLabel: 'Online Beneficiary',
        detail: `CNIC: ${a.cnic || 'Masked'}`
      }))
  ];

  // Collected surplus food with remaining allocatable quantity
  const eligibleCollectedFood = collectedFood.filter(
    f => (f.remainingQuantity ?? f.quantity) > 0
  );

  const selectedFoodItem = collectedFood.find(f => f.id === allocDonationId);
  const selectedFoodMaxQty = selectedFoodItem ? (selectedFoodItem.remainingQuantity ?? selectedFoodItem.quantity) : 0;

  // Claim the listing (if needed) and schedule pickup
  const handleSchedulePickup = async (listingId: string, scheduledTime?: string) => {
    if (!isVerified) {
      alert('Your NGO is still Pending Admin Verification. Only verified NGOs can claim donations.');
      return;
    }
    try {
      const targetListing = availableListings.find(l => l.id === listingId) || 
                            pendingPickups.find(l => l.id === listingId) ||
                            collectedFood.find(l => l.id === listingId);

      // If status is Available, Matched, or Approved (or not yet claimed by this NGO), claim the listing first
      if (!targetListing || targetListing.status === 'Available' || targetListing.status === 'Matched' || (targetListing.status as any) === 'Approved' || !targetListing.claimedByNgoId) {
        try {
          await api.listings.acceptListing(listingId);
        } catch (acceptErr: any) {
          if (acceptErr?.message && !acceptErr.message.toLowerCase().includes('already')) {
            throw acceptErr;
          }
        }
      }

      const plannedTime = scheduledTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const res = await api.listings.schedulePickup(listingId, plannedTime);

      setPickupDetails({
        id: listingId,
        foodName: targetListing?.foodName || res.listing?.foodName || 'Surplus Food Donation',
        donorName: targetListing?.donorName || res.listing?.donorName || 'Donor / Restaurant',
        pickupAddress: targetListing?.pickupAddress || res.listing?.pickupAddress,
        scheduledTime: plannedTime
      });

      await loadNgoData();
      onRefresh();
    } catch (err: any) {
      alert(err.details?.[0]?.message || err.message || 'Failed to schedule pickup');
    }
  };

  const handleClaim = async (id: string) => {
    await handleSchedulePickup(id);
  };

  // Re-open pickup details for a listing this NGO has already claimed
  const handleViewPickupDetails = (item: FoodListing) => {
    setPickupDetails({
      id: item.id,
      foodName: item.foodName,
      donorName: item.donorName,
      pickupAddress: item.pickupAddress,
      scheduledTime: item.pickupScheduledTime
    });
  };

  const handleAddNeedy = async (e: React.FormEvent) => {
    e.preventDefault();
    setNeedyError('');
    setNeedySuccess('');

    const cleanName = needyName.trim();
    if (cleanName.length < 3 || cleanName.length > 60) {
      setNeedyError('Beneficiary full name must be between 3 and 60 characters.');
      return;
    }

    const cleanCnicDigits = needyCnic.replace(/[-\s]/g, '').trim();
    if (!/^\d{13}$/.test(cleanCnicDigits)) {
      setNeedyError('National CNIC must contain exactly 13 digits (format: 35201-1234567-1).');
      return;
    }

    const cleanCity = needyCity.trim();
    if (cleanCity.length < 2) {
      setNeedyError('City must be at least 2 characters.');
      return;
    }

    const cleanAddress = needyAddress.trim();
    if (cleanAddress.length < 5) {
      setNeedyError('Residential address must be at least 5 characters.');
      return;
    }

    const householdSizeNum = Number(needySize);
    if (!householdSizeNum || householdSizeNum < 1) {
      setNeedyError('Household size must be at least 1.');
      return;
    }

    setAddingNeedy(true);
    try {
      const res = await api.assistance.register({
        name: cleanName,
        phone: needyPhone.trim() || 'N/A (No Phone)',
        cnic: needyCnic.trim(),
        city: cleanCity,
        area: needyArea.trim() || 'Local Area',
        address: cleanAddress,
        householdSize: householdSizeNum,
        urgency: needyUrgency
      });
      setNeedySuccess(res.message || 'Offline community beneficiary successfully registered.');
      setNeedyName('');
      setNeedyCnic('');
      setNeedyPhone('');
      setNeedyCity(user?.city || 'Lahore');
      setNeedyArea('Central');
      setNeedyAddress('');
      setNeedySize('4');
      setNeedyUrgency('Medium');
      await loadNgoData();
    } catch (err: any) {
      const msg = err.details?.[0]?.message || err.message || 'Failed to register offline beneficiary';
      setNeedyError(msg);
    } finally {
      setAddingNeedy(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocError('');
    setAllocSuccess('');

    if (!allocDonationId) {
      setAllocError('Please select a collected surplus food listing.');
      return;
    }

    const selectedFood = collectedFood.find(f => f.id === allocDonationId);
    if (!selectedFood) {
      setAllocError('Selected food listing was not found.');
      return;
    }

    const availableQty = selectedFood.remainingQuantity ?? selectedFood.quantity;
    if (availableQty <= 0) {
      setAllocError('This food collection has already been fully allocated.');
      return;
    }

    if (!allocBeneficiaryComposite) {
      setAllocError('Please select an eligible beneficiary.');
      return;
    }

    const [benType, benId] = allocBeneficiaryComposite.split(':');
    if (!benType || !benId) {
      setAllocError('Invalid beneficiary selection.');
      return;
    }

    const qtyNum = Number(allocQty);
    if (!qtyNum || qtyNum <= 0) {
      setAllocError('Meals to allocate must be a positive number greater than 0.');
      return;
    }

    if (qtyNum > availableQty) {
      setAllocError(`Cannot allocate ${qtyNum} meals. Only ${availableQty} meals are available in this collection.`);
      return;
    }

    setAllocating(true);
    try {
      const res = await api.allocations.create({
        listingId: allocDonationId,
        beneficiaryType: benType as 'User' | 'AssistanceCase',
        beneficiaryId: benId,
        quantity: qtyNum
      });
      setAllocSuccess(res.message || `Successfully allocated ${qtyNum} meals!`);
      setAllocDonationId('');
      setAllocBeneficiaryComposite('');
      setAllocQty('1');
      await loadNgoData();
      onRefresh();
    } catch (err: any) {
      const msg = err.details?.[0]?.message || err.message || 'Allocation rejected by rate limit or validation rules.';
      setAllocError(msg);
    } finally {
      setAllocating(false);
    }
  };

  const handleApproveApp = async (id: string) => {
    try {
      await api.applications.review(id, { status: 'Approved' });
      alert('Beneficiary application approved!');
      loadNgoData();
    } catch (err: any) {
      alert(err.details?.[0]?.message || err.message);
    }
  };

  const handleRejectApp = async (id: string) => {
    const reason = prompt('Enter polite rejection reason (e.g. Outside active service district):');
    if (!reason) return;
    try {
      await api.applications.review(id, { status: 'Rejected', rejectionReason: reason });
      alert('Application rejected with reason.');
      loadNgoData();
    } catch (err: any) {
      alert(err.details?.[0]?.message || err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E4D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">{user?.organizationName || user?.name}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
              isVerified ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {user?.verificationStatus}
            </span>
          </div>
          <p className="text-xs text-[#57685F] mt-1">
            📍 Operating in <b>{user?.city}</b> • Daily Redistribution Capacity: <b>{user?.capacity || 100} meals/day</b>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadNgoData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#2C3A32] font-bold text-xs border border-[#E8E4D5] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#176B45] ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E8E4D5] gap-4 text-xs font-bold text-[#65776D] overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('available')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'available' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Available Surplus Food ({availableListings.length})
        </button>
        <button
          onClick={() => { setActiveTab('collected'); loadNgoData(); }}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'collected' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Collected Surplus Food ({collectedFood.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'applications' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Assistance Requests ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('needy')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'needy' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Verified Cases ({needyPeople.length})
        </button>
        <button
          onClick={() => { setActiveTab('allocate'); loadNgoData(); }}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'allocate' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Allocate Food to Beneficiary
        </button>
      </div>

      {/* TAB 1: AVAILABLE SURPLUS FOOD */}
      {activeTab === 'available' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-4 rounded-2xl border border-[#E8E4D5] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#16201A]">Surplus Food Region:</span>
              <span className="px-2 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45] font-extrabold">
                {selectedCity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedCity !== 'All Cities' && (
                <button
                  type="button"
                  onClick={() => setSelectedCity('All Cities')}
                  className="px-3 py-1 bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#176B45] font-bold rounded-xl border border-[#E8E4D5] transition cursor-pointer"
                >
                  View All Pakistan ({allNationalCount})
                </button>
              )}
              {selectedCity === 'All Cities' && user?.city && (
                <button
                  type="button"
                  onClick={() => setSelectedCity(user.city)}
                  className="px-3 py-1 bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#2C3A32] font-bold rounded-xl border border-[#E8E4D5] transition cursor-pointer"
                >
                  Focus My City ({user.city})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableListings.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-[#899C92] bg-white rounded-3xl border border-[#E8E4D5] flex flex-col items-center gap-2 p-6">
                <p>No surplus food available in {selectedCity} right now.</p>
                {allNationalCount > 0 && selectedCity !== 'All Cities' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCity('All Cities')}
                    className="px-4 py-2 bg-[#E8F6EF] text-[#176B45] hover:bg-[#d4eedf] font-bold rounded-xl transition cursor-pointer text-xs"
                  >
                    View {allNationalCount} donation(s) available across Pakistan →
                  </button>
                )}
              </div>
            ) : (
            availableListings.map(item => {
              const isAlreadyClaimed = Boolean(item.claimedByNgoId && item.claimedByNgoId !== user?.id);
              const isClaimedByMe = Boolean(item.claimedByNgoId && item.claimedByNgoId === user?.id);
              const remaining = item.remainingQuantity ?? item.quantity;
              const expiryDate = isNaN(new Date(item.pickupDeadline).getTime())
                ? item.pickupDeadline
                : new Date(item.pickupDeadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

              return (
                <TiltCard key={item.id} maxTilt={4} depthZ={6}>
                  <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col justify-between h-full gap-3">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold text-[#176B45] uppercase">{item.foodCategory}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F6EF] text-[#176B45]">
                            {item.status || 'Available'}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            Expiry: {expiryDate}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm text-[#16201A] mt-2">{item.foodName}</h4>

                      <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        <p className="text-[#57685F]">
                          <span className="font-semibold text-[#16201A]">Donor:</span> {item.donorName}{' '}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E4D5] text-[#899C92] font-semibold">
                            {item.donorRole === 'Restaurant' ? 'Restaurant' : 'Donor'}
                          </span>
                        </p>
                        <p className="text-[#57685F]">
                          <span className="font-semibold text-[#16201A]">Quantity:</span> {remaining} {item.unit} • {item.storageCondition}
                        </p>
                        <p className="text-[#899C92]">
                          📍 {item.area}, {item.city} {item.pickupAddress ? `• ${item.pickupAddress}` : ''}
                        </p>
                      </div>

                      {isClaimedByMe && (
                        <div className="mt-2.5 p-2 bg-[#E8F6EF] rounded-xl border border-[#7ED4A5]/40 text-xs text-[#176B45] font-bold flex items-center justify-between">
                          <span>Claimed by your organization</span>
                          <button
                            type="button"
                            onClick={() => handleViewPickupDetails(item)}
                            className="px-2 py-1 bg-[#176B45] text-white rounded-lg text-[10px] hover:bg-[#125235] cursor-pointer flex items-center gap-1"
                          >
                            <Key className="w-3 h-3" /> Pickup Details
                          </button>
                        </div>
                      )}
                    </div>

                    {isAlreadyClaimed ? (
                      <button
                        disabled
                        className="w-full bg-gray-100 text-gray-500 font-bold py-2.5 rounded-xl text-xs cursor-not-allowed border border-gray-200"
                      >
                        Claimed by Another NGO ({item.claimedByNgoName || 'Reserved'})
                      </button>
                    ) : isClaimedByMe ? (
                      <button
                        onClick={() => handleViewPickupDetails(item)}
                        className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" /> View Pickup Details
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClaim(item.id)}
                        className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        Claim Donation for Distribution
                      </button>
                    )}
                  </div>
                </TiltCard>
              );
            })
          )}
        </div>
      </div>
    )}

      {/* TAB 2: COLLECTED SURPLUS FOOD */}
      {activeTab === 'collected' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-[#16201A]">Confirmed Surplus Collections</h3>
              <p className="text-xs text-[#57685F]">Surplus food successfully collected by your organization, ready for beneficiary distribution.</p>
            </div>
            {eligibleCollectedFood.length > 0 && (
              <button
                onClick={() => setActiveTab('allocate')}
                className="px-3.5 py-1.5 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs transition cursor-pointer self-start sm:self-auto"
              >
                Go to Allocation Form →
              </button>
            )}
          </div>

          {collectedFoodError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2">
              <span>⚠️ {collectedFoodError}</span>
              <button
                onClick={() => loadNgoData()}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Pending Pickups Awaiting Handover */}
          {pendingPickups.length > 0 && (
            <div className="p-5 bg-amber-50/80 rounded-3xl border border-amber-200 flex flex-col gap-3">
              <div>
                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                  ⏳ Claimed Pickups Awaiting Handover ({pendingPickups.length})
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Collect the food at the scheduled time. The restaurant or food donor confirms the handover, and it then moves to your collected food.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingPickups.map(p => {
                  return (
                    <div key={p.id} className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3 text-xs">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-[#176B45] uppercase">{p.foodCategory}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {p.status}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-[#16201A] mt-1">{p.foodName}</h4>
                        <p className="text-xs text-[#57685F] mt-0.5">
                          Donor: <b>{p.donorName}</b> ({p.donorRole === 'Restaurant' ? 'Restaurant' : 'Donor'}) • {p.quantity} {p.unit}
                        </p>
                        <p className="text-[11px] text-[#899C92] mt-0.5">📍 {p.area}, {p.city}</p>
                        
                        <div className="mt-2.5 p-2 bg-[#FAF9F5] rounded-xl border border-[#E8E4D5] flex items-center justify-between">
                          <span className="text-[10px] text-[#57685F] font-semibold">
                            {p.pickupScheduledTime
                              ? `Pickup: ${new Date(p.pickupScheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
                              : 'Pickup time not set yet'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleViewPickupDetails(p)}
                            className="px-2.5 py-1 bg-[#E8F6EF] text-[#176B45] hover:bg-[#d5eedf] font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Key className="w-3 h-3" /> Pickup Details
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-amber-100 text-amber-900 font-bold py-2.5 rounded-xl text-xs text-center">
                        Awaiting restaurant handover confirmation
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {collectedFood.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#899C92] bg-white rounded-3xl border border-[#E8E4D5] p-8">
              <PackageCheck className="w-10 h-10 text-[#899C92]/60 mx-auto mb-2" />
              <p className="font-bold text-sm text-[#16201A] mb-1">No collected surplus food yet.</p>
              <p className="text-xs text-[#57685F] max-w-md mx-auto">
                Once the restaurant confirms a handover, the collected food will appear here for community allocation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectedFood.map(item => {
                const remaining = item.remainingQuantity ?? item.quantity;
                const isFullyAllocated = remaining <= 0;
                return (
                  <TiltCard key={item.id} maxTilt={4} depthZ={6}>
                    <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col justify-between h-full gap-3 text-xs">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-[#176B45] uppercase">{item.foodCategory || 'Surplus Meal'}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFullyAllocated 
                              ? 'bg-gray-100 text-gray-600' 
                              : (item.status === 'Picked_Up' || (item.status as any) === 'Collected')
                                ? 'bg-[#E8F6EF] text-[#176B45]' 
                                : 'bg-blue-50 text-blue-700'
                          }`}>
                            {isFullyAllocated ? 'Fully Allocated' : (item.status === 'Picked_Up' || (item.status as any) === 'Collected') ? 'Collected / Ready' : 'Partially Allocated'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-[#16201A] mt-1.5">{item.foodName}</h4>
                        <p className="text-xs text-[#57685F] mt-0.5">
                          Donor: <span className="font-bold text-[#16201A]">{item.donorName}</span> ({item.donorRole === 'Restaurant' ? 'Restaurant' : 'Donor'})
                        </p>
                        
                        <div className="mt-3 p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E4D5] flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#57685F]">Total Quantity:</span>
                            <span className="font-bold text-[#16201A]">{item.quantity} {item.unit}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[#57685F]">Remaining Allocatable:</span>
                            <span className={`font-bold font-mono ${remaining > 0 ? 'text-[#176B45]' : 'text-gray-400'}`}>
                              {remaining} {item.unit}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1.5 border-t border-[#E8E4D5]/60 text-[#899C92]">
                            <span>Collection Date:</span>
                            <span>{new Date(item.updatedAt || item.pickupScheduledTime || item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#899C92]">
                            <span>Collection Status:</span>
                            <span className="font-medium text-[#16201A]">{item.status}</span>
                          </div>
                        </div>
                      </div>

                      {remaining > 0 ? (
                        <button
                          onClick={() => {
                            setAllocDonationId(item.id);
                            setAllocQty(String(Math.min(1, remaining)));
                            setActiveTab('allocate');
                          }}
                          className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Utensils className="w-3.5 h-3.5" /> Allocate to Beneficiary
                        </button>
                      ) : (
                        <div className="w-full py-2 text-center text-[11px] font-bold text-[#899C92] bg-gray-50 rounded-xl border border-gray-200">
                          All Portions Allocated
                        </div>
                      )}
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSISTANCE APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="flex flex-col gap-3">
          {applications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#899C92] bg-white rounded-3xl border border-[#E8E4D5]">
              No active assistance applications in {selectedCity}.
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#16201A] text-sm">{app.name}</span>
                    <span className="text-[10px] text-[#65776D] font-mono">CNIC: {app.cnic}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      app.status === 'Approved' ? 'bg-[#E8F6EF] text-[#176B45]' :
                      app.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-[#57685F] mt-1">
                    Family: <b>{app.householdSize} people</b> • Urgency: <b>{app.urgency}</b> • Location: {app.area}, {app.city}
                  </p>
                </div>
                <div className="flex gap-2">
                  {app.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleApproveApp(app.id)}
                        className="px-3.5 py-1.5 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectApp(app.id)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: OFFLINE VERIFIED REGISTRY */}
      {activeTab === 'needy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs h-fit text-xs">
            <h4 className="font-extrabold text-sm text-[#16201A] mb-1 font-display">Add Offline Community Beneficiary</h4>
            <p className="text-[11px] text-[#57685F] mb-3">Register a community member without a smartphone for meal allocation.</p>

            {needyError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-3 font-semibold">
                ⚠️ {needyError}
              </div>
            )}

            {needySuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs mb-3 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {needySuccess}
              </div>
            )}

            <form onSubmit={handleAddNeedy} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={60}
                  placeholder="e.g. Ghulam Rasool"
                  value={needyName}
                  onChange={e => setNeedyName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">CNIC Number * (13 digits)</label>
                <input
                  type="text"
                  required
                  placeholder="35201-1234567-1"
                  value={needyCnic}
                  onChange={e => setNeedyCnic(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-mono text-[#16201A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="03001234567 (Optional)"
                  value={needyPhone}
                  onChange={e => setNeedyPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">City *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    placeholder="City"
                    value={needyCity}
                    onChange={e => setNeedyCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Model Town"
                    value={needyArea}
                    onChange={e => setNeedyArea(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Address * (min 5 chars)</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  placeholder="Street / House / Mohallah details"
                  value={needyAddress}
                  onChange={e => setNeedyAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Urgency</label>
                  <select
                    value={needyUrgency}
                    onChange={e => setNeedyUrgency(e.target.value as any)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Household Size</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={needySize}
                    onChange={e => setNeedySize(e.target.value)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingNeedy}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer mt-1 disabled:opacity-60"
              >
                {addingNeedy ? 'Registering...' : 'Register Offline Beneficiary'}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 flex flex-col gap-2 text-xs">
            <h4 className="font-extrabold text-sm text-[#16201A] mb-1">Registered Community Beneficiaries ({needyPeople.length})</h4>
            {needyPeople.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#899C92] bg-white rounded-2xl border border-[#E8E4D5]">
                No offline beneficiaries registered yet.
              </div>
            ) : (
              needyPeople.map(p => (
                <div key={p.id} className="p-3.5 bg-white rounded-2xl border border-[#E8E4D5] flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-[#16201A]">{p.name}</h5>
                    <span className="text-[10px] text-[#899C92] block font-mono">
                      CNIC: {p.cnic || 'Masked'} • {p.city} • Household: {p.householdSize || 4} • Urgency: {p.urgency || 'Medium'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45]">
                    {p.eligibilityStatus || 'Verified'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ALLOCATE FOOD TO BENEFICIARY */}
      {activeTab === 'allocate' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs max-w-lg text-xs">
          <h4 className="font-extrabold text-sm text-[#16201A] mb-1 font-display">Allocate Food to Beneficiary</h4>
          <p className="text-[#57685F] mb-4">
            Allocate collected surplus meals to verified beneficiaries. Anti-duplicate rules and period distribution limits are strictly enforced.
          </p>

          {allocSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs mb-3 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {allocSuccess}
            </div>
          )}

          {allocError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-3 font-semibold">
              ⚠️ {allocError}
            </div>
          )}

          <form onSubmit={handleAllocate} className="flex flex-col gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-[#65776D] uppercase">Eligible Collected Food Listing *</label>
              <select 
                value={allocDonationId} 
                onChange={e => setAllocDonationId(e.target.value)} 
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
              >
                <option value="">-- Choose Collected Food --</option>
                {eligibleCollectedFood.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.foodName} ({p.donorName}) — {p.remainingQuantity ?? p.quantity} {p.unit} available
                  </option>
                ))}
              </select>
              {eligibleCollectedFood.length === 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  <span className="text-[10px] text-amber-700 block">
                    {collectedFoodError
                      ? `⚠️ Error fetching collected food: ${collectedFoodError}`
                      : 'No collected food with remaining portions available. Handover pickups must be verified first.'}
                  </span>
                  {pendingPickups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('collected')}
                      className="self-start text-[11px] font-bold text-[#176B45] hover:underline cursor-pointer"
                    >
                      → You have {pendingPickups.length} scheduled pickup(s). Click here to confirm collection.
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#65776D] uppercase">Eligible Beneficiary *</label>
              <select 
                value={allocBeneficiaryComposite} 
                onChange={e => setAllocBeneficiaryComposite(e.target.value)} 
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
              >
                <option value="">-- Choose Beneficiary --</option>
                {eligibleBeneficiaries.map(b => (
                  <option key={b.compositeKey} value={b.compositeKey}>
                    {b.name} ({b.city}) • {b.typeLabel} [{b.detail}]
                  </option>
                ))}
              </select>
              {eligibleBeneficiaries.length === 0 && (
                <span className="text-[10px] text-amber-700 mt-1 block">
                  No verified beneficiaries available. Add an offline community beneficiary or approve an application.
                </span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Meals to Allocate *</label>
                {selectedFoodMaxQty > 0 && (
                  <span className="text-[10px] text-[#57685F]">
                    Max available: <b>{selectedFoodMaxQty}</b>
                  </span>
                )}
              </div>
              <input 
                type="number" 
                min={1} 
                max={selectedFoodMaxQty > 0 ? selectedFoodMaxQty : undefined}
                value={allocQty} 
                onChange={e => setAllocQty(e.target.value)} 
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-bold text-[#16201A]" 
              />
            </div>

            <button 
              type="submit" 
              disabled={allocating || eligibleCollectedFood.length === 0 || eligibleBeneficiaries.length === 0}
              className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer mt-1 disabled:opacity-50"
            >
              {allocating ? 'Allocating Meals...' : 'Allocate Food & Enforce Rate-Limit'}
            </button>
          </form>
        </div>
      )}

      {/* PICKUP DETAILS DIALOG */}
      {pickupDetails && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-[#E8E4D5] text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center pb-3 border-b border-[#F4F1E6]">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8F6EF] flex items-center justify-center text-[#176B45] mb-2 shadow-xs">
                <Key className="w-6 h-6" />
              </div>
              <h4 className="font-black text-base text-[#16201A] font-display">Pickup Details</h4>
              <p className="text-[#57685F] mt-1">
                Collect the food at the scheduled time. The restaurant/donor will confirm the handover in their dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-2 py-4 text-[#57685F]">
              <div className="flex justify-between gap-3">
                <span>Food</span>
                <b className="text-[#16201A] text-right">{pickupDetails.foodName}</b>
              </div>
              <div className="flex justify-between gap-3">
                <span>Donor</span>
                <b className="text-[#16201A] text-right">{pickupDetails.donorName}</b>
              </div>
              {pickupDetails.pickupAddress && (
                <div className="flex justify-between gap-3">
                  <span>Address</span>
                  <span className="text-[#16201A] text-right truncate max-w-[220px]">{pickupDetails.pickupAddress}</span>
                </div>
              )}
              {pickupDetails.scheduledTime && (
                <div className="flex justify-between gap-3">
                  <span>Scheduled</span>
                  <b className="text-[#16201A] text-right">
                    {isNaN(new Date(pickupDetails.scheduledTime).getTime())
                      ? pickupDetails.scheduledTime
                      : new Date(pickupDetails.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </b>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickupDetails(null)}
              className="w-full py-2.5 rounded-xl bg-[#176B45] hover:bg-[#125235] text-white font-bold transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// DONOR DASHBOARD (STRICT: DONATIONS DIRECTED ONLY TO VERIFIED NGOS)
// ----------------------------------------------------------------------
export const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'donate' | 'history' | 'food'>('donate');
  const [approvedNgos, setApprovedNgos] = useState<any[]>([]);
  const [donations, setDonations] = useState<FinancialDonation[]>([]);
  const [myFoodListings, setMyFoodListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(false);

  // Financial donation form state
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [selectedCampId, setSelectedCampId] = useState('');
  const [donationAmount, setDonationAmount] = useState('2500');
  const [paymentMethod, setPaymentMethod] = useState('Simulated_EasyPaisa');
  const [donorNotes, setDonorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<FinancialDonation | null>(null);

  // Food Donation modal state
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Home Cooked Meals');
  const [quantity, setQuantity] = useState('25');
  const [unit, setUnit] = useState<'meals' | 'kg' | 'packs'>('meals');
  const [description, setDescription] = useState('');
  const [storageCondition, setStorageCondition] = useState<'Hot/Insulated' | 'Refrigerated' | 'Ambient'>('Hot/Insulated');
  const [pickupDeadline, setPickupDeadline] = useState(() => {
    const d = new Date(Date.now() + 6 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [formCity, setFormCity] = useState(user?.city || 'Lahore');
  const [formArea, setFormArea] = useState(user?.area || 'Central');
  const [pickupAddress, setPickupAddress] = useState(user?.address || 'Residential Area');
  const [submittingFood, setSubmittingFood] = useState(false);

  // Confirm handover dialog state
  const [confirmListing, setConfirmListing] = useState<FoodListing | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadDonorData = async () => {
    setLoading(true);
    try {
      const [ngosRes, histRes, listingsRes] = await Promise.all([
        api.campaigns.getApprovedNgos().catch(() => ({ ngos: [] })),
        api.donations.getMyHistory().catch(() => ({ donations: [] })),
        api.listings.getMyListings().catch(() => ({ listings: [] }))
      ]);
      const verifiedOnly = (ngosRes.ngos || []).filter((n: any) => n.verificationStatus === 'Verified');
      setApprovedNgos(verifiedOnly);
      setDonations(histRes.donations || []);
      setMyFoodListings(listingsRes.listings || []);
      if (verifiedOnly.length > 0 && !selectedNgoId) {
        setSelectedNgoId(verifiedOnly[0].id);
      }
    } catch (err) {
      console.warn('Load donor data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonorData();
  }, []);

  useEffect(() => {
    if (user?.city) setFormCity(user.city);
    if (user?.area) setFormArea(user.area);
    if (user?.address) setPickupAddress(user.address);
  }, [user]);

  const selectedNgo = approvedNgos.find(n => n.id === selectedNgoId);
  const availableCampaigns = selectedNgo?.campaigns || [];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNgoId || !donationAmount) return;

    const numAmount = Number(donationAmount);
    if (isNaN(numAmount) || numAmount < 100) {
      alert('Minimum donation is PKR 100');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.donations.donateToNgo({
        ngoId: selectedNgoId,
        campaignId: selectedCampId || undefined,
        amountPkr: numAmount,
        paymentMethod,
        notes: donorNotes
      });
      alert(res.message);
      setActiveReceipt(res.donation);
      setDonorNotes('');
      loadDonorData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFoodDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Quantity must be a positive number');
      return;
    }
    if (!pickupAddress || pickupAddress.trim().length < 5) {
      alert('Pickup address must be at least 5 characters');
      return;
    }

    setSubmittingFood(true);
    try {
      const res = await api.listings.create({
        foodName,
        foodCategory,
        quantity: qtyNum,
        unit,
        description,
        preparationTime: 'Prepared fresh today',
        availableTime: 'Immediately available',
        pickupDeadline: new Date(pickupDeadline).toISOString(),
        storageCondition,
        city: formCity,
        area: formArea,
        pickupAddress: pickupAddress.trim()
      });
      alert(`Food donation listed successfully! Matched with ${res.matchedNgos?.length || 0} local verified NGOs.`);
      setShowFoodModal(false);
      setFoodName('');
      setDescription('');
      loadDonorData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit food donation');
    } finally {
      setSubmittingFood(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!confirmListing) return;
    setConfirming(true);
    try {
      await api.listings.confirmHandover(confirmListing.id);
      alert('Handover confirmed! Food marked as Collected.');
      setConfirmListing(null);
      loadDonorData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm handover');
    } finally {
      setConfirming(false);
    }
  };

  const totalDonated = donations
    .filter(d => d.status === 'Successful')
    .reduce((sum, d) => sum + d.amountPkr, 0);

  const totalMeals = donations
    .filter(d => d.status === 'Successful')
    .reduce((sum, d) => sum + (d.mealsFunded || Math.floor(d.amountPkr / 100)), 0);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Banner & Impact Summary */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E4D5] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">Donor Giving &amp; Impact Hub</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45] uppercase">
              Verified Giving
            </span>
          </div>
          <p className="text-xs text-[#57685F] mt-1 max-w-xl">
            Sponsor hot meals through verified NGO campaigns, or directly post surplus cooked food donations for verified NGO collection and community distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFoodModal(true)}
            className="px-4 py-3 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-2xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Post Food Donation
          </button>

          <div className="flex gap-2 text-center">
            <div className="p-3 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5] min-w-[110px]">
              <span className="text-[9px] font-bold text-[#899C92] uppercase block">Contributed</span>
              <span className="text-sm font-black text-[#176B45]">PKR {totalDonated.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-[#E8F6EF] rounded-2xl border border-[#7ED4A5]/40 min-w-[110px]">
              <span className="text-[9px] font-bold text-[#176B45] uppercase block">Meals Sponsored</span>
              <span className="text-sm font-black text-[#2FA66A]">{totalMeals.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8E4D5] gap-4 text-xs font-bold text-[#65776D]">
        <button
          onClick={() => setActiveTab('donate')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'donate' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Donate to Verified NGOs ({approvedNgos.length})
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'food' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          My Food Donations ({myFoodListings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'history' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Financial Records ({donations.length})
        </button>
      </div>

      {/* TAB 1: Donate to NGOs */}
      {activeTab === 'donate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: NGO & Campaign Selection Form */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <h4 className="font-extrabold text-sm text-[#16201A] font-display">Choose Verified NGO or Relief Campaign</h4>

            {approvedNgos.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E8E4D5] text-center text-[#899C92] text-xs">
                No verified NGOs yet. An admin must verify an NGO first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedNgos.map(ngo => (
                  <TiltCard key={ngo.id} maxTilt={4} depthZ={6}>
                    <div
                      onClick={() => {
                        setSelectedNgoId(ngo.id);
                        setSelectedCampId('');
                      }}
                      className={`p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between h-full gap-3 ${
                        selectedNgoId === ngo.id 
                          ? 'border-[#176B45] bg-[#E8F6EF]/30 shadow-md ring-2 ring-[#176B45]/20' 
                          : 'border-[#E8E4D5] bg-white hover:border-[#176B45]/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45] border border-[#7ED4A5]/40 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#176B45]" /> Verified NGO
                          </span>
                          <span className="text-[10px] text-[#899C92] font-mono">Reg: {ngo.registrationNumber || 'N/A'}</span>
                        </div>
                        <h5 className="font-black text-base text-[#16201A]">{ngo.organizationName || ngo.name}</h5>
                        <p className="text-xs text-[#57685F] mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#899C92]" /> {ngo.city}, {ngo.province || 'Pakistan'}
                        </p>
                        <p className="text-xs text-[#57685F] mt-2 line-clamp-2 italic">
                          "{ngo.mission}"
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#F4F1E6] flex items-center justify-between text-xs font-bold">
                        <span className="text-[#176B45]">{ngo.activeCampaignsCount} Active Campaign(s)</span>
                        <span className={`text-[11px] ${selectedNgoId === ngo.id ? 'text-[#176B45] font-black' : 'text-[#899C92]'}`}>
                          {selectedNgoId === ngo.id ? 'Selected ✓' : 'Click to Select'}
                        </span>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}

            {/* Campaign Selection if NGO chosen */}
            {selectedNgo && availableCampaigns.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-2">
                  Target a Specific Campaign for {selectedNgo.organizationName}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedCampId('')}
                    className={`p-3.5 rounded-2xl border cursor-pointer text-xs transition-colors ${
                      !selectedCampId ? 'border-[#176B45] bg-[#E8F6EF]/40 font-bold' : 'border-[#E8E4D5] hover:border-[#CFCEBE]'
                    }`}
                  >
                    <span className="block text-[#16201A]">General Food Relief Fund</span>
                    <span className="text-[10px] text-[#57685F] font-normal">Direct meals distributed based on community urgency</span>
                  </div>
                  {availableCampaigns.map((camp: any) => (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampId(camp.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer text-xs transition-colors ${
                        selectedCampId === camp.id ? 'border-[#176B45] bg-[#E8F6EF]/40 font-bold' : 'border-[#E8E4D5] hover:border-[#CFCEBE]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#16201A] font-extrabold truncate">{camp.title}</span>
                        <span className="text-[10px] text-[#176B45] font-mono">PKR {camp.raisedAmountPkr?.toLocaleString() || 0} raised</span>
                      </div>
                      <div className="w-full bg-[#FAF9F5] h-1.5 rounded-full overflow-hidden border border-[#E8E4D5]">
                        <div 
                          className="bg-[#176B45] h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((camp.raisedAmountPkr || 0) / camp.targetAmountPkr) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#899C92] block mt-1">Goal: PKR {camp.targetAmountPkr.toLocaleString()} • {camp.location}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout & Sandbox Gateway Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col justify-between gap-4 h-fit">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-extrabold text-sm text-[#16201A] font-display">Make Donation</h4>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  Demo Sandbox Mode
                </span>
              </div>
              <p className="text-xs text-[#57685F] mb-4">
                Selected Recipient: <b className="text-[#176B45]">{selectedNgo?.organizationName || 'Select an NGO'}</b>
              </p>

              <form onSubmit={handleDonate} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Donation Amount (PKR)</label>
                  <div className="grid grid-cols-3 gap-1.5 my-1.5">
                    {['1000', '2500', '5000', '10000', '25000'].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setDonationAmount(val)}
                        className={`py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          donationAmount === val 
                            ? 'bg-[#176B45] text-white shadow-xs' 
                            : 'bg-[#FAF9F5] hover:bg-[#F2EFE6] text-[#2C3A32] border border-[#E8E4D5]'
                        }`}
                      >
                        Rs {Number(val).toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    required
                    min={100}
                    value={donationAmount}
                    onChange={e => setDonationAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-black font-mono text-base text-[#16201A]"
                  />
                  <span className="text-[11px] text-[#2FA66A] font-bold block mt-1">
                    🍲 Sponsors approx. {Math.floor(Number(donationAmount || 0) / 100)} complete meals for vulnerable families
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-semibold text-[#16201A]"
                  >
                    <option value="Simulated_EasyPaisa">📱 EasyPaisa (Pakistan Sandbox)</option>
                    <option value="Simulated_JazzCash">📱 JazzCash (Pakistan Sandbox)</option>
                    <option value="Simulated_Sandbox_Card">💳 Debit / Credit Card (Simulated)</option>
                    <option value="Bank_Transfer">🏦 1Link Bank Transfer (Simulated)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Donor Message / Zakat Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. In memory of family, or Zakat Ramadan"
                    value={donorNotes}
                    onChange={e => setDonorNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>

                {/* Explicit Transparency Notice */}
                <div className="p-3 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5] text-[11px] text-[#57685F]">
                  ℹ️ <b>Sandbox Demonstration:</b> PlateShare does not process unverified credit transactions. Simulated payment receipts are generated with traceable reference keys for demonstration.
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedNgoId}
                  className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-black py-3.5 rounded-xl text-xs transition-colors shadow-xs mt-1 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Heart className="w-4 h-4 fill-white text-white" />
                  {submitting ? 'Confirming Transaction...' : `Confirm Donation of PKR ${Number(donationAmount || 0).toLocaleString()}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Donation Records & Receipts */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-[#E8E4D5] overflow-hidden shadow-xs">
          {donations.length === 0 ? (
            <div className="py-12 text-center text-[#899C92] text-xs">
              No financial donation records found yet.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FAF9F5] text-[10px] font-bold text-[#65776D] uppercase border-b border-[#E8E4D5]">
                  <tr>
                    <th className="p-3">Receipt #</th>
                    <th className="p-3">Verified NGO</th>
                    <th className="p-3">Campaign</th>
                    <th className="p-3">Amount (PKR)</th>
                    <th className="p-3">Meals</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1E6]">
                  {donations.map(don => (
                    <tr key={don.id}>
                      <td className="p-3 font-mono font-bold text-[#2C3A32]">{don.receiptNumber}</td>
                      <td className="p-3 font-bold text-[#16201A]">{don.ngoName}</td>
                      <td className="p-3 text-[#57685F]">{don.campaignTitle || 'General Food Relief'}</td>
                      <td className="p-3 font-mono font-black text-[#16201A]">PKR {don.amountPkr.toLocaleString()}</td>
                      <td className="p-3 font-bold text-[#2FA66A]">{don.mealsFunded} meals</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          don.status === 'Successful' ? 'bg-[#E8F6EF] text-[#176B45]' :
                          don.status === 'Pending' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {don.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#899C92] font-mono text-[11px]">{new Date(don.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setActiveReceipt(don)}
                          className="px-2.5 py-1 rounded-lg bg-[#E8F6EF] text-[#176B45] hover:bg-[#d8f2e3] font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-[#E8E4D5] text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center pb-4 border-b border-[#F4F1E6]">
              <span className="text-2xl">💚</span>
              <h4 className="font-black text-base text-[#16201A] mt-1 font-display">PlateShare Official Receipt</h4>
              <span className="text-[10px] font-mono text-[#899C92]">Receipt #{activeReceipt.receiptNumber}</span>
            </div>

            <div className="py-4 flex flex-col gap-2.5 text-[#57685F]">
              <div className="flex justify-between">
                <span>Beneficiary NGO:</span>
                <b className="text-[#16201A] text-right">{activeReceipt.ngoName}</b>
              </div>
              <div className="flex justify-between">
                <span>Relief Campaign:</span>
                <b className="text-[#16201A] text-right">{activeReceipt.campaignTitle || 'General Food Relief'}</b>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <b className="font-mono text-base font-black text-[#176B45]">PKR {activeReceipt.amountPkr.toLocaleString()}</b>
              </div>
              <div className="flex justify-between">
                <span>Meals Sponsored:</span>
                <b className="text-[#2FA66A]">{activeReceipt.mealsFunded} Complete Meals</b>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="text-[11px] font-mono">{activeReceipt.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span>Reference:</span>
                <span className="text-[11px] font-mono">{activeReceipt.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span>Date &amp; Time:</span>
                <span className="text-[11px] font-mono">{new Date(activeReceipt.createdAt).toLocaleString()}</span>
              </div>
              {activeReceipt.notes && (
                <div className="p-2 bg-[#FAF9F5] rounded-xl border border-[#E8E4D5] text-[10px] text-[#57685F]">
                  <b>Notes:</b> {activeReceipt.notes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#F4F1E6]">
              <button
                onClick={() => setActiveReceipt(null)}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: My Food Donations */}
      {activeTab === 'food' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E8E4D5] shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#16201A] font-display">My Food Donations</h3>
              <span className="text-xs text-[#57685F]">Manage surplus food posted for local verified NGO collection and verify driver handovers</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFoodModal(true)}
                className="px-3.5 py-2 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Post Food Donation
              </button>
              <button onClick={loadDonorData} className="text-xs font-bold text-[#176B45] flex items-center gap-1 hover:underline cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#899C92]">Loading your food donations...</div>
          ) : myFoodListings.length === 0 ? (
            <div className="py-12 text-center text-[#899C92] text-xs bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E8E4D5] p-6">
              <p className="font-bold text-sm text-[#16201A] mb-1">No food donations posted yet.</p>
              <p className="text-xs text-[#57685F] max-w-sm mx-auto mb-4">
                Have surplus food, prepared meals, or bulk groceries? Post a food donation to match with verified local NGOs.
              </p>
              <button
                onClick={() => setShowFoodModal(true)}
                className="px-4 py-2 bg-[#176B45] hover:bg-[#125235] text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Post Your First Food Donation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myFoodListings.map(item => (
                <TiltCard key={item.id} maxTilt={4} depthZ={6}>
                  <div className="p-4.5 rounded-2xl border border-[#E8E4D5] hover:border-[#176B45]/40 bg-white transition-all flex flex-col justify-between h-full gap-3 shadow-xs">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#176B45] uppercase">{item.foodCategory}</span>
                          <h4 className="font-extrabold text-sm text-[#16201A] mt-0.5">{item.foodName}</h4>
                          <p className="text-xs text-[#57685F] mt-1">{item.quantity} {item.unit} • {item.area}, {item.city}</p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                          item.status === 'Available' ? 'bg-[#E8F6EF] text-[#176B45]' :
                          item.status === 'Accepted' ? 'bg-blue-50 text-blue-800' :
                          item.status === 'Pickup_Scheduled' ? 'bg-amber-50 text-amber-800' :
                          (item.status === 'Picked_Up' || (item.status as any) === 'Collected') ? 'bg-[#E8F6EF] text-[#176B45]' :
                          'bg-[#FAF9F5] text-[#57685F]'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {item.claimedByNgoName && (
                        <div className="mt-3 p-2.5 bg-[#FAF9F5] rounded-xl text-xs text-[#2C3A32] border border-[#F4F1E6]">
                          <b>Claimed by:</b> {item.claimedByNgoName}
                          {item.pickupScheduledTime && (
                            <div className="text-[11px] text-[#176B45] font-semibold mt-0.5">
                              Pickup Time: {isNaN(new Date(item.pickupScheduledTime).getTime()) 
                                ? item.pickupScheduledTime 
                                : new Date(item.pickupScheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Confirm Handover Button */}
                    {item.status === 'Pickup_Scheduled' && (
                      <button
                        onClick={() => setConfirmListing(item)}
                        className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Confirm NGO Pickup Handover
                      </button>
                    )}
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE FOOD DONATION MODAL */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-[#E8E4D5] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F1E6]">
              <div>
                <h3 className="font-extrabold text-base text-[#16201A] font-display">Post Food Donation</h3>
                <p className="text-xs text-[#57685F]">Notify local verified NGOs for immediate collection and redistribution.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowFoodModal(false)}
                className="text-[#899C92] hover:text-[#16201A] font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFoodDonation} className="flex flex-col gap-3.5 mt-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Food Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Cooked Chicken Biryani Trays"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Category *</label>
                  <select
                    value={foodCategory}
                    onChange={e => setFoodCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Home Cooked Meals">Home Cooked Meals</option>
                    <option value="Biryani & Rice">Biryani &amp; Rice</option>
                    <option value="Curry & Gravy">Curry &amp; Gravy</option>
                    <option value="Bakery & Breads">Bakery &amp; Breads</option>
                    <option value="Dry Groceries & Ration">Dry Groceries &amp; Ration</option>
                    <option value="Dairy & Beverages">Dairy &amp; Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Storage Condition *</label>
                  <select
                    value={storageCondition}
                    onChange={e => setStorageCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Hot/Insulated">Hot / Freshly Prepared</option>
                    <option value="Refrigerated">Refrigerated</option>
                    <option value="Ambient">Ambient / Room Temp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Unit *</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="meals">meals / portions</option>
                    <option value="kg">kg</option>
                    <option value="packs">packs / boxes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Pickup Deadline / Expiry *</label>
                <input
                  type="datetime-local"
                  required
                  value={pickupDeadline}
                  onChange={e => setPickupDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">City *</label>
                  <select
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {ALL_PAKISTAN_CITIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Area / Sector *</label>
                  <input
                    type="text"
                    required
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Collection Pickup Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Complete street address for NGO driver pickup"
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Special Notes / Dietary (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian, allergen-free, freshly cooked at home"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFood}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl text-xs transition shadow-xs mt-2 cursor-pointer disabled:opacity-50"
              >
                {submittingFood ? 'Publishing Food Donation...' : 'Publish Food Donation & Notify Local NGOs'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM HANDOVER DIALOG */}
      {confirmListing && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-[#E8E4D5] animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-sm text-[#16201A] mb-1 font-display">Confirm Food Handover</h4>
            <p className="text-xs text-[#57685F] mb-4">
              Confirm that <b>{confirmListing.claimedByNgoName || 'the claiming NGO'}</b> has collected <b>{confirmListing.foodName}</b> from you. This marks the donation as Collected.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={confirming}
                className="w-full bg-[#176B45] hover:bg-[#125235] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                {confirming ? 'Confirming...' : 'Confirm Handover (Mark Collected)'}
              </button>
              <button type="button" onClick={() => setConfirmListing(null)} className="text-xs text-[#899C92] hover:text-[#16201A] font-bold cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ----------------------------------------------------------------------
// BENEFICIARY DASHBOARD (APPLICATION & ALLOCATIONS HUB)
// ----------------------------------------------------------------------
export const BeneficiaryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'packages'>('applications');
  const [allocations, setAllocations] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<BeneficiaryApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // Application form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [applicantCnic, setApplicantCnic] = useState(user?.cnic || '');
  const [applicantPhone, setApplicantPhone] = useState(user?.phone || '');
  const [householdSize, setHouseholdSize] = useState('5');
  const [incomeMonthly, setIncomeMonthly] = useState('20000');
  const [urgency, setUrgency] = useState<'Normal' | 'High' | 'Critical_Emergency'>('High');
  const [province, setProvince] = useState(user?.province || 'Punjab');
  const [city, setCity] = useState(user?.city || 'Lahore');
  const [area, setArea] = useState(user?.area || 'Gulberg');
  const [address, setAddress] = useState(user?.address || '');
  const [submittingApp, setSubmittingApp] = useState(false);

  // Appeal state
  const [appealAppId, setAppealAppId] = useState<string | null>(null);
  const [appealNotes, setAppealNotes] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const loadBeneficiaryData = async () => {
    setLoading(true);
    try {
      const [allocRes, appsRes] = await Promise.all([
        api.allocations.getMyAllocations(),
        api.applications.getMy()
      ]);
      setAllocations(allocRes.allocations || []);
      setMyApplications(appsRes.applications || []);
    } catch (err) {
      console.warn('Load beneficiary data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaryData();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantCnic) {
      alert('Name and CNIC are required');
      return;
    }
    setSubmittingApp(true);
    try {
      await api.applications.submit({
        name: applicantName,
        cnic: applicantCnic,
        phone: applicantPhone,
        householdSize: Number(householdSize) || 4,
        incomeMonthlyPkr: Number(incomeMonthly) || 0,
        urgency,
        province,
        city,
        area,
        address
      });
      alert('Application submitted! Your case status is now Pending Review by an authorized NGO.');
      setShowApplyModal(false);
      loadBeneficiaryData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealAppId || !appealNotes.trim()) return;
    setSubmittingAppeal(true);
    try {
      await api.applications.appeal(appealAppId, { appealNotes });
      alert('Reassessment appeal submitted for NGO re-evaluation!');
      setAppealAppId(null);
      setAppealNotes('');
      loadBeneficiaryData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirm that you have received this food package?')) return;
    try {
      await api.allocations.confirm({ allocationId: id });
      alert('Food receipt confirmed!');
      loadBeneficiaryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-6 rounded-3xl border border-[#E8E4D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">{user?.name}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
              user?.verificationStatus === 'Verified' ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {user?.verificationStatus || 'Pending'}
            </span>
          </div>
          <p className="text-xs text-[#57685F] mt-1">
            📍 {user?.city}, {user?.province || 'Pakistan'} • CNIC Protected: <span className="font-mono">{user?.cnic ? `${user.cnic.slice(0, 5)}...` : 'Registered'}</span>
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[#176B45] hover:bg-[#125235] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Apply for Food Assistance
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8E4D5] gap-4 text-xs font-bold text-[#65776D]">
        <button
          onClick={() => setActiveTab('applications')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'applications' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          My Applications ({myApplications.length})
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'packages' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Active Food Packages ({allocations.length})
        </button>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="flex flex-col gap-3">
          {myApplications.length === 0 ? (
            <div className="py-12 text-center text-[#899C92] text-xs bg-white rounded-3xl border border-dashed border-[#E8E4D5]">
              No food assistance applications yet. Click "Apply for Food Assistance" to request relief for your household.
            </div>
          ) : (
            myApplications.map(app => (
              <div key={app.id} className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col justify-between gap-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#899C92] uppercase">Application ID: {app.id.slice(0, 10)}</span>
                    <h4 className="font-extrabold text-sm text-[#16201A] mt-0.5">Household Relief Request ({app.householdSize} members)</h4>
                    <p className="text-[#57685F] mt-1">Location: {app.area}, {app.city} • Urgency: <b>{app.urgency}</b></p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                    app.status === 'Approved' ? 'bg-[#E8F6EF] text-[#176B45]' :
                    app.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-800'
                  }`}>
                    {app.status}
                  </span>
                </div>

                <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#E8E4D5] flex flex-col gap-1 text-[11px] text-[#57685F]">
                  <div><b>CNIC:</b> <code className="font-mono text-[#16201A]">{app.cnic}</code> (Securely Protected)</div>
                  {app.reviewedByNgoName && <div><b>Reviewed by:</b> {app.reviewedByNgoName}</div>}
                  {app.rejectionReason && (
                    <div className="text-rose-600 font-semibold mt-1">
                      ⚠️ <b>Reason for Rejection:</b> {app.rejectionReason}
                    </div>
                  )}
                  {app.appealNotes && (
                    <div className="text-[#176B45] mt-1">
                      <b>Your Appeal Statement:</b> "{app.appealNotes}"
                    </div>
                  )}
                </div>

                {app.status === 'Rejected' && !app.appealNotes && (
                  <div className="pt-2 border-t border-[#F4F1E6] flex justify-end">
                    <button
                      onClick={() => {
                        setAppealAppId(app.id);
                        setAppealNotes('');
                      }}
                      className="px-4 py-2 bg-[#E8F6EF] hover:bg-[#d8f2e3] text-[#176B45] font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Appeal Decision / Request Reassessment
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="flex flex-col gap-3">
          {allocations.length === 0 ? (
            <div className="py-12 text-center text-[#899C92] text-xs bg-white rounded-3xl border border-dashed border-[#E8E4D5]">
              No active food packages currently. When your local approved NGO prepares your package, it will appear here for you to collect and confirm.
            </div>
          ) : (
            allocations.map(a => (
              <div key={a.id} className="p-5 bg-white rounded-3xl border border-[#E8E4D5] shadow-xs flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#176B45] uppercase">{a.status}</span>
                  <h4 className="font-extrabold text-sm text-[#16201A]">{a.foodName}</h4>
                  <p className="text-[#57685F]">{a.quantity} meals prepared by {a.ngoName}</p>
                  <p className="mt-2 text-[11px] text-[#176B45] font-semibold">Collect from {a.ngoName}, then tap Confirm Receipt.</p>
                </div>
                {a.status === 'Active' && (
                  <button onClick={() => handleConfirm(a.id)} className="bg-[#176B45] hover:bg-[#125235] text-white font-bold px-4 py-2.5 rounded-xl transition cursor-pointer">
                    Confirm Receipt
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* APPLY FOR ASSISTANCE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-[#E8E4D5] max-h-[90vh] overflow-y-auto text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#16201A] font-display">Apply for Food Assistance</h3>
                <p className="text-[#57685F]">Every application starts as Pending Review and is assessed by a verified NGO or Admin.</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-[#899C92] hover:text-[#16201A] font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleApply} className="flex flex-col gap-3.5 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={e => setApplicantName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">CNIC (Protected)</label>
                  <input
                    type="text"
                    required
                    placeholder="35202-xxxxxxx-x"
                    value={applicantCnic}
                    onChange={e => setApplicantCnic(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-mono text-[#16201A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Household Size</label>
                  <input
                    type="number"
                    min={1}
                    value={householdSize}
                    onChange={e => setHouseholdSize(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Monthly Income (PKR)</label>
                  <input
                    type="number"
                    value={incomeMonthly}
                    onChange={e => setIncomeMonthly(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Urgency</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High Urgency</option>
                    <option value="Critical_Emergency">Critical Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">City</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {ALL_PAKISTAN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Area / Sector</label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Residential Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street / House details"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingApp}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl text-xs transition shadow-xs mt-2 cursor-pointer disabled:opacity-50"
              >
                {submittingApp ? 'Submitting Application...' : 'Submit Application for NGO Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPEAL MODAL */}
      {appealAppId && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-[#E8E4D5] text-xs animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-base text-[#16201A] mb-1 font-display">Appeal Rejection Decision</h4>
            <p className="text-[#57685F] mb-4">Provide any additional context regarding your family's situation for reassessment.</p>
            <form onSubmit={handleAppeal} className="flex flex-col gap-3">
              <textarea
                required
                rows={4}
                value={appealNotes}
                onChange={e => setAppealNotes(e.target.value)}
                placeholder="Explain any change in circumstances, medical urgency, or income loss..."
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl resize-none text-[#16201A]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAppealAppId(null)}
                  className="flex-1 bg-[#FAF9F5] hover:bg-[#F2EFE6] py-2.5 rounded-xl font-bold text-[#57685F] border border-[#E8E4D5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="flex-1 bg-[#176B45] hover:bg-[#125235] py-2.5 rounded-xl font-bold text-white shadow-xs cursor-pointer"
                >
                  {submittingAppeal ? 'Submitting Appeal...' : 'Submit Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// ----------------------------------------------------------------------
// ADMIN CONSOLE (VERIFICATIONS, CAMPAIGNS & CIVIC OVERSIGHT)
// ----------------------------------------------------------------------
export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'campaigns' | 'donations' | 'complaints'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<NgoCampaign[]>([]);
  const [financialDonations, setFinancialDonations] = useState<FinancialDonation[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filterCity, setFilterCity] = useState('All Cities');
  const [periodMode, setPeriodMode] = useState<'Daily' | 'Weekly' | 'Custom'>('Daily');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  const loadAdmin = async () => {
    try {
      const [statsRes, usersRes, campsRes, donRes, compRes] = await Promise.all([
        api.admin.getStats({ city: filterCity !== 'All Cities' ? filterCity : undefined }),
        api.auth.getAllUsers({ city: filterCity !== 'All Cities' ? filterCity : undefined, limit: 500 }),
        api.campaigns.getAll({ city: filterCity !== 'All Cities' ? filterCity : undefined }),
        api.donations.getMyHistory(),
        api.admin.getComplaints(filterCity !== 'All Cities' ? filterCity : undefined)
      ]);
      setStats(statsRes.stats);
      setPeriodMode(statsRes.settings?.distributionPeriodMode || 'Daily');
      setUsers(usersRes.users || []);
      setTotalUsersCount(usersRes.total ?? (usersRes.users?.length || 0));
      setAllCampaigns(campsRes.campaigns || []);
      setFinancialDonations(donRes.donations || []);
      setComplaints(compRes.complaints || []);
    } catch (err) {
      console.warn('Load admin error:', err);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [filterCity]);

  // Refetch when the Verifications tab is opened
  useEffect(() => {
    if (activeTab === 'verifications') {
      loadAdmin();
    }
  }, [activeTab]);

  // Refetch every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadAdmin();
    }, 30000);
    return () => clearInterval(timer);
  }, [filterCity]);

  const filteredUsers = users.filter(u => {
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    const q = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      (u.city && u.city.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const handleVerify = async (userId: string, role: string, _currentStatus?: string) => {
    const nextStatus = 'Verified';
    try {
      if (role === 'Restaurant') await api.auth.verifyRestaurant(userId, nextStatus);
      if (role === 'NGO') await api.auth.verifyNgo(userId, nextStatus);
      if (role === 'Beneficiary') await api.auth.verifyBeneficiary(userId, nextStatus);
      loadAdmin();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCampaignStatus = async (campId: string, status: 'Active' | 'Rejected' | 'Completed') => {
    try {
      await api.admin.updateCampaignStatus(campId, status);
      alert(`Campaign status updated to ${status}!`);
      loadAdmin();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    const reason = prompt('Enter suspension / fraud reason:');
    if (!reason) return;
    try {
      await api.admin.suspendUser(userId, reason);
      alert('User suspended successfully.');
      loadAdmin();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdatePeriod = async (mode: 'Daily' | 'Weekly' | 'Custom') => {
    try {
      await api.admin.updateSettings({ distributionPeriodMode: mode });
      setPeriodMode(mode);
      alert(`Platform distribution period rule set to ${mode}. Rate limiting updated.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* City Scope Filter */}
      <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">National Operations Console</h2>
          <span className="text-xs text-[#57685F]">Filter platform surveillance by Pakistani city</span>
        </div>
        <select
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
          className="px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-bold text-[#2C3A32]"
        >
          <option value="All Cities">🇵🇰 All Pakistan</option>
          {ALL_PAKISTAN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name} ({c.province})</option>)}
        </select>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex border-b border-[#E8E4D5] gap-4 text-xs font-bold text-[#65776D] overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'overview' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Overview &amp; Rules
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'verifications' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          User Accounts &amp; Verifications ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'campaigns' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Relief Campaigns Review ({allCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('donations')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'donations' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Financial Donations Audit
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === 'complaints' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
        >
          Complaints ({complaints.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & RULES */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-4 bg-white rounded-2xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold text-[#899C92] uppercase">Restaurants</span>
                <span className="text-xl font-black text-[#16201A] block mt-1 font-display">{stats.verifiedRestaurantsCount} / {stats.restaurantsCount}</span>
                <span className="text-[10px] text-[#899C92]">Surplus Food Only</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold text-[#899C92] uppercase">Verified NGOs</span>
                <span className="text-xl font-black text-[#176B45] block mt-1 font-display">{stats.verifiedNgosCount} / {stats.ngosCount}</span>
                <span className="text-[10px] text-[#899C92]">Donation Eligible</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold text-[#899C92] uppercase">Total Funds Raised</span>
                <span className="text-xl font-black text-[#2FA66A] block mt-1 font-display">PKR {stats.totalDonationsPkr?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-[#899C92]">Transparent &amp; Auditable</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E8E4D5] shadow-xs">
                <span className="text-[10px] font-bold text-[#899C92] uppercase">Beneficiaries</span>
                <span className="text-xl font-black text-[#16201A] block mt-1 font-display">{stats.totalBeneficiariesCount}</span>
                <span className="text-[10px] text-[#899C92]">Strict Rate-Limited</span>
              </div>
            </div>
          )}

          {/* Rule Configurator */}
          <div className="p-5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
            <div>
              <b className="text-[#16201A] text-sm">Platform Distribution Period Rule:</b>
              <p className="text-[#57685F] text-xs mt-0.5">Enforces rate limiting to ensure beneficiaries cannot receive food twice within an active window.</p>
            </div>
            <div className="flex gap-2">
              {(['Daily', 'Weekly', 'Custom'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => handleUpdatePeriod(m)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer ${
                    periodMode === m 
                      ? 'bg-[#176B45] text-white' 
                      : 'bg-white text-[#2C3A32] border border-[#E8E4D5] hover:bg-[#F2EFE6]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATIONS & USER ACCOUNTS */}
      {activeTab === 'verifications' && (
        <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-[#16201A] font-display">User Management &amp; Access Controls</h4>
              <p className="text-xs text-[#57685F] mt-0.5">
                Showing {filteredUsers.length} of {totalUsersCount}
              </p>
            </div>

            {/* Role Filter Dropdown and Search Box */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#899C92] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, city..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs text-[#16201A] placeholder:text-[#899C92] focus:outline-none focus:border-[#176B45]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-bold text-[#2C3A32]"
              >
                <option value="All">All Roles</option>
                <option value="Restaurant">Restaurant</option>
                <option value="NGO">NGO</option>
                <option value="Donor">Donor</option>
                <option value="Beneficiary">Beneficiary</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-[#899C92] text-xs bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E8E4D5]">
                No users found matching the selected filter criteria.
              </div>
            ) : (
              filteredUsers.map(u => {
                const isNew = !!u.createdAt && (Date.now() - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000);
                return (
                  <div key={u.id} className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5] flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#16201A]">{u.name}</span>
                        {isNew && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase tracking-wider">
                            New
                          </span>
                        )}
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                          u.role === 'Admin' ? 'bg-[#16201A] text-white' :
                          u.role === 'NGO' ? 'bg-[#E8F6EF] text-[#176B45]' :
                          u.role === 'Restaurant' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          u.verificationStatus === 'Verified' ? 'bg-[#E8F6EF] text-[#176B45]' :
                          u.verificationStatus === 'Suspended' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {u.verificationStatus}
                        </span>
                      </div>
                      <span className="text-[#899C92] block text-[11px] font-mono mt-0.5">
                        {u.email} • {u.city} • Reg: {u.registrationNumber || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(u.role === 'Restaurant' || u.role === 'NGO' || u.role === 'Beneficiary') && (
                        <button
                          onClick={() => handleVerify(u.id, u.role, u.verificationStatus)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            (u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved')
                              ? 'bg-[#E8F6EF] text-[#176B45] hover:bg-[#d8f2e3]' 
                              : 'bg-[#176B45] text-white hover:bg-[#125235]'
                          }`}
                        >
                          {(u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved')
                            ? 'Verified ✓' 
                            : (u.verificationStatus === 'Suspended' || u.verificationStatus === 'Rejected')
                              ? 'Re-approve Account'
                              : 'Approve Account'}
                        </button>
                      )}
                      {u.role !== 'Admin' && u.verificationStatus !== 'Suspended' && (
                        <button
                          onClick={() => handleSuspendUser(u.id)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CAMPAIGNS REVIEW */}
      {activeTab === 'campaigns' && (
        <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-4 text-xs">
          <div>
            <h4 className="font-extrabold text-sm text-[#16201A] font-display">Food Relief Campaigns Moderation</h4>
            <p className="text-[#57685F]">Only verified NGOs can create campaigns, and administrators can approve or reject them.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {allCampaigns.map(camp => (
              <div key={camp.id} className="p-4.5 rounded-2xl border border-[#E8E4D5] flex flex-col justify-between gap-3 bg-[#FAF9F5]">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#176B45] uppercase">{camp.ngoName} • {camp.location}</span>
                      <h5 className="font-extrabold text-sm text-[#16201A] mt-0.5">{camp.title}</h5>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      camp.status === 'Active' ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-[#57685F] text-xs mt-1">{camp.description}</p>
                  <div className="mt-2 text-xs font-semibold text-[#16201A]">
                    Target: <b>PKR {camp.targetAmountPkr.toLocaleString()}</b> • Raised: <span className="text-[#2FA66A]">PKR {camp.raisedAmountPkr?.toLocaleString() || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#E8E4D5]">
                  {camp.status !== 'Active' && (
                    <button
                      onClick={() => handleCampaignStatus(camp.id, 'Active')}
                      className="flex-1 bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2 rounded-xl transition text-xs cursor-pointer"
                    >
                      Approve Campaign
                    </button>
                  )}
                  {camp.status === 'Active' && (
                    <button
                      onClick={() => handleCampaignStatus(camp.id, 'Rejected')}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 rounded-xl transition text-xs border border-rose-200 cursor-pointer"
                    >
                      Reject / Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL DONATIONS AUDIT */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-3xl border border-[#E8E4D5] shadow-xs overflow-hidden text-xs">
          <div className="p-4 bg-[#FAF9F5] border-b border-[#E8E4D5]">
            <h4 className="font-extrabold text-sm text-[#16201A] font-display">Direct NGO Donations Audit Log</h4>
            <p className="text-[#57685F]">Every donation is tagged with its verified recipient NGO, transaction status, and payment mode.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAF9F5] text-[10px] font-bold text-[#65776D] uppercase border-b border-[#E8E4D5]">
                <tr>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Verified NGO</th>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Meals</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1E6]">
                {financialDonations.map(don => (
                  <tr key={don.id}>
                    <td className="p-3 font-mono font-bold text-[#2C3A32]">{don.receiptNumber}</td>
                    <td className="p-3 font-bold text-[#16201A]">{don.ngoName}</td>
                    <td className="p-3 text-[#57685F]">{don.campaignTitle || 'General Food Relief'}</td>
                    <td className="p-3 font-mono font-black text-[#16201A]">PKR {don.amountPkr.toLocaleString()}</td>
                    <td className="p-3 font-bold text-[#2FA66A]">{don.mealsFunded} meals</td>
                    <td className="p-3 font-mono text-[10px] text-[#899C92]">{don.paymentMode}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        don.status === 'Successful' ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {don.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#899C92]">{new Date(don.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="bg-white p-5 rounded-3xl border border-[#E8E4D5] shadow-xs flex flex-col gap-3 text-xs">
          <h4 className="font-extrabold text-sm text-[#16201A] font-display">Platform Complaints &amp; Food Quality Reports</h4>
          <div className="flex flex-col gap-2">
            {complaints.length === 0 ? (
              <div className="py-8 text-center text-[#899C92]">No active complaints logged.</div>
            ) : (
              complaints.map(c => (
                <div key={c.id} className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#16201A]">{c.category}</span>
                      <span className="text-[10px] text-[#899C92]">Reported against: <b>{c.targetName}</b></span>
                    </div>
                    <p className="text-[#57685F] mt-1">{c.description}</p>
                    <span className="text-[10px] text-[#899C92] mt-1 block">By: {c.reporterName} ({c.reporterRole})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    c.status === 'Resolved' ? 'bg-[#E8F6EF] text-[#176B45]' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
