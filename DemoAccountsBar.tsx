import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Check, LogIn, Lock } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext.tsx';

/**
 * DemoAccountsBar: Strictly for FYP evaluation and development testing.
 * Disabled in production and completely hidden from normal users.
 * Does NOT contain hardcoded passwords or backdoors.
 * Authenticates exclusively via standard /api/auth/login.
 */
export const DemoAccountsBar: React.FC = () => {
  const { user, login } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // Strictly disabled in production mode or normal user viewing
  const isDemoDevMode = 
    import.meta.env.DEV && 
    typeof window !== 'undefined' && 
    window.location.search.includes('demo=true');

  if (!isDemoDevMode) {
    return null;
  }

  const demoPresets = [
    { role: 'Admin' as UserRole, city: 'Islamabad', label: 'Admin (National)', email: 'admin@plateshare.org' },
    { role: 'Restaurant' as UserRole, city: 'Lahore', label: 'Restaurant (Lahore)', email: 'savour@lahore.pk' },
    { role: 'Restaurant' as UserRole, city: 'Abbottabad', label: 'Restaurant (Abbottabad)', email: 'alshiraz@abbottabad.pk' },
    { role: 'NGO' as UserRole, city: 'Lahore', label: 'NGO (Lahore)', email: 'alkhidmat@lahore.ngo.pk' },
    { role: 'NGO' as UserRole, city: 'Abbottabad', label: 'NGO (Abbottabad)', email: 'ehsaas@ngo.org.pk' },
    { role: 'Donor' as UserRole, city: 'Abbottabad', label: 'Donor (Tariq Khan)', email: 'tariq.donor@gmail.com' },
    { role: 'Beneficiary' as UserRole, city: 'Abbottabad', label: 'Beneficiary (Rashid)', email: 'rashid.beneficiary@gmail.com' },
  ];

  const handleSelectDemo = async (item: typeof demoPresets[0]) => {
    const password = window.prompt(`[Dev Mode] Enter account password for ${item.email}:`, '');
    if (!password) return;

    setLoadingRole(item.label);
    try {
      await login(item.email, password);
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 text-xs max-w-sm">
        
        {/* Toggle Bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-[11px] tracking-wide text-slate-200">
              FYP Dev Evaluation: <b className="text-amber-300 font-mono">Test Accounts</b>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
            <span>{user ? user.role : 'Guest'}</span>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* Expanded Drawer */}
        {expanded && (
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-2 max-h-72 overflow-y-auto">
            <div className="text-[10px] text-slate-400 leading-tight">
              🔒 Authenticates securely via <code>/api/auth/login</code> with standard bcrypt credentials.
            </div>

            <div className="grid grid-cols-1 gap-1.5 mt-1">
              {demoPresets.map(preset => {
                const isActive = user?.email.toLowerCase() === preset.email.toLowerCase();
                const isLoading = loadingRole === preset.label;

                return (
                  <button
                    key={preset.label}
                    onClick={() => handleSelectDemo(preset)}
                    disabled={isLoading}
                    className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isActive 
                        ? 'bg-[#176B45]/40 border-[#2FA66A] text-[#DAF4E5] font-bold' 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-semibold block">{preset.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{preset.email}</span>
                    </div>

                    {isActive ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Logged In
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
                        <LogIn className="w-3 h-3" /> {isLoading ? '...' : 'Sign In'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
