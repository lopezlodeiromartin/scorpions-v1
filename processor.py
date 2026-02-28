import os
import re
import pandas as pd
import fitz
from docx import Document
import pytesseract
from PIL import Image
from langdetect import detect

import pytesseract

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def limpiar_texto(texto):
    if not texto or len(texto.strip()) < 10:
        return ""
    
    texto = texto.lower()
    texto = re.sub(r'página\s+\d+\s+de\s+\d+', '', texto)
    texto = re.sub(r'page\s+\d+\s+of\s+\d+', '', texto)
    texto = re.sub(r'^\d+$', '', texto, flags=re.MULTILINE) 
    
    texto = re.sub(r'\s+', ' ', texto)
    texto = re.sub(r'[^\w\sáéíóúñ]', '', texto)
    
    return texto.strip()

def detectar_idioma(texto):
    try:
        if len(texto) > 20:
            return detect(texto)
        return "desconocido"
    except:
        return "desconocido"

def extraer_texto_archivo(ruta_archivo):
    extension = ruta_archivo.split('.')[-1].lower()
    texto = ""

    try:
        if extension == 'pdf':
            with fitz.open(ruta_archivo) as doc:
                for page in doc:
                    texto += page.get_text() + " "
                    
        elif extension == 'docx':
            doc = Document(ruta_archivo)
            texto = " ".join([para.text for para in doc.paragraphs])
            
        elif extension in ['jpg', 'jpeg', 'png']:
            imagen = Image.open(ruta_archivo)
            texto = pytesseract.image_to_string(imagen)
            
        elif extension in ['txt', 'csv']:
            if extension == 'csv':
                df = pd.read_csv(ruta_archivo)
                texto = df.to_string()
            else:
                with open(ruta_archivo, 'r', encoding='utf-8', errors='ignore') as f:
                    texto = f.read()
                    
    except Exception as e:
        print(f"[!] Error extrayendo {ruta_archivo}: {e}")
        return ""
    
    return texto

def procesar_dataset(ruta_carpeta):
    documentos_listos = []
    
    if not os.path.exists(ruta_carpeta):
        print(f"La carpeta {ruta_carpeta} no existe.")
        return documentos_listos

    for archivo in os.listdir(ruta_carpeta):
        ruta_completa = os.path.join(ruta_carpeta, archivo)
        if os.path.isfile(ruta_completa):
            contenido_bruto = extraer_texto_archivo(ruta_completa)
            
            contenido_limpio = limpiar_texto(contenido_bruto)
            
            if contenido_limpio:
                idioma_doc = detectar_idioma(contenido_limpio)
                documentos_listos.append({
                    "titulo": archivo,
                    "ruta": ruta_completa,
                    "contenido": contenido_limpio,
                    "tipo": archivo.split('.')[-1],
                    "idioma": idioma_doc
                })
            else:
                print(f"[-] Descartado: {archivo} (No se pudo extraer texto útil)")
    
    return documentos_listos