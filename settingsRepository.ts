import { getDb, persistDb } from '../store.ts';
import { PlatformSettings, PublicPlatformSettings } from '@shared/types.ts';

export const settingsRepository = {
  getSettings: async (): Promise<PlatformSettings> => {
    const db = getDb();
    return db.platformSettings;
  },

  getPublicSettings: async (): Promise<PublicPlatformSettings> => {
    const db = getDb();
    return {
      distributionPeriodMode: db.platformSettings.distributionPeriodMode,
      defaultCountry: db.platformSettings.defaultCountry,
      availableProvinces: db.platformSettings.availableProvinces
    };
  },

  updateSettings: async (updates: Partial<PlatformSettings>): Promise<PlatformSettings> => {
    const db = getDb();
    db.platformSettings = {
      ...db.platformSettings,
      ...updates
    };
    await persistDb();
    return db.platformSettings;
  }
};
