import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PublicChatWidget } from '@/components/chatbot/PublicChatWidget'

const navLinks = [
  { label: 'Builders', to: '/builders' },
  { label: 'Blog', to: '/blog' },
  { label: 'Features', to: '/#features' },
  { label: 'How it Works', to: '/#how-it-works' },
  { label: 'Why Us', to: '/#why' },
]

const navLinkClasses =
  'text-sm font-medium text-gray-600 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full'

interface PublicNavProps {
  /** "builder" renders the Join as a Builder CTA (used on Home); default is Get Started. */
  cta?: 'default' | 'builder'
}

/** The single shared sticky header for all public pages. */
export function PublicNav({ cta = 'default' }: PublicNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const ctaTo = cta === 'builder' ? '/register?role=BUILDER' : '/register'
  const ctaLabel = cta === 'builder' ? 'Join as a Builder' : 'Get Started'

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo to="/" size="md" />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={navLinkClasses}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:flex text-sm font-semibold text-gray-700 hover:text-primary px-4 py-2 transition-colors"
            >
              Log In
            </Link>
            <Link
              to={ctaTo}
              className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 transition-all"
            >
              {ctaLabel}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-gray-200/60 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="px-2 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors"
            >
              Log In
            </Link>
          </nav>
        )}
      </div>
    </header>
    <PublicChatWidget />
    </>
  )
}

/** Renders CMS/blog body content: sanitized HTML, or paragraphs for plain text. */
export function renderPublicContent(content: string, sanitize: (html: string) => string) {
  if (content.includes('<')) {
    return (
      <div
        className="prose-content text-gray-700 leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitize(content) }}
      />
    )
  }
  return (
    <div className="text-gray-700 leading-relaxed space-y-4">
      {content.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  )
}
