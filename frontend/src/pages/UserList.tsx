import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Box,
  TextField,
  MenuItem,
  Button,
  Pagination,
  CircularProgress,
  Alert
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  People,
  DirectionsCar,
  EmojiPeople,
  School,
  Home as HomeIcon,
  Search,
  Clear
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { userService } from '../services/api';
import { User, Role, PaginatedResponse } from '../types';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    campus: '',
    homeArea: '',
    role: '',
    isActive: true
  });

  const limit = 12;

  const fetchUsers = async (currentPage: number = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit,
        ...currentFilters,
        isActive: currentFilters.isActive
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === '') {
          delete params[key as keyof typeof params];
        }
      });
      
      const response: PaginatedResponse<User> = await userService.getUsers(params);
      
      setUsers(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, filters);
  }, [page]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      campus: '',
      homeArea: '',
      role: '',
      isActive: true
    };
    setFilters(clearedFilters);
    setPage(1);
    fetchUsers(1, clearedFilters);
  };

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

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Campus Carpool Users
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Find fellow students to share rides with
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs:12, sm:6, md:3 }}>
            <TextField
              fullWidth
              size="small"
              label="Campus"
              name="campus"
              value={filters.campus}
              onChange={handleFilterChange}
              placeholder="Filter by campus"
            />
          </Grid>
          
          <Grid size={{ xs:12, sm:6, md:3 }}>
            <TextField
              fullWidth
              size="small"
              label="Home Area"
              name="homeArea"
              value={filters.homeArea}
              onChange={handleFilterChange}
              placeholder="Filter by area"
            />
          </Grid>
          
          <Grid size={{ xs:12, sm:6, md:3 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="Role"
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="DRIVER">Drivers</MenuItem>
              <MenuItem value="PASSENGER">Passengers</MenuItem>
              <MenuItem value="BOTH">Both</MenuItem>
            </TextField>
          </Grid>
          
          <Grid size={{ xs:12, sm:6, md:3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearch}
                sx={{ flex: 1 }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {users.length} of {total} users
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {users.map((user) => (
              <Grid size={{ xs:12, sm:6, md:4 }} key={user.id}>
                <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={user.photoUrl}
                        sx={{ width: 48, height: 48, mr: 2 }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component={Link} to={`/users/${user.id}`} sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}>
                          {user.name}
                        </Typography>
                        <Chip
                          icon={getRoleIcon(user.role)}
                          label={user.role}
                          size="small"
                          color={getRoleColor(user.role)}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <School sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {user.campus}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <HomeIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {user.homeArea}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {user.contactType}: {user.contactValue}
                      </Typography>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.isActive ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {users.length === 0 && !loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No users found
              </Typography>
              <Typography color="text.secondary">
                Try adjusting your search filters or check back later.
              </Typography>
            </Paper>
          )}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default UserList;
