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
      "Convert Honeywell Experion HMI graphics into rendered documentation, ProcessBook PDI displays, and Raddical visualizations. Automatically extracts point tags, navigation links, and generates comprehensive PDF and Excel documentation from your HMI displays.",
    features: [
      "Convert Honeywell Experion HMI graphics to rendered images and PDF documentation",
      "ProcessBook PDI display generation with live tag values and navigation",
      "Raddical visualization export with full tag and display link mapping",
      "Automated point tag extraction and conversion mapping",
      "Multi-threaded batch processing for large-scale projects",
      "Excel exports with graphic information and tag inventory",
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
      "Convert Emerson DeltaV Live display files into rendered images, ProcessBook PDI displays, and Raddical visualizations. Supports all DeltaV Live object types with full theme support across six color themes.",
    features: [
      "Convert DeltaV Live displays to high-fidelity rendered images",
      "ProcessBook PDI display generation with live data points",
      "Raddical visualization export with tag mapping",
      "Six DeltaV color themes (Dark Gray, Dark Blue, Tan, Light Blue, and more)",
      "Full Gem component resolution with variable and override support",
      "Automated DCS tag path normalization and conversion mapping",
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
