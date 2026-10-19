import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import {
  User,
  UserRole,
  NgoCampaign,
  FinancialDonation,
  CampaignExpense,
  BeneficiaryApplication,
  Notification,
  FoodListing,
  VerificationStatus,
  DonationStatus
} from '@shared/types.ts';

export type {
  User,
  UserRole,
  NgoCampaign,
  FinancialDonation,
  CampaignExpense,
  BeneficiaryApplication,
  Notification,
  FoodListing,
  VerificationStatus,
  DonationStatus
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  notifications: Notification[];
  unreadCount: number;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<any>;
  updateProfile: (profileData: any) => Promise<User>;
  changePassword: (passData: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotifAsRead: (id: string) => Promise<void>;
  markAllNotifsAsRead: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Quick test credentials across Pakistan cities for development and live demonstration
export const DEMO_ACCOUNTS: Record<string, { email: string; label: string; name: string; city: string; role: UserRole }> = {
  admin: { 
    email: 'admin@plateshare.org', 
    label: 'Platform Admin (National)', 
    name: 'PlateShare National Administrator', 
    city: 'Islamabad',
    role: 'Admin'
  },
  restaurant_lahore: { 
    email: 'savour@lahore.pk', 
    label: 'Verified Restaurant (Lahore)', 
    name: 'Savour Foods Lahore', 
    city: 'Lahore',
    role: 'Restaurant'
  },
  restaurant_abbottabad: { 
    email: 'alshiraz@abbottabad.pk', 
    label: 'Verified Restaurant (Abbottabad)', 
    name: 'Al-Shiraz Restaurant', 
    city: 'Abbottabad',
    role: 'Restaurant'
  },
  ngo_lahore: { 
    email: 'alkhidmat@lahore.ngo.pk', 
    label: 'Verified NGO (Lahore)', 
    name: 'Al-Khidmat Foundation Lahore', 
    city: 'Lahore',
    role: 'NGO'
  },
  ngo_abbottabad: { 
    email: 'ehsaas@ngo.org.pk', 
    label: 'Verified NGO (Abbottabad)', 
    name: 'Ehsaas Foundation Abbottabad', 
    city: 'Abbottabad',
    role: 'NGO'
  },
  donor: { 
    email: 'tariq.donor@gmail.com', 
    label: 'Financial Donor', 
    name: 'Tariq Mehmood Khan', 
    city: 'Abbottabad',
    role: 'Donor'
  },
  beneficiary: { 
    email: 'rashid.beneficiary@gmail.com', 
    label: 'Registered Beneficiary', 
    name: 'Rashid Mehmood', 
    city: 'Abbottabad',
    role: 'Beneficiary'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('plateshare_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(localStorage.getItem('plateshare_selected_city') || 'All Cities');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('plateshare_token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
          setToken(storedToken);
          if (res.user.city && selectedCity === 'All Cities') {
            setSelectedCity(res.user.city);
          }
        } catch (err: any) {
          console.warn('Failed to restore auth session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleSetCity = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem('plateshare_selected_city', city);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const clearError = () => setError(null);

  const login = async (email: string, password: string): Promise<User> => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem('plateshare_token', res.token);
      setToken(res.token);
      setUser(res.user);
      if (res.user.city) {
        handleSetCity(res.user.city);
      }
      setLoading(false);
      return res.user;
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.message || 'Login failed';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (userData: any): Promise<any> => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.register(userData);
      localStorage.setItem('plateshare_token', res.token);
      setToken(res.token);
      setUser(res.user);
      if (res.user.city) {
        handleSetCity(res.user.city);
      }
      setLoading(false);
      return res;
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.message || 'Registration failed';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateProfile = async (profileData: any): Promise<User> => {
    try {
      const res = await api.auth.updateProfile(profileData);
      setUser(res.user);
      if (res.user.city) {
        handleSetCity(res.user.city);
      }
      return res.user;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update profile');
    }
  };

  const changePassword = async (passData: any): Promise<void> => {
    try {
      await api.auth.changePassword(passData);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to change password');
    }
  };

  const logout = () => {
    localStorage.removeItem('plateshare_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setError(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.auth.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await api.notifications.getMyNotifications();
      setNotifications(res.notifications || []);
      const unread = (res.notifications || []).filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  const markNotifAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const markAllNotifsAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      selectedCity,
      setSelectedCity: handleSetCity,
      notifications,
      unreadCount,
      login,
      register,
      updateProfile,
      changePassword,
      logout,
      refreshUser,
      fetchNotifications,
      markNotifAsRead,
      markAllNotifsAsRead,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
