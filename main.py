from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import shutil
from PyPDF2 import PdfReader
import pandas as pd
import re

from sentence_transformers import SentenceTransformer
import chromadb

#modelo IA

modelo_ia = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

chroma_client = chromadb.PersistentClient(path="./chroma_db")
coleccion_vectores = chroma_client.get_or_create_collection(
    name="documentos", 
    metadata={"hnsw:space": "cosine"}
)
#==

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

    nombre_limpio = os.path.basename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, nombre_limpio)
    
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
        elif tipo == "docx":
            doc = docx.Document(file_path)
            texto_extraido = " ".join([parrafo.text for parrafo in doc.paragraphs])
    except Exception as e:
        print(f"Error leyendo archivo: {e}")

    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO documentos (titulo, tipo, ruta, contenido_original) VALUES (?, ?, ?, ?)",
        (file.filename, tipo, file_path, texto_extraido)
    )
    doc_id = cursor.lastrowid

    # Generar el embedding con la IA (cortamos a 3000 caracteres para no saturar el modelo ligero)
    texto_para_ia = texto_extraido[:3000] if texto_extraido else "documento vacio"
    vector = modelo_ia.encode(texto_para_ia).tolist()

    # Guardar en ChromaDB
    coleccion_vectores.add(
        embeddings=[vector],
        documents=[texto_para_ia],
        metadatas=[{"titulo": file.filename, "tipo": tipo, "id_sqlite": doc_id}],
        ids=[str(doc_id)] # Usamos el ID de SQLite para vincularlos
    )

    conn.commit()
    conn.close()

    return {"mensaje": "Documento subido e indexado con éxito", "id": doc_id}

@app.delete("/documents/{doc_id}/")
async def delete_document(doc_id: int):
    conn = sqlite3.connect("documentos.db")
    cursor = conn.cursor()

    cursor.execute("SELECT ruta FROM documentos WHERE id = ?", (doc_id,))
    resultado = cursor.fetchone()
    if not resultado:
        conn.close()
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    ruta_archivo = resultado[0]
    if os.path.exists(ruta_archivo):
        os.remove(ruta_archivo)

    cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
    cursor.execute("DELETE FROM indice WHERE documento_id = ?", (doc_id,))

    conn.commit()
    conn.close()

    try:
        coleccion_vectores.delete(ids=[str(doc_id)])
    except Exception:
        pass # Ignorar si no estaba en ChromaDB

    return {"mensaje": "Documento eliminado con éxito"}

@app.get("/search/")
async def search_documents(q: str = "", tipo: str = ""):
    if not q.strip():
        return {"total": 0, "resultados": []}

    # 1. Convertir la pregunta del usuario en un vector
    vector_pregunta = modelo_ia.encode(q).tolist()

    # 2. Configurar el filtro por tipo de archivo (si el usuario lo ha marcado)
    where_clause = {"tipo": tipo.lower()} if tipo.strip() else None

    # 3. Buscar en la base de datos vectorial
    resultados_chroma = coleccion_vectores.query(
        query_embeddings=[vector_pregunta],
        n_results=10, # Traer los 10 documentos más relevantes
        where=where_clause
    )

    docs = []
    # ChromaDB devuelve listas dentro de listas, iteramos sobre los resultados
    if resultados_chroma['ids'] and len(resultados_chroma['ids'][0]) > 0:
        for i in range(len(resultados_chroma['ids'][0])):
            doc_id = resultados_chroma['ids'][0][i]
            metadata = resultados_chroma['metadatas'][0][i]
            contenido = resultados_chroma['documents'][0][i]
            distancia = resultados_chroma['distances'][0][i] # Qué tan cerca está (menor es mejor en coseno distance)
            
            porcentaje = max(0, 100 - (distancia * 50))
            # Podrías filtrar por distancia si quisieras evitar resultados muy malos
            if porcentaje > 60.0: 
                docs.append({
                    "id": metadata["id_sqlite"],
                    "titulo": metadata["titulo"],
                    "tipo": metadata["tipo"],
                    "resumen": contenido[:150] + "..." if contenido else "Sin contenido extraíble",
                    "score": int(porcentaje)
                })

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