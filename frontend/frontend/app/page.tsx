"use client";

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, UploadCloud, FileText, Filter, Trash2, Bot, Loader2, X, AlertTriangle, CheckCircle, SearchX, FolderUp } from "lucide-react"

const API_URL = "http://localhost:8000"

export default function SearchAndUploadInterface() {
  const [documents, setDocuments] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Estados para UX
  const [hasSearched, setHasSearched] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // NUEVO: Estado para los filtros funcionales
  const allTypes = ['pdf', 'docx', 'txt', 'csv', 'xlsx'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(allTypes)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const clearMessages = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  // NUEVO: Lógica para activar/desactivar filtros
  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/`)
      if (!res.ok) throw new Error("Error en la respuesta")
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
      if (!res.ok) throw new Error("Error al buscar")
      const data = await res.json()
      setSearchResults(data.resultados || [])
    } catch (error) {
      setErrorMsg("Fallo de conexión al buscar.")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // NUEVO: Lógica para subir múltiples archivos y carpetas
  const handleUpload = async (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    clearMessages();
    setIsUploading(true);

    let successCount = 0;
    let errorCount = 0;

    // Iteramos por todos los archivos de la carpeta o selección
    const filesArray = Array.from(files) as File[];

    for (const file of filesArray) {
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase().replace('.', '');

      // Omitimos archivos ocultos o no soportados por el backend
      if (!allTypes.includes(fileExtension)) {
         errorCount++;
         continue;
      }

      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch(`${API_URL}/upload/`, {
          method: "POST",
          body: formData,
        })
        if (res.ok) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsUploading(false);
    e.target.value = ''; // Reset input

    if (successCount > 0) {
      setSuccessMsg(`¡Se han subido e indexado ${successCount} documento(s) correctamente! ${errorCount > 0 ? `(Omitidos ${errorCount} por formato no soportado)` : ''}`);
      await fetchDocuments();
    } else {
      setErrorMsg("Ningún archivo válido encontrado. Asegúrate de que la carpeta contiene PDFs, CSVs, TXTs o XLSXs.");
    }
  }

  // NUEVO: Lógica conectada al endpoint DELETE de tu backend
  const handleDelete = async (docId: number, docTitle: string) => {
    if (!confirm(`¿Seguro que quieres eliminar "${docTitle}" del sistema y la base de datos?`)) return;

    try {
      const res = await fetch(`${API_URL}/documents/${docId}/`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSuccessMsg(`Documento "${docTitle}" eliminado.`)
        await fetchDocuments()
        // Lo quitamos también visualmente de los resultados de búsqueda si existiera
        setSearchResults(prev => prev.filter(doc => doc.id !== docId))
      } else {
        setErrorMsg("Error al eliminar el documento en el backend.")
      }
    } catch (error) {
      setErrorMsg("Error de conexión al intentar eliminar.")
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
    clearMessages()
  }

  // NUEVO: Filtros aplicados en tiempo real a las listas
  const filteredDocuments = documents.filter(doc => selectedTypes.includes(doc.tipo?.toLowerCase() || ''))
  const filteredSearchResults = searchResults.filter(res => selectedTypes.includes(res.tipo?.toLowerCase() || ''))

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 p-6 md:p-10 max-w-[1400px] mx-auto">

      {/* BARRA DE BÚSQUEDA */}
      <form onSubmit={handleSearch} className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
        <div className="relative flex-1 max-w-4xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contenido en los documentos indexados..."
              className="pl-12 h-12 text-lg bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 shadow-inner"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-medium transition-all shadow-sm hover:shadow-md">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      </form>

      {/* ALERTAS VISUALES */}
      <div className="max-w-4xl mx-auto mb-6">
        {errorMsg && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 flex items-center gap-3 rounded-r-lg shadow-sm animate-in fade-in">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-medium text-sm flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800"><X className="h-5 w-5"/></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 flex items-center gap-3 rounded-r-lg shadow-sm animate-in fade-in">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium text-sm flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800"><X className="h-5 w-5"/></button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-10">

        {/* COLUMNA IZQUIERDA: FILTROS DINÁMICOS */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg mb-6 text-slate-800 border-b border-slate-100 pb-3">
            <Filter className="h-5 w-5 text-indigo-600" />
            <h3>Filtros Activos</h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Formatos Soportados</h4>
              <div className="space-y-3">
                {allTypes.map(ext => (
                  <label key={ext} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(ext)}
                      onChange={() => handleTypeToggle(ext)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                    />
                    <span className="text-slate-600 font-medium group-hover:text-indigo-700 transition-colors uppercase">{ext}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* COLUMNA CENTRAL: SUBIDA O RESULTADOS */}
        <main className="flex-1 flex flex-col gap-10">

          {hasSearched ? (
            /* --- VISTA DE BÚSQUEDA --- */
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                  Resultados encontrados
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-2 py-1">{filteredSearchResults.length}</Badge>
                </h3>
                <Button variant="ghost" size="sm" onClick={clearSearch} className="text-slate-500 hover:text-slate-800">Volver a mis archivos</Button>
              </div>

              <div className="flex flex-col gap-4">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((res: any) => (
                    <Card key={res.id} className="border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-200 group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-blue-500"></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 p-3 rounded-xl">
                              <FileText className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{res.titulo}</h4>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 block">TIPO: {res.tipo || "PDF"} • DOC-ID: {res.id}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(res.id, res.titulo)} className="text-slate-300 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>

                        {/* Panel de Resumen IA */}
                        <div className="mt-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-bold text-slate-700">Contexto extraído por IA</span>
                          </div>
                          <p className="text-sm text-slate-600 italic leading-relaxed">
                            "{res.resumen}"
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                      <SearchX className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Sin resultados con los filtros actuales</h3>
                    <p className="text-slate-500 text-sm max-w-md">
                      Intenta buscar otras palabras o marca más tipos de archivos en la barra lateral izquierda.
                    </p>
                    <Button variant="outline" onClick={clearSearch} className="mt-6 border-slate-300">Limpiar búsqueda</Button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            /* --- VISTA NORMAL: SUBIDA Y LISTA --- */
            <>
              {/* ZONA DE SUBIDA DOBLE */}
              <section>
                <div className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all ${isUploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-300'}`}>

                  {isUploading ? (
                    <div className="flex flex-col items-center animate-in fade-in">
                      <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                      <h3 className="text-xl font-bold text-slate-900 mb-1">Indexando documentos...</h3>
                      <p className="text-slate-500 text-sm">Extrayendo texto y procesando con Inteligencia Artificial.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-5 rounded-2xl shadow-sm mb-5 border border-slate-100">
                        <UploadCloud className="h-10 w-10 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Añadir a la base documental</h3>
                      <p className="text-slate-500 text-sm max-w-md mb-8">
                        Sube archivos individuales o importa carpetas enteras de tu ordenador. El sistema filtrará automáticamente los formatos no soportados.
                      </p>

                      {/* BOTONES MÁGICOS DE SUBIDA */}
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">

                        {/* Botón 1: Archivos Sueltos */}
                        <div className="relative flex-1">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.docx,.txt,.csv,.xlsx"
                            onChange={handleUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Seleccionar archivos"
                          />
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2 h-12 rounded-xl text-base">
                            <FileText className="h-5 w-5" />
                            Archivos
                          </Button>
                        </div>

                        {/* Botón 2: Carpeta Completa (Usando atributos nativos webkit) */}
                        <div className="relative flex-1">
                          <input
                            type="file"
                            // @ts-ignore - Atributos especiales para carpetas
                            webkitdirectory=""
                            directory=""
                            multiple
                            onChange={handleUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Seleccionar una carpeta"
                          />
                          <Button variant="outline" className="w-full border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm gap-2 h-12 rounded-xl text-base font-semibold">
                            <FolderUp className="h-5 w-5" />
                            Carpeta
                          </Button>
                        </div>

                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* LISTA DE ARCHIVOS FILTRADA */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-xl text-slate-800 flex items-center gap-2">
                    Archivos en tu repositorio
                    <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5">{filteredDocuments.length}</Badge>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredDocuments.length === 0 ? (
                    <div className="col-span-full bg-slate-50 p-10 rounded-2xl text-center border-2 border-dashed border-slate-200">
                      <p className="text-slate-500 font-medium">No hay documentos que coincidan con los filtros seleccionados.</p>
                    </div>
                  ) : (
                    filteredDocuments.map((doc: any) => (
                      <Card key={doc.id} className="border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 overflow-hidden pr-3">
                            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate" title={doc.titulo}>{doc.titulo}</p>
                              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">ID: {doc.id} • {doc.tipo}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id, doc.titulo)} className="text-slate-300 hover:text-red-600 hover:bg-red-50 shrink-0">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

        </main>
      </div>
    </div>
  )
}