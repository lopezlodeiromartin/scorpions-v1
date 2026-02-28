# fAInd - Grupo Scorpions (HackUDC 2026)

## 🚀 Descripción General
**fAInd** es un motor de búsqueda documental inteligente y totalmente privado, desarrollado por el **Grupo Scorpions** para la **HackUDC 2026**. 

A diferencia de los buscadores tradicionales, fAInd utiliza una arquitectura de **Generación Aumentada por Recuperación (RAG)** para indexar documentos localmente. Esto permite encontrar información no solo por palabras clave, sino por significado semántico, mostrando un porcentaje de similitud y un resumen contextual de cada hallazgo, todo sin que tus datos salgan de tu máquina.

## ✨ Características Principales
* **Privacidad Total:** Procesamiento local mediante SQLite y Whoosh. Tus documentos no se suben a la nube.
* **Búsqueda Semántica con Puntuación:** Calcula el porcentaje de relevancia (Score) de cada documento respecto a tu consulta.
* **Soporte Multiformato:** Procesa archivos `.pdf`, `.docx`, `.csv`, `.xlsx` y `.txt`.
* **Interfaz Moderna:** Panel de control desarrollado en React/Next.js con feedback en tiempo real y visualización de coincidencias.
* **Resúmenes Automáticos:** fAInd extrae el contexto más relevante para que no tengas que abrir el archivo.

---

## 💻 Guía de Instalación y Despliegue Local

Para que **fAInd** funcione, necesitas tener corriendo tanto el motor de búsqueda (Backend) como la interfaz visual (Frontend) en dos terminales distintas.

### 1. Clonar el repositorio y preparar el entorno
```bash
git clone [https://github.com/lopezlodeiromartin/scorpions-v1.git](https://github.com/lopezlodeiromartin/scorpions-v1.git)
cd scorpions-v1
```
### 2. Levantar el Motor de Búsqueda (Backend - Terminal 1)
Abre tu primera terminal en la raíz del proyecto y ejecuta los siguientes comandos para iniciar la API y el motor de indexación:
```bash
# Crear entorno virtual
python -m venv venv

# Activar el entorno
# En Windows:
.\venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Lanzar el servidor API
uvicorn main:app --reload
```
El backend estará escuchando en: http://localhost:8000
### 3. Levantar la Interfaz (Frontend - Terminal 2)
Abre una segunda terminal (manteniendo la primera abierta), entra en la carpeta del frontend y arranca la web:
```bash
cd frontend

# Instalar los módulos de Node
npm install

# Iniciar el servidor de desarrollo
npm run dev
```
La interfaz estará disponible en: http://localhost:3000

### Tutorial: Cómo usar fAInd paso a paso
Una vez que tengas ambos servidores corriendo, entra en http://localhost:3000 desde tu navegador y sigue estos pasos:

Paso 1: Alimenta la Base Documental
En la pantalla principal, localiza la zona central "Añadir a fAInd".

Haz clic en "Archivos" para subir documentos sueltos, o en "Carpeta" para importar un directorio completo.

¿Qué ocurre por detrás? El backend extrae el texto de tus archivos y crea un índice invertido de forma local y segura.

Paso 2: Filtra tu Repositorio (Opcional)
En la barra lateral izquierda ("Filtros Activos"), selecciona los formatos que te interesan (PDF, DOCX, CSV...).

El "Repositorio Local" se actualizará al instante mostrando solo los archivos que coincidan.

Paso 3: Realiza tu Búsqueda Inteligente
Ve a la barra de búsqueda superior: "Pregúntale a fAInd sobre tus documentos...".

Escribe una frase, concepto o pregunta (ej. "cláusulas de rescisión del contrato").

Pulsa Buscar.

Paso 4: Analiza los Resultados
fAInd te mostrará tarjetas ordenadas por relevancia con:

Título y Formato del archivo.

Score de Similitud (IA): Una etiqueta que indica el porcentaje de coincidencia semántica (ej. 85% Similitud). Los valores más altos aparecerán en verde.

Contexto Extraído: Un fragmento generado automáticamente con la parte exacta del documento donde fAInd encontró la información.
