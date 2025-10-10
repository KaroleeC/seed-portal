import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import {
  updateProfileSchema,
  type UpdateProfile,
  changePasswordSchema,
  type ChangePassword,
} from "@shared/schema";
import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, Camera, Shield, RefreshCw, MapPin, Mail, User } from "lucide-react";

// Embedded version of the current /profile layout without page chrome
export default function ProfileSettingsFullPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Phone formatting
  const formatPhoneNumber = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length >= 10)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length >= 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return digits;
  }, []);

  // Profile form
  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber ? formatPhoneNumber(user.phoneNumber) : "",
      profilePhoto: user?.profilePhoto || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      zipCode: user?.zipCode || "",
      country: user?.country || "US",
    },
  });

  // Weather state
  type WeatherData = {
    temperature: number | null;
    condition: string;
    location: string;
    isLoading: boolean;
  };
  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: "",
    location: user?.city && user?.state ? `${user.city}, ${user.state}` : "",
    isLoading: false,
  });

  // Address autocomplete
  type AddressSuggestion = {
    display_name: string;
    lat: string;
    lon: string;
    address: {
      house_number?: string;
      road?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
  };
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");

  // Simple debounce
  function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): T {
    let t: any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ((...args: any[]) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    }) as T;
  }

  const searchAddresses = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as AddressSuggestion[];
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // ignore
      }
    }, 300),
    []
  );

  const selectAddress = (s: AddressSuggestion) => {
    const addr = s.address;
    const street = `${addr.house_number || ""} ${addr.road || ""}`.trim();
    const city = addr.city || addr.town || addr.village || "";
    const state = addr.state || "";
    const zip = addr.postcode || "";

    form.setValue("address", street, { shouldDirty: true, shouldValidate: true });
    form.setValue("city", city, { shouldDirty: true, shouldValidate: true });
    form.setValue("state", state, { shouldDirty: true, shouldValidate: true });
    form.setValue("zipCode", zip, { shouldDirty: true, shouldValidate: true });
    setAddressQuery(`${street}, ${city}, ${state} ${zip}`.trim());
    setShowSuggestions(false);
    if (street && city && state) void fetchWeatherForAddress(street, city, state, zip);
  };

  // Geocode and weather
  type GeocodeResult = { latitude: number; longitude: number; location: string } | null;
  const geocodeAddress = async (
    address: string,
    city: string,
    state: string
  ): Promise<GeocodeResult> => {
    try {
      const cityState = `${city}, ${state}`;
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityState)}&count=1&language=en&format=json`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.results || data.results.length === 0) return null;
      const r = data.results[0];
      return { latitude: r.latitude, longitude: r.longitude, location: cityState };
    } catch {
      return null;
    }
  };

  const fetchWeatherByCoordinates = async (lat: number, lon: number, location: string) => {
    try {
      setWeather((w) => ({ ...w, isLoading: true }));
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
      );
      if (!res.ok) throw new Error("weather");
      const data = await res.json();
      const code = data.current_weather?.weathercode as number | undefined;
      const toCond = (c?: number) => {
        if (c === undefined) return "";
        if (c === 0) return "clear";
        if (c <= 3) return "partly cloudy";
        if (c <= 48) return "cloudy";
        if (c <= 67) return "rainy";
        if (c <= 77) return "snowy";
        if (c <= 82) return "showers";
        return "stormy";
      };
      setWeather({
        temperature: Math.round(data.current_weather.temperature),
        condition: toCond(code),
        location,
        isLoading: false,
      });
    } catch {
      setWeather((w) => ({ ...w, isLoading: false }));
    }
  };

  const fetchWeatherForAddress = async (
    address: string,
    city: string,
    state: string,
    zipCode: string
  ) => {
    const geo = await geocodeAddress(address, city, state);
    if (!geo) return;
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        latitude: String(geo.latitude),
        longitude: String(geo.longitude),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch {
      // non-blocking
    }
    await fetchWeatherByCoordinates(geo.latitude, geo.longitude, geo.location);
  };

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => await apiRequest("PATCH", "/api/user/profile", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile Updated", description: "Your profile has been saved." });
    },
    onError: (err: unknown) =>
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  const syncHubSpotMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/user/sync-hubspot", {}),
    onSuccess: async (data: any) => {
      toast({
        title: "HubSpot sync completed",
        description: `Updated: ${data?.syncedFields?.join(", ") || "No changes"}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (err: unknown) =>
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  const passwordForm = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePassword) =>
      await apiRequest("POST", "/api/user/change-password", JSON.stringify(data)),
    onSuccess: async () => {
      toast({ title: "Password Changed", description: "Your password has been updated." });
      passwordForm.reset();
    },
    onError: (err: unknown) =>
      toast({
        title: "Password Change Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const csrfRes = await fetch("/api/csrf-token", { credentials: "include" });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch("/api/user/upload-photo", {
        method: "POST",
        body: formData,
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      form.setValue("profilePhoto", result.photoUrl);
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        profilePhoto: result.photoUrl,
      }));
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Success", description: "Profile photo updated successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Live weather init if coords exist
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      const loc = user.city && user.state ? `${user.city}, ${user.state}` : "";
      void fetchWeatherByCoordinates(parseFloat(user.latitude), parseFloat(user.longitude), loc);
    }
  }, [user?.latitude, user?.longitude]);

  const onSubmit = (data: UpdateProfile) => updateProfileMutation.mutate(data);

  const weatherIcon = useMemo(() => {
    const cls = "h-4 w-4";
    const c = weather.condition.toLowerCase();
    if (c === "clear" || c === "sunny") return <Cloud className={cls} />;
    if (c.includes("cloud")) return <Cloud className={cls} />;
    if (c.includes("rain")) return <Cloud className={cls} />;
    return <Cloud className={cls} />;
  }, [weather.condition]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Profile Information */}
        <div className="md:col-span-2">
          <SurfaceCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <User className="h-5 w-5 text-orange-500" /> Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* HubSpot synced fields (read-only) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    HubSpot Profile Data
                  </h3>
                  <Button
                    onClick={() => syncHubSpotMutation.mutate()}
                    disabled={syncHubSpotMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${syncHubSpotMutation.isPending ? "animate-spin" : ""}`}
                    />
                    {syncHubSpotMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-muted-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={user?.firstName || ""}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-muted-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={user?.lastName || ""}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-muted-foreground">
                    Email
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Editable form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Contact */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Contact Information
                    </h3>
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 555-5555"
                              {...field}
                              onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                              className="border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Address & Location */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Address & Location
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        <MapPin className="inline h-4 w-4 mr-1" /> Address Search
                      </Label>
                      <div className="relative">
                        <Input
                          placeholder="Start typing your address..."
                          value={addressQuery}
                          onChange={(e) => {
                            setAddressQuery(e.target.value);
                            searchAddresses(e.target.value);
                          }}
                          onFocus={() => {
                            if (addressSuggestions.length > 0) setShowSuggestions(true);
                          }}
                          className="border"
                        />
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div
                            data-suggestion-dropdown
                            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                          >
                            {addressSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  selectAddress(suggestion);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-muted/70 focus:bg-muted/70 focus:outline-none border-b border-border last:border-b-0"
                              >
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <div className="text-sm">
                                    <div className="text-foreground font-medium">
                                      {suggestion.address.house_number} {suggestion.address.road}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {suggestion.display_name}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="CA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP</FormLabel>
                            <FormControl>
                              <Input placeholder="90210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateProfileMutation.isPending && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}{" "}
                      Update Profile
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </SurfaceCard>
        </div>

        {/* Right: Weather, Photo, Password */}
        <div className="space-y-6">
          {/* Live Weather */}
          <SurfaceCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Cloud className="h-5 w-5 text-blue-500" /> Live Weather
              </CardTitle>
              <CardDescription>Current weather conditions</CardDescription>
            </CardHeader>
            <CardContent>
              {weather.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading weather…</div>
              ) : weather.temperature == null ? (
                <Alert>
                  <AlertDescription>Add your address to see weather</AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center gap-3">
                  {weatherIcon}
                  <div>
                    <div className="text-2xl font-semibold">{weather.temperature}°F</div>
                    <div className="text-sm text-muted-foreground">
                      {weather.condition} • {weather.location}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </SurfaceCard>

          {/* Profile Photo */}
          <SurfaceCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Camera className="h-5 w-5 text-muted-foreground" /> Profile Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user?.profilePhoto || undefined}
                    alt={user?.email || "avatar"}
                  />
                  <AvatarFallback>{user?.firstName?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <input
                    id="photoUpload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPhotoChange}
                  />
                  <label
                    htmlFor="photoUpload"
                    className="cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border"
                  >
                    Change Photo
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Upload a new profile photo (5mb max)
                  </p>
                </div>
              </div>
            </CardContent>
          </SurfaceCard>
          {/* Change Password */}
          <SurfaceCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Shield className="h-5 w-5 text-green-600" /> Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    className="flex items-center"
                    data-testid="button-open-password-modal"
                  >
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" /> Change Password
                    </DialogTitle>
                    <DialogDescription>
                      Update your account password. You'll need to enter your current password.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))}
                      className="space-y-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                          {changePasswordMutation.isPending && (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          )}{" "}
                          Change Password
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
