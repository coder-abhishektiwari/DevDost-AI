```jsx
import React from 'react';
import PropTypes from 'prop-types';

const CarInfo = ({ car }) => {
  const { model, licensePlate, timestamp } = car;
  const formattedTime = new Date(timestamp).toLocaleString();

  return (
    <div className="car-info">
      <h2>Car Details</h2>
      <p><strong>Model:</strong> {model}</p>
      <p><strong>License Plate:</strong> {licensePlate}</p>
      <p><strong>Last Seen:</strong> {formattedTime}</p>
    </div>
  );
};

CarInfo.propTypes = {
  car: PropTypes.shape({
    model: PropTypes.string.isRequired,
    licensePlate: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
};

export default CarInfo;
```