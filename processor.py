import os
import re
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document
from langdetect import detect 

def limpiar_texto(texto):
    """
    Normaliza el texto para mejorar la calidad de la indexación (Paso 2).
    """
    if not texto:
        return ""
    
    # Convertir a minúsculas
    texto = texto.lower()
    
    # Quitar headers/footers comunes (ej. "página 1 de 5", "page 2")
    # Esto elimina patrones típicos que ensucian el texto
    texto = re.sub(r'página\s+\d+\s+de\s+\d+', '', texto)
    texto = re.sub(r'page\s+\d+\s+of\s+\d+', '', texto)
    texto = re.sub(r'^\d+$', '', texto, flags=re.MULTILINE) # Quita números de página sueltos
    
    # Eliminar saltos de línea raros y normalizar espacios
    texto = re.sub(r'\s+', ' ', texto)
    
    # Eliminar caracteres especiales no alfanuméricos
    texto = re.sub(r'[^\w\sáéíóúñ]', '', texto)
    
    return texto.strip()

def detectar_idioma(texto):
    """
    Detecta el idioma predominante del documento (Paso 2).
    """
    try:
        if len(texto) > 20: # Necesitamos un mínimo de texto para detectar
            return detect(texto)
        return "desconocido"
    except:
        return "desconocido"

def procesar_dataset(ruta_carpeta):
    """
    Recorre una carpeta completa para preparar los documentos.
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
                # Calculamos el idioma del texto limpio
                idioma_doc = detectar_idioma(contenido_limpio)
                
                documentos_listos.append({
                    "titulo": archivo,
                    "ruta": ruta_completa,
                    "contenido": contenido_limpio,
                    "tipo": archivo.split('.')[-1],
                    "idioma": idioma_doc # <--- Añadimos el idioma a los metadatos
                })
    
    return documentos_listos