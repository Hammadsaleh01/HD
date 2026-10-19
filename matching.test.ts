import { describe, it, expect } from 'vitest';
import { matchSuitableNgos, calculateDistanceKm } from '../../backend/src/services/matching.ts';
import { User } from '../../shared/types.ts';

describe('Intelligent NGO Matching Algorithm', () => {
  const baseListing = {
    coordinates: { lat: 31.5204, lng: 74.3587 }, // Lahore Center
    city: 'Lahore',
    area: 'Gulberg',
    quantity: 50,
  };

  const sampleNgos: User[] = [
    {
      id: 'ngo-1',
      name: 'Gulberg Food Relief',
      email: 'gulberg@relief.org.pk',
      phone: '+92 300 1111111',
      role: 'NGO',
      verificationStatus: 'Verified',
      city: 'Lahore',
      area: 'Gulberg',
      address: 'Main Market Gulberg, Lahore',
      serviceAreas: ['Gulberg', 'Model Town'],
      capacity: 100,
      coordinates: { lat: 31.5220, lng: 74.3590 }, // ~0.2 km away
      createdAt: '2026-01-01',
    },
    {
      id: 'ngo-2',
      name: 'DHA Community Kitchen',
      email: 'dha@kitchen.org.pk',
      phone: '+92 300 2222222',
      role: 'NGO',
      verificationStatus: 'Verified',
      city: 'Lahore',
      area: 'DHA',
      address: 'Phase 5 DHA, Lahore',
      serviceAreas: ['DHA'],
      capacity: 40,
      coordinates: { lat: 31.4700, lng: 74.4100 }, // ~7.5 km away
      createdAt: '2026-01-01',
    },
    {
      id: 'ngo-3-zero-capacity',
      name: 'Zero Capacity NGO',
      email: 'zero@ngo.org.pk',
      phone: '+92 300 3333333',
      role: 'NGO',
      verificationStatus: 'Verified',
      city: 'Lahore',
      area: 'Gulberg',
      address: 'Gulberg II, Lahore',
      serviceAreas: ['Gulberg'],
      capacity: 0, // Must be excluded
      coordinates: { lat: 31.5205, lng: 74.3588 },
      createdAt: '2026-01-01',
    },
    {
      id: 'ngo-4-unverified',
      name: 'Unverified NGO',
      email: 'unverified@ngo.org.pk',
      phone: '+92 300 4444444',
      role: 'NGO',
      verificationStatus: 'Pending', // Must be excluded
      city: 'Lahore',
      area: 'Gulberg',
      address: 'Gulberg III, Lahore',
      capacity: 200,
      coordinates: { lat: 31.5204, lng: 74.3587 },
      createdAt: '2026-01-01',
    },
    {
      id: 'ngo-5-different-city',
      name: 'Karachi Hope Relief',
      email: 'karachi@hope.org.pk',
      phone: '+92 321 5555555',
      role: 'NGO',
      verificationStatus: 'Verified',
      city: 'Karachi',
      area: 'Clifton',
      address: 'Block 2 Clifton, Karachi',
      capacity: 500,
      coordinates: { lat: 24.8607, lng: 67.0011 }, // Far away (>1000 km)
      createdAt: '2026-01-01',
    }
  ];

  it('calculates accurate Haversine distances', () => {
    // Distance between Lahore Center and DHA (~8 km)
    const dist = calculateDistanceKm(31.5204, 74.3587, 31.4700, 74.4100);
    expect(dist).toBeGreaterThan(6);
    expect(dist).toBeLessThan(11);
  });

  it('orders matched NGOs by score and proximity', () => {
    const results = matchSuitableNgos(baseListing, sampleNgos, 30);
    expect(results.length).toBe(2);
    // Gulberg NGO should be ranked higher due to immediate proximity and direct area match
    expect(results[0]?.ngoId).toBe('ngo-1');
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('strictly excludes NGOs with zero capacity (Phase 2.6)', () => {
    const results = matchSuitableNgos(baseListing, sampleNgos, 30);
    const zeroCap = results.find(r => r.ngoId === 'ngo-3-zero-capacity');
    expect(zeroCap).toBeUndefined();
  });

  it('strictly excludes unverified NGOs', () => {
    const results = matchSuitableNgos(baseListing, sampleNgos, 30);
    const unverified = results.find(r => r.ngoId === 'ngo-4-unverified');
    expect(unverified).toBeUndefined();
  });

  it('handles empty NGO list gracefully', () => {
    const results = matchSuitableNgos(baseListing, [], 30);
    expect(results).toEqual([]);
  });

  it('handles tied scores by secondary distance sort', () => {
    const tiedNgos: User[] = [
      {
        id: 'tied-far',
        name: 'Tied Far',
        email: 'tf@ngo.pk',
        phone: '123',
        role: 'NGO',
        verificationStatus: 'Verified',
        city: 'Lahore',
        area: 'Ferozepur',
        address: 'Ferozepur Road, Lahore',
        capacity: 100,
        coordinates: { lat: 31.5400, lng: 74.3500 },
        createdAt: '2026-01-01'
      },
      {
        id: 'tied-near',
        name: 'Tied Near',
        email: 'tn@ngo.pk',
        phone: '124',
        role: 'NGO',
        verificationStatus: 'Verified',
        city: 'Lahore',
        area: 'Ferozepur',
        address: 'Ferozepur Road Near, Lahore',
        capacity: 100,
        coordinates: { lat: 31.5250, lng: 74.3580 },
        createdAt: '2026-01-01'
      }
    ];

    const results = matchSuitableNgos(baseListing, tiedNgos, 30);
    expect(results.length).toBe(2);
    expect(results[0]?.distanceKm).toBeLessThanOrEqual(results[1]?.distanceKm ?? 999);
  });
});
