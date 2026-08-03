import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ComparisonTable } from '@/components/builders/ComparisonTable'
import { PublicNav } from './PublicNav'

export default function BuilderComparison() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicNav />

      <div className="bg-white dark:bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            to="/builders"
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </Link>
          <h1 className="text-3xl font-bold dark:text-white">Compare Builders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Side-by-side comparison of builders</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <ComparisonTable backTo="/builders" />
      </div>
    </div>
  )
}
