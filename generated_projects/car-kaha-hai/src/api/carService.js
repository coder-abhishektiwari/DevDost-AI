```javascript
// src/api/carService.js

/**
 * Mock API service to fetch car data.
 *
 * @param {string|number} carId - Identifier of the car.
 * @returns {Promise<Object>} Resolves with car data after 500ms.
 * @throws {Error} If `carId` is falsy.
 */
export async function getCarData(carId) {
  if (!carId) {
    throw new Error('Invalid carId: value must be truthy.');
  }

  // Simulate network latency of 500ms
  await new Promise((resolve) => setTimeout(resolve, 500));

  const now = new Date();

  return {
    id: carId,
    model: 'Toyota Prius',
    licensePlate: 'AB12CD3456',
    timestamp: now.toISOString(),
    location: {
      lat: 28.6139,
      lng: 77.2090,
    },
  };
}
```