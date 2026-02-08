import { Container } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import CreateUser from './pages/CreateUser';
import Home from './pages/Home';
import Match from './pages/Match';
import RideInbox from './pages/RideInbox';
import RideOutbox from './pages/RideOutbox';
import Schedule from './pages/Schedule';
import UserProfile from './pages/UserProfile';

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
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/create-user" element={<CreateUser />} />
              <Route path="/match" element={<Match />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/ride-inbox" element={<RideInbox />} />
              <Route path="/ride-outbox" element={<RideOutbox />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
