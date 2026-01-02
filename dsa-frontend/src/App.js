import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader, X } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function DSAAutomation() {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [topFolder, setTopFolder] = useState('');
  const [subFolder, setSubFolder] = useState('');
  const [folders, setFolders] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingFolders, setFetchingFolders] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setFetchingFolders(true);
    try {
      const res = await fetch(`${API_BASE}/folders`);
      const data = await res.json();
      
      if (data.error) {
        setStatus({ type: 'error', message: data.error });
      } else {
        setFolders(data);
        const firstTop = Object.keys(data)[0];
        if (firstTop) {
          setTopFolder(firstTop);
          if (data[firstTop]?.length > 0) {
            setSubFolder(data[firstTop][0]);
          }
        }
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to fetch folders. Check backend connection.' });
    } finally {
      setFetchingFolders(false);
    }
  };

  const handleTopFolderChange = (value) => {
    setTopFolder(value);
    if (folders[value]?.length > 0) {
      setSubFolder(folders[value][0]);
    } else {
      setSubFolder('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !code.trim() || !topFolder || !subFolder) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        topFolder,
        subFolder,
        filename: title,
        content: code,
        action: 'check'
      };

      const res = await fetch(`${API_BASE}/create-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.exists) {
        setModalData(payload);
        setShowModal(true);
      } else if (data.success) {
        setStatus({ type: 'success', message: `File created: ${data.path}` });
        setTitle('');
        setCode('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to create file' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Check if backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalAction = async (action) => {
    setShowModal(false);
    setLoading(true);

    try {
      const payload = { ...modalData, action };
      const res = await fetch(`${API_BASE}/create-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', message: `File ${action === 'overwrite' ? 'overwritten' : 'created'}: ${data.path}` });
        setTitle('');
        setCode('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Operation failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            DSA Journey
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Message */}
        {status.message && (
          <div 
            className="mb-6 rounded-xl overflow-hidden shadow-sm"
            style={{
              backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${status.type === 'success' ? '#86efac' : '#fca5a5'}`
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.type === 'success' ? (
                  <CheckCircle className="text-green-600 flex-shrink-0" size={20} strokeWidth={2} />
                ) : (
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} strokeWidth={2} />
                )}
                <span className={`text-sm font-medium ${status.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {status.message}
                </span>
              </div>
              <button 
                onClick={() => setStatus({ type: '', message: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Code Input */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Filename
                </label>
              </div>
              <div className="p-5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="LC_206_Reverse_Linked_List.cpp"
                  className="w-full px-0 py-2 bg-transparent text-gray-900 text-base placeholder-gray-400 border-none focus:outline-none focus:ring-0"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace' }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Code
                </label>
              </div>
              <div className="p-5">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// TC: O(n)&#10;// SC: O(1)&#10;&#10;class Solution {&#10;  // your code here&#10;}"
                  rows={22}
                  className="w-full px-0 py-0 bg-transparent text-gray-900 text-sm leading-6 placeholder-gray-400 border-none focus:outline-none focus:ring-0 resize-none"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Destination */}
          <div className="space-y-5">
            {fetchingFolders ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
                <Loader className="animate-spin text-gray-400" size={32} strokeWidth={2} />
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Top Folder
                    </label>
                  </div>
                  <div className="p-5">
                    <select
                      value={topFolder}
                      onChange={(e) => handleTopFolderChange(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent text-gray-900 text-base border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                        paddingRight: '24px'
                      }}
                    >
                      {Object.keys(folders).map(folder => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sub Folder
                    </label>
                  </div>
                  <div className="p-5">
                    <select
                      value={subFolder}
                      onChange={(e) => setSubFolder(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent text-gray-900 text-base border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer disabled:opacity-50"
                      disabled={!topFolder || !folders[topFolder]?.length}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                        paddingRight: '24px'
                      }}
                    >
                      {folders[topFolder]?.map(folder => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {topFolder && subFolder && title && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Target Path
                      </label>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-900 break-all" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace' }}>
                        {topFolder}/{subFolder}/{title}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !title || !code || !topFolder || !subFolder}
                  className="w-full px-6 py-4 bg-black text-white text-base font-medium rounded-xl shadow-sm hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={18} strokeWidth={2} />
                      <span>Processing</span>
                    </>
                  ) : (
                    <span>Submit to GitHub</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" style={{ animation: 'modalFadeIn 0.2s ease-out' }}>
            <div className="px-6 py-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900" style={{ letterSpacing: '-0.01em' }}>
                File Already Exists
              </h3>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                The file <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-gray-900 font-medium" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace' }}>{modalData?.filename}</span> already exists in this location. Choose an action:
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleModalAction('overwrite')}
                  className="w-full px-5 py-3.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition-all"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Overwrite Existing File
                </button>
                <button
                  onClick={() => handleModalAction('version')}
                  className="w-full px-5 py-3.5 bg-gray-100 text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Create New Version
                </button>
                <button
                  onClick={() => { setShowModal(false); handleModalAction('reject'); }}
                  className="w-full px-5 py-3.5 bg-white text-gray-600 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        input::placeholder,
        textarea::placeholder {
          color: #9ca3af;
        }
        
        select option {
          padding: 12px;
        }
        
        /* Remove default select arrow in IE */
        select::-ms-expand {
          display: none;
        }
      `}</style>
    </div>
  );
}