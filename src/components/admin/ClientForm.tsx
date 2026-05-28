"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, X, Search, AlertCircle, CheckCircle, Building2, Hash, DollarSign, Lock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id?: string;
  name: string;
  metaAdsAccountId: string;
  metaAdsAccessToken: string;
  chatPassword?: string;
}

interface ClientFormProps {
  client?: Client;
  globalToken: string;
  onSave: () => void;
  onCancel: () => void;
}

interface AdAccount {
  id: string;
  accountId: string;
  name: string;
  currency: string;
  amountSpent: number;
  balance: number;
  spendCap: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ClientForm({ client, globalToken, onSave, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name || '');
  const [accountId, setAccountId] = useState(client?.metaAdsAccountId || '');
  const [chatPassword, setChatPassword] = useState(client?.chatPassword || '');
  const [saving, setSaving] = useState(false);

  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountsFetched, setAccountsFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isEditing = !!client?.id;

  const handleFetchAccounts = async () => {
    if (!globalToken) {
      toast.error('Configure o token global em Configurações primeiro');
      return;
    }

    setFetchingAccounts(true);
    setAccounts([]);
    setAccountsFetched(false);
    setFetchError(null);

    try {
      const res = await fetch('/api/meta/adaccounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: globalToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFetchError(data.error || 'Erro ao buscar contas');
        toast.error(data.error || 'Erro ao buscar contas');
        return;
      }

      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setAccountsFetched(true);
        toast.success(`${data.accounts.length} conta(s) encontrada(s)!`);
      } else {
        setFetchError('Nenhuma conta de anúncio encontrada com este token.');
      }
    } catch {
      setFetchError('Falha ao conectar com o Meta.');
      toast.error('Falha ao conectar com o Meta.');
    } finally {
      setFetchingAccounts(false);
    }
  };

  const handleSelectAccount = (value: string) => {
    setSelectedAccount(value);
    const account = accounts.find((a) => a.id === value);
    if (account) {
      setAccountId(account.accountId);
      if (!name) {
        setName(account.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !accountId) {
      toast.error('Preencha o nome e selecione uma conta');
      return;
    }

    if (!chatPassword || chatPassword.length < 4) {
      toast.error('A senha do chat deve ter pelo menos 4 caracteres');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/admin/clients/${client.id}` : '/api/admin/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          metaAdsAccountId: accountId,
          metaAdsAccessToken: globalToken,
          chatPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }

      toast.success(isEditing ? 'Cliente atualizado!' : 'Cliente criado com sucesso!');
      onSave();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-[#18191A] border-gray-800 text-white">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
        <CardDescription className="text-gray-400">
          {isEditing
            ? 'Atualize os dados da conta de anúncios'
            : 'Clique em "Buscar Contas" para ver as contas disponíveis e selecione uma'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome do Cliente */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300 flex items-center gap-2">
              <Building2 size={16} className="text-gray-500" />
              Nome do Cliente
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Empresa XYZ"
              className="bg-[#242526] border-gray-700 text-white"
            />
          </div>

          {/* Aviso se token não configurado */}
          {!globalToken && (
            <div className="bg-yellow-900/30 border border-yellow-800 p-3 rounded text-sm text-yellow-200 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <strong>Token não configurado.</strong> Vá em &quot;Configurações&quot; no painel admin e salve o token de acesso Meta Ads primeiro.
              </div>
            </div>
          )}

          {/* Buscar Contas */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <DollarSign size={16} className="text-gray-500" />
              Conta de Anúncios
            </Label>
            <Button
              type="button"
              onClick={handleFetchAccounts}
              disabled={fetchingAccounts || !globalToken}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {fetchingAccounts ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Search size={16} className="mr-2" />
              )}
              {fetchingAccounts ? 'Buscando contas na API do Meta...' : 'Buscar Contas'}
            </Button>

            {fetchError && !fetchingAccounts && (
              <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 p-3 rounded text-sm text-red-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block mb-1">Erro ao buscar contas</strong>
                  <p className="opacity-90">{fetchError}</p>
                </div>
              </div>
            )}

            {accountsFetched && accounts.length > 0 && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-800 p-3 rounded text-sm text-green-200">
                <CheckCircle size={16} className="shrink-0" />
                {accounts.length} conta(s) encontrada(s). Selecione abaixo:
              </div>
            )}
          </div>

          {/* Seletor de Conta */}
          {accountsFetched && accounts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Selecione a Conta</Label>
              <Select value={selectedAccount} onValueChange={handleSelectAccount}>
                <SelectTrigger className="w-full bg-[#242526] border-gray-700 text-white">
                  <SelectValue placeholder="Escolha a conta desejada..." />
                </SelectTrigger>
                <SelectContent className="bg-[#242526] border-gray-700 text-white max-h-[300px]">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="focus:bg-blue-600 focus:text-white">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="truncate">{acc.name}</span>
                        <span className="text-gray-400 text-xs shrink-0">
                          ({acc.accountId}) {acc.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Info da conta selecionada */}
              {selectedAccount && (() => {
                const acc = accounts.find((a) => a.id === selectedAccount);
                if (!acc) return null;
                return (
                  <div className="bg-[#242526] border border-gray-700 rounded p-3 text-xs space-y-1">
                    <p className="text-gray-400">
                      <strong className="text-gray-300">Conta selecionada:</strong> {acc.name}
                    </p>
                    <p className="text-gray-400">
                      <strong className="text-gray-300">Gasto total:</strong> {formatCurrency(acc.amountSpent)}
                    </p>
                    {acc.spendCap > 0 && (
                      <p className="text-gray-400">
                        <strong className="text-gray-300">Limite:</strong> {formatCurrency(acc.spendCap)}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ID da Conta (manual) */}
          <div className="space-y-2">
            <Label htmlFor="accountId" className="text-gray-300 flex items-center gap-2">
              <Hash size={16} className="text-gray-500" />
              ID da Conta de Anúncios
            </Label>
            <Input
              id="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Ex: 123456789 ou act_123456789"
              className="bg-[#242526] border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500">
              Preenchido automaticamente ao selecionar uma conta, ou digite manualmente
            </p>
          </div>

          {/* Senha do Chat IA */}
          <div className="space-y-2">
            <Label htmlFor="chatPassword" className="text-gray-300 flex items-center gap-2">
              <Lock size={16} className="text-gray-500" />
              Senha do Chat IA
            </Label>
            <Input
              id="chatPassword"
              type="text"
              value={chatPassword}
              onChange={(e) => setChatPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="bg-[#242526] border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500">
              Senha individual que o cliente usará para acessar o chat de IA no dashboard
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <Button
              type="submit"
              disabled={saving || !name || !accountId || !chatPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              {isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}