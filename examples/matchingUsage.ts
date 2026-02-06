/**
 * Usage examples for the new matching and time utility functions
 */

import { isValidTimeFormat, minutesToTime, timeToMinutes } from '../lib/timeUtils';

// ===== Time Utility Examples =====

console.log('=== Time Utility Examples ===');

// Convert time strings to minutes
console.log('Time to minutes examples:');
console.log('08:30 =>', timeToMinutes('08:30')); // 510
console.log('09:15 =>', timeToMinutes('09:15')); // 555
console.log('17:45 =>', timeToMinutes('17:45')); // 1065
console.log('23:59 =>', timeToMinutes('23:59')); // 1439

// Convert minutes back to time strings
console.log('\nMinutes to time examples:');
console.log('510 =>', minutesToTime(510));   // "08:30"
console.log('555 =>', minutesToTime(555));   // "09:15"
console.log('1065 =>', minutesToTime(1065)); // "17:45"
console.log('1439 =>', minutesToTime(1439)); // "23:59"

// Validate time format
console.log('\nTime format validation:');
console.log('08:30 valid?', isValidTimeFormat('08:30')); // true
console.log('8:30 valid?', isValidTimeFormat('8:30'));   // true
console.log('25:00 valid?', isValidTimeFormat('25:00')); // false
console.log('12:60 valid?', isValidTimeFormat('12:60')); // false

// ===== API Usage Examples =====

console.log('\n=== Frontend API Usage Examples ===');

// Example 1: Find matching drivers for a passenger
const findDriversExample = async () => {
  try {
    // Frontend sends this data to: POST /api/matching/users/:userId/find-drivers
    const requestBody = {
      dayOfWeek: 1,               // Monday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      toCampusTime: "08:30",      // Time going to campus (HH:MM format)
      goHomeTime: "17:45",        // Time going home (HH:MM format)
      flexibilityMins: 15         // Flexibility window in minutes (optional, default 15)
    };

    console.log('Request body for finding drivers:', requestBody);
    
    // The controller will convert these to minutes and find matches
    const toCampusMins = timeToMinutes(requestBody.toCampusTime);
    const goHomeMins = timeToMinutes(requestBody.goHomeTime);
    
    console.log(`Converted times: ${toCampusMins} mins (${requestBody.toCampusTime}), ${goHomeMins} mins (${requestBody.goHomeTime})`);
    
  } catch (error) {
    console.error('Error in find drivers example:', error);
  }
};

// Example 2: Find matching passengers for a driver
const findPassengersExample = async () => {
  try {
    // Frontend sends this data to: POST /api/matching/users/:userId/find-passengers
    const requestBody = {
      dayOfWeek: 2,               // Tuesday
      toCampusTime: "09:00",      // Driver's schedule
      goHomeTime: "18:00",        // Driver's schedule
      flexibilityMins: 20         // Driver is flexible with 20 minutes
    };

    console.log('Request body for finding passengers:', requestBody);
    
  } catch (error) {
    console.error('Error in find passengers example:', error);
  }
};

// ===== Backend Service Usage Examples =====

console.log('\n=== Backend Service Usage Examples ===');

const serviceExamples = async () => {
  try {
    // Example: Using the service functions directly in backend
    const matchingParams = {
      dayOfWeek: 1,                    // Monday
      toCampusMins: timeToMinutes("08:30"), // Convert from time string
      goHomeMins: timeToMinutes("17:45"),   // Convert from time string
      flexibilityMins: 15,
      userId: "user123",
      campus: "Main Campus"
    };

    console.log('Service matching parameters:', matchingParams);

    // Find drivers
    // const drivers = await findMatchingDrivers(matchingParams);
    // console.log(`Found ${drivers.length} matching drivers`);

    // Find passengers
    // const passengers = await findMatchingPassengers(matchingParams);
    // console.log(`Found ${passengers.length} matching passengers`);

    // Get all schedules for a day
    // const allSchedules = await getScheduleEntriesByDay(1, "Main Campus", "user123");
    // console.log(`Found ${allSchedules.length} total schedules for Monday`);

    // Advanced matching with custom flexibility
    // const customMatches = await findMatchingWithCustomFlex(
    //   1,                           // Monday
    //   timeToMinutes("08:30"),      // toCampusMins
    //   timeToMinutes("17:45"),      // goHomeMins
    //   10,                          // 10 min flex for to-campus
    //   20,                          // 20 min flex for go-home
    //   "user123",                   // user ID
    //   "Main Campus",               // campus
    //   "DRIVER"                     // looking for drivers
    // );

  } catch (error) {
    console.error('Error in service examples:', error);
  }
};

// ===== Expected Response Formats =====

console.log('\n=== Expected Response Formats ===');

const expectedDriverResponse = {
  success: true,
  message: "Found 3 matching drivers",
  data: {
    requestedSchedule: {
      dayOfWeek: 1,
      toCampusTime: "08:30",
      goHomeTime: "17:45",
      flexibilityMins: 15
    },
    drivers: [
      {
        id: "schedule-1",
        userId: "driver-1",
        dayOfWeek: 1,
        toCampusMins: 520,  // 08:40 in minutes
        goHomeMins: 1050,   // 17:30 in minutes
        enabled: true,
        user: {
          id: "driver-1",
          name: "John Driver",
          photoUrl: "https://example.com/photo.jpg",
          campus: "Main Campus",
          homeArea: "Downtown",
          role: "DRIVER",
          timeZone: "America/Vancouver"
        },
        matchingScore: {
          toCampusTimeDifference: 10,  // 10 minutes difference
          goHomeTimeDifference: 15,    // 15 minutes difference
          totalTimeDifference: 25,     // total difference
          toCampusTimeFormatted: "08:40",
          goHomeTimeFormatted: "17:30"
        }
      }
      // ... more drivers
    ]
  }
};

console.log('Expected response format:', JSON.stringify(expectedDriverResponse, null, 2));

// Run examples
findDriversExample();
findPassengersExample();
serviceExamples();