/**
 * This script demonstrates how to collect Street View images for the game
 * In a real implementation, you would need to:
 * 1. Set up Google Street View Static API credentials
 * 2. Define the bounds for downtown Calgary
 * 3. Generate random points within those bounds
 * 4. Check if Street View is available at those points
 * 5. Download and save the images
 */

// Downtown Calgary bounds. Keep these in step with CALGARY_BOUNDS in
// lib/location-generator.ts: the scoring curve is calibrated to that box.
const CALGARY_BOUNDS = {
  north: 51.054582,
  south: 51.036649,
  east: -114.050461,
  west: -114.094705,
}

// Communities to ensure coverage
const CALGARY_COMMUNITIES = [
  { name: "Downtown Core", lat: 51.0466, lng: -114.0708 },
  { name: "Beltline", lat: 51.0398, lng: -114.0731 },
  { name: "Chinatown", lat: 51.0507, lng: -114.0637 },
  { name: "Eau Claire", lat: 51.0525, lng: -114.0729 },
  { name: "Kensington", lat: 51.0534, lng: -114.0872 },
  { name: "Sunnyside", lat: 51.0562, lng: -114.0833 },
  { name: "Crescent Heights", lat: 51.0596, lng: -114.0668 },
  { name: "East Village", lat: 51.0459, lng: -114.0525 },
]

/**
 * Generate a random point within the Calgary bounds
 */
function generateRandomPoint() {
  const lat = Math.random() * (CALGARY_BOUNDS.north - CALGARY_BOUNDS.south) + CALGARY_BOUNDS.south
  const lng = Math.random() * (CALGARY_BOUNDS.east - CALGARY_BOUNDS.west) + CALGARY_BOUNDS.west
  return { lat, lng }
}

/**
 * Generate a Street View image URL for a given location
 * @param lat Latitude
 * @param lng Longitude
 * @param apiKey Google API Key
 * @returns URL for the Street View image
 */
function generateStreetViewUrl(lat: number, lng: number, apiKey: string) {
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&heading=270&pitch=0&key=${apiKey}`
}

/**
 * Check if Street View is available at a given location
 * @param lat Latitude
 * @param lng Longitude
 * @param apiKey Google API Key
 * @returns Promise that resolves to true if Street View is available
 */
async function checkStreetViewAvailability(lat: number, lng: number, apiKey: string): Promise<boolean> {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.status === "OK"
  } catch (error) {
    console.error("Error checking Street View availability:", error)
    return false
  }
}

/**
 * Main function to collect Street View images
 * @param count Number of images to collect
 * @param apiKey Google API Key
 */
async function collectStreetViewImages(count: number, apiKey: string) {
  const locations = []

  console.log(`Collecting ${count} Street View images for Calgary...`)

  // First, collect images from specific communitys
  for (const community of CALGARY_COMMUNITIES) {
    console.log(`Checking ${community.name}...`)

    // Add some randomness to the exact location
    const lat = community.lat + (Math.random() - 0.5) * 0.005
    const lng = community.lng + (Math.random() - 0.5) * 0.005

    const hasStreetView = await checkStreetViewAvailability(lat, lng, apiKey)

    if (hasStreetView) {
      locations.push({
        lat,
        lng,
        name: community.name,
        url: generateStreetViewUrl(lat, lng, apiKey),
      })

      console.log(`Added ${community.name}`)
    }
  }

  // Then, collect random images until we reach the desired count
  while (locations.length < count) {
    const point = generateRandomPoint()

    const hasStreetView = await checkStreetViewAvailability(point.lat, point.lng, apiKey)

    if (hasStreetView) {
      // Determine which community this point is in (or closest to)
      let closestCommunity = CALGARY_COMMUNITIES[0]
      let minDistance = calculateDistance(point.lat, point.lng, closestCommunity.lat, closestCommunity.lng)

      for (const community of CALGARY_COMMUNITIES) {
        const distance = calculateDistance(point.lat, point.lng, community.lat, community.lng)

        if (distance < minDistance) {
          minDistance = distance
          closestCommunity = community
        }
      }

      locations.push({
        lat: point.lat,
        lng: point.lng,
        name: `Near ${closestCommunity.name}`,
        url: generateStreetViewUrl(point.lat, point.lng, apiKey),
      })

      console.log(`Added random location near ${closestCommunity.name}`)
    }
  }

  console.log(`Collected ${locations.length} Street View images`)
  return locations
}

/**
 * Calculate distance between two points (simplified version)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Example usage:
// Replace 'YOUR_API_KEY' with an actual Google API key
// collectStreetViewImages(50, 'YOUR_API_KEY').then(locations => {
//   console.log(`Collected ${locations.length} locations`);
//   // Save locations to a JSON file or database
// });
