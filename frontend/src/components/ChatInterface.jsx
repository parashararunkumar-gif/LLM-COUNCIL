import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { api } from '../api';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
}) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    for (const file of files) {
      try {
        const result = await api.uploadFile(file);
        setAttachedFiles((prev) => [...prev, { name: result.filename, text: result.text }]);
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExport = async () => {
    if (!conversation?.id || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await api.exportConversationDocx(conversation.id, conversation.title);
    } catch (err) {
      setExportError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isUploading) {
      const fileContext =
        attachedFiles.length > 0
          ? attachedFiles.map((f) => `--- ${f.name} ---\n${f.text}`).join('\n\n')
          : null;
      onSendMessage(input, fileContext);
      setInput('');
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to LLM Council</h2>
          <p>Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {conversation.messages.length > 0 && (
        <div className="chat-header">
          <span className="chat-header-title">{conversation.title || 'Conversation'}</span>
          <div className="export-controls">
            {exportError && (
              <span className="export-error">{exportError}</span>
            )}
            <button
              className="export-button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              title="Save conversation as DOCX"
            >
              {isExporting ? 'Saving...' : '&#128427; Save as DOCX'}
            </button>
          </div>
        </div>
      )}
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Ask a question to consult the LLM Council</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM Council</div>

                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 1: Collecting individual responses...</span>
                    </div>
                  )}
                  {msg.stage1 && <Stage1 responses={msg.stage1} />}

                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 2: Peer rankings...</span>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 3: Final synthesis...</span>
                    </div>
                  )}
                  {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversation.messages.length === 0 && (
        <form className="input-form" onSubmit={handleSubmit}>
          {attachedFiles.length > 0 && (
            <div className="file-chips">
              {attachedFiles.map((file, i) => (
                <div key={i} className="file-chip">
                  <span className="file-chip-name">{file.name}</span>
                  <button
                    type="button"
                    className="file-chip-remove"
                    onClick={() => removeFile(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {isUploading && (
            <div className="file-uploading">Uploading file...</div>
          )}
          <div className="input-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.html,.htm"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              title="Attach PDF, DOCX, or HTML file"
            >
              &#128206;
            </button>
            <textarea
              className="message-input"
              placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading || isUploading}
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
