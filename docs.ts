import { Request, Response } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PlateShare Pakistan API',
    version: '2.0.0',
    description: 'Comprehensive REST API documentation for the PlateShare surplus food donation ecosystem connecting Restaurants, NGOs, Donors, and Beneficiaries across Pakistan.'
  },
  servers: [
    { url: '/api', description: 'Current Server Environment' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Invalid request data' },
              details: { type: 'array', items: { type: 'object' } }
            },
            required: ['code', 'message']
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['Admin', 'NGO', 'Restaurant', 'Donor', 'Beneficiary'] },
          verificationStatus: { type: 'string' },
          city: { type: 'string' },
          area: { type: 'string' },
          address: { type: 'string' }
        }
      },
      FoodListing: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foodName: { type: 'string' },
          foodCategory: { type: 'string' },
          quantity: { type: 'number' },
          remainingQuantity: { type: 'number' },
          unit: { type: 'string', enum: ['meals', 'kg', 'packs'] },
          pickupAddress: { type: 'string' },
          pickupDeadline: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['Available', 'Accepted', 'Pickup_Scheduled', 'Picked_Up', 'Distributed', 'Completed', 'Cancelled', 'Expired'] }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new account (Beneficiaries start as Pending/Under_Review)',
        responses: { '201': { description: 'Registration successful' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password (enforces 5-attempt lockout for 15 minutes)',
        responses: { '200': { description: 'Login successful with JWT token' } }
      }
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Secure password reset request (generic response, token logged in dev only)',
        responses: { '200': { description: 'Generic delivery confirmation' } }
      }
    },
    '/auth/reset-password': {
      post: {
        summary: 'Confirm password reset using single-use SHA-256 hashed token',
        responses: { '200': { description: 'Password reset completed' } }
      }
    },
    '/listings': {
      get: {
        summary: 'Get public surplus food listings (internals stripped)',
        responses: { '200': { description: 'List of sanitized public listings' } }
      },
      post: {
        summary: 'Create food donation (Verified Restaurants and verified Donors)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Listing published' } }
      }
    },
    '/listings/{id}/schedule-pickup': {
      post: {
        summary: 'NGO schedules pickup for a claimed listing',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Pickup scheduled' } }
      }
    },
    '/listings/{id}/confirm-handover': {
      post: {
        summary: 'Restaurant/donor (or Admin) confirms the NGO collected the food; status becomes Collected',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Handover confirmed' } }
      }
    },
    '/allocations/confirm': {
      post: {
        summary: 'Confirm meal allocation receipt (beneficiary, distributing NGO, or Admin only)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Receipt confirmed and distribution recorded' } }
      }
    },
    '/donations/ngo': {
      post: {
        summary: 'Financial contribution to verified NGO (simulated demonstration sandbox)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Donation receipt generated' } }
      }
    },
    '/settings/public': {
      get: {
        summary: 'Get public operational platform settings (provinces, period mode)',
        responses: { '200': { description: 'Public settings' } }
      }
    }
  }
};

export function renderDocsHtml(spec: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PlateShare API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #FAF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .topbar { display: none; }
    .swagger-ui .info .title { color: #176B45; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

export function docsHandler(req: Request, res: Response) {
  if (req.path.endsWith('/spec.json') || req.headers.accept?.includes('application/json')) {
    return res.status(200).json(openApiSpec);
  }
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(renderDocsHtml(openApiSpec));
}
