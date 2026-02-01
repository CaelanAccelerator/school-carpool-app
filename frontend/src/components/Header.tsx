import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton
} from '@mui/material';
import {
  DirectionsCar,
  People,
  PersonAdd,
  Home
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          component={Link}
          to="/"
          color="inherit"
          sx={{ mr: 2 }}
        >
          <DirectionsCar />
        </IconButton>
        
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
        >
          Campus Carpool
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            startIcon={<Home />}
            variant={isActive('/') ? 'outlined' : 'text'}
          >
            Home
          </Button>
          
          <Button
            component={Link}
            to="/users"
            color="inherit"
            startIcon={<People />}
            variant={isActive('/users') ? 'outlined' : 'text'}
          >
            Users
          </Button>
          
          <Button
            component={Link}
            to="/create-user"
            color="inherit"
            startIcon={<PersonAdd />}
            variant={isActive('/create-user') ? 'outlined' : 'text'}
          >
            Join
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;