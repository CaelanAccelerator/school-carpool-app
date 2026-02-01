import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  DirectionsCar,
  People,
  PersonAdd,
  School
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { healthService, userService } from '../services/api';
import { PaginatedResponse, User } from '../types';

const Home: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
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
  }, []);

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
        
        <Box sx={{ mt: 4 }}>
          <Button
            component={Link}
            to="/create-user"
            variant="contained"
            size="large"
            startIcon={<PersonAdd />}
            sx={{ mr: 2 }}
          >
            Join Now
          </Button>
          <Button
            component={Link}
            to="/users"
            variant="outlined"
            size="large"
            startIcon={<People />}
          >
            Browse Users
          </Button>
        </Box>
      </Paper>

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