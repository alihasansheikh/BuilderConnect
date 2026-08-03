import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectApi, getApiErrorMessage } from '@/services/api'
import { LocalityAutocomplete } from '@/components/location/LocalityAutocomplete'
import { Check, ChevronLeft, ChevronRight, ImagePlus, Trash2, FileText, Upload } from 'lucide-react'
import type { CreateProjectRequest } from '@/types'
import { cn } from '@/lib/utils'
import {
  TRADES, PROPERTY_TYPES, AREA_UNITS, toSqFt, BUDGET_TYPES, MATERIALS_PROVIDED_BY,
  STRUCTURE_CONDITIONS, PROVINCE_CITIES, PROVINCES,
} from '@/lib/project-taxonomy'
import {
  TOTAL_STEPS, NO_FLOOR_TYPES, ROOM_TYPES, UNIT_TYPES, STRUCTURE_CATEGORIES,
  ACCEPTED_DOC_TYPES, FLAG_OPTIONS, inputCls, labelCls, initialFormData, formatPKR,
  step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, fieldErrorsFrom,
  FieldError, ReviewStep, WizardProgress,
} from './createProjectShared'

export default function CreateProject() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Real category list from the backend (GET /v1/categories) so ids never drift from the DB.
  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories'],
    queryFn: () => projectApi.getCategories().then((r) => r.data),
    staleTime: Infinity,
  })

  const [step, setStep] = useState(1)
  const [stagedImages, setStagedImages] = useState<{ file: File; preview: string }[]>([])
  const [stagedDocuments, setStagedDocuments] = useState<File[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Track the latest staged images in a ref so the unmount cleanup revokes the ACTUAL set.
  // An effect with [] deps would capture the mount-time (empty) array and revoke nothing.
  const stagedImagesRef = useRef(stagedImages)
  stagedImagesRef.current = stagedImages

  // Revoke image object URLs on unmount to prevent memory leaks (documents have no previews).
  useEffect(() => {
    return () => {
      stagedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview))
    }
  }, [])

  const [formData, setFormData] = useState(initialFormData)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
  }

  // Province drives the city dropdown; changing it must clear the (now-stale) city.
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, province: e.target.value, city: '' }))
  }

  const toggleTrade = (trade: string) => {
    setFormData((prev) => ({
      ...prev,
      trades: prev.trades.includes(trade)
        ? prev.trades.filter((t) => t !== trade)
        : [...prev.trades, trade],
    }))
  }

  const selectedCategoryName = categories.find((c) => String(c.id) === String(formData.categoryId))?.name
  const cityOptions = formData.province ? (PROVINCE_CITIES[formData.province] ?? []) : []
  const today = new Date().toISOString().split('T')[0]

  // ---- Two-phase create: create project -> upload staged images -> upload staged documents ----
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateProjectRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        propertyType: formData.propertyType || undefined,
        province: formData.province || undefined,
        locationArea: formData.locationArea || undefined,
        areaValue: Number(formData.areaValue) || undefined,
        areaUnit: formData.areaUnit,
        areaSqFt: formData.areaValue ? toSqFt(formData.areaValue, formData.areaUnit) : null,
        floors: Number(formData.floors) || undefined,
        rooms: Number(formData.rooms) || undefined,
        units: Number(formData.units) || undefined,
        structureCondition: formData.structureCondition || undefined,
        materialsProvidedBy: formData.materialsProvidedBy || 'DECIDE_LATER',
        city: formData.city,
        locationAddress: formData.locationAddress || undefined,
        budgetType: formData.budgetType,
        budgetMin: formData.budgetType === 'FIXED_RANGE' ? Number(formData.budgetMin) : undefined,
        budgetMax: formData.budgetType === 'FIXED_RANGE' ? Number(formData.budgetMax) : undefined,
        preferredStartDate: formData.preferredStartDate || undefined,
        deadline: formData.deadline || null,
        // Backend expects a LocalDateTime — close bidding at the end of the chosen day.
        biddingDeadline: formData.biddingDeadline ? `${formData.biddingDeadline}T23:59:59` : undefined,
        estimatedDurationDays: formData.estimatedDurationDays ? Number(formData.estimatedDurationDays) : null,
        trades: formData.trades, // backend persists into required_skills
        requiredSkills: formData.trades, // also send for safety (backend prefers trades)
        verifiedBuildersOnly: formData.verifiedBuildersOnly,
        isUrgent: formData.isUrgent,
        allowPartialBids: formData.allowPartialBids,
        isPublic: formData.isPublic,
        specialRequirements: formData.specialRequirements || null,
      }

      const response = await projectApi.create(payload)
      const projectId = response.data?.id

      let imgUploaded = 0
      if (stagedImages.length > 0 && projectId) {
        for (const img of stagedImages) {
          try {
            await projectApi.uploadImage(projectId, img.file)
            imgUploaded++
          } catch (err) {
            // Keep uploading the rest; the toast reports the uploaded/total count.
            console.error('Image upload failed for', img.file.name, err)
          }
        }
      }

      let docUploaded = 0
      if (stagedDocuments.length > 0 && projectId) {
        for (const doc of stagedDocuments) {
          try {
            await projectApi.uploadDocument(projectId, doc)
            docUploaded++
          } catch (err) {
            // Best-effort: a failed document upload must not discard the created project.
            console.error('Document upload failed for', doc.name, err)
          }
        }
      }

      return {
        projectId,
        imgUploaded,
        imgTotal: stagedImages.length,
        docUploaded,
        docTotal: stagedDocuments.length,
      }
    },
    onSuccess: (result) => {
      const notes: string[] = []
      if (result.imgTotal > 0 && result.imgUploaded < result.imgTotal) {
        notes.push(`${result.imgUploaded}/${result.imgTotal} images uploaded`)
      }
      if (result.docTotal > 0 && result.docUploaded < result.docTotal) {
        notes.push(`${result.docUploaded}/${result.docTotal} documents uploaded`)
      }
      const suffix = notes.length > 0 ? ` (${notes.join(', ')})` : ''
      // The project is saved as a DRAFT — not visible to builders until published.
      toast.success(`Draft saved${suffix}. Publish it to start receiving bids.`)
      queryClient.invalidateQueries({ queryKey: ['client-projects'] })
      queryClient.invalidateQueries({ queryKey: ['client-projects-all'] })
      // Reset all wizard state.
      setFormData(initialFormData)
      stagedImages.forEach((img) => URL.revokeObjectURL(img.preview))
      setStagedImages([])
      setStagedDocuments([])
      setStep(1)
      navigate(result.projectId ? `/client/projects/${result.projectId}` : '/client/projects')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to create project. Please check all required fields.'))
    },
  })

  const errors = useMemo<Record<string, string>>(() => {
    switch (step) {
      case 1: return fieldErrorsFrom(step1Schema, { title: formData.title, categoryId: formData.categoryId, trades: formData.trades })
      case 2: return fieldErrorsFrom(step2Schema, { description: formData.description })
      case 3: return fieldErrorsFrom(step3Schema, { areaValue: formData.areaValue })
      case 4: return fieldErrorsFrom(step4Schema, { city: formData.city })
      case 5: return fieldErrorsFrom(step5Schema, { budgetType: formData.budgetType, budgetMin: formData.budgetMin, budgetMax: formData.budgetMax })
      case 6:
        // YYYY-MM-DD strings compare correctly lexicographically.
        return formData.biddingDeadline && formData.biddingDeadline < today
          ? { biddingDeadline: 'Bidding deadline must be today or a future date' }
          : {}
      default: return {}
    }
  }, [step, formData])

  const canProceed = (): boolean => Object.keys(errors).length === 0

  // ---- Image staging (reused verbatim) ----
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy the FileList into a real array BEFORE clearing the input: `e.target.files` is a LIVE
    // list, and `e.target.value = ''` empties it — reading it afterwards would yield nothing.
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const validTypes = ['image/jpeg', 'image/png', 'image/gif']
    const newFiles: File[] = []
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, and GIF allowed`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: Must be under 10MB`)
        continue
      }
      newFiles.push(file)
    }
    if (newFiles.length > 0) {
      const withPreviews = newFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }))
      setStagedImages((prev) => [...prev, ...withPreviews])
    }
  }

  const removeImage = (index: number) => {
    // Read the URL from current state, then keep the state updater pure (StrictMode double-invokes it).
    const url = stagedImages[index]?.preview
    setStagedImages((prev) => prev.filter((_, i) => i !== index))
    if (url) URL.revokeObjectURL(url)
  }

  // ---- Document staging (parallel to images; PDF/DOC/DOCX, no preview) ----
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy the FileList before clearing the input (see handleImageSelect: value='' empties the live list).
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const newFiles: File[] = []
    for (const file of files) {
      const okType = ACCEPTED_DOC_TYPES.includes(file.type) || /\.(pdf|docx?)$/i.test(file.name)
      if (!okType) {
        toast.error(`${file.name}: Only PDF, DOC, or DOCX allowed`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: Must be under 10MB`)
        continue
      }
      newFiles.push(file)
    }
    if (newFiles.length > 0) setStagedDocuments((prev) => [...prev, ...newFiles])
  }

  const removeDocument = (index: number) => {
    setStagedDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const showFloors = !!formData.propertyType && !NO_FLOOR_TYPES.includes(formData.propertyType)
  const showRooms = ROOM_TYPES.includes(formData.propertyType)
  const showUnits = UNIT_TYPES.includes(formData.propertyType)
  const showStructureCondition = !!selectedCategoryName && STRUCTURE_CATEGORIES.includes(selectedCategoryName)

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Create New Project</h1>

      <WizardProgress step={step} onJumpBack={setStep} />

      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Project Basics</h2>

            <div>
              <label htmlFor="title" className={labelCls}>Project Title <span className="text-red-500">*</span></label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={200}
                aria-required="true"
                className={inputCls}
                placeholder="e.g., Kitchen Renovation in DHA Phase 5"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formData.title.length}/200 characters (min 10)</p>
              <FieldError msg={formData.title.length > 0 ? errors.title : undefined} />
            </div>

            <div>
              <label htmlFor="categoryId" className={labelCls}>Category <span className="text-red-500">*</span></label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} aria-required="true" className={inputCls}>
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Required Trades <span className="text-red-500">*</span></label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Choose the trades/specializations needed for your project.</p>
              <div className="flex flex-wrap gap-2">
                {TRADES.map((trade) => {
                  const selected = formData.trades.includes(trade)
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => toggleTrade(trade)}
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-200 text-gray-600 hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary'
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {trade}
                    </button>
                  )
                })}
              </div>
              {formData.trades.length > 0 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {formData.trades.length} selected
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Describe Your Project</h2>

            <div>
              <label htmlFor="description" className={labelCls}>Description <span className="text-red-500">*</span></label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                maxLength={5000}
                aria-required="true"
                className={inputCls}
                placeholder="Describe your project requirements in detail..."
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formData.description.length}/5000 characters (min 50)</p>
              <FieldError msg={formData.description.length > 0 ? errors.description : undefined} />
            </div>

            <div>
              <label htmlFor="specialRequirements" className={labelCls}>Special Requirements</label>
              <textarea
                id="specialRequirements"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows={3}
                className={inputCls}
                placeholder="Any special requirements or notes for builders (optional)..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Property & Size */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Property & Size</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">These details help builders scope your project. All optional.</p>

            <div>
              <label htmlFor="propertyType" className={labelCls}>Property Type</label>
              <select id="propertyType" name="propertyType" value={formData.propertyType} onChange={handleChange} className={inputCls}>
                <option value="">Select property type</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="areaValue" className={labelCls}>Area</label>
                <input id="areaValue" type="number" name="areaValue" value={formData.areaValue} onChange={handleChange} min="0" className={inputCls} placeholder="e.g., 10" />
              </div>
              <div>
                <label htmlFor="areaUnit" className={labelCls}>Unit</label>
                <select id="areaUnit" name="areaUnit" value={formData.areaUnit} onChange={handleChange} className={inputCls}>
                  {AREA_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {formData.areaValue !== '' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">≈ {toSqFt(formData.areaValue, formData.areaUnit).toLocaleString()} sq ft</p>
            )}
            <FieldError msg={formData.areaValue !== '' ? errors.areaValue : undefined} />

            <div className="grid grid-cols-3 gap-4">
              {showFloors && (
                <div>
                  <label htmlFor="floors" className={labelCls}>Floors</label>
                  <input id="floors" type="number" name="floors" value={formData.floors} onChange={handleChange} min="0" className={inputCls} placeholder="e.g., 2" />
                </div>
              )}
              {showRooms && (
                <div>
                  <label htmlFor="rooms" className={labelCls}>Rooms</label>
                  <input id="rooms" type="number" name="rooms" value={formData.rooms} onChange={handleChange} min="0" className={inputCls} placeholder="e.g., 4" />
                </div>
              )}
              {showUnits && (
                <div>
                  <label htmlFor="units" className={labelCls}>Units</label>
                  <input id="units" type="number" name="units" value={formData.units} onChange={handleChange} min="0" className={inputCls} placeholder="e.g., 8" />
                </div>
              )}
            </div>

            {showStructureCondition && (
              <div>
                <label htmlFor="structureCondition" className={labelCls}>Existing Structure Condition</label>
                <select id="structureCondition" name="structureCondition" value={formData.structureCondition} onChange={handleChange} className={inputCls}>
                  <option value="">Select condition</option>
                  {STRUCTURE_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Who provides the materials?</label>
              <div className="space-y-2">
                {MATERIALS_PROVIDED_BY.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3">
                    <input type="radio" name="materialsProvidedBy" value={opt.value} checked={formData.materialsProvidedBy === opt.value} onChange={handleChange} />
                    <span className="text-sm dark:text-gray-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Project Location</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="province" className={labelCls}>Province</label>
                <select id="province" name="province" value={formData.province} onChange={handleProvinceChange} className={inputCls}>
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="city" className={labelCls}>City <span className="text-red-500">*</span></label>
                <select id="city" name="city" value={formData.city} onChange={handleChange} disabled={!formData.province} aria-required="true" className={inputCls}>
                  <option value="">{formData.province ? 'Select city' : 'Select province first'}</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <FieldError msg={formData.province && !formData.city ? errors.city : undefined} />
              </div>
            </div>

            <div>
              <label htmlFor="locationArea" className={labelCls}>Locality / Area</label>
              <LocalityAutocomplete
                id="locationArea"
                value={formData.locationArea}
                onChange={(v) => setFormData((prev) => ({ ...prev, locationArea: v }))}
                city={formData.city}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="locationAddress" className={labelCls}>Street Address</label>
              <input id="locationAddress" type="text" name="locationAddress" value={formData.locationAddress} onChange={handleChange} className={inputCls} placeholder="House/Plot #, Street" />
            </div>
          </div>
        )}

        {/* Step 5: Budget */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Budget</h2>

            <div>
              <label className={labelCls}>How would you like to set the budget?</label>
              <div className="space-y-2">
                {BUDGET_TYPES.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3">
                    <input type="radio" name="budgetType" value={opt.value} checked={formData.budgetType === opt.value} onChange={handleChange} />
                    <span className="text-sm dark:text-gray-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.budgetType === 'FIXED_RANGE' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budgetMin" className={labelCls}>Minimum Budget (PKR) <span className="text-red-500">*</span></label>
                    <input id="budgetMin" type="number" name="budgetMin" value={formData.budgetMin} onChange={handleChange} min="1000" aria-required="true" className={inputCls} placeholder="50,000" />
                    <FieldError msg={formData.budgetMin !== '' ? errors.budgetMin : undefined} />
                  </div>
                  <div>
                    <label htmlFor="budgetMax" className={labelCls}>Maximum Budget (PKR) <span className="text-red-500">*</span></label>
                    <input id="budgetMax" type="number" name="budgetMax" value={formData.budgetMax} onChange={handleChange} min="1000" aria-required="true" className={inputCls} placeholder="100,000" />
                    <FieldError msg={formData.budgetMax !== '' ? errors.budgetMax : undefined} />
                  </div>
                </div>
                {formData.budgetMin && formData.budgetMax && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Budget range: {formatPKR(formData.budgetMin)} – {formatPKR(formData.budgetMax)}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 6: Timeline & Requirements */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Timeline & Requirements</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="preferredStartDate" className={labelCls}>Preferred Start Date</label>
                <input id="preferredStartDate" type="date" name="preferredStartDate" value={formData.preferredStartDate} onChange={handleChange} min={today} className={inputCls} />
              </div>
              <div>
                <label htmlFor="deadline" className={labelCls}>Deadline</label>
                <input id="deadline" type="date" name="deadline" value={formData.deadline} onChange={handleChange} min={today} className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="biddingDeadline" className={labelCls}>Bidding Deadline</label>
              <input id="biddingDeadline" type="date" name="biddingDeadline" value={formData.biddingDeadline} onChange={handleChange} min={today} className={inputCls} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Optional — bids close automatically at the end of this day.</p>
              <FieldError msg={errors.biddingDeadline} />
            </div>

            <div>
              <label htmlFor="estimatedDurationDays" className={labelCls}>Estimated Duration (days)</label>
              <input
                id="estimatedDurationDays"
                type="number"
                name="estimatedDurationDays"
                value={formData.estimatedDurationDays}
                onChange={handleChange}
                min="1"
                className={inputCls}
                placeholder="e.g., 90"
              />
            </div>

            <div className="space-y-3 pt-2">
              {FLAG_OPTIONS.map((opt) => (
                <label key={opt.name} className="flex items-center gap-3">
                  <input type="checkbox" name={opt.name} checked={formData[opt.name]} onChange={handleChange} className="rounded" />
                  <div>
                    <span className="font-medium text-sm dark:text-gray-300">{opt.label}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Attachments */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold dark:text-white">Attachments</h2>

            {/* Images */}
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-sm dark:text-gray-200">Images</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Photos of the site, plans, or requirements. Optional.</p>
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif" multiple onChange={handleImageSelect} className="hidden" />
              {stagedImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <ImagePlus className="h-9 w-9 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">Click to add images</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, or GIF — max 10MB each</p>
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stagedImages.map((img, index) => (
                      <div key={img.preview} className="relative group rounded-lg overflow-hidden border dark:border-gray-600">
                        <img src={img.preview} alt={img.file.name} loading="lazy" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1.5 right-1.5 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          aria-label="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 truncate">{img.file.name}</p>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ImagePlus className="h-4 w-4" /> Add more images
                  </button>
                </>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-sm dark:text-gray-200">Documents</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plans, BOQs, or specs. Optional.</p>
              </div>
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={handleDocumentSelect} className="hidden" />
              {stagedDocuments.length === 0 ? (
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-9 w-9 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">Click to add documents</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF, DOC, or DOCX — max 10MB each</p>
                </button>
              ) : (
                <>
                  <div className="space-y-2">
                    {stagedDocuments.map((doc, index) => (
                      <div key={`${doc.name}-${doc.size}-${doc.lastModified}`} className="flex items-center gap-3 border dark:border-gray-600 rounded-lg px-3 py-2">
                        <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-sm truncate flex-1 dark:text-gray-300">{doc.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" onClick={() => removeDocument(index)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" aria-label="Remove document">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => docInputRef.current?.click()} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" /> Add more documents
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 8: Review & Submit */}
        {step === 8 && (
          <ReviewStep
            formData={formData}
            selectedCategoryName={selectedCategoryName}
            imagesCount={stagedImages.length}
            documentsCount={stagedDocuments.length}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-6 border-t dark:border-gray-700">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-5 py-2 border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
          ) : (
            <div />
          )}
          <div>
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-5 py-2 rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
