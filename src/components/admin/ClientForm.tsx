"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, X, Search, AlertCircle, CheckCircle, User, Building2, Hash, Lock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id?: string;
  name: string;
  metaAdsAccountId: string;
  metaAdsAccessToken: string;
}

interface ClientFormProps {
  client?: Client;
  onSave: () => void;
  onCancel: () => void;
}

interface AdAccount {
  id: string;
  accountId: string;
  name: string;
  currency: string;
  status: number;
}

export default function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name || '');
  const [accountId, setAccountId] = useState(client?.metaAdsAccountId || '');
  const [accessToken, setAccessToken] = useState(client?.metaAdsAccessToken || '');
  const [saving, setSaving] = useState(false);

  // Estados para busca de contas
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountsFetched, setAccountsFetched] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const isEditing = !!client?.id;

  const handleFetchAccounts = async () => {
    if (!accessToken) {
      toast.error('Digite o token de acesso primeiro');
      return;
    }

    setFetchingAccounts(true);
    setAccounts([]);
    setAccountsFetched(false);
    setTokenError(null);

    try {
      const res = await fetch('/api/meta/adaccounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTokenError(data.error || 'Erro ao buscar contas');
        toast.error(data.error || 'Erro ao buscar contas');
        return;
      }

      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setAccountsFetched(true);
        toast.success(`${data.accounts.length} conta(s) encontrada(s)!`);
      } else {
        setTokenError('Nenhuma conta de anúncio encontrada com este token.');
        toast.error('Nenhuma conta de anúncio encontrada.');
      }
    } catch (error) {
      setTokenError('Falha ao conectar com o Meta.');
      toast.error('Falha ao conectar com o Meta.');
    } finally {
      setFetchingAccounts(false);
    }
  };

  const handleSelectAccount = (value: string) => {
    setSelectedAccount(value);
    const account = accounts.find((a) => a.id === value);
    if (account) {
      setAccountId(account.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !accountId || !accessToken) {
      toast.error('Preencha todos os campos');
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
          metaAdsAccessToken: accessToken,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }

      toast.success(isEditing ? 'Cliente atualizado!' : 'Cliente criado!');
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
            ? 'Atualize os dados da conta de anúncios Meta Ads'
            : 'Cole o token de acesso para buscar as contas automaticamente, ou preencha manualmente'}
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

          {/* Token de Acesso com busca */}
          <div className="space-y-2">
            <Label htmlFor="accessToken" className="text-gray-300 flex items-center gap-2">
              <Lock size={16} className="text-gray-500" />
              Token de Acesso (Access Token)
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="accessToken"
                  type="password"
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    if (accountsFetched) {
                      setAccountsFetched(false);
                      setAccounts([]);
                      setSelectedAccount('');
                    }
                  }}
                  placeholder="Cole o token de acesso da Meta Ads"
                  className="bg-[#242526] border-gray-700 text-white font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                onClick={handleFetchAccounts}
                disabled={fetchingAccounts || !accessToken}
                className="bg-blue-600 hover:bg-blue-700 h-10 px-4 shrink-0"
              >
                {fetchingAccounts ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                <span className="ml-2 hidden sm:inline">
                  {fetchingAccounts ? 'Buscando...' : 'Buscar Contas'}
                </span>
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              O token precisa ter a permissão <code className="text-blue-400">ads_management</code> ou <code className="text-blue-400">ads_read</code>
            </p>

            {/* Status da busca */}
            {fetchingAccounts && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Consultando contas na API do Meta...
              </div>
            )}
            {tokenError && !fetchingAccounts && (
              <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 p-3 rounded text-sm text-red-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block mb-1">Token inválido ou sem permissão</strong>
                  <p className="opacity-90">{tokenError}</p>
                  <p className="mt-1 text-xs opacity-70">
                    Você pode preencher o ID da conta manualmente abaixo mesmo assim.
                  </p>
                </div>
              </div>
            )}
            {accountsFetched && accounts.length > 0 && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-800 p-3 rounded text-sm text-green-200">
                <CheckCircle size={16} className="shrink-0" />
                {accounts.length} conta(s) de anúncio encontrada(s). Selecione abaixo:
              </div>
            )}
          </div>

          {/* Seletor de Conta (só aparece quando contas são encontradas) */}
          {accountsFetched && accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="account-select" className="text-gray-300 flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                Selecione a Conta de Anúncios
              </Label>
              <Select value={selectedAccount} onValueChange={handleSelectAccount}>
                <SelectTrigger className="w-full bg-[#242526] border-gray-700 text-white">
                  <SelectValue placeholder="Escolha a conta desejada..." />
                </SelectTrigger>
                <SelectContent className="bg-[#242526] border-gray-700 text-white">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="focus:bg-blue-600 focus:text-white">
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[300px]">{acc.name}</span>
                        <span className="text-gray-400 text-xs ml-2 shrink-0">
                          ({acc.accountId}) {acc.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Após selecionar, o campo abaixo será preenchido automaticamente.
              </p>
            </div>
          )}

          {/* ID da Conta (preenchido manualmente ou pela seleção) */}
          <div className="space-y-2">
            <Label htmlFor="accountId" className="text-gray-300 flex items-center gap-2">
              <Hash size={16} className="text-gray-500" />
              ID da Conta de Anúncios
              <span className="text-xs text-gray-500 font-normal">(ou manual)</span>
            </Label>
            <Input
              id="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Ex: act_123456789"
              className="bg-[#242526] border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500">
              Formato: número da conta ou <code className="text-blue-400">act_</code> seguido do número
            </p>
          </div>

          {tokenError && accounts.length === 0 && !fetchingAccounts && (
            <div className="bg-yellow-900/30 border border-yellow-800 p-3 rounded text-sm text-yellow-200">
              <strong>Dica:</strong> Se o token estiver expirado ou sem as permissões corretas, você pode
              preencher o <strong>ID da Conta</strong> manualmente e usar o token mesmo assim (se ainda for válido para
              leitura de métricas).
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <Button
              type="submit"
              disabled={saving || !name || !accountId || !accessToken}
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