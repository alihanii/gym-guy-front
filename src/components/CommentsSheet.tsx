import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SendHorizontal, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { relativeDays } from '../lib/fa'
import type { SocialComment } from '../lib/types'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

export function CommentsSheet({ workoutId, onClose, onCount }: { workoutId: number; onClose: () => void; onCount?: (n: number) => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const key = ['comments', workoutId]
  const q = useQuery({ queryKey: key, queryFn: () => api<SocialComment[]>(`/social/workouts/${workoutId}/comments/`) })
  const [text, setText] = useState('')
  const add = useMutation({
    mutationFn: () => api<SocialComment>(`/social/workouts/${workoutId}/comments/`, { method: 'POST', json: { text } }),
    onSuccess: (c) => {
      const next = [...(q.data ?? []), c]
      qc.setQueryData(key, next)
      onCount?.(next.length)
      setText('')
    },
    onError: (e: Error) => toast(e.message),
  })
  const del = useMutation({
    mutationFn: (id: number) => api(`/social/comments/${id}/`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      const next = (q.data ?? []).filter((c) => c.id !== id)
      qc.setQueryData(key, next)
      onCount?.(next.length)
    },
  })
  return (
    <Sheet open onClose={onClose} title="کامنت‌ها">
      <div className="stack">
        {q.isLoading && <div className="skeleton" style={{ height: 80 }} />}
        {q.data?.length === 0 && <p className="muted small">هنوز کامنتی نیست. اولین نفر باشید.</p>}
        {q.data?.map((c) => (
          <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
            <Link to={`/u/${c.user.id}`} className="avatar" style={{ width: 34, height: 34 }}>{c.user.name.slice(0, 1)}</Link>
            <div className="grow">
              <div className="small"><b>{c.user.name}</b> <span className="faint">{relativeDays(c.created_at)}</span></div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{c.text}</p>
            </div>
            {c.can_delete && (
              <button className="icon-btn" onClick={() => del.mutate(c.id)} aria-label="حذف کامنت"><Trash2 size={16} /></button>
            )}
          </div>
        ))}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate() }} style={{ position: 'sticky', bottom: 0, background: 'var(--surface)', paddingTop: 8 }}>
          <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="کامنت بنویسید…" maxLength={500} aria-label="متن کامنت" />
          <button className="btn btn-primary" disabled={!text.trim() || add.isPending} aria-label="ارسال"><SendHorizontal size={18} /></button>
        </form>
      </div>
    </Sheet>
  )
}
