

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <ActivitiesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
