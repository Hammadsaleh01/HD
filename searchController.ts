import { Request, Response } from 'express';
import { aiSearchService } from '../services/aiSearchService.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const searchController = {
  smartSearch: async (req: Request | AuthenticatedRequest, res: Response) => {
    const { query, preferredCity, clientCoordinates } = req.body;
    const currentUser = (req as AuthenticatedRequest).user;

    const results = await aiSearchService.search({
      query: String(query || ''),
      currentUser,
      clientCoordinates,
      preferredCity
    });

    res.status(200).json(results);
  }
};
