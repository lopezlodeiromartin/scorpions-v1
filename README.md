# fAInd - Team Scorpions (HackUDC)

## Overview

**Nexus** is an intelligent, fully private, local Document Search Engine developed by Team Scorpions for HackUDC. It acts as the core of a Retrieval-Augmented Generation (RAG) pipeline. The application allows users to securely upload documents in multiple formats, automatically extracts and cleans the text, builds an inverted index for lightning-fast querying, and provides contextual summaries of the search results through a modern, highly interactive web interface.

## Key Features

* **Multi-Format Document Processing:** Seamlessly handles `.pdf`, `.docx`, `.csv`, and `.txt` files using specialized extraction libraries (`PyPDF2`, `python-docx`, `pandas`).
* **Local & Private Search Engine:** Utilizes `Whoosh` and `SQLite` to build a local inverted index, ensuring that sensitive documents never leave the user's machine.
* **Smart Summarization:** Automatically generates contextual snippets and summaries of the documents to help users quickly identify the relevance of the search results.
* **Modern UI/UX:** A highly responsive frontend built with React & Next.js, featuring real-time feedback, error handling, drag-and-drop simulated zones, and empty states.
* **RESTful API Architecture:** Decoupled backend using FastAPI, making the system highly scalable and easy to integrate with other services.

## Tech Stack

* **Backend:** Python, FastAPI, SQLite
* **Search & Indexing:** Whoosh, Custom Inverted Indexing
* **Frontend:** React, Next.js, Tailwind CSS, shadcn/ui, Lucide Icons
* **Data Processing:** PyPDF2, pandas, python-docx
* **Network & HTTP:** Uvicorn, Requests

## Installation

### Prerequisites

* Python 3.10+
* Node.js 18+ (for the frontend)
* Git

### Steps

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/lopezlodeiromartin/scorpions-v1.git](https://github.com/lopezlodeiromartin/scorpions-v1.git)
   cd scorpions-v1
