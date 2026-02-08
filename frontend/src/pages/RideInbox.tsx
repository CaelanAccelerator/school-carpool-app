import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CircularProgress,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { rideRequestService } from '../services/api';
import { RideRequest } from '../types';

const getCurrentUserId = (): string | null => {
  return localStorage.getItem('currentUserId');
};

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RideInbox: React.FC = () => {
  const currentUserId = getCurrentUserId();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [driverNotes, setDriverNotes] = useState<Record<string, string>>({});
  const inFlightRef = useRef(false);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING').length,
    [requests]
  );

  const fetchInbox = useCallback(async () => {
    if (!currentUserId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError('');

    try {
      const data = await rideRequestService.getInbox(currentUserId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchInbox();
    const intervalId = window.setInterval(fetchInbox, 4000);
    return () => window.clearInterval(intervalId);
  }, [currentUserId, fetchInbox]);

  const handleRespond = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    if (!currentUserId) return;
    try {
      await rideRequestService.respondToRideRequest(
        requestId,
        currentUserId,
        status,
        driverNotes[requestId]
      );
      setSnackbar({ message: `Request ${status.toLowerCase()}`, severity: 'success' });
      fetchInbox();
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to respond to request',
        severity: 'error'
      });
    }
  };

  if (!currentUserId) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Driver Inbox
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
    <Box display="flex" flexDirection="column" gap={2}>
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

      <Box display="flex" alignItems="center" gap={2}>
        <Typography variant="h5">Driver Inbox</Typography>
        <Badge color="secondary" badgeContent={pendingCount}>
          <Typography variant="body2">Pending</Typography>
        </Badge>
      </Box>

      {loading && (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading requests...</Typography>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {requests.length === 0 && !loading && (
        <Alert severity="info">No requests yet.</Alert>
      )}

      {requests.map((request) => (
        <Card key={request.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              From: {request.fromUser?.name || request.fromUserId}
            </Typography>
            <Typography variant="body2">
              Day: {dayLabels[request.dayOfWeek] || request.dayOfWeek} | Direction: {request.direction}
            </Typography>
            <Typography variant="body2">Status: {request.status}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Message: {request.message || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Updated: {new Date(request.updatedAt).toLocaleString()}
            </Typography>
            {request.status === 'PENDING' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Driver note (optional)"
                  fullWidth
                  size="small"
                  value={driverNotes[request.id] || ''}
                  onChange={(event) =>
                    setDriverNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                  }
                />
              </Box>
            )}
          </CardContent>
          {request.status === 'PENDING' && (
            <CardActions>
              <Button
                variant="contained"
                onClick={() => handleRespond(request.id, 'ACCEPTED')}
              >
                Accept
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => handleRespond(request.id, 'REJECTED')}
              >
                Reject
              </Button>
            </CardActions>
          )}
        </Card>
      ))}
    </Box>
  );
};

export default RideInbox;
