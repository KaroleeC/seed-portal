import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateSignatureHTML, type SignatureConfig } from "@/lib/signature-generator";
import {
  Save,
  Loader2,
  Copy,
  Check,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Mail,
  Phone,
  Globe,
  MapPin,
  Layout,
  Palette,
  User,
} from "lucide-react";

const DEFAULT_CONFIG: SignatureConfig = {
  firstName: "Jon",
  lastName: "Walls",
  jobTitle: "Senior Account Executive",
  company: "Seed Financial",
  department: "",
  email: "jon@seedfinancial.io",
  phone: "+1 (555) 123-4567",
  website: "https://seedfinancial.io",
  address: "",
  linkedinUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  photoUrl: "",
  logoUrl:
    "https://gbrwvokprjdibuxibpyh.supabase.co/storage/v1/object/public/seed-portal-assets/logos/brand/seed-financial-light.png",
  layout: "template1",
  colorScheme: "#3b82f6",
  textColor: "#000000",
  fontFamily: "Arial, sans-serif",
  fontSize: "medium",
  logoSize: "small",
  showDivider: true,
  showSocialIcons: true,
  showDepartment: false,
  showAddress: false,
  showLinkedin: false,
  showTwitter: false,
  showFacebook: false,
  showInstagram: false,
};

export function SignatureBuilderV3() {
  const [config, setConfig] = useState<SignatureConfig>(DEFAULT_CONFIG);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"personal" | "contact" | "social" | "design">(
    "personal"
  );
  const { toast } = useToast();

  useEffect(() => {
    loadSignature();
  }, []);

  const loadSignature = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/user/signature");
      setEnabled(data.enabled ?? true);
      // Merge loaded config with defaults to handle new fields
      if (data.config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
    } catch (error) {
      console.error("Failed to load signature:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof SignatureConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (file: File, type: "photo" | "logo") => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Get Supabase auth token from localStorage
      // Supabase stores the session in a key like 'sb-{project-ref}-auth-token'
      let token = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sb-") && key?.endsWith("-auth-token")) {
          const session = localStorage.getItem(key);
          if (session) {
            try {
              const parsed = JSON.parse(session);
              token = parsed.access_token;
              break;
            } catch (e) {
              // Continue looking
            }
          }
        }
      }

      const response = await fetch("/api/upload/signature-image", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const { url } = await response.json();
      updateConfig(type === "photo" ? "photoUrl" : "logoUrl", url);

      toast({
        title: "Image uploaded",
        description: `${type === "photo" ? "Photo" : "Logo"} uploaded successfully`,
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveSignature = async () => {
    setSaving(true);
    try {
      // Save the configuration instead of HTML so it can be regenerated anywhere
      await apiRequest("/api/user/signature", {
        method: "PUT",
        body: {
          config,
          enabled,
        },
      });
      toast({ title: "Saved!", description: "Your email signature has been updated" });
    } catch (error) {
      console.error("Save failed:", error);
      toast({ title: "Error", description: "Failed to save signature", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    const html = generateSignatureHTML(config);
    navigator.clipboard.writeText(html);
    setCopied(true);
    toast({ title: "Copied!", description: "Signature HTML copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const signatureHTML = generateSignatureHTML(config);

  const sections = [
    { id: "personal" as const, label: "Personal Info", icon: User },
    { id: "contact" as const, label: "Contact", icon: Mail },
    { id: "social" as const, label: "Social & Media", icon: Globe },
    { id: "design" as const, label: "Design", icon: Palette },
  ];

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col gap-4 p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl shadow-2xl">
        <div>
          <h2 className="text-2xl font-semibold">Email Signature Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create a professional signature for your emails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
            <Label htmlFor="enabled" className="text-sm font-medium cursor-pointer">
              Auto-append
            </Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <Button onClick={copyToClipboard} variant="outline">
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy HTML
          </Button>
          <Button onClick={saveSignature} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Signature
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-56 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl shadow-2xl p-2 space-y-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Center - Editor */}
        <Card className="flex-1 overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl shadow-2xl">
          <CardContent className="p-6 h-full overflow-y-auto">
            {activeSection === "personal" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={config.firstName}
                          onChange={(e) => updateConfig("firstName", e.target.value)}
                          placeholder="Jon"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={config.lastName}
                          onChange={(e) => updateConfig("lastName", e.target.value)}
                          placeholder="Walls"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={config.jobTitle}
                        onChange={(e) => updateConfig("jobTitle", e.target.value)}
                        placeholder="Senior Account Executive"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={config.company}
                        onChange={(e) => updateConfig("company", e.target.value)}
                        placeholder="Seed Financial"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label htmlFor="showDepartment" className="cursor-pointer">
                          Include Department
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add your department to signature
                        </p>
                      </div>
                      <Switch
                        id="showDepartment"
                        checked={config.showDepartment}
                        onCheckedChange={(checked) => updateConfig("showDepartment", checked)}
                      />
                    </div>
                    {config.showDepartment && (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={config.department}
                          onChange={(e) => updateConfig("department", e.target.value)}
                          placeholder="Sales"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "contact" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={config.email}
                          onChange={(e) => updateConfig("email", e.target.value)}
                          placeholder="jon@seedfinancial.io"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={config.phone}
                          onChange={(e) => updateConfig("phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          value={config.website}
                          onChange={(e) => updateConfig("website", e.target.value)}
                          placeholder="https://seedfinancial.io"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label htmlFor="showAddress" className="cursor-pointer">
                          Include Address
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add your address to signature
                        </p>
                      </div>
                      <Switch
                        id="showAddress"
                        checked={config.showAddress}
                        onCheckedChange={(checked) => updateConfig("showAddress", checked)}
                      />
                    </div>
                    {config.showAddress && (
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="address"
                            value={config.address}
                            onChange={(e) => updateConfig("address", e.target.value)}
                            placeholder="123 Main St, San Francisco, CA"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "social" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Social Media & Branding</h3>
                  <div className="space-y-4">
                    {/* LinkedIn */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                        <div>
                          <Label htmlFor="showLinkedin" className="cursor-pointer">
                            LinkedIn
                          </Label>
                          <p className="text-xs text-muted-foreground">Add LinkedIn icon</p>
                        </div>
                      </div>
                      <Switch
                        id="showLinkedin"
                        checked={config.showLinkedin}
                        onCheckedChange={(checked) => updateConfig("showLinkedin", checked)}
                      />
                    </div>
                    {config.showLinkedin && (
                      <Input
                        value={config.linkedinUrl}
                        onChange={(e) => updateConfig("linkedinUrl", e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                      />
                    )}

                    {/* Twitter */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Twitter className="h-5 w-5" />
                        <div>
                          <Label htmlFor="showTwitter" className="cursor-pointer">
                            Twitter / X
                          </Label>
                          <p className="text-xs text-muted-foreground">Add Twitter icon</p>
                        </div>
                      </div>
                      <Switch
                        id="showTwitter"
                        checked={config.showTwitter}
                        onCheckedChange={(checked) => updateConfig("showTwitter", checked)}
                      />
                    </div>
                    {config.showTwitter && (
                      <Input
                        value={config.twitterUrl}
                        onChange={(e) => updateConfig("twitterUrl", e.target.value)}
                        placeholder="https://twitter.com/username"
                      />
                    )}

                    {/* Facebook */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Facebook className="h-5 w-5 text-blue-700" />
                        <div>
                          <Label htmlFor="showFacebook" className="cursor-pointer">
                            Facebook
                          </Label>
                          <p className="text-xs text-muted-foreground">Add Facebook icon</p>
                        </div>
                      </div>
                      <Switch
                        id="showFacebook"
                        checked={config.showFacebook}
                        onCheckedChange={(checked) => updateConfig("showFacebook", checked)}
                      />
                    </div>
                    {config.showFacebook && (
                      <Input
                        value={config.facebookUrl}
                        onChange={(e) => updateConfig("facebookUrl", e.target.value)}
                        placeholder="https://facebook.com/username"
                      />
                    )}

                    {/* Instagram */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <Instagram className="h-5 w-5 text-pink-600" />
                        <div>
                          <Label htmlFor="showInstagram" className="cursor-pointer">
                            Instagram
                          </Label>
                          <p className="text-xs text-muted-foreground">Add Instagram icon</p>
                        </div>
                      </div>
                      <Switch
                        id="showInstagram"
                        checked={config.showInstagram}
                        onCheckedChange={(checked) => updateConfig("showInstagram", checked)}
                      />
                    </div>
                    {config.showInstagram && (
                      <Input
                        value={config.instagramUrl}
                        onChange={(e) => updateConfig("instagramUrl", e.target.value)}
                        placeholder="https://instagram.com/username"
                      />
                    )}

                    {/* Photos & Logo */}
                    <div className="border-t pt-4 mt-6">
                      <h4 className="font-semibold mb-4">Branding</h4>
                      <div className="space-y-4">
                        {/* Profile Photo */}
                        <div className="space-y-2">
                          <Label>Profile Photo</Label>
                          <div className="flex items-center gap-4">
                            {config.photoUrl && (
                              <img
                                src={config.photoUrl}
                                alt="Profile"
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById("photo-upload")?.click()}
                            >
                              {config.photoUrl ? "Change Photo" : "Upload Photo"}
                            </Button>
                            <input
                              id="photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, "photo");
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Square photos work best (appears as circular)
                          </p>
                        </div>

                        {/* Company Logo */}
                        <div className="space-y-2">
                          <Label>Company Logo</Label>
                          <div className="flex items-center gap-4">
                            {config.logoUrl && (
                              <img
                                src={config.logoUrl}
                                alt="Logo"
                                className="h-12 object-contain"
                              />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById("logo-upload")?.click()}
                            >
                              {config.logoUrl ? "Change Logo" : "Upload Logo"}
                            </Button>
                            <input
                              id="logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, "logo");
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Seed Financial logo by default
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "design" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Design Options</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label>Template Style</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            value: "template1" as const,
                            label: "Template 1",
                            desc: "Photo left, info right",
                          },
                          {
                            value: "template2" as const,
                            label: "Template 2",
                            desc: "Centered layout",
                          },
                          {
                            value: "template3" as const,
                            label: "Template 3",
                            desc: "Three column split",
                          },
                        ].map((layout) => (
                          <button
                            key={layout.value}
                            onClick={() => updateConfig("layout", layout.value)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              config.layout === layout.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Layout className="h-5 w-5 mb-2" />
                            <div className="font-medium text-sm">{layout.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{layout.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="colorScheme">Accent Color</Label>
                      <div className="flex gap-3">
                        <Input
                          id="colorScheme"
                          type="color"
                          value={config.colorScheme}
                          onChange={(e) => updateConfig("colorScheme", e.target.value)}
                          className="w-20 h-12 cursor-pointer"
                        />
                        <Input
                          value={config.colorScheme}
                          onChange={(e) => updateConfig("colorScheme", e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Used for your name, links, and accents
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex gap-3">
                        <Input
                          id="textColor"
                          type="color"
                          value={config.textColor}
                          onChange={(e) => updateConfig("textColor", e.target.value)}
                          className="w-20 h-12 cursor-pointer"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => updateConfig("textColor", e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Main text color for name and title
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <select
                        id="fontFamily"
                        value={config.fontFamily}
                        onChange={(e) => updateConfig("fontFamily", e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                        <option value="'Georgia', serif">Georgia</option>
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                        <option value="'Verdana', sans-serif">Verdana</option>
                        <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                        <option value="'Tahoma', sans-serif">Tahoma</option>
                      </select>
                      <p className="text-xs text-muted-foreground">Choose a web-safe font</p>
                    </div>

                    <div className="space-y-3">
                      <Label>Font Size</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "small" as const, label: "Small", desc: "12-14px" },
                          { value: "medium" as const, label: "Medium", desc: "14-16px" },
                          { value: "large" as const, label: "Large", desc: "16-18px" },
                        ].map((size) => (
                          <button
                            key={size.value}
                            onClick={() => updateConfig("fontSize", size.value)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                              config.fontSize === size.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="font-medium text-sm">{size.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{size.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Logo Size</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "small" as const, label: "Small", desc: "120x40px" },
                          { value: "medium" as const, label: "Medium", desc: "180x60px" },
                          { value: "large" as const, label: "Large", desc: "240x80px" },
                        ].map((size) => (
                          <button
                            key={size.value}
                            onClick={() => updateConfig("logoSize", size.value)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                              config.logoSize === size.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="font-medium text-sm">{size.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{size.desc}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Adjust company logo size</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label htmlFor="showDivider" className="cursor-pointer">
                            Show Divider Line
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Horizontal line separator
                          </p>
                        </div>
                        <Switch
                          id="showDivider"
                          checked={config.showDivider}
                          onCheckedChange={(checked) => updateConfig("showDivider", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <Label htmlFor="showSocialIcons" className="cursor-pointer">
                            Show Social Icons
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Display social media icons
                          </p>
                        </div>
                        <Switch
                          id="showSocialIcons"
                          checked={config.showSocialIcons}
                          onCheckedChange={(checked) => updateConfig("showSocialIcons", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right - Live Preview */}
        <div className="w-[640px] bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-600/50">
            <h3 className="font-semibold">Live Preview</h3>
            <p className="text-sm text-muted-foreground mt-1">
              How your signature will appear in emails
            </p>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Always white background since email signatures appear on white backgrounds in email clients */}
            <div
              style={{ backgroundColor: "#ffffff" }}
              className="rounded-lg shadow-lg border border-gray-200 p-8"
            >
              <div dangerouslySetInnerHTML={{ __html: signatureHTML }} />
            </div>
            <p className="text-xs text-white/60 mt-3 text-center">
              Preview on white background (as it appears in emails)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
