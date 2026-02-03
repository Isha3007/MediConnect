

# MediConnect

AI-Powered Medical Document Intelligence and Contextual Healthcare Assistant

---

## Overview

MediConnect is an intelligent medical assistant that allows patients to upload medical documents such as prescriptions, lab reports, and medical records, and helps doctors ask contextual questions based on the uploaded content.

The system extracts text using OCR, generates embeddings, and leverages Large Language Models (LLMs) to produce document-grounded responses.

---

## Features

- Secure Patient and Doctor Authentication
- Medical Document Upload
- OCR-Based Text Extraction
- Semantic Search with Vector Embeddings
- Context-Aware LLM Question Answering
- Role-Based Access Control
- REST API

---

## Tech Stack

### Backend
- Python
- FlaskRestx
- Uvicorn

### Database
- Pinecone

---

## System Workflow

1. User registers and verifies OTP  
2. User uploads medical document  
3. OCR extracts text from document  
4. Text is chunked and embedded  
5. Embeddings stored in vector database  
6. User submits question  
7. Relevant chunks retrieved using semantic search  
8. LLM generates contextual response  

---


### Clone the Repository

```bash
git clone https://github.com/Isha3007/mediconnect.git
cd mediconnect
```


### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file in the root directory:

```
GROQ_API_KEY=your_api_key
PINECONE_API=
```


---

## Running the Application
FRONTEND
```bash
npm i
npm run dev
```
```bash
flask run
```

Application will run at:

```
http://127.0.0.1:8000
```



---

<img width="1031" height="523" alt="image" src="https://github.com/user-attachments/assets/df2d7bd0-056e-4e0e-9e8d-2e9804140ff0" />

<img width="1018" height="520" alt="image" src="https://github.com/user-attachments/assets/0a122e45-31fc-462f-839a-23211eb10888" />
