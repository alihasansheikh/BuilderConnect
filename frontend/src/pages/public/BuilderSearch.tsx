import { BuilderDirectory } from '@/components/builders/BuilderDirectory'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from './PublicNav'

export default function BuilderSearch() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <PublicNav />

      {/* Header */}
      <div className="bg-white dark:bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">Find Builders</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse verified construction professionals for your next project
          </p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <BuilderDirectory compareLinkBase="/builders/compare" />
      </div>

      <PublicFooter />
    </div>
  )
}
