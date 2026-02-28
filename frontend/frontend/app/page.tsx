"use client";

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, UploadCloud, FileText, Filter, Trash2, Bot, Loader2, X, AlertTriangle, CheckCircle, SearchX, FolderUp, Zap, HardDrive, Info } from "lucide-react"

const API_URL = "http://localhost:8000"

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function SearchAndUploadInterface() {
  const [documents, setDocuments] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [hasSearched, setHasSearched] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Estado para el documento seleccionado en la vista dividida
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)

  const allTypes = ['pdf', 'docx', 'txt', 'csv', 'xlsx'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(allTypes)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const clearMessages = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/`)
      if (!res.ok) throw new Error("Error")
      const data = await res.json()
      setDocuments(data.documentos || [])
    } catch (error) {
      setErrorMsg("No se pudieron cargar los documentos. Comprueba que el backend está encendido.")
    }
  }

  const handleSearch = async (e: any) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    clearMessages()
    setIsSearching(true)
    setHasSearched(true)

    try {
      const res = await fetch(`${API_URL}/search/?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error("Error")
      const data = await res.json()
      setSearchResults(data.resultados || [])
    } catch (error) {
      setErrorMsg("Fallo de conexión al buscar.")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleUpload = async (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    clearMessages();
    setIsUploading(true);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    const filesArray = Array.from(files) as File[];

    for (const file of filesArray) {
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase().replace('.', '');
      if (!allTypes.includes(fileExtension)) {
         errorCount++;
         continue;
      }

      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch(`${API_URL}/upload/`, { method: "POST", body: formData })
        const data = await res.json()

        if (res.ok) {
           if (data.duplicado) duplicateCount++;
           else successCount++;
        } else {
           errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setIsUploading(false);
    e.target.value = '';

    if (successCount > 0 || duplicateCount > 0) {
      let finalMsg = `Subidos: ${successCount} archivo(s).`;
      if (duplicateCount > 0) finalMsg += ` (${duplicateCount} duplicados omitidos automáticamente).`;
      setSuccessMsg(finalMsg);
      await fetchDocuments();
    } else {
      setErrorMsg("Ningún archivo válido encontrado.");
    }
  }

  const handleDelete = async (docId: number, docTitle: string) => {
    if (!confirm(`¿Seguro que quieres eliminar "${docTitle}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/documents/${docId}/`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessMsg(`Documento eliminado.`)
        await fetchDocuments()
        setSearchResults(prev => prev.filter(doc => doc.id !== docId))
        if (selectedDoc?.id === docId) setSelectedDoc(null);
      } else {
        setErrorMsg("Error al eliminar.")
      }
    } catch (error) {
      setErrorMsg("Error de conexión.")
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
    clearMessages()
  }

  const filteredDocuments = documents.filter(doc => selectedTypes.includes(doc.tipo?.toLowerCase() || ''))
  const filteredSearchResults = searchResults.filter(res => selectedTypes.includes(res.tipo?.toLowerCase() || ''))

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 p-6 md:p-10 max-w-[1500px] mx-auto relative">

      <header className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-3 rounded-2xl shadow-lg shadow-indigo-200">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-indigo-600 tracking-tight">fAInd</h1>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase mt-0.5">By Grupo Scorpions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-4 py-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 font-semibold text-sm rounded-full">HackUDC 2026</Badge>
          <Badge variant="secondary" className="px-4 py-1.5 bg-slate-200/50 text-slate-600 font-medium text-sm rounded-full">Versión 1.0</Badge>
        </div>
      </header>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative flex-1 max-w-4xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 h-6 w-6 text-slate-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pregúntale a fAInd sobre tus documentos..." className="pl-14 h-14 text-lg bg-white border-slate-200 rounded-2xl focus-visible:ring-indigo-500 shadow-sm" />
            {searchQuery && <button type="button" onClick={clearSearch} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>}
          </div>
          <Button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-8 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg">
            {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      </form>

      <div className="max-w-4xl mx-auto mb-6">
        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 flex items-center gap-3 rounded-r-xl shadow-sm animate-in fade-in">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-medium text-sm flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-500"><X className="h-5 w-5"/></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 flex items-center gap-3 rounded-r-xl shadow-sm animate-in fade-in">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium text-sm flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500"><X className="h-5 w-5"/></button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">

        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 font-bold text-lg mb-6 text-slate-800 border-b border-slate-100 pb-4">
              <Filter className="h-5 w-5 text-indigo-600" />
              <h3>Filtros Activos</h3>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Formatos Soportados</h4>
                <div className="space-y-3.5">
                  {allTypes.map(ext => (
                    <label key={ext} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedTypes.includes(ext)} onChange={() => handleTypeToggle(ext)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" />
                      <span className="text-slate-600 font-medium group-hover:text-indigo-700 transition-colors uppercase">{ext}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col gap-10">

          {hasSearched ? (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-3">
                  Resultados de fAInd
                  <Badge className="bg-indigo-100 text-indigo-700 border-none px-3 py-1 text-sm">{filteredSearchResults.length}</Badge>
                </h3>
                <Button variant="ghost" onClick={clearSearch} className="text-slate-500 hover:text-slate-800 font-semibold">Volver a mis archivos</Button>
              </div>

              <div className="flex flex-col gap-5">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((res: any) => (
                    <Card key={res.id} className="border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-300 group bg-white">
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-blue-500"></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 p-3 rounded-xl"><FileText className="h-6 w-6 text-indigo-600" /></div>
                            <div>
                              <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{res.titulo}</h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TIPO: {res.tipo || "PDF"}</span>
                                {res.score && (
                                  <Badge className={`${res.score > 85 ? 'bg-emerald-100 text-emerald-700' : res.score > 70 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} border-none font-bold`}>{res.score}% Similitud</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(res.id, res.titulo)} className="text-slate-300 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="mt-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-5 w-5 text-indigo-600" />
                            <span className="text-sm font-bold text-slate-800">Contexto extraído por fAInd AI</span>
                          </div>
                          <p className="text-sm text-slate-600 italic leading-relaxed">"{res.resumen}"</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center shadow-sm">
                    <div className="bg-slate-50 p-5 rounded-full mb-4"><SearchX className="h-12 w-12 text-slate-400" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Sin resultados con los filtros actuales</h3>
                    <p className="text-slate-500 text-base max-w-md">fAInd no ha encontrado relación semántica.</p>
                    <Button variant="outline" onClick={clearSearch} className="mt-6 border-slate-300 font-semibold">Limpiar búsqueda</Button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section>
                <div className={`relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all ${isUploading ? 'border-indigo-400 bg-indigo-50/80 shadow-inner' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400 shadow-sm'}`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center animate-in fade-in">
                      <div className="bg-indigo-100 p-4 rounded-full mb-4"><Loader2 className="h-10 w-10 text-indigo-600 animate-spin" /></div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">fAInd está indexando...</h3>
                      <p className="text-slate-500 font-medium text-sm">Comprobando duplicados y entrenando IA...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-indigo-50 p-4 rounded-2xl mb-4 border border-indigo-100 shadow-sm"><UploadCloud className="h-8 w-8 text-indigo-600" /></div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Añadir a fAInd</h3>
                      <p className="text-slate-500 text-sm font-medium max-w-lg mb-6">Sube archivos individuales o importa carpetas enteras de tu ordenador.</p>

                      <div className="flex gap-4 w-full max-w-md justify-center">
                        <div className="relative flex-1">
                          <input type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2 h-12 rounded-xl font-bold">
                            <FileText className="h-4 w-4" /> Archivos
                          </Button>
                        </div>
                        <div className="relative flex-1">
                          <input type="file"
                            // @ts-ignore
                            webkitdirectory="" directory="" multiple onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <Button variant="outline" className="w-full border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm gap-2 h-12 rounded-xl font-bold">
                            <FolderUp className="h-4 w-4" /> Carpeta
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* ===================== VISTA MAESTRO-DETALLE ===================== */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-3">
                    Repositorio Local
                    <Badge className="bg-slate-200 text-slate-700 border-none px-3 py-1 text-sm">{filteredDocuments.length}</Badge>
                  </h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                  {/* COLUMNA IZQUIERDA: LISTA DE ARCHIVOS SCROLL */}
                  <div className="w-full lg:w-5/12 xl:w-1/3 flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredDocuments.length === 0 ? (
                      <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 shadow-sm">
                        <p className="text-slate-500 font-semibold text-sm">No hay documentos en fAInd.</p>
                      </div>
                    ) : (
                      filteredDocuments.map((doc: any) => (
                        <Card
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className={`border-2 transition-all group bg-white rounded-2xl cursor-pointer shadow-sm
                            ${selectedDoc?.id === doc.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100' : 'border-slate-100 hover:border-indigo-300'}`}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden pr-2">
                              <div className={`p-2.5 rounded-xl shrink-0 transition-colors
                                ${selectedDoc?.id === doc.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="truncate">
                                <p className={`font-bold transition-colors truncate text-sm
                                  ${selectedDoc?.id === doc.id ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`} title={doc.titulo}>
                                    {doc.titulo}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{doc.tipo} • ID: {doc.id}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.titulo) }} className="text-slate-300 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  {/* COLUMNA DERECHA: PANEL DE DETALLES FIJO */}
                  <div className="w-full lg:w-7/12 xl:w-2/3 sticky top-6">
                    {selectedDoc ? (
                      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="text-xl font-black text-slate-900 break-words">{selectedDoc.titulo}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none uppercase tracking-wider text-xs">{selectedDoc.tipo}</Badge>
                            <span className="text-xs font-bold text-slate-400">ID en fAInd: {selectedDoc.id}</span>
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                              <div className="bg-blue-50 p-3 rounded-xl"><HardDrive className="h-5 w-5 text-blue-500" /></div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peso en Disco</span>
                                <span className="text-base font-black text-slate-800">{formatBytes(selectedDoc.peso)}</span>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                              <div className="bg-emerald-50 p-3 rounded-xl"><Bot className="h-5 w-5 text-emerald-500" /></div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado IA</span>
                                <span className="text-sm font-black text-emerald-600">Vectorizado ✔️</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                              <Info className="h-4 w-4 text-indigo-600"/> Vista previa de extracción (Raw)
                            </h4>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-sm text-slate-600 leading-relaxed italic shadow-inner h-64 overflow-y-auto">
                              "{selectedDoc.resumen}"
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* PLACEHOLDER SI NO HAY NADA SELECCIONADO */
                      <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                          <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Ningún archivo seleccionado</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                          Haz clic en cualquier documento de la lista de la izquierda para ver sus propiedades, peso y el texto que fAInd ha conseguido extraer de él.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}