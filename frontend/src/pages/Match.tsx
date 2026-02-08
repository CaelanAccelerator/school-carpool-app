import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchingService, rideRequestService, userService } from '../services/api';
import { RideDirection, User } from '../types';

interface MatchResult {
  user: {
    id: string;
    name: string;
    homeArea: string;
    campus: string;
  };
  matchingScore: {
    targetTimeFormatted: string;
    entryTimeFormatted: string;
    timeDifference: number;
  };
  geoInfo?: {
    extraDetourMins: number | null;
    baseMins: number | null;
    viaMins: number | null;
  };
  toCampusMaxDetourMins?: number;
  goHomeMaxDetourMins?: number;
}

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDefaultTimeForDirection = (direction: RideDirection) =>
  direction === 'TO_CAMPUS' ? '08:30' : '17:00';

const Match: React.FC = () => {
  const currentUserId = localStorage.getItem('currentUserId');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [direction, setDirection] = useState<RideDirection>('TO_CAMPUS');
  const [departureTime, setDepartureTime] = useState(getDefaultTimeForDirection('TO_CAMPUS'));
  const [flexibilityMins, setFlexibilityMins] = useState(15);
  const [targetGroup, setTargetGroup] = useState<'DRIVERS' | 'PASSENGERS'>('DRIVERS');
  const [message, setMessage] = useState('');

  const [results, setResults] = useState<MatchResult[]>([]);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const homeLocationStatus = useMemo(() => {
    if (!currentUser) return 'Unknown';
    return currentUser.homeLat != null && currentUser.homeLng != null ? 'Available' : 'Missing';
  }, [currentUser]);

  useEffect(() => {
    if (!currentUserId) return;

    const loadUser = async () => {
      try {
        setUserLoading(true);
        setUserError('');
        const profile = await userService.getUserById(currentUserId);
        setCurrentUser(profile);
      } catch (err) {
        setUserError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, [currentUserId]);

  const handleDirectionChange = (nextDirection: RideDirection) => {
    setDirection(nextDirection);
    setDepartureTime(getDefaultTimeForDirection(nextDirection));
  };

  const handleFindMatches = async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError('');
    setResults([]);
    setNote('');

    try {
      let response: { results: any[]; note?: string };
      if (targetGroup === 'DRIVERS') {
        response =
          direction === 'TO_CAMPUS'
            ? await matchingService.findDriversToCampus(currentUserId, dayOfWeek, departureTime, flexibilityMins)
            : await matchingService.findDriversGoHome(currentUserId, dayOfWeek, departureTime, flexibilityMins);
      } else {
        response =
          direction === 'TO_CAMPUS'
            ? await matchingService.findPassengersToCampus(currentUserId, dayOfWeek, departureTime, flexibilityMins)
            : await matchingService.findPassengersGoHome(currentUserId, dayOfWeek, departureTime, flexibilityMins);
      }

      setResults(response.results as MatchResult[]);
      setNote(response.note || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!currentUserId) return;
    try {
      await rideRequestService.createOrUpdateRideRequestKey(
        currentUserId,
        toUserId,
        dayOfWeek,
        direction,
        message
      );
      setSnackbar({ message: 'Request sent', severity: 'success' });
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to send request',
        severity: 'error'
      });
    }
  };

  if (!currentUserId) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Matching
        </Typography>
        <Alert severity="info">
          Select a current user first. Go to the user list and click "Set as Current User (Demo)".
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button component={Link} to="/create-user" variant="contained">
            Create User
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity || 'success'} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>

      <Typography variant="h4">Matching</Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current User
          </Typography>
          {userLoading && <CircularProgress size={20} />}
          {userError && <Alert severity="error">{userError}</Alert>}
          {currentUser && (
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography>Name: {currentUser.name}</Typography>
              <Typography>Role: {currentUser.role}</Typography>
              <Typography>Campus: {currentUser.campus}</Typography>
              <Typography>Home Area: {currentUser.homeArea}</Typography>
              <Typography>Home Location: {homeLocationStatus}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Criteria
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} maxWidth={560}>
            <FormControl fullWidth>
              <InputLabel id="day-label">Day of Week</InputLabel>
              <Select
                labelId="day-label"
                label="Day of Week"
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
              >
                {dayLabels.map((label, value) => (
                  <MenuItem key={label} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="direction-label">Direction</InputLabel>
              <Select
                labelId="direction-label"
                label="Direction"
                value={direction}
                onChange={(event) => handleDirectionChange(event.target.value as RideDirection)}
              >
                <MenuItem value="TO_CAMPUS">TO_CAMPUS</MenuItem>
                <MenuItem value="GO_HOME">GO_HOME</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Departure Time"
              type="time"
              value={departureTime}
              onChange={(event) => setDepartureTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Flexibility (mins)"
              type="number"
              value={flexibilityMins}
              onChange={(event) => setFlexibilityMins(Number(event.target.value))}
              inputProps={{ min: 0, max: 120 }}
            />

            <ToggleButtonGroup
              exclusive
              value={targetGroup}
              onChange={(_, value) => value && setTargetGroup(value)}
              aria-label="target group"
            >
              <ToggleButton value="DRIVERS">Drivers</ToggleButton>
              <ToggleButton value="PASSENGERS">Passengers</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Request Message (optional)"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              fullWidth
            />

            <Button variant="contained" onClick={handleFindMatches} disabled={loading || userLoading}>
              {loading ? 'Finding...' : 'Find Matches'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {note && <Alert severity="info">{note}</Alert>}

      {results.length > 0 && (
        <Typography variant="subtitle1">Found {results.length} matches</Typography>
      )}

      {results.map((match, index) => {
        const maxDetourMins =
          direction === 'TO_CAMPUS' ? match.toCampusMaxDetourMins : match.goHomeMaxDetourMins;

        return (
          <Card key={`${match.user.id}-${index}`} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {match.user.name}
              </Typography>
              <Typography variant="body2">Home Area: {match.user.homeArea}</Typography>
              <Typography variant="body2">Campus: {match.user.campus}</Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Target Time: {match.matchingScore.targetTimeFormatted}
                </Typography>
                <Typography variant="body2">
                  Entry Time: {match.matchingScore.entryTimeFormatted}
                </Typography>
                <Typography variant="body2">
                  Time Difference: {match.matchingScore.timeDifference} mins
                </Typography>
              </Box>

              {match.geoInfo && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Extra Detour: {match.geoInfo.extraDetourMins ?? '-'} mins
                  </Typography>
                  <Typography variant="body2">Base Mins: {match.geoInfo.baseMins ?? '-'}</Typography>
                  <Typography variant="body2">Via Mins: {match.geoInfo.viaMins ?? '-'}</Typography>
                </Box>
              )}

              <Typography variant="body2" sx={{ mt: 2 }}>
                Max Detour Allowed: {maxDetourMins ?? '-'} mins
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => handleSendRequest(match.user.id)}>
                  Send Request
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      {/*
        Manual test steps:
        1) Set a current user from /users -> user profile.
        2) Open /match, pick direction + target group, click Find Matches.
        3) Use Send Request on a match and verify snackbar.
      */}
    </Box>
  );
};

export default Match;
