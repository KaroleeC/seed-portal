/**
 * Email Signature Generator
 * Converts JSON signature config to HTML for email clients
 * Matches client-side generator for consistency
 */

export interface SignatureConfig {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  photoUrl?: string;
  logoUrl?: string;
  layout?: "template1" | "template2" | "template3";
  colorScheme?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: "small" | "medium" | "large";
  logoSize?: "small" | "medium" | "large";
  showDivider?: boolean;
  showSocialIcons?: boolean;
  showDepartment?: boolean;
  showAddress?: boolean;
  showLinkedin?: boolean;
  showTwitter?: boolean;
  showFacebook?: boolean;
  showInstagram?: boolean;
}

/**
 * Generate HTML signature from JSON config
 * Uses tables for maximum email client compatibility
 */
export function generateSignatureHTML(config: SignatureConfig): string {
  const {
    firstName = "",
    lastName = "",
    jobTitle = "",
    company = "",
    department = "",
    email = "",
    phone = "",
    website = "",
    address = "",
    linkedinUrl = "",
    twitterUrl = "",
    facebookUrl = "",
    instagramUrl = "",
    photoUrl = "",
    logoUrl = "",
    layout = "template1",
    colorScheme = "#ff6b35",
    textColor = "#333333",
    fontFamily = "Arial, sans-serif",
    fontSize = "medium",
    logoSize = "medium",
    showDivider = true,
    showDepartment = false,
    showAddress = false,
    showLinkedin = false,
    showTwitter = false,
    showFacebook = false,
    showInstagram = false,
  } = config;

  const fullName = `${firstName} ${lastName}`.trim();
  const placeholderSVG =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23cbd5e1"/%3E%3Cpath fill="%23fff" d="M50 45c8.3 0 15-6.7 15-15s-6.7-15-15-15-15 6.7-15 15 6.7 15 15 15zm0 7.5c-10 0-30 5-30 15V75h60v-7.5c0-10-20-15-30-15z"/%3E%3C/svg%3E';
  const displayPhoto = photoUrl || placeholderSVG;

  // Font size mapping
  const fontSizes: Record<string, { base: string; name: string; title: string }> = {
    small: { base: "12px", name: "14px", title: "12px" },
    medium: { base: "14px", name: "16px", title: "14px" },
    large: { base: "16px", name: "18px", title: "16px" },
  };
  const sizes = fontSizes[fontSize] || fontSizes.medium;

  // Logo size mapping
  const logoSizes: Record<string, { width: string; height: string }> = {
    small: { width: "120px", height: "40px" },
    medium: { width: "180px", height: "60px" },
    large: { width: "240px", height: "80px" },
  };
  const logoSizeStyle = logoSizes[logoSize] || logoSizes.medium;

  const socialLinks = [
    { url: linkedinUrl, alt: "LinkedIn", show: showLinkedin },
    { url: twitterUrl, alt: "Twitter", show: showTwitter },
    { url: facebookUrl, alt: "Facebook", show: showFacebook },
    { url: instagramUrl, alt: "Instagram", show: showInstagram },
  ].filter((s) => s.url && s.show);

  const renderSocialIcons = () => {
    if (socialLinks.length === 0) return "";
    const iconMap: Record<string, { icon: string; color: string }> = {
      LinkedIn: { icon: "in", color: "#0077B5" },
      Twitter: { icon: "𝕏", color: "#000000" },
      Facebook: { icon: "f", color: "#1877F2" },
      Instagram: { icon: "IG", color: "#E4405F" },
    };
    return socialLinks
      .map((s) => {
        const data = iconMap[s.alt] || { icon: s.alt.charAt(0), color: colorScheme };
        return `<a href="${s.url}" style="display: inline-block; background-color: ${data.color}; border-radius: 50%; width: 26px; height: 26px; text-align: center; line-height: 26px; text-decoration: none; color: white; font-weight: bold; font-size: 11px; margin-right: 8px;">${data.icon}</a>`;
      })
      .join("");
  };

  const renderContactIcon = (type: "phone" | "email" | "website") => {
    const icons = { phone: "☎", email: "✉", website: "🌐" };
    const icon = icons[type];
    return `<span style="display: inline-block; background-color: ${colorScheme}; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; color: white; font-size: 12px; margin-right: 6px;">${icon}</span>`;
  };

  // Template 1: Photo left, info stacked vertically on right
  if (layout === "template1") {
    return `
<table cellpadding="0" cellspacing="0" style="font-family: ${fontFamily}; font-size: ${sizes.base}; line-height: 1.4;">
  <tbody>
    <tr>
      <td style="vertical-align: top; padding-right: 20px;">
        <img src="${displayPhoto}" alt="${fullName}" style="width: 80px; height: 80px; border-radius: 50%; display: block; object-fit: cover;">
      </td>
      <td style="vertical-align: top;">
        <div style="margin-bottom: 4px;">
          <strong style="font-size: ${sizes.name}; color: ${colorScheme};">${fullName}</strong>
        </div>
        ${jobTitle ? `<div style="color: ${textColor}; margin-bottom: 2px; font-size: ${sizes.title};">${jobTitle}</div>` : ""}
        ${company ? `<div style="color: #666666; margin-bottom: 2px; font-size: ${sizes.base};">${company}${showDepartment && department ? ` | ${department}` : ""}</div>` : ""}
        ${showDivider ? `<div style="border-top: 1px solid ${colorScheme}; margin: 12px 0; opacity: 0.3;"></div>` : '<div style="height: 12px;"></div>'}
        ${phone ? `<div style="margin-bottom: 8px;">${renderContactIcon("phone")}<a href="tel:${phone}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${phone}</a></div>` : ""}
        ${email ? `<div style="margin-bottom: 8px;">${renderContactIcon("email")}<a href="mailto:${email}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${email}</a></div>` : ""}
        ${website ? `<div style="margin-bottom: 8px;">${renderContactIcon("website")}<a href="${website}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${website.replace(/^https?:\/\//, "")}</a></div>` : ""}
        ${showAddress && address ? `<div style="margin-bottom: 4px; color: #666666; font-size: 12px;">${address}</div>` : ""}
        ${socialLinks.length > 0 ? `<div style="margin-top: 12px;">${renderSocialIcons()}</div>` : ""}
        ${logoUrl ? `<div style="margin-top: 12px;"><img src="${logoUrl}" alt="${company}" style="max-width: ${logoSizeStyle.width}; max-height: ${logoSizeStyle.height}; display: block;"></div>` : ""}
      </td>
    </tr>
  </tbody>
</table>`.trim();
  }

  // Template 2: Centered layout, stacked vertically
  if (layout === "template2") {
    return `
<table cellpadding="0" cellspacing="0" style="font-family: ${fontFamily}; font-size: ${sizes.base}; line-height: 1.4; text-align: center;">
  <tbody>
    <tr>
      <td style="text-align: center;">
        <div style="margin-bottom: 12px;"><img src="${displayPhoto}" alt="${fullName}" style="width: 100px; height: 100px; border-radius: 50%; display: inline-block; object-fit: cover;"></div>
        <div style="margin-bottom: 4px;">
          <strong style="font-size: ${sizes.name}; color: ${colorScheme};">${fullName}</strong>
        </div>
        ${jobTitle ? `<div style="color: ${textColor}; margin-bottom: 2px; font-size: ${sizes.title};">${jobTitle}</div>` : ""}
        ${company ? `<div style="color: #666666; margin-bottom: 2px; font-size: ${sizes.base};">${company}${showDepartment && department ? ` | ${department}` : ""}</div>` : ""}
        ${showDivider ? `<div style="border-top: 1px solid ${colorScheme}; margin: 12px auto; opacity: 0.3; max-width: 200px;"></div>` : '<div style="height: 12px;"></div>'}
        ${phone ? `<div style="margin-bottom: 8px; text-align: center;">${renderContactIcon("phone")}<a href="tel:${phone}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${phone}</a></div>` : ""}
        ${email ? `<div style="margin-bottom: 8px; text-align: center;">${renderContactIcon("email")}<a href="mailto:${email}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${email}</a></div>` : ""}
        ${website ? `<div style="margin-bottom: 8px; text-align: center;">${renderContactIcon("website")}<a href="${website}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${website.replace(/^https?:\/\//, "")}</a></div>` : ""}
        ${showAddress && address ? `<div style="margin-bottom: 4px; color: #666666; font-size: 12px;">${address}</div>` : ""}
        ${socialLinks.length > 0 ? `<div style="margin-top: 12px; display: inline-block;">${renderSocialIcons()}</div>` : ""}
        ${logoUrl ? `<div style="margin-top: 12px;"><img src="${logoUrl}" alt="${company}" style="max-width: ${logoSizeStyle.width}; max-height: ${logoSizeStyle.height}; display: inline-block;"></div>` : ""}
      </td>
    </tr>
  </tbody>
</table>`.trim();
  }

  // Template 3: Three column - photo left, name/title center, contact right
  if (layout === "template3") {
    return `
<table cellpadding="0" cellspacing="0" style="font-family: ${fontFamily}; font-size: ${sizes.base}; line-height: 1.4;">
  <tbody>
    <tr>
      <td style="vertical-align: top; padding-right: 16px;">
        <img src="${displayPhoto}" alt="${fullName}" style="width: 80px; height: 80px; border-radius: 50%; display: block; object-fit: cover;">
      </td>
      <td style="vertical-align: top; padding-right: 20px;">
        <div style="margin-bottom: 4px;">
          <strong style="font-size: ${sizes.name}; color: ${colorScheme};">${fullName}</strong>
        </div>
        ${jobTitle ? `<div style="color: ${textColor}; margin-bottom: 2px; font-size: ${sizes.title};">${jobTitle}</div>` : ""}
        ${company ? `<div style="color: #666666; margin-bottom: 2px; font-size: ${sizes.base};">${company}</div>` : ""}
        ${showDepartment && department ? `<div style="color: #888888; font-size: 12px;">${department}</div>` : ""}
        ${socialLinks.length > 0 ? `<div style="margin-top: 12px;">${renderSocialIcons()}</div>` : ""}
        ${logoUrl ? `<div style="margin-top: 12px;"><img src="${logoUrl}" alt="${company}" style="max-width: ${logoSizeStyle.width}; max-height: ${logoSizeStyle.height}; display: block;"></div>` : ""}
      </td>
      <td style="vertical-align: top; border-left: 1px solid ${colorScheme}; padding-left: 20px; opacity: 0.8;">
        ${phone ? `<div style="margin-bottom: 8px;">${renderContactIcon("phone")}<a href="tel:${phone}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${phone}</a></div>` : ""}
        ${email ? `<div style="margin-bottom: 8px;">${renderContactIcon("email")}<a href="mailto:${email}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${email}</a></div>` : ""}
        ${website ? `<div style="margin-bottom: 8px;">${renderContactIcon("website")}<a href="${website}" style="color: ${textColor}; text-decoration: none; font-size: ${sizes.base};">${website.replace(/^https?:\/\//, "")}</a></div>` : ""}
        ${showAddress && address ? `<div style="margin-top: 8px; color: #666666; font-size: 12px;">${address}</div>` : ""}
      </td>
    </tr>
  </tbody>
</table>`.trim();
  }

  return "";
}

/**
 * Parse signature from database (handles both JSON and HTML)
 */
export function parseSignature(signature: string | null): SignatureConfig | null {
  if (!signature) return null;

  try {
    // Try to parse as JSON
    if (signature.trim().startsWith("{")) {
      return JSON.parse(signature) as SignatureConfig;
    }
  } catch (e) {
    console.error("[Signature] Failed to parse JSON:", e);
  }

  return null;
}
