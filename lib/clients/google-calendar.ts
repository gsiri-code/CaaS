import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export function oauthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars not set (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI)");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function calendarFor(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

export const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
