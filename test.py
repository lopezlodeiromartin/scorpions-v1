from backend import DocumentClient

api = DocumentClient()

todos_los_docs = api.list_documents()
print("Listado completo:", todos_los_docs)

resultados = api.search_documents(query="Solaris")
print("Resultados de búsqueda:", resultados)