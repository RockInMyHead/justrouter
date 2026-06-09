import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Users, Bot, Activity, LogOut, Eye, EyeOff, ArrowLeft,
  Headphones, Shield, Search, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight,
  Key, Globe, Server, Cpu, DollarSign, RefreshCw, TrendingUp, MessageSquare,
  Calendar, ExternalLink, ScrollText, BarChart3, Filter, Zap, Gift, Trash, UserPlus, Building2, FileText,
  PenSquare, HelpCircle, Clock, Layers, Timer, Play, Pause, SkipForward, SkipBack, Monitor, Video,
} from 'lucide-react';
import { adminFetch, clearAdminToken, getAdminHeaders, getAdminToken, setAdminToken } from './adminApi.js';
import { ActivityChart, StatCard } from './admin/AdminWidgets.jsx';
import { formatCurrency, formatDuration, formatNumber, formatPercent, profitClass } from './admin/formatters.js';

const getToken = getAdminToken;
const getHeaders = getAdminHeaders;

// ── Tab 1: Overview ──
function OverviewTab() {
  var [data, setData] = useState(null);

  useEffect(function() {
    if (!getToken()) return;
    adminFetch('/api/admin/overview')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(setData)
      .catch(function() {});
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Пользователи" value={formatNumber(data.total_users)} sub={'+' + formatNumber(data.users_today) + ' сегодня'} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Bot} label="Агенты" value={formatNumber(data.total_agents)} sub="Всего создано" color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={MessageSquare} label="Сообщения" value={formatNumber(data.total_messages)} sub={'+' + formatNumber(data.messages_today) + ' сегодня'} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Cpu} label="Модели" value={formatNumber(data.total_models)} sub="Доступно" color="bg-amber-500/20 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Финансы</span>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs font-mono">Пополнения (деньги)</span>
              <span className="text-blue-400 text-sm font-semibold">{formatCurrency(data.finance?.real_topups ?? data.total_topups)} ₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs font-mono">Бонусы выданы</span>
              <span className="text-violet-400 text-sm font-semibold">{formatCurrency(data.finance?.bonuses_issued ?? 0)} ₽</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs font-mono">Потрачено всего</span>
              <span className="text-white/80 text-sm font-semibold">{formatCurrency(data.finance?.total_spent ?? data.total_revenue)} ₽</span>
            </div>
            <div className="flex justify-between items-center pl-3">
              <span className="text-white/45 text-xs font-mono">· бонусами</span>
              <span className="text-violet-300/90 text-xs font-semibold">{formatCurrency(data.finance?.bonus_spent ?? 0)} ₽</span>
            </div>
            <div className="flex justify-between items-center pl-3">
              <span className="text-white/45 text-xs font-mono">· деньгами</span>
              <span className="text-emerald-400 text-xs font-semibold">{formatCurrency(data.finance?.real_spent ?? data.total_revenue)} ₽</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-xs font-mono">Бонусы на балансах</span>
              <span className="text-white/60 text-xs font-semibold">{formatCurrency(data.finance?.bonus_liability ?? 0)} ₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-xs font-mono">Деньги на балансах</span>
              <span className="text-white/60 text-xs font-semibold">{formatCurrency(data.finance?.real_balance_liability ?? 0)} ₽</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-xs font-mono">Маржа (пополнения − траты деньгами)</span>
              <span className={'text-sm font-semibold ' + ((data.finance?.cash_margin ?? 0) >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
                {formatCurrency(data.finance?.cash_margin ?? 0)} ₽
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Пополнения за 14 дней</span>
          </div>
          <ActivityChart
            data={data.topups_chart}
            valueKey="topups"
            labelKey="label"
            color="rgba(59,130,246,0.5)"
            formatValue={function(v) { return formatCurrency(v) + ' ₽'; }}
          />
        </div>
        <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Списания за 14 дней (деньгами)</span>
          </div>
          <ActivityChart
            data={data.spend_chart}
            valueKey="real_spent"
            labelKey="label"
            color="rgba(239,68,68,0.5)"
            formatValue={function(v) { return formatCurrency(v) + ' ₽'; }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Топ модели</span>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1">Модель</div>
              <div className="w-24 text-right">Запросы</div>
            </div>
            {(data.top_models || []).length === 0 ? (
              <div className="py-8 text-center text-white/20 text-xs font-mono">Нет данных</div>
            ) : (
              data.top_models.map(function(m, i) {
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono">
                    <div className="flex-1 text-white/80">{m.model_id}</div>
                    <div className="w-24 text-right text-white/60">{formatNumber(m.count)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Users ──
function UsersTab() {
  var [users, setUsers] = useState([]);
  var [totals, setTotals] = useState(null);
  var [total, setTotal] = useState(0);
  var [page, setPage] = useState(1);
  var [search, setSearch] = useState('');
  var [searchInput, setSearchInput] = useState('');
  var [selectedUser, setSelectedUser] = useState(null);
  var [userDetail, setUserDetail] = useState(null);
  var [userTransactions, setUserTransactions] = useState([]);
  var [userMessages, setUserMessages] = useState([]);
  var [adjustAmount, setAdjustAmount] = useState('');
  var [adjustReason, setAdjustReason] = useState('Корректировка администратором');
  var [adjusting, setAdjusting] = useState(false);
  var [adjustError, setAdjustError] = useState('');
  var [banning, setBanning] = useState(false);
  var [corping, setCorping] = useState(false);
  var [deleting, setDeleting] = useState(false);
  var [selectedUserIds, setSelectedUserIds] = useState([]);
  var [bulkDeleting, setBulkDeleting] = useState(false);
  var limit = 20;
  var [showCreate, setShowCreate] = useState(false);
  var [createForm, setCreateForm] = useState({ email: '', name: '', password: '', balance: '0' });
  var [creating, setCreating] = useState(false);
  var [createError, setCreateError] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    var token = getToken();
    adminFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(createForm),
    })
      .then(function(r) { return r.json().then(function(d) { return { status: r.status, data: d }; }); })
      .then(function(res) {
        if (res.status !== 200) {
          setCreateError(res.data.error || 'Ошибка создания');
        } else {
          setShowCreate(false);
          setCreateForm({ email: '', name: '', password: '', balance: '0' });
          fetchUsers();
        }
        setCreating(false);
      })
      .catch(function(err) {
        setCreateError(err.message || 'Ошибка соединения');
        setCreating(false);
      });
  }

  function fetchUsers() {
    if (!getToken()) return;
    var params = 'page=' + page + '&limit=' + limit;
    if (search) params += '&search=' + encodeURIComponent(search);
    adminFetch('/api/admin/users?' + params)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d) return;
        setUsers(d.users || []);
        setTotals(d.totals || null);
        setTotal(d.total || 0);
      })
      .catch(function() {});
  }

  useEffect(function() { fetchUsers(); }, [page, search]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function totalPages() {
    return Math.ceil(total / limit) || 1;
  }

  function viewUser(u) {
    setSelectedUser(u);
    var token = getToken();
    adminFetch('/api/admin/users/' + u.id, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setUserDetail).catch(function() {});
    adminFetch('/api/admin/users/' + u.id + '/transactions?limit=20', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) { setUserTransactions(d.transactions || []); }).catch(function() {});
    adminFetch('/api/admin/users/' + u.id + '/messages?limit=20', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) { setUserMessages(d.messages || []); }).catch(function() {});
  }

  function adjustBalance() {
    var amt = parseFloat(adjustAmount);
    if (isNaN(amt) || !selectedUser) return;
    setAdjustError('');
    setAdjusting(true);
    var token = getToken();
    adminFetch('/api/admin/users/' + selectedUser.id + '/balance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ amount: amt, reason: adjustReason }),
    })
      .then(function(r) { return r.json().then(function(d) { return { status: r.status, data: d }; }); })
      .then(function(res) {
        if (res.status !== 200) {
          setAdjustError(res.data.error || 'Ошибка сервера');
        } else {
          setUserDetail(function(prev) { return prev ? Object.assign({}, prev, { balance: res.data.balance }) : prev; });
          setAdjustAmount('');
          setAdjustError('');
        }
        setAdjusting(false);
      })
      .catch(function(err) {
        setAdjustError(err.message || 'Ошибка соединения');
        setAdjusting(false);
      });
  }

  function toggleBan() {
    if (!selectedUser || !userDetail) return;
    setBanning(true);
    var token = getToken();
    adminFetch('/api/admin/users/' + selectedUser.id + '/ban', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setUserDetail(function(prev) { return prev ? Object.assign({}, prev, { banned: d.banned ? 1 : 0 }) : prev; });
        setBanning(false);
      })
      .catch(function() { setBanning(false); });
  }

  function toggleCorporate() {
    if (!selectedUser || !userDetail) return;
    setCorping(true);
    var token = getToken();
    adminFetch('/api/admin/users/' + selectedUser.id + '/corporate', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setUserDetail(function(prev) { return prev ? Object.assign({}, prev, { corporate: d.corporate ? 1 : 0 }) : prev; });
        setCorping(false);
      })
      .catch(function() { setCorping(false); });
  }

  function deleteUser() {
    if (!selectedUser || !userDetail || deleting) return;
    if (!window.confirm('Вы уверены, что хотите полностью удалить пользователя «' + (selectedUser.name || selectedUser.email) + '»?\\n\\nБудут удалены все сообщения, транзакции, агенты, API-ключи и другие данные.\\nЭто действие нельзя отменить.')) {
      return;
    }
    setDeleting(true);
    var token = getToken();
    adminFetch('/api/admin/users/' + selectedUser.id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Ошибка удаления'); });
        return r.json();
      })
      .then(function() {
        setSelectedUser(null);
        setUserDetail(null);
        setUserTransactions([]);
        setUserMessages([]);
        setDeleting(false);
      })
      .catch(function(err) {
        alert('Ошибка: ' + err.message);
        setDeleting(false);
      });
  }

  function toggleSelect(id) {
    setSelectedUserIds(function(prev) {
      if (prev.includes(id)) {
        return prev.filter(function(x) { return x !== id; });
      }
      return prev.concat([id]);
    });
  }

  function selectAll() {
    var allSelected = users.every(function(u) { return selectedUserIds.includes(u.id); });
    if (allSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(function(u) { return u.id; }));
    }
  }

  function bulkDelete() {
    if (selectedUserIds.length === 0 || bulkDeleting) return;
    if (!window.confirm('Вы уверены, что хотите удалить ' + selectedUserIds.length + ' пользователей?\\n\\nБудут удалены все сообщения, транзакции, агенты и другие данные.\\nЭто действие нельзя отменить.')) {
      return;
    }
    setBulkDeleting(true);
    var token = getToken();
    adminFetch('/api/admin/users/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ user_ids: selectedUserIds }),
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.error) {
          alert('Ошибка: ' + d.error);
        } else {
          setSelectedUserIds([]);
          fetchUsers();
        }
        setBulkDeleting(false);
      })
      .catch(function(err) {
        alert('Ошибка: ' + err.message);
        setBulkDeleting(false);
      });
  }

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button onClick={function() { setSelectedUser(null); setUserDetail(null); setUserTransactions([]); setUserMessages([]); }} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs font-mono transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Назад к списку
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-white font-semibold text-lg truncate">{(selectedUser.name || selectedUser.email)}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {userDetail && userDetail.banned ? (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-mono font-medium">Заблокирован</span>
              ) : null}
              {userDetail && userDetail.corporate ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-medium">Корпоративный</span>
              ) : null}
              <button onClick={toggleBan} disabled={banning || !userDetail}
                className={'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ' + (userDetail && userDetail.banned ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/15')}>
                {banning ? '...' : (userDetail && userDetail.banned ? 'Разблокировать' : 'Заблокировать')}
              </button>
              <button onClick={toggleCorporate} disabled={corping || !userDetail}
                className={'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ' + (userDetail && userDetail.corporate ? 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/10' : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/15')}>
                {corping ? '...' : (userDetail && userDetail.corporate ? 'Убрать из корп.' : 'Корпоративный')}
              </button>
              <button onClick={deleteUser} disabled={deleting || !userDetail}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 bg-white/5 text-red-400 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30">
                {deleting ? '...' : 'Удалить'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Email</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? userDetail.email : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Баланс</span>
              <span className="text-white text-sm font-mono font-semibold">{userDetail ? formatCurrency(userDetail.balance) + ' ₽' : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Всего оплачено</span>
              <span className="text-white text-sm font-mono">{userDetail ? formatCurrency(userDetail.total_paid) + ' ₽' : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Дата регистрации</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? (userDetail.created_at || '--') : '...'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Сообщений</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? formatNumber(userDetail.message_count) : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Запросов</span>
              <span className="text-white/80 text-sm font-mono">{userDetail ? formatNumber(userDetail.user_requests) : '...'}</span>
            </div>
            <div>
              <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Бесплатных</span>
              <span className="text-emerald-400 text-sm font-mono">{userDetail ? formatNumber(userDetail.free_requests) : '...'}</span>
            </div>
          </div>

          {/* Finance breakdown: paid vs OpenRouter cost */}
          {userDetail && userDetail.total_paid > 0 && (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
              <TrendingUp size={16} />
              Финансы
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Оплачено (всего)</span>
                <span className="text-white font-mono">{formatCurrency(userDetail.total_paid)} ₽</span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">OpenRouter (себестоимость)</span>
                <span className="text-amber-300/80 font-mono">{formatCurrency(userDetail.openrouter_cost)} ₽</span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Маржа JustRouter</span>
                <span className="text-emerald-400 font-mono font-semibold">{formatCurrency(userDetail.justrouter_revenue)} ₽</span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Маржа %</span>
                <span className={'font-mono font-semibold ' + ((userDetail.margin_percent || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400')}>{formatPercent(userDetail.margin_percent)}</span>
              </div>
            </div>
          </div>
          )}

          {userDetail && userDetail.referral && (
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 mb-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                <Gift size={16} />
                Реферальная программа
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Код</span>
                  <span className="text-white font-mono">{userDetail.referral.referral_code || '—'}</span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Пригласил</span>
                  <span className="text-white font-mono">{userDetail.referral.invited_count || 0}</span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Заработано</span>
                  <span className="text-white font-mono">{formatCurrency(userDetail.referral.earned_rub || 0)} ₽</span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase block mb-1">Пришёл от</span>
                  <span className="text-white/80 font-mono text-xs">
                    {userDetail.referral.referred_by
                      ? (userDetail.referral.referred_by.email + ' (' + (userDetail.referral.referred_by.referral_code || '—') + ')')
                      : '—'}
                  </span>
                </div>
              </div>
              {userDetail.referral.referral_url && (
                <div className="text-white/40 text-xs font-mono break-all">{userDetail.referral.referral_url}</div>
              )}
              {userDetail.referral.invited_users && userDetail.referral.invited_users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-white/30 border-b border-white/10">
                        <th className="text-left py-2 pr-3">Дата</th>
                        <th className="text-left py-2 pr-3">Приглашённый</th>
                        <th className="text-right py-2">Бонус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetail.referral.invited_users.map(function(row, i) {
                        return (
                          <tr key={i} className="border-b border-white/5 text-white/70">
                            <td className="py-2 pr-3 whitespace-nowrap">{row.created_at ? row.created_at.slice(0, 16) : '—'}</td>
                            <td className="py-2 pr-3">{row.referred_email || row.referred_name}</td>
                            <td className="py-2 text-right text-emerald-300">+{formatCurrency(row.referrer_bonus_rub)} ₽</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {userDetail && userDetail.top_models && userDetail.top_models.length > 0 && (
            <div className="mb-6">
              <span className="text-white/40 text-xs font-mono mb-2 block">Топ моделей</span>
              <div className="flex flex-wrap gap-2">
                {userDetail.top_models.map(function(m) {
                  return (
                    <span key={m.model_id} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white/70">
                      {m.model_id} · {m.count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <div className="border-t border-white/5 pt-4">
            <span className="text-white/40 text-xs font-mono mb-3 block">Скорректировать баланс</span>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-white/30 text-[10px] font-mono mb-1">Сумма (+/-)</label>
                <input type="number" value={adjustAmount} onChange={function(e) { setAdjustAmount(e.target.value); }} placeholder="100"
                  className="w-28 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" />
              </div>
              <div>
                <label className="block text-white/30 text-[10px] font-mono mb-1">Причина</label>
                <input type="text" value={adjustReason} onChange={function(e) { setAdjustReason(e.target.value); }}
                  className="w-48 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" />
              </div>
              <button onClick={adjustBalance} disabled={adjusting}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer disabled:opacity-50">
                {adjusting ? '...' : 'Применить'}
              </button>
            </div>
            {adjustError ? (
              <div className="text-red-400 text-[11px] font-mono mt-2">{adjustError}</div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 border-t border-white/5 pt-6">
            <div>
              <span className="text-white/40 text-xs font-mono mb-3 block">Последние транзакции</span>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userTransactions.length === 0 ? (
                  <div className="text-white/20 text-xs font-mono py-4 text-center">Нет транзакций</div>
                ) : userTransactions.map(function(tx) {
                  return (
                    <div key={tx.id} className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.03] text-xs font-mono">
                      <div className="min-w-0">
                        <div className="text-white/70 truncate">{tx.description || tx.type}</div>
                        <div className="text-white/30 text-[10px] mt-0.5">{tx.created_at}</div>
                      </div>
                      <span className={'shrink-0 font-semibold ' + (tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)} ₽
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-white/40 text-xs font-mono mb-3 block">Последние сообщения</span>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userMessages.length === 0 ? (
                  <div className="text-white/20 text-xs font-mono py-4 text-center">Нет сообщений</div>
                ) : userMessages.map(function(msg) {
                  return (
                    <div key={msg.id} className="py-2 border-b border-white/[0.03] text-xs font-mono">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={'px-1.5 py-0.5 rounded text-[10px] ' + (msg.role === 'user' ? 'bg-blue-500/10 text-blue-300' : 'bg-white/5 text-white/50')}>
                          {msg.role}
                        </span>
                        <span className="text-white/40 truncate">{msg.model_id}</span>
                        {msg.is_free ? <span className="text-emerald-400/70 text-[10px]">free</span> : null}
                        <span className="text-white/20 text-[10px] ml-auto shrink-0">{msg.created_at}</span>
                      </div>
                      <div className="text-white/60 line-clamp-2">{msg.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={searchInput} onChange={function(e) { setSearchInput(e.target.value); }} placeholder="Поиск по email или имени..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-all font-mono" />
        </div>
        <button type="submit"
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
          Поиск
        </button>
        <button type="button" onClick={function() { setShowCreate(true); setCreateError(''); }}
          className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5">
          <UserPlus size={14} /> Создать
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="w-6 shrink-0">
                <input type="checkbox" checked={users.length > 0 && users.every(function(u) { return selectedUserIds.includes(u.id); })}
                  onChange={selectAll}
                  className="accent-emerald-500 cursor-pointer" />
              </div>
              <div className="flex-1 min-w-[100px]">Имя</div>
              <div className="w-36">Email</div>
              <div className="w-20 text-right">Баланс</div>
              <div className="w-20 text-right">Бонусы</div>
              <div className="w-24 text-right">Потр. бонусы</div>
              <div className="w-20 text-right">Прибыль</div>
              <div className="w-16 text-right">Маржа</div>
              <div className="w-20 text-right">Дата</div>
            </div>
            {users.length === 0 ? (
              <div className="py-8 text-center text-white/20 text-xs font-mono">Пользователи не найдены</div>
            ) : (
              users.map(function(u) {
                var marginPct = u.margin_percent;
                var marginClass = marginPct == null
                  ? 'text-white/30'
                  : marginPct >= 0 ? 'text-emerald-400' : 'text-amber-400';
                return (
                  <div key={u.id} onClick={function() { viewUser(u); }}
                    className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] cursor-pointer transition-colors">
                    <div className="w-6 shrink-0" onClick={function(e) { e.stopPropagation(); }}>
                      <input type="checkbox" checked={selectedUserIds.includes(u.id)}
                        onChange={function() { toggleSelect(u.id); }}
                        className="accent-emerald-500 cursor-pointer" />
                    </div>
                    <div className="flex-1 min-w-[100px] text-white/80 truncate flex items-center gap-1.5">
                      {u.name || '—'}
                      {u.corporate ? <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/70 text-[8px] font-mono leading-none">К</span> : null}
                    </div>
                    <div className="w-36 text-white/50 truncate">{u.email}</div>
                    <div className="w-20 text-right text-white/70">{formatCurrency(u.balance)} ₽</div>
                    <div className="w-20 text-right text-violet-300/90">{formatCurrency(u.bonus_balance)} ₽</div>
                    <div className="w-24 text-right text-violet-300/70">{formatCurrency(u.bonus_spent)} ₽</div>
                    <div className={'w-20 text-right ' + profitClass(u.profit)}>{formatCurrency(u.profit)} ₽</div>
                    <div className={'w-16 text-right ' + marginClass}>{formatPercent(marginPct)}</div>
                    <div className="w-20 text-right text-white/30">{u.created_at ? u.created_at.slice(0, 10) : '—'}</div>
                  </div>
                );
              })
            )}
            {totals && users.length > 0 && (
              <div className="flex items-center gap-3 py-3 mt-1 border-t border-white/10 text-xs font-mono bg-white/[0.02]">
                <div className="w-6 shrink-0" />
                <div className="flex-1 min-w-[100px] text-white/60 font-semibold">Итого ({total})</div>
                <div className="w-36" />
                <div className="w-20 text-right text-white/80 font-semibold">{formatCurrency(totals.balance)} ₽</div>
                <div className="w-20 text-right text-violet-300 font-semibold">{formatCurrency(totals.bonus_balance)} ₽</div>
                <div className="w-24 text-right text-violet-300/90 font-semibold">{formatCurrency(totals.bonus_spent)} ₽</div>
                <div className={'w-20 text-right font-semibold ' + profitClass(totals.profit)}>{formatCurrency(totals.profit)} ₽</div>
                <div className={'w-16 text-right font-semibold ' + (totals.margin_percent == null ? 'text-white/30' : totals.margin_percent >= 0 ? 'text-emerald-400' : 'text-amber-400')}>
                  {formatPercent(totals.margin_percent)}
                </div>
                <div className="w-20" />
              </div>
            )}
          </div>
        </div>
        {selectedUserIds.length > 0 ? (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <span className="text-white/50 text-xs font-mono">Выбрано: {selectedUserIds.length} пользователей</span>
            <div className="flex gap-2">
              <button onClick={function() { setSelectedUserIds([]); }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer">
                Отменить
              </button>
              <button onClick={bulkDelete} disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50">
                <Trash size={12} />
                {bulkDeleting ? '...' : 'Удалить выбранных'}
              </button>
            </div>
          </div>
        ) : (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <span className="text-white/30 text-xs font-mono">{total} пользователей</span>
          <div className="flex gap-1">
            <button onClick={function() { setPage(Math.max(1, page - 1)); }} disabled={page <= 1}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              ←
            </button>
            <span className="px-3 py-1 text-xs font-mono text-white/50">{page} / {totalPages()}</span>
            <button onClick={function() { setPage(Math.min(totalPages(), page + 1)); }} disabled={page >= totalPages()}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
              →
            </button>
          </div>
        </div>
        )}
      </div>
    </div>

    {/* ── Create User Modal ── */}
    {showCreate ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={function(e) { if (e.target === e.currentTarget) setShowCreate(false); }}>
        <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 backdrop-blur-xl shadow-2xl" onClick={function(e) { e.stopPropagation(); }}>
          <h3 className="text-white font-semibold text-base mb-5">Создать пользователя</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" required value={createForm.email}
                onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { email: e.target.value }); }); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Имя</label>
              <input type="text" required value={createForm.name}
                onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { name: e.target.value }); }); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Пароль</label>
              <input type="password" required value={createForm.password}
                onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { password: e.target.value }); }); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="Минимум 6 символов" />
            </div>
            <div>
              <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Начальный баланс (₽)</label>
              <input type="number" value={createForm.balance}
                onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { balance: e.target.value }); }); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="0" />
            </div>
            {createError ? (
              <div className="text-red-300 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{createError}</div>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={function() { setShowCreate(false); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer">
                Отмена
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50">
                {creating ? '...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    </>
  );
}
function ModelsTab() {
  var [models, setModels] = useState([]);
  var [showAddForm, setShowAddForm] = useState(false);
  var [editId, setEditId] = useState(null);
  var [newModel, setNewModel] = useState({ id: '', name: '', provider: '', category: 'text', price: '', context: 128000, speed: 90, badge: '', color: '#10B981', description: '', strengths: '' });
  var [editModel, setEditModel] = useState({});

  function fetchModels() {
    var token = getToken();
    if (!token) return;
    adminFetch('/api/admin/models', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setModels).catch(function() {});
  }

  useEffect(function() { fetchModels(); }, []);

  function addModel(e) {
    e.preventDefault();
    var token = getToken();
    adminFetch('/api/admin/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(newModel),
    }).then(function(r) {
      if (r.ok) { setShowAddForm(false); setNewModel({ id: '', name: '', provider: '', category: 'text', price: '', context: 128000, speed: 90, badge: '', color: '#10B981', description: '', strengths: '' }); fetchModels(); }
      else { r.json().then(function(d) { alert(d.error || 'Ошибка'); }); }
    }).catch(function() {});
  }

  function startEdit(m) {
    setEditId(m.id);
    setEditModel(Object.assign({}, m));
  }

  function cancelEdit() {
    setEditId(null);
    setEditModel({});
  }

  function saveEdit(m) {
    var token = getToken();
    var body = {};
    for (var key in editModel) {
      if (editModel[key] !== m[key]) body[key] = editModel[key];
    }
    if (Object.keys(body).length === 0) { setEditId(null); return; }
    adminFetch('/api/admin/models/' + m.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function(r) { if (r.ok) { setEditId(null); fetchModels(); } }).catch(function() {});
  }

  function deleteModel(id) {
    if (!confirm('Удалить модель ' + id + '?')) return;
    var token = getToken();
    adminFetch('/api/admin/models/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function(r) { if (r.ok) fetchModels(); }).catch(function() {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs font-mono">{models.length} моделей</span>
        <button onClick={function() { setShowAddForm(!showAddForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
          <Plus size={14} /> Добавить модель
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Новая модель</span>
          <form onSubmit={addModel} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">ID *</label>
              <input type="text" value={newModel.id} onChange={function(e) { setNewModel(Object.assign({}, newModel, { id: e.target.value })); }} placeholder="provider/model"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Название *</label>
              <input type="text" value={newModel.name} onChange={function(e) { setNewModel(Object.assign({}, newModel, { name: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Провайдер *</label>
              <input type="text" value={newModel.provider} onChange={function(e) { setNewModel(Object.assign({}, newModel, { provider: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Категория *</label>
              <select value={newModel.category} onChange={function(e) { setNewModel(Object.assign({}, newModel, { category: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 font-mono">
                <option value="text">text</option><option value="image">image</option><option value="audio">audio</option><option value="video">video</option><option value="embedding">embedding</option>
              </select></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Цена *</label>
              <input type="number" step="0.01" value={newModel.price} onChange={function(e) { setNewModel(Object.assign({}, newModel, { price: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Контекст</label>
              <input type="number" value={newModel.context} onChange={function(e) { setNewModel(Object.assign({}, newModel, { context: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Скорость</label>
              <input type="number" value={newModel.speed} onChange={function(e) { setNewModel(Object.assign({}, newModel, { speed: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Бейдж</label>
              <input type="text" value={newModel.badge} onChange={function(e) { setNewModel(Object.assign({}, newModel, { badge: e.target.value })); }} placeholder="🔥 Популярная"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div><label className="block text-white/30 text-[10px] font-mono mb-1">Цвет</label>
              <input type="text" value={newModel.color} onChange={function(e) { setNewModel(Object.assign({}, newModel, { color: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-2"><label className="block text-white/30 text-[10px] font-mono mb-1">Описание</label>
              <input type="text" value={newModel.description} onChange={function(e) { setNewModel(Object.assign({}, newModel, { description: e.target.value })); }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-2"><label className="block text-white/30 text-[10px] font-mono mb-1">Сильные стороны</label>
              <input type="text" value={newModel.strengths} onChange={function(e) { setNewModel(Object.assign({}, newModel, { strengths: e.target.value })); }} placeholder="Код, анализ, скорость"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" /></div>
            <div className="sm:col-span-3 flex gap-2 mt-2">
              <button type="submit" className="px-5 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
                <Check size={14} className="inline mr-1" /> Создать
              </button>
              <button type="button" onClick={function() { setShowAddForm(false); }}
                className="px-5 py-2 rounded-lg text-white/40 text-xs font-mono hover:text-white/70 transition-colors cursor-pointer">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1 min-w-[120px]">Модель</div>
              <div className="w-24">Провайдер</div>
              <div className="w-20">Категория</div>
              <div className="w-20 text-right">Цена</div>
              <div className="w-20 text-right">Контекст</div>
              <div className="w-16 text-right">Скорость</div>
              <div className="w-24 text-right">Действия</div>
            </div>
            {models.map(function(m) {
              var isEditing = editId === m.id;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono">
                  {isEditing ? (
                    <>
                      <div className="flex-1 min-w-[120px]">
                        <input type="text" value={editModel.name || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { name: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-24">
                        <input type="text" value={editModel.provider || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { provider: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-20">
                        <select value={editModel.category || 'text'} onChange={function(e) { setEditModel(Object.assign({}, editModel, { category: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30">
                          <option value="text">text</option><option value="image">image</option><option value="audio">audio</option><option value="video">video</option><option value="embedding">embedding</option>
                        </select>
                      </div>
                      <div className="w-20 text-right">
                        <input type="number" step="0.01" value={editModel.price || ''} onChange={function(e) { setEditModel(Object.assign({}, editModel, { price: e.target.value })); }}
                          className="w-20 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-20 text-right">
                        <input type="number" value={editModel.context || 0} onChange={function(e) { setEditModel(Object.assign({}, editModel, { context: e.target.value })); }}
                          className="w-20 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-16 text-right">
                        <input type="number" value={editModel.speed || 0} onChange={function(e) { setEditModel(Object.assign({}, editModel, { speed: e.target.value })); }}
                          className="w-16 bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-white/30 text-right" />
                      </div>
                      <div className="w-24 text-right flex gap-1 justify-end">
                        <button onClick={function() { saveEdit(m); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><Check size={14} /></button>
                        <button onClick={cancelEdit}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[120px] text-white/80">{m.name}
                        {m.badge && <span className="ml-1.5 text-white/30 text-[9px]">{m.badge}</span>}
                      </div>
                      <div className="w-24 text-white/50">{m.provider}</div>
                      <div className="w-20 text-white/50">{m.category}</div>
                      <div className="w-20 text-right text-white/70">{formatCurrency(m.price)}</div>
                      <div className="w-20 text-right text-white/50">{m.context ? formatNumber(m.context) : '—'}</div>
                      <div className="w-16 text-right text-white/50">{m.speed || '—'}</div>
                      <div className="w-24 text-right flex gap-1 justify-end">
                        <button onClick={function() { startEdit(m); }}
                          className="p-1 text-white/30 hover:text-white/70 transition-colors cursor-pointer"><Edit2 size={13} /></button>
                        <button onClick={function() { deleteModel(m.id); }}
                          className="p-1 text-white/30 hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Model Logs ──
function ModelLogsTab() {
  var [logs, setLogs] = useState([]);
  var [total, setTotal] = useState(0);
  var [page, setPage] = useState(1);
  var [models, setModels] = useState([]);
  var [filters, setFilters] = useState({ search: '', model_id: '', role: '', source: 'all' });
  var [searchInput, setSearchInput] = useState('');
  var limit = 50;

  function fetchLogs() {
    var token = getToken();
    if (!token) return;
    var params = 'page=' + page + '&limit=' + limit;
    if (filters.search) params += '&search=' + encodeURIComponent(filters.search);
    if (filters.model_id) params += '&model_id=' + encodeURIComponent(filters.model_id);
    if (filters.role) params += '&role=' + encodeURIComponent(filters.role);
    if (filters.source) params += '&source=' + encodeURIComponent(filters.source);
    adminFetch('/api/admin/model-logs?' + params, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setLogs(d.logs || []);
        setTotal(d.total || 0);
        if (d.models) setModels(d.models);
      }).catch(function() {});
  }

  useEffect(function() { fetchLogs(); }, [page, filters]);

  function handleSearch(e) {
    e.preventDefault();
    setFilters(Object.assign({}, filters, { search: searchInput }));
    setPage(1);
  }

  function totalPages() {
    return Math.ceil(total / limit) || 1;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={searchInput} onChange={function(e) { setSearchInput(e.target.value); }} placeholder="Поиск по тексту, модели, email..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono" />
        </div>
        <select value={filters.model_id} onChange={function(e) { setFilters(Object.assign({}, filters, { model_id: e.target.value })); setPage(1); }}
          className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-white/30 font-mono min-w-[180px]">
          <option value="">Все модели</option>
          {models.map(function(m) {
            return <option key={m.id} value={m.id}>{m.name}</option>;
          })}
        </select>
        <select value={filters.role} onChange={function(e) { setFilters(Object.assign({}, filters, { role: e.target.value })); setPage(1); }}
          className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-white/30 font-mono">
          <option value="">Все роли</option>
          <option value="user">user</option>
          <option value="assistant">assistant</option>
        </select>
        <select value={filters.source} onChange={function(e) { setFilters(Object.assign({}, filters, { source: e.target.value })); setPage(1); }}
          className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-white/30 font-mono">
          <option value="all">Все источники</option>
          <option value="user">Пользователи</option>
          <option value="agent">Агенты</option>
        </select>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer">
          Найти
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <ScrollText size={14} /> Логи запросов к моделям
          </span>
          <span className="text-white/30 text-xs font-mono">{formatNumber(total)} записей</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="w-32">Время</div>
              <div className="w-16">Источник</div>
              <div className="w-36">Кто</div>
              <div className="w-40">Модель</div>
              <div className="w-16">Роль</div>
              <div className="flex-1">Превью</div>
            </div>
            {logs.length === 0 ? (
              <div className="py-12 text-center text-white/20 text-xs font-mono">Логи не найдены</div>
            ) : logs.map(function(log) {
              var who = log.source === 'agent'
                ? (log.agent_name || 'agent #' + log.agent_id)
                : (log.user_email || log.user_name || 'user #' + log.user_id);
              return (
                <div key={log.source + '-' + log.id} className="flex items-start gap-3 py-3 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] transition-colors">
                  <div className="w-32 text-white/40 shrink-0">{log.created_at ? log.created_at.replace('T', ' ').slice(0, 16) : '—'}</div>
                  <div className="w-16 shrink-0">
                    <span className={'px-1.5 py-0.5 rounded text-[10px] ' + (log.source === 'agent' ? 'bg-purple-500/10 text-purple-300' : 'bg-blue-500/10 text-blue-300')}>
                      {log.source}
                    </span>
                  </div>
                  <div className="w-36 text-white/60 truncate shrink-0" title={who}>{who}</div>
                  <div className="w-40 shrink-0">
                    <div className="text-white/80 truncate" title={log.model_name}>{log.model_name || log.model_id}</div>
                    <div className="text-white/30 text-[10px] truncate">{log.model_id}</div>
                  </div>
                  <div className="w-16 shrink-0">
                    <span className={'px-1.5 py-0.5 rounded text-[10px] ' + (log.role === 'user' ? 'bg-white/5 text-white/60' : 'bg-white/[0.02] text-white/40')}>
                      {log.role}
                    </span>
                    {log.is_free ? <span className="block text-emerald-400/70 text-[9px] mt-0.5">free</span> : null}
                  </div>
                  <div className="flex-1 text-white/50 line-clamp-2 min-w-0">{log.preview}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <span className="text-white/30 text-xs font-mono">Страница {page} из {totalPages()}</span>
          <div className="flex gap-1">
            <button onClick={function() { setPage(Math.max(1, page - 1)); }} disabled={page <= 1}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer">
              ←
            </button>
            <button onClick={function() { setPage(Math.min(totalPages(), page + 1)); }} disabled={page >= totalPages()}
              className="px-3 py-1 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 6: Model Dashboard ──
function ModelDashboardTab() {
  var [data, setData] = useState(null);
  var [days, setDays] = useState(14);
  var [search, setSearch] = useState('');

  useEffect(function() {
    var token = getToken();
    if (!token) return;
    adminFetch('/api/admin/models/dashboard?days=' + days, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setData).catch(function() {});
  }, [days]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка...
      </div>
    );
  }

  var filteredModels = (data.models || []).filter(function(m) {
    if (!search) return true;
    var q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.model_id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Запросы" value={formatNumber(data.summary.total_user_requests)} sub={formatNumber(data.summary.total_today) + ' сегодня'} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Users} label="Пользователей" value={formatNumber(data.summary.unique_users)} sub="Уникальных" color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={Zap} label="Free / Paid" value={formatNumber(data.summary.total_free) + ' / ' + formatNumber(data.summary.total_paid)} sub="Бесплатных / платных" color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Cpu} label="Моделей в использовании" value={formatNumber(data.summary.models_used) + ' / ' + formatNumber(data.summary.total_models)} sub="Активных / всего" color="bg-amber-500/20 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Активность запросов</span>
            <select value={days} onChange={function(e) { setDays(parseInt(e.target.value)); }}
              className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-white/60 text-[10px] font-mono outline-none">
              <option value={7}>7 дней</option>
              <option value={14}>14 дней</option>
              <option value={30}>30 дней</option>
            </select>
          </div>
          <ActivityChart data={data.activity_chart} valueKey="count" labelKey="label" color="rgba(59,130,246,0.5)" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">По категориям</span>
          <div className="space-y-3">
            {(data.categories || []).map(function(cat) {
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/70">{cat.category}</span>
                    <span className="text-white/40">{cat.pct}% · {formatNumber(cat.count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500/60 transition-all duration-500" style={{ width: Math.max(cat.pct, 1) + '%' }} />
                  </div>
                </div>
              );
            })}
            {(data.categories || []).length === 0 && (
              <div className="text-center py-8 text-white/20 text-xs font-mono">Нет данных</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={14} /> Статистика по моделям
          </span>
          <div className="relative max-w-xs w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input type="text" value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Фильтр моделей..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs placeholder-white/20 outline-none focus:border-white/30 font-mono" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1 min-w-[140px]">Модель</div>
              <div className="w-20 text-right">Запросы</div>
              <div className="w-20 text-right">Сегодня</div>
              <div className="w-20 text-right">Free</div>
              <div className="w-20 text-right">Paid</div>
              <div className="w-20 text-right">Users</div>
              <div className="w-16 text-right">Доля</div>
            </div>
            {filteredModels.length === 0 ? (
              <div className="py-8 text-center text-white/20 text-xs font-mono">Модели не найдены</div>
            ) : filteredModels.slice(0, 100).map(function(m) {
              return (
                <div key={m.model_id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-[140px] flex items-center gap-2 min-w-0">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: m.color || '#10B981' }} />
                    <div className="min-w-0">
                      <div className="text-white/80 truncate">{m.name}</div>
                      <div className="text-white/30 text-[10px] truncate">{m.provider} · {m.category}</div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-white/70">{formatNumber(m.user_requests)}</div>
                  <div className="w-20 text-right text-white/50">{formatNumber(m.today_count)}</div>
                  <div className="w-20 text-right text-emerald-400/80">{formatNumber(m.free_requests)}</div>
                  <div className="w-20 text-right text-amber-400/80">{formatNumber(m.paid_requests)}</div>
                  <div className="w-20 text-right text-white/50">{formatNumber(m.unique_users)}</div>
                  <div className="w-16 text-right">
                    <div className="text-white/60">{m.share_pct}%</div>
                    <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                      <div className="h-full bg-blue-500/50 rounded-full" style={{ width: Math.max(m.share_pct, 1) + '%' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Support chat ──
function SupportTab() {
  var [conversations, setConversations] = useState([]);
  var [total, setTotal] = useState(0);
  var [page, setPage] = useState(1);
  var [search, setSearch] = useState('');
  var [searchInput, setSearchInput] = useState('');
  var [selectedId, setSelectedId] = useState(null);
  var [detail, setDetail] = useState(null);
  var [messages, setMessages] = useState([]);
  var [reply, setReply] = useState('');
  var [sending, setSending] = useState(false);
  var [loadingDetail, setLoadingDetail] = useState(false);
  var limit = 20;

  function fetchConversations() {
    var token = getToken();
    if (!token) return;
    var params = 'page=' + page + '&limit=' + limit;
    if (search) params += '&search=' + encodeURIComponent(search);
    adminFetch('/api/admin/support/conversations?' + params, { headers: getHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setConversations(d.conversations || []);
        setTotal(d.total || 0);
      })
      .catch(function() {});
  }

  function fetchDetail(id) {
    var token = getToken();
    if (!token || !id) return;
    setLoadingDetail(true);
    adminFetch('/api/admin/support/conversations/' + id, { headers: getHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setDetail(d.conversation || null);
        setMessages(d.messages || []);
      })
      .catch(function() {})
      .finally(function() { setLoadingDetail(false); });
  }

  useEffect(function() { fetchConversations(); }, [page, search]);

  useEffect(function() {
    if (!selectedId) return undefined;
    fetchDetail(selectedId);
    var timer = setInterval(function() { fetchDetail(selectedId); }, 5000);
    return function() { clearInterval(timer); };
  }, [selectedId]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleSendReply(e) {
    e.preventDefault();
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    adminFetch('/api/admin/support/conversations/' + selectedId + '/messages', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content: reply.trim() }),
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setMessages(d.messages || []);
        setReply('');
        setDetail(function(prev) { return prev ? { ...prev, handoff_to_human: true } : prev; });
        fetchConversations();
      })
      .catch(function() {})
      .finally(function() { setSending(false); });
  }

  function handleResumeAi() {
    if (!selectedId) return;
    adminFetch('/api/admin/support/conversations/' + selectedId + '/resume-ai', {
      method: 'POST',
      headers: getHeaders(),
    })
      .then(function(r) { return r.json(); })
      .then(function() {
        setDetail(function(prev) { return prev ? { ...prev, handoff_to_human: false } : prev; });
        fetchConversations();
      })
      .catch(function() {});
  }

  function formatTime(value) {
    if (!value) return '—';
    return new Date(String(value).replace(' ', 'T') + 'Z').toLocaleString('ru-RU');
  }

  function conversationTitle(c) {
    if (c.user_email) return c.user_name ? c.user_name + ' · ' + c.user_email : c.user_email;
    return 'Гость · ' + (c.guest_token || '').slice(0, 10);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[560px]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="text-white/50 text-xs font-mono uppercase tracking-wider">Диалоги поддержки</div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={searchInput}
              onChange={function(e) { setSearchInput(e.target.value); }}
              placeholder="Email, имя, текст..."
              className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button type="submit" className="px-3 py-2 rounded-xl text-xs text-white/70 hover:text-white cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={14} />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-white/25 text-xs font-mono">Нет диалогов</div>
          ) : conversations.map(function(c) {
            var active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={function() { setSelectedId(c.id); }}
                className={'w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors cursor-pointer ' + (active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-white/85 text-xs font-medium truncate">{conversationTitle(c)}</div>
                  {c.handoff_to_human && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Оператор</span>
                  )}
                </div>
                <div className="text-white/35 text-[11px] mt-1 truncate">{c.last_message || 'Без сообщений'}</div>
                <div className="text-white/20 text-[10px] mt-1 font-mono">{formatTime(c.last_message_at || c.updated_at)}</div>
              </button>
            );
          })}
        </div>

        {total > limit && (
          <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/40">
            <button type="button" disabled={page <= 1} onClick={function() { setPage(function(p) { return p - 1; }); }} className="disabled:opacity-30 cursor-pointer">Назад</button>
            <span>{page} / {Math.ceil(total / limit)}</span>
            <button type="button" disabled={page >= Math.ceil(total / limit)} onClick={function() { setPage(function(p) { return p + 1; }); }} className="disabled:opacity-30 cursor-pointer">Вперёд</button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col min-h-[560px]">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-white/25 text-sm font-mono">Выберите диалог</div>
        ) : loadingDetail && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/25 text-sm font-mono">Загрузка...</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-white text-sm font-medium">{detail ? conversationTitle(detail) : 'Диалог #' + selectedId}</div>
                <div className="text-white/35 text-[11px] mt-0.5">
                  {detail?.handoff_to_human ? 'Ответы оператора, ИИ отключён' : 'Автоответы ИИ включены'}
                </div>
              </div>
              {detail?.handoff_to_human && (
                <button
                  type="button"
                  onClick={handleResumeAi}
                  className="text-[11px] px-3 py-1.5 rounded-lg text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  style={{ border: '1px solid rgba(16,185,129,0.25)', backgroundColor: 'rgba(16,185,129,0.08)' }}
                >
                  Вернуть ИИ
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(function(msg) {
                var isUser = msg.role === 'user';
                var isAdmin = msg.role === 'admin';
                return (
                  <div key={msg.id} className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words"
                      style={{
                        backgroundColor: isUser ? 'rgba(245,158,11,0.15)' : isAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid ' + (isUser ? 'rgba(251,191,36,0.25)' : isAdmin ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.08)'),
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-white/35 mb-1 font-mono">
                        {isUser ? 'Пользователь' : isAdmin ? 'Оператор' : 'ИИ'}
                      </div>
                      {msg.content}
                      <div className="text-[10px] text-white/25 mt-1 font-mono">{formatTime(msg.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendReply} className="p-4 border-t border-white/10 flex gap-2">
              <textarea
                value={reply}
                onChange={function(e) { setReply(e.target.value); }}
                rows={2}
                placeholder="Ответ пользователю..."
                className="flex-1 resize-none rounded-xl px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="self-end px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(96,165,250,0.35)', color: 'rgba(191,219,254,0.95)' }}
              >
                {sending ? '...' : 'Ответить'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Referrals ──
function ReferralsTab() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [search, setSearch] = useState('');

  function load() {
    if (!getToken()) return;
    setLoading(true);
    setError('');
    adminFetch('/api/admin/referrals')
      .then(function(r) { return r.ok ? r.json() : r.json().then(function(d) { throw new Error(d.error || 'Ошибка загрузки'); }); })
      .then(setData)
      .catch(function(e) { setError(e.message || 'Не удалось загрузить'); })
      .finally(function() { setLoading(false); });
  }

  useEffect(function() { load(); }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка реферальной статистики...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
        <p className="text-red-300 text-sm">{error}</p>
        <button type="button" onClick={load} className="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer">Повторить</button>
      </div>
    );
  }

  if (!data) return null;

  var q = search.trim().toLowerCase();
  var recent = (data.recent_referrals || []).filter(function(row) {
    if (!q) return true;
    return [row.referrer_email, row.referrer_name, row.referrer_code, row.referred_email, row.referred_name]
      .some(function(v) { return String(v || '').toLowerCase().includes(q); });
  });
  var top = (data.top_referrers || []).filter(function(row) {
    if (!q) return true;
    return [row.email, row.name, row.referral_code]
      .some(function(v) { return String(v || '').toLowerCase().includes(q); });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Реферальная программа</h2>
          <p className="text-white/40 text-xs font-mono mt-1">
            {data.bonus_rub} ₽ пригласившему и {data.bonus_rub} ₽ новому пользователю · ссылка: {data.link_format}
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      <div className={'rounded-xl border px-4 py-3 text-sm ' + (
        data.promo_active
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
          : 'border-white/10 bg-white/[0.03] text-white/50'
      )}>
        {data.promo_active
          ? ('Промо-модалка активна до ' + new Date(data.promo_until).toLocaleString('ru-RU'))
          : ('Промо-модалка завершена (' + new Date(data.promo_until).toLocaleString('ru-RU') + ')')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Gift} label="Всего рефералов" value={formatNumber(data.totals.total_referrals)} sub={'+' + formatNumber(data.totals.referrals_today) + ' сегодня'} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={DollarSign} label="Выплачено пригласившим" value={formatCurrency(data.totals.total_referrer_bonus) + ' ₽'} sub="Сумма referrer_bonus" color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={Users} label="Пришли по ссылке" value={formatNumber(data.totals.referred_users)} sub={formatNumber(data.totals.users_with_code) + ' кодов выдано'} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={TrendingUp} label="Бонус за реферала" value={formatCurrency(data.bonus_rub) + ' ₽'} sub="Каждой стороне" color="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <h3 className="text-white/70 text-sm font-medium mb-4">Рефералы за 14 дней</h3>
        <ActivityChart data={data.chart || []} valueKey="count" labelKey="label" color="rgba(16,185,129,0.5)" />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            placeholder="Поиск по email, имени или коду..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm overflow-hidden">
          <h3 className="text-white/70 text-sm font-medium mb-4">Топ пригласивших</h3>
          {top.length === 0 ? (
            <p className="text-white/30 text-xs font-mono py-8 text-center">Нет данных</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-white/30 border-b border-white/10">
                    <th className="text-left py-2 pr-3">Пользователь</th>
                    <th className="text-left py-2 pr-3">Код</th>
                    <th className="text-right py-2 pr-3">Приглашено</th>
                    <th className="text-right py-2">Заработано</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map(function(row) {
                    return (
                      <tr key={row.id} className="border-b border-white/5 text-white/70 hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3">
                          <div className="text-white/90">{row.name || '—'}</div>
                          <div className="text-white/35 text-[10px]">{row.email}</div>
                        </td>
                        <td className="py-2.5 pr-3 text-emerald-300">{row.referral_code}</td>
                        <td className="py-2.5 pr-3 text-right">{row.invited_count}</td>
                        <td className="py-2.5 text-right text-emerald-300">{formatCurrency(row.earned_rub)} ₽</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm overflow-hidden">
          <h3 className="text-white/70 text-sm font-medium mb-4">Последние рефералы</h3>
          {recent.length === 0 ? (
            <p className="text-white/30 text-xs font-mono py-8 text-center">Нет данных</p>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-[#0a0a0a]">
                  <tr className="text-white/30 border-b border-white/10">
                    <th className="text-left py-2 pr-3">Дата</th>
                    <th className="text-left py-2 pr-3">Пригласивший</th>
                    <th className="text-left py-2 pr-3">Новый пользователь</th>
                    <th className="text-right py-2">Бонус</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(function(row) {
                    return (
                      <tr key={row.id} className="border-b border-white/5 text-white/70">
                        <td className="py-2.5 pr-3 whitespace-nowrap">{row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td className="py-2.5 pr-3">
                          <div>{row.referrer_email}</div>
                          <div className="text-white/35 text-[10px]">{row.referrer_code}</div>
                        </td>
                        <td className="py-2.5 pr-3">{row.referred_email}</td>
                        <td className="py-2.5 text-right text-emerald-300">+{formatCurrency(row.referrer_bonus_rub)} ₽</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatShortDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

// ── Tab: Promo Codes ──
function PromoCodesTab() {
  var [codes, setCodes] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [showCreate, setShowCreate] = useState(false);
  var [createForm, setCreateForm] = useState({ code: '', amount_type: 'fixed', amount_value: '', max_uses: '100', expires_at: '', description: '' });
  var [creating, setCreating] = useState(false);
  var [createErr, setCreateErr] = useState('');

  function load() {
    if (!getToken()) return;
    setLoading(true);
    setError('');
    adminFetch('/api/admin/promo-codes')
      .then(function(r) { return r.ok ? r.json() : r.json().then(function(d) { throw new Error(d.error || 'Ошибка загрузки'); }); })
      .then(setCodes)
      .catch(function(e) { setError(e.message || 'Не удалось загрузить'); })
      .finally(function() { setLoading(false); });
  }

  useEffect(function() { load(); }, []);

  function togglePromo(id) {
    adminFetch('/api/admin/promo-codes/' + id, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + getToken() },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.message) load(); })
      .catch(function(err) { alert('Ошибка: ' + err.message); });
  }

  function deletePromo(id, code) {
    if (!window.confirm('Удалить промокод «' + code + '»?')) return;
    adminFetch('/api/admin/promo-codes/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.message) load(); })
      .catch(function(err) { alert('Ошибка: ' + err.message); });
  }

  function handleCreate(e) {
    e.preventDefault();
    setCreateErr('');
    setCreating(true);
    adminFetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(createForm),
    })
      .then(function(r) { return r.json().then(function(d) { return { status: r.status, data: d }; }); })
      .then(function(res) {
        if (res.status !== 200) {
          setCreateErr(res.data.error || 'Ошибка создания');
        } else {
          setShowCreate(false);
          setCreateForm({ code: '', amount_type: 'fixed', amount_value: '', max_uses: '100', expires_at: '', description: '' });
          load();
        }
        setCreating(false);
      })
      .catch(function(err) {
        setCreateErr(err.message || 'Ошибка соединения');
        setCreating(false);
      });
  }

  if (loading && codes.length === 0) {
    return <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">Загрузка промокодов...</div>;
  }

  if (error && codes.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
        <p className="text-red-300 text-sm">{error}</p>
        <button type="button" onClick={load} className="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer">Повторить</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Промокоды</h2>
          <p className="text-white/40 text-xs font-mono mt-1">{codes.length} кодов</p>
        </div>
        <button type="button" onClick={function() { setShowCreate(true); setCreateErr(''); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer">
          <Plus size={14} /> Создать код
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        {codes.length === 0 ? (
          <div className="py-12 text-center text-white/20 text-sm font-mono">Нет промокодов</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-white/30 border-b border-white/10">
                  <th className="text-left py-3 px-4">Код</th>
                  <th className="text-left py-3 px-4">Тип</th>
                  <th className="text-right py-3 px-4">Значение</th>
                  <th className="text-center py-3 px-4">Использовано</th>
                  <th className="text-center py-3 px-4">Макс.</th>
                  <th className="text-center py-3 px-4">Статус</th>
                  <th className="text-left py-3 px-4">Срок</th>
                  <th className="text-left py-3 px-4">Описание</th>
                  <th className="text-center py-3 px-4 w-28">Действия</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(function(c) {
                  var expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
                  var status = expired ? 'Истёк' : (c.is_active ? 'Активен' : 'Неактивен');
                  var statusColor = expired ? 'text-red-400' : (c.is_active ? 'text-emerald-400' : 'text-amber-400');
                  return (
                    <tr key={c.id} className="border-b border-white/[0.02] text-white/70 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-white/90">{c.code}</td>
                      <td className="py-3 px-4 text-white/50">{c.amount_type === 'percent' ? '%' : '₽'}</td>
                      <td className="py-3 px-4 text-right">{c.amount_type === 'percent' ? c.amount_value + '%' : formatCurrency(c.amount_value) + ' ₽'}</td>
                      <td className="py-3 px-4 text-center text-white/50">{c.used_count || 0}</td>
                      <td className="py-3 px-4 text-center text-white/50">{c.max_uses}</td>
                      <td className={'py-3 px-4 text-center font-medium ' + statusColor}>{status}</td>
                      <td className="py-3 px-4 text-white/50">{c.expires_at ? c.expires_at.slice(0, 10) : '—'}</td>
                      <td className="py-3 px-4 text-white/50 truncate max-w-[200px]">{c.description || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={function() { togglePromo(c.id); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            title={c.is_active ? 'Деактивировать' : 'Активировать'}>
                            {c.is_active ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} className="text-white/30" />}
                          </button>
                          <button onClick={function() { deletePromo(c.id, c.code); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer" title="Удалить">
                            <Trash2 size={14} className="text-red-400/70" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Promo Code Modal ── */}
      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={function(e) { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 backdrop-blur-xl shadow-2xl" onClick={function(e) { e.stopPropagation(); }}>
            <h3 className="text-white font-semibold text-base mb-5">Создать промокод</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Код</label>
                <input type="text" required value={createForm.code}
                  onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { code: e.target.value }); }); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="SUMMER2026" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Тип</label>
                  <select value={createForm.amount_type}
                    onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { amount_type: e.target.value }); }); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono cursor-pointer">
                    <option value="fixed">Фикс. (₽)</option>
                    <option value="percent">Процент (%)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Значение</label>
                  <input type="number" required min="1" step="0.01" value={createForm.amount_value}
                    onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { amount_value: e.target.value }); }); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" />
                </div>
              </div>
              <div>
                <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Макс. использований</label>
                <input type="number" min="1" value={createForm.max_uses}
                  onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { max_uses: e.target.value }); }); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" />
              </div>
              <div>
                <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Срок действия (опционально)</label>
                <input type="date" value={createForm.expires_at}
                  onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { expires_at: e.target.value }); }); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" />
              </div>
              <div>
                <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Описание</label>
                <input type="text" value={createForm.description}
                  onChange={function(e) { setCreateForm(function(p) { return Object.assign({}, p, { description: e.target.value }); }); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-all font-mono" placeholder="Для чего этот код" />
              </div>
              {createErr ? (
                <div className="text-red-300 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{createErr}</div>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={function() { setShowCreate(false); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50">
                  {creating ? '...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

var quickPaths = ['/', '/models', '/pricing', '/blog', '/demo'];

function HeatmapTab() {
  var [tab, setTab] = useState('overview');
  var [summary, setSummary] = useState(null);
  var [clickPts, setClickPts] = useState([]);
  var [mousePts, setMousePts] = useState([]);
  var [scrollBuckets, setScrollBuckets] = useState([]);
  var [rageItems, setRageItems] = useState([]);
  var [sessionData, setSessionData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [selPath, setSelPath] = useState('/');
  var [htType, setHtType] = useState('click');
  var canvasRef = useRef(null);
  var wrapRef = useRef(null);

  var PAGE_SECTIONS = {
    '/': [
      { name: 'Hero / Первый экран', yStart: 0, yEnd: 750, color: 'rgba(59,130,246,0.2)' },
      { name: 'Возможности', yStart: 750, yEnd: 1400, color: 'rgba(16,185,129,0.2)' },
      { name: 'Модели (Showcase)', yStart: 1400, yEnd: 2100, color: 'rgba(251,191,36,0.2)' },
      { name: 'Тарифы (Pricing)', yStart: 2100, yEnd: 3600, color: 'rgba(236,72,153,0.2)' },
      { name: 'FAQ', yStart: 3600, yEnd: 4200, color: 'rgba(249,115,22,0.2)' },
      { name: 'Подвал', yStart: 4200, yEnd: 4600, color: 'rgba(107,114,128,0.2)' },
    ],
    '/models': [
      { name: 'Шапка', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Поиск / Категории', yStart: 80, yEnd: 180, color: 'rgba(59,130,246,0.2)' },
      { name: 'Сетка моделей', yStart: 180, yEnd: 2500, color: 'rgba(16,185,129,0.2)' },
      { name: 'Подвал', yStart: 2500, yEnd: 2800, color: 'rgba(107,114,128,0.2)' },
    ],
    '/pricing': [
      { name: 'Шапка', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Тарифы', yStart: 80, yEnd: 900, color: 'rgba(236,72,153,0.2)' },
      { name: 'FAQ / Детали', yStart: 900, yEnd: 1500, color: 'rgba(249,115,22,0.2)' },
      { name: 'Подвал', yStart: 1500, yEnd: 1800, color: 'rgba(107,114,128,0.2)' },
    ],
    '/blog': [
      { name: 'Шапка', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Список статей', yStart: 80, yEnd: 2000, color: 'rgba(16,185,129,0.2)' },
      { name: 'Подвал', yStart: 2000, yEnd: 2300, color: 'rgba(107,114,128,0.2)' },
    ],
  };

  function loadAll() {
    if (!getToken()) return;
    setLoading(true);
    var token = getToken();
    var h = 24;

    adminFetch('/api/admin/analytics/summary?hours=' + h, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setSummary(d); }).catch(function() {});

    adminFetch('/api/admin/analytics/sessions?hours=' + h, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setSessionData(d); }).catch(function() {});

    adminFetch('/api/admin/analytics/scroll-depth?hours=' + h, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setScrollBuckets(d.buckets || []); }).catch(function() {});

    adminFetch('/api/admin/analytics/rage-clicks?hours=' + h, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setRageItems(d.items || []); }).catch(function() {});

    loadHeatmap(token, '/', true);
    setLoading(false);
  }

  function loadHeatmap(token, path) {
    var enc = encodeURIComponent(path || selPath);
    var p = path || selPath;
    var h = 24;
    adminFetch('/api/admin/analytics/heatmap-click?hours=' + h + '&path=' + enc + '&grid_size=24', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setClickPts(d.points || []); }).catch(function() {});
    adminFetch('/api/admin/analytics/heatmap-mouse?hours=' + h + '&path=' + enc + '&grid_size=32', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d) setMousePts(d.points || []); }).catch(function() {});
  }

  useEffect(function() { loadAll(); }, []);

  function getSections(p) { return PAGE_SECTIONS[p] || PAGE_SECTIONS[(p || '').replace(/\/$/, '')] || null; }

  function draw() {
    if (!canvasRef.current || !wrapRef.current) return;
    var points = htType === 'mouse' ? mousePts : clickPts;
    var canvas = canvasRef.current;
    var wrap = wrapRef.current;
    var w = wrap.clientWidth || 800;
    var maxY = (!points || points.length === 0) ? 2000 : Math.max.apply(null, points.map(function(p) { return p.y; })) + 400;
    maxY = Math.max(maxY, 1200);
    var h = Math.max(300, Math.min(700, maxY * (w / 1920)));
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    var scaleY = canvas.height / maxY;
    var scaleX = canvas.width / 1920;

    var sections = getSections(selPath);
    if (sections) {
      for (var si = 0; si < sections.length; si++) {
        var sec = sections[si];
        ctx.fillStyle = sec.color;
        ctx.fillRect(0, Math.round(sec.yStart * scaleY), canvas.width, Math.round((sec.yEnd - sec.yStart) * scaleY));
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(sec.name, 4, Math.round(sec.yStart * scaleY) + 12);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Math.round(sec.yStart * scaleY)); ctx.lineTo(canvas.width, Math.round(sec.yStart * scaleY)); ctx.stroke();
      }
    }

    if (!points || points.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Нет данных для отображения', canvas.width / 2, canvas.height / 2); return;
    }

    var maxCount = Math.max.apply(null, points.map(function(p) { return p.count; }));
    if (maxCount === 0) return;
    for (var j = 0; j < points.length; j++) {
      var p = points[j];
      if (p.x == null || p.y == null) continue;
      var intensity = p.count / maxCount;
      var radius = Math.max(3, intensity * 16);
      var cx = p.x * scaleX, cy = p.y * scaleY;
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3);
      if (htType === 'mouse') {
        grad.addColorStop(0, 'rgba(59, 130, 246, ' + (0.5 * intensity) + ')');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, ' + (0.15 * intensity) + ')');
      } else {
        grad.addColorStop(0, 'rgba(251, 191, 36, ' + (0.6 * intensity) + ')');
        grad.addColorStop(0.5, 'rgba(251, 146, 60, ' + (0.2 * intensity) + ')');
      }
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('Точек: ' + points.length + ' | Макс: ' + maxCount + ' | ' + selPath, 8, 14);
  }

  useEffect(function() { if (!loading) draw(); }, [clickPts, mousePts, selPath, htType, loading]);

  var subs = [{ id: 'overview', label: 'Обзор' }, { id: 'heatmap', label: 'Тепловая карта' }, { id: 'scroll', label: 'Глубина скролла' }, { id: 'rage', label: 'Rage клики' }];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">Трекинг посетителей</h2>
        <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"><RefreshCw size={12} /> Обновить</button>
      </div>

      {summary && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Посетители" value={formatNumber(summary.unique_visitors)} sub="за 24ч" color="bg-blue-500/20 text-blue-300" />
        <StatCard icon={Activity} label="События" value={formatNumber(summary.total_events)} sub="всего" color="bg-emerald-500/20 text-emerald-300" />
        <StatCard icon={Clock} label="Сессии" value={sessionData ? formatNumber(sessionData.total_sessions) : '...'} sub={sessionData ? sessionData.avg_pages_per_session + ' стр/сесс' : ''} color="bg-violet-500/20 text-violet-300" />
        <StatCard icon={ScrollText} label="Скролл" value={(scrollBuckets.slice(-1)[0]?.bucket || 0) + '%'} sub={'последний бакет'} color="bg-amber-500/20 text-amber-300" />
        <StatCard icon={Zap} label="Rage клики" value={formatNumber(rageItems.reduce(function(s, r) { return s + r.count; }, 0))} sub="за 24ч" color="bg-red-500/20 text-red-300" />
      </div>}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {subs.map(function(t) { return (
          <button key={t.id} onClick={function() { setTab(t.id); }}
            className={'px-4 py-2 rounded-xl text-xs font-mono transition-colors ' + (tab === t.id ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : 'text-white/50 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]')}>
            {t.label}
          </button>
        );})}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <h3 className="text-white/70 text-sm font-medium mb-4">Топ страниц</h3>
            <div className="space-y-2">
              {(summary?.top_pages || []).length === 0 ? <div className="text-white/20 text-xs font-mono py-8 text-center">Нет данных</div>
                : (summary?.top_pages || []).map(function(row) { return (
                  <div key={row.path} className="flex items-center justify-between py-2 border-b border-white/[0.02] text-xs font-mono">
                    <span className="text-white/70 truncate">{row.path}</span>
                    <span className="text-white/40 shrink-0 ml-3">{row.count}</span>
                  </div>
                );})}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <h3 className="text-white/70 text-sm font-medium mb-4">Типы событий</h3>
            <div className="space-y-2">
              {(summary?.event_types || []).length === 0 ? <div className="text-white/20 text-xs font-mono py-8 text-center">Нет данных</div>
                : (summary?.event_types || []).map(function(row) { return (
                  <div key={row.type} className="flex items-center justify-between py-2 border-b border-white/[0.02] text-xs font-mono">
                    <span className="text-white/70">{row.type}</span>
                    <span className="text-white/40">{row.count}</span>
                  </div>
                );})}
            </div>
          </div>
        </div>
      )}

      {tab === 'heatmap' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={selPath} onChange={function(e) { setSelPath(e.target.value); loadHeatmap(getToken(), e.target.value); }}
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-mono outline-none cursor-pointer">
              {quickPaths.concat(['/account', '/faq', '/docs']).map(function(p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
            <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/10">
              {[{ id: 'click', label: 'Клики' }, { id: 'mouse', label: 'Мышь' }].map(function(t) { return (
                <button key={t.id} onClick={function() { setHtType(t.id); }}
                  className={'px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ' + (htType === t.id ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/40 hover:text-white/70')}>
                  {t.label}
                </button>
              );})}
            </div>
          </div>
          <div ref={wrapRef} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden backdrop-blur-sm">
            <canvas ref={canvasRef} className="w-full" />
          </div>
        </div>
      )}

      {tab === 'scroll' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <h3 className="text-white/70 text-sm font-medium mb-4">Глубина скролла (за 24ч)</h3>
          {scrollBuckets.length === 0 ? <div className="text-white/20 text-xs font-mono py-8 text-center">Нет данных</div>
            : <div className="space-y-2">
                {scrollBuckets.map(function(b) {
                  var maxB = Math.max.apply(null, scrollBuckets.map(function(x) { return x.count; }));
                  var pct = maxB > 0 ? Math.round((b.count / maxB) * 100) : 0;
                  return (
                    <div key={b.bucket} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-10 text-right text-white/50">{b.bucket}%</span>
                      <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden">
                        <div className="h-full rounded bg-cyan-500/50 transition-all" style={{ width: pct + '%' }} />
                      </div>
                      <span className="w-12 text-right text-white/40">{b.count}</span>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {tab === 'rage' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <h3 className="text-white/70 text-sm font-medium mb-4">Rage клики (за 24ч)</h3>
          {rageItems.length === 0 ? <div className="text-white/20 text-xs font-mono py-8 text-center">Нет rage-кликов</div>
            : <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead><tr className="text-white/30 border-b border-white/10">
                    <th className="text-left py-2 pr-3">Элемент</th>
                    <th className="text-left py-2 pr-3">Текст</th>
                    <th className="text-left py-2 pr-3">Страница</th>
                    <th className="text-right py-2 pr-3">Кол-во</th>
                    <th className="text-right py-2">Последний</th>
                  </tr></thead>
                  <tbody>{rageItems.map(function(item) { return (
                    <tr key={item.element + item.path + item.text} className="border-b border-white/[0.02] text-white/70">
                      <td className="py-2.5 pr-3 text-white/50">{item.element || '—'}</td>
                      <td className="py-2.5 pr-3 truncate max-w-[200px]">{item.text || '—'}</td>
                      <td className="py-2.5 pr-3 text-white/50">{item.path}</td>
                      <td className="py-2.5 pr-3 text-right text-red-300">{item.count}</td>
                      <td className="py-2.5 text-right text-white/40">{item.last_seen ? item.last_seen.slice(0, 16) : '—'}</td>
                    </tr>
                  );})}</tbody>
                </table>
              </div>
          }
        </div>
      )}
    </div>
  );
}

function UsersDashboardTab() {
  var [data, setData] = useState(null);
  var [days, setDays] = useState(14);

  useEffect(function() {
    var token = getToken();
    if (!token) return;
    adminFetch('/api/admin/users/dashboard?days=' + days, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setData).catch(function() {});
  }, [days]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка...
      </div>
    );
  }

  var totals = data.totals || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Всего" value={formatNumber(totals.total_users)} sub="Пользователей" color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={UserPlus} label="Новых сегодня" value={formatNumber(totals.users_today)} sub={'За 24ч'} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={UserPlus} label="Новых за неделю" value={formatNumber(totals.users_this_week)} sub={'За 7 дней'} color="bg-cyan-500/20 text-cyan-400" />
        <StatCard icon={Activity} label="Активны сегодня" value={formatNumber(totals.active_today)} sub="Писали сообщения" color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={Activity} label="Активны за неделю" value={formatNumber(totals.active_this_week)} sub="Писали сообщения" color="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Регистрации</span>
            <select value={days} onChange={function(e) { setDays(parseInt(e.target.value)); }}
              className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-white/60 text-[10px] font-mono outline-none">
              <option value={7}>7 дней</option>
              <option value={14}>14 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>
          </div>
          <ActivityChart data={data.registration_chart} valueKey="count" labelKey="label" color="rgba(16,185,129,0.5)" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Активность (сообщения)</span>
          </div>
          <ActivityChart data={data.activity_chart} valueKey="count" labelKey="label" color="rgba(59,130,246,0.5)" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Активные пользователи (в день)</span>
          <ActivityChart data={data.active_users_chart} valueKey="count" labelKey="label" color="rgba(245,158,11,0.5)" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Активность агентов (сообщения в день)</span>
          <ActivityChart data={data.agent_chart} valueKey="count" labelKey="label" color="rgba(168,85,247,0.5)" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Регистрации по часам (24ч)</span>
        <ActivityChart data={data.hourly_signups} valueKey="count" labelKey="label" color="rgba(236,72,153,0.5)" />
      </div>
    </div>
  );
}

// ── Corporate Clients Tab ──
function CorporateTab() {
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  function loadCorporate() {
    setLoading(true);
    setError('');
    var token = getToken();
    adminFetch('/api/admin/users?corporate=1&limit=999', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(function() { setError('Не удалось загрузить корпоративных клиентов'); setLoading(false); });
  }

  useEffect(loadCorporate, []);

  function handleToggle(u) {
    var token = getToken();
    adminFetch('/api/admin/users/' + u.id + '/corporate', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setUsers(function(prev) { return prev.filter(function(x) { return x.id !== u.id; }); });
      })
      .catch(function() {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white/30 text-xs font-mono">Корпоративные клиенты ({users.length})</span>
        <button onClick={loadCorporate} className="px-3 py-1.5 rounded-lg text-[11px] font-mono bg-white/5 text-white/50 hover:bg-white/10 transition-all cursor-pointer">Обновить</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm font-mono">Загрузка...</div>
      ) : error ? (
        <div className="flex items-center justify-center py-16 text-red-400 text-sm font-mono">{error}</div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm font-mono">Нет корпоративных клиентов</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
                <div className="flex-1">Имя</div>
                <div className="w-40">Email</div>
                <div className="w-20 text-right">Баланс</div>
                <div className="w-24 text-right">Дата</div>
                <div className="w-28 text-right">Действия</div>
              </div>
              {users.map(function(u) {
                return (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 flex items-center gap-1.5 text-white/80 truncate">
                      {u.name || '—'}
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/70 text-[8px] font-mono leading-none">К</span>
                    </div>
                    <div className="w-40 text-white/50 truncate">{u.email}</div>
                    <div className="w-20 text-right text-white/70">{formatCurrency(u.balance)} ₽</div>
                    <div className="w-24 text-right text-white/30">{u.created_at ? u.created_at.slice(0, 10) : '—'}</div>
                    <div className="w-28 text-right">
                      <button onClick={function() { handleToggle(u); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 text-white/40 hover:bg-red-500/15 hover:text-red-300 border border-white/10 hover:border-red-500/20 transition-all cursor-pointer">
                        Убрать
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlogTab() {
  var [posts, setPosts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [editingId, setEditingId] = useState(null);
  var [form, setForm] = useState({ slug: '', title: '', description: '', content: '[]', faq: '[]', image_url: '', read_minutes: '5', author: 'JustRouter', date_published: '' });
  var [saving, setSaving] = useState(false);

  var loadPosts = function loadPosts() {
    setLoading(true);
    setError('');
    adminFetch('/api/admin/blog')
      .then(function (r) { return r.json(); })
      .then(function (data) { setPosts(data || []); })
      .catch(function (e) { setError(e?.error || e?.message || 'Ошибка загрузки'); })
      .finally(function () { setLoading(false); });
  };

  useEffect(function () { loadPosts(); }, []);

  var resetForm = function resetForm() {
    setForm({ slug: '', title: '', description: '', content: '[]', faq: '[]', image_url: '', read_minutes: '5', author: 'JustRouter', date_published: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  var editPost = function editPost(post) {
    setForm({
      slug: post.slug || '',
      title: post.title || '',
      description: post.description || '',
      content: post.content ? (typeof post.content === 'string' ? post.content : JSON.stringify(post.content, null, 2)) : '[]',
      faq: post.faq ? (typeof post.faq === 'string' ? post.faq : JSON.stringify(post.faq, null, 2)) : '[]',
      image_url: post.image_url || '',
      read_minutes: String(post.read_minutes || '5'),
      author: post.author || 'JustRouter',
      date_published: post.date_published ? post.date_published.split('T')[0] : '',
    });
    setEditingId(post.id);
  };

  var handleSave = function handleSave() {
    if (!form.slug.trim() || !form.title.trim()) {
      setError('Заполните slug и заголовок');
      return;
    }
    setSaving(true);
    setError('');

    var data = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      read_minutes: parseInt(form.read_minutes) || 5,
      image_url: form.image_url.trim() || null,
      author: form.author.trim() || 'JustRouter',
      date_published: form.date_published || null,
    };

    // Parse JSON fields safely
    try { data.content = JSON.parse(form.content); } catch { data.content = []; }
    try { data.faq = JSON.parse(form.faq); } catch { data.faq = []; }

    var savePromise = editingId
      ? adminFetch('/api/admin/blog/' + editingId, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(function (r) { return r.json(); })
      : adminFetch('/api/admin/blog', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(function (r) { return r.json(); });

    savePromise
      .then(function () {
        loadPosts();
        resetForm();
      })
      .catch(function (e) { setError(e?.error || e?.message || 'Ошибка сохранения'); })
      .finally(function () { setSaving(false); });
  };

  var deletePost = function deletePost(id, title) {
    if (!confirm('Удалить статью «' + title + '»?')) return;
    adminFetch('/api/admin/blog/' + id, { method: 'DELETE' }).then(function () { loadPosts(); })
      .catch(function (e) { setError(e?.error || e?.message || 'Ошибка удаления'); });
  };

  var publishToggle = function publishToggle(post) {
    adminFetch('/api/admin/blog/' + post.id, { method: 'PUT', body: JSON.stringify({ is_published: !post.is_published }), headers: { 'Content-Type': 'application/json' } }).then(function () { loadPosts(); })
      .catch(function (e) { setError(e?.error || e?.message || 'Ошибка'); });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Управление блогом</h2>
        <button
          onClick={function () { editingId ? resetForm() : editPost({}); }}
          className={'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ' + (editingId ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30')}
        >
          {editingId ? <X size={14} /> : <PenSquare size={14} />}
          {editingId ? 'Отмена' : 'Новая статья'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
          {error}
        </div>
      )}

      {/* Edit form */}
      {(editingId || form.title || form.slug) && (
        <div className="rounded-xl border border-white/10 p-4 sm:p-6 space-y-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-sm font-semibold text-white/80">{editingId ? 'Редактировать статью' : 'Новая статья'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Slug (URL)</label>
              <input value={form.slug} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { slug: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" placeholder="my-article-slug" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Заголовок</label>
              <input value={form.title} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { title: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" placeholder="Заголовок статьи" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-white/40">Описание (meta description)</label>
              <textarea value={form.description} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { description: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors resize-none" rows="2" placeholder="Краткое описание для превью и SEO" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Дата публикации</label>
              <input type="date" value={form.date_published} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { date_published: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Время чтения (мин)</label>
              <input type="number" value={form.read_minutes} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { read_minutes: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" min="1" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Автор</label>
              <input value={form.author} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { author: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">URL изображения</label>
              <input value={form.image_url} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { image_url: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-white/40">{'Содержание (JSON-массив секций: {heading, body}...)'}</label>
              <textarea value={form.content} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { content: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors resize-y font-mono" rows="6"
                placeholder='[{"heading": "Раздел 1", "body": "Текст раздела..."}]' />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-white/40">{'FAQ (JSON-массив: {question, answer}...)'}</label>
              <textarea value={form.faq} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { faq: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors resize-y font-mono" rows="3"
                placeholder='[{"question": "Вопрос?", "answer": "Ответ..."}]' />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40 cursor-pointer">
              {saving ? 'Сохранение...' : (editingId ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </div>
      )}

      {/* Posts table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Нет статей. Нажмите «Новая статья», чтобы создать первую.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(function (post) {
            return (
              <div key={post.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 transition-colors hover:border-white/20"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{post.title}</span>
                    <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + (post.is_published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400')}>
                      {post.is_published ? 'Опубликовано' : 'Черновик'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span>/{post.slug}</span>
                    <span>{post.read_minutes} мин</span>
                    {post.date_published && <span>{new Date(post.date_published).toLocaleDateString('ru-RU')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={function () { publishToggle(post); }}
                    className="p-2 rounded-lg transition-colors cursor-pointer"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseOver={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                    title={post.is_published ? 'Снять с публикации' : 'Опубликовать'}>
                    {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={function () { editPost(post); }}
                    className="p-2 rounded-lg transition-colors cursor-pointer"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseOver={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                    title="Редактировать">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={function () { deletePost(post.id, post.title); }}
                    className="p-2 rounded-lg transition-colors cursor-pointer"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseOver={function (e) { e.currentTarget.style.color = '#F87171'; }}
                    onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                    title="Удалить">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FaqTab() {
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [editingId, setEditingId] = useState(null);
  var [form, setForm] = useState({ question: '', answer: '', category: 'general', sort_order: '0' });
  var [saving, setSaving] = useState(false);

  var loadItems = function loadItems() {
    setLoading(true);
    setError('');
    adminFetch('/api/admin/faq')
      .then(function (r) { return r.json(); })
      .then(function (data) { setItems(data || []); })
      .catch(function (e) { setError('Ошибка загрузки'); })
      .finally(function () { setLoading(false); });
  };

  useEffect(function () { loadItems(); }, []);

  var resetForm = function resetForm() {
    setForm({ question: '', answer: '', category: 'general', sort_order: '0' });
    setEditingId(null);
  };

  var editItem = function editItem(item) {
    setForm({
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || 'general',
      sort_order: String(item.sort_order || '0'),
    });
    setEditingId(item.id);
  };

  var handleSave = function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }
    setSaving(true);
    setError('');

    var data = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim() || 'general',
      sort_order: parseInt(form.sort_order) || 0,
    };

    var savePromise = editingId
      ? adminFetch('/api/admin/faq/' + editingId, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(function (r) { return r.json(); })
      : adminFetch('/api/admin/faq/', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(function (r) { return r.json(); });

    savePromise
      .then(function () { loadItems(); resetForm(); })
      .catch(function (e) { setError(e?.error || e?.message || 'Ошибка сохранения'); })
      .finally(function () { setSaving(false); });
  };

  var deleteItem = function deleteItem(id, question) {
    if (!confirm('Удалить вопрос «' + question.substring(0, 50) + '...»?')) return;
    adminFetch('/api/admin/faq/' + id, { method: 'DELETE' })
      .then(function () { loadItems(); })
      .catch(function () {});
  };

  var publishToggle = function publishToggle(item) {
    adminFetch('/api/admin/faq/' + item.id, { method: 'PUT', body: JSON.stringify({ is_published: !item.is_published }), headers: { 'Content-Type': 'application/json' } })
      .then(function () { loadItems(); })
      .catch(function () {});
  };

  // Group by category for display
  var grouped = {};
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var cat = item.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  var CATEGORY_LABELS = {
    general: 'Общие',
    service: 'О сервисе',
    payment: 'Оплата',
    models: 'Модели',
    account: 'Аккаунт',
    tech: 'Технические',
    subscription: 'Подписка',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Управление FAQ</h2>
        <button
          onClick={function () { editingId ? resetForm() : editItem({ id: null, question: '', answer: '', category: 'general', sort_order: 0 }); }}
          className={'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ' + (editingId ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30')}
        >
          {editingId ? <X size={14} /> : <Plus size={14} />}
          {editingId ? 'Отмена' : 'Новый вопрос'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
          {error}
        </div>
      )}

      {/* Edit form */}
      {(editingId || form.question || form.answer) && (
        <div className="rounded-xl border border-white/10 p-4 sm:p-6 space-y-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-sm font-semibold text-white/80">{editingId ? 'Редактировать вопрос' : 'Новый вопрос'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-white/40">Вопрос</label>
              <input value={form.question} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { question: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" placeholder="Как ...?" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-white/40">Ответ</label>
              <textarea value={form.answer} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { answer: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors resize-y" rows="4" placeholder="Текст ответа..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Категория</label>
              <select value={form.category} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { category: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors">
                {Object.keys(CATEGORY_LABELS).map(function (k) {
                  return <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>;
                })}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Порядок сортировки</label>
              <input type="number" value={form.sort_order} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { sort_order: e.target.value }); }); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30 transition-colors" min="0" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40 cursor-pointer">
              {saving ? 'Сохранение...' : (editingId ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Нет вопросов. Нажмите «Новый вопрос», чтобы добавить первый.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map(function (cat) {
            var catItems = grouped[cat];
            var catLabel = CATEGORY_LABELS[cat] || cat;
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{catLabel}</span>
                  <span className="text-[10px] text-white/20">({catItems.length})</span>
                </div>
                {catItems.map(function (item) {
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 transition-colors hover:border-white/20"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{item.question}</span>
                          <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ' + (item.is_published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400')}>
                            {item.is_published ? 'Активен' : 'Скрыт'}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {item.answer.substring(0, 100)}{item.answer.length > 100 ? '...' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={function () { publishToggle(item); }}
                          className="p-2 rounded-lg transition-colors cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                          onMouseOver={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                          onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                          title={item.is_published ? 'Скрыть' : 'Опубликовать'}>
                          {item.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={function () { editItem(item); }}
                          className="p-2 rounded-lg transition-colors cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                          onMouseOver={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                          onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                          title="Редактировать">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={function () { deleteItem(item.id, item.question); }}
                          className="p-2 rounded-lg transition-colors cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                          onMouseOver={function (e) { e.currentTarget.style.color = '#F87171'; }}
                          onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                          title="Удалить">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Session Recording (total user monitoring / replay) ──
function SessionRecordingTab() {
  var [view, setView] = useState('list'); // 'list' | 'replay'
  var [recordings, setRecordings] = useState([]);
  var [total, setTotal] = useState(0);
  var [loading, setLoading] = useState(true);
  var [selectedRec, setSelectedRec] = useState(null);
  var [events, setEvents] = useState([]);
  var [searchTerm, setSearchTerm] = useState('');
  var [page, setPage] = useState(0);
  var pageSize = 20;

  // ── Replay state ──
  var replayRef = useRef(null);
  var animRef = useRef(null);
  var timeRef = useRef(0);
  var playingRef = useRef(false);
  var [playing, setPlaying] = useState(false);
  var [speed, setSpeed] = useState(1);
  var [currentTime, setCurrentTime] = useState(0);
  var [duration, setDuration] = useState(0);
  var [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  var [cursorVisible, setCursorVisible] = useState(false);
  var [clickFlash, setClickFlash] = useState(null);
  var [currentUrl, setCurrentUrl] = useState('');
  var [scrollY, setScrollY] = useState(0);
  var [maxScroll, setMaxScroll] = useState(1000);
  var [replayEvents, setReplayEvents] = useState([]);

  function loadRecordings() {
    setLoading(true);
    var token = getToken();
    var params = '?limit=' + pageSize + '&offset=' + (page * pageSize);
    if (searchTerm) params += '&visitor_id=' + encodeURIComponent(searchTerm);
    adminFetch('/api/admin/recordings' + params, { headers: getHeaders() })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (d) { setRecordings(d.recordings || []); setTotal(d.total); }
      })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }

  useEffect(function() { loadRecordings(); }, [page, searchTerm]);

  function openReplay(rec) {
    setView('replay');
    setSelectedRec(rec);
    timeRef.current = 0;
    playingRef.current = false;
    setPlaying(false);
    setCurrentTime(0);
    setMousePos({ x: 0, y: 0 });
    setCursorVisible(false);
    setClickFlash(null);
    setScrollY(0);

    var token = getToken();
    adminFetch('/api/admin/recordings/' + rec.id, { headers: getHeaders() })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d) return;
        var evts = [];
        try { evts = JSON.parse(d.events || '[]'); } catch {}
        // Sort by time
        evts.sort(function(a, b) { return a.t - b.t; });
        setReplayEvents(evts);
        if (evts.length > 0) {
          var dur = evts[evts.length - 1].t - evts[0].t;
          setDuration(Math.max(dur, 1000));
          // Set initial URL
          var initialPage = evts.find(function(e) { return e.type === 'pageview'; });
          if (initialPage) setCurrentUrl(initialPage.data?.url || initialPage.data?.path || '');
        }
      })
      .catch(function() {});
  }

  function closeReplay() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    playingRef.current = false;
    setView('list');
    setSelectedRec(null);
    setPlaying(false);
  }

  function deleteRec(recId) {
    var token = getToken();
    adminFetch('/api/admin/recordings/' + recId, { method: 'DELETE', headers: getHeaders() })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function() { loadRecordings(); })
      .catch(function() {});
  }

  function formatRecDuration(secs) {
    if (!secs || secs < 0) return '<1s';
    if (secs < 60) return secs + 'с';
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return m + 'м ' + s + 'с';
  }

  function formatRecDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr.replace(' ', 'T') + 'Z');
      return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  }

  // ── Replay loop ──
  function startReplay() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaying(true);
    playingRef.current = true;
    var startTime = replayEvents.length > 0 ? replayEvents[0].t : 0;
    var lastFrameTime = performance.now();

    function frame(now) {
      if (!playingRef.current) return;

      var elapsed = now - lastFrameTime;
      lastFrameTime = now;
      var prev = timeRef.current;
      var next = prev + elapsed * speed;
      if (next >= duration) {
        timeRef.current = duration;
        setCurrentTime(duration);
        playingRef.current = false;
        setPlaying(false);
        renderEventsAtTime(startTime + duration);
        return;
      }
      timeRef.current = next;
      setCurrentTime(next);

      renderEventsAtTime(startTime + next);
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
  }

  function renderEventsAtTime(absTime) {
    // Find the last mousemove, click, scroll, pageview before absTime
    var lastMove = null;
    var lastClick = null;
    var lastScroll = null;
    var lastPageView = null;
    var lastInput = null;
    var clickTime = 0;

    for (var i = 0; i < replayEvents.length; i++) {
      var e = replayEvents[i];
      if (e.t > absTime) break;
      if (e.type === 'mousemove') lastMove = e;
      if (e.type === 'click') { lastClick = e; clickTime = e.t; }
      if (e.type === 'scroll') lastScroll = e;
      if (e.type === 'pageview') lastPageView = e;
      if (e.type === 'input') lastInput = e;
    }

    if (lastMove) setMousePos({ x: lastMove.data.x, y: lastMove.data.y });
    setCursorVisible(!!lastMove || !!lastClick);

    if (lastClick && absTime - clickTime < 200) {
      setClickFlash({ x: lastClick.data.pageX || lastClick.data.x, y: lastClick.data.pageY || lastClick.data.y });
    } else {
      setClickFlash(null);
    }

    if (lastScroll) { setScrollY(lastScroll.data.scrollY); if (lastScroll.data.maxScroll) setMaxScroll(lastScroll.data.maxScroll); }
    if (lastPageView) setCurrentUrl(lastPageView.data?.url || lastPageView.data?.path || '');
  }

  function pauseReplay() {
    playingRef.current = false;
    setPlaying(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }

  function togglePlay() {
    if (playingRef.current) pauseReplay();
    else startReplay();
  }

  function scrubTo(time) {
    timeRef.current = time;
    setCurrentTime(time);
    var startTime = replayEvents.length > 0 ? replayEvents[0].t : 0;
    renderEventsAtTime(startTime + time);
  }

  function formatTime(ms) {
    if (!ms || ms < 0) return '0:00';
    var totalSecs = Math.floor(ms / 1000);
    var mins = Math.floor(totalSecs / 60);
    var secs = totalSecs % 60;
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // Clean up on unmount
  useEffect(function() { return function() { if (animRef.current) cancelAnimationFrame(animRef.current); }; }, []);

  if (view === 'replay' && selectedRec) {
    var progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    var rec = selectedRec;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={closeReplay} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"><SkipBack size={12} /> Назад</button>
            <h2 className="text-white font-semibold text-lg">Просмотр сессии</h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-white/30">
            <span>{rec.user_name || 'Гость'}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{formatRecDuration(rec.duration_secs)}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{rec.event_count || 0} событий</span>
          </div>
        </div>

        {/* Player controls */}
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Timeline */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max={Math.max(duration, 1)}
              value={currentTime}
              onChange={function(e) { scrubTo(Number(e.target.value)); }}
              className="w-full h-1 appearance-none rounded-full cursor-pointer"
              style={{
                background: 'linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ' + progress + '%, rgba(255,255,255,0.06) ' + progress + '%, rgba(255,255,255,0.06) 100%)',
                outline: 'none',
                accentColor: 'white',
              }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ' + (playing ? 'text-white/70 hover:text-white' : 'text-white/70 hover:text-white')}
                style={{ backgroundColor: playing ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)' }}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing ? 'Пауза' : 'Старт'}
              </button>

              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 4].map(function(s) {
                  return (
                    <button key={s} onClick={function() { setSpeed(s); }}
                      className={'px-2 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ' + (speed === s ? 'text-white' : 'text-white/30 hover:text-white/60')}
                      style={{ backgroundColor: speed === s ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                      {s}x
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs font-mono text-white/40">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Virtual browser viewport */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0a0a0f' }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            </div>
            <div className="flex-1 mx-3 px-3 py-1 rounded-lg text-xs font-mono truncate" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
              {currentUrl || 'about:blank'}
            </div>
          </div>

          {/* Viewport content */}
          <div className="relative w-full" style={{ height: '480px', maxHeight: '60vh', overflow: 'hidden' }}>
            {/* Page content visualization */}
            <div className="absolute inset-0 p-6" style={{ transform: 'translateY(' + (-scrollY * 0.5) + 'px)' }}>
              <div className="space-y-4">
                <div className="h-4 w-1/3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                <div className="h-4 w-1/2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                <div className="h-24 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-20 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  <div className="h-20 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  <div className="h-20 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                </div>
                <div className="h-4 w-2/3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                <div className="h-4 w-1/4 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                <div className="h-32 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute right-2 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="w-full rounded-full" style={{
                height: Math.max(5, (480 / maxScroll) * 100) + '%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(' + Math.min((scrollY / maxScroll) * 100, 100) + '%)',
              }} />
            </div>

            {/* Mouse cursor */}
            {cursorVisible && (
              <div className="absolute pointer-events-none transition-all duration-75" style={{
                left: Math.min(mousePos.x, 95) + '%',
                top: Math.min(mousePos.y * 0.3, 90) + '%',
                width: '20px',
                height: '28px',
              }}>
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                  <path d="M2 2L2 23.5L6.5 18.5L11 26L13 25L8.5 17.5L18 17.5L2 2Z" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                </svg>
              </div>
            )}

            {/* Click flash */}
            {clickFlash && (
              <div className="absolute pointer-events-none" style={{
                left: Math.min(clickFlash.x * 0.05, 90) + '%',
                top: Math.min(clickFlash.y * 0.03, 85) + '%',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: 'translate(-50%, -50%) scale(0)',
                animation: 'clickFlash 0.3s ease-out forwards',
              }} />
            )}
          </div>

          {/* Event log */}
          <div className="px-4 py-2 text-xs font-mono text-white/20" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', maxHeight: '60px', overflowY: 'auto' }}>
            <div className="flex gap-1">
              <Clock size={10} />
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1">·</span>
              <span>{replayEvents.filter(function(e) { return e.t <= (replayEvents[0]?.t || 0) + currentTime; }).length} событий</span>
              {selectedRec && <><span className="mx-1">·</span><span>Всего: {replayEvents.length}</span></>}
            </div>
          </div>
        </div>

        {/* Recording info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoCard label="Посетитель" value={rec.visitor_id?.slice(0, 16) + '...' || 'N/A'} />
          <InfoCard label="Пользователь" value={rec.user_name || rec.user_email || 'Гость'} />
          <InfoCard label="Страниц" value={rec.page_count || 0} />
          <InfoCard label="Дата" value={formatRecDate(rec.start_at)} />
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Запись сессий</h2>
          <p className="text-white/30 text-xs font-mono mt-0.5">Детальная запись действий каждого пользователя</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Поиск по visitor_id..."
            value={searchTerm}
            onChange={function(e) { setSearchTerm(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-xl text-xs font-mono outline-none w-48"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
          />
          <button onClick={loadRecordings} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"><RefreshCw size={12} /></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/20 text-xs font-mono">Загрузка...</div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-12">
          <Monitor size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/20 text-xs font-mono">Нет записанных сессий</p>
          <p className="text-white/10 text-xs font-mono mt-1">Данные появятся после активности пользователей</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map(function(rec) {
            return (
              <div key={rec.id}
                className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer hover:bg-white/[0.02]"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={function() { openReplay(rec); }}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                    <Video size={14} style={{ color: 'rgba(59,130,246,0.5)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white/80 text-sm font-medium truncate">{rec.user_name || 'Гость'}</div>
                    <div className="text-white/30 text-xs font-mono truncate mt-0.5">
                      {rec.user_email || rec.visitor_id?.slice(0, 20) || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-white/50 text-xs font-mono">{formatRecDuration(rec.duration_secs)}</div>
                    <div className="text-white/20 text-xs font-mono mt-0.5">{rec.event_count || 0} соб. · {rec.page_count || 0} стр.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/30 text-xs font-mono">{formatRecDate(rec.start_at)}</div>
                  </div>
                  <button onClick={function(e) { e.stopPropagation(); if (confirm('Удалить запись сессии?')) deleteRec(rec.id); }}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={function() { setPage(Math.max(0, page - 1)); }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
            disabled={page === 0}>← Назад</button>
          <span className="text-xs font-mono text-white/30">{page + 1} / {Math.ceil(total / pageSize)}</span>
          <button onClick={function() { if ((page + 1) * pageSize < total) setPage(page + 1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer">Вперёд →</button>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-white/30 text-xs font-mono">{label}</div>
      <div className="text-white/70 text-sm font-mono mt-1 truncate">{String(value ?? '—')}</div>
    </div>
  );
}

// ── Admin Dashboard Layout ──
var ADMIN_TABS = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'models', label: 'Модели', icon: Cpu },
  { id: 'model-dashboard', label: 'Дашборд моделей', icon: TrendingUp },
  { id: 'model-logs', label: 'Логи моделей', icon: Layers },
  { id: 'corporate', label: 'Корп. клиенты', icon: Building2 },
  { id: 'referrals', label: 'Промокоды', icon: Gift },
  { id: 'promo-codes', label: 'Коды', icon: Key },
  { id: 'heatmap', label: 'Трекинг', icon: Activity },
  { id: 'users-dashboard', label: 'Дашборд юзеров', icon: Activity },
  { id: 'support', label: 'Поддержка', icon: MessageSquare },
  { id: 'blog', label: 'Блог', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'recording', label: 'Запись сессий', icon: Video },
];

function AdminDashboard({ onLogout }) {
  var [tab, setTab] = useState('overview');
  var TabIcon = ADMIN_TABS.find(function(t) { return t.id === tab; })?.icon || BarChart3;
  return (
    <div className="min-h-screen bg-black" style={{ backgroundColor: '#000' }}>
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-white/30" />
          <span className="text-white/50 text-xs font-mono">Admin</span>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 text-white/30 hover:text-white/70 text-xs font-mono transition-colors cursor-pointer">
          <LogOut size={12} /> Выйти
        </button>
      </div>
      <div className="flex gap-1 px-4 sm:px-6 pt-4 pb-2 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {ADMIN_TABS.map(function(t) {
          var active = t.id === tab;
          var Icon = t.icon;
          return (
            <button key={t.id} onClick={function() { setTab(t.id); }}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ' + (active ? 'text-white' : 'text-white/40 hover:text-white/70')}
              style={{ backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="p-4 sm:p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'models' && <ModelsTab />}
        {tab === 'model-logs' && <ModelLogsTab />}
        {tab === 'model-dashboard' && <ModelDashboardTab />}
        {tab === 'corporate' && <CorporateTab />}
        {tab === 'referrals' && <ReferralsTab />}
        {tab === 'promo-codes' && <PromoCodesTab />}
        {tab === 'heatmap' && <HeatmapTab />}
        {tab === 'users-dashboard' && <UsersDashboardTab />}
        {tab === 'support' && <SupportTab />}
        {tab === 'blog' && <BlogTab />}
        {tab === 'faq' && <FaqTab />}
        {tab === 'recording' && <SessionRecordingTab />}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  var [authed, setAuthed] = useState(false);
  var [login, setLogin] = useState('');
  var [password, setPassword] = useState('');
  var [showPw, setShowPw] = useState(false);
  var [error, setError] = useState('');
  var navigate = useNavigate();
  var [initCheck, setInitCheck] = useState(false);

  useEffect(function() {
    var token = getToken();
    if (!token) {
      setInitCheck(true);
      return;
    }
    adminFetch('/api/admin/overview')
      .then(function(r) {
        if (r.ok) {
          setAuthed(true);
          return;
        }
        clearAdminToken();
        setAuthed(false);
      })
      .catch(function() {
        clearAdminToken();
        setAuthed(false);
      })
      .finally(function() { setInitCheck(true); });
  }, []);

  useEffect(function() {
    function onExpired() { setAuthed(false); }
    window.addEventListener('velorix:admin-auth-expired', onExpired);
    return function() { window.removeEventListener('velorix:admin-auth-expired', onExpired); };
  }, []);

  var handleLogin = async function(e) {
    e.preventDefault();
    setError('');

    try {
      var res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      var data = await res.json();
      if (res.ok) {
        setAdminToken(data.token);
        setAuthed(true);
      } else {
        setError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Не удалось подключиться к серверу');
    }
  };

  if (!initCheck) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-white/30 text-xs font-mono">Загрузка...</div>
      </div>
    );
  }

  if (authed) {
    return <AdminDashboard onLogout={function() { clearAdminToken(); setAuthed(false); navigate('/'); }} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-12 rounded-2xl bg-white mx-auto flex items-center justify-center mb-4">
            <Shield size={24} className="text-black" />
          </div>
          <h1 className="text-white text-xl font-semibold">Админ-панель</h1>
          <p className="text-white/30 text-xs mt-1 font-mono">Управление сервисом</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/40 text-xs font-mono mb-1.5 ml-1">Логин</label>
            <input type="text" autoComplete="username" value={login} onChange={function(e) { setLogin(e.target.value); }} placeholder="admin" required
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 font-mono" />
          </div>
          <div>
            <label className="block text-white/40 text-xs font-mono mb-1.5 ml-1">Пароль</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="••••••••" required
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 font-mono" />
              <button type="button" onClick={function() { setShowPw(function(v) { return !v; }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400/80 text-xs font-mono text-center bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-solid-light text-sm font-medium hover:opacity-80 transition-all duration-200 mt-6 cursor-pointer">
            Войти <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={function() { navigate('/'); }}
            className="text-white/20 hover:text-white/50 text-xs font-mono transition-colors cursor-pointer">
            ← На главную
          </button>
        </div>
      </div>
    </div>
  );
}
