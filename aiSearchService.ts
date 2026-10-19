import { GoogleGenAI } from '@google/genai';
import { getDb } from '../database/store.ts';
import { User, FoodListing, FinancialDonation, Coordinates, UserRole } from '@shared/types.ts';
import { calculateDistanceKm } from './matching.ts';
import { getCoordinatesForCity } from '@shared/locations.ts';

export interface SearchCurrentUser {
  id: string;
  role: string;
  email?: string;
  name?: string;
  city?: string;
  province?: string;
  area?: string;
  coordinates?: Coordinates;
  verificationStatus?: string;
}

export interface SmartSearchResultItem {
  type: 'listing' | 'ngo' | 'donation' | 'user' | 'assistance';
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  city?: string;
  area?: string;
  distanceKm?: number;
  score: number;
  matchReasons: string[];
  data: any;
}

export interface SmartSearchResponse {
  query: string;
  mode: 'AI_GEMINI' | 'RULE_BASED_FALLBACK';
  interpretation: string;
  extractedFilters: {
    targetType?: string;
    city?: string;
    foodCategory?: string;
    minQuantity?: number;
    maxDistanceKm?: number;
    status?: string;
    isUrgent?: boolean;
    keywords?: string[];
  };
  totalResults: number;
  results: SmartSearchResultItem[];
  suggestions: string[];
}

interface ParsedQueryIntent {
  targetType: 'food_listings' | 'ngos' | 'donations' | 'users' | 'assistance_history' | 'all';
  city?: string;
  province?: string;
  maxDistanceKm?: number;
  foodCategory?: string;
  minQuantity?: number;
  maxQuantity?: number;
  status?: string;
  keywords?: string[];
  isUrgentOrToday?: boolean;
  isAcceptingDonations?: boolean;
  summaryInterpretation: string;
}

const PAKISTANI_CITIES = [
  'Abbottabad', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar',
  'Quetta', 'Multan', 'Faisalabad', 'Sialkot', 'Gujranwala', 'Hyderabad',
  'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana', 'Mardan', 'Kasur'
];

/**
 * Intelligent rule-based parser that executes when GEMINI_API_KEY is not configured
 * or when Gemini service experiences temporary network unavailability.
 */
function ruleBasedQueryParser(query: string, userRole?: string): ParsedQueryIntent {
  const qLower = query.toLowerCase();
  const words = qLower.split(/\s+/);

  // 1. Detect City
  let detectedCity: string | undefined = undefined;
  for (const city of PAKISTANI_CITIES) {
    if (qLower.includes(city.toLowerCase())) {
      detectedCity = city;
      break;
    }
  }

  // 2. Detect Distance (e.g. "within 10 km", "10km", "5 kilometres")
  let maxDistanceKm: number | undefined = undefined;
  const distMatch = qLower.match(/(\d+)\s*(?:km|kms|kilometers|kilometres)/);
  if (distMatch && distMatch[1]) {
    maxDistanceKm = Number(distMatch[1]);
  } else if (qLower.includes('nearby') || qLower.includes('near me')) {
    maxDistanceKm = 15;
  }

  // 3. Detect Quantity (e.g. "30 meal boxes", "25 meals", "50 kg", "100 packs")
  let minQuantity: number | undefined = undefined;
  const qtyMatch = qLower.match(/(\d+)\s*(?:meals|meal|boxes|box|packs|kg|plates|portions)/);
  if (qtyMatch && qtyMatch[1]) {
    minQuantity = Number(qtyMatch[1]);
  }

  // 4. Detect Food Category & Keywords
  let foodCategory: string | undefined = undefined;
  const detectedKeywords: string[] = [];

  if (qLower.includes('biryani') || qLower.includes('pulao') || qLower.includes('rice')) {
    foodCategory = 'Biryani & Rice';
    detectedKeywords.push('rice', 'biryani');
  } else if (qLower.includes('cooked') || qLower.includes('cooked meal') || qLower.includes('warm')) {
    foodCategory = 'Home Cooked Meals';
    detectedKeywords.push('cooked');
  } else if (qLower.includes('curry') || qLower.includes('gravy') || qLower.includes('salan') || qLower.includes('daal')) {
    foodCategory = 'Curry & Gravy';
    detectedKeywords.push('curry', 'daal');
  } else if (qLower.includes('roti') || qLower.includes('naan') || qLower.includes('bread') || qLower.includes('bakery')) {
    foodCategory = 'Bakery & Breads';
    detectedKeywords.push('bread', 'naan');
  } else if (qLower.includes('ration') || qLower.includes('grocery') || qLower.includes('flour') || qLower.includes('atta')) {
    foodCategory = 'Dry Groceries & Ration';
    detectedKeywords.push('ration', 'groceries');
  }

  // Special dietary checks
  if (qLower.includes('vegetarian') || qLower.includes('veg') || qLower.includes('sabzi')) {
    detectedKeywords.push('vegetarian');
  }
  if (qLower.includes('chicken') || qLower.includes('meat') || qLower.includes('beef') || qLower.includes('gosht')) {
    detectedKeywords.push('meat');
  }

  // 5. Detect Urgency / Time
  const isUrgentOrToday = qLower.includes('today') || qLower.includes('urgent') || qLower.includes('now') || qLower.includes('tonight') || qLower.includes('expiring');

  // 6. Detect Target Type & Intent
  let targetType: ParsedQueryIntent['targetType'] = 'all';

  if (qLower.includes('ngo') || qLower.includes('foundation') || qLower.includes('charity') || qLower.includes('organization')) {
    targetType = 'ngos';
  } else if (qLower.includes('donation') || qLower.includes('money') || qLower.includes('receipt') || qLower.includes('fund') || qLower.includes('pkr')) {
    targetType = 'donations';
  } else if (qLower.includes('food') || qLower.includes('meal') || qLower.includes('surplus') || foodCategory) {
    targetType = 'food_listings';
  } else if (qLower.includes('assistance') || qLower.includes('beneficiary') || qLower.includes('case')) {
    targetType = userRole === 'Beneficiary' ? 'assistance_history' : 'users';
  }

  // Role context overrides
  if (userRole === 'Restaurant' && targetType === 'all') {
    targetType = 'ngos';
  } else if (userRole === 'NGO' && targetType === 'all') {
    targetType = 'food_listings';
  }

  let summary = `Rule-based filter: `;
  const parts: string[] = [];
  if (targetType) parts.push(`looking for ${targetType.replace('_', ' ')}`);
  if (detectedCity) parts.push(`in ${detectedCity}`);
  if (minQuantity) parts.push(`qty >= ${minQuantity}`);
  if (foodCategory) parts.push(`category: ${foodCategory}`);
  if (isUrgentOrToday) parts.push(`timeframe: urgent / today`);
  summary += parts.length > 0 ? parts.join(', ') : 'broad natural-language search';

  return {
    targetType,
    city: detectedCity,
    maxDistanceKm,
    foodCategory,
    minQuantity,
    status: isUrgentOrToday ? 'Available' : undefined,
    keywords: detectedKeywords,
    isUrgentOrToday,
    isAcceptingDonations: qLower.includes('monetary') || qLower.includes('donate money'),
    summaryInterpretation: summary
  };
}

/**
 * Extracts query intent with Gemini model `gemini-3.8-flash`
 */
async function parseQueryWithGemini(query: string, userRole?: string): Promise<ParsedQueryIntent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return ruleBasedQueryParser(query, userRole);
  }

  try {
    const ai = new GoogleGenAI();
    const prompt = `Analyze this user search query for PlateShare (Pakistan Food Redistribution & Charity Platform):
Query: "${query}"
Active User Role: ${userRole || 'Public/Guest'}

Extract search parameters strictly into JSON with fields:
- targetType: ("food_listings" | "ngos" | "donations" | "users" | "assistance_history" | "all")
- city: string or null (Pakistani city like Lahore, Abbottabad, Islamabad, Karachi, Rawalpindi, Peshawar, Quetta, Multan)
- province: string or null (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad)
- maxDistanceKm: number or null
- foodCategory: string or null ("Biryani & Rice", "Home Cooked Meals", "Curry & Gravy", "Bakery & Breads", "Dry Groceries & Ration", "Dairy & Beverages")
- minQuantity: number or null
- status: string or null ("Available", "Claimed", "Collected", "Completed")
- keywords: array of string keywords (dietary constraints like "vegetarian", dish names like "biryani", purpose like "homeless")
- isUrgentOrToday: boolean
- isAcceptingDonations: boolean
- summaryInterpretation: a concise 1-sentence plain English summary of what the user is seeking.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim();
    if (!text) {
      return ruleBasedQueryParser(query, userRole);
    }

    const parsed = JSON.parse(text);
    return {
      targetType: parsed.targetType || 'all',
      city: parsed.city || undefined,
      province: parsed.province || undefined,
      maxDistanceKm: parsed.maxDistanceKm ? Number(parsed.maxDistanceKm) : undefined,
      foodCategory: parsed.foodCategory || undefined,
      minQuantity: parsed.minQuantity ? Number(parsed.minQuantity) : undefined,
      status: parsed.status || undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      isUrgentOrToday: Boolean(parsed.isUrgentOrToday),
      isAcceptingDonations: Boolean(parsed.isAcceptingDonations),
      summaryInterpretation: parsed.summaryInterpretation || `Searching for ${query}`
    };
  } catch (err) {
    console.warn('Gemini query parsing fallback to rule parser:', err);
    return ruleBasedQueryParser(query, userRole);
  }
}

export const aiSearchService = {
  search: async (params: {
    query: string;
    currentUser?: SearchCurrentUser | undefined;
    clientCoordinates?: Coordinates;
    preferredCity?: string;
  }): Promise<SmartSearchResponse> => {
    const rawQuery = (params.query || '').trim();
    if (!rawQuery) {
      return {
        query: '',
        mode: 'RULE_BASED_FALLBACK',
        interpretation: 'Empty query',
        extractedFilters: {},
        totalResults: 0,
        results: [],
        suggestions: [
          'Find NGOs near Abbottabad that can collect 30 meal boxes today',
          'Show available cooked meals within 10 kilometres',
          'Find vegetarian food that expires today',
          'Find NGOs in Islamabad that support homeless people',
          'Find NGOs accepting monetary donations'
        ]
      };
    }

    const userRole = params.currentUser?.role;
    let intent: ParsedQueryIntent;
    let mode: 'AI_GEMINI' | 'RULE_BASED_FALLBACK' = 'RULE_BASED_FALLBACK';

    if (process.env.GEMINI_API_KEY) {
      intent = await parseQueryWithGemini(rawQuery, userRole);
      mode = 'AI_GEMINI';
    } else {
      intent = ruleBasedQueryParser(rawQuery, userRole);
      mode = 'RULE_BASED_FALLBACK';
    }

    // Apply explicit city override if client specified and query didn't specify
    if (!intent.city && params.preferredCity && params.preferredCity !== 'All Cities' && params.preferredCity !== 'Pakistan') {
      intent.city = params.preferredCity;
    }

    const db = getDb();
    const results: SmartSearchResultItem[] = [];

    // Reference coordinates for distance calculation
    const userCoords = params.clientCoordinates || 
                       params.currentUser?.coordinates || 
                       (intent.city ? getCoordinatesForCity(intent.city) : undefined);

    const queryLower = rawQuery.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    // -------------------------------------------------------------
    // SEARCH 1: FOOD LISTINGS
    // Accessible to: NGO, Restaurant (own), Admin, Public/Donor (masked)
    // -------------------------------------------------------------
    if (intent.targetType === 'food_listings' || intent.targetType === 'all') {
      for (const item of db.listings) {
        let score = 0;
        const reasons: string[] = [];

        // Visibility rules
        if (item.status === 'Draft' && item.donorId !== params.currentUser?.id && userRole !== 'Admin') {
          continue;
        }

        // City filter
        if (intent.city) {
          if (item.city?.toLowerCase() === intent.city.toLowerCase()) {
            score += 35;
            reasons.push(`Located in ${item.city}`);
          } else {
            // If explicit city was requested and doesn't match, heavily penalize or skip
            continue;
          }
        }

        // Distance filter
        let itemDistance: number | undefined = undefined;
        if (userCoords && item.coordinates) {
          itemDistance = calculateDistanceKm(
            userCoords.lat,
            userCoords.lng,
            item.coordinates.lat,
            item.coordinates.lng
          );
          if (intent.maxDistanceKm && itemDistance > intent.maxDistanceKm) {
            continue;
          }
          if (itemDistance <= 10) {
            score += 25;
            reasons.push(`Within ${itemDistance} km (${item.area || item.city})`);
          } else if (itemDistance <= 25) {
            score += 15;
            reasons.push(`${itemDistance} km away`);
          }
        }

        // Food Category
        if (intent.foodCategory) {
          if (item.foodCategory?.toLowerCase() === intent.foodCategory.toLowerCase()) {
            score += 25;
            reasons.push(`Category match: ${item.foodCategory}`);
          }
        }

        // Quantity
        const remaining = item.remainingQuantity ?? item.quantity;
        if (intent.minQuantity) {
          if (remaining >= intent.minQuantity) {
            score += 20;
            reasons.push(`Quantity ${remaining} ${item.unit} meets requirement (>= ${intent.minQuantity})`);
          } else {
            continue;
          }
        }

        // Status filter
        if (intent.status) {
          if (item.status === intent.status) {
            score += 15;
            reasons.push(`Status: ${item.status}`);
          }
        } else if (item.status === 'Available' || item.status === 'Matched') {
          score += 15;
          reasons.push(`Available for immediate collection`);
        }

        // Urgency / Today expiry
        if (intent.isUrgentOrToday && item.pickupDeadline) {
          const deadlineMs = new Date(item.pickupDeadline).getTime();
          const isToday = !isNaN(deadlineMs) && deadlineMs - Date.now() < 24 * 3600 * 1000 && deadlineMs > Date.now();
          if (isToday) {
            score += 20;
            reasons.push(`Expires today (${new Date(item.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
          }
        }

        // Keywords / Text relevance
        const textBlob = `${item.foodName} ${item.foodCategory} ${item.description} ${item.donorName} ${item.area}`.toLowerCase();
        for (const token of queryTokens) {
          if (textBlob.includes(token)) {
            score += 10;
          }
        }

        if (score >= 25) {
          results.push({
            type: 'listing',
            id: item.id,
            title: item.foodName,
            subtitle: `${item.quantity} ${item.unit} • ${item.donorName} (${item.donorRole})`,
            badge: item.status,
            city: item.city,
            area: item.area,
            distanceKm: itemDistance,
            score,
            matchReasons: reasons.length > 0 ? reasons : ['General surplus food match'],
            data: {
              ...item,
            }
          });
        }
      }
    }

    // -------------------------------------------------------------
    // SEARCH 2: VERIFIED NGOs & RELIEF ORGANIZATIONS
    // Accessible to: All roles (Restaurant finding NGOs, Donors, Admin)
    // -------------------------------------------------------------
    if (intent.targetType === 'ngos' || intent.targetType === 'all') {
      const ngos = db.users.filter(u => u.role === 'NGO');

      for (const ngo of ngos) {
        let score = 0;
        const reasons: string[] = [];

        // Verified status check
        const isVerified = ngo.verificationStatus === 'Verified' || ngo.verificationStatus === 'Approved';
        if (isVerified) {
          score += 20;
          reasons.push('Verified Registered NGO');
        }

        // City filter
        if (intent.city) {
          if (ngo.city?.toLowerCase() === intent.city.toLowerCase()) {
            score += 35;
            reasons.push(`Operates in ${ngo.city}`);
          } else {
            // Check service areas
            const servesCity = ngo.serviceAreas?.some(a => a.toLowerCase().includes(intent.city!.toLowerCase()));
            if (servesCity) {
              score += 25;
              reasons.push(`Service area covers ${intent.city}`);
            } else {
              continue;
            }
          }
        }

        // Capacity
        const capacity = ngo.capacity || 100;
        if (intent.minQuantity) {
          if (capacity >= intent.minQuantity) {
            score += 20;
            reasons.push(`Redistribution capacity (${capacity} meals/day) can handle ${intent.minQuantity} portions`);
          }
        }

        // Distance
        let ngoDistance: number | undefined = undefined;
        if (userCoords && ngo.coordinates) {
          ngoDistance = calculateDistanceKm(
            userCoords.lat,
            userCoords.lng,
            ngo.coordinates.lat,
            ngo.coordinates.lng
          );
          if (intent.maxDistanceKm && ngoDistance > intent.maxDistanceKm) {
            continue;
          }
          if (ngoDistance <= 15) {
            score += 20;
            reasons.push(`Located within ${ngoDistance} km`);
          }
        }

        // Purpose / Keywords (e.g. homeless, orphan, hunger, medical)
        const textBlob = `${ngo.organizationName} ${ngo.name} ${ngo.mission} ${ngo.bio} ${ngo.city}`.toLowerCase();
        for (const token of queryTokens) {
          if (textBlob.includes(token)) {
            score += 15;
            reasons.push(`Matches query keyword "${token}"`);
          }
        }

        // Monetary donations
        if (intent.isAcceptingDonations && isVerified) {
          score += 25;
          reasons.push('Accepts direct verified monetary contributions');
        }

        if (score >= 25) {
          results.push({
            type: 'ngo',
            id: ngo.id,
            title: ngo.organizationName || ngo.name,
            subtitle: `${ngo.city} • Capacity: ${capacity} meals/day • Reg: ${ngo.registrationNumber || 'Verified'}`,
            badge: ngo.verificationStatus,
            city: ngo.city,
            area: ngo.area,
            distanceKm: ngoDistance,
            score,
            matchReasons: reasons.length > 0 ? reasons : ['Verified organization match'],
            data: {
              id: ngo.id,
              name: ngo.organizationName || ngo.name,
              city: ngo.city,
              area: ngo.area,
              mission: ngo.mission,
              capacity: ngo.capacity,
              phone: ngo.phone,
              verificationStatus: ngo.verificationStatus,
              serviceAreas: ngo.serviceAreas
            }
          });
        }
      }
    }

    // -------------------------------------------------------------
    // SEARCH 3: FINANCIAL DONATIONS
    // Accessible to: Admin (all), Donor (own), NGO (own received)
    // -------------------------------------------------------------
    if (intent.targetType === 'donations' || (intent.targetType === 'all' && (userRole === 'Donor' || userRole === 'NGO' || userRole === 'Admin'))) {
      let candidateDonations = db.financialDonations;

      if (userRole === 'Donor') {
        candidateDonations = candidateDonations.filter(d => d.donorId === params.currentUser!.id);
      } else if (userRole === 'NGO') {
        candidateDonations = candidateDonations.filter(d => d.ngoId === params.currentUser!.id);
      } else if (userRole !== 'Admin') {
        candidateDonations = []; // Not visible to unauthenticated or other roles
      }

      for (const don of candidateDonations) {
        let score = 0;
        const reasons: string[] = [];

        // Status check (e.g. "completed donations", "pending")
        if (queryLower.includes('completed') || queryLower.includes('successful')) {
          if (don.status === 'Successful' || don.status === 'Completed') {
            score += 30;
            reasons.push('Verified completed contribution');
          }
        }

        // Timeframe (e.g. "this month")
        if (queryLower.includes('this month') && don.createdAt) {
          const d = new Date(don.createdAt);
          const now = new Date();
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            score += 25;
            reasons.push('Contributed this month');
          }
        }

        // Amount / Keywords
        const textBlob = `${don.receiptNumber} ${don.ngoName} ${don.donorName} ${don.campaignTitle || ''} ${don.paymentReference} ${don.amountPkr}`.toLowerCase();
        for (const token of queryTokens) {
          if (textBlob.includes(token)) {
            score += 15;
            reasons.push(`Contains "${token}"`);
          }
        }

        if (score >= 20 || candidateDonations.length <= 10) {
          results.push({
            type: 'donation',
            id: don.id,
            title: `PKR ${don.amountPkr.toLocaleString()} (${don.mealsFunded} meals)`,
            subtitle: `Recipient: ${don.ngoName} • Ref: ${don.receiptNumber}`,
            badge: don.status,
            city: don.city,
            score: score + 10,
            matchReasons: reasons.length > 0 ? reasons : ['Donation record match'],
            data: don
          });
        }
      }
    }

    // -------------------------------------------------------------
    // SEARCH 4: BENEFICIARY ASSISTANCE HISTORY
    // Accessible strictly to: Self Beneficiary, or Admin, or NGO for own registered cases
    // -------------------------------------------------------------
    if (intent.targetType === 'assistance_history' && userRole === 'Beneficiary') {
      const myId = params.currentUser!.id;
      const myAllocations = db.allocations.filter(a => a.beneficiaryId === myId && a.beneficiaryType === 'User');

      for (const alloc of myAllocations) {
        results.push({
          type: 'assistance',
          id: alloc.id,
          title: `${alloc.quantity} meals of "${alloc.foodName}"`,
          subtitle: `Prepared by ${alloc.ngoName} • Status: ${alloc.status}`,
          badge: alloc.status,
          city: alloc.city,
          score: 80,
          matchReasons: ['Your verified personal assistance history'],
          data: alloc
        });
      }
    }

    // Sort results by relevance score descending
    results.sort((a, b) => b.score - a.score);

    // Generate dynamic suggestions if few or no results found
    const suggestions: string[] = [];
    if (results.length === 0) {
      if (intent.city) {
        suggestions.push(`Search across All Pakistan instead of only ${intent.city}`);
      }
      if (intent.minQuantity && intent.minQuantity > 20) {
        suggestions.push(`Try a smaller portion size (e.g. 15-20 meals)`);
      }
      suggestions.push('Explore registered verified NGOs in Punjab and Khyber Pakhtunkhwa');
      suggestions.push('Check "Surplus Food" tab for freshly listed donations');
    }

    return {
      query: rawQuery,
      mode,
      interpretation: intent.summaryInterpretation,
      extractedFilters: {
        targetType: intent.targetType,
        city: intent.city,
        foodCategory: intent.foodCategory,
        minQuantity: intent.minQuantity,
        maxDistanceKm: intent.maxDistanceKm,
        status: intent.status,
        isUrgent: intent.isUrgentOrToday,
        keywords: intent.keywords
      },
      totalResults: results.length,
      results: results.slice(0, 30),
      suggestions
    };
  }
};
