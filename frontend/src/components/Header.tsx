import {
    DirectionsCar,
    Home,
    People,
    PersonAdd
} from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Chip,
    IconButton,
    Toolbar,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

const readCurrentUser = (): CurrentUser | null => {
  const id = localStorage.getItem('currentUserId');
  const name = localStorage.getItem('currentUserName');
  const role = localStorage.getItem('currentUserRole');

  if (!id || !name || !role) {
    return null;
  }

  return { id, name, role };
};

const Header: React.FC = () => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(readCurrentUser());

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    setCurrentUser(readCurrentUser());
  }, [location.pathname]);

  const handleClearDemoUser = () => {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserName');
    localStorage.removeItem('currentUserRole');
    setCurrentUser(null);
  };

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

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
              <Chip
                size="small"
                color="secondary"
                label={`${currentUser.name} (${currentUser.role})`}
              />
              <Button color="inherit" size="small" onClick={handleClearDemoUser}>
                Clear Demo User
              </Button>
            </Box>
          )}
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
            to="/match"
            color="inherit"
            variant={isActive('/match') ? 'outlined' : 'text'}
          >
            Match
          </Button>

          <Button
            component={currentUser?.role === 'PASSENGER' ? 'button' : Link}
            to={currentUser?.role === 'PASSENGER' ? undefined : '/schedule'}
            color="inherit"
            variant={isActive('/schedule') ? 'outlined' : 'text'}
            disabled={currentUser?.role === 'PASSENGER'}
          >
            Schedule
          </Button>

          <Button
            component={Link}
            to="/ride-inbox"
            color="inherit"
            variant={isActive('/ride-inbox') ? 'outlined' : 'text'}
          >
            Inbox
          </Button>

          <Button
            component={Link}
            to="/ride-outbox"
            color="inherit"
            variant={isActive('/ride-outbox') ? 'outlined' : 'text'}
          >
            Outbox
          </Button>
          
          <Button
            component={currentUser ? Link : Link}
            to={currentUser ? `/users/${currentUser.id}` : '/create-user'}
            color="inherit"
            startIcon={currentUser ? <People /> : <PersonAdd />}
            variant={
              currentUser
                ? isActive(`/users/${currentUser.id}`)
                  ? 'outlined'
                  : 'text'
                : isActive('/create-user')
                  ? 'outlined'
                  : 'text'
            }
          >
            {currentUser ? 'Profile' : 'Join'}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;