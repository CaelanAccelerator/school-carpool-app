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
export declare const timeToMinutes: (timeString: string) => number;
/**
 * Converts minutes since midnight to time string
 * @param minutes - Number of minutes since midnight (0-1439)
 * @returns Time string in format "HH:MM"
 * @example minutesToTime(510) returns "08:30"
 * @example minutesToTime(1439) returns "23:59"
 */
export declare const minutesToTime: (minutes: number) => string;
/**
 * Validates that a time string is in the correct format
 * @param timeString - Time string to validate
 * @returns boolean indicating if the format is valid
 */
export declare const isValidTimeFormat: (timeString: string) => boolean;
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
//# sourceMappingURL=timeUtils.d.ts.map