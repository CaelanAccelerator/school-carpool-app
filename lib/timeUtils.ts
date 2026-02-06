/**
 * Time utility functions for handling time conversions in the carpool app
 */

/**
 * Converts time string to minutes since midnight
 * @param timeString - Time in format "HH:MM" (24-hour format)
 * @returns Number of minutes since midnight
 * @example timeToMinutes("08:30") returns 510
 * @example timeToMinutes("23:59") returns 1439
 */
export const timeToMinutes = (timeString: string): number => {
  // Validate input format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(timeString)) {
    throw new Error('Invalid time format. Expected HH:MM (24-hour format)');
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Validate ranges
  if (hours < 0 || hours > 23) {
    throw new Error('Hours must be between 0 and 23');
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error('Minutes must be between 0 and 59');
  }

  return hours * 60 + minutes;
};

/**
 * Converts minutes since midnight to time string
 * @param minutes - Number of minutes since midnight (0-1439)
 * @returns Time string in format "HH:MM"
 * @example minutesToTime(510) returns "08:30"
 * @example minutesToTime(1439) returns "23:59"
 */
export const minutesToTime = (minutes: number): string => {
  if (minutes < 0 || minutes > 1439) {
    throw new Error('Minutes must be between 0 and 1439');
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Validates that a time string is in the correct format
 * @param timeString - Time string to validate
 * @returns boolean indicating if the format is valid
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeString);
};

/**
 * Frontend API parameter names and expected format:
 * 
 * Expected parameters from frontend:
 * - toCampusTime: string (format "HH:MM", e.g., "08:30")
 * - goHomeTime: string (format "HH:MM", e.g., "17:45")
 * - dayOfWeek: number (0-6, where 0 = Sunday)
 * 
 * Usage example in controller:
 * const toCampusMins = timeToMinutes(req.body.toCampusTime);
 * const goHomeMins = timeToMinutes(req.body.goHomeTime);
 */