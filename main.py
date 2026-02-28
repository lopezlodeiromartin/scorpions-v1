from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import shutil
from PyPDF2 import PdfReader
import pandas as pd
import hashlib

from sentence_transformers import SentenceTransformer
import chromadb

modelo_ia = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

chroma_client = chromadb.PersistentClient(path="./chroma_db")
coleccion_vectores = chroma_client.get_or_create_collection(
    name="documentos",
    metadata={"hnsw:space": "cosine"}
)

app = FastAPI(title="fAInd API - Hackathon")

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
            contenido_original TEXT,
            peso INTEGER,
            hash_md5 TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...)):
    nombre_archivo = file.filename.replace('\\', '/').split('/')[-1]

    if not nombre_archivo.lower().endswith((".pdf", ".csv", ".xlsx", ".txt")):
        raise HTTPException(status_code=400, detail="Formato no soportado")

    file_content = await file.read()
    peso_bytes = len(file_content)
    hash_md5 = hashlib.md5(file_content).hexdigest()

    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM documentos WHERE hash_md5 = ?", (hash_md5,))
    duplicado = cursor.fetchone()

    if duplicado:
        conn.close()
        return {"mensaje": "Documento duplicado omitido", "id": duplicado[0], "duplicado": True}

    file_path = os.path.join(UPLOAD_DIR, nombre_archivo)
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)

    texto_extraido = ""
    tipo = nombre_archivo.split('.')[-1].lower()

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
        print(f"Error extrayendo texto: {e}")

    cursor.execute(
        "INSERT INTO documentos (titulo, tipo, ruta, contenido_original, peso, hash_md5) VALUES (?, ?, ?, ?, ?, ?)",
        (nombre_archivo, tipo, file_path, texto_extraido, peso_bytes, hash_md5)
    )
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()

    if texto_extraido.strip():
        chunk = texto_extraido[:8000]
        coleccion_vectores.add(
            documents=[chunk],
            metadatas=[{"id_sqlite": doc_id, "titulo": nombre_archivo, "tipo": tipo}],
            ids=[str(doc_id)]
        )

    return {"mensaje": "Subido con éxito", "id": doc_id, "duplicado": False}

@app.delete("/documents/{doc_id}/")
async def delete_document(doc_id: int):
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute("SELECT ruta FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()

    if not resultado:
        conn.close()
        raise HTTPException(status_code=404, detail="No encontrado")

    ruta_archivo = resultado[0]
    if os.path.exists(ruta_archivo):
        os.remove(ruta_archivo)

    cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()

    try:
        coleccion_vectores.delete(ids=[str(doc_id)])
    except:
        pass

    return {"mensaje": "Eliminado"}

@app.get("/search/")
async def search_documents(q: str = "", tipo: str = ""):
    if not q.strip(): return {"total": 0, "resultados": []}
    filtro = {"tipo": tipo.lower()} if tipo.strip() else None

    try:
        ia_results = coleccion_vectores.query(query_texts=[q], n_results=10, where=filtro)
        if not ia_results["ids"] or not ia_results["ids"][0]: return {"total": 0, "resultados": []}

        docs = []
        for i in range(len(ia_results['ids'][0])):
            metadata = ia_results['metadatas'][0][i]
            contenido = ia_results['documents'][0][i]
            distancia = ia_results['distances'][0][i]

            porcentaje = max(0, 100 - (distancia * 50))
            if porcentaje > 60.0:
                docs.append({
                    "id": metadata["id_sqlite"],
                    "titulo": metadata["titulo"],
                    "tipo": metadata["tipo"],
                    "resumen": contenido[:150] + "..." if contenido else "Sin contenido",
                    "score": int(porcentaje)
                })

        docs.sort(key=lambda x: x["score"], reverse=True)
        return {"total": len(docs), "resultados": docs}
    except Exception as e:
        return {"total": 0, "resultados": []}

@app.get("/documents/")
async def list_documents():
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, titulo, tipo, ruta, peso, contenido_original FROM documentos ORDER BY id DESC")
    resultados = cursor.fetchall()
    conn.close()

    docs = []
    for r in resultados:
        contenido = r[5]
        docs.append({
            "id": r[0], "titulo": r[1], "tipo": r[2], "ruta": r[3],
            "peso": r[4] or 0,
            "resumen": (contenido[:350] + "...") if contenido else "El documento no contiene texto indexable."
        })
    return {"total": len(docs), "documentos": docs}