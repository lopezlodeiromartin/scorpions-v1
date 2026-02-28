from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # ¡Faltaba importar esto!
import sqlite3
import os
import shutil
from PyPDF2 import PdfReader
import re

# 1. ¡PRIMERO SE CREA LA APP!
app = FastAPI(title="Hackathon Doc API")

# 2. ¡LUEGO SE LE AÑADE EL CORS!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite que el frontend en localhost:3000 se conecte
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
    texto_limpio = re.sub(r'[^\w\s]', '', texto.lower())
    palabras = texto_limpio.split()
    palabras_utiles = set([p for p in palabras if len(p) > 3])
    return palabras_utiles

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    # FIX: Se usa una TUPLA (), no una lista []
    if not file.filename.endswith((".pdf", ".csv", ".xlsx")):
        raise HTTPException(status_code=400, detail="Solo se admiten PDFs, CSVs y XLSXs")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    texto_extraido = ""
    tipo = file.filename.split('.')[-1].lower()

    # FIX: Solo intentamos leer como PDF si realmente es un PDF
    try:
        if tipo == "pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                texto_extraido += page.extract_text() + " "
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

    # FIX: Me traigo el contenido original para usarlo como resumen
    query = "SELECT id, titulo, tipo, ruta, contenido_original FROM documentos WHERE 1=1"
    parametros = []

    if q.strip():
        palabras = q.split()
        for palabra in palabras:
            # FIX: La columna se llama contenido_original, no contenido
            query += " AND (titulo LIKE ? OR contenido_original LIKE ?)"
            parametros.extend([f"%{palabra}%", f"%{palabra}%"])

    cursor.execute(query, parametros)
    resultados = cursor.fetchall()
    conn.close()

    # FIX: Añado el "resumen" al JSON para que nuestro Frontend React no dé errores y pinte algo bonito
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