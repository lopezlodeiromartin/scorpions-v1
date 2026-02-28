from fastapi import FastAPI, File, UploadFile, HTTPException
import sqlite3
import os
import shutil
from PyPDF2 import PdfReader

app = FastAPI(title="Hackathon Doc API")
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
            contenido TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se admiten PDFs por ahora")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    texto_extraido = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            texto_extraido += page.extract_text() + " "
    except Exception as e:
        print(f"Error leyendo PDF: {e}")

    tipo = file.filename.split('.')[-1]
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO documentos (titulo, tipo, ruta, contenido) VALUES (?, ?, ?, ?)",
        (file.filename, tipo, file_path, texto_extraido)
    )
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"mensaje": "Documento subido con éxito", "id": doc_id, "titulo": file.filename}

@app.get("/search/")
async def search_documents(q: str = ""):
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    
    query = "SELECT id, titulo, tipo, ruta FROM documentos WHERE 1=1"
    parametros = []
    
    if q.strip():
        palabras = q.split()
        for palabra in palabras:
            query += " AND (titulo LIKE ? OR contenido LIKE ?)"
            parametros.extend([f"%{palabra}%", f"%{palabra}%"])
            
    cursor.execute(query, parametros)
    resultados = cursor.fetchall()
    conn.close()

    docs = [{"id": r[0], "titulo": r[1], "tipo": r[2], "ruta": r[3]} for r in resultados]
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
