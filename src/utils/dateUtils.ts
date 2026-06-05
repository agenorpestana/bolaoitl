/**
 * Safely parses any date representation, handling specific iOS/Safari format requirements.
 * Safari does not support parsing dates in "YYYY-MM-DD HH:MM:SS" format and requires the "T" separator.
 */
export function safeParseDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  if (typeof dateInput === 'string') {
    let clean = dateInput.trim();
    // Translate "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
    if (clean.includes(' ') && !clean.includes('T')) {
      clean = clean.replace(' ', 'T');
    }
    // Handle cases where the offset doesn't contain a colon (like +0000 -> +00:00) or missing Z
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(dateInput);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  // Gracefully handle any issues by returning the current date instead of throwing a RangeError
  return new Date();
}

/**
 * Format date to PT-BR locate safely without crashing on iOS Safari
 */
export function safeLocaleDateString(dateInput: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const parsed = safeParseDate(dateInput);
    return parsed.toLocaleDateString('pt-BR', options);
  } catch (err) {
    console.error("Format date local error:", err);
    return "";
  }
}

/**
 * Format time to PT-BR locate safely
 */
export function safeLocaleTimeString(dateInput: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const parsed = safeParseDate(dateInput);
    return parsed.toLocaleTimeString('pt-BR', options || { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    console.error("Format time local error:", err);
    return "";
  }
}

/**
 * Format both date and time to PT-BR string
 */
export function safeLocaleString(dateInput: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const parsed = safeParseDate(dateInput);
    return parsed.toLocaleString('pt-BR', options);
  } catch (err) {
    console.error("Format full locale error:", err);
    return "";
  }
}
