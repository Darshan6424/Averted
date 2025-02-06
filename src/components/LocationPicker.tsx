
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LocationPickerProps {
  onLocationSelected: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

interface SearchResult {
  place_name: string;
  center: [number, number];
}

const LocationPicker = ({ onLocationSelected, initialLat = 28.3949, initialLng = 84.1240 }: LocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      setSearchResults(data.features.map((feature: any) => ({
        place_name: feature.place_name,
        center: feature.center
      })));
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    }
  };

  const selectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    
    // Update marker position
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    }
    
    // Fly to the location
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true
      });
    }

    // Update search input and close popover
    setSearchInput(result.place_name);
    setOpen(false);

    // Trigger the location selected callback
    onLocationSelected(lat, lng);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYW53ZXNoMTMiLCJhIjoiY202dGhsMGExMDNmMjJscjN1dGdpYTB0cyJ9.UhrIpur7WpvGR5NmJDfbpQ';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [initialLng, initialLat],
      zoom: 6
    });

    // Add navigation controls (zoom in/out and rotation)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Create marker
    marker.current = new mapboxgl.Marker({
      draggable: true
    })
      .setLngLat([initialLng, initialLat])
      .addTo(map.current);

    // Handle marker drag end
    marker.current.on('dragend', () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        onLocationSelected(lngLat.lat, lngLat.lng);
      }
    });

    // Handle map click - Updated to be more precise
    map.current.on('click', (e) => {
      e.preventDefault(); // Prevent any default behavior
      
      const { lng, lat } = e.lngLat;
      
      // Update marker position immediately
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      }
      
      // Update selected location without moving the map
      onLocationSelected(lat, lng);
    });

    // Enable scroll zoom
    map.current.scrollZoom.enable();

    return () => {
      map.current?.remove();
    };
  }, [initialLat, initialLng, onLocationSelected]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClick={() => setOpen(true)}
              className="flex-1"
            />
            <button
              className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              aria-label="Search location"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((result, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => selectLocation(result)}
                  className="cursor-pointer"
                >
                  {result.place_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <div ref={mapContainer} className="w-full h-[300px] rounded-lg mb-4" />
    </div>
  );
};

export default LocationPicker;
