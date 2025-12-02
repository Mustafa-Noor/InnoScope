"use client"

import React, { useState } from 'react'

export default function FileUpload() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')

  const handleSelect = (e) => {
    setFile(e.target.files?.[0] || null)
    setStatus('')
  }

  const handleUpload = async () => {
    if (!file) return setStatus('Please choose a file first.')
    setStatus('Uploading...')

    try {
      // Try to send to backend if available; otherwise simulate
      const token = localStorage.getItem('token')
      const form = new FormData()
      form.append('file', file)

      const res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000') + '/roadmap/generate', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!res.ok) {
        // fallback to simulated response
        setTimeout(() => setStatus('Upload failed or backend not running — simulated success.'), 600)
      } else {
        const data = await res.json().catch(() => null)
        setStatus('Uploaded successfully.' + (data ? ' Response received.' : ''))
      }
    } catch (err) {
      setStatus('Upload failed (no backend). Simulated success.')
    }
  }

  return (
    <div>
      <h3 style={{ color: '#065f46' }}>Upload a File</h3>
      <p style={{ color: '#6b7280' }}>Supported: PDFs, DOCX, TXT. The backend will parse and generate a roadmap.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="file" onChange={handleSelect} />
        <button onClick={handleUpload} style={{ padding: '8px 14px', background: '#10b981', color: 'white', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Upload</button>
      </div>

      {file && (
        <div style={{ marginTop: 12 }}>
          <strong>Selected:</strong> {file.name} ({Math.round(file.size / 1024)} KB)
        </div>
      )}

      {status && (
        <div style={{ marginTop: 12, color: status.includes('failed') ? '#dc2626' : '#065f46' }}>{status}</div>
      )}
    </div>
  )
}
