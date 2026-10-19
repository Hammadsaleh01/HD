import { describe, it, expect } from 'vitest';
import { isValidStatusTransition, VALID_DONATION_TRANSITIONS, DonationStatus } from '../../shared/types.ts';

describe('Food Listing State Machine Transitions', () => {
  it('allows same status idempotently', () => {
    expect(isValidStatusTransition('Available', 'Available')).toBe(true);
    expect(isValidStatusTransition('Accepted', 'Accepted')).toBe(true);
  });

  it('permits valid linear lifecycle transitions', () => {
    expect(isValidStatusTransition('Draft', 'Available')).toBe(true);
    expect(isValidStatusTransition('Available', 'Accepted')).toBe(true);
    expect(isValidStatusTransition('Accepted', 'Pickup_Scheduled')).toBe(true);
    expect(isValidStatusTransition('Pickup_Scheduled', 'Picked_Up')).toBe(true);
    expect(isValidStatusTransition('Picked_Up', 'Completed')).toBe(true);
  });

  it('permits cancellation from early states', () => {
    expect(isValidStatusTransition('Draft', 'Cancelled')).toBe(true);
    expect(isValidStatusTransition('Available', 'Cancelled')).toBe(true);
    expect(isValidStatusTransition('Accepted', 'Cancelled')).toBe(true);
    expect(isValidStatusTransition('Pickup_Scheduled', 'Cancelled')).toBe(true);
  });

  it('rejects invalid status backwards jumps or illegal skips', () => {
    expect(isValidStatusTransition('Draft', 'Picked_Up')).toBe(false);
    expect(isValidStatusTransition('Available', 'Completed')).toBe(false);
    expect(isValidStatusTransition('Picked_Up', 'Available')).toBe(false);
    expect(isValidStatusTransition('Picked_Up', 'Accepted')).toBe(false);
  });

  it('enforces terminal states where no transitions are allowed', () => {
    const terminalStates: DonationStatus[] = ['Completed', 'Cancelled', 'Expired'];
    for (const state of terminalStates) {
      expect(VALID_DONATION_TRANSITIONS[state]).toEqual([]);
      expect(isValidStatusTransition(state, 'Available')).toBe(false);
      expect(isValidStatusTransition(state, 'Draft')).toBe(false);
    }
  });
});
