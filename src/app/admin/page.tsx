"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, RefreshCw, Shield, LogOut, Settings, ChevronDown, ChevronUp, LayoutDashboard, Users } from 'lucide-react';
import ClientList from '@/components/admin/ClientList';
import ClientForm from '@/components/admin/ClientForm';
import SettingsPanel from '@/components/admin/SettingsPanel';
import SuggestionsPanel from '@/components/admin/SuggestionsPanel';
import AdminOverview from '@/components/admin/AdminOverview';

interface Client {
  id: string;
  name: string;
  slug: string;
  metaAdsAccountId: string;
  metaAdsAccessToken: string;
  chatPassword: string;
  createdAt: string;
  isActive: boolean;
}

interface Settings {
  metaAccessToken: string;
}

type TabType = 'overview' | 'clients';

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // Ignora erro
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchClients();
  }, [fetchSettings, fetchClients]);

  const handleSave = () => {
    setShowForm(false);
    setEditingClient(null);
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      toast.success('Logout realizado!');
      window.location.href = '/';
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

  const isTokenConfigured = !!settings?.metaAccessToken;

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white">
      <header className="border-b border-gray-800 bg-[#18191A] p-4">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
              <p className="text-xs text-gray-400">Gerencie dashboards dos clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => { fetchClients(); fetchSettings(); }}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 ${isTokenConfigured 
                ? 'border-green-700 text-green-400 hover:bg-green-900/30' 
                : 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/30'}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={14} className="mr-1" />
              Configurações
              {showSettings ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
            </Button>
            <Button
              onClick={() => { setEditingClient(null); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Novo Cliente
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-gray-800"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-4 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#18191A] border border-gray-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <LayoutDashboard size={16} />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'clients'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Users size={16} />
            Clientes
          </button>
        </div>

        {/* Painel de Configurações (colapsável) */}
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              toast.success('Token atualizado!');
            }}
          />
        )}

        {/* Tab: Visão Geral */}
        {activeTab === 'overview' && (
          <AdminOverview />
        )}

        {/* Tab: Clientes */}
        {activeTab === 'clients' && (
          <>
            {/* Painel de Sugestões da IA */}
            <SuggestionsPanel clients={clients} />

            {/* Formulário de cliente */}
            {showForm && (
              <ClientForm
                client={editingClient || undefined}
                globalToken={settings?.metaAccessToken || ''}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                Clientes ({clients.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : (
              <ClientList
                clients={clients}
                onEdit={handleEdit}
                onRefresh={fetchClients}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}