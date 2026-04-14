import ATSCleanTemplate from "./ATSCleanTemplate";
import CreativeRoseTemplate from "./CreativeRoseTemplate";
import DataAnalystTemplate from "./DataAnalystTemplate";
import HRExecutiveTemplate from "./HRExecutiveTemplate";
import MarketingProTemplate from "./MarketingProTemplate";
import MinimalSlateTemplate from "./MinimalSlateTemplate";
import ModernBlueTemplate from "./ModernBlueTemplate";
import ProductDesignerTemplate from "./ProductDesignerTemplate";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

const TEMPLATE_MAP = {
  "modern-blue": ModernBlueTemplate,
  "ats-clean": ATSCleanTemplate,
  "creative-minimal": CreativeRoseTemplate,
  "product-designer": ProductDesignerTemplate,
  "marketing-pro": MarketingProTemplate,
  "minimal-slate": MinimalSlateTemplate,
  "hr-executive": HRExecutiveTemplate,
  "data-analyst": DataAnalystTemplate,
};

export function resolveTemplateComponent(slugOrName) {
  const key = normalize(slugOrName);
  if (TEMPLATE_MAP[key]) return TEMPLATE_MAP[key];
  if (key.includes("ats")) return ATSCleanTemplate;
  if (key.includes("product") || key.includes("designer"))
    return ProductDesignerTemplate;
  if (key.includes("marketing")) return MarketingProTemplate;
  if (key.includes("executive") || key.includes("hr"))
    return HRExecutiveTemplate;
  if (key.includes("analyst") || key.includes("data"))
    return DataAnalystTemplate;
  if (key.includes("creative")) return CreativeRoseTemplate;
  if (key.includes("minimal")) return MinimalSlateTemplate;
  return ModernBlueTemplate;
}
