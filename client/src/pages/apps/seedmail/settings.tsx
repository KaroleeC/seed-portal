import { SignatureBuilderV3 } from "@/components/settings/seedmail/SignatureBuilderV3";
import { UNIVERSAL_PAGE_BG } from "@/lib/theme-constants";

export default function SeedMailSettings() {
  return (
    <div className={`h-screen flex flex-col ${UNIVERSAL_PAGE_BG}`}>
      <SignatureBuilderV3 />
    </div>
  );
}
