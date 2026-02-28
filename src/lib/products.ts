export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  icon: string;
}

export const products: Product[] = [
  {
    slug: "hmi-insight",
    name: "HMI Insight",
    tagline: "Automate your DCS documentation workflow",
    description:
      "A comprehensive suite of automation tools for Honeywell Experion/TDC and Emerson DeltaV environments. Capture DCS graphics, build graphic documentation, and generate informative Excel exports from EB/FHX files — all in one platform.",
    features: [
      "Automated DCS graphic capture for Honeywell Experion & TDC",
      "One-click graphic documentation generation",
      "Excel exports from EB and FHX configuration files",
      "Batch processing for large-scale projects",
      "Configurable output templates",
      "Support for Emerson DeltaV environments",
    ],
    icon: "📊",
  },
  {
    slug: "hmi-markup",
    name: "HMI Markup",
    tagline: "Mark up DCS displays with full traceability",
    description:
      "Overlay markups directly on DCS graphical displays with a complete historized approval and completion tracking workflow. Streamline your review process with built-in versioning and audit trails.",
    features: [
      "Direct overlay markups on DCS graphic displays",
      "Historized approval workflow with timestamps",
      "Completion tracking and status dashboards",
      "Version control for all markup changes",
      "Multi-user collaboration support",
      "Export markup reports for documentation",
    ],
    icon: "✏️",
  },
  {
    slug: "deltav-render",
    name: "DeltaV Render",
    tagline: "Bring DeltaV Live graphics to the web",
    description:
      "Convert Emerson DeltaV Live graphics (.lv files) into web-renderable formats with full theme support. View and share DCS graphics in any modern browser without proprietary software.",
    features: [
      "Convert .lv files to web-ready formats",
      "Light and dark theme support",
      "Browser-based viewing — no DeltaV license required",
      "High-fidelity rendering of complex graphics",
      "Shareable links for team collaboration",
      "Responsive display across devices",
    ],
    icon: "🖥️",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export interface Testimonial {
  quote: string;
  author: string;
  company: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "The Stratus Suite is incredible. We have used it in every project after discovery saving countless man hours.",
    author: "Fahim Khan",
    company: "Motiva Enterprises LLC",
  },
  {
    quote:
      "I use the Stratus Suite very frequently. Features like capturing DCS graphics, building graphic documentation, and informative Excel exports has made many trivial tasks significantly easier.",
    author: "Taylor Bertrand",
    company: "Coastal Automation Services Inc.",
  },
];
