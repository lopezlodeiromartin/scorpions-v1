import os
import re
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document

def limpiar_texto(texto):
    """
    Normaliza el texto para mejorar la calidad de la indexación (Paso 2).
    """
    if not texto:
        return ""
    # Convertir a minúsculas
    texto = texto.lower()
    # Eliminar saltos de línea raros y normalizar espacios
    texto = re.sub(r'\s+', ' ', texto)
    # Eliminar caracteres especiales no alfanuméricos
    texto = re.sub(r'[^\w\sáéíóúñ]', '', texto)
    return texto.strip()

def extraer_texto_archivo(ruta_archivo):
    """
    Detecta el formato y extrae el contenido según el tipo (Paso 1).
    """
    extension = ruta_archivo.split('.')[-1].lower()
    texto = ""

    try:
        if extension == 'pdf':
            reader = PdfReader(ruta_archivo)
            for page in reader.pages:
                texto += page.extract_text() + " "
        
        elif extension == 'docx':
            doc = Document(ruta_archivo)
            texto = " ".join([para.text for para in doc.paragraphs])
        
        elif extension in ['txt', 'csv']:
            # Para CSVs, a veces es mejor usar pandas para metadatos
            if extension == 'csv':
                df = pd.read_csv(ruta_archivo)
                texto = df.to_string()
            else:
                with open(ruta_archivo, 'r', encoding='utf-8', errors='ignore') as f:
                    texto = f.read()
    except Exception as e:
        print(f"Error procesando {ruta_archivo}: {e}")
    
    return texto

def procesar_dataset(ruta_carpeta):
    """
    Recorre una carpeta completa para preparar los documentos (Requisito de carga).
    """
    documentos_listos = []
    
    if not os.path.exists(ruta_carpeta):
        print(f"La carpeta {ruta_carpeta} no existe.")
        return documentos_listos

    for archivo in os.listdir(ruta_carpeta):
        ruta_completa = os.path.join(ruta_carpeta, archivo)
        if os.path.isfile(ruta_completa):
            print(f"Procesando: {archivo}...")
            contenido_bruto = extraer_texto_archivo(ruta_completa)
            contenido_limpio = limpiar_texto(contenido_bruto)
            
            if contenido_limpio:
                documentos_listos.append({
                    "titulo": archivo,
                    "ruta": ruta_completa,
                    "contenido": contenido_limpio,
                    "tipo": archivo.split('.')[-1]
                })
    
    return documentos_listos