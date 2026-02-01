import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';
import Header from './components/Header';
import Home from './pages/Home';
import UserList from './pages/UserList';
import UserProfile from './pages/UserProfile';
import CreateUser from './pages/CreateUser';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#e070ae',
    },
    secondary: {
      main: '#080204',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Header />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/create-user" element={<CreateUser />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
