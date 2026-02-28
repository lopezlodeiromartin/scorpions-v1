from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import shutil
from PyPDF2 import PdfReader
import pandas as pd
import re

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

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS indice (
            palabra TEXT,
            documento_id INTEGER,
            FOREIGN KEY(documento_id) REFERENCES documentos(id)
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_palabra ON indice(palabra)')

    conn.commit()
    conn.close()

init_db()

def limpiar_y_extraer_palabras(texto):
    texto_limpio = re.sub(r'[^\w\s]', '', str(texto).lower())
    palabras = texto_limpio.split()
    palabras_utiles = set([p for p in palabras if len(p) > 3])
    return palabras_utiles

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".pdf", ".csv", ".xlsx", ".txt")):
        raise HTTPException(status_code=400, detail="Solo se admiten PDFs, CSVs, TXTs y XLSXs")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    texto_extraido = ""
    tipo = file.filename.split('.')[-1].lower()

    try:
        if tipo == "pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                texto_extraido += (page.extract_text() or "") + " "
        elif tipo == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                texto_extraido = f.read()
        elif tipo == "csv":
            df = pd.read_csv(file_path)
            texto_extraido = df.to_string(index=False)
        elif tipo == "xlsx":
            df = pd.read_excel(file_path)
            texto_extraido = df.to_string(index=False)
    except Exception as e:
        print(f"Error leyendo archivo: {e}")

    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO documentos (titulo, tipo, ruta, contenido_original) VALUES (?, ?, ?, ?)",
        (file.filename, tipo, file_path, texto_extraido)
    )
    doc_id = cursor.lastrowid

    palabras_a_indexar = limpiar_y_extraer_palabras(texto_extraido)
    for palabra in palabras_a_indexar:
        cursor.execute(
            "INSERT INTO indice (palabra, documento_id) VALUES (?, ?)",
            (palabra, doc_id)
        )

    conn.commit()
    conn.close()

    return {"mensaje": "Documento subido e indexado con éxito", "id": doc_id}

@app.get("/search/")
async def search_documents(q: str = ""):
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()

    if not q.strip():
        conn.close()
        return {"total": 0, "resultados": []}

    palabras_busqueda = re.sub(r'[^\w\s]', '', q.lower()).split()
    palabras_busqueda = [p for p in palabras_busqueda if len(p) > 3]
    
    sets_de_documentos = []
    for palabra in palabras_busqueda:
        cursor.execute("SELECT documento_id FROM indice WHERE palabra LIKE ?", (f"{palabra}%",))
        doc_ids = set([fila[0] for fila in cursor.fetchall()])
        sets_de_documentos.append(doc_ids)
        
    if not sets_de_documentos or not all(sets_de_documentos):
        conn.close()
        return {"total": 0, "resultados": []}
        
    ids_comunes = set.intersection(*sets_de_documentos)
    if not ids_comunes:
        conn.close()
        return {"total": 0, "resultados": []}

    placeholders = ",".join("?" * len(ids_comunes))
    query = f"SELECT id, titulo, tipo, ruta, contenido_original FROM documentos WHERE id IN ({placeholders})"
    cursor.execute(query, list(ids_comunes))
    resultados = cursor.fetchall()

    conn.close()

    docs = [
        {
            "id": r[0],
            "titulo": r[1],
            "tipo": r[2],
            "ruta": r[3],
            "resumen": r[4][:150] + "..." if r[4] else "Sin contenido extraíble"
        }
        for r in resultados
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