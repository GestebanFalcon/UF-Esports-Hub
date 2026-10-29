# Deferred changes and considerations

Track work deliberately postponed here. Remove or update an item when it is implemented.

## Align password validation

The backend registration and login handlers reject passwords longer than 72 UTF-8 bytes because bcrypt truncates longer inputs. The shared registration and login schemas currently have no upper byte limit, so frontend validation can accept a password the server rejects.

Future work: enforce the same 72-byte limit in shared validation using `TextEncoder`, keeping the backend checks as defense in depth. Test ASCII and multibyte passwords at and above the boundary. Keep registration's eight-character minimum and login's nonempty-password rule; preserve passwords exactly without trimming. HTML `maxLength` alone cannot enforce a UTF-8 byte limit.

For now, the frontend displays the backend's password field error. No password validation or database schema change is included in the login integration.

## Authentication follow-ups

- API configuration: frontend requests currently target `http://localhost:3001`, and backend CORS allows `http://localhost:5173`. Configure the API origin and allowed frontend origins for deployment.
- Session persistence: tokens are stored in `sessionStorage` for navigation and reloads within a tab, with an in-memory fallback if storage is unavailable. JavaScript can access this storage; consider HttpOnly, Secure cookies with the corresponding backend and CSRF changes for deployment. Passwords are never persisted.
- Token renewal and revocation: the backend has no refresh or revocation endpoint. Expiration requires another login; logout clears the browser session but does not invalidate an already-issued token on the server.
- Account destination: there is no dashboard yet. Successful login displays the signed-in account and a link home.

