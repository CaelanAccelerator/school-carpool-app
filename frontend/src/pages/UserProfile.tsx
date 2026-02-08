import {
    DirectionsCar,
    Email,
    EmojiPeople,
    Home as HomeIcon,
    People,
    Person,
    Phone,
    Schedule,
    School
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    MenuItem,
    Paper,
    Snackbar,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { userService } from '../services/api';
import { ContactType, Role, UpdateUserData, User } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

const DEFAULT_MAP_CENTER = { lat: 49.2606, lng: -123.2460 };

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    photoUrl: '',
    contactType: 'EMAIL' as ContactType,
    contactValue: '',
    campus: '',
    homeArea: '',
    role: 'BOTH' as Role,
    timeZone: '',
    isActive: true,
    homeAddress: '',
    homeLat: '',
    homeLng: ''
  });

  useEffect(() => {
    if (!id) return;
    
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        
        const userData = await userService.getUserById(id);
        setUser(userData);
        setFormData({
          name: userData.name,
          photoUrl: userData.photoUrl || '',
          contactType: userData.contactType,
          contactValue: userData.contactValue,
          campus: userData.campus,
          homeArea: userData.homeArea,
          role: userData.role,
          timeZone: userData.timeZone,
          isActive: userData.isActive,
          homeAddress: userData.homeAddress || '',
          homeLat: userData.homeLat == null ? '' : String(userData.homeLat),
          homeLng: userData.homeLng == null ? '' : String(userData.homeLng)
        });
        
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

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleActive = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isActive: event.target.checked }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const parsedLat = formData.homeLat.trim() === '' ? null : Number(formData.homeLat);
    const parsedLng = formData.homeLng.trim() === '' ? null : Number(formData.homeLng);

    const payload: UpdateUserData = {
      name: formData.name,
      photoUrl: formData.photoUrl || '',
      contactType: formData.contactType,
      contactValue: formData.contactValue,
      campus: formData.campus,
      homeArea: formData.homeArea,
      role: formData.role,
      timeZone: formData.timeZone,
      isActive: formData.isActive,
      homeAddress: formData.homeAddress || '',
      homeLat: Number.isNaN(parsedLat as number) ? undefined : parsedLat,
      homeLng: Number.isNaN(parsedLng as number) ? undefined : parsedLng
    };

    try {
      const updatedUser = await userService.updateUser(user.id, payload);
      setUser(updatedUser);
      setIsEditing(false);
      setSnackbar({ message: 'Profile updated', severity: 'success' });
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to update profile',
        severity: 'error'
      });
    }
  };

  const mapsApiKey = useMemo(
    () => process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY || '',
    []
  );

  const loadGoogleMaps = useCallback(() => {
    if (window.google?.maps) {
      return Promise.resolve();
    }

    if (!mapsApiKey) {
      return Promise.reject(new Error('Missing REACT_APP_GOOGLE_MAPS_BROWSER_KEY'));
    }

    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById('google-maps-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.body.appendChild(script);
    });
  }, [mapsApiKey]);

  const updateLatLng = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      homeLat: lat.toFixed(6),
      homeLng: lng.toFixed(6)
    }));
  }, []);

  const ensureMapInitialized = useCallback((center: { lat: number; lng: number }, zoom: number) => {
    if (!mapContainerRef.current || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom
      });

      markerRef.current = new window.google.maps.Marker({
        position: center,
        map: mapRef.current,
        draggable: true
      });

      mapRef.current.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        markerRef.current.setPosition({ lat, lng });
        updateLatLng(lat, lng);
      });

      markerRef.current.addListener('dragend', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateLatLng(lat, lng);
      });
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
      markerRef.current.setPosition(center);
    }
  }, [updateLatLng]);

  const handleGeocodeAddress = async () => {
    const address = formData.homeAddress.trim();
    if (!address) {
      setSnackbar({ message: 'Enter a home address first', severity: 'error' });
      return;
    }

    try {
      await loadGoogleMaps();
      if (!window.google?.maps) {
        throw new Error('Google Maps unavailable');
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results: any, status: string) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          setSnackbar({ message: 'Address not found', severity: 'error' });
          return;
        }

        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        updateLatLng(lat, lng);
        ensureMapInitialized({ lat, lng }, 14);
      });
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to search address',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    if (!isEditing) return;
    if (!mapContainerRef.current) return;

    loadGoogleMaps()
      .then(() => {
        if (!mapContainerRef.current || !window.google?.maps) return;

        const hasCoords = formData.homeLat.trim() !== '' && formData.homeLng.trim() !== '';
        const center = hasCoords
          ? {
              lat: Number(formData.homeLat),
              lng: Number(formData.homeLng)
            }
          : DEFAULT_MAP_CENTER;
        ensureMapInitialized(center, hasCoords ? 14 : 11);
      })
      .catch((err) => {
        setSnackbar({
          message: err instanceof Error ? err.message : 'Failed to load map',
          severity: 'error'
        });
      });
  }, [isEditing, formData.homeLat, formData.homeLng, ensureMapInitialized, loadGoogleMaps]);

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
        <Button component={Link} to="/" sx={{ mt: 2 }}>
          Back to Home
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
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

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => {
              localStorage.setItem('currentUserId', user.id);
              localStorage.setItem('currentUserRole', user.role);
              localStorage.setItem('currentUserName', user.name);
              setSnackbar({ message: 'Current demo user set', severity: 'success' });
            }}
          >
            Set as Current User (Demo)
          </Button>
          <Button
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </Button>
        </Box>

        {isEditing && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Edit Profile
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Photo URL"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Contact Type"
                    name="contactType"
                    value={formData.contactType}
                    onChange={handleFormChange}
                  >
                    <MenuItem value="EMAIL">Email</MenuItem>
                    <MenuItem value="PHONE">Phone</MenuItem>
                    <MenuItem value="WECHAT">WeChat</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Contact Value"
                    name="contactValue"
                    value={formData.contactValue}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Campus"
                    name="campus"
                    value={formData.campus}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Home Area"
                    name="homeArea"
                    value={formData.homeArea}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box display="flex" gap={2} alignItems="center">
                    <TextField
                      fullWidth
                      label="Home Address"
                      name="homeAddress"
                      value={formData.homeAddress}
                      onChange={handleFormChange}
                    />
                    <Button variant="outlined" onClick={handleGeocodeAddress}>
                      Search
                    </Button>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Home Lat"
                    name="homeLat"
                    value={formData.homeLat}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Home Lng"
                    name="homeLng"
                    value={formData.homeLng}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box
                    ref={mapContainerRef}
                    sx={{
                      width: '100%',
                      height: 320,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Click or drag the marker to update home location.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                  >
                    <MenuItem value="DRIVER">Driver Only</MenuItem>
                    <MenuItem value="PASSENGER">Passenger Only</MenuItem>
                    <MenuItem value="BOTH">Both Driver & Passenger</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Time Zone"
                    name="timeZone"
                    value={formData.timeZone}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Switch checked={formData.isActive} onChange={handleToggleActive} />
                    <Typography>Active</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" gap={2}>
                    <Button variant="contained" onClick={handleSaveProfile}>
                      Save Changes
                    </Button>
                    <Button variant="outlined" onClick={handleSaveProfile}>
                      Save Location
                    </Button>
                    <Button variant="outlined" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

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
          to="/"
          variant="outlined"
        >
          Back to Home
        </Button>
      </Box>
    </Box>
  );
};

export default UserProfile;