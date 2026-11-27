import io
import os
import json
import math
import random
import sqlite3
from flask import Flask, render_template, request, jsonify
from pypdf import PdfReader, PdfWriter
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options=types.HttpOptions(api_version="v1beta")
)

DB_PATH = "edusphere.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_name TEXT NOT NULL,
                quiz_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS doc_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_tag TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                embedding_json TEXT NOT NULL
            )
        """)

init_db()

def save_quiz_to_db(doc_name, quiz_data):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "INSERT INTO saved_quizzes (doc_name, quiz_json) VALUES (?, ?)",
            (doc_name, json.dumps(quiz_data))
        )
        return cursor.lastrowid

def get_quiz_from_db(quiz_id):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT doc_name, quiz_json FROM saved_quizzes WHERE id = ?",
            (quiz_id,)
        ).fetchone()
    if not row:
        return None, []
    return row[0], json.loads(row[1])

def get_recent_quizzes(limit=6):
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT id, doc_name, created_at FROM saved_quizzes ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
    return [{"id": r[0], "doc_name": r[1], "created_at": r[2]} for r in rows]

def extract_and_chunk(file_bytes, filename, chunk_size=1200, overlap=150):
    raw_text = ""

    if filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        total_pages = len(reader.pages)
        page_indices = sorted(random.sample(range(total_pages), min(total_pages, 15)))
        for idx in page_indices:
            page_text = reader.pages[idx].extract_text()
            if page_text:
                raw_text += page_text + "\n"
    elif filename.endswith(".txt"):
        raw_text = file_bytes.decode("utf-8", errors="ignore")

    raw_text = raw_text.strip()
    if not raw_text:
        return []

    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(raw_text), step):
        piece = raw_text[i:i + chunk_size].strip()
        if len(piece) > 30:
            chunks.append(piece)

    return chunks[:20]

def sample_scanned_pdf(file_bytes, max_pages=6):
    reader = PdfReader(io.BytesIO(file_bytes))
    total_pages = len(reader.pages)
    if total_pages == 0:
        return None

    page_indices = sorted(random.sample(range(total_pages), min(total_pages, max_pages)))
    writer = PdfWriter()
    for idx in page_indices:
        writer.add_page(reader.pages[idx])

    output_stream = io.BytesIO()
    writer.write(output_stream)
    return output_stream.getvalue()

def cosine_similarity(vec_a, vec_b):
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
def retrieve_context_via_vectors(chunks, doc_tag):
    emb_result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=chunks
    )
    embeddings = [e.values for e in emb_result.embeddings]

    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            "INSERT INTO doc_chunks (doc_tag, chunk_text, embedding_json) VALUES (?, ?, ?)",
            [(doc_tag, chunk, json.dumps(emb)) for chunk, emb in zip(chunks, embeddings)]
        )

    query_emb = client.models.embed_content(
        model="gemini-embedding-001",
        contents="Core concepts, definitions, mechanisms, and key technical facts"
    ).embeddings[0].values

    scored = [
        (cosine_similarity(query_emb, emb), chunk)
        for chunk, emb in zip(chunks, embeddings)
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    top_chunks = [chunk for _, chunk in scored[:min(len(scored), 5)]]
    return "\n\n".join(top_chunks)

def shuffle_quiz_options(questions):
    for q in questions:
        correct_text = q["options"][q["correct_index"]]
        random.shuffle(q["options"])
        q["correct_index"] = q["options"].index(correct_text)
    return questions

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", saved_quizzes=get_recent_quizzes())

@app.route("/generate", methods=["POST"])
def generate():
    file = request.files.get("document") or request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "Please select a valid .pdf or .txt file."}), 400

    filename = file.filename.lower()
    file_bytes = file.read()

    if not file_bytes:
        return jsonify({"error": "The uploaded file is empty."}), 400

    schema_instructions = """
Return valid JSON matching this exact schema:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Clear explanation of why this answer is correct",
    "citation": "Exact supporting quote or page reference from the study notes"
  }
]
"""

    try:
        chunks = extract_and_chunk(file_bytes, filename)

        if chunks:
            doc_tag = f"{file.filename}_{random.randint(10000, 99999)}"
            context_text = retrieve_context_via_vectors(chunks, doc_tag)
            prompt = f"""
Generate 10 distinct, non-repeating multiple-choice questions strictly based on the following study notes.

Study Notes:
{context_text}

{schema_instructions}
"""
            gemini_contents = prompt

        elif filename.endswith(".pdf"):
            sampled_pdf = sample_scanned_pdf(file_bytes, max_pages=6)
            if not sampled_pdf:
                return jsonify({"error": "This PDF contains no readable pages."}), 400

            pdf_part = types.Part.from_bytes(
                data=sampled_pdf,
                mime_type="application/pdf"
            )
            prompt = f"""
Read the scanned pages, text, and diagrams in this PDF and generate 10 distinct, non-repeating multiple-choice questions strictly based on the material shown.

{schema_instructions}
"""
            gemini_contents = [pdf_part, prompt]

        else:
            return jsonify({"error": "Could not extract readable text from this file."}), 400

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=gemini_contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.75
            )
        )

        pool = json.loads(response.text)
        selected = random.sample(pool, min(len(pool), 5))
        selected = shuffle_quiz_options(selected)

        quiz_id = save_quiz_to_db(file.filename, selected)
        return jsonify({
            "quiz_id": quiz_id,
            "doc_name": file.filename,
            "questions": selected
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/quiz/<int:quiz_id>", methods=["GET"])
def load_saved_quiz(quiz_id):
    doc_name, questions = get_quiz_from_db(quiz_id)
    if not questions:
        return jsonify({"error": "Saved quiz not found."}), 404
    questions = shuffle_quiz_options(questions)
    return jsonify({
        "quiz_id": quiz_id,
        "doc_name": doc_name,
        "questions": questions
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)