import React, { useState, useMemo } from 'react';
import { X, AlertCircle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { PAKISTAN_PROVINCES, ALL_PAKISTAN_CITIES, getCityDetails } from '../data/pakistanLocations.ts';

interface AuthModalsProps {
  loginOpen: boolean;
  registerOpen: boolean;
  onCloseLogin: () => void;
  onCloseRegister: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  loginOpen,
  registerOpen,
  onCloseLogin,
  onCloseRegister,
  onSwitchToRegister,
  onSwitchToLogin
}) => {
  const { login, register } = useAuth();

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Secure Forgot & Reset Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Register States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Restaurant');
  const [regProvince, setRegProvince] = useState('Punjab');
  const [regCity, setRegCity] = useState('Lahore');
  const [regArea, setRegArea] = useState('Gulberg');
  const [regAddress, setRegAddress] = useState('');
  
  // Role specific fields
  const [regOrgName, setRegOrgName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [regCapacity, setRegCapacity] = useState('100');
  const [regHours, setRegHours] = useState('11:00 AM - 11:30 PM');
  const [regContactPerson, setRegContactPerson] = useState('');
  const [regCnic, setRegCnic] = useState('');
  const [regHouseholdSize, setRegHouseholdSize] = useState('5');
  const [hasSmartphone, setHasSmartphone] = useState(true);

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Programmatically sorted Provinces, Cities, and Areas (A-Z)
  const sortedProvinces = useMemo(() => {
    return [...PAKISTAN_PROVINCES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const provinceCities = useMemo(() => {
    const prov = sortedProvinces.find(p => p.name === regProvince);
    if (!prov) return [];
    return [...prov.cities].sort((a, b) => a.name.localeCompare(b.name));
  }, [regProvince, sortedProvinces]);

  const currentAreas = useMemo(() => {
    const city = getCityDetails(regCity);
    if (!city || !city.areas) return [];
    return [...city.areas].sort((a, b) => a.localeCompare(b));
  }, [regCity]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      onCloseLogin();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail);
      setForgotSuccess(res.message || 'If an account exists, password reset instructions have been dispatched.');
    } catch (err: any) {
      setResetError(err.message || 'Failed to submit reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      const res = await api.auth.resetPassword({
        token: resetTokenInput,
        resetToken: resetTokenInput,
        newPassword: resetNewPassword,
        confirmPassword: resetNewPassword
      });
      setResetSuccess(res.message || 'Password successfully updated! You can now log in.');
      setTimeout(() => {
        setForgotMode(false);
        setResetSuccess('');
        setForgotSuccess('');
        setLoginEmail(forgotEmail);
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    setRegLoading(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        role: regRole,
        province: regProvince,
        city: regCity,
        area: regArea,
        address: regAddress,
        organizationName: regOrgName || regName,
        registrationNumber: regNo,
        capacity: Number(regCapacity) || 50,
        operatingHours: regHours,
        contactPerson: regContactPerson,
        cnic: regCnic,
        householdSize: Number(regHouseholdSize) || 4,
        hasSmartphone
      });
      onCloseRegister();
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      {/* LOGIN MODAL */}
      {loginOpen && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 border border-[#E8E4D5] relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={onCloseLogin}
              className="absolute top-5 right-5 text-[#899C92] hover:text-[#16201A] p-1.5 rounded-full hover:bg-[#FAF9F5] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#176B45] text-white flex items-center justify-center font-black text-2xl shadow-xs">
                🍲
              </div>
              <div>
                <h3 className="text-xl font-black text-[#16201A] tracking-tight font-display">Log In to PlateShare</h3>
                <p className="text-xs text-[#57685F]">Access your verified Pakistan food redistribution account</p>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-tight">{loginError}</span>
              </div>
            )}

            {!forgotMode ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@organization.pk"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#176B45] focus:bg-white text-[#16201A] transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block">Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); setResetError(''); setForgotSuccess(''); }}
                      className="text-[11px] text-[#176B45] hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#176B45] focus:bg-white text-[#16201A] transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3 rounded-xl text-xs transition shadow-xs mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? 'Signing In...' : 'Sign In to PlateShare'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-xs">
                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    {forgotSuccess}
                  </div>
                )}
                {resetSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                    {resetSuccess}
                  </div>
                )}

                {!forgotSuccess ? (
                  <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-3">
                    <p className="text-xs text-[#57685F]">
                      Enter your account email to request a single-use password reset token. No email/SMS service is configured in this build, so the reset link is not sent by message; in development it is printed in the server console.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="e.g. name@organization.pk"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs text-[#16201A]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? 'Sending...' : 'Request Password Reset'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-3 border-t border-[#E8E4D5] pt-3">
                    <p className="text-[11px] text-[#57685F]">
                      Enter your single-use reset token and choose a new password.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Reset Token</label>
                      <input
                        type="text"
                        required
                        value={resetTokenInput}
                        onChange={e => setResetTokenInput(e.target.value)}
                        placeholder="Paste reset token here"
                        className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl font-mono text-xs text-[#16201A]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">New Password (min 8 chars)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs text-[#16201A]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {resetLoading ? 'Updating Password...' : 'Confirm New Password'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotSuccess(''); setResetError(''); }}
                  className="text-xs text-[#57685F] hover:text-[#16201A] font-semibold text-center mt-1 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-[#F4F1E6] text-center text-xs text-[#57685F]">
              Don&apos;t have an account yet?{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-bold text-[#176B45] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {registerOpen && (
        <div className="fixed inset-0 bg-[#16201A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 sm:p-8 border border-[#E8E4D5] relative my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={onCloseRegister}
              className="absolute top-5 right-5 text-[#899C92] hover:text-[#16201A] p-1.5 rounded-full hover:bg-[#FAF9F5] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#176B45] text-white flex items-center justify-center font-black text-2xl shadow-xs">
                🇵🇰
              </div>
              <div>
                <h3 className="text-xl font-black text-[#16201A] tracking-tight font-display">Join PlateShare Pakistan</h3>
                <p className="text-xs text-[#57685F]">Connecting surplus food to verified assistance across all cities</p>
              </div>
            </div>

            {regError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-tight">{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 text-xs">
              
              {/* Role Selection */}
              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1.5">
                  How will you participate on PlateShare?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'Restaurant' as UserRole, label: 'Restaurant', icon: '🍽️', desc: 'Donate food' },
                    { role: 'NGO' as UserRole, label: 'NGO', icon: '🏢', desc: 'Collect & distribute' },
                    { role: 'Donor' as UserRole, label: 'Donor', icon: '💚', desc: 'Sponsor meals' },
                    { role: 'Beneficiary' as UserRole, label: 'Beneficiary', icon: '🤝', desc: 'Assistance' }
                  ].map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setRegRole(item.role)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        regRole === item.role
                          ? 'border-[#176B45] bg-[#E8F6EF] text-[#16201A] ring-2 ring-[#176B45]/20 shadow-xs'
                          : 'border-[#E8E4D5] hover:border-[#CFCEBE] bg-[#FAF9F5] text-[#495A50]'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-extrabold text-xs block mt-1">{item.label}</span>
                      <span className="text-[10px] text-[#899C92] leading-tight block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security Banner for Restaurant, NGO & Beneficiary */}
              {(regRole === 'Restaurant' || regRole === 'NGO' || regRole === 'Beneficiary') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] flex items-start gap-2.5 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {regRole === 'Beneficiary' ? (
                      <><b>Verification Policy:</b> Beneficiary accounts begin with <b>Under Review</b> status. Meal allocations require identity verification by a local registered NGO or PlateShare Administrator.</>
                    ) : (
                      <><b>Security Policy:</b> Accounts registered as <b>{regRole}</b> begin with <b>Pending Verification</b>. You will be able to log in, but food donation and claiming permissions require review by a PlateShare Administrator.</>
                    )}
                  </span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">
                    {regRole === 'Restaurant' ? 'Restaurant Name' : regRole === 'NGO' ? 'NGO / Organization Name' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Shiraz or Tariq Khan"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.pk"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Phone (03xx-xxxxxxx)</label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  />
                </div>
              </div>

              {/* Location Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Province / Region</label>
                  <select
                    value={regProvince}
                    onChange={e => {
                      const p = e.target.value;
                      setRegProvince(p);
                      const provObj = sortedProvinces.find(prov => prov.name === p);
                      const cities = provObj ? [...provObj.cities].sort((a, b) => a.name.localeCompare(b.name)) : [];
                      if (cities.length > 0 && cities[0]) {
                        const firstCity = cities[0];
                        setRegCity(firstCity.name);
                        const areas = [...firstCity.areas].sort((a, b) => a.localeCompare(b));
                        setRegArea(areas[0] || 'Central');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {sortedProvinces.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">City</label>
                  <select
                    value={regCity}
                    onChange={e => {
                      const c = e.target.value;
                      setRegCity(c);
                      const cityObj = getCityDetails(c);
                      if (cityObj?.areas?.length) {
                        const areas = [...cityObj.areas].sort((a, b) => a.localeCompare(b));
                        setRegArea(areas[0] || 'Central');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {provinceCities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Area / Sector</label>
                  <select
                    value={regArea}
                    onChange={e => setRegArea(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                  >
                    {currentAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Physical Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop 4, Main Commercial Market, Near Chowk"
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-[#16201A]"
                />
              </div>

              {/* Role Specific Dynamic Fields */}
              {regRole === 'Restaurant' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Manager Imran"
                      value={regContactPerson}
                      onChange={e => setRegContactPerson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl text-[#16201A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Operating Hours</label>
                    <input
                      type="text"
                      placeholder="e.g. 11:00 AM - 11:00 PM"
                      value={regHours}
                      onChange={e => setRegHours(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl text-[#16201A]"
                    />
                  </div>
                </div>
              )}

              {regRole === 'NGO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Govt Registration / Trust No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SWD/ICT-2024-981"
                      value={regNo}
                      onChange={e => setRegNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl font-mono text-[#16201A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Daily Meal Capacity</label>
                    <input
                      type="number"
                      required
                      placeholder="150"
                      value={regCapacity}
                      onChange={e => setRegCapacity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl text-[#16201A]"
                    />
                  </div>
                </div>
              )}

              {regRole === 'Beneficiary' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E4D5]">
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">CNIC (xxxxx-xxxxxxx-x)</label>
                    <input
                      type="text"
                      required
                      placeholder="13101-1234567-1"
                      value={regCnic}
                      onChange={e => setRegCnic(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl font-mono text-[#16201A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#65776D] uppercase tracking-wider block mb-1">Household Members</label>
                    <input
                      type="number"
                      required
                      value={regHouseholdSize}
                      onChange={e => setRegHouseholdSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E8E4D5] rounded-xl text-[#16201A]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-[#176B45] hover:bg-[#125235] text-white font-bold py-3.5 rounded-xl text-xs transition shadow-xs mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {regLoading ? 'Creating Account...' : 'Complete Registration & Enter PlateShare'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#F4F1E6] text-center text-xs text-[#57685F]">
              Already registered?{' '}
              <button
                onClick={onSwitchToLogin}
                className="font-bold text-[#176B45] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
