from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import shutil

from processor import extraer_texto_archivo, limpiar_texto
from indexer import indexar_documento, buscar_en_indice

app = FastAPI(title="Hackathon Doc API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT,
            tipo TEXT,
            ruta TEXT,
            contenido_original TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".pdf", ".csv", ".xlsx", ".txt", ".docx", ".jpg", ".png")):
        raise HTTPException(status_code=400, detail="Formato no admitido")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tipo = file.filename.split('.')[-1].lower()

    texto_bruto = extraer_texto_archivo(file_path)
    texto_extraido = limpiar_texto(texto_bruto)

    if not texto_extraido:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del documento")

    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO documentos (titulo, tipo, ruta, contenido_original) VALUES (?, ?, ?, ?)",
        (file.filename, tipo, file_path, texto_extraido)
    )
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()

    indexar_documento(doc_id, file.filename, texto_extraido, tipo)

    return {"mensaje": "Documento subido e indexado con éxito", "id": doc_id}

@app.get("/search/")
async def search_documents(q: str = ""):
    if not q.strip():
        return {"total": 0, "resultados": []}

    resultados_whoosh = buscar_en_indice(q)

    docs = [
        {
            "id": r["id"],
            "titulo": r["titulo"],
            "tipo": r["tipo"],
            "resumen": r["resumen"]
        }
        for r in resultados_whoosh
    ]
    return {"total": len(docs), "resultados": docs}

@app.get("/documents/")
async def list_documents():
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, titulo, tipo, ruta FROM documentos ORDER BY id DESC")
    resultados = cursor.fetchall()
    conn.close()

    docs = [{"id": r[0], "titulo": r[1], "tipo": r[2], "ruta": r[3]} for r in resultados]
    return {"total": len(docs), "documentos": docs}