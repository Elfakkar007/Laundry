import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { MapPin, Search, Crosshair } from 'lucide-react';

// Fix Leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map events
function LocationMarker({ position, setPosition, onLocationChange }) {
    const markerRef = useRef(null);

    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            reverseGeocode(e.latlng.lat, e.latlng.lng);
        },
    });

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            onLocationChange({
                lat,
                lng,
                address: data.display_name || 'Unknown location'
            });
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            onLocationChange({ lat, lng, address: `${lat}, ${lng}` });
        }
    };

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const { lat, lng } = marker.getLatLng();
                setPosition([lat, lng]);
                reverseGeocode(lat, lng);
            }
        },
    };

    return position ? (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    ) : null;
}

// Component to handle map center changes
function ChangeMapView({ center }) {
    const map = useMap();
    
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    
    return null;
}

export default function LocationPicker({ 
    initialLat = -6.2088, 
    initialLng = 106.8456, 
    onLocationChange,
    height = '400px',
    zoom = 13
}) {
    const [position, setPosition] = useState(
        initialLat && initialLng ? [initialLat, initialLng] : null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    
    // Gunakan ref agar provider tidak dibuat ulang setiap render
    const provider = useRef(new OpenStreetMapProvider());

    useEffect(() => {
        // Init load address jika posisi ada
        if (position && onLocationChange) {
            // Opsional: fetch address awal jika diperlukan
            // reverseGeocode(position[0], position[1]);
        }
    }, []);

    // HAPUS "e" dari parameter karena kita panggil manual
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const results = await provider.current.search({ query: searchQuery });
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    };

    // Handle tombol Enter pada input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // PENTING: Mencegah submit form utama (Modal)
            handleSearch();
        }
    };

    const handleSelectResult = (result) => {
        const newPosition = [result.y, result.x];
        setPosition(newPosition);
        
        // Callback ke parent
        if (onLocationChange) {
            onLocationChange({
                lat: result.y,
                lng: result.x,
                address: result.label
            });
        }
        
        setSearchResults([]);
        setSearchQuery(''); // Opsional: bersihkan search bar setelah pilih
    };

    const handleGetCurrentLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setPosition([lat, lng]);
                    
                    // Trigger reverse geocode logic via fetch manual or let Marker component handle it
                    // Disini kita panggil reverse geocode manual agar konsisten
                    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                        .then(res => res.json())
                        .then(data => {
                            if (onLocationChange) {
                                onLocationChange({
                                    lat,
                                    lng,
                                    address: data.display_name
                                });
                            }
                        });
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Tidak dapat mengakses lokasi Anda');
                }
            );
        } else {
            alert('Geolocation tidak didukung di browser Anda');
        }
    };

    return (
        <div className="space-y-3 relative z-0"> {/* Relative context untuk dropdown */}
            <div className="flex gap-2">
                {/* HAPUS TAG FORM DISINI. Ganti dengan div. */}
                <div className="flex-1 flex gap-2 relative">
                    <Input
                        type="text"
                        placeholder="Cari alamat atau lokasi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown} // Handle Enter key
                        className="flex-1"
                    />
                    <Button 
                        type="button" // WAJIB TYPE BUTTON
                        disabled={searching}
                        onClick={handleSearch}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        {searching ? '...' : 'Cari'}
                    </Button>
                </div>
                
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGetCurrentLocation}
                    title="Gunakan lokasi saya"
                >
                    <Crosshair className="h-4 w-4" />
                </Button>
            </div>

            {/* Dropdown Hasil Pencarian (Floating/Absolute) */}
            {searchResults.length > 0 && (
                <div className="absolute top-12 left-0 right-0 z-[9999] bg-white dark:bg-gray-800 border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                        <button
                            key={index}
                            type="button" // Cegah submit
                            onClick={() => handleSelectResult(result)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 flex items-start gap-2 transition-colors"
                        >
                            <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-red-500" />
                            <span className="text-sm line-clamp-2">{result.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <div 
                className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 relative z-0"
                style={{ height }}
            >
                <MapContainer
                    center={position || [initialLat, initialLng]}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker 
                        position={position} 
                        setPosition={setPosition}
                        onLocationChange={onLocationChange}
                    />
                    <ChangeMapView center={position} />
                </MapContainer>
            </div>

            <p className="text-xs text-gray-500">
                <MapPin className="h-3 w-3 inline mr-1" />
                Klik pada peta atau geser marker untuk memilih lokasi. Gunakan search untuk menemukan alamat.
            </p>
        </div>
    );
}