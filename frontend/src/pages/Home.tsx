import {
    DirectionsCar,
    People,
    PersonAdd,
    School
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Paper,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, healthService, userService } from '../services/api';
import { PaginatedResponse, User } from '../types';

const Home: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem('currentUserRole');
    setCurrentUserRole(storedRole);

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check health status
        const health = await healthService.checkHealth();
        setHealthStatus(health.success ? 'Online' : 'Offline');
        
        // Get user count
        const usersResponse: PaginatedResponse<User> = await userService.getUsers({ limit: 1 });
        setUserCount(usersResponse.pagination?.total || 0);
        
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
        setHealthStatus('Offline');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (!storedRole) {
      authService.me()
        .then((user) => {
          localStorage.setItem('currentUserId', user.id);
          localStorage.setItem('currentUserRole', user.role);
          localStorage.setItem('currentUserName', user.name);
          setCurrentUserRole(user.role);
        })
        .catch(() => undefined);
    }
  }, []);

  const handleLogin = async () => {
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword.trim();
    if (!email) {
      setLoginError('Email is required');
      return;
    }
    if (!password) {
      setLoginError('Password is required');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const user = await authService.login(email, password);
      localStorage.setItem('currentUserId', user.id);
      localStorage.setItem('currentUserRole', user.role);
      localStorage.setItem('currentUserName', user.name);
      setCurrentUserRole(user.role);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 4, mb: 4, textAlign: 'center' }}>
        <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Campus Carpool
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Connect with fellow students for safe and convenient campus transportation
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          {!currentUserRole && (
            <>
              <Button
                component={Link}
                to="/create-user"
                variant="contained"
                size="large"
                startIcon={<PersonAdd />}
              >
                Join Now
              </Button>
            </>
          )}

          {currentUserRole && (
            <>
              {(currentUserRole === 'PASSENGER' || currentUserRole === 'BOTH') && (
                <Button component={Link} to="/match" variant="contained" size="large">
                  Match
                </Button>
              )}
              {(currentUserRole === 'DRIVER' || currentUserRole === 'BOTH') && (
                <Button component={Link} to="/schedule" variant="contained" size="large">
                  Add Schedule
                </Button>
              )}
              <Button component={Link} to="/ride-inbox" variant="outlined" size="large">
                Check Inbox
              </Button>
              <Button component={Link} to="/ride-outbox" variant="outlined" size="large">
                Check Outbox
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {!currentUserRole && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Log in with your email and password.
          </Typography>
          <Box
            display="flex"
            flexDirection="column"
            gap={2}
            maxWidth={420}
            sx={{ mx: 'auto', alignItems: 'center' }}
          >
            <TextField
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              fullWidth
            />
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <Button variant="contained" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </Button>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Find Rides
              </Typography>
              <Typography color="text.secondary">
                Connect with drivers heading to your area and save on transportation costs.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Share Rides
              </Typography>
              <Typography color="text.secondary">
                Offer rides to fellow students and share fuel costs while making new friends.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <School sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Campus Community
              </Typography>
              <Typography color="text.secondary">
                Build a sustainable campus transportation network with your peers.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography color={healthStatus === 'Online' ? 'success.main' : 'error.main'}>
              API Status: {healthStatus}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="h6" gutterBottom>
              Community Stats
            </Typography>
            <Typography>
              Total Users: {userCount}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Home;