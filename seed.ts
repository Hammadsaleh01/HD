import fs from 'fs';
import path from 'path';
import { DatabaseSchema } from './schema.ts';
import { encryptCnic, hashCnic } from '../utils/crypto.ts';

// Pre-computed verified bcrypt password hashes:
// admin123:       $2b$10$hJrWfrBsN1c4R1sGr7mVKePUBRebxWfLCBulvn/zy7XZVQr2s74au
// restaurant123:  $2b$10$WYDIQZ6ifzKXHY2I6KImtecNRGo.FKOMCOU04xrrJ5/2mAWhtemCq
// ngo123:         $2b$10$U3AOl4/6jxR3gXHvBPkOxeJYMhfR3BUX6KGOskxKX2qgxZznxk9vq
// donor123:       $2b$10$LQ7FA3XKvqIwzkkqe210s.g6eTyuHLI7tIjL1iMiQlEWVriZX/LR6
// needy123:       $2b$10$fNCtI/8N8Y0j3Yj7JOKwqu2APOkhTjX.Nt0omD/INC9/ADwMFf942

export function getInitialSeedData(): DatabaseSchema {
  const benCnic = '0000000000001';
  const case1Cnic = '0000000000002';
  const case2Cnic = '0000000000003';

  return {
    platformSettings: {
      distributionPeriodMode: 'Daily',
      maxMealsPerPeriodPerBeneficiary: 25,
      defaultCountry: 'Pakistan',
      maxMatchingRadiusKm: 25,
      availableProvinces: [
        'Punjab',
        'Sindh',
        'Khyber Pakhtunkhwa',
        'Islamabad Capital Territory',
        'Balochistan',
        'Azad Jammu & Kashmir',
        'Gilgit-Baltistan'
      ]
    },
    users: [
      // 1. Central Admin (Islamabad)
      {
        id: 'admin-1',
        name: 'PlateShare National Administrator',
        email: 'admin@plateshare.org',
        phone: '03001234567',
        password: '$2b$10$hJrWfrBsN1c4R1sGr7mVKePUBRebxWfLCBulvn/zy7XZVQr2s74au', // admin123
        role: 'Admin',
        country: 'Pakistan',
        province: 'Islamabad Capital Territory',
        city: 'Islamabad',
        area: 'Blue Area',
        address: 'PlateShare National Operations, Evacuee Trust Complex, Blue Area, Islamabad',
        coordinates: { lat: 33.7180, lng: 73.0600 },
        verificationStatus: 'Verified',
        createdAt: '2026-06-01T10:00:00.000Z'
      },

      // 2. Abbottabad (KPK)
      {
        id: 'rest-1',
        name: 'Al-Shiraz Restaurant',
        email: 'alshiraz@abbottabad.pk',
        phone: '03129876543',
        password: '$2b$10$WYDIQZ6ifzKXHY2I6KImtecNRGo.FKOMCOU04xrrJ5/2mAWhtemCq', // restaurant123
        role: 'Restaurant',
        country: 'Pakistan',
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'Supply',
        address: 'Main Karakoram Highway, Supply Bazar, Abbottabad',
        coordinates: { lat: 34.1780, lng: 73.2280 },
        verificationStatus: 'Verified',
        operatingHours: '11:00 AM - 11:30 PM',
        contactPerson: 'Sardar Shiraz Ahmed',
        foodCategories: ['Biryani & Rice', 'Cooked Meals', 'Bread & Naan'],
        createdAt: '2026-06-10T10:00:00.000Z'
      },
      {
        id: 'ngo-1',
        name: 'Ehsaas Foundation Abbottabad',
        email: 'ehsaas@ngo.org.pk',
        phone: '03451122334',
        password: '$2b$10$U3AOl4/6jxR3gXHvBPkOxeJYMhfR3BUX6KGOskxKX2qgxZznxk9vq', // ngo123
        role: 'NGO',
        country: 'Pakistan',
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'Jadoon Plaza',
        address: 'Suite 402, Jadoon Plaza Phase 2, Mandian, Abbottabad',
        coordinates: { lat: 34.1950, lng: 73.2410 },
        verificationStatus: 'Verified',
        organizationName: 'Ehsaas Foundation Abbottabad',
        registrationNumber: 'KPK-SWD-ATD-2024-089',
        capacity: 120,
        available: true,
        serviceAreas: ['Supply', 'Mandian', 'Jadoon Plaza', 'Cantt', 'Nawanshehr'],
        contactPerson: 'Qazi Farooq',
        createdAt: '2026-06-08T09:00:00.000Z'
      },
      {
        id: 'donor-1',
        name: 'Tariq Mehmood Khan',
        email: 'tariq.donor@gmail.com',
        phone: '03335566778',
        password: '$2b$10$LQ7FA3XKvqIwzkkqe210s.g6eTyuHLI7tIjL1iMiQlEWVriZX/LR6', // donor123
        role: 'Donor',
        country: 'Pakistan',
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'PMA Kakul Road',
        address: 'House 14, PMA Kakul Road, Abbottabad',
        coordinates: { lat: 34.1880, lng: 73.2550 },
        verificationStatus: 'Verified',
        createdAt: '2026-06-15T11:00:00.000Z'
      },
      {
        id: 'ben-digital-1',
        name: 'Rashid Mehmood',
        email: 'rashid.beneficiary@gmail.com',
        phone: '03159988776',
        password: '$2b$10$fNCtI/8N8Y0j3Yj7JOKwqu2APOkhTjX.Nt0omD/INC9/ADwMFf942', // needy123
        role: 'Beneficiary',
        country: 'Pakistan',
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'Supply',
        address: 'Mohallah Supply, Near Govt High School, Abbottabad',
        coordinates: { lat: 34.1750, lng: 73.2250 },
        // Beneficiary verified after administrator review
        verificationStatus: 'Verified',
        cnic: encryptCnic(benCnic),
        cnicHash: hashCnic(benCnic),
        householdSize: 6,
        urgency: 'High',
        eligibilityStatus: 'Verified',
        hasSmartphone: true,
        createdAt: '2026-06-20T12:00:00.000Z'
      },

      // 3. Lahore (Punjab)
      {
        id: 'rest-lahore',
        name: 'Savour Foods Lahore',
        email: 'savour@lahore.pk',
        phone: '03211122334',
        password: '$2b$10$WYDIQZ6ifzKXHY2I6KImtecNRGo.FKOMCOU04xrrJ5/2mAWhtemCq', // restaurant123
        role: 'Restaurant',
        country: 'Pakistan',
        province: 'Punjab',
        city: 'Lahore',
        area: 'Gulberg',
        address: 'Main Boulevard, Gulberg III, Lahore',
        coordinates: { lat: 31.5204, lng: 74.3587 },
        verificationStatus: 'Verified',
        operatingHours: '12:00 PM - 1:00 AM',
        contactPerson: 'Mian Tariq',
        foodCategories: ['Biryani & Rice', 'Cooked Meals'],
        createdAt: '2026-06-12T10:00:00.000Z'
      },
      {
        id: 'ngo-lahore',
        name: 'Al-Khidmat Foundation Lahore',
        email: 'alkhidmat@lahore.ngo.pk',
        phone: '03214455667',
        password: '$2b$10$U3AOl4/6jxR3gXHvBPkOxeJYMhfR3BUX6KGOskxKX2qgxZznxk9vq', // ngo123
        role: 'NGO',
        country: 'Pakistan',
        province: 'Punjab',
        city: 'Lahore',
        area: 'Model Town',
        address: 'Al-Khidmat Complex, Block H, Model Town, Lahore',
        coordinates: { lat: 31.4850, lng: 74.3200 },
        verificationStatus: 'Verified',
        organizationName: 'Al-Khidmat Foundation Lahore',
        registrationNumber: 'PB-SW-LHR-2031',
        capacity: 350,
        available: true,
        serviceAreas: ['Gulberg', 'Model Town', 'Johar Town', 'DHA Phase 5'],
        contactPerson: 'Dr. Zafar Iqbal',
        createdAt: '2026-06-11T09:00:00.000Z'
      },

      // 4. Karachi (Sindh)
      {
        id: 'rest-karachi',
        name: 'Lal Qila Restaurant Karachi',
        email: 'lalqila@karachi.pk',
        phone: '03219876543',
        password: '$2b$10$WYDIQZ6ifzKXHY2I6KImtecNRGo.FKOMCOU04xrrJ5/2mAWhtemCq', // restaurant123
        role: 'Restaurant',
        country: 'Pakistan',
        province: 'Sindh',
        city: 'Karachi',
        area: 'PECHS',
        address: 'Main Shahrah-e-Faisal, PECHS Block 6, Karachi',
        coordinates: { lat: 24.8607, lng: 67.0600 },
        verificationStatus: 'Verified',
        operatingHours: '12:30 PM - 11:30 PM',
        contactPerson: 'Farhan Siddiqui',
        foodCategories: ['Cooked Meals', 'Biryani & Rice', 'Bakery'],
        createdAt: '2026-06-15T14:00:00.000Z'
      },
      {
        id: 'ngo-karachi',
        name: 'Saylani Welfare International',
        email: 'saylani@karachi.ngo.pk',
        phone: '03111222333',
        password: '$2b$10$U3AOl4/6jxR3gXHvBPkOxeJYMhfR3BUX6KGOskxKX2qgxZznxk9vq', // ngo123
        role: 'NGO',
        country: 'Pakistan',
        province: 'Sindh',
        city: 'Karachi',
        area: 'PECHS',
        address: 'Saylani Head Office, 4th Floor, A-25, Bahadurabad, Karachi',
        coordinates: { lat: 24.8820, lng: 67.0690 },
        verificationStatus: 'Verified',
        organizationName: 'Saylani Welfare International',
        registrationNumber: 'SD-SW-KHI-0044',
        capacity: 800,
        available: true,
        serviceAreas: ['PECHS', 'Clifton', 'Gulshan-e-Iqbal', 'Saddar'],
        contactPerson: 'Maulana Bashir Farooqi',
        createdAt: '2026-06-05T08:00:00.000Z'
      }
    ],
    listings: [
      {
        id: 'listing-1',
        donorId: 'rest-1',
        donorName: 'Al-Shiraz Restaurant',
        donorRole: 'Restaurant',
        foodName: 'Chicken Biryani & Roghani Naan',
        foodCategory: 'Biryani & Rice',
        quantity: 30,
        remainingQuantity: 30,
        allocatedQuantity: 0,
        unit: 'meals',
        description: 'Hygienically packed noon buffet surplus. 30 complete warm lunch boxes with chicken biryani, salad, and fresh roghani naan.',
        preparationTime: '1:00 PM Today',
        availableTime: '3:00 PM Today',
        pickupDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        storageCondition: 'Hot/Insulated',
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'Supply',
        pickupAddress: 'Main Karakoram Highway, Supply Bazar, Abbottabad',
        coordinates: { lat: 34.1780, lng: 73.2280 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: new Date().toISOString()
      },
      {
        id: 'listing-lhr-1',
        donorId: 'rest-lahore',
        donorName: 'Savour Foods Lahore',
        donorRole: 'Restaurant',
        foodName: 'Chicken Pulao with Shami Kababs',
        foodCategory: 'Biryani & Rice',
        quantity: 50,
        remainingQuantity: 50,
        allocatedQuantity: 0,
        unit: 'meals',
        description: 'Hot boxed meals from luncheon banquet. Fully sealed containers with fresh raita cups.',
        preparationTime: '1:30 PM Today',
        availableTime: '3:30 PM Today',
        pickupDeadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        storageCondition: 'Hot/Insulated',
        province: 'Punjab',
        city: 'Lahore',
        area: 'Gulberg',
        pickupAddress: 'Main Boulevard, Gulberg III, Lahore',
        coordinates: { lat: 31.5204, lng: 74.3587 },
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: new Date().toISOString()
      }
    ],
    assistanceCases: [
      {
        id: 'case-atd-1',
        name: 'Mohammad Shafi',
        phone: '03429811223',
        cnic: encryptCnic(case1Cnic),
        cnicHash: hashCnic(case1Cnic),
        province: 'Khyber Pakhtunkhwa',
        city: 'Abbottabad',
        area: 'Mandian',
        address: 'House 88, Mohallah Bilal, Mandian, Abbottabad',
        householdSize: 5,
        urgency: 'High',
        eligibilityStatus: 'Verified',
        hasSmartphone: false,
        registeredByNgoId: 'ngo-1',
        registeredByNgoName: 'Ehsaas Foundation Abbottabad',
        createdAt: '2026-06-25T10:00:00.000Z'
      },
      {
        id: 'case-lhr-1',
        name: 'Abdul Rehman',
        phone: '03224455889',
        cnic: encryptCnic(case2Cnic),
        cnicHash: hashCnic(case2Cnic),
        province: 'Punjab',
        city: 'Lahore',
        area: 'Model Town',
        address: 'Basti Qureshian, Katchi Abadi, Model Town, Lahore',
        householdSize: 7,
        urgency: 'High',
        eligibilityStatus: 'Verified',
        hasSmartphone: false,
        registeredByNgoId: 'ngo-lahore',
        registeredByNgoName: 'Al-Khidmat Foundation Lahore',
        createdAt: '2026-07-01T11:00:00.000Z'
      }
    ],
    allocations: [],
    distributions: [],
    financialDonations: [
      {
        id: 'don-1',
        donorId: 'donor-1',
        donorName: 'Tariq Mehmood Khan',
        donorEmail: 'tariq.donor@gmail.com',
        ngoId: 'ngo-1',
        ngoName: 'Ehsaas Foundation Abbottabad',
        campaignId: 'camp-1',
        campaignTitle: 'Hazara Winter Warm Meal Drive',
        amountPkr: 25000,
        mealsFunded: 250,
        paymentMethod: 'Simulated_EasyPaisa',
        paymentReference: 'EP-DEMO-98231',
        paymentMode: 'Simulated_Demonstration_Sandbox',
        status: 'Successful',
        receiptNumber: 'REC-2026-00101',
        city: 'Abbottabad',
        notes: 'Zakat contribution for winter relief.',
        createdAt: '2026-10-01T14:30:00.000Z'
      }
    ],
    campaignExpenses: [
      {
        id: 'exp-1',
        ngoId: 'ngo-1',
        ngoName: 'Ehsaas Foundation Abbottabad',
        campaignId: 'camp-1',
        campaignTitle: 'Hazara Winter Warm Meal Drive',
        title: 'Bulk Rice & Poultry Purchase for 120 Meals',
        category: 'Food_Purchase',
        amountPkr: 12000,
        mealsProvided: 120,
        date: '2026-10-03',
        vendorName: 'Madina Grain Merchants, Mandian',
        notes: 'Purchased 20kg Basmati and 15kg chicken for Saturday distribution.',
        createdAt: '2026-10-03T16:00:00.000Z'
      }
    ],
    campaigns: [
      {
        id: 'camp-1',
        ngoId: 'ngo-1',
        ngoName: 'Ehsaas Foundation Abbottabad',
        ngoCity: 'Abbottabad',
        title: 'Hazara Winter Warm Meal Drive',
        description: 'Providing daily hot nutritious cooked dinner boxes for 200 daily-wage families and shelter homes across Abbottabad and Havelian.',
        targetAmountPkr: 250000,
        raisedAmountPkr: 25000,
        targetMeals: 2500,
        budgetBreakdown: 'PKR 100/meal includes rice, chicken/lentils, roghani naan, and eco-friendly foil packaging.',
        location: 'Abbottabad, Mansehra Road, Mandian',
        endDate: '2026-11-30',
        status: 'Active',
        imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60',
        createdAt: '2026-09-15T10:00:00.000Z'
      }
    ],
    beneficiaryApplications: [],
    complaints: [],
    auditLogs: [
      {
        id: 'audit-1',
        actorId: 'admin-1',
        actorName: 'System Initializer',
        actorRole: 'Admin',
        action: 'PLATFORM_INITIALIZATION',
        details: 'PlateShare authoritative database initialized with AES-256-GCM encrypted PII and bcrypt security.',
        timestamp: new Date().toISOString()
      }
    ],
    notifications: []
  };
}

export function seedDatabase(targetPath?: string): void {
  const dbFile = targetPath || path.join(process.cwd(), 'plateshare_db.json');
  const initial = getInitialSeedData();
  fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), 'utf-8');
  console.log(`PlateShare database successfully seeded at ${dbFile}`);
}

// Execute standalone if called directly via tsx
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
}
