import React, { useState, useEffect } from 'react';
import { MapPin, Building, Utensils, Users, Heart, Sparkles, Check, ArrowRight } from 'lucide-react';
import { PAKISTAN_PROVINCES, ALL_PAKISTAN_CITIES, CityData } from '../data/pakistanLocations.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { TiltCard } from './TiltCard.tsx';

export const PakistanCityExplorer: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { selectedCity, setSelectedCity } = useAuth();
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.locations.getCityStats();
        setStatsData(res.stats);
      } catch (err) {
        console.warn('Failed to load city statistics:', err);
      }
    };
    loadStats();
  }, []);

  const filteredCities = ALL_PAKISTAN_CITIES
    .filter(c => {
      const matchesProv = selectedProvince === 'All' || c.province === selectedProvince;
      const matchesSearch = !searchQuery || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.province.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProv && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const getCityMetrics = (cityName: string) => {
    if (!statsData?.cityBreakdowns) return null;
    return statsData.cityBreakdowns.find((b: any) => b.cityName.toLowerCase() === cityName.toLowerCase());
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4D5] shadow-sm p-5 sm:p-7 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F4F1E6] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🇵🇰</span>
            <h2 className="text-xl font-black text-[#16201A] tracking-tight font-display">
              Explore PlateShare Across Pakistan
            </h2>
          </div>
          <p className="text-xs text-[#57685F] mt-1">
            Discover verified restaurants, authorized NGOs, and food rescue operations across all 7 provinces &amp; administrative regions.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search Pakistani city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E8E4D5] rounded-xl text-xs focus:outline-none focus:border-[#176B45] font-medium text-[#16201A]"
          />
        </div>
      </div>

      {/* Province Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setSelectedProvince('All')}
          className={`px-3.5 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer ${
            selectedProvince === 'All' 
              ? 'bg-[#176B45] text-white shadow-xs' 
              : 'bg-[#FAF9F5] text-[#495A50] hover:bg-[#F2EFE6] border border-[#E8E4D5]'
          }`}
        >
          All Pakistan ({ALL_PAKISTAN_CITIES.length})
        </button>
        {PAKISTAN_PROVINCES.map(p => (
          <button
            key={p.name}
            onClick={() => setSelectedProvince(p.name)}
            className={`px-3.5 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer ${
              selectedProvince === p.name 
                ? 'bg-[#176B45] text-white shadow-xs' 
                : 'bg-[#FAF9F5] text-[#495A50] hover:bg-[#F2EFE6] border border-[#E8E4D5]'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Cities Grid with 3D Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCities.map(city => {
          const metrics = getCityMetrics(city.name);
          const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();

          return (
            <TiltCard key={city.name}>
              <div
                onClick={() => {
                  setSelectedCity(city.name);
                  if (onClose) onClose();
                }}
                className={`p-4.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-full gap-3 ${
                  isSelected 
                    ? 'border-[#176B45] bg-[#E8F6EF]/40 shadow-sm ring-2 ring-[#176B45]/20' 
                    : 'border-[#E8E4D5] hover:border-[#176B45]/50 bg-white hover:bg-[#FAF9F5]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-[#16201A] tracking-tight flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
                        {city.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-[#899C92] block mt-0.5">
                        {city.district} District • {city.province}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#176B45] text-white flex items-center gap-1 shadow-xs">
                        <Check className="w-2.5 h-2.5" /> Focused
                      </span>
                    )}
                  </div>

                  {/* City Areas tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {city.areas.slice(0, 3).map(area => (
                      <span key={area} className="text-[9px] font-medium bg-[#FAF9F5] px-2 py-0.5 rounded-md border border-[#E8E4D5] text-[#57685F]">
                        {area}
                      </span>
                    ))}
                    {city.areas.length > 3 && (
                      <span className="text-[9px] text-[#899C92] self-center">+{city.areas.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Real Database Metrics Card */}
                <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E8E4D5] grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div>
                    <span className="text-[8px] font-bold text-[#899C92] uppercase block">Restaurants</span>
                    <span className="font-extrabold text-[#16201A] font-display">
                      {metrics ? metrics.availableRestaurants : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-[#899C92] uppercase block">NGOs</span>
                    <span className="font-extrabold text-[#176B45] font-display">
                      {metrics ? metrics.verifiedNgos : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-[#899C92] uppercase block">Donations</span>
                    <span className="font-extrabold text-[#2FA66A] font-display">
                      {metrics ? metrics.activeDonations : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#57685F] font-bold pt-1 border-t border-[#F4F1E6]">
                  <span>{isSelected ? 'Currently Focused' : 'Tap to Focus City'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#176B45]" />
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>

      <div className="text-[11px] text-[#899C92] text-center font-medium">
        🛡️ Note: All statistics shown are verified directly from active database records across Pakistan.
      </div>
    </div>
  );
};
