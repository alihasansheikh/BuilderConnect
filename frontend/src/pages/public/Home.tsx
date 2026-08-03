import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
 ShieldCheck,
 Wallet,
 TrendingUp,
 ArrowRight,
 Search,
 Lock,
 BadgeCheck,
 Globe,
 PackageCheck,
 Check,
} from 'lucide-react'
import { AnimatedSection } from '@/components/ui/AnimatedSection'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from './PublicNav'

const highlights = [
 {
 icon: ShieldCheck,
 title: 'Verified builders across Pakistan',
 desc: 'Reviewed by our team before they carry a verified badge.',
 },
 {
 icon: Wallet,
 title: 'Milestone-based payments',
 desc: 'Release funds stage by stage, with proof on record.',
 },
 {
 icon: PackageCheck,
 title: 'Direct COD material marketplace',
 desc: 'Order materials from suppliers with cash on delivery.',
 },
]

const valueProps = [
 'Verification handled by our team — credentials and documents reviewed, not self-claimed badges.',
 'Milestone payments recorded with proof; builders confirm receipt before the next stage begins.',
 'Cash-on-delivery materials ordered directly from local suppliers.',
 'Live progress from daily photo logs and on-site updates.',
 'One workspace for clients, builders and suppliers.',
]

const features = [
 {
 icon: ShieldCheck,
 title: 'Verified Builders',
 desc: 'Builders and suppliers submit their credentials and documents for review by our team before they are marked verified.',
 },
 {
 icon: Wallet,
 title: 'Milestone Payments',
 desc: 'Pay milestone by milestone with proof of payment on record — builders confirm receipt before the next stage begins.',
 },
 {
 icon: TrendingUp,
 title: 'Real-time Milestones',
 desc: 'Monitor progress via daily photo logs, material receipts, and live site updates right from your dashboard.',
 },
]

const steps = [
 {
 step: '01',
 title: 'Post Your Project',
 desc: 'Describe your construction needs, set your budget, and publish your project to receive bids from verified builders.',
 },
 {
 step: '02',
 title: 'Compare & Select',
 desc: 'Review proposals, compare builder profiles, read reviews, and select the best professional for your project.',
 },
 {
 step: '03',
 title: 'Build with Confidence',
 desc: 'Track milestones, record payments with proof at every stage, and monitor every detail from your dashboard.',
 },
]

const popularTrades = ['Plumber', 'Electrician', 'Architect', 'Interior Design', 'Civil Engineer']

export default function Home() {
 const navigate = useNavigate()
 const location = useLocation()
 const [searchQuery, setSearchQuery] = useState('')

 useEffect(() => {
 if (location.hash) {
 document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
 }
 }, [location.hash])

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault()
 const q = searchQuery.trim()
 if (q) {
 navigate(`/builders?search=${encodeURIComponent(q)}`)
 } else {
 navigate('/builders')
 }
 }

 return (
 <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
 <PublicNav cta="builder" />

 <main>
 {/* Hero Section */}
 <section className="relative py-20 lg:py-32 overflow-hidden"aria-label="Hero">
 {/* Subtle background gradient orbs */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"/>
 <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl"/>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
 <div className="flex flex-col lg:flex-row items-center gap-12">
 <div className="flex-1 space-y-8 text-center lg:text-left">
 <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.15)]">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
 </span>
 Now Live Across Pakistan
 </div>

 <h1 className="animate-slide-up text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
 Build Your Vision,{' '}
 <span className="text-primary">Manage Every Detail</span>
 </h1>

 <p className="animate-slide-up delay-150 text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
 Pakistan's premier construction management platform. Connect with verified pros,
 pay milestone by milestone, and track every brick in real-time.
 </p>

 {/* Hero Search Bar — marketplace pattern */}
 <div className="animate-slide-up delay-200 max-w-xl mx-auto lg:mx-0">
 <form onSubmit={handleSearch} className="relative"role="search"aria-label="Search builders">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"/>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search builders — plumber, electrician, architect..."
 className="w-full pl-12 pr-28 py-4 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-lg transition-colors"
 aria-label="Search for builders by trade"
 />
 <button
 type="submit"
 className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
 >
 Search
 </button>
 </form>
 <div className="mt-3 flex flex-wrap gap-2 justify-center lg:justify-start">
 <span className="text-xs text-gray-400 py-1">Popular:</span>
 {popularTrades.map(tag => (
 <Link
 key={tag}
 to={`/builders?search=${encodeURIComponent(tag)}`}
 className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
 >
 {tag}
 </Link>
 ))}
 </div>
 </div>

 <div className="animate-slide-up delay-300 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
 <Link
 to="/register"
 className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-primary text-white text-base font-bold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] transition-all"
 >
 Post a Project
 <ArrowRight className="h-5 w-5"/>
 </Link>
 <Link
 to="/builders"
 className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white text-gray-900 text-base font-bold border border-gray-200 hover:bg-gray-50 hover:border-primary/30 transition-all"
 >
 Browse Builders
 </Link>
 </div>
 </div>

 {/* Hero Image */}
 <div className="flex-1 w-full max-w-2xl animate-scale-in delay-200">
 <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] group">
 <img
 src="/images/hero-bg.png"
 alt="Digitizing Pakistan's Construction Industry"
 loading="lazy"
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

 {/* Project progress overlay */}
 <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-primary uppercase">Active Project</p>
 <p className="text-sm font-bold text-gray-900">
 DHA Phase 6 Residence
 </p>
 </div>
 <div className="text-right">
 <p className="text-xs font-medium text-gray-500">Progress</p>
 <p className="text-sm font-bold text-gray-900">74%</p>
 </div>
 </div>
 <div className="mt-3 w-full bg-gray-200 h-2 rounded-full overflow-hidden">
 <div className="bg-primary h-full w-[74%] rounded-full"></div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* Platform Highlights — honest, non-numeric claims */}
 <section className="py-12 bg-white border-y border-gray-100" aria-label="Platform highlights">
 <AnimatedSection animation="fade-in">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {highlights.map((item, i) => {
 const Icon = item.icon
 return (
 <div
 key={item.title}
 className={`${i === 0 ? '' : i === 1 ? 'delay-100' : 'delay-200'} flex items-start gap-4 text-left`}
 >
 <div className="size-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/10">
 <Icon className="h-5 w-5" />
 </div>
 <div>
 <p className="font-bold text-gray-900">{item.title}</p>
 <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 </AnimatedSection>
 </section>

 {/* Trust Signals Bar */}
 <section className="py-8 border-b border-gray-100 bg-white"aria-label="Trust signals">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-gray-400">
 <div className="flex items-center gap-2 text-sm font-medium">
 <ShieldCheck className="h-5 w-5"/>
 <span>PEC Verified</span>
 </div>
 <div className="flex items-center gap-2 text-sm font-medium">
 <Lock className="h-5 w-5"/>
 <span>256-bit Encrypted</span>
 </div>
 <div className="flex items-center gap-2 text-sm font-medium">
 <BadgeCheck className="h-5 w-5"/>
 <span>Verified Professionals</span>
 </div>
 <div className="flex items-center gap-2 text-sm font-medium">
 <Globe className="h-5 w-5"/>
 <span>Cities across Pakistan</span>
 </div>
 </div>
 </div>
 </section>

 {/* Features Section */}
 <section className="py-24 bg-gray-50"id="features"aria-label="Key features">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <AnimatedSection className="text-center max-w-3xl mx-auto mb-16 space-y-4">
 <h2 className="text-4xl font-black text-gray-900 tracking-tight">
 Engineered for Excellence
 </h2>
 <p className="delay-100 text-lg text-gray-600">
 Everything you need to manage your construction project from groundbreaking to
 completion with full transparency.
 </p>
 </AnimatedSection>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {features.map((feature, i) => {
 const Icon = feature.icon
 return (
 <AnimatedSection
 key={feature.title}
 animation="slide-up"
 delay={i === 0 ? 'delay-100' : i === 1 ? 'delay-200' : 'delay-300'}
 >
 <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 h-full">
 <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 ring-1 ring-primary/10">
 <Icon className="h-7 w-7"/>
 </div>
 <h3 className="text-xl font-bold text-gray-900 mb-3">
 {feature.title}
 </h3>
 <p className="text-gray-600 leading-relaxed">
 {feature.desc}
 </p>
 </div>
 </AnimatedSection>
 )
 })}
 </div>
 </div>
 </section>

 {/* How It Works */}
 <section className="py-24 bg-white"id="how-it-works"aria-label="How it works">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <AnimatedSection className="text-center max-w-3xl mx-auto mb-16 space-y-4">
 <h2 className="text-4xl font-black text-gray-900 tracking-tight">
 How It Works
 </h2>
 <p className="delay-100 text-lg text-gray-600">
 Get your construction project started in three simple steps.
 </p>
 </AnimatedSection>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
 {/* Connecting line between steps (visible on md+) */}
 <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10"/>

 {steps.map((item, i) => (
 <AnimatedSection
 key={item.step}
 animation="slide-up"
 delay={i === 0 ? 'delay-100' : i === 1 ? 'delay-200' : 'delay-300'}
 >
 <div className="relative p-8 text-center">
 {/* Number circle with gradient */}
 <div className="relative inline-flex items-center justify-center size-20 mb-6">
 <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/70 opacity-10"/>
 <div className="relative size-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
 <span className="text-2xl font-black text-white">{item.step}</span>
 </div>
 </div>
 <h3 className="text-xl font-bold text-gray-900 mb-3">
 {item.title}
 </h3>
 <p className="text-gray-600 leading-relaxed">{item.desc}</p>

 {/* Vertical connector line between steps (visible on mobile) */}
 {i < steps.length - 1 && (
 <div className="md:hidden mx-auto mt-8 w-[2px] h-8 bg-gradient-to-b from-primary/30 to-primary/5"/>
 )}
 </div>
 </AnimatedSection>
 ))}
 </div>
 </div>
 </section>

 {/* Why BuilderConnect — value props */}
 <section className="py-24 bg-gray-50" id="why" aria-label="Why BuilderConnect">
 <AnimatedSection animation="fade-in">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
 <div className="space-y-5">
 <h2 className="text-4xl font-black text-gray-900 tracking-tight">
 Why homeowners build with us
 </h2>
 <p className="text-lg text-gray-600">
 Every part of the build stays on the record — from who you hire to how each
 payment is released — so you always know where your project stands.
 </p>
 <Link
 to="/builders"
 className="text-sm font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1.5 transition-colors"
 >
 Browse verified builders
 <ArrowRight className="h-4 w-4" />
 </Link>
 </div>
 <ul className="space-y-4">
 {valueProps.map((point) => (
 <li
 key={point}
 className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm"
 >
 <span className="size-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/10">
 <Check className="h-3.5 w-3.5" />
 </span>
 <span className="text-gray-700 leading-relaxed">{point}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </AnimatedSection>
 </section>

 {/* CTA Section */}
 <section className="py-20"aria-label="Call to action">
 <AnimatedSection animation="scale-in">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="relative bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl overflow-hidden p-8 lg:p-20 text-center">
 {/* Animated gradient glow orbs */}
 <div className="absolute inset-0 overflow-hidden">
 <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"style={{ animationDuration: '4s' }} />
 <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse"style={{ animationDuration: '5s', animationDelay: '1s' }} />
 </div>

 {/* Dot pattern */}
 <div className="absolute inset-0 opacity-10">
 <div
 className="absolute inset-0"
 style={{
 backgroundImage:
 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
 backgroundSize: '24px 24px',
 }}
 ></div>
 </div>

 <div className="relative z-10 max-w-2xl mx-auto space-y-8">
 <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
 Ready to start your construction journey?
 </h2>
 <p className="delay-100 text-lg text-white/90">
 Join homeowners and professionals building across Pakistan with
 transparency and trust.
 </p>
 <div className="delay-200 flex flex-col sm:flex-row gap-4 justify-center">
 <Link
 to="/register"
 className="bg-white text-primary px-8 h-14 rounded-xl font-bold text-lg hover:bg-gray-50 shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-[1.02] transition-all inline-flex items-center justify-center"
 >
 Post Your Project Today
 </Link>
 <Link
 to="/register?role=BUILDER"
 className="bg-white/10 border border-white/30 text-white px-8 h-14 rounded-xl font-bold text-lg hover:bg-white/20 backdrop-blur-sm transition-all inline-flex items-center justify-center"
 >
 Register as a Pro
 </Link>
 </div>
 </div>
 </div>
 </div>
 </AnimatedSection>
 </section>
 </main>

 <PublicFooter />
 </div>
 )
}
