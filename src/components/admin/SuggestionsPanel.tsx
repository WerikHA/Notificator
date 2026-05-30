"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Brain,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
} from 'lucide-react';
import SuggestionCard from './SuggestionCard';

interface Client {
  id: string;
  name: string;
  slug: string;
  metaAdsAccountId: string;
  isActive: boolean;
}

interface Suggestion {
  id: string;
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  summary: string;
  suggestions: any[];
  status: string;
  createdAt: string;
}

interface SuggestionsPanelProps {
  clients: Client[];
}

export default function SuggestionsPanel({ clients }: SuggestionsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [clearing, setClearing] = useState(false);

  const activeClients = clients.filter((c) => c.isActive);

  const fetchSuggestions = useCallback(async (clientId?: string) => {
    setLoadingSuggestions(true);
    try {
      const url = clientId
        ? `/api/admin/suggestions?clientId=${clientId}`
        : '/api/admin/suggestions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch {
      // ignora
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchSuggestions();
    }
  }, [expanded, fetchSuggestions]);

  const handleGenerate = async () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/admin/suggestions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar sugestões');
      }

      toast.success(`${data.total} sugestão(ões) gerada(s)!`);
      fetchSuggestions(selectedClient);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar sugestões');
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!selectedClient) return;
    setClearing(true);
    try {
      await fetch(`/api/admin/suggestions?clientId=${selectedClient}`, {
        method: 'DELETE',
      });
      toast.success('Sugestões limpas');
      fetchSuggestions(selectedClient);
    } catch {
      toast.error('Erro ao limpar');
    } finally {
      setClearing(false);
    }
  };

  const filteredSuggestions = selectedClient
    ? suggestions.filter((s) => s.clientId === selectedClient)
    : suggestions;

  const pendingCount = filteredSuggestions.filter((s) => s.status === 'pending').length;
  const appliedCount = filteredSuggestions.filter((s) => s.status === 'fully_applied').length;

  return (
    <Card className="bg-[#18191A] border-gray-800 text-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1F2022] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Sugestões da IA</h3>
            <p className="text-xs text-gray-400">
              Análise e otimização automática de campanhas
              {filteredSuggestions.length > 0 && (
                <span className="ml-2 text-purple-400">
                  • {pendingCount} pendente(s) • {appliedCount} aplicada(s)
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); fetchSuggestions(v); }}>
              <SelectTrigger className="flex-1 bg-[#242526] border-gray-700 text-sm text-gray-300">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-[#242526] border-gray-700 text-white">
                {activeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedClient}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shrink-0"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
              {generating ? 'Analisando...' : 'Gerar Sugestões'}
            </Button>

            {selectedClient && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-400 hover:text-white shrink-0"
                  onClick={() => fetchSuggestions(selectedClient)}
                  disabled={loadingSuggestions}
                >
                  <RefreshCw size={16} className={loadingSuggestions ? 'animate-spin' : ''} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-400 hover:text-red-500 shrink-0"
                  onClick={handleClear}
                  disabled={clearing}
                  title="Limpar sugestões"
                >
                  <Trash2 size={16} />
                </Button>
              </>
            )}
          </div>

          {filteredSuggestions.length === 0 && !loadingSuggestions && (
            <div className="text-center py-8">
              <Zap size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhuma sugestão ainda</p>
              <p className="text-xs text-gray-600 mt-1">
                Selecione um cliente e clique em &quot;Gerar Sugestões&quot; para a IA analisar as campanhas
              </p>
            </div>
          )}

          {loadingSuggestions && (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Carregando sugestões...</p>
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onUpdate={() => fetchSuggestions(selectedClient)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}