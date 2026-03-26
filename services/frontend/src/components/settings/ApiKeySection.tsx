import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';

const STORAGE_KEY = 'ai_api_key';
const BASE_URL_KEY = 'ai_base_url';
const MODEL_KEY = 'ai_model';

function maskKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export function ApiKeySection() {
  const [key, setKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savedBaseUrl, setSavedBaseUrl] = useState<string | null>(null);
  const [savedModel, setSavedModel] = useState<string | null>(null);

  useEffect(() => {
    setSavedKey(localStorage.getItem(STORAGE_KEY));
    setSavedBaseUrl(localStorage.getItem(BASE_URL_KEY));
    setSavedModel(localStorage.getItem(MODEL_KEY));
  }, []);

  const handleSave = () => {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      localStorage.setItem(STORAGE_KEY, trimmedKey);
      setSavedKey(trimmedKey);
      setKey('');
    }
    const trimmedUrl = baseUrl.trim();
    if (trimmedUrl) {
      localStorage.setItem(BASE_URL_KEY, trimmedUrl);
      setSavedBaseUrl(trimmedUrl);
      setBaseUrl('');
    } else if (!savedBaseUrl && !trimmedUrl) {
      localStorage.removeItem(BASE_URL_KEY);
    }
    const trimmedModel = model.trim();
    if (trimmedModel) {
      localStorage.setItem(MODEL_KEY, trimmedModel);
      setSavedModel(trimmedModel);
      setModel('');
    } else if (!savedModel && !trimmedModel) {
      localStorage.removeItem(MODEL_KEY);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BASE_URL_KEY);
    localStorage.removeItem(MODEL_KEY);
    setSavedKey(null);
    setSavedBaseUrl(null);
    setSavedModel(null);
    setKey('');
    setBaseUrl('');
    setModel('');
  };

  const hasChanges = key.trim() || baseUrl.trim() || model.trim();

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <Key size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">AI Coach Provider</h3>
      </div>

      {savedKey ? (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-steel">Key:</span>
                <code className="text-sm text-ember font-mono">{maskKey(savedKey)}</code>
              </div>
              {savedBaseUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-steel">URL:</span>
                  <code className="text-xs text-chalk font-mono">{savedBaseUrl}</code>
                </div>
              )}
              {savedModel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-steel">Model:</span>
                  <code className="text-xs text-chalk font-mono">{savedModel}</code>
                </div>
              )}
            </div>
            <GlowButton variant="danger" size="sm" onClick={handleRemove}>
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
          placeholder={savedBaseUrl || 'Base URL (optional, e.g. https://api.openai.com/v1)'}
          className="input w-full"
        />
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={savedModel || 'Model (optional, e.g. gpt-4o, claude-haiku-4-5)'}
          className="input w-full"
        />
        <GlowButton onClick={handleSave} disabled={!hasChanges} className="w-full">
          {savedKey ? 'Update' : 'Save'}
        </GlowButton>
      </div>
    </div>
  );
}
