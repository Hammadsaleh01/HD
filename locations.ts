export interface CityArea {
  name: string;
  lat: number;
  lng: number;
}

export interface CityData {
  name: string;
  province: string;
  district: string;
  lat: number;
  lng: number;
  areas: string[];
}

export interface ProvinceData {
  name: string;
  shortName: string;
  cities: CityData[];
}

// Bounding box for Pakistan geographical territory
export const PAKISTAN_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLng: 60.5,
  maxLng: 77.5,
};

export function isInsidePakistan(lat: number, lng: number): boolean {
  return (
    lat >= PAKISTAN_BOUNDS.minLat &&
    lat <= PAKISTAN_BOUNDS.maxLat &&
    lng >= PAKISTAN_BOUNDS.minLng &&
    lng <= PAKISTAN_BOUNDS.maxLng
  );
}

export const RAW_PAKISTAN_PROVINCES: ProvinceData[] = [
  {
    name: 'Punjab',
    shortName: 'PB',
    cities: [
      {
        name: 'Lahore',
        province: 'Punjab',
        district: 'Lahore',
        lat: 31.5204,
        lng: 74.3587,
        areas: ['Gulberg', 'DHA Phase 5', 'Model Town', 'Johar Town', 'Mall Road', 'Cantt', 'Bahria Town']
      },
      {
        name: 'Rawalpindi',
        province: 'Punjab',
        district: 'Rawalpindi',
        lat: 33.5984,
        lng: 73.0441,
        areas: ['Saddar', 'Bahria Town Phase 4', 'Satellite Town', 'Westridge', 'Chaklala Scheme III']
      },
      {
        name: 'Faisalabad',
        province: 'Punjab',
        district: 'Faisalabad',
        lat: 31.4504,
        lng: 73.1350,
        areas: ['D Ground', 'Peoples Colony', 'Madina Town', 'Clock Tower Bazar', 'Kohinoor City']
      },
      {
        name: 'Multan',
        province: 'Punjab',
        district: 'Multan',
        lat: 30.1575,
        lng: 71.5249,
        areas: ['Gulgasht Colony', 'Cantt', 'Shah Rukn-e-Alam', 'Bosan Road', 'New Multan']
      },
      {
        name: 'Gujranwala',
        province: 'Punjab',
        district: 'Gujranwala',
        lat: 32.1877,
        lng: 74.1945,
        areas: ['Model Town', 'DC Colony', 'Rahwali Cantt', 'Peoples Colony', 'Wapda Town']
      },
      {
        name: 'Sialkot',
        province: 'Punjab',
        district: 'Sialkot',
        lat: 32.4945,
        lng: 74.5229,
        areas: ['Cantt', 'Paris Road', 'Model Town', 'Small Industrial Estate', 'Ugoki']
      }
    ]
  },
  {
    name: 'Sindh',
    shortName: 'SD',
    cities: [
      {
        name: 'Karachi',
        province: 'Sindh',
        district: 'Karachi Central',
        lat: 24.8607,
        lng: 67.0011,
        areas: ['Clifton', 'DHA Phase 6', 'Gulshan-e-Iqbal', 'PECHS', 'North Nazimabad', 'Saddar', 'Bahria Town Karachi']
      },
      {
        name: 'Hyderabad',
        province: 'Sindh',
        district: 'Hyderabad',
        lat: 25.3960,
        lng: 68.3578,
        areas: ['Latifabad Unit 7', 'Qasimabad', 'Saddar Bazar', 'Auto Bhan Road', 'Citizen Colony']
      },
      {
        name: 'Sukkur',
        province: 'Sindh',
        district: 'Sukkur',
        lat: 27.7052,
        lng: 68.8574,
        areas: ['Military Road', 'Minara Road', 'Barrage Colony', 'New Pind']
      }
    ]
  },
  {
    name: 'Khyber Pakhtunkhwa',
    shortName: 'KP',
    cities: [
      {
        name: 'Peshawar',
        province: 'Khyber Pakhtunkhwa',
        district: 'Peshawar',
        lat: 34.0151,
        lng: 71.5249,
        areas: ['University Town', 'Hayatabad Phase 3', 'Cantt', 'Saddar', 'Ring Road']
      },
      {
        name: 'Abbottabad',
        province: 'Khyber Pakhtunkhwa',
        district: 'Abbottabad',
        lat: 34.1688,
        lng: 73.2215,
        areas: ['Supply', 'Mandian', 'Jadoon Plaza', 'Cantt', 'Nawanshehr', 'Kakul Road']
      },
      {
        name: 'Mardan',
        province: 'Khyber Pakhtunkhwa',
        district: 'Mardan',
        lat: 34.1989,
        lng: 72.0404,
        areas: ['Cantt', 'Baghsada', 'Sheikh Maltoon Town', 'Bank Road']
      }
    ]
  },
  {
    name: 'Islamabad Capital Territory',
    shortName: 'ICT',
    cities: [
      {
        name: 'Islamabad',
        province: 'Islamabad Capital Territory',
        district: 'Islamabad',
        lat: 33.6844,
        lng: 73.0479,
        areas: ['F-6', 'F-7', 'F-10', 'G-9', 'G-11', 'Blue Area', 'Bahria Town Phase 7', 'DHA Phase 2']
      }
    ]
  },
  {
    name: 'Balochistan',
    shortName: 'BA',
    cities: [
      {
        name: 'Quetta',
        province: 'Balochistan',
        district: 'Quetta',
        lat: 30.1798,
        lng: 66.9750,
        areas: ['Cantt', 'Jinnah Road', 'Zarghoon Road', 'Satellite Town', 'Samungli Road']
      },
      {
        name: 'Gwadar',
        province: 'Balochistan',
        district: 'Gwadar',
        lat: 25.1264,
        lng: 62.3225,
        areas: ['Port Area', 'Airport Road', 'Marine Drive', 'New Town']
      }
    ]
  },
  {
    name: 'Azad Jammu & Kashmir',
    shortName: 'AJK',
    cities: [
      {
        name: 'Muzaffarabad',
        province: 'Azad Jammu & Kashmir',
        district: 'Muzaffarabad',
        lat: 34.3595,
        lng: 73.4718,
        areas: ['Domel', 'Plate', 'Upper Chattar', 'Lower Chattar']
      },
      {
        name: 'Mirpur',
        province: 'Azad Jammu & Kashmir',
        district: 'Mirpur',
        lat: 33.1478,
        lng: 73.7519,
        areas: ['Sector F-1', 'Sector B-3', 'Chowk Shaheedan', 'Allama Iqbal Road']
      }
    ]
  },
  {
    name: 'Gilgit-Baltistan',
    shortName: 'GB',
    cities: [
      {
        name: 'Gilgit',
        province: 'Gilgit-Baltistan',
        district: 'Gilgit',
        lat: 35.9208,
        lng: 74.3089,
        areas: ['Jutial', 'Airport Road', 'Nagar Colony', 'Cantt Bazar']
      },
      {
        name: 'Skardu',
        province: 'Gilgit-Baltistan',
        district: 'Skardu',
        lat: 35.2971,
        lng: 75.6333,
        areas: ['Main Bazar', 'Sadpara Road', 'Airport Area', 'Hussainabad']
      }
    ]
  }
];

export const PAKISTAN_PROVINCES: ProvinceData[] = RAW_PAKISTAN_PROVINCES;

export const ALL_PAKISTAN_CITIES: CityData[] = RAW_PAKISTAN_PROVINCES.flatMap(p => p.cities);

// Area-level coordinate offsets for finer distance calculations
export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Lahore
  'Gulberg': { lat: 31.5204, lng: 74.3587 },
  'DHA Phase 5': { lat: 31.4673, lng: 74.4095 },
  'Model Town': { lat: 31.4850, lng: 74.3200 },
  'Johar Town': { lat: 31.4697, lng: 74.2728 },
  // Karachi
  'Clifton': { lat: 24.8138, lng: 67.0299 },
  'DHA Phase 6': { lat: 24.7937, lng: 67.0645 },
  'PECHS': { lat: 24.8607, lng: 67.0600 },
  'Gulshan-e-Iqbal': { lat: 24.9180, lng: 67.0971 },
  // Islamabad
  'Blue Area': { lat: 33.7180, lng: 73.0600 },
  'F-6': { lat: 33.7297, lng: 73.0746 },
  'F-7': { lat: 33.7215, lng: 73.0532 },
  'F-10': { lat: 33.6934, lng: 73.0118 },
  // Abbottabad
  'Supply': { lat: 34.1780, lng: 73.2280 },
  'Mandian': { lat: 34.1950, lng: 73.2410 },
  'Jadoon Plaza': { lat: 34.1920, lng: 73.2380 },
  'Cantt': { lat: 34.1620, lng: 73.2180 }
};

export function getCoordinatesForCity(cityName: string, areaName?: string): { lat: number; lng: number } {
  if (areaName && AREA_COORDINATES[areaName]) {
    return AREA_COORDINATES[areaName];
  }
  const clean = (cityName || '').toLowerCase().trim();
  const found = ALL_PAKISTAN_CITIES.find(c => c.name.toLowerCase() === clean);
  if (found) {
    return { lat: found.lat, lng: found.lng };
  }
  return { lat: 31.5204, lng: 74.3587 }; // Default Lahore center
}

export function getCityDetails(cityName: string): CityData | undefined {
  const clean = (cityName || '').toLowerCase().trim();
  return ALL_PAKISTAN_CITIES.find(c => c.name.toLowerCase() === clean);
}
