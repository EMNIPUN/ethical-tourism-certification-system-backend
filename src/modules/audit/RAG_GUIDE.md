# RAG System Guide

## Overview

This RAG (Retrieval-Augmented Generation) system allows you to:

1. **Upload hotel documents** and store them in a vector database (hotel-specific)
2. **Query hotel data** using an AI chatbot powered by OpenAI

Each hotel has its own isolated vector database stored by hotel ID.

---

## Setup

### 1. Install Dependencies

The required packages should already be installed:

- `vectra` - Local vector database
- `pdf-parse` - PDF document parsing
- `mammoth` - DOCX document parsing
- `multer` - File upload handling

If not installed, run:

```bash
npm install vectra pdf-parse mammoth multer
```

### 2. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key

### 3. Add API Key to Environment

Add to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

---

## API Endpoints

### 1. Upload Hotel Documents

**Endpoint:** `POST /api/v1/audits/hotels/:hotelId/process-documents`

**Authorization:** Admin, Auditor, or Hotel Owner

**Description:** Processes and stores all hotel data and documents in a vector database

**What Gets Processed:**

- ✅ Business information (name, registration, contact, etc.)
- ✅ Employee practices data
- ✅ Sustainability information
- ✅ Legal documents (PDFs, DOCX)
- ✅ Evidence documents (salary slips, handbooks, policies)

**Example Request:**

```bash
curl -X POST http://localhost:5000/api/v1/audits/hotels/698a02d268417518fd9b33ef/process-documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "message": "Hotel documents processed and stored in vector database",
  "data": {
    "hotelId": "698a02d268417518fd9b33ef",
    "hotelName": "Hilton Colombo",
    "processedDocuments": [
      "Business Information",
      "Employee Practices",
      "Sustainability Information",
      "Business Registration Certificate",
      "Salary Slips"
    ],
    "totalChunks": 47,
    "timestamp": "2026-02-26T12:00:00.000Z"
  }
}
```

---

### 2. Query Hotel Data (Chatbot)

**Endpoint:** `POST /api/v1/audits/hotels/:hotelId/chat`

**Authorization:** Admin or Auditor

**Description:** Ask questions about hotel data using AI

**Request Body:**

```json
{
  "query": "How many employees does this hotel have?"
}
```

**Example Request:**

```bash
curl -X POST http://localhost:5000/api/v1/audits/hotels/698a02d268417518fd9b33ef/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How many employees does this hotel have?"}'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "answer": "According to the employee practices data, the hotel has 740 total employees, with 600 permanent staff and 140 temporary staff.",
    "query": "How many employees does this hotel have?",
    "sources": [
      {
        "source": "Employee Practices",
        "relevance": 0.89
      }
    ],
    "timestamp": "2026-02-26T12:05:00.000Z"
  }
}
```

---

## Workflow

### For Hotel Owners:

1. Submit certification application with all documents
2. Upload documents using the upload endpoint
3. Wait for auditor review

### For Auditors:

1. Receive hotel assignment
2. Upload/reprocess hotel documents (if needed)
3. Use the chat endpoint to ask questions:
   - "What is the employee turnover rate?"
   - "Does the hotel have waste segregation?"
   - "What is their renewable energy percentage?"
   - "How many local employees do they have?"
4. Review answers and make certification decisions

---

## Sample Questions

**Employee Practices:**

- "How many employees does this hotel have?"
- "What percentage of employees are local?"
- "Do they comply with minimum wage laws?"
- "What is the overtime policy?"

**Sustainability:**

- "What is the hotel's water usage?"
- "Do they have recycling programs?"
- "What percentage of energy comes from renewable sources?"
- "Do they use plastic reduction policies?"

**Business Information:**

- "What is the hotel's registration number?"
- "Who is the owner?"
- "How many rooms do they have?"

---

## Vector Database

**Location:** `vector_dbs/{hotelId}/`

Each hotel has isolated storage:

```
vector_dbs/
├── 698a02d268417518fd9b33ef/  (Hotel 1)
├── 699f2c1fd4aca5b2d34d46c5/  (Hotel 2)
└── ...
```

**Benefits:**

- ✅ Data isolation (hotel A cannot access hotel B's data)
- ✅ Privacy and security
- ✅ Fast searches (smaller databases)

---

## Technology Stack

- **LLM:** OpenAI GPT-3.5 Turbo
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector DB:** Vectra (local storage)
- **Document Processing:** pdf-parse, mammoth

---

## Troubleshooting

### "OPENAI_API_KEY not found"

**Solution:** Add `OPENAI_API_KEY=your_key` to `.env` file

### "No documents found for this hotel"

**Solution:** Run the upload endpoint first to process documents

### "Hotel not found"

**Solution:** Verify the hotel ID exists in the database

### Slow processing

**Solution:** Normal for hotels with many documents. Processing happens once, queries are fast.

---

## API Access Control

| Endpoint         | Admin | Auditor | Hotel Owner |
| ---------------- | ----- | ------- | ----------- |
| Upload Documents | ✅    | ✅      | ✅          |
| Chat             | ✅    | ✅      | ❌          |

---

## Support

For issues, check:

- Swagger docs: `http://localhost:5000/api/v1/api-docs`
- Server logs for detailed errors
- Ensure OPENAI_API_KEY is valid

---

**Version:** 1.0.0  
**Created:** February 26, 2026
