import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus } from 'lucide-react'
import { api } from '../lib/api'
import { useTaxonomy } from '../lib/data'
import type { Exercise } from '../lib/types'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

/** Create a personal exercise that only this user sees, optionally with a photo. */
export function CustomExerciseSheet({ open, initialName = '', onClose, onCreated }: {
  open: boolean; initialName?: string; onClose: () => void; onCreated?: (e: Exercise) => void
}) {
  const tax = useTaxonomy()
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [nameEn, setNameEn] = useState('')
  const [equipment, setEquipment] = useState('barbell')
  const [muscle, setMuscle] = useState('chest')
  const [tracking, setTracking] = useState('weight_reps')
  const [photo, setPhoto] = useState<File | null>(null)

  const create = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.set('title_fa', name.trim())
      fd.set('title_en', nameEn.trim() || name.trim())
      fd.set('equipment', equipment)
      fd.set('primary_muscle', muscle)
      fd.set('tracking_type', tracking)
      if (photo) fd.set('thumbnail', photo)
      return api<Exercise>('/exercises/', { method: 'POST', body: fd })
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['exercises'] })
      toast(`«${e.title_fa}» ساخته شد`)
      onCreated?.(e)
      onClose()
    },
    onError: (e: Error) => toast(e.message),
  })

  return (
    <Sheet open={open} onClose={onClose} title="ساخت حرکت شخصی">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate() }}>
        <label className="field"><span>اسم حرکت</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً «پرس سرشانه دستگاه همر»" required /></label>
        <label className="field"><span>اسم انگلیسی (اختیاری)</span><input className="input" dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></label>
        <div className="grid-2">
          <label className="field"><span>وسیله</span>
            <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              {tax.data?.equipment.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="field"><span>عضله اصلی</span>
            <select className="select" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              {tax.data?.muscles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span>نوع ثبت</span>
          <select className="select" value={tracking} onChange={(e) => setTracking(e.target.value)}>
            {tax.data?.tracking_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="btn btn-ghost btn-block" style={{ cursor: 'pointer' }}>
          <ImagePlus size={18} /> {photo ? photo.name : 'افزودن عکس (اختیاری)'}
          <input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={!name.trim() || create.isPending}>
          {create.isPending ? 'در حال ساخت…' : 'ساخت حرکت'}
        </button>
      </form>
    </Sheet>
  )
}
