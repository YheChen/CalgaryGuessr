// lib/location-generator.ts

import { hasStreetView } from "@/lib/streetview";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

const CALGARY_BOUNDS = {
  north: 51.054582, // Northeast corner 51.054582, -114.053253
  south: 51.036649, // Southwest corner 51.036649, -114.094705
  west: -114.094705, // Northwest corner 51.056375, -114.094705
  east: -114.050461, // Southeast corner 51.035962, -114.050461
};

export interface Location {
  lat: number;
  lng: number;
}

export async function generateRandomLocation(): Promise<Location> {
  const lat =
    Math.random() * (CALGARY_BOUNDS.north - CALGARY_BOUNDS.south) +
    CALGARY_BOUNDS.south;
  const lng =
    Math.random() * (CALGARY_BOUNDS.east - CALGARY_BOUNDS.west) +
    CALGARY_BOUNDS.west;
  return { lat, lng };
}

export async function validateStreetView(location: Location): Promise<boolean> {
  return await hasStreetView(location.lat, location.lng);
}

export async function getVerifiedLocations(count = 10): Promise<Location[]> {
  const verifiedRef = collection(db, "verifiedLocations");
  const snap = await getDocs(verifiedRef);

  const allLocations: Location[] = snap.docs.map((doc) => {
    const data = doc.data();
    return { lat: data.lat, lng: data.lng };
  });

  // Shuffle and select unique random entries
  const shuffled = allLocations.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  // If not enough cached, generate more
  while (selected.length < count) {
    const candidate = await generateRandomLocation();
    const isValid = await validateStreetView(candidate);
    if (isValid) {
      await addDoc(verifiedRef, candidate);
      selected.push(candidate);
    }
  }

  return selected;
}
