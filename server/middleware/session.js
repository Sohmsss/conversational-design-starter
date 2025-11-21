import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE_NAME = 'conversational_design_session';

export function sessionMiddleware(req, res, next) {
  // Check if session ID exists in cookie
  let sessionId = req.cookies[SESSION_COOKIE_NAME];

  // If no session ID, generate a new one
  if (!sessionId) {
    sessionId = uuidv4();

    // Set cookie with session ID (expires in 7 days)
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax'
    });
  }

  // Attach session ID to request object for use in routes
  req.sessionId = sessionId;

  next();
}
