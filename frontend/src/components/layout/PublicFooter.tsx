import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

const platformLinks = [
  { label: 'Find Builders', to: '/builders' },
  { label: 'Blog', to: '/blog' },
]

const companyLinks = [
  { label: 'About Us', to: '/pages/about' },
  { label: 'FAQ', to: '/pages/faq' },
  { label: 'Privacy Policy', to: '/pages/privacy' },
  { label: 'Terms of Service', to: '/pages/terms' },
]

/** Shared footer for all public pages. */
export function PublicFooter() {
  const { data: settings } = usePublicSettings()

  return (
    <footer
      className="bg-gray-900 text-gray-400 py-16 border-t border-transparent"
      style={{
        borderImage:
          'linear-gradient(to right, transparent, hsl(25 95% 53% / 0.3), hsl(142 71% 45% / 0.2), transparent) 1',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BuilderConnect" className="h-8 w-8 object-contain" />
              <h2 className="text-xl font-bold tracking-tight text-white">
                Builder<span className="text-[#F97316]">Connect</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed">
              Redefining the construction industry in Pakistan through technology, transparency,
              and trust.
            </p>
            {(settings?.supportEmail || settings?.supportPhone) && (
              <ul className="space-y-3 text-sm">
                {settings?.supportEmail && (
                  <li>
                    <a
                      href={`mailto:${settings.supportEmail}`}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {settings.supportEmail}
                    </a>
                  </li>
                )}
                {settings?.supportPhone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    {settings.supportPhone}
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-white hover:pl-1 transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-white hover:pl-1 transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-4 text-xs uppercase tracking-widest font-medium">
          <p>&copy; 2026 {settings?.platformName ?? 'BuilderConnect'} Pakistan. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/pages/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/pages/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
