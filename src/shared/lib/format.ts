/**
 * Formats a record ID (e.g., "j01" or a hex UUID) into a status-prefixed 
 * and padded record identifier (e.g., "J00001").
 */
export function formatRecordId(id: string | undefined, status?: string): string {
  if (!id) return 'N/A';

  // 1. Extract the numeric part.
  // Handles "j01", "e01", "d01", "q01", etc.
  // For UUIDs, we'll take the first 5 characters of the hex string if it's purely hex.
  let numericPart = id;
  const prefixMatch = id.match(/^[a-zA-Z]+(\d+)$/);
  
  if (prefixMatch) {
    numericPart = prefixMatch[1];
  } else if (/^[0-9a-fA-F-]+$/.test(id)) {
    // It's likely a UUID or hex string. Take the first 5 chars as a "pseudo-number"
    // or just the part after any hyphen if it looks like one.
    const cleanId = id.replace(/-/g, '');
    numericPart = cleanId.substring(0, 5);
  }

  // 2. Determine the prefix based on status.
  let prefix = 'J'; // Default to Job

  if (status) {
    const s = status.toLowerCase();
    if (s.includes('enquiry')) {
      prefix = 'E';
    } else if (s.includes('quote')) {
      prefix = 'Q';
    } else if (s.includes('docket')) {
      prefix = 'D';
    }
  }

  // 3. Pad numeric part to 5 digits if it's purely numeric.
  if (/^\d+$/.test(numericPart)) {
    numericPart = numericPart.padStart(5, '0');
  } else {
    // If it's hex, just make sure it's uppercase and not too long.
    numericPart = numericPart.toUpperCase().substring(0, 5);
  }

  return `${prefix}${numericPart}`;
}
