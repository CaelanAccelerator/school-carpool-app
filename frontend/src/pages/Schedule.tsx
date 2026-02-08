import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scheduleService, userService } from '../services/api';
import { ScheduleEntry, User } from '../types';

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const Schedule: React.FC = () => {
  const currentUserId = localStorage.getItem('currentUserId');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [toCampusTime, setToCampusTime] = useState('08:30');
  const [goHomeTime, setGoHomeTime] = useState('17:00');
  const [toCampusFlexMin, setToCampusFlexMin] = useState(15);
  const [goHomeFlexMin, setGoHomeFlexMin] = useState(15);
  const [toCampusMaxDetourMins, setToCampusMaxDetourMins] = useState(10);
  const [goHomeMaxDetourMins, setGoHomeMaxDetourMins] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [entries]
  );

  const loadSchedule = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError('');

    try {
      const [userProfile, scheduleEntries] = await Promise.all([
        userService.getUserById(currentUserId),
        scheduleService.getUserScheduleEntries(currentUserId)
      ]);
      setCurrentUser(userProfile);
      setEntries(scheduleEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSchedule();
  }, [currentUserId, loadSchedule]);

  const handleResetForm = () => {
    setDayOfWeek(1);
    setToCampusTime('08:30');
    setGoHomeTime('17:00');
    setToCampusFlexMin(15);
    setGoHomeFlexMin(15);
    setToCampusMaxDetourMins(10);
    setGoHomeMaxDetourMins(10);
    setEnabled(true);
    setEditingEntryId(null);
  };

  const handleCreateEntry = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      await scheduleService.createScheduleEntry(currentUserId, {
        dayOfWeek,
        toCampusMins: timeToMinutes(toCampusTime),
        goHomeMins: timeToMinutes(goHomeTime),
        toCampusFlexMin,
        goHomeFlexMin,
        toCampusMaxDetourMins,
        goHomeMaxDetourMins,
        enabled
      });
      setSnackbar({ message: 'Schedule entry saved', severity: 'success' });
      handleResetForm();
      await loadSchedule();
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to save schedule entry',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!currentUserId || !editingEntryId) return;

    try {
      setLoading(true);
      await scheduleService.updateScheduleEntry(currentUserId, editingEntryId, {
        toCampusMins: timeToMinutes(toCampusTime),
        goHomeMins: timeToMinutes(goHomeTime),
        toCampusFlexMin,
        goHomeFlexMin,
        toCampusMaxDetourMins,
        goHomeMaxDetourMins,
        enabled
      });
      setSnackbar({ message: 'Schedule entry updated', severity: 'success' });
      handleResetForm();
      await loadSchedule();
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to update schedule entry',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      await scheduleService.deleteScheduleEntry(currentUserId, entryId);
      setSnackbar({ message: 'Schedule entry deleted', severity: 'success' });
      await loadSchedule();
      if (editingEntryId === entryId) {
        handleResetForm();
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to delete schedule entry',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntryId(entry.id);
    setDayOfWeek(entry.dayOfWeek);
    setToCampusTime(minutesToTime(entry.toCampusMins));
    setGoHomeTime(minutesToTime(entry.goHomeMins));
    setToCampusFlexMin(entry.toCampusFlexMin);
    setGoHomeFlexMin(entry.goHomeFlexMin);
    setToCampusMaxDetourMins(entry.toCampusMaxDetourMins ?? 10);
    setGoHomeMaxDetourMins(entry.goHomeMaxDetourMins ?? 10);
    setEnabled(entry.enabled);
  };

  if (!currentUserId) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Schedule
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

      <Typography variant="h4">Schedule Entries</Typography>

      {currentUser && (
        <Alert severity="info">
          Editing schedule for {currentUser.name} ({currentUser.campus})
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {editingEntryId ? 'Update Entry' : 'Add Entry'}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} maxWidth={520}>
            <FormControl fullWidth>
              <InputLabel id="day-label">Day of Week</InputLabel>
              <Select
                labelId="day-label"
                label="Day of Week"
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
                disabled={Boolean(editingEntryId)}
              >
                {dayLabels.map((label, value) => (
                  <MenuItem key={label} value={value}>
                    {label}
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
              label="Go Home Time"
              type="time"
              value={goHomeTime}
              onChange={(event) => setGoHomeTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="To Campus Flex (mins)"
              type="number"
              value={toCampusFlexMin}
              onChange={(event) => setToCampusFlexMin(Number(event.target.value))}
              inputProps={{ min: 0, max: 120 }}
            />

            <TextField
              label="Go Home Flex (mins)"
              type="number"
              value={goHomeFlexMin}
              onChange={(event) => setGoHomeFlexMin(Number(event.target.value))}
              inputProps={{ min: 0, max: 120 }}
            />

            <TextField
              label="To Campus Max Detour (mins)"
              type="number"
              value={toCampusMaxDetourMins}
              onChange={(event) => setToCampusMaxDetourMins(Number(event.target.value))}
              inputProps={{ min: 0, max: 120 }}
            />

            <TextField
              label="Go Home Max Detour (mins)"
              type="number"
              value={goHomeMaxDetourMins}
              onChange={(event) => setGoHomeMaxDetourMins(Number(event.target.value))}
              inputProps={{ min: 0, max: 120 }}
            />

            <Box display="flex" alignItems="center" gap={1}>
              <Switch checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              <Typography>Enabled</Typography>
            </Box>

            <Button variant="contained" onClick={handleCreateEntry} disabled={loading}>
              {loading ? 'Saving...' : 'Save Entry'}
            </Button>
            {editingEntryId && (
              <Button variant="outlined" onClick={handleUpdateEntry} disabled={loading}>
                {loading ? 'Updating...' : 'Update Entry'}
              </Button>
            )}
            {editingEntryId && (
              <Button variant="text" onClick={handleResetForm} disabled={loading}>
                Cancel Edit
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading schedule...</Typography>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {sortedEntries.map((entry) => (
        <Card key={entry.id} variant="outlined">
          <CardContent>
            <Typography variant="h6">{dayLabels[entry.dayOfWeek]}</Typography>
            <Typography variant="body2">To Campus: {minutesToTime(entry.toCampusMins)}</Typography>
            <Typography variant="body2">Go Home: {minutesToTime(entry.goHomeMins)}</Typography>
            <Typography variant="body2">To Campus Flex: {entry.toCampusFlexMin} mins</Typography>
            <Typography variant="body2">Go Home Flex: {entry.goHomeFlexMin} mins</Typography>
            <Typography variant="body2">
              To Campus Max Detour: {entry.toCampusMaxDetourMins ?? '-'} mins
            </Typography>
            <Typography variant="body2">
              Go Home Max Detour: {entry.goHomeMaxDetourMins ?? '-'} mins
            </Typography>
            <Typography variant="body2">Enabled: {entry.enabled ? 'Yes' : 'No'}</Typography>
          </CardContent>
          <CardActions>
            <Button size="small" variant="outlined" onClick={() => handleEditEntry(entry)}>
              Edit
            </Button>
            <Button
              size="small"
              color="secondary"
              variant="outlined"
              onClick={() => handleDeleteEntry(entry.id)}
            >
              Delete
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default Schedule;
