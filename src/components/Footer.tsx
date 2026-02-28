import Link from "next/link";

const footerLinks = [
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-white"
            >
              Stratus
            </Link>
            <p className="mt-3 text-sm text-muted">
              Industrial automation tools for modern DCS engineers.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Navigation
            </h3>
            <nav className="mt-4 flex flex-col gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Connect
            </h3>
            <div className="mt-4 flex gap-4">
              <span className="text-sm text-muted">LinkedIn</span>
              <span className="text-sm text-muted">Twitter</span>
              <span className="text-sm text-muted">GitHub</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} Stratus Software. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
