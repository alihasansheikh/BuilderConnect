import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ComparisonTable } from '@/components/builders/ComparisonTable'

export default function ClientBuildersCompare() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/client/builders"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Builders
        </Link>
        <h1 className="text-2xl font-bold dark:text-white">Compare Builders</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Side-by-side comparison of builders</p>
      </div>

      <ComparisonTable backTo="/client/builders" />
    </div>
  )
}
