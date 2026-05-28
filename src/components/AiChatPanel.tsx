"use client";

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2, MessageCircle, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatPanelProps {
  slug: string;
  period: string;
}

export default function AiChatPanel({ slug, period }: AiChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/dashboard/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          period,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao obter resposta');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar com a IA');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, houve um erro ao processar sua pergunta. Verifique se a API de IA está configurada e tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Conversa limpa');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-600 shadow-gray-500/20'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 animate-pulse'
        }`}
        size="icon"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
          <Card className="bg-[#18191A] border-gray-800 text-white shadow-2xl flex flex-col h-[550px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Assistente IA</h3>
                  <p className="text-[11px] text-gray-500">Analista de Meta Ads</p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-gray-800"
                  onClick={clearChat}
                  title="Limpar conversa"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot size={28} className="text-blue-400" />
                  </div>
                  <p className="text-sm font-medium mb-1">Pergunte sobre as métricas</p>
                  <p className="text-xs text-gray-600 mb-4">A IA tem acesso a todos os dados da conta</p>
                  <div className="space-y-2 max-w-[280px] mx-auto">
                    {[
                      'Como estão as campanhas?',
                      'Qual a campanha com melhor desempenho?',
                      'Como posso melhorar o CTR?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="block w-full text-left text-xs bg-[#242526] hover:bg-[#2F3033] border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Bot size={13} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-[#242526] text-gray-300 border border-gray-700/50 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <User size={13} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <Bot size={13} />
                  </div>
                  <div className="bg-[#242526] border border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    <span className="text-sm text-gray-400">Analisando dados...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte sobre as métricas..."
                  className="bg-[#242526] border-gray-700 text-white text-sm h-10"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 bg-blue-600 hover:bg-blue-700 shrink-0 rounded-lg"
                  disabled={loading || !input.trim()}
                >
                  <Send size={16} />
                </Button>
              </form>
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                Dados atualizados a cada pergunta • Período: {period === 'today' ? 'Hoje' : period === '7d' ? '7 dias' : period === '15d' ? '15 dias' : '30 dias'}
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}