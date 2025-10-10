import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateSignatureHTML } from "@/lib/signature-generator";

interface SignatureConfig {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  department: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  photoUrl: string;
  logoUrl: string;
  layout: "template1" | "template2" | "template3";
  colorScheme: string;
  textColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  logoSize: "small" | "medium" | "large";
  showDivider: boolean;
  showSocialIcons: boolean;
  showDepartment: boolean;
  showAddress: boolean;
  showLinkedin: boolean;
  showTwitter: boolean;
  showFacebook: boolean;
  showInstagram: boolean;
}

interface EmailSignatureResponse {
  config: SignatureConfig | null;
  enabled: boolean;
}

export function useEmailSignature() {
  const { data, isLoading } = useQuery<EmailSignatureResponse>({
    queryKey: ["/api/user/signature"],
    queryFn: () => apiRequest("/api/user/signature"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate HTML from config
  const signature = data?.config ? generateSignatureHTML(data.config) : "";

  return {
    signature,
    enabled: data?.enabled ?? true,
    isLoading,
  };
}

/**
 * Appends email signature to content if enabled
 * @param content Current email body HTML
 * @param signature User's signature HTML
 * @param enabled Whether signature is enabled
 * @returns Content with signature appended
 */
export function appendSignature(content: string, signature: string, enabled: boolean): string {
  if (!enabled || !signature) {
    return content;
  }

  // Add signature after content with proper spacing
  const signatureSeparator = "<br/><br/>--<br/>";
  return `${content}${signatureSeparator}${signature}`;
}
