import sqlite3
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

DATABASE = "data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dateProcessed TEXT NOT NULL,
            data TEXT NOT NULL,
            file TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/loadDocuments', methods=['GET'])
def load_documents():
    initialize_database()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM documents')
        rows = cursor.fetchall()
        conn.close()

        documents = [
            {
                "id": row["id"],
                "name": row["name"],
                "dateProcessed": row["dateProcessed"],
                "data": json.loads(row["data"]),
                "file": row["file"],
            }
            for row in rows
        ]

        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": "An error loading the documents occurred", "message": str(e)}), 500

@app.route('/deleteDocuments', methods=['DELETE'])
def delete_documents():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM documents')
        conn.commit()
        conn.close()
        return jsonify({"success": "Documents deleted"}), 200
    except Exception as e:
        return jsonify({"error": "An error with deleting documents occurred", "message": str(e)}), 500

@app.route('/extract', methods=['POST'])
def extract_file():
    try:
        data = request.json
        file_base64 = data.get('file')
        file_name = secure_filename(data.get('file_name', 'uploaded_file'))
        document_type_name = data.get('document_type_name')
        apiKey = data.get('apiKey')

        payload = {
            'file': file_base64,
            'file_name': file_name,
            'document_type_name': document_type_name
        }

        headers = {
            'Authorization': f"{apiKey}",
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        response = requests.post("https://developers.typless.com/api/extract-data", headers=headers, json=payload)

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to extract file", "message": response.text}), response.status_code

    except Exception as e:
        return jsonify({"error": "An error extracting the data occurred", "message": str(e)}), 500

@app.route('/saveDocument', methods=['POST'])
def save_document():
    try:
        request_data = request.json
        name = secure_filename(request_data.get('name'))
        file = request_data.get('file')
        data = json.dumps(request_data.get('data'))
        date_processed = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO documents (name, dateProcessed, data, file)
            VALUES (?, ?, ?, ?)
        ''', (name, date_processed, data, file))
        conn.commit()
        conn.close()

        return jsonify({"message": "Document saved successfully"}), 201

    except Exception as e:
        return jsonify({"error": "An error saving the document occurred", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001)
