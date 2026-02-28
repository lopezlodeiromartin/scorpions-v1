import os
import re
from whoosh.index import create_in, open_dir
from whoosh.fields import Schema, TEXT, ID, STORED
from whoosh.qparser import MultifieldParser

# --- CONFIGURACIÓN DEL ÍNDICE ---
schema = Schema(
    id=ID(stored=True, unique=True),
    titulo=STORED,
    contenido=TEXT(stored=True),
    resumen=STORED,  # Guardamos el resumen para que Saúl lo muestre
    tipo=STORED
)

INDEX_DIR = "indexdir"

def generar_resumen(texto, num_frases=2):
    """Crea un resumen rápido tomando las primeras frases significativas."""
    # Limpiamos un poco el texto para el resumen
    texto = re.sub(r'\s+', ' ', texto)
    frases = re.split(r'\. |\n', texto)
    # Filtramos frases muy cortas o vacías
    frases_validas = [f.strip() for f in frases if len(f.strip()) > 20]
    resumen = ". ".join(frases_validas[:num_frases])
    return resumen + "..." if resumen else "Sin resumen disponible."

def inicializar_indice():
    if not os.path.exists(INDEX_DIR):
        os.mkdir(INDEX_DIR)
        return create_in(INDEX_DIR, schema)
    return open_dir(INDEX_DIR)

# --- TU TRABAJO DE INDEXACIÓN ---
def indexar_documento(doc_id, titulo, contenido, tipo):
    """Procesa el documento, genera un resumen y lo guarda en el índice."""
    ix = inicializar_indice()
    resumen_auto = generar_resumen(contenido) # <--- PUNTO EXTRA
    
    writer = ix.writer()
    writer.update_document(
        id=str(doc_id),
        titulo=titulo,
        contenido=contenido,
        resumen=resumen_auto,
        tipo=tipo
    )
    writer.commit()

def buscar_en_indice(query_str):
    """Busca y devuelve resultados con su resumen y relevancia."""
    ix = inicializar_indice()
    resultados_finales = []
    
    with ix.searcher() as searcher:
        parser = MultifieldParser(["titulo", "contenido"], ix.schema)
        query = parser.parse(query_str)
        results = searcher.search(query, limit=10)
        
        for hit in results:
            resultados_finales.append({
                "id": hit["id"],
                "titulo": hit["titulo"],
                "resumen": hit["resumen"], # Saúl lo amará para la UI
                "tipo": hit["tipo"],
                "score": round(hit.score, 2)
            })
            
    return resultados_finales