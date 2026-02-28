"use client";

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, UploadCloud, FileText, Filter, Trash2, Bot, Loader2, X } from "lucide-react"

// La URL de tu nuevo backend de FastAPI
const API_URL = "http://localhost:8000"

export default function SearchAndUploadInterface() {
  const [documents, setDocuments] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Cargar los documentos de SQLite al entrar a la página
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documentos || [])
      }
    } catch (error) {
      console.error("Error cargando documentos:", error)
    }
  }

  const handleSearch = async (e: any) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await fetch(`${API_URL}/search/?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.resultados || [])
      }
    } catch (error) {
      console.error("Error buscando:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        // Recargar la lista de documentos para que aparezca el nuevo
        await fetchDocuments()
      } else {
        alert("Recuerda: El backend actual solo admite PDFs según el main.py")
      }
    } catch (error) {
      console.error("Error subiendo archivo:", error)
    } finally {
      setIsUploading(false)
      // Limpiar el input file
      e.target.value = null;
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 p-6 md:p-10 max-w-[1400px] mx-auto">

      {/* === ZONA SUPERIOR: BARRA DE BÚSQUEDA === */}
      <form onSubmit={handleSearch} className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
        <div className="relative flex-1 max-w-4xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en todos los documentos..."
              className="pl-12 h-12 text-lg bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-medium">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col md:flex-row gap-10">

        {/* === COLUMNA IZQUIERDA: FILTROS (Visuales) === */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="flex items-center gap-2 font-semibold text-lg mb-6 text-slate-800">
            <Filter className="h-5 w-5" />
            <h3>Filtros</h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Tipo de Documento</h4>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors">PDFs</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors">Word (.docx)</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* === COLUMNA CENTRAL: SUBIDA O RESULTADOS === */}
        <main className="flex-1 flex flex-col gap-10">

          {searchResults.length > 0 ? (
            /* --- VISTA DE RESULTADOS DE BÚSQUEDA --- */
            <section>
              <h3 className="font-semibold text-xl text-slate-800 mb-6 flex items-center gap-2">
                Resultados de la búsqueda
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none">{searchResults.length}</Badge>
              </h3>

              <div className="flex flex-col gap-4">
                {searchResults.map((res: any) => (
                  <Card key={res.id} className="border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-indigo-50 p-3 rounded-lg">
                          <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900">{res.titulo}</h4>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">ID: {res.id} • {res.tipo || "PDF"}</span>

                          {/* Panel de Resumen IA (Se rellenará cuando conectes Whoosh a main.py) */}
                          <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-indigo-600" />
                              <span className="text-sm font-semibold text-slate-900">Resumen / Fragmento encontrado</span>
                            </div>
                            <p className="text-sm text-slate-600 italic">
                              "{res.resumen || 'Conecta tu archivo indexer.py en el backend para mostrar aquí los resúmenes automáticos que ya tienes programados.'}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            /* --- VISTA NORMAL: SUBIDA Y LISTA DE ARCHIVOS --- */
            <>
              {/* Región para Subir Archivos */}
              <section>
                <div className="relative border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer text-center group overflow-hidden">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.csv"
                    onChange={handleUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">Procesando documento...</h3>
                      <p className="text-slate-500 text-sm">Extrayendo texto y guardando en base de datos.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-105 transition-transform border border-indigo-100">
                        <UploadCloud className="h-8 w-8 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">Subir nuevos documentos</h3>
                      <p className="text-slate-500 text-sm max-w-sm mb-4">
                        Arrastra y suelta tus archivos aquí, o haz clic para buscarlos en tu ordenador.
                      </p>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 pointer-events-none">
                        Seleccionar archivos
                      </Button>
                    </>
                  )}
                </div>
              </section>

              {/* Archivos Subidos */}
              <section>
                <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  Archivos subidos en la base de datos
                  <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">{documents.length}</Badge>
                </h3>

                <div className="flex flex-col gap-3">
                  {documents.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">La base de datos SQLite está vacía. Sube el primer documento.</p>
                  ) : (
                    documents.map((doc: any) => (
                      <Card key={doc.id} className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${doc.titulo.endsWith('.pdf') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{doc.titulo}</p>
                              <p className="text-xs text-slate-500 mt-0.5 uppercase">ID: {doc.id} • {doc.tipo || 'Desconocido'}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50">
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