import { useQuery } from "@tanstack/react-query";

interface WeatherData {
  main: string;
  description: string;
  temp: number;
  humidity: number;
  windSpeed: number;
}

export function useWeather() {
  return useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    refetchInterval: 1000 * 60 * 30, // Refetch every 30 minutes
  });
}
