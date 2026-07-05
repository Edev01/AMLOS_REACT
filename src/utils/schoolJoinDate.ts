/**
 * schoolJoinDate.ts
 * 
 * Frontend-only utility to record and retrieve a school's join date.
 * When a school is created via the React frontend, we save an ISO timestamp
 * to localStorage keyed by the school's email or registration number.
 * The school detail page reads this when the backend doesn't return created_at.
 */

const LS_KEY_PREFIX = 'amlos_school_joined_';

/** Build a stable localStorage key from school identifiers */
const buildKey = (identifier: string): string =>
  `${LS_KEY_PREFIX}${identifier.toLowerCase().replace(/\s+/g, '_')}`;

/**
 * Save the current UTC timestamp for a newly created school.
 * Call this immediately after a successful school creation API call.
 * 
 * @param email - school's email address (primary key)
 * @param registrationNumber - fallback key if email is unavailable
 */
export const saveSchoolJoinDate = (
  email?: string,
  registrationNumber?: string
): void => {
  const now = new Date().toISOString(); // Always UTC
  if (email) {
    localStorage.setItem(buildKey(email), now);
  }
  if (registrationNumber) {
    localStorage.setItem(buildKey(registrationNumber), now);
  }
};

/**
 * Retrieve the saved join date for a school.
 * Returns ISO string or undefined if not found.
 */
export const getSchoolJoinDate = (
  email?: string,
  registrationNumber?: string
): string | undefined => {
  if (email) {
    const val = localStorage.getItem(buildKey(email));
    if (val) return val;
  }
  if (registrationNumber) {
    const val = localStorage.getItem(buildKey(registrationNumber));
    if (val) return val;
  }
  return undefined;
};

/**
 * Format a date string in a human-friendly worldwide format.
 * Uses the user's local timezone automatically.
 * 
 * Example output: "July 5, 2026, 10:59 PM"
 */
export const formatJoinDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return new Date(isoString).toLocaleString();
  }
};
