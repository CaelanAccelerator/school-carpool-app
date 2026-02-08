import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { rideRequestService } from '../services/api';

interface MatchResult {
  user: {
    id: string;
    name: string;
    homeArea: string;
  };
  matchingScore: {
    toCampusTimeFormatted: string;
  };
  geoInfo: {
    extraDetourMins: number | null;
    baseMins: number | null;
    viaMins: number | null;
  };
  toCampusMaxDetourMins?: number;
}

const GeoMatchingTester: React.FC = () => {
  const [passengerUserId, setPassengerUserId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [toCampusTime, setToCampusTime] = useState('08:30');
  const [flexibilityMins, setFlexibilityMins] = useState(15);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const dayOptions = useMemo(
    () => [
      { value: 0, label: 'Sunday' },
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' }
    ],
    []
  );

  const fetchDrivers = async (trimmedUserId: string) => {
    const response = await fetch(
      `/api/matching/users/${trimmedUserId}/find-optimal-drivers-to-campus`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dayOfWeek,
          toCampusTime,
          flexibilityMins
        })
      }
    );

    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || data?.error || 'Request failed');
    }

    return data?.data?.drivers || [];
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    setResults([]);

    const trimmedUserId = passengerUserId.trim();
    if (!trimmedUserId) {
      setError('Passenger user ID is required');
      setLoading(false);
      return;
    }

    try {
      const drivers = await fetchDrivers(trimmedUserId);
      setResults(drivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">Geo Matching Tester</Typography>
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
      <Box display="flex" flexDirection="column" gap={2} maxWidth={520}>
        <TextField
          label="Passenger User ID"
          value={passengerUserId}
          onChange={(event) => setPassengerUserId(event.target.value)}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel id="day-of-week-label">Day of Week</InputLabel>
          <Select
            labelId="day-of-week-label"
            label="Day of Week"
            value={dayOfWeek.toString()}
            onChange={(event: SelectChangeEvent) =>
              setDayOfWeek(parseInt(event.target.value, 10))
            }
          >
            {dayOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="To Campus Time"
          type="time"
          value={toCampusTime}
          onChange={(event) => setToCampusTime(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Flexibility (mins)"
          type="number"
          value={flexibilityMins}
          onChange={(event) => setFlexibilityMins(parseInt(event.target.value, 10))}
          inputProps={{ min: 0, max: 120 }}
        />
        <TextField
          label="Request Message"
          value={requestMessage}
          onChange={(event) => setRequestMessage(event.target.value)}
          fullWidth
        />
        <Box display="flex" alignItems="center" gap={2}>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Find drivers
          </Button>
          {loading && <CircularProgress size={24} />}
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle1">Found {results.length} drivers</Typography>

      {results.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Driver Name</TableCell>
              <TableCell>Home Area</TableCell>
              <TableCell>To Campus Time</TableCell>
              <TableCell>Extra Detour (mins)</TableCell>
              <TableCell>Base Mins</TableCell>
              <TableCell>Via Mins</TableCell>
              <TableCell>Max Detour (mins)</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((driver, index) => (
              <TableRow key={`${driver.user.name}-${index}`}>
                <TableCell>{driver.user.name}</TableCell>
                <TableCell>{driver.user.homeArea}</TableCell>
                <TableCell>{driver.matchingScore.toCampusTimeFormatted}</TableCell>
                <TableCell>{driver.geoInfo.extraDetourMins ?? '-'}</TableCell>
                <TableCell>{driver.geoInfo.baseMins ?? '-'}</TableCell>
                <TableCell>{driver.geoInfo.viaMins ?? '-'}</TableCell>
                <TableCell>{driver.toCampusMaxDetourMins ?? '-'}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      const fromUserId = localStorage.getItem('currentUserId') || passengerUserId.trim();
                      if (!fromUserId) {
                        setSnackbar({
                          message: 'Set a current user or enter a passenger user ID',
                          severity: 'error'
                        });
                        return;
                      }

                      try {
                        await rideRequestService.createOrUpdateRideRequestKey(
                          fromUserId,
                          driver.user.id,
                          dayOfWeek,
                          'TO_CAMPUS',
                          requestMessage
                        );
                        setSnackbar({ message: 'Request sent', severity: 'success' });
                      } catch (err) {
                        setSnackbar({
                          message: err instanceof Error ? err.message : 'Failed to send request',
                          severity: 'error'
                        });
                      }
                    }}
                  >
                    Send Request
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default GeoMatchingTester;
