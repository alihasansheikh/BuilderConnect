import { BuilderDirectory } from '@/components/builders/BuilderDirectory'

export default function ClientBuilders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Find Builders</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Browse verified construction professionals and start a conversation.
        </p>
      </div>

      <BuilderDirectory compareLinkBase="/client/builders/compare" />
    </div>
  )
}
