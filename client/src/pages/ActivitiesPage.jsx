
import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale';
import { signOut } from 'firebase/auth';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});


const sportTypes = [
  'Run', 'Ride', 'Swim', 'Walk', 'Hike', 'AlpineSki',
  'BackcountrySki', 'Canoeing', 'Crossfit', 'EBikeRide',
  'Elliptical', 'Golf', 'Handcycle', 'IceSkate', 'InlineSkate',
  'Kayaking', 'Kitesurf', 'NordicSki', 'RockClimbing', 'RollerSki',
  'Rowing', 'Snowboard', 'Snowshoe', 'StairStepper', 'StandUpPaddling',
  'Surfing', 'Velomobile', 'WeightTraining', 'Wheelchair', 'Windsurf',
  'Workout', 'Yoga'
];
const ActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsStravaConnection, setNeedsStravaConnection] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editData, setEditData] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.needsStravaConnection) {
      setNeedsStravaConnection(true);
    }
    fetchActivities();
  }, [location.state]);


  useEffect(() => {
    checkStravaConnection();
    fetchActivities();
  }, []);

  const checkStravaConnection = async () => {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await axios.get('http://localhost:5000/api/check-strava', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setNeedsStravaConnection(!response.data.connected);
      if (response.data.connected) {
        fetchActivities();
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
          console.log("Firebase ID token:", idToken); // Add this
      const response = await axios.get('http://localhost:5000/api/activities', {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
      });
          console.log("API Response:", response.data); // Add this
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
          console.error('Full error object:', error.response?.data || error.message); // Enhanced logging
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = () => {
    const uid = auth.currentUser.uid;
    window.location.href = `http://localhost:5000/auth/strava?state=${uid}`;
  };


  const handleSelectEvent = (activity) => {
    setSelectedActivity(activity);
    setEditData({
      name: activity.name,
      type: activity.type,
      start_date_local: format(new Date(activity.start_date_local), "yyyy-MM-dd'T'HH:mm"),
      elapsed_time: activity.elapsed_time,
      description: activity.description || '',
      distance: activity.distance
    });
  };


  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: name === 'elapsed_time' || name === 'distance' ? Number(value) : value
    }));
  };

  const handleSaveActivity = async () => {
    try {
      const idToken = await auth.currentUser.getIdToken();
      await axios.put(
        `http://localhost:5000/api/activities/${selectedActivity.id}`,
        {
          ...editData,
          start_date_local: new Date(editData.start_date_local).toISOString()
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      setSelectedActivity(null);
      fetchActivities(); // Refresh the list
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    title: `${activity.type}: ${activity.name}`,
    start: new Date(activity.start_date_local),
    end: new Date(new Date(activity.start_date_local).getTime() + activity.elapsed_time * 1000),
    ...activity
  }));

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Your Activities</h1>
        <div className="flex space-x-2">
        <button
          onClick={fetchActivities}
          className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
        >
          Refresh
        </button>
        <button
            onClick={handleLogout}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {needsStravaConnection && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <h2 className="font-bold text-lg mb-2">Connect to Strava</h2>
          <p className="mb-4">To view and sync your activities, please connect your Strava account.</p>
          <button
            onClick={handleConnectStrava}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
          >
            Connect to Strava
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2">No activities found</h2>
          <p>
            {needsStravaConnection 
              ? 'Connect your Strava account to see your activities' 
              : 'Complete an activity in Strava and refresh to see it here'}
          </p>
        </div>
      ) : (
        <div className="h-screen">
          <Calendar
            localizer={localizer}
            events={formattedActivities}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '80vh' }}
            onSelectEvent={handleSelectEvent}

          />
        </div>
      )}


    {/* Edit Dialog */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Activity</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    value={editData.type}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {sportTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    name="start_date_local"
                    value={editData.start_date_local}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    name="elapsed_time"
                    value={editData.elapsed_time}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (meters)</label>
                  <input
                    type="number"
                    name="distance"
                    value={editData.distance}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={editData.description}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivity}
                className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}  
    </div>
  );
};

export default ActivitiesPage;



