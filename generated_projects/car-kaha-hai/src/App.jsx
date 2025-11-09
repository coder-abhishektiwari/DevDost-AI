```jsx
import React, { useState } from 'react';
import './styles.css';
import SearchBar from './components/SearchBar.jsx';
import CarMap from './components/CarMap.jsx';
import CarInfo from './components/CarInfo.jsx';
import { getCarData } from './api/carService.js';

function App() {
  const [carData, setCarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (carId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCarData(carId);
      setCarData(data);
    } catch (e) {
      setError('Car not found or service error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <SearchBar onSearch={handleSearch} />
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {carData && (
        <div
          className="content-wrapper"
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div className="map-container" style={{ flex: '1 1 300px', height: '400px' }}>
            <CarMap location={carData.location} />
          </div>
          <div className="info-container" style={{ flex: '1 1 300px' }}>
            <CarInfo car={carData} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
```