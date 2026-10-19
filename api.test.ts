import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../backend/src/app.ts';
import { initStore } from '../../backend/src/database/store.ts';

describe('PlateShare Platform End-to-End API Integration', () => {
  const app = createExpressApp();

  beforeAll(() => {
    initStore();
  });

  // 1. PUBLIC ENDPOINTS & SECURITY
  describe('Public vs Protected Endpoints', () => {
    it('GET /api/locations returns Pakistan cities and provinces without auth', async () => {
      const res = await request(app).get('/api/locations');
      expect(res.status).toBe(200);
      expect(res.body.provinces).toBeDefined();
      expect(Array.isArray(res.body.provinces)).toBe(true);
    });

    it('GET /api/settings/public is accessible publicly', async () => {
      const res = await request(app).get('/api/settings/public');
      expect(res.status).toBe(200);
      expect(res.body.settings.defaultCountry).toBe('Pakistan');
    });

    it('GET /api/listings strips sensitive fields and matched NGO internals (Phase 1.2)', async () => {
      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(200);
      expect(res.body.listings).toBeDefined();
      for (const listing of res.body.listings) {
        expect(listing.matchedNgos).toBeUndefined();
      }
    });
  });

  // 2. AUTHENTICATION LIFECYCLE
  describe('Authentication Lifecycle', () => {
    const testBeneficiaryEmail = `test.bene.${Date.now()}.${Math.floor(Math.random() * 1000)}@plateshare.org`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const testCnic = `35201-765${randomNum}-1`;
    let beneToken = '';

    it('registers Beneficiary with Pending verification status (Phase 1.3)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Tariq Test Beneficiary',
          email: testBeneficiaryEmail,
          password: 'Password123!',
          phone: '+92 300 9876543',
          role: 'Beneficiary',
          city: 'Lahore',
          area: 'Gulberg',
          cnic: testCnic
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.user).toBeDefined();
      expect(regRes.body.user.role).toBe('Beneficiary');
      // Beneficiary MUST start as Pending / Under_Review, never auto-verified!
      expect(['Pending', 'Under_Review']).toContain(regRes.body.user.verificationStatus);
      expect(regRes.body.token).toBeDefined();
      beneToken = regRes.body.token;
    });

    it('logs in with email and password only (no OTP step)', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testBeneficiaryEmail, password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    it('forgot-password returns a generic message and never leaks a token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testBeneficiaryEmail });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(JSON.stringify(res.body)).not.toMatch(/token/i);
    });

    it('retrieves current authenticated user profile via /auth/me with masked CNIC', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${beneToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(testBeneficiaryEmail);
      expect(meRes.body.user.cnic).toMatch(/^\*{4}-\*{7}\d{4}$/); // Masked format
    });

    it('changes password securely requiring correct current password', async () => {
      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${beneToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!'
        });

      expect(changeRes.status).toBe(200);

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testBeneficiaryEmail,
          password: 'NewPassword456!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    it('returns generic response for forgot-password without leaking reset token (Phase 1.1)', async () => {
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testBeneficiaryEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.resetToken).toBeUndefined(); // Never leaked!
      expect(forgotRes.body.message).toContain('If an account with that email exists');
    });
  });

  // 3. ROLE-BASED ACCESS CONTROL & PERMISSION REJECTIONS
  describe('RBAC Authorization Guards', () => {
    let donorToken = '';

    beforeAll(async () => {
      // Login as demo donor with seed password 'donor123'
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tariq.donor@gmail.com',
          password: 'donor123'
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      donorToken = loginRes.body.token;
    });

    it('rejects Donor attempting to claim surplus food listing with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/listings/listing-savour-biryani-01/accept')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('rejects Non-Admin trying to access admin stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });
  });

  // 4. SURPLUS FOOD DONATION LIFECYCLE
  describe('Complete Food Surplus & Handover Lifecycle', () => {
    let restaurantToken = '';
    let ngoToken = '';
    let listingId = '';

    beforeAll(async () => {
      // Restaurant login (Savour Foods Lahore) with 'restaurant123'
      const resLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'savour@lahore.pk',
          password: 'restaurant123'
        });
      expect(resLogin.status).toBe(200);
      restaurantToken = resLogin.body.token;

      // NGO login (Al-Khidmat Foundation Lahore) with 'ngo123'
      const ngoLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alkhidmat@lahore.ngo.pk',
          password: 'ngo123'
        });
      expect(ngoLogin.status).toBe(200);
      ngoToken = ngoLogin.body.token;
    });

    it('1. Restaurant creates new surplus food donation', async () => {
      const createRes = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({
          foodName: 'Chicken Pulao Surplus Batch',
          foodCategory: 'Biryani & Rice',
          quantity: 45,
          unit: 'meals',
          description: 'Hot insulated banquet trays',
          pickupDeadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          city: 'Lahore',
          area: 'Gulberg',
          pickupAddress: 'Main Boulevard Gulberg III'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.listing).toBeDefined();
      expect(createRes.body.listing.status).toBe('Available');
      listingId = createRes.body.listing.id;
    });

    it('2. Verified NGO accepts the donation listing', async () => {
      const acceptRes = await request(app)
        .post(`/api/listings/${listingId}/accept`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.listing.status).toBe('Accepted');
    });

    it('3. NGO schedules pickup (no OTP is generated)', async () => {
      const schedRes = await request(app)
        .post(`/api/listings/${listingId}/schedule-pickup`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          scheduledTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString()
        });

      expect(schedRes.status).toBe(200);
      expect(schedRes.body.listing.status).toBe('Pickup_Scheduled');
      expect(schedRes.body.otp).toBeUndefined();
      expect(schedRes.body.listing.pickupOtp).toBeUndefined();
    });

    it('4. Claiming NGO cannot confirm its own pickup', async () => {
      const ngoConfirm = await request(app)
        .post(`/api/listings/${listingId}/confirm-handover`)
        .set('Authorization', `Bearer ${ngoToken}`);
      expect(ngoConfirm.status).toBe(403);

      const ngoStatus = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ status: 'Collected' });
      expect(ngoStatus.status).toBe(403);
    });

    it('5. Restaurant confirms handover and status advances to Collected', async () => {
      const confirmRes = await request(app)
        .post(`/api/listings/${listingId}/confirm-handover`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.listing.status).toBe('Collected');
    });

    it('6. Confirming the same handover twice is rejected', async () => {
      const again = await request(app)
        .post(`/api/listings/${listingId}/confirm-handover`)
        .set('Authorization', `Bearer ${restaurantToken}`);
      expect(again.status).toBe(400);
    });
  });
});
