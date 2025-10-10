import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, Zap } from "lucide-react";

interface WeatherData {
  temperature: number | null;
  condition: string;
  location: string;
  isLoading: boolean;
}

const WeatherIcon: React.FC<{ condition: string }> = ({ condition }) => {
  const cls = "h-4 w-4 text-muted-foreground";
  switch (condition?.toLowerCase()) {
    case "clear":
    case "sunny":
      return <Sun className={cls} />;
    case "partly cloudy":
      return <Cloud className={cls} />;
    case "cloudy":
      return <Cloud className={cls} />;
    case "rainy":
      return <CloudRain className={cls} />;
    case "showers":
      return <CloudDrizzle className={cls} />;
    case "snowy":
      return <CloudSnow className={cls} />;
    case "stormy":
      return <Zap className={cls} />;
    default:
      return <Cloud className={cls} />;
  }
};

function getGreeting(d = new Date()) {
  const hour = d.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const DashboardWelcome: React.FC = () => {
  const { user } = useAuth();

  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: "",
    location: "",
    isLoading: true,
  });

  const displayName = useMemo(() => {
    const raw = user?.email?.split("@")[0] || "User";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [user?.email]);

  const latitude = user?.latitude;
  const longitude = user?.longitude;
  const city = user?.city;
  const state = user?.state;

  useEffect(() => {
    if (!latitude || !longitude) {
      setWeather({
        temperature: null,
        condition: "",
        location: "Set address in profile for weather",
        isLoading: false,
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      const fetchWeather = async () => {
        try {
          const lat = parseFloat(latitude.toString());
          const lon = parseFloat(longitude.toString());
          const locationName = city && state ? `${city}, ${state}` : "Your Location";

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
          );
          if (!response.ok) throw new Error("Weather fetch failed");
          const data = await response.json();
          const currentWeather = data.current_weather;

          const getCondition = (code: number) => {
            if (code === 0) return "clear";
            if (code <= 3) return "partly cloudy";
            if (code <= 48) return "cloudy";
            if (code <= 67) return "rainy";
            if (code <= 77) return "snowy";
            if (code <= 82) return "showers";
            return "stormy";
          };

          setWeather({
            temperature: Math.round(currentWeather.temperature),
            condition: getCondition(currentWeather.weathercode),
            location: locationName,
            isLoading: false,
          });
        } catch (error) {
          setWeather({
            temperature: null,
            condition: "clear",
            location: city && state ? `${city}, ${state}` : "Weather unavailable",
            isLoading: false,
          });
        }
      };

      fetchWeather();
      const interval = setInterval(fetchWeather, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [latitude, longitude, city, state]);

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-light text-foreground mb-2">
        {getGreeting()}, {displayName}!
      </h1>
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
        {weather.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-pulse">Loading weather...</div>
          </div>
        ) : (
          <>
            <WeatherIcon condition={weather.condition} />
            <span>
              {weather.temperature}°F and {weather.condition} in {weather.location}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
