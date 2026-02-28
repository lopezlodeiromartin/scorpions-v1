from backend import DocumentClient

api = DocumentClient()

ruta_a_probar = r"C:\Users\lopez\OneDrive\Escritorio\personal\prueba"

print(f"--- 1. Subiendo desde: {ruta_a_probar} ---")
resultados_subida = api.upload(ruta_a_probar)
print(f"Se han subido {len(resultados_subida)} documentos correctamente.\n")

print("--- 2. Listado completo de documentos ---")
todos_los_docs = api.list_documents()

palabra_buscar = "solaris"
tipo_buscar = "pdf"

print(f"--- 3. Buscando '{palabra_buscar}' filtrando por tipo '{tipo_buscar}' ---")
resultados_busqueda = api.search_documents(query=palabra_buscar, tipo=tipo_buscar)

print(f"Encontrados: {len(resultados_busqueda)}")
for res in resultados_busqueda:
    print(f" - [ID: {res['id']}] {res['titulo']}")
    print(f"   Resumen: {res['resumen']}")
print("\n")

print("--- 4. Limpiando los documentos recién subidos ---")
if not resultados_subida:
    print("No se subió ningún documento nuevo, no hay nada que borrar.")
else:
    for doc in resultados_subida:
        doc_id = doc.get("id")
        if doc_id:
            exito = api.delete_document(doc_id=doc_id)
            print(f"Eliminando documento ID {doc_id}... ¿Éxito?: {exito}")