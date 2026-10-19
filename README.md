# PlateShare Flutter Mobile Client

This directory contains the cross-platform Flutter application code for the **PlateShare** surplus food donation ecosystem in Pakistan.

## Architecture

- **Models (`lib/models/`)**: Strongly typed data models representing PlateShare users, surplus food listings, notifications, and verification statuses.
- **Services (`lib/services/`)**: REST API client with automatic JWT token management via `shared_preferences` and uniform error parsing matching the backend's `{ error: { code, message } }` contract.
- **Providers (`lib/providers/`)**: State management classes (`ChangeNotifier`) for reactive UI updates across Android & iOS.

## API Compatibility

The client communicates with the PlateShare backend endpoints:
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET /api/listings` & `POST /api/listings`
- `POST /api/listings/:id/schedule-pickup` (NGO schedules pickup for a claimed listing)
- `POST /api/listings/:id/confirm-handover` (Restaurant/donor confirms the NGO collected the food)
- `POST /api/allocations/confirm` (Beneficiary, distributing NGO or Admin confirms meal receipt)
- `GET /api/notifications`

For local emulator testing:
- Android: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`
