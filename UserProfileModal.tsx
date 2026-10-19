import React, { useState, useMemo } from 'react';
import { 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Building, 
  Utensils, 
  Heart, 
  Save, 
  X,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { useAuth, User } from '../context/AuthContext.tsx';
import { PAKISTAN_PROVINCES, ALL_PAKISTAN_CITIES, getCityDetails } from '../data/pakistanLocations.ts';

export const UserProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'role_info'>('profile');

  // Edit states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState(user?.province || 'Punjab');
  const [city, setCity] = useState(user?.city || 'Lahore');
  const [area, setArea] = useState(user?.area || 'Gulberg');
  const [address, setAddress] = useState(user?.address || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [operatingHours, setOperatingHours] = useState(user?.operatingHours || '11:00 AM - 11:30 PM');
  const [contactPerson, setContactPerson] = useState(user?.contactPerson || '');
  const [emailNotifs, setEmailNotifs] = useState(user?.notificationPrefs?.email ?? true);
  const [smsNotifs, setSmsNotifs] = useState(user?.notificationPrefs?.sms ?? true);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!user) return null;

  // Programmatically sorted Provinces, Cities, and Areas (A-Z)
  const sortedProvinces = useMemo(() => {
    return [...PAKISTAN_PROVINCES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const provinceCities = useMemo(() => {
    const prov = sortedProvinces.find(p => p.name === province);
    const cities = prov ? [...prov.cities] : [];
    return [...cities].sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedProvinces, province]);

  const availableAreas = useMemo(() => {
    const cityObj = getCityDetails(city);
    const areas = cityObj?.areas ? [...cityObj.areas] : [area];
    return [...areas].sort((a, b) => a.localeCompare(b));
  }, [city, area]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateProfile({
        name,
        phone,
        province,
        city,
        area,
        address,
        bio,
        operatingHours,
        contactPerson,
        notificationPrefs: { email: emailNotifs, sms: smsNotifs, push: true }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Password update failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#E8E4D5] overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-[#F4F1E6] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#176B45] text-white flex items-center justify-center font-black text-lg uppercase shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#16201A] leading-tight font-display">{user.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F6EF] text-[#176B45] uppercase">
                  {user.role}
                </span>
                <span className="text-xs text-[#899C92]">📍 {user.city}, {user.province || 'Pakistan'}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-[#F2EFE6] text-[#57685F] font-bold flex items-center justify-center text-sm border border-[#E8E4D5] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#F4F1E6] px-5 gap-4 text-xs font-bold text-[#65776D]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'profile' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('role_info')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'role_info' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
          >
            {user.role} Verification Details
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'security' ? 'border-[#176B45] text-[#176B45]' : 'border-transparent hover:text-[#16201A]'}`}
          >
            Security &amp; Password
          </button>
        </div>

        {/* Tab contents */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: Edit Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 text-xs">
              {saveSuccess && (
                <div className="p-3 bg-[#E8F6EF] border border-[#7ED4A5] text-[#176B45] rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#176B45]" /> Profile updated successfully!
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] focus:outline-none focus:border-[#176B45]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] focus:outline-none focus:border-[#176B45] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Province</label>
                  <select
                    value={province}
                    onChange={e => {
                      const p = e.target.value;
                      setProvince(p);
                      const provObj = sortedProvinces.find(prov => prov.name === p);
                      const cities = provObj ? [...provObj.cities].sort((a, b) => a.name.localeCompare(b.name)) : [];
                      if (cities.length > 0 && cities[0]) {
                        const firstCity = cities[0];
                        setCity(firstCity.name);
                        const areas = [...firstCity.areas].sort((a, b) => a.localeCompare(b));
                        setArea(areas[0] || 'Central');
                      }
                    }}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {sortedProvinces.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">City</label>
                  <select
                    value={city}
                    onChange={e => {
                      const c = e.target.value;
                      setCity(c);
                      const cityObj = getCityDetails(c);
                      if (cityObj?.areas?.length) {
                        const areas = [...cityObj.areas].sort((a, b) => a.localeCompare(b));
                        setArea(areas[0] || 'Central');
                      }
                    }}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {provinceCities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase">Area / Sector</label>
                  <select
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    className="w-full px-2 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {availableAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Organization Bio / Purpose</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] resize-none"
                  placeholder="Short mission statement or culinary description..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl transition-colors shadow-xs mt-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* TAB 2: Role Info */}
          {activeTab === 'role_info' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#65776D] uppercase">Verification Status</span>
                  <div className="font-extrabold text-sm text-[#16201A] mt-0.5">{user.verificationStatus}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                  user.verificationStatus === 'Verified' || user.verificationStatus === 'Approved'
                    ? 'bg-[#E8F6EF] text-[#176B45]'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {user.verificationStatus}
                </span>
              </div>

              {user.role === 'NGO' && (
                <div className="space-y-2 p-4 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <h4 className="font-bold text-xs text-[#16201A]">NGO Registration &amp; Relief Capacity</h4>
                  <p className="text-[#57685F]">Reg Number: <b className="font-mono text-[#16201A]">{user.registrationNumber || 'Pending'}</b></p>
                  <p className="text-[#57685F]">Daily Capacity: <b className="text-[#16201A]">{user.capacity || 100} meals/day</b></p>
                </div>
              )}

              {user.role === 'Restaurant' && (
                <div className="space-y-2 p-4 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <h4 className="font-bold text-xs text-[#16201A]">Restaurant Surplus Kitchen Data</h4>
                  <p className="text-[#57685F]">Operating Hours: <b className="text-[#16201A]">{user.operatingHours || 'Standard Service'}</b></p>
                  <p className="text-[#57685F]">Manager: <b className="text-[#16201A]">{user.contactPerson || 'Assigned'}</b></p>
                </div>
              )}

              {user.role === 'Beneficiary' && (
                <div className="space-y-2 p-4 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <h4 className="font-bold text-xs text-[#16201A]">Beneficiary Protection</h4>
                  <p className="text-[#57685F]">CNIC: <b className="font-mono text-[#16201A]">{user.cnic ? `${user.cnic.slice(0, 5)}...` : 'Protected'}</b></p>
                  <p className="text-[#57685F]">Household: <b className="text-[#16201A]">{user.householdSize || 4} members</b></p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Security & Password */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5 text-xs">
              {passwordMsg && (
                <div className="p-3 bg-[#E8F6EF] border border-[#7ED4A5] text-[#176B45] rounded-xl font-bold">
                  ✓ {passwordMsg}
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  ⚠️ {passwordError}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] focus:outline-none focus:border-[#176B45]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] focus:outline-none focus:border-[#176B45]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A] focus:outline-none focus:border-[#176B45]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl transition-colors shadow-xs mt-2 cursor-pointer"
              >
                Update Password
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
