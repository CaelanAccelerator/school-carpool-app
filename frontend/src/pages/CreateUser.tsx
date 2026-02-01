import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import { CreateOrUpdateUserData, Role, ContactType } from '../types';

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [formData, setFormData] = useState<CreateOrUpdateUserData>({
    email: '',
    password: '',
    name: '',
    photoUrl: '',
    contactType: 'EMAIL' as ContactType,
    contactValue: '',
    campus: '',
    homeArea: '',
    role: 'BOTH' as Role,
    timeZone: 'America/Vancouver'
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const newUser = await userService.createUser(formData);
      setSuccess('User created successfully!');
      
      // Redirect to user profile after successful creation
      setTimeout(() => {
        navigate(`/users/${newUser.id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Join Campus Carpool
        </Typography>
        <Typography color="text.secondary">
          Create your profile to start sharing rides with fellow students
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              helperText="Minimum 6 characters"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmPassword !== '' && formData.password !== confirmPassword}
              helperText={confirmPassword !== '' && formData.password !== confirmPassword ? 'Passwords do not match' : ''}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Campus"
              name="campus"
              value={formData.campus}
              onChange={handleChange}
              required
              placeholder="e.g., Main Campus, North Campus"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Home Area"
              name="homeArea"
              value={formData.homeArea}
              onChange={handleChange}
              required
              placeholder="e.g., Downtown, Suburbs, Burnaby"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              label="Contact Type"
              name="contactType"
              value={formData.contactType}
              onChange={handleChange}
              required
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
              onChange={handleChange}
              required
              placeholder="Your contact information"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <MenuItem value="DRIVER">Driver Only</MenuItem>
              <MenuItem value="PASSENGER">Passenger Only</MenuItem>
              <MenuItem value="BOTH">Both Driver & Passenger</MenuItem>
            </TextField>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Photo URL (Optional)"
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleChange}
              placeholder="https://example.com/your-photo.jpg"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CreateUser;