import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Ruler, Sparkles, RefreshCw, Image as ImageIcon, FileDown, Loader2 } from 'lucide-react'
import type Konva from 'konva'
import { floorPlanApi, getApiErrorMessage } from '@/services/api'
import { downloadDataUrl } from '@/lib/utils'
import { parseSemanticPlan } from '@/lib/floorplan/schema'
import { layoutPlan, type LaidOutPlan } from '@/lib/floorplan/layout'
import { computeFixtures } from '@/lib/floorplan/fixtures'
import { FloorPlanCanvas, type RenameRequest, type RoomChange } from '@/components/floorplan/FloorPlanCanvas'
import type { FloorPlanBrief } from '@/types'

const briefSchema = z.object({
  plotValue: z.number({ invalid_type_error: 'Enter a plot size' }).positive('Must be greater than 0'),
  plotUnit: z.enum(['MARLA', 'KANAL', 'SQFT']),
  bedrooms: z.number({ invalid_type_error: 'Required' }).int().min(1, 'At least 1').max(8, 'Max 8'),
  bathrooms: z.number({ invalid_type_error: 'Required' }).int().min(1, 'At least 1').max(6, 'Max 6'),
  kitchen: z.enum(['OPEN', 'CLOSED']),
  drawingRoom: z.boolean(),
  carPorch: z.boolean(),
  notes: z.string().max(500, 'Keep notes under 500 characters').optional(),
})

type BriefForm = z.infer<typeof briefSchema>

interface RenameState extends RenameRequest {
  id: string
  value: string
}

function toDefaults(prefill: Partial<BriefForm> | null): BriefForm {
  return {
    plotValue: prefill?.plotValue ?? 5,
    plotUnit: prefill?.plotUnit ?? 'MARLA',
    bedrooms: prefill?.bedrooms ?? 3,
    bathrooms: prefill?.bathrooms ?? 2,
    kitchen: prefill?.kitchen ?? 'OPEN',
    drawingRoom: prefill?.drawingRoom ?? true,
    carPorch: prefill?.carPorch ?? true,
    notes: prefill?.notes ?? '',
  }
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
const labelClass = 'mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'

export default function FloorPlanStudio() {
  const location = useLocation()
  const prefill = (location.state as Partial<BriefForm> | null) ?? null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    defaultValues: toDefaults(prefill),
  })

  const [plan, setPlan] = useState<LaidOutPlan | null>(null)
  const [entranceRoomId, setEntranceRoomId] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [rename, setRename] = useState<RenameState | null>(null)

  const stageRef = useRef<Konva.Stage>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fixtures = useMemo(
    () => (plan ? computeFixtures(plan, entranceRoomId) : null),
    [plan, entranceRoomId],
  )

  const onGenerate = async (values: BriefForm) => {
    setGenerating(true)
    setSelectedId(null)
    setRename(null)
    try {
      const brief: FloorPlanBrief = {
        plotValue: values.plotValue,
        unit: values.plotUnit,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        kitchen: values.kitchen,
        drawingRoom: values.drawingRoom,
        carPorch: values.carPorch,
        notes: values.notes?.trim() || undefined,
      }
      const res = await floorPlanApi.generate(brief)
      let semantic
      try {
        semantic = parseSemanticPlan(res.data.planJson)
      } catch {
        toast.error('Could not read the generated plan. Please try Regenerate.')
        return
      }
      setEntranceRoomId(semantic.entranceRoomId)
      setPlan(layoutPlan(semantic))
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 503) {
        toast.error('The design assistant is busy right now. Please try again in a moment.')
      } else {
        toast.error(getApiErrorMessage(err, 'Could not generate a floor plan. Please try again.'))
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleRoomChange = useCallback((id: string, change: RoomChange) => {
    setPlan((prev) => {
      if (!prev) return prev
      const room = prev.rooms.find((r) => r.id === id)
      if (!room) return prev
      const sx = room.wFt > 0 ? change.wFt / room.wFt : 1
      const sy = room.hFt > 0 ? change.hFt / room.hFt : 1
      const rooms = prev.rooms.map((r) => {
        if (r.id === id) {
          return { ...r, xFt: change.xFt, yFt: change.yFt, wFt: change.wFt, hFt: change.hFt }
        }
        // An ensuite bath rides inside its parent: keep it proportionally placed.
        if (r.nested && r.parentId === id) {
          return {
            ...r,
            xFt: change.xFt + (r.xFt - room.xFt) * sx,
            yFt: change.yFt + (r.yFt - room.yFt) * sy,
            wFt: r.wFt * sx,
            hFt: r.hFt * sy,
          }
        }
        return r
      })
      return { ...prev, rooms }
    })
  }, [])

  const handleRequestRename = useCallback(
    (id: string, screen: RenameRequest) => {
      const room = plan?.rooms.find((r) => r.id === id)
      setRename({ id, value: room?.name ?? '', ...screen })
    },
    [plan],
  )

  const commitRename = () => {
    if (!rename) return
    const value = rename.value.trim()
    if (value) {
      setPlan((prev) =>
        prev
          ? { ...prev, rooms: prev.rooms.map((r) => (r.id === rename.id ? { ...r, name: value } : r)) }
          : prev,
      )
    }
    setRename(null)
  }

  const exportImage = (build?: (dataUrl: string) => void) => {
    setSelectedId(null)
    // Defer so the Transformer detaches before the stage is rasterised.
    window.setTimeout(() => {
      const stage = stageRef.current
      if (!stage) return
      const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
      if (build) build(dataUrl)
      else downloadDataUrl('floor-plan.png', dataUrl)
    }, 60)
  }

  const exportPng = () => exportImage()

  const exportPdf = () => {
    const current = plan
    if (!current) return
    exportImage(async (dataUrl) => {
      try {
        const { jsPDF } = await import('jspdf')
        const landscape = current.plotWidthFt >= current.plotLengthFt
        const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 32
        const titleH = 26
        const props = doc.getImageProperties(dataUrl)
        const availW = pageW - margin * 2
        const availH = pageH - margin * 2 - titleH - 18
        const ratio = Math.min(availW / props.width, availH / props.height)
        const w = props.width * ratio
        const h = props.height * ratio
        const x = (pageW - w) / 2
        const y = margin + titleH
        doc.setFontSize(15)
        doc.setTextColor(43, 58, 91)
        doc.text('BuilderConnect — Floor Plan', margin, margin + 12)
        doc.addImage(dataUrl, 'PNG', x, y, w, h)
        doc.setFontSize(9)
        doc.setTextColor(120, 130, 145)
        doc.text('AI-generated draft — verify measurements with a professional.', margin, pageH - margin / 2)
        doc.save('floor-plan.pdf')
      } catch {
        toast.error('Could not export the PDF. Please try again.')
      }
    })
  }

  const hasPlan = !!plan && !!fixtures

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Ruler className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Floor Plan Studio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Describe your home and generate an editable 2D plan. Drag or resize rooms, double-click a label to rename, then export.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Brief form */}
        <form
          onSubmit={handleSubmit(onGenerate)}
          className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-card dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass} htmlFor="plotValue">Plot size</label>
              <input
                id="plotValue"
                type="number"
                step="any"
                min={0}
                className={inputClass}
                {...register('plotValue', { valueAsNumber: true })}
              />
              {errors.plotValue && <p className="mt-1 text-xs text-red-500">{errors.plotValue.message}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass} htmlFor="plotUnit">Unit</label>
              <select id="plotUnit" className={inputClass} {...register('plotUnit')}>
                <option value="MARLA">Marla</option>
                <option value="KANAL">Kanal</option>
                <option value="SQFT">Sq ft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="bedrooms">Bedrooms</label>
              <input
                id="bedrooms"
                type="number"
                min={1}
                max={8}
                className={inputClass}
                {...register('bedrooms', { valueAsNumber: true })}
              />
              {errors.bedrooms && <p className="mt-1 text-xs text-red-500">{errors.bedrooms.message}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="bathrooms">Bathrooms</label>
              <input
                id="bathrooms"
                type="number"
                min={1}
                max={6}
                className={inputClass}
                {...register('bathrooms', { valueAsNumber: true })}
              />
              {errors.bathrooms && <p className="mt-1 text-xs text-red-500">{errors.bathrooms.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="kitchen">Kitchen</label>
            <select id="kitchen" className={inputClass} {...register('kitchen')}>
              <option value="OPEN">Open kitchen</option>
              <option value="CLOSED">Closed kitchen</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40" {...register('drawingRoom')} />
              Separate drawing room
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40" {...register('carPorch')} />
              Car porch / garage
            </label>
          </div>

          <div>
            <label className={labelClass} htmlFor="notes">Style notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="e.g. big lounge, south-facing bedroom, prayer room…"
              className={inputClass}
              {...register('notes')}
            />
            {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>}
          </div>

          <button
            type="submit"
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasPlan ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? 'Generating…' : hasPlan ? 'Regenerate' : 'Generate Floor Plan'}
          </button>

          <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
            AI-generated draft — verify measurements with a professional.
          </p>
        </form>

        {/* Canvas + toolbar */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasPlan ? 'Tap a room to select · drag to move · handles to resize · double-click a label to rename' : 'Fill in the brief to generate a plan'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportPng}
                disabled={!hasPlan}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <ImageIcon className="h-3.5 w-3.5" /> PNG
              </button>
              <button
                type="button"
                onClick={exportPdf}
                disabled={!hasPlan}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <FileDown className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>

          <div ref={wrapRef} className="relative h-[560px] w-full overflow-hidden rounded-b-2xl bg-gray-50 dark:bg-gray-900/40">
            {hasPlan && size.width > 0 && (
              <FloorPlanCanvas
                plan={plan}
                fixtures={fixtures}
                widthPx={size.width}
                heightPx={size.height}
                editable
                selectedId={selectedId}
                onSelectRoom={setSelectedId}
                onRoomChange={handleRoomChange}
                onRequestRename={handleRequestRename}
                stageRef={stageRef}
              />
            )}

            {!hasPlan && !generating && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Ruler className="h-7 w-7" />
                </div>
                <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  Your generated floor plan will appear here. Set the plot size, rooms, and preferences, then press
                  <span className="font-medium text-gray-700 dark:text-gray-200"> Generate Floor Plan</span>.
                </p>
              </div>
            )}

            {generating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm dark:bg-gray-900/60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-600 dark:text-gray-300">Designing your floor plan…</p>
              </div>
            )}

            {rename && (
              <input
                autoFocus
                value={rename.value}
                onChange={(e) => setRename((r) => (r ? { ...r, value: e.target.value } : r))}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  else if (e.key === 'Escape') setRename(null)
                }}
                style={{ left: rename.x, top: rename.y, width: Math.max(rename.width, 90) }}
                className="absolute z-10 rounded border border-primary bg-white px-1.5 py-0.5 text-center text-xs font-semibold text-gray-900 shadow focus:outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
