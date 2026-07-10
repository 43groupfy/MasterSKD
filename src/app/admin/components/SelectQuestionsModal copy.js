'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../utils/supabase'

export default function SelectQuestionsModal({ packageId, totalQuestions, onClose, onSaved }) {
  const [allQuestions, setAllQuestions] = useState([])
  const [selectedIds, setSelectedIds]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [search, setSearch]             = useState('')
  
  const [filterCategory, setFilterCategory] = useState('All')
  const [swapIndex, setSwapIndex] = useState(null)

  useEffect(() => { loadData() }, [packageId])

  const loadData = async () => {
    setLoading(true)
    const [qRes, itemRes] = await Promise.all([
      supabase.from('questions').select('id, label, sub_label, question_text').order('id'),
      supabase.from('exam_package_items').select('question_id, order_number').eq('package_id', packageId).order('order_number'),
    ])

    setAllQuestions(qRes.data || [])
    setSelectedIds((itemRes.data || []).map(it => it.question_id))
    setLoading(false)
  }

  // 1. GENERATE DROPDOWN DINAMIS BERDASARKAN DATABASE
  const filterOptions = useMemo(() => {
    const optionsMap = {}
    
    allQuestions.forEach(q => {
      if (!q.label) return // Abaikan jika tidak ada label
      
      // Jika label belum ada di object, buat set baru (Set otomatis mencegah duplikasi)
      if (!optionsMap[q.label]) {
        optionsMap[q.label] = new Set()
      }
      
      // Jika ada sub_label, masukkan ke dalam set label tersebut
      if (q.sub_label) {
        optionsMap[q.label].add(q.sub_label)
      }
    })

    // Konversi bentuk Set menjadi Array yang sudah diurutkan (Alfabetis)
    const formattedOptions = {}
    Object.keys(optionsMap).sort().forEach(label => {
      formattedOptions[label] = Array.from(optionsMap[label]).sort()
    })

    return formattedOptions
  }, [allQuestions])

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesSearch = q.question_text.toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false

      if (filterCategory === 'All') return true
      
      if (filterCategory.includes(' - ')) {
        const [label, subLabel] = filterCategory.split(' - ')
        return q.label === label && q.sub_label === subLabel
      }
      
      return q.label === filterCategory
    })
  }, [allQuestions, search, filterCategory])

  const selectedQuestions = useMemo(() => {
    return selectedIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean)
  }, [selectedIds, allQuestions])

  const handleSelectFromBank = (qId) => {
    if (swapIndex !== null) {
      if (selectedIds.includes(qId)) {
        alert('Soal ini sudah ada di dalam paket!')
        return
      }
      setSelectedIds(prev => {
        const next = [...prev]
        next[swapIndex] = qId
        return next
      })
      setSwapIndex(null)
      return
    }

    if (selectedIds.includes(qId)) {
      handleRemoveQuestion(qId)
    } else {
      if (selectedIds.length >= totalQuestions) {
        alert(`Kuota paket soal sudah penuh (${totalQuestions} soal).`)
        return
      }
      setSelectedIds(prev => [...prev, qId])
    }
  }

  const handleRemoveQuestion = (qId) => {
    setSelectedIds(prev => prev.filter(id => id !== qId))
    if (swapIndex !== null && selectedIds[swapIndex] === qId) {
      setSwapIndex(null)
    }
  }

  const handleMoveUpDown = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= selectedIds.length) return

    setSelectedIds(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  const handleMoveToPosition = (index) => {
    const currentNo = index + 1
    const targetInput = prompt(`Masukkan nomor tujuan untuk soal ini (1-${selectedIds.length}):`, currentNo)
    if (!targetInput) return

    const targetNo = parseInt(targetInput, 10)
    if (isNaN(targetNo) || targetNo < 1 || targetNo > selectedIds.length) {
      alert('Nomor tujuan tidak valid!')
      return
    }

    const targetIndex = targetNo - 1
    if (index === targetIndex) return

    setSelectedIds(prev => {
      const next = [...prev]
      const [movedItem] = next.splice(index, 1)
      next.splice(targetIndex, 0, movedItem)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('exam_package_items').delete().eq('package_id', packageId)

      if (selectedIds.length > 0) {
        const itemsToInsert = selectedIds.map((qId, index) => ({
          package_id: packageId,
          question_id: qId,
          order_number: index + 1
        }))
        await supabase.from('exam_package_items').insert(itemsToInsert)
      }

      onSaved()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan komponen paket soal')
    } finally {
      setSaving(false)
    }
  }

  // Gaya CSS untuk teks soal agar rapi dan tidak meluber
  const questionTextStyle = {
    fontSize: '13px', 
    color: 'var(--gray-700)', 
    display: '-webkit-box',
    WebkitLineClamp: 2, // Maksimal 2 baris, sisanya diubah menjadi "..."
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word'
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div className="modal-header">
          <div>
            <span className="modal-title">⚙️ Kelola Isi Paket Soal</span>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
              Kuota Paket: <strong>{selectedIds.length} / {totalQuestions}</strong> Soal Terisi
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden', padding: '20px' }}>
          
          {/* PANE KIRI: flex: '1 1 50%' & minWidth: 0 menjaga layout tidak didorong melebihi batas */}
          <div style={{ flex: '1 1 50%', minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--gray-200)', paddingRight: '20px' }}>
            <div style={{ marginBottom: '12px', fontWeight: '600', color: 'var(--gray-700)' }}>1. Gudang Bank Soal</div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Cari teks soal..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
              
              {/* DROPDOWN DINAMIS */}
              <select 
                className="form-input" 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                style={{ width: '200px', cursor: 'pointer', flexShrink: 0 }}
              >
                <option value="All">📋 Semua Kategori</option>
                
                {Object.entries(filterOptions).map(([label, subLabels]) => (
                  <optgroup key={label} label={label}>
                    <option value={label}>Semua {label}</option>
                    {subLabels.map(sub => (
                      <option key={`${label} - ${sub}`} value={`${label} - ${sub}`}>
                        ↳ {sub}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Memuat bank soal...</div>
              ) : filteredQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Tidak ada soal yang cocok.</div>
              ) : (
                filteredQuestions.map(q => {
                  const isSelected = selectedIds.includes(q.id)
                  const orderIndex = selectedIds.indexOf(q.id)
                  
                  return (
                    <div 
                      key={q.id} 
                      onClick={() => handleSelectFromBank(q.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--gray-200)',
                        background: isSelected ? 'rgba(var(--brand-primary-rgb), 0.04)' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s',
                        width: '100%' // Memastikan card tidak melampaui lebar induk
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0,
                        border: isSelected ? 'none' : '2px solid var(--gray-300)',
                        background: isSelected ? 'var(--brand-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '11px', fontWeight: 'bold'
                      }}>
                        {isSelected ? (orderIndex + 1) : ''}
                      </div>

                      {/* minWidth: 0 sangat vital di sini untuk flex child agar ellipsis bekerja */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${q.label?.toLowerCase()}`}>{q.label}</span>
                          {q.sub_label && <span style={{ fontSize: '11px', background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{q.sub_label}</span>}
                        </div>
                        {/* Penerapan Line Clamp CSS */}
                        <div style={questionTextStyle}>
                          {q.question_text}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '16px', flexShrink: 0, color: isSelected ? 'var(--brand-primary)' : 'var(--gray-400)' }}>
                        {swapIndex !== null ? '🔄' : isSelected ? '✓' : '＋'}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* PANE KANAN */}
          <div style={{ flex: '1 1 50%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>2. Susunan Urutan Ujian</span>
              {swapIndex !== null && (
                <span style={{ fontSize: '12px', background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                  ⚠️ Memilih pengganti No. {swapIndex + 1} ... <button onClick={() => setSwapIndex(null)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>Batal</button>
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-400)', border: '2px dashed var(--gray-200)', borderRadius: '8px' }}>
                  Belum ada soal terpilih.<br/>Klik soal di sebelah kiri untuk memasukkan ke dalam paket.
                </div>
              ) : (
                selectedQuestions.map((q, index) => {
                  const isBeingSwapped = swapIndex === index

                  return (
                    <div 
                      key={`selected-${q.id}`} 
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isBeingSwapped ? '2px dashed #ffc107' : '1px solid var(--gray-200)',
                        background: isBeingSwapped ? '#fffdf5' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%' // Keamanan batas lebar
                      }}
                    >
                      <div 
                        onClick={() => handleMoveToPosition(index)}
                        title="Klik untuk pindah posisi ke nomor spesifik"
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: 'var(--gray-800)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.label} • {q.sub_label || 'Tanpa Sub-Label'}
                        </div>
                        {/* Penerapan Line Clamp CSS di card kanan */}
                        <div style={questionTextStyle}>
                          {q.question_text}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleMoveUpDown(index, 'up')} 
                          disabled={index === 0}
                          className="btn btn-ghost" 
                          style={{ padding: '4px', fontSize: '12px' }}
                        >🔼</button>
                        <button 
                          onClick={() => handleMoveUpDown(index, 'down')} 
                          disabled={index === selectedIds.length - 1}
                          className="btn btn-ghost" 
                          style={{ padding: '4px', fontSize: '12px' }}
                        >🔽</button>
                        <button 
                          onClick={() => handleMoveToPosition(index)} 
                          className="btn btn-ghost" 
                          style={{ padding: '4px', fontSize: '12px' }}
                        >🔢</button>
                        <button 
                          onClick={() => setSwapIndex(isBeingSwapped ? null : index)} 
                          className={`btn ${isBeingSwapped ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px', fontSize: '12px' }}
                        >🔄</button>
                        <button 
                          onClick={() => handleRemoveQuestion(q.id)} 
                          className="btn btn-ghost" 
                          style={{ padding: '4px', fontSize: '12px', color: 'red' }}
                        >❌</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving || selectedIds.length === 0}
          >
            {saving ? '⏳ Menyimpan...' : `💾 Simpan Formasi ${selectedIds.length} Soal`}
          </button>
        </div>

      </div>
    </div>
  )
}