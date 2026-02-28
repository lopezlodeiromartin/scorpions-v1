import requests
from requests.exceptions import ConnectionError, Timeout
import os

SERVER_URL = "http://localhost:8000/"

class DocumentClient:
    def __init__(self):
        self.base_url = SERVER_URL

    def upload_document(self, file_path: str) -> dict:
        url = f"{self.base_url}upload/"

        if not os.path.exists(file_path):
            print(f"[ERROR] No se encontró el archivo en la ruta: {file_path}")
            return {}

        try:
            with open(file_path, "rb") as f:
                archivos = {"file": f}
                r = requests.post(url, files=archivos)

            if r.status_code == 200:
                return r.json()
            else:
                print(f"[ERROR] La API devolvió un error ({r.status_code}): {r.text}")
                return {}

        except ConnectionError:
            print("[ERROR] No se pudo conectar con el servidor. ¿Está uvicorn encendido?")
            return {}
        except Timeout:
            print("[ERROR] La solicitud al servidor ha tardado demasiado.")
            return {}
        except Exception as e:
            print(f"[ERROR] Excepción inesperada: {e}")
            return {}

    def delete_document(self, doc_id: int) -> bool:
        url = f"{self.base_url}documents/{doc_id}/"

        try:
            r = requests.delete(url)
            if r.status_code == 200:
                return True
            else:
                print(f"[ERROR] La API devolvió un error al eliminar ({r.status_code}): {r.text}")
                return False
        except ConnectionError:
            print("[ERROR] No se pudo conectar con el servidor. ¿Está uvicorn encendido?")
            return False
        except Timeout:
            print("[ERROR] La solicitud al servidor ha tardado demasiado.")
            return False
        except Exception as e:
            print(f"[ERROR] Excepción inesperada: {e}")
            return False

    def list_documents(self) -> list:
        url = f"{self.base_url}documents/"

        try:
            r = requests.get(url)
            if r.status_code == 200:
                return r.json().get("documentos", [])
            else:
                print(f"[ERROR] Error al listar ({r.status_code}): {r.text}")
                return []
        except Exception as e:
            print(f"[ERROR] Fallo de conexión: {e}")
            return []

    def search_documents(self, query: str = "", tipo: str = "") -> list:
        url = f"{self.base_url}search/"
        
        parametros = {"q": query}
        if tipo:
            parametros["tipo"] = tipo

        try:
            r = requests.get(url, params=parametros)
            if r.status_code == 200:
                return r.json().get("resultados", [])
            else:
                print(f"[ERROR] Error al buscar ({r.status_code}): {r.text}")
                return []
        except Exception as e:
            print(f"[ERROR] Fallo de conexión: {e}")
            return []