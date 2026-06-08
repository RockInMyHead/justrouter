import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Users, Bot, Activity, LogOut, Eye, EyeOff, ArrowLeft,
  Headphones, Shield, Search, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight,
  Key, Globe, Server, Cpu, DollarSign, RefreshCw, TrendingUp, MessageSquare,
  Calendar, ExternalLink, ScrollText, BarChart3, Filter, Zap, Gift, Trash, UserPlus, Building2, FileText,
  PenSquare, HelpCircle, Clock, Layers, Timer,
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
  );
}

// ── Tab 3: Models ──
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

// ── Tab 4: Providers / Analytics ──
function ProvidersTab() {
  var [data, setData] = useState(null);
  var [providers, setProviders] = useState([]);
  var [editId, setEditId] = useState(null);
  var [editProvider, setEditProvider] = useState({});
  var [showKey, setShowKey] = useState({});
  var [testingKey, setTestingKey] = useState({});
  var [testResults, setTestResults] = useState({});

  function fetchProviders() {
    var token = getToken();
    if (!token) return;
    adminFetch('/api/admin/providers', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setProviders).catch(function() {});
  }

  function fetchStats() {
    var token = getToken();
    if (!token) return;
    adminFetch('/api/admin/provider-stats', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(setData).catch(function() {});
  }

  useEffect(function() { fetchProviders(); fetchStats(); }, []);

  function startEdit(p) {
    setEditId(p.id);
    setEditProvider(Object.assign({}, p, { api_key: p.api_key || '' }));
  }

  function cancelEdit() {
    setEditId(null);
    setEditProvider({});
  }

  function saveEdit(p) {
    var token = getToken();
    var body = {};
    for (var key in editProvider) {
      if (editProvider[key] !== p[key]) body[key] = editProvider[key];
    }
    if (Object.keys(body).length === 0) { setEditId(null); return; }
    adminFetch('/api/admin/providers/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function(r) {
      if (r.ok) { setEditId(null); fetchProviders(); fetchStats(); }
    }).catch(function() {});
  }

  function toggleActive(p) {
    var token = getToken();
    adminFetch('/api/admin/providers/' + p.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ is_active: p.is_active ? 0 : 1 }),
    }).then(function(r) { if (r.ok) { fetchProviders(); fetchStats(); } }).catch(function() {});
  }

  function testKey(p) {
    var token = getToken();
    setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = true; return o; })()));
    setTestResults(Object.assign({}, testResults, (function() { var o = {}; o[p.id] = null; return o; })()));

    adminFetch('/api/admin/providers/' + p.id + '/test', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function(r) { return r.json(); })
      .then(function(result) {
        setTestResults(Object.assign({}, testResults, (function() { var o = {}; o[p.id] = result; return o; })()));
        setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = false; return o; })()));
      }).catch(function() {
        setTestingKey(Object.assign({}, testingKey, (function() { var o = {}; o[p.id] = false; return o; })()));
      });
  }

  function maskKey(key) {
    if (!key) return '—';
    if (key.length <= 8) return key.slice(0, 2) + '••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  }

  var providerStats = data ? data.providers : [];
  var totalMessages = data ? data.total_messages : 0;

  return (
    <div className="space-y-6">
      {/* Metrics bars */}
      {data && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Метрики провайдеров</span>
            <span className="text-white/20 text-xs font-mono">{totalMessages} сообщений</span>
          </div>
          <div className="space-y-3">
            {providerStats.map(function(s) {
              var barColor = 'bg-emerald-500';
              if (s.pct < 10) barColor = 'bg-white/30';
              else if (s.pct < 25) barColor = 'bg-amber-500';
              else if (s.pct < 50) barColor = 'bg-blue-500';
              else barColor = 'bg-green-500';
              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={'flex items-center gap-1.5 ' + (s.is_active ? 'text-white/70' : 'text-white/30')}>
                      <div className={'size-1.5 rounded-full ' + (s.is_active ? 'bg-emerald-400' : 'bg-white/20')} />
                      {s.name}
                      {!s.is_active && <span className="text-white/20">(выкл)</span>}
                      {s.api_key ? null : <span className="text-amber-400/60 text-[10px]">нет ключа</span>}
                    </span>
                    <span className="text-white/40">{s.pct}% &middot; {s.message_count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={'h-full rounded-full transition-all duration-500 ' + barColor} style={{ width: Math.max(s.pct, 1) + '%' }} />
                  </div>
                </div>
              );
            })}
            {totalMessages === 0 && (
              <div className="text-center py-4 text-white/20 text-xs font-mono">
                Нет сообщений для статистики
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider settings table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider mb-4 block">Настройки провайдеров</span>
        <div className="overflow-x-auto">
          <div className="min-w-[750px]">
            <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
              <div className="flex-1 min-w-[100px]">Провайдер</div>
              <div className="w-48">Base URL</div>
              <div className="w-48">API Key</div>
              <div className="w-16 text-center">Активен</div>
              <div className="w-16 text-center">Проверка</div>
              <div className="w-20 text-right">Действия</div>
            </div>
            {providers.map(function(p) {
              var isEditing = editId === p.id;
              var isTesting = testingKey[p.id];
              var testResult = testResults[p.id];
              return (
                <div key={p.id} className="flex items-center gap-3 py-3 border-b border-white/[0.02] text-xs font-mono">
                  {isEditing ? (
                    <>
                      <div className="flex-1 min-w-[100px] text-white/80 font-medium">{p.name}</div>
                      <div className="w-48">
                        <input type="text" value={editProvider.base_url || ''} onChange={function(e) { setEditProvider(Object.assign({}, editProvider, { base_url: e.target.value })); }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-white/30" />
                      </div>
                      <div className="w-48">
                        <div className="relative">
                          <input type={showKey[p.id] ? 'text' : 'password'} value={editProvider.api_key || ''} onChange={function(e) { setEditProvider(Object.assign({}, editProvider, { api_key: e.target.value })); }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 pr-7 text-white text-xs outline-none focus:border-white/30" />
                          <button onClick={function() { setShowKey(Object.assign({}, showKey, (function() { var o = {}; o[p.id] = !showKey[p.id]; return o; })())); }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                            {showKey[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="w-16 text-center">
                        <button onClick={function() { toggleActive(p); }}
                          className={'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ' + (p.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/[0.03]')}>
                          {p.is_active ? 'Да' : 'Нет'}
                        </button>
                      </div>
                      <div className="w-16 text-center" />
                      <div className="w-20 text-right flex gap-1 justify-end">
                        <button onClick={function() { saveEdit(p); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><Check size={14} /></button>
                        <button onClick={cancelEdit}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[100px] flex items-center gap-2 text-white/80 font-medium">
                        <Server size={14} className="text-white/30" />
                        {p.name}
                      </div>
                      <div className="w-48 text-white/50 truncate" title={p.base_url}>
                        <Globe size={11} className="inline mr-1 text-white/20" />
                        {p.base_url || '—'}
                      </div>
                      <div className="w-48 text-white/40">
                        <Key size={11} className="inline mr-1 text-white/20" />
                        {maskKey(p.api_key)}
                      </div>
                      <div className="w-16 text-center">
                        <button onClick={function() { toggleActive(p); }}
                          className={'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ' + (p.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 bg-white/[0.03]')}>
                          {p.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                      <div className="w-16 text-center">
                        {isTesting ? (
                          <span className="text-white/30 text-[10px]">...</span>
                        ) : testResult ? (
                          <span className={'text-[10px] font-medium ' + (testResult.success ? 'text-emerald-400' : 'text-red-400')} title={testResult.message + ' (' + testResult.latency + 'ms)'}>
                            {testResult.success ? '✓' : '✗'}
                          </span>
                        ) : (
                          <button onClick={function() { testKey(p); }}
                            className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-1"
                            title={p.api_key ? 'Проверить ключ' : 'Сначала задайте API-ключ'}>
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                      <div className="w-20 text-right">
                        <button onClick={function() { startEdit(p); }}
                          className="p-1 text-white/30 hover:text-white/70 transition-colors cursor-pointer"><Edit2 size={13} /></button>
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

function OpenClawTab() {
  var [summary, setSummary] = useState(null);
  var [latestReport, setLatestReport] = useState(null);
  var [history, setHistory] = useState([]);
  var [selectedPath, setSelectedPath] = useState('/');
  var [heatmap, setHeatmap] = useState([]);
  var [comparison, setComparison] = useState([]);
  var [scrollDepth, setScrollDepth] = useState([]);
  var [mouseHeatmap, setMouseHeatmap] = useState([]);
  var [rageClicks, setRageClicks] = useState([]);
  var [sessionData, setSessionData] = useState(null);
  var [openClawContext, setOpenClawContext] = useState(null);
  var [openClawPlan, setOpenClawPlan] = useState([]);
  var [loading, setLoading] = useState(true);
  var [heatmapLoading, setHeatmapLoading] = useState(true);
  var [generating, setGenerating] = useState(false);
  var [error, setError] = useState('');
  var [activeSubTab, setActiveSubTab] = useState('overview');
  var [heatmapType, setHeatmapType] = useState('click');
  var [pageViewport, setPageViewport] = useState('desktop');
  var [pageHeatmapClick, setPageHeatmapClick] = useState([]);
  var [pageHeatmapMouse, setPageHeatmapMouse] = useState([]);
  var [pageHeatmapLoading, setPageHeatmapLoading] = useState(false);
  var pageCanvasRef = useRef(null);
  var pageWrapRef = useRef(null);
  var pageIframeRef = useRef(null);
  var [pageHeight, setPageHeight] = useState(700);
  var quickPaths = ['/', '/models', '/pricing', '/blog', '/demo'];
  var canvasRef = useRef(null);
  var canvasWrapRef = useRef(null);

  // ── Page section definitions (y-coordinate ranges for common pages) ──
  var PAGE_SECTIONS = {
    '/': [
      { name: 'Шапка (Header)', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Hero / Первый экран', yStart: 80, yEnd: 750, color: 'rgba(59,130,246,0.2)' },
      { name: 'Возможности (Features)', yStart: 750, yEnd: 1400, color: 'rgba(16,185,129,0.2)' },
      { name: 'Модели (Showcase)', yStart: 1400, yEnd: 2100, color: 'rgba(251,191,36,0.2)' },
      { name: 'Поддерживаемые модели', yStart: 2100, yEnd: 2700, color: 'rgba(168,85,247,0.2)' },
      { name: 'Тарифы (Pricing)', yStart: 2700, yEnd: 3600, color: 'rgba(236,72,153,0.2)' },
      { name: 'FAQ', yStart: 3600, yEnd: 4200, color: 'rgba(249,115,22,0.2)' },
      { name: 'Подвал (Footer)', yStart: 4200, yEnd: 4600, color: 'rgba(107,114,128,0.2)' },
    ],
    '/models': [
      { name: 'Шапка (Header)', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Поиск / Категории', yStart: 80, yEnd: 180, color: 'rgba(59,130,246,0.2)' },
      { name: 'Сетка моделей', yStart: 180, yEnd: 2500, color: 'rgba(16,185,129,0.2)' },
      { name: 'Подвал (Footer)', yStart: 2500, yEnd: 2800, color: 'rgba(107,114,128,0.2)' },
    ],
    '/pricing': [
      { name: 'Шапка (Header)', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Тарифы (Tiers)', yStart: 80, yEnd: 900, color: 'rgba(236,72,153,0.2)' },
      { name: 'FAQ / Детали', yStart: 900, yEnd: 1500, color: 'rgba(249,115,22,0.2)' },
      { name: 'Подвал (Footer)', yStart: 1500, yEnd: 1800, color: 'rgba(107,114,128,0.2)' },
    ],
    '/blog': [
      { name: 'Шапка (Header)', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Список статей', yStart: 80, yEnd: 2000, color: 'rgba(16,185,129,0.2)' },
      { name: 'Подвал (Footer)', yStart: 2000, yEnd: 2300, color: 'rgba(107,114,128,0.2)' },
    ],
    '/demo': [
      { name: 'Шапка (Header)', yStart: 0, yEnd: 80, color: 'rgba(99,102,241,0.25)' },
      { name: 'Демо-контент', yStart: 80, yEnd: 2000, color: 'rgba(16,185,129,0.2)' },
      { name: 'Подвал (Footer)', yStart: 2000, yEnd: 2300, color: 'rgba(107,114,128,0.2)' },
    ],
  };

  function getPageSections(path) {
    // Try exact match, then strip trailing slash
    return PAGE_SECTIONS[path] || PAGE_SECTIONS[path.replace(/\/$/, '')] || null;
  }

  function getRageSectionName(sections, item) {
    if (!sections || !item) return '—';
    // Try to match by looking at text for known section keywords
    var text = (item.text || '').toLowerCase();
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var secKeywords = sec.name.toLowerCase();
      // Check if element text contains section name keywords
      if (text.includes('faq') || text.includes('вопрос')) return 'FAQ';
      if (text.includes('купить') || text.includes('price') || text.includes('₽') || text.includes('руб')) return 'Тарифы';
      if (text.includes('модел') || text.includes('model')) return 'Модели';
      if (text.includes('войти') || text.includes('регистр') || text.includes('auth')) return 'Шапка';
    }
    return '—';
  }

  function computeHeatmapMaxY(points) {
    if (!points || points.length === 0) return 2000;
    var maxY = 0;
    for (var i = 0; i < points.length; i++) {
      if (points[i].y != null && points[i].y > maxY) maxY = points[i].y;
    }
    return Math.max(maxY + 400, 1200);
  }

  function drawHeatmap(points, type) {
    if (!canvasRef.current || !canvasWrapRef.current) return;
    var canvas = canvasRef.current;
    var wrap = canvasWrapRef.current;
    var w = wrap.clientWidth || 800;

    var maxY = computeHeatmapMaxY(points);
    var h = Math.max(300, Math.min(700, maxY * (w / 1920))); // scale height proportionally

    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var scaleY = canvas.height / maxY;
    var scaleX = canvas.width / 1920;

    if (!points || points.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Нет данных для отображения', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw page sections
    var sections = getPageSections(selectedPath);
    if (sections) {
      for (var si = 0; si < sections.length; si++) {
        var sec = sections[si];
        var sy = Math.round(sec.yStart * scaleY);
        var sh = Math.round((sec.yEnd - sec.yStart) * scaleY);
        ctx.fillStyle = sec.color;
        ctx.fillRect(0, sy, canvas.width, sh);

        // Section label on the left edge
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(sec.name, 4, sy + 12);

        // Separator line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        ctx.stroke();
      }
    }

    // Draw heatmap points
    var maxCount = Math.max.apply(null, points.map(function(p) { return p.count; }));
    if (maxCount === 0) return;

    for (var j = 0; j < points.length; j++) {
      var p = points[j];
      if (p.x == null || p.y == null) continue;
      var intensity = p.count / maxCount;
      var radius = Math.max(3, intensity * 16);
      var cx = p.x * scaleX;
      var cy = p.y * scaleY;

      var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3);
      if (type === 'mouse') {
        gradient.addColorStop(0, 'rgba(59, 130, 246, ' + (0.5 * intensity) + ')');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, ' + (0.15 * intensity) + ')');
      } else {
        gradient.addColorStop(0, 'rgba(251, 191, 36, ' + (0.6 * intensity) + ')');
        gradient.addColorStop(0.5, 'rgba(251, 146, 60, ' + (0.2 * intensity) + ')');
      }
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, radius * 0.3), 0, Math.PI * 2);
      var centerColor = type === 'mouse' ? 'rgba(96, 165, 250, ' + (0.7 * intensity) + ')' : 'rgba(252, 211, 77, ' + (0.8 * intensity) + ')';
      ctx.fillStyle = centerColor;
      ctx.fill();
    }

    // Draw viewport indicator (shows ~1000px visible area)
    var vpH = 1000 * scaleY;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, vpH);
    ctx.lineTo(canvas.width, vpH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Точек: ' + points.length + ' | Макс: ' + maxCount + ' | Страница: ' + (sections ? sections.length + ' секций' : 'без секций') + ' | Высота: ~' + Math.round(maxY / 100) * 100 + 'px', 8, 14);
  }

  useEffect(function() {
    if (!heatmapLoading && heatmap.length > 0 && activeSubTab === 'heatmap') {
      drawHeatmap(heatmap, 'click');
    }
  }, [heatmap, heatmapLoading, activeSubTab]);

  useEffect(function() {
    if (!heatmapLoading && mouseHeatmap.length > 0 && activeSubTab === 'heatmap') {
      if (heatmapType === 'mouse') drawHeatmap(mouseHeatmap, 'mouse');
    }
  }, [mouseHeatmap, heatmapLoading, activeSubTab, heatmapType]);

  // ── Page heatmap (iframe + canvas overlay) ──
  function loadPageHeatmap() {
    if (!getToken()) return;
    setPageHeatmapLoading(true);
    var encPath = encodeURIComponent(selectedPath);
    Promise.all([
      adminFetch('/api/admin/analytics/heatmap?hours=24&grid_size=24&path=' + encPath + '&viewport=' + pageViewport).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/mouse-heatmap?hours=24&path=' + encPath + '&viewport=' + pageViewport).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
    ]).then(function(results) {
      var clickPts = (results[0] && results[0].points) || [];
      var mousePts = (results[1] && results[1].points) || [];
      setPageHeatmapClick(clickPts);
      setPageHeatmapMouse(mousePts);
      setTimeout(function() {
        drawPageHeatmap(heatmapType === 'click' ? clickPts : mousePts);
      }, 150);
    }).catch(function() {}).finally(function() {
      setPageHeatmapLoading(false);
    });
  }

  function drawPageHeatmap(points) {
    if (!pageCanvasRef.current) return;
    var canvas = pageCanvasRef.current;
    var parent = canvas.parentElement;
    if (!parent) return;

    var viewportW = pageViewport === 'desktop' ? 1200 : 375;
    var h = pageHeight;

    canvas.width = viewportW;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!points || points.length === 0) return;

    var maxCount = Math.max.apply(null, points.map(function(p) { return p.count; }));
    if (maxCount === 0) return;

    var scaleX = canvas.width / viewportW;

    for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
      var p = points[pointIndex];
      if (p.x == null || p.y == null) continue;
      var intensity = p.count / maxCount;
      var radius = Math.max(3, intensity * 18);
      var cx = p.x * scaleX;
      var cy = p.y; // actual page Y — canvas is full page height

      // Glow
      var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3);
      gradient.addColorStop(0, 'rgba(251, 191, 36, ' + (0.6 * intensity) + ')');
      gradient.addColorStop(0.5, 'rgba(251, 146, 60, ' + (0.2 * intensity) + ')');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, radius * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 50, ' + (0.9 * intensity) + ')';
      ctx.fill();

      // Count label for hotspots (count > 3)
      if (p.count > 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.count, cx, cy - radius - 4);
      }
    }

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Точек: ' + points.length + ' | Макс: ' + maxCount + ' | ' + pageViewport, canvas.width - 8, 14);
  }

  useEffect(function() {
    if (activeSubTab === 'page') {
      setTimeout(loadPageHeatmap, 100);
    }
  }, [activeSubTab, selectedPath, pageViewport]);

  // Re-draw when pageHeight changes (iframe loaded actual content height)
  useEffect(function() {
    if (activeSubTab === 'page' && pageHeight > 700 && pageHeatmapClick.length + pageHeatmapMouse.length > 0) {
      var pts = heatmapType === 'click' ? pageHeatmapClick : pageHeatmapMouse;
      setTimeout(function() { drawPageHeatmap(pts); }, 50);
    }
  }, [pageHeight]);

  function loadData() {
    if (!getToken()) return;
    setLoading(true);
    setHeatmapLoading(true);
    setError('');
    var encPath = encodeURIComponent(selectedPath);
    Promise.all([
      adminFetch('/api/admin/analytics/summary?hours=12&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }),
      adminFetch('/api/admin/analytics/heatmap?hours=24&grid_size=24&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/reports/latest?report_type=openclaw_12h').then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/reports?report_type=openclaw_12h&limit=10').then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/compare?hours=12&paths=' + encodeURIComponent(quickPaths.join(','))).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/scroll-depth?hours=24&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/mouse-heatmap?hours=24&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/rage-clicks?hours=24&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/analytics/sessions?hours=24').then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
      adminFetch('/api/admin/agent/openclaw/context?hours=24&path=' + encPath).then(function(r) {
        return r.ok ? r.json() : null;
      }).catch(function() { return null; }),
    ])
      .then(function(results) {
        setSummary(results[0]);
        setHeatmap((results[1] && results[1].points) || []);
        setLatestReport(results[2]);
        setHistory((results[3] && results[3].reports) || []);
        setComparison((results[4] && results[4].items) || []);
        setScrollDepth((results[5] && results[5].buckets) || []);
        setMouseHeatmap((results[6] && results[6].points) || []);
        setRageClicks((results[7] && results[7].items) || []);
        setSessionData(results[8]);
        setOpenClawContext(results[9] && results[9].context);
        setOpenClawPlan((results[9] && results[9].action_plan) || []);
      })
      .catch(function() {
        setError('Не удалось загрузить данные OpenClaw');
      })
      .finally(function() {
        setLoading(false);
        setHeatmapLoading(false);
      });
  }

  useEffect(function() {
    loadData();
  }, []);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      var res = await adminFetch('/api/admin/analytics/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ hours: 12, path: selectedPath }),
      });
      if (!res.ok) throw new Error('generate failed');
      await loadData();
    } catch {
      setError('Не удалось сгенерировать отчёт');
    } finally {
      setGenerating(false);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm font-mono">
        Загрузка OpenClaw...
      </div>
    );
  }

  var recommendations = (latestReport && latestReport.summary && latestReport.summary.recommendations) || [];
  var topPages = (summary && summary.top_pages) || [];
  var eventTypes = (summary && summary.event_types) || [];
  var heatmapSorted = (heatmap || []).slice().sort(function(a, b) { return (b.count || 0) - (a.count || 0); });
  var openClawMetrics = openClawContext && openClawContext.signals && openClawContext.signals.metrics;
  var openClawHealth = openClawContext && openClawContext.signals && openClawContext.signals.health;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 backdrop-blur-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-cyan-200 text-xs font-mono uppercase tracking-[0.2em]">OpenClaw</div>
          <h2 className="text-white text-2xl font-semibold mt-1">Поведенческая аналитика и 12-hour отчёты</h2>
          <p className="text-white/45 text-sm mt-2 max-w-2xl">
            Сводка по кликам, скроллам и pageview. Отчёты можно запускать вручную и автоматически рассылать в Telegram.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedPath}
              onChange={function(e) { setSelectedPath(e.target.value || '/'); }}
              placeholder="/"
              className="w-40 sm:w-56 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/20 outline-none focus:border-cyan-400/40"
            />
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-mono text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              Path
            </button>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-mono text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-semibold font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? 'Генерация...' : 'Сгенерировать по path'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-red-200 font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="События" value={formatNumber(summary && summary.total_events)} sub="за 12 часов" color="bg-cyan-500/20 text-cyan-300" />
        <StatCard icon={Users} label="Посетители" value={formatNumber(summary && summary.unique_visitors)} sub="уникальные visitor_id" color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Zap} label="Типы событий" value={formatNumber(eventTypes.length)} sub="pageview / click / scroll" color="bg-amber-500/20 text-amber-300" />
        <StatCard icon={ScrollText} label="Отчёт" value={latestReport ? 'готов' : 'нет'} sub={formatShortDate(latestReport && latestReport.created_at)} color="bg-emerald-500/20 text-emerald-300" />
      </div>

      {sessionData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="Сессии" value={formatNumber(sessionData.total_sessions)} sub="за 24 часа" color="bg-violet-500/20 text-violet-300" />
          <StatCard icon={Layers} label="Средняя глубина" value={sessionData.avg_pages_per_session + ' стр'} sub="страниц за сессию" color="bg-indigo-500/20 text-indigo-300" />
          <StatCard icon={Timer} label="Средняя длит." value={formatDuration(sessionData.avg_session_duration_secs)} sub="сессии" color="bg-pink-500/20 text-pink-300" />
          <StatCard icon={BarChart3} label="Макс. длит." value={formatDuration(sessionData.max_session_duration_secs)} sub="сессии" color="bg-orange-500/20 text-orange-300" />
        </div>
      )}

      {openClawContext && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-cyan-200 text-xs font-mono uppercase tracking-[0.2em]">OpenClaw brain</div>
              <h3 className="mt-1 text-white text-lg font-semibold">
                {openClawHealth === 'needs_attention' ? 'Нужны действия' : openClawHealth === 'watch' ? 'Есть сигналы для проверки' : 'Поведение стабильное'}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-white/45">
                <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">path {openClawContext.analyzed_path}</span>
                <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">click rate {openClawMetrics?.click_rate_percent ?? '—'}%</span>
                <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">rage {openClawMetrics?.rage_clicks ?? 0}</span>
                <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1">scroll {openClawMetrics?.max_scroll_bucket ?? 0}%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="shrink-0 px-4 py-2 rounded-xl border border-cyan-400/20 bg-black/15 text-xs font-mono text-cyan-100 hover:bg-cyan-400/10 transition-colors"
            >
              Пересчитать brain
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {openClawPlan.slice(0, 3).map(function(item) {
              return (
                <div key={item.title} className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <div className={'text-[10px] font-mono uppercase tracking-[0.2em] ' + (item.priority === 'urgent' ? 'text-red-300' : 'text-cyan-200')}>
                    {item.priority === 'urgent' ? 'urgent' : 'next'}
                  </div>
                  <div className="mt-2 text-sm text-white/80 font-medium">{item.title}</div>
                  <div className="mt-2 text-xs text-white/45 leading-relaxed">{item.next_step}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'overview', label: 'Обзор' },
          { id: 'heatmap', label: 'Тепловая карта' },
          { id: 'page', label: 'Страница' },
          { id: 'scroll', label: 'Глубина скролла' },
          { id: 'rage', label: 'Rage клики' },
        ].map(function(tab) {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={function() { setActiveSubTab(tab.id); }}
              className={'px-4 py-2 rounded-xl text-xs font-mono transition-colors ' + (
                activeSubTab === tab.id
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                  : 'text-white/50 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/70 text-sm font-medium">Последний отчёт</h3>
                <span className="text-white/30 text-[10px] font-mono">{latestReport ? latestReport.report_type : '—'}</span>
              </div>
              {latestReport && latestReport.summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">Visitors</div>
                      <div className="mt-1 text-lg font-semibold">{formatNumber(latestReport.summary.summary?.unique_visitors || latestReport.summary.unique_visitors)}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">Events</div>
                      <div className="mt-1 text-lg font-semibold">{formatNumber(latestReport.summary.summary?.total_events || latestReport.summary.total_events)}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">Clicks</div>
                      <div className="mt-1 text-lg font-semibold">{formatNumber((latestReport.summary.summary?.event_types || []).find(function(row) { return row.type === 'click'; })?.count || 0)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-white/40 text-xs font-mono uppercase tracking-[0.2em] mb-2">Рекомендации</div>
                    <div className="space-y-2">
                      {recommendations.length === 0 ? (
                        <div className="text-white/30 text-xs font-mono">Пока нет рекомендаций.</div>
                      ) : (
                        recommendations.map(function(item) {
                          return (
                            <div key={item} className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3 text-sm text-white/75">
                              {item}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white/30 text-xs font-mono py-8 text-center">Отчёт ещё не сформирован</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="text-white/70 text-sm font-medium mb-4">История последних отчётов</h3>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-white/30 text-xs font-mono py-8 text-center">Нет истории</div>
                ) : (
                  history.map(function(item) {
                    var sum = item.summary || {};
                    return (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-white text-sm font-medium">{item.report_type}</div>
                            <div className="text-white/35 text-[10px] font-mono">{formatShortDate(item.created_at)}</div>
                          </div>
                          <div className="text-right text-[10px] font-mono text-white/40">
                            {formatNumber(sum.total_events)} events
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono text-white/45">
                          <div className="rounded-lg border border-white/10 px-2 py-1">Visitors {formatNumber(sum.unique_visitors)}</div>
                          <div className="rounded-lg border border-white/10 px-2 py-1">Clicks {(sum.event_types || []).find(function(row) { return row.type === 'click'; })?.count || 0}</div>
                          <div className="rounded-lg border border-white/10 px-2 py-1">Top {((sum.top_pages || [])[0] && (sum.top_pages || [])[0].path) || '—'}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="text-white/70 text-sm font-medium mb-4">Топ страниц</h3>
              <div className="space-y-2">
                {topPages.length === 0 ? (
                  <div className="text-white/30 text-xs font-mono py-8 text-center">Нет данных</div>
                ) : (
                  topPages.map(function(row) {
                    return (
                      <div key={row.path} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-white text-sm truncate">{row.path}</div>
                          <div className="text-white/35 text-[10px] font-mono">12h</div>
                        </div>
                        <div className="text-white/70 text-sm font-mono">{formatNumber(row.count)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-white/70 text-sm font-medium">Heatmap для path</h3>
                <span className="text-white/30 text-[10px] font-mono">{selectedPath}</span>
              </div>
              {heatmapLoading ? (
                <div className="text-white/30 text-xs font-mono py-8 text-center">Загрузка heatmap...</div>
              ) : heatmapSorted.length === 0 ? (
                <div className="text-white/30 text-xs font-mono py-8 text-center">Нет кликов для этой страницы</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {heatmapSorted.slice(0, 12).map(function(point) {
                    return (
                      <div key={point.x + ':' + point.y} className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-white text-sm font-mono">{formatNumber(point.count)} clicks</div>
                        <div className="text-white/35 text-[10px] font-mono mt-1">x {point.x} / y {point.y}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-white/70 text-sm font-medium">Сравнение ключевых страниц</h3>
              <div className="flex flex-wrap gap-2">
                {quickPaths.map(function(path) {
                  var active = selectedPath === path;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={function() { setSelectedPath(path); }}
                      className={'px-3 py-1.5 rounded-full text-[10px] font-mono border transition-colors ' + (
                        active
                          ? 'bg-cyan-400 text-black border-cyan-400'
                          : 'bg-black/20 text-white/55 border-white/10 hover:bg-white/[0.06]'
                      )}
                    >
                      {path}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {comparison.length === 0 ? (
                <div className="text-white/30 text-xs font-mono py-8 text-center col-span-full">Нет данных для сравнения</div>
              ) : (
                comparison.map(function(item) {
                  var sum = item.summary || {};
                  var hot = item.top_heat_points || [];
                  return (
                    <div key={item.path} className={'rounded-xl border p-4 ' + (selectedPath === item.path ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/10 bg-black/10')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white text-sm font-semibold truncate">{item.path}</div>
                          <div className="text-white/35 text-[10px] font-mono">12h compare</div>
                        </div>
                        <button
                          type="button"
                          onClick={function() { setSelectedPath(item.path); }}
                          className="text-[10px] font-mono px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                        >
                          View
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="rounded-lg border border-white/10 px-2 py-1 text-white/60">Events {formatNumber(sum.total_events)}</div>
                        <div className="rounded-lg border border-white/10 px-2 py-1 text-white/60">Visitors {formatNumber(sum.unique_visitors)}</div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {hot.length === 0 ? (
                          <div className="text-white/25 text-[10px] font-mono">No clicks</div>
                        ) : (
                          hot.map(function(point) {
                            return (
                              <div key={point.x + ':' + point.y} className="rounded-lg border border-white/10 bg-black/15 px-2 py-1.5 text-[10px] font-mono text-white/55">
                                {point.count} clicks at {point.x}/{point.y}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="text-white/70 text-sm font-medium mb-4">Типы событий</h3>
              <div className="space-y-2">
                {eventTypes.length === 0 ? (
                  <div className="text-white/30 text-xs font-mono py-8 text-center">Нет данных</div>
                ) : (
                  eventTypes.map(function(row) {
                    return (
                      <div key={row.type} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-white text-sm font-mono">{row.type}</div>
                        <div className="text-white/70 text-sm font-mono">{formatNumber(row.count)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl border border-white/10 p-1">
              <button
                type="button"
                onClick={function() {
                  setHeatmapType('click');
                  setTimeout(function() { drawHeatmap(heatmap, 'click'); }, 50);
                }}
                className={'px-4 py-2 rounded-lg text-xs font-mono transition-colors ' + (heatmapType === 'click' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Клики
              </button>
              <button
                type="button"
                onClick={function() {
                  setHeatmapType('mouse');
                  setTimeout(function() { drawHeatmap(mouseHeatmap, 'mouse'); }, 50);
                }}
                className={'px-4 py-2 rounded-lg text-xs font-mono transition-colors ' + (heatmapType === 'mouse' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Мышь
              </button>
            </div>
            <span className="text-white/30 text-[10px] font-mono">{selectedPath}</span>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                <span className="size-2.5 rounded-full bg-amber-400/60"></span> Клики
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                <span className="size-2.5 rounded-full bg-blue-400/60"></span> Мышь
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden" ref={canvasWrapRef}>
            <canvas ref={canvasRef} className="w-full" style={{ minHeight: '300px', maxHeight: '700px' }}></canvas>
          </div>

          {/* Section breakdown */}
          {PAGE_SECTIONS[selectedPath] ? (function() {
            var pts = heatmapType === 'click' ? heatmap : mouseHeatmap;
            var sections = PAGE_SECTIONS[selectedPath];
            var totalPts = pts.length;
            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <h3 className="text-white/70 text-sm font-medium mb-4">По секциям страницы {selectedPath}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {sections.map(function(sec) {
                    var inSection = pts.filter(function(p) {
                      return p.y != null && p.y >= sec.yStart && p.y < sec.yEnd;
                    });
                    var sectionCount = inSection.reduce(function(s, p) { return s + p.count; }, 0);
                    var sectionPts = inSection.length;
                    var pct = totalPts > 0 ? Math.round((sectionPts / totalPts) * 100) : 0;
                    return (
                      <div key={sec.name} className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="size-3 rounded" style={{ background: sec.color }}></span>
                          <div className="text-white text-xs font-medium truncate">{sec.name}</div>
                        </div>
                        <div className="text-lg font-semibold text-white/90">{formatNumber(sectionCount)}</div>
                        <div className="text-[10px] font-mono text-white/40 mt-1">{pct}% точек · {formatNumber(sectionPts)} ячеек</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="text-white/70 text-sm font-medium mb-2">Секции не определены для {selectedPath}</h3>
              <p className="text-white/40 text-xs font-mono">Чтобы увидеть разбивку по секциям, выбери /, /models, /pricing, /blog или /demo</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Click точек</div>
              <div className="text-white text-sm font-semibold mt-1">{formatNumber(heatmap.length)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Mouse точек</div>
              <div className="text-white text-sm font-semibold mt-1">{formatNumber(mouseHeatmap.length)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Макс за 1 точку</div>
              <div className="text-white text-sm font-semibold mt-1">{formatNumber(Math.max.apply(null, heatmap.map(function(p) { return p.count; }).concat([0])))}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Секций</div>
              <div className="text-white text-sm font-semibold mt-1">{PAGE_SECTIONS[selectedPath] ? PAGE_SECTIONS[selectedPath].length : '—'}</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'page' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl border border-white/10 p-1">
              <button
                type="button"
                onClick={function() {
                  setPageViewport('desktop');
                  setTimeout(loadPageHeatmap, 50);
                }}
                className={'px-4 py-2 rounded-lg text-xs font-mono transition-colors ' + (pageViewport === 'desktop' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Десктоп (1200px)
              </button>
              <button
                type="button"
                onClick={function() {
                  setPageViewport('mobile');
                  setTimeout(loadPageHeatmap, 50);
                }}
                className={'px-4 py-2 rounded-lg text-xs font-mono transition-colors ' + (pageViewport === 'mobile' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Мобилка (375px)
              </button>
            </div>
            <span className="text-white/30 text-[10px] font-mono">{selectedPath}</span>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                <span className="size-2.5 rounded-full bg-amber-400/60"></span> Клики
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                <span className="size-2.5 rounded-full bg-blue-400/60"></span> Мышь
              </div>
              <span className="text-white/30 text-[10px] font-mono ml-2">viewport: {pageViewport}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl border border-white/10 p-1">
              <button
                type="button"
                onClick={function() {
                  setHeatmapType('click');
                  setTimeout(function() { drawPageHeatmap(pageHeatmapClick); }, 100);
                }}
                className={'px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ' + (heatmapType === 'click' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Клики
              </button>
              <button
                type="button"
                onClick={function() {
                  setHeatmapType('mouse');
                  setTimeout(function() { drawPageHeatmap(pageHeatmapMouse); }, 100);
                }}
                className={'px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ' + (heatmapType === 'mouse' ? 'bg-cyan-400/20 text-cyan-300' : 'text-white/50 hover:text-white')}
              >
                Мышь
              </button>
            </div>
            <button
              type="button"
              onClick={loadPageHeatmap}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            >
              {pageHeatmapLoading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>

          <div className="flex justify-center">
            <div
              ref={pageWrapRef}
              className="relative rounded-2xl border border-white/10 bg-black/40"
              style={{ width: pageViewport === 'desktop' ? '100%' : '400px', maxWidth: '100%', overflowY: 'auto', maxHeight: '80vh' }}
            >
              {/* Iframe showing the actual page */}
              <iframe
                ref={pageIframeRef}
                src={'/' + (selectedPath === '/' ? '' : selectedPath.slice(1))}
                className="w-full border-0"
                scrolling="no"
                style={{
                  height: pageHeight + 'px',
                  maxWidth: pageViewport === 'desktop' ? '1200px' : '375px',
                  margin: '0 auto',
                  display: 'block',
                }}
                title="Page preview"
                onLoad={function() {
                  try {
                    var fw = pageIframeRef.current && (pageIframeRef.current.contentWindow || pageIframeRef.current.contentDocument);
                    var doc = fw && (fw.document || (fw.contentDocument ? fw.contentWindow.document : null));
                    if (doc && doc.body) {
                      // Disable internal iframe scroll
                      doc.body.style.overflow = 'hidden';
                      doc.body.style.minHeight = '100%';
                      if (doc.documentElement) {
                        doc.documentElement.style.overflow = 'hidden';
                      }
                      // Get full content height
                      var h = Math.max(
                        doc.body.scrollHeight,
                        doc.documentElement ? doc.documentElement.scrollHeight : 0,
                        700
                      );
                      setPageHeight(h);
                    }
                  } catch(e) { /* same-origin only */ }
                }}
              ></iframe>
              {/* Canvas overlay on top of the iframe */}
              <canvas
                ref={pageCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                  maxWidth: pageViewport === 'desktop' ? '1200px' : '375px',
                  margin: '0 auto',
                  width: pageViewport === 'desktop' ? '1200px' : '375px',
                  height: pageHeight + 'px',
                }}
              ></canvas>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Click точек (viewport)</div>
              <div className="text-white text-sm font-semibold mt-1">{formatNumber(pageHeatmapClick.length)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Mouse точек (viewport)</div>
              <div className="text-white text-sm font-semibold mt-1">{formatNumber(pageHeatmapMouse.length)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Режим</div>
              <div className="text-white text-sm font-semibold mt-1">{pageViewport === 'desktop' ? 'Десктоп ≥1024px' : 'Мобилка <768px'}</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'scroll' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white/70 text-sm font-medium">Глубина скролла (по 10% страницы)</h3>
            <span className="text-white/30 text-[10px] font-mono">{selectedPath}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            {scrollDepth.length === 0 ? (
              <div className="text-white/30 text-xs font-mono py-8 text-center">Нет данных о скролле для этой страницы. Данные появятся после того, как пользователи поскроллят.</div>
            ) : (function() {
              var sections = PAGE_SECTIONS[selectedPath];
              var maxCount = Math.max.apply(null, scrollDepth.map(function(r) { return Number(r.count); }));
              return (
                <div>
                  <div className="space-y-2">
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(function(bucket) {
                      var row = scrollDepth.find(function(r) { return Number(r.bucket) === bucket; });
                      var count = row ? Number(row.count) : 0;
                      var barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      var label = bucket === 100 ? '100% (конец)' : bucket + '%';

                      // Find which page section this bucket is in
                      var sectionName = '';
                      if (sections) {
                        var pctToY = function(pct) {
                          if (!sections || sections.length === 0) return 0;
                          var lastSec = sections[sections.length - 1];
                          return Math.round((pct / 100) * lastSec.yEnd);
                        };
                        var yPos = pctToY(bucket);
                        for (var si = 0; si < sections.length; si++) {
                          if (yPos >= sections[si].yStart && yPos < sections[si].yEnd) {
                            sectionName = sections[si].name;
                            break;
                          }
                        }
                      }

                      var dropPct = null;
                      if (bucket > 0) {
                        var prevRow = scrollDepth.find(function(r) { return Number(r.bucket) === bucket - 10; });
                        var prevCount = prevRow ? Number(prevRow.count) : 0;
                        if (prevCount > 0) {
                          dropPct = Math.round(((prevCount - count) / prevCount) * 100);
                        }
                      }

                      return (
                        <div key={bucket} className="flex items-center gap-3">
                          <div className="text-white/50 text-[10px] font-mono w-20 shrink-0 text-right">{label}</div>
                          <div className="flex-1 h-7 rounded-lg bg-black/20 overflow-hidden relative">
                            <div
                              className="h-full rounded-lg transition-all duration-500"
                              style={{
                                width: barWidth + '%',
                                background: count === 0
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'linear-gradient(90deg, rgba(59,130,246,0.5), rgba(99,102,241,0.7))',
                              }}
                            ></div>
                            {sectionName && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-white/30 truncate" style={{ maxWidth: '60%' }}>
                                {sectionName}
                              </span>
                            )}
                          </div>
                          <div className="text-white/70 text-[10px] font-mono w-16 shrink-0 text-right">{formatNumber(count)}</div>
                          {dropPct != null && (
                            <div className={'text-[10px] font-mono w-10 shrink-0 ' + (dropPct > 50 ? 'text-amber-400' : 'text-white/40')}>
                              -{dropPct}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-white/30">
                    Столбцы показывают, сколько человек доскроллили до каждого участка. Падение между 10% → 0% = сколько сразу ушли.
                    {sections && <span> Справа — названия секций страницы.</span>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeSubTab === 'rage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white/70 text-sm font-medium">Rage клики (многократные клики за 1.5с)</h3>
            <span className="text-white/30 text-[10px] font-mono">{selectedPath}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            {rageClicks.length === 0 ? (
              <div className="text-white/30 text-xs font-mono py-8 text-center">Нет rage кликов для этой страницы</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-3 px-3">Элемент</th>
                      <th className="text-left py-3 px-3">Текст</th>
                      <th className="text-left py-3 px-3">Страница</th>
                      <th className="text-left py-3 px-3">Секция</th>
                      <th className="text-right py-3 px-3">Кол-во</th>
                      <th className="text-right py-3 px-3">Последний</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rageClicks.map(function(item, idx) {
                      var sections = PAGE_SECTIONS[item.path];
                      var sectionName = getRageSectionName(sections, item);
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-3 text-white/80">{item.element || '—'}</td>
                          <td className="py-3 px-3 text-white/60 max-w-[200px] truncate">{item.text || '—'}</td>
                          <td className="py-3 px-3 text-white/60">{item.path}</td>
                          <td className="py-3 px-3 text-white/50 text-[9px]">{sectionName}</td>
                          <td className="py-3 px-3 text-amber-400 text-right">{formatNumber(item.count)}</td>
                          <td className="py-3 px-3 text-white/40 text-right">{item.last_seen ? formatShortDate(item.last_seen) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Users Dashboard ──
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

// ── Tab: Funnel Analytics ──
function FunnelTab() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [days, setDays] = useState(30);
  var [error, setError] = useState('');
  var [expandedStage, setExpandedStage] = useState(null);

  function loadData() {
    if (!getToken()) return;
    setLoading(true);
    setError('');
    adminFetch('/api/admin/analytics/funnel?days=' + days)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d) throw new Error('Ошибка загрузки');
        setData(d);
      })
      .catch(function(e) { setError(e.message); })
      .finally(function() { setLoading(false); });
  }

  useEffect(function() { loadData(); }, [days]);

  var periodOptions = [
    { value: 7, label: '7 дней' },
    { value: 14, label: '14 дней' },
    { value: 30, label: '30 дней' },
    { value: 90, label: '90 дней' },
  ];

  var stageColors = [
    { bar: 'bg-blue-500', text: 'text-blue-400', icon: '👁' },
    { bar: 'bg-cyan-500', text: 'text-cyan-400', icon: '📝' },
    { bar: 'bg-teal-500', text: 'text-teal-400', icon: '📧' },
    { bar: 'bg-emerald-500', text: 'text-emerald-400', icon: '✅' },
    { bar: 'bg-amber-500', text: 'text-amber-400', icon: '💳' },
    { bar: 'bg-green-500', text: 'text-green-400', icon: '🎉' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Воронка конверсии</span>
        <div className="flex items-center gap-2">
          {periodOptions.map(function(opt) {
            return (
              <button key={opt.value} onClick={function() { setDays(opt.value); }}
                className={'px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ' + (
                  days === opt.value
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 text-xs font-mono">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-white/20 text-xs font-mono">Загрузка...</div>
      )}

      {data && !loading && (
        <>
          {/* Funnel visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-5">Этапы воронки</span>
              <div className="space-y-0">
                {data.stages && data.stages.map(function(stage, i) {
                  var sc = stageColors[i] || stageColors[stageColors.length - 1];
                  var maxCount = data.stages[0]?.count || 1;
                  var barWidth = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 1) : 1;
                  var pctChange = i > 0 && data.stages[i - 1].count > 0
                    ? ((stage.count / data.stages[i - 1].count) * 100).toFixed(1)
                    : '-';
                  var overallPct = data.stages[0]?.count > 0
                    ? ((stage.count / data.stages[0].count) * 100).toFixed(1)
                    : '-';
                  return (
                    <div key={stage.id}
                      onClick={function() { setExpandedStage(expandedStage === stage.id ? null : stage.id); }}
                      className="flex items-center gap-3 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <div className="w-8 text-center text-xs">{sc.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={'text-xs font-mono font-medium ' + sc.text}>{stage.label}</span>
                          <span className="text-white/80 text-sm font-semibold tabular-nums">{formatNumber(stage.count)}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={'h-full rounded-full transition-all duration-500 ' + sc.bar}
                            style={{ width: barWidth + '%' }} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className={'text-[10px] ' + sc.text}>
                            {pctChange}% ← предыдущий
                          </span>
                          <span className="text-white/30 text-[10px] font-mono">
                            {overallPct}% от всех
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Overall conversion */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-3">Общая конверсия</span>
                <div className="text-3xl font-bold font-mono" style={{ color: (data.overall_conversion_pct || 0) > 1 ? '#34d399' : '#fbbf24' }}>
                  {data.overall_conversion_pct != null ? data.overall_conversion_pct.toFixed(2) : '0.00'}%
                </div>
                <div className="text-white/30 text-[10px] font-mono mt-1">
                  от посещения до оплаты
                </div>
              </div>

              {/* Source breakdown */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-3">Источники трафика</span>
                <div className="space-y-2">
                  {data.source_breakdown && data.source_breakdown.map(function(s, i) {
                    var total = data.source_breakdown.reduce(function(a, b) { return a + Number(b.count); }, 0);
                    var pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
                    var sourceLabels = { direct: 'Прямой', organic: 'Поиск', referral: 'Рефералы', utm: 'UTM/Реклама' };
                    var sourceColors = { direct: 'bg-blue-500/30 text-blue-400', organic: 'bg-emerald-500/30 text-emerald-400', referral: 'bg-purple-500/30 text-purple-400', utm: 'bg-amber-500/30 text-amber-400' };
                    var color = sourceColors[s.source] || 'bg-white/10 text-white/60';
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className={'text-xs font-mono px-2 py-0.5 rounded ' + color}>
                          {sourceLabels[s.source] || s.source}
                        </span>
                        <span className="text-white/60 text-xs font-mono">{formatNumber(s.count)} ({pct}%)</span>
                      </div>
                    );
                  })}
                  {(!data.source_breakdown || data.source_breakdown.length === 0) && (
                    <div className="text-white/20 text-xs font-mono py-2">Нет данных</div>
                  )}
                </div>
              </div>

              {/* Abandoned payments */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-3">Брошенные оплаты</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-amber-400">{formatNumber(data.abandoned_payments_7d || 0)}</span>
                  <span className="text-white/30 text-[10px] font-mono">за 7 дней</span>
                </div>
                <div className="text-white/30 text-[10px] font-mono mt-1">
                  Создали платёж, но не оплатили
                </div>
              </div>
            </div>
          </div>

          {/* Timeline chart */}
          {data.timeline && data.timeline.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Динамика по дням</span>
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-white/30 border-b border-white/5">
                      <th className="text-left py-2 pr-4">Дата</th>
                      <th className="text-right py-2 px-2">Регистрации</th>
                      <th className="text-right py-2 px-2">Код отправлен</th>
                      <th className="text-right py-2 px-2">Завершено</th>
                      <th className="text-right py-2 px-2">Оплата начата</th>
                      <th className="text-right py-2 px-2">Оплачено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timeline.map(function(t, i) {
                      return (
                        <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                          <td className="text-white/50 py-2 pr-4">{t.label}</td>
                          <td className="text-right py-2 px-2 text-cyan-400">{formatNumber(t.reg_started || 0)}</td>
                          <td className="text-right py-2 px-2 text-teal-400">{formatNumber(t.code_sent || 0)}</td>
                          <td className="text-right py-2 px-2 text-emerald-400">{formatNumber(t.reg_completed || 0)}</td>
                          <td className="text-right py-2 px-2 text-amber-400">{formatNumber(t.payment_started || 0)}</td>
                          <td className="text-right py-2 px-2 text-green-400">{formatNumber(t.payment_completed || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights */}
          {data.stages && data.stages.length >= 4 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <span className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-4">Аналитика</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  var regStarted = data.stages.find(function(s) { return s.id === 'registration_start'; });
                  var codeSent = data.stages.find(function(s) { return s.id === 'code_sent'; });
                  var regComplete = data.stages.find(function(s) { return s.id === 'registration_complete'; });
                  var topupStart = data.stages.find(function(s) { return s.id === 'topup_start'; });
                  var topupComplete = data.stages.find(function(s) { return s.id === 'topup_complete'; });

                  var insights = [];
                  if (regStarted && codeSent && regStarted.count > 0) {
                    var dropToCode = Math.round((1 - codeSent.count / regStarted.count) * 100);
                    if (dropToCode > 20) insights.push({ icon: '⚠️', title: 'Уход после начала регистрации', desc: dropToCode + '% не получили код — возможно, проблема с формой или блокировка доменов.' });
                  }
                  if (codeSent && regComplete && codeSent.count > 0) {
                    var dropVerify = Math.round((1 - regComplete.count / codeSent.count) * 100);
                    if (dropVerify > 20) insights.push({ icon: '📧', title: 'Не подтвердили email', desc: dropVerify + '% не завершили верификацию — письмо могло попасть в спам.' });
                  }
                  if (regComplete && topupStart && regComplete.count > 0) {
                    var dropPayment = Math.round((1 - topupStart.count / regComplete.count) * 100);
                    if (dropPayment > 50) insights.push({ icon: '💰', title: 'Не начали оплату', desc: dropPayment + '% зарегистрированных не пополнили баланс — возможно, не видят ценности.' });
                  }
                  if (topupStart && topupComplete && topupStart.count > 0) {
                    var dropComplete = Math.round((1 - topupComplete.count / topupStart.count) * 100);
                    if (dropComplete > 20) insights.push({ icon: '❌', title: 'Бросили оплату', desc: dropComplete + '% не завершили платёж — возможно, ошибка или передумали.' });
                  }
                  return insights;
                })().map(function(insight, i) {
                  return (
                    <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{insight.icon}</span>
                        <span className="text-white/70 text-xs font-semibold">{insight.title}</span>
                      </div>
                      <p className="text-white/40 text-[10px] font-mono leading-relaxed">{insight.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PromoCodesTab() {
  var [codes, setCodes] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ code: '', type: 'fixed', value: '', uses: '100', expires: '', desc: '' });
  var [saving, setSaving] = useState(false);

  function loadCodes() {
    setLoading(true);
    setError('');
    adminFetch('/api/admin/promo-codes')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setCodes(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(function() { setError('Не удалось загрузить промокоды'); setLoading(false); });
  }

  useEffect(loadCodes, []);

  function handleCreate(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.value || parseFloat(form.value) <= 0) return;
    setSaving(true);
    adminFetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.trim(),
        amount_type: form.type,
        amount_value: parseFloat(form.value),
        max_uses: parseInt(form.uses) || 100,
        expires_at: form.expires || null,
        description: form.desc.trim() || null,
      }),
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setSaving(false);
        if (d.error) { setError(d.error); return; }
        setShowForm(false);
        setForm({ code: '', type: 'fixed', value: '', uses: '100', expires: '', desc: '' });
        setError('');
        loadCodes();
      })
      .catch(function() { setSaving(false); setError('Ошибка создания'); });
  }

  function toggleCode(id) {
    adminFetch('/api/admin/promo-codes/' + id, { method: 'PATCH' })
      .then(function(r) { return r.json(); })
      .then(function() { loadCodes(); })
      .catch(function() {});
  }

  function deleteCode(id) {
    if (!confirm('Удалить промокод?')) return;
    adminFetch('/api/admin/promo-codes/' + id, { method: 'DELETE' })
      .then(function(r) { return r.json(); })
      .then(function() { loadCodes(); })
      .catch(function() {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white/30 text-xs font-mono">Промокоды ({codes.length})</span>
        <button onClick={function() { setShowForm(function(v) { return !v; }); setError(''); }}
          className="px-3 py-1.5 rounded-lg text-[11px] font-mono bg-white/10 text-white/70 hover:bg-white/20 transition-all cursor-pointer">
          {showForm ? 'Отмена' : '+ Создать'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-red-300 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">Код</label>
              <input type="text" value={form.code} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { code: e.target.value.toUpperCase() }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                placeholder="SUMMER2026" required />
            </div>
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">Тип</label>
              <select value={form.type} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { type: e.target.value }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <option value="fixed" style={{ backgroundColor: '#111' }}>Фикс. сумма</option>
                <option value="percent" style={{ backgroundColor: '#111' }}>Процент</option>
              </select>
            </div>
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">{form.type === 'fixed' ? 'Сумма (₽)' : 'Процент (%)'}</label>
              <input type="number" step="0.01" min="1" value={form.value} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { value: e.target.value }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                placeholder="100" required />
            </div>
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">Лимит</label>
              <input type="number" min="1" value={form.uses} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { uses: e.target.value }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                placeholder="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">Истекает (опц.)</label>
              <input type="date" value={form.expires} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { expires: e.target.value }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            </div>
            <div>
              <label className="text-white/30 text-[10px] font-mono uppercase block mb-1">Описание (опц.)</label>
              <input type="text" value={form.desc} onChange={function(e) { setForm(function(p) { return Object.assign({}, p, { desc: e.target.value }); }); }}
                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                placeholder="Летняя акция" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:opacity-90 transition-all cursor-pointer disabled:opacity-40">
            {saving ? 'Сохранение...' : 'Создать промокод'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm font-mono">Загрузка...</div>
      ) : codes.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm font-mono">Нет промокодов</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="flex items-center gap-3 py-2 text-white/30 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
                <div className="w-28">Код</div>
                <div className="w-20">Сумма</div>
                <div className="w-16 text-right">Исп.</div>
                <div className="w-16 text-right">Лимит</div>
                <div className="w-20">Статус</div>
                <div className="w-28">Истекает</div>
                <div className="flex-1">Описание</div>
                <div className="w-28 text-right">Создан</div>
                <div className="w-24 text-right">Действия</div>
              </div>
              {codes.map(function(p) {
                var expiresDate = p.expires_at ? new Date(p.expires_at) : null;
                var expired = expiresDate && expiresDate.getTime() < Date.now();
                return (
                  <div key={p.id} className={'flex items-center gap-3 py-2.5 border-b border-white/[0.02] text-xs font-mono hover:bg-white/[0.02] transition-colors ' + (expired ? 'opacity-40' : '')}>
                    <div className="w-28">
                      <span className="text-white/90 font-semibold">{p.code}</span>
                    </div>
                    <div className="w-20">
                      <span className={'text-white/80 ' + (p.amount_type === 'percent' ? 'text-emerald-400' : 'text-sky-400')}>
                        {p.amount_type === 'percent' ? p.amount_value + '%' : p.amount_value + ' ₽'}
                      </span>
                    </div>
                    <div className="w-16 text-right text-white/60">{p.used_count}/{p.max_uses}</div>
                    <div className="w-16 text-right">{p.used_count >= p.max_uses ? <span className="text-red-400">full</span> : <span className="text-emerald-400">{p.max_uses - p.used_count}</span>}</div>
                    <div className="w-20">
                      {p.is_active ? (
                        <span className="text-emerald-400">Активен</span>
                      ) : (
                        <span className="text-white/30">Отключён</span>
                      )}
                    </div>
                    <div className="w-28 text-white/40">{expiresDate ? expiresDate.toISOString().slice(0, 10) : '—'}</div>
                    <div className="flex-1 text-white/40 truncate">{p.description || '—'}</div>
                    <div className="w-28 text-right text-white/30">{p.created_at ? p.created_at.slice(0, 10) : '—'}</div>
                    <div className="w-24 text-right flex gap-1 justify-end">
                      <button onClick={function() { toggleCode(p.id); }}
                        className={'px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer border ' + (p.is_active
                          ? 'bg-white/5 text-white/40 hover:bg-amber-500/15 hover:text-amber-300 border-white/10 hover:border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/15')}>
                        {p.is_active ? 'Выкл' : 'Вкл'}
                      </button>
                      <button onClick={function() { deleteCode(p.id); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-mono bg-white/5 text-white/40 hover:bg-red-500/15 hover:text-red-300 border border-white/10 hover:border-red-500/20 transition-all cursor-pointer">
                        Удл
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

// ── Subscriptions Tab ──
function SubscriptionsTab() {
  var [subs, setSubs] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    adminFetch('/api/admin/subscriptions')
      .then(function (r) { return r.json(); })
      .then(function (data) { setSubs(data); })
      .catch(function () {})
      .finally(function () { setLoading(false); });
  }, []);

  var TIER_LABELS = { starter: 'Базовый', standard: 'Стандартный', premium: 'Премиум' };
  var TIER_COLORS = { starter: '#3B82F6', standard: '#8B5CF6', premium: '#F59E0B' };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin size-8 rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-white/40">Всего подписок</div>
          <div className="text-xl font-semibold text-white mt-1">{subs.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-white/40">Активных</div>
          <div className="text-xl font-semibold text-emerald-400 mt-1">{subs.filter(function(s) { return s.status === 'active'; }).length}</div>
        </div>
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-white/40">Просрочено</div>
          <div className="text-xl font-semibold text-amber-400 mt-1">{subs.filter(function(s) { return s.status === 'active' && new Date(s.end_date) < new Date(); }).length}</div>
        </div>
        <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
          <div className="text-xs text-white/40">Ожидают</div>
          <div className="text-xl font-semibold text-blue-400 mt-1">{subs.filter(function(s) { return s.status === 'pending'; }).length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="text-left px-3 py-3 font-medium">Пользователь</th>
                <th className="text-left px-3 py-3 font-medium">Тариф</th>
                <th className="text-left px-3 py-3 font-medium">Период</th>
                <th className="text-left px-3 py-3 font-medium">Статус</th>
                <th className="text-left px-3 py-3 font-medium">Создана</th>
                <th className="text-left px-3 py-3 font-medium">Действует до</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(function(s) {
                var tierLabel = s.tier ? (TIER_LABELS[s.tier] || s.tier) : s.plan_type;
                var tierColor = s.tier ? (TIER_COLORS[s.tier] || '#fff') : '#fff';
                var isExpired = s.status === 'active' && new Date(s.end_date) < new Date();
                var statusText = isExpired ? 'Просрочена' : (s.status === 'active' ? 'Активна' : s.status === 'pending' ? 'Ожидает' : s.status);

                return (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3">
                      <div className="text-white">{s.user_name || '—'}</div>
                      <div className="text-white/30 mt-0.5">{s.user_email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ backgroundColor: tierColor + '15', color: tierColor, border: '1px solid ' + tierColor + '30' }}>
                        {tierLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/60">{s.period === 'monthly' ? 'Ежемесячно' : 'Ежегодно'}</td>
                    <td className="px-3 py-3">
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ' + (
                        isExpired ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : s.status === 'active' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : s.status === 'pending' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      )}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/40">{s.created_at ? new Date(s.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                    <td className="px-3 py-3 text-white/60">{s.end_date ? new Date(s.end_date).toLocaleDateString('ru-RU') : '—'}</td>
                  </tr>
                );
              })}
              {subs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-white/30">Нет подписок</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──
var TABS = [
  { id: 'overview', label: 'Обзор', icon: Activity },
  { id: 'users-dashboard', label: 'Дашборд юзеров', icon: UserPlus },
  { id: 'corporate', label: 'Корпоративные', icon: Building2 },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'referrals', label: 'Рефералы', icon: Gift },
  { id: 'support', label: 'Поддержка', icon: Headphones },
  { id: 'openclaw', label: 'OpenClaw', icon: Zap },
  { id: 'model-logs', label: 'Логи моделей', icon: ScrollText },
  { id: 'model-dashboard', label: 'Дашборд моделей', icon: BarChart3 },
  { id: 'models', label: 'Каталог моделей', icon: Cpu },
  { id: 'providers', label: 'Аналитика', icon: Shield },
  { id: 'promo-codes', label: 'Промокоды', icon: Gift },
  { id: 'blog', label: 'Блог', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'subscriptions', label: 'Подписки', icon: Shield },
  { id: 'funnel', label: 'Воронка', icon: TrendingUp },
];

function AdminDashboard({ onLogout }) {
  var navigate = useNavigate();
  var [tab, setTab] = useState('overview');

  function renderTab() {
    switch (tab) {
      case 'overview': return <OverviewTab />;
      case 'users-dashboard': return <UsersDashboardTab />;
      case 'corporate': return <CorporateTab />;
      case 'users': return <UsersTab />;
      case 'referrals': return <ReferralsTab />;
      case 'support': return <SupportTab />;
      case 'openclaw': return <OpenClawTab />;
      case 'model-logs': return <ModelLogsTab />;
      case 'model-dashboard': return <ModelDashboardTab />;
      case 'models': return <ModelsTab />;
      case 'providers': return <ProvidersTab />;
      case 'promo-codes': return <PromoCodesTab />;
      case 'blog': return <BlogTab />;
      case 'faq': return <FaqTab />;
      case 'subscriptions': return <SubscriptionsTab />;
      case 'funnel': return <FunnelTab />;
      default: return <OverviewTab />;
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={function() { navigate('/'); }}
            className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div className="size-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-sm font-bold">A</span>
          </div>
          <span className="text-white font-semibold">Админ-панель</span>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
          <LogOut size={14} />
          Выйти
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-1 flex-wrap border border-white/10 rounded-xl p-1 bg-white/[0.02]">
          {TABS.map(function(t) {
            var active = tab === t.id;
            return (
              <button key={t.id} onClick={function() { setTab(t.id); }}
                className={'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ' + (
                  active
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}>
                <t.icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {renderTab()}
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
