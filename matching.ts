import { Coordinates, MatchedNgoInfo, User } from '@shared/types.ts';
import { getCoordinatesForCity } from '@shared/locations.ts';

export interface MatchingWeights {
  proximityMaxScore: number;
  capacityMaxScore: number;
  areaMatchScore: number;
  cityMatchScore: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  proximityMaxScore: 40,
  capacityMaxScore: 30,
  areaMatchScore: 30,
  cityMatchScore: 15,
};

// Haversine formula to compute distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Intelligent multi-criteria matching for NGOs near a food listing
 * Filters:
 * - Role must be NGO
 * - Must be Approved or Verified
 * - available !== false
 * - capacity > 0 (excludes NGOs with 0 capacity per Phase 2.6)
 * - within maxRadiusKm (or strictly same city if within reasonable range)
 */
export function matchSuitableNgos(
  listing: { coordinates: Coordinates; city: string; area: string; quantity: number },
  allUsers: User[],
  maxRadiusKm = 25,
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS
): MatchedNgoInfo[] {
  const eligibleNgos = allUsers.filter(u =>
    u.role === 'NGO' &&
    (u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved') &&
    u.available !== false &&
    (u.capacity || 0) > 0 // Exclude capacity 0 NGOs
  );

  const matched: MatchedNgoInfo[] = [];

  for (const ngo of eligibleNgos) {
    const defaultCoords = getCoordinatesForCity(ngo.city || listing.city);
    const ngoCoords = ngo.coordinates || defaultCoords;

    const distanceKm = calculateDistanceKm(
      listing.coordinates.lat,
      listing.coordinates.lng,
      ngoCoords.lat,
      ngoCoords.lng
    );

    const isSameCity = (ngo.city || '').toLowerCase() === (listing.city || '').toLowerCase();

    // Match if inside max radius, or if in same city and within 1.5x max radius
    if (distanceKm <= maxRadiusKm || (isSameCity && distanceKm <= maxRadiusKm * 1.5)) {
      const proximityScore = Math.max(0, weights.proximityMaxScore - (distanceKm * 1.5));
      const capacity = ngo.capacity || 50;
      const capacityScore = capacity >= listing.quantity
        ? weights.capacityMaxScore
        : Math.round((capacity / listing.quantity) * weights.capacityMaxScore);

      const isAreaDirectMatch = ngo.serviceAreas?.some(
        a => a.toLowerCase() === listing.area.toLowerCase()
      );
      const areaScore = isAreaDirectMatch ? weights.areaMatchScore : (isSameCity ? weights.cityMatchScore : 0);
      const totalScore = Math.round(proximityScore + capacityScore + areaScore);

      matched.push({
        ngoId: ngo.id,
        ngoName: ngo.organizationName || ngo.name,
        phone: ngo.phone,
        city: ngo.city,
        area: ngo.area || ngo.city,
        distanceKm,
        capacity,
        score: totalScore
      });
    }
  }

  return matched.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
}
