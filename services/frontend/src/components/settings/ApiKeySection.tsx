import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { getAIProviderStatus, saveAIProvider, deleteAIProvider, type AIProviderStatus } from '../../api/client';

export function ApiKeySection() {
  const [key, setKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<AIProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAIProviderStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  // Migrate localStorage keys to server on first load
  useEffect(() => {
    if (loading || status?.has_key) return;
    const legacyKey = localStorage.getItem('ai_api_key');
    if (legacyKey) {
      const legacyUrl = localStorage.getItem('ai_base_url');
      const legacyModel = localStorage.getItem('ai_model');
      saveAIProvider({
        api_key: legacyKey,
        base_url: legacyUrl || null,
        model: legacyModel || null,
      }).then((s) => {
        setStatus(s);
        localStorage.removeItem('ai_api_key');
        localStorage.removeItem('ai_base_url');
        localStorage.removeItem('ai_model');
      }).catch(() => {/* keep localStorage as fallback */});
    }
  }, [loading, status?.has_key]);

  const handleSave = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey && !status?.has_key) return;
    if (!trimmedKey) {
      setError('API key is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveAIProvider({
        api_key: trimmedKey,
        base_url: baseUrl.trim() || status?.base_url || null,
        model: model.trim() || status?.model || null,
      });
      setStatus(result);
      setKey('');
      setBaseUrl('');
      setModel('');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteAIProvider();
      setStatus({ has_key: false, key_hint: null, base_url: null, model: null });
      setKey('');
      setBaseUrl('');
      setModel('');
      // Clean up any remaining localStorage keys
      localStorage.removeItem('ai_api_key');
      localStorage.removeItem('ai_base_url');
      localStorage.removeItem('ai_model');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to remove');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = key.trim() || baseUrl.trim() || model.trim();

  if (loading) {
    return (
      <div className="py-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-ember" />
          <h3 className="text-sm font-bold text-chalk">AI Coach Provider</h3>
        </div>
        <p className="text-xs text-steel">Loading...</p>
      </div>
    );
  }

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <Key size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">AI Coach Provider</h3>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {status?.has_key ? (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-steel">Key:</span>
                <code className="text-sm text-ember font-mono">{status.key_hint}</code>
              </div>
              {status.base_url && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-steel">URL:</span>
                  <code className="text-xs text-chalk font-mono">{status.base_url}</code>
                </div>
              )}
              {status.model && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-steel">Model:</span>
                  <code className="text-xs text-chalk font-mono">{status.model}</code>
                </div>
              )}
            </div>
            <GlowButton variant="danger" size="sm" onClick={handleRemove} disabled={saving}>
              Remove
            </GlowButton>
          </div>
        </div>
      ) : (
        <p className="text-xs text-steel mb-3">
          Configure your AI provider. Anthropic keys (sk-ant-...) work automatically. For other providers, set a Base URL.
        </p>
      )}

      <div className="space-y-2">
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="API Key"
          className="input w-full"
        />
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={status?.base_url || 'Base URL (optional, e.g. https://api.openai.com/v1)'}
          className="input w-full"
        />
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={status?.model || 'Model (optional, e.g. gpt-4o, claude-haiku-4-5)'}
          className="input w-full"
        />
        <GlowButton onClick={handleSave} disabled={!hasChanges || saving} className="w-full">
          {saving ? 'Saving...' : status?.has_key ? 'Update' : 'Save'}
        </GlowButton>
      </div>
    </div>
  );
}
