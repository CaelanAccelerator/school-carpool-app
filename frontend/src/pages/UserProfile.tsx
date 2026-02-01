import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Avatar,
  Box,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  DirectionsCar,
  EmojiPeople,
  People,
  School,
  Home as HomeIcon,
  Email,
  Phone,
  Schedule,
  Person
} from '@mui/icons-material';
import { useParams, Link } from 'react-router-dom';
import { userService } from '../services/api';
import { User, Role } from '../types';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        
        const userData = await userService.getUserById(id);
        setUser(userData);
        
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'DRIVER':
        return <DirectionsCar />;
      case 'PASSENGER':
        return <EmojiPeople />;
      default:
        return <People />;
    }
  };

  const getRoleColor = (role: Role): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (role) {
      case 'DRIVER':
        return 'primary';
      case 'PASSENGER':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const getContactIcon = (contactType: string) => {
    switch (contactType) {
      case 'EMAIL':
        return <Email />;
      case 'PHONE':
        return <Phone />;
      default:
        return <Person />;
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!user) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">User not found</Typography>
        <Button component={Link} to="/users" sx={{ mt: 2 }}>
          Back to Users
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={user.photoUrl}
            sx={{ width: 80, height: 80, mr: 3 }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {user.name}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                icon={getRoleIcon(user.role)}
                label={user.role}
                color={getRoleColor(user.role)}
              />
              <Chip
                label={user.isActive ? 'Active' : 'Inactive'}
                color={user.isActive ? 'success' : 'default'}
              />
            </Box>
            
            <Typography color="text.secondary">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <School sx={{ mr: 1, verticalAlign: 'bottom' }} />
                  Location Info
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <School sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Campus
                    </Typography>
                    <Typography>
                      {user.campus}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HomeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Home Area
                    </Typography>
                    <Typography>
                      {user.homeArea}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {getContactIcon(user.contactType)}
                  Contact Info
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Email sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getContactIcon(user.contactType)}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {user.contactType}
                    </Typography>
                    <Typography>
                      {user.contactValue}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {user.schedule && user.schedule.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Schedule sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Weekly Schedule
              </Typography>
              
              <Grid container spacing={2}>
                {user.schedule
                  .filter(entry => entry.enabled)
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((entry) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry.id}>
                      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {getDayName(entry.dayOfWeek)}
                        </Typography>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            To Campus: {formatTime(entry.toCampusMins)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (±{entry.toCampusFlexMin} min)
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            From Campus: {formatTime(entry.goHomeMins)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (±{entry.goHomeFlexMin} min)
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))
                }
              </Grid>
              
              {user.schedule.filter(entry => entry.enabled).length === 0 && (
                <Typography color="text.secondary">
                  No active schedule entries
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {user._count && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection Stats
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main">
                      {user._count.sentConnections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requests Sent
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary.main">
                      {user._count.receivedConnections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requests Received
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Paper>
      
      <Box sx={{ textAlign: 'center' }}>
        <Button
          component={Link}
          to="/users"
          variant="outlined"
        >
          Back to Users
        </Button>
      </Box>
    </Box>
  );
};

export default UserProfile;