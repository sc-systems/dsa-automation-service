from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# GitHub configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')  # Set via environment
GITHUB_USER = os.environ.get('GITHUB_USER', 'sc-systems')  # Update this
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'dsa-journey')        # Update this
GITHUB_API = f'https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}'

HEADERS = {
    'Authorization': f'token {GITHUB_TOKEN}',
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DSA-Automation-Service'
}

def get_file_sha(path):
    """Check if file exists and return its SHA (for updating)"""
    try:
        url = f'{GITHUB_API}/contents/{path}'
        response = requests.get(url, headers=HEADERS)
        
        if response.status_code == 200:
            return response.json().get('sha')
        return None
    except Exception as e:
        print(f"Error checking file: {e}")
        return None

def generate_versioned_filename(base_path, filename):
    """Generate filename with version suffix (_v2, _v3, etc.)"""
    name, ext = os.path.splitext(filename)
    version = 2
    
    while True:
        versioned_name = f"{name}_v{version}{ext}"
        versioned_path = f"{base_path}/{versioned_name}"
        
        if not get_file_sha(versioned_path):
            return versioned_name
        
        version += 1
        if version > 100:  # Safety limit
            raise Exception("Too many versions")

def create_or_update_file(path, content, message, sha=None):
    """Create or update file on GitHub"""
    try:
        url = f'{GITHUB_API}/contents/{path}'
        
        # Encode content to base64
        content_bytes = content.encode('utf-8')
        content_base64 = base64.b64encode(content_bytes).decode('utf-8')
        
        payload = {
            'message': message,
            'content': content_base64
        }
        
        # Include SHA if updating existing file
        if sha:
            payload['sha'] = sha
        
        response = requests.put(url, json=payload, headers=HEADERS)
        
        if response.status_code in [200, 201]:
            return {
                'success': True,
                'data': response.json()
            }
        else:
            return {
                'success': False,
                'error': response.json().get('message', 'GitHub API error')
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    token_valid = GITHUB_TOKEN and GITHUB_TOKEN != 'your-github-token-here'
    
    return jsonify({
        'status': 'ok',
        'service': 'python-automation',
        'github_token_configured': token_valid
    })

@app.route('/create-file', methods=['POST'])
def create_file():
    """Main endpoint to create/update files"""
    try:
        data = request.json
        
        # Extract parameters
        top_folder = data.get('topFolder')
        sub_folder = data.get('subFolder')
        filename = data.get('filename')
        content = data.get('content')
        action = data.get('action', 'check')
        
        # Validate
        if not all([top_folder, sub_folder, filename, content]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Construct path
        file_path = f"{top_folder}/{sub_folder}/{filename}"
        base_path = f"{top_folder}/{sub_folder}"
        
        # Check if file exists
        existing_sha = get_file_sha(file_path)
        
        # ACTION: check - just report if exists
        if action == 'check':
            if existing_sha:
                return jsonify({
                    'exists': True,
                    'path': file_path
                })
            else:
                # File doesn't exist, create it
                commit_msg = f"Add {filename}"
                result = create_or_update_file(file_path, content, commit_msg)
                
                if result['success']:
                    return jsonify({
                        'success': True,
                        'path': file_path,
                        'sha': result['data']['content']['sha']
                    })
                else:
                    return jsonify({'error': result['error']}), 500
        
        # ACTION: reject - do nothing
        elif action == 'reject':
            return jsonify({
                'success': False,
                'message': 'Operation cancelled by user'
            })
        
        # ACTION: overwrite - replace existing file
        elif action == 'overwrite':
            commit_msg = f"Add {filename}"
            result = create_or_update_file(file_path, content, commit_msg, sha=existing_sha)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'path': file_path,
                    'overwritten': True
                })
            else:
                return jsonify({'error': result['error']}), 500
        
        # ACTION: version - create new versioned file
        elif action == 'version':
            try:
                versioned_filename = generate_versioned_filename(base_path, filename)
                versioned_path = f"{base_path}/{versioned_filename}"
                
                commit_msg = f"Add {versioned_filename}"
                result = create_or_update_file(versioned_path, content, commit_msg)
                
                if result['success']:
                    return jsonify({
                        'success': True,
                        'path': versioned_path,
                        'versioned': True,
                        'filename': versioned_filename
                    })
                else:
                    return jsonify({'error': result['error']}), 500
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        else:
            return jsonify({'error': 'Invalid action'}), 400
            
    except Exception as e:
        print(f"Error in create_file: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Validate configuration
    if not GITHUB_TOKEN:
        print("⚠️  WARNING: GitHub token not configured!")
        print("Set GITHUB_TOKEN environment variable or update app.py")
    
    print(f"🐍 Python Automation Service starting on http://localhost:5000")
    print(f"📁 Target repo: {GITHUB_USER}/{GITHUB_REPO}")
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)