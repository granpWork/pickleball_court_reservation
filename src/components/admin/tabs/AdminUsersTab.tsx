import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Trash2,
  UserPlus,
  Search,
  X,
  Edit2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  User,
  Clock,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Check
} from 'lucide-react';
import { type UserAccount } from '../adminTypes';

export interface AdminUsersTabProps {
  users: UserAccount[];
  isSuperAdmin: boolean;
  onEditUser?: (user: UserAccount) => void;
  onToggleStatus?: (userId: string, currentStatus?: string) => void;
  onDeleteUser?: (user: UserAccount | string) => void;
  onOpenInviteModal?: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  isSuperAdmin,
  onEditUser,
  onToggleStatus,
  onDeleteUser,
  onOpenInviteModal,
}) => {
  // Local Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'client_admin' | 'player'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive' | 'deleted'>('all');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Compute Metrics Summary
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || 'active') === 'active' && !u.isInvitedPending).length;
    const pending = users.filter((u) => u.status === 'pending' || u.isInvitedPending).length;
    const inactive = users.filter((u) => u.status === 'inactive').length;
    const superAdmins = users.filter((u) => u.role === 'super_admin').length;
    const clientAdmins = users.filter((u) => u.role === 'client_admin').length;
    const players = users.filter((u) => !u.role || u.role === 'player' || u.role === 'user').length;

    return { total, active, pending, inactive, superAdmins, clientAdmins, players };
  }, [users]);

  // Compute Filtered Users Roster
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const companyMatch = (u.companyName || u.companyId || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = !searchQuery.trim() || nameMatch || emailMatch || companyMatch;

      const uRole = u.role || 'player';
      const matchesRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'player'
          ? uRole === 'player' || uRole === 'user'
          : uRole === roleFilter;

      const uStatus = u.status || (u.isInvitedPending ? 'pending' : 'active');
      const matchesStatus = statusFilter === 'all' ? true : uStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Reset to Page 1 when filters change
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safeCurrentPage, pageSize]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Action Controls */}
      {isSuperAdmin && onOpenInviteModal && (
        <div className="flex justify-end pb-2">
          <button
            onClick={onOpenInviteModal}
            className="px-4 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] transition-all flex items-center gap-1.5 shadow-lg shadow-brand-lime/10 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite User</span>
          </button>
        </div>
      )}

      {/* Roster Metrics Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 flex flex-col">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
          <span className="text-2xl font-black text-white mt-1">{metrics.total}</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex flex-col">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
          <span className="text-2xl font-black text-emerald-300 mt-1">{metrics.active}</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 flex flex-col">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
          <span className="text-2xl font-black text-amber-300 mt-1">{metrics.pending}</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-700/50 bg-slate-900/40 flex flex-col">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3 text-sky-400" /> Players
          </span>
          <span className="text-2xl font-black text-sky-300 mt-1">{metrics.players}</span>
        </div>

        {isSuperAdmin && (
          <>
            <div className="glass-panel p-3.5 rounded-xl border border-brand-lime/20 bg-brand-lime/5 flex flex-col">
              <span className="text-[11px] font-bold text-brand-lime uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Client Admins
              </span>
              <span className="text-2xl font-black text-brand-lime mt-1">{metrics.clientAdmins}</span>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> Super Admins
              </span>
              <span className="text-2xl font-black text-amber-200 mt-1">{metrics.superAdmins}</span>
            </div>
          </>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-30">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or facility..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Page Size Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Role Filter (Super Admin only) */}
          {isSuperAdmin && (
            <div className="relative flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => {
                  setIsRoleOpen(!isRoleOpen);
                  setIsStatusOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-brand-lime/50 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Filter className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                  <span className="truncate">
                    {roleFilter === 'player' ? 'Players' : roleFilter === 'client_admin' ? 'Client Admins' : roleFilter === 'super_admin' ? 'Super Admins' : 'All Roles'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isRoleOpen ? 'rotate-180 text-brand-lime' : ''}`} />
              </button>

              {isRoleOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRoleOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-48 sm:w-52">
                    {[
                      { id: 'all', label: 'All Roles' },
                      { id: 'player', label: 'Standard Players' },
                      { id: 'client_admin', label: 'Client Admins' },
                      { id: 'super_admin', label: 'Super Admins' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setRoleFilter(item.id as any);
                          setCurrentPage(1);
                          setIsRoleOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                          roleFilter === item.id ? 'bg-brand-lime/10 text-brand-lime font-black' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{item.label}</span>
                        {roleFilter === item.id && <Check className="w-3.5 h-3.5 text-brand-lime" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Status Filter */}
          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsRoleOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-400/50 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {statusFilter === 'active' ? 'Active' : statusFilter === 'pending' ? 'Pending' : statusFilter === 'inactive' ? 'Inactive' : statusFilter === 'deleted' ? 'Deleted' : 'All Statuses'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isStatusOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {isStatusOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStatusOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar w-48 sm:w-52">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'active', label: 'Active Users' },
                    { id: 'pending', label: 'Pending Invitation' },
                    { id: 'inactive', label: 'Inactive / Suspended' },
                    { id: 'deleted', label: 'Deleted' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(item.id as any);
                        setCurrentPage(1);
                        setIsStatusOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                        statusFilter === item.id ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {statusFilter === item.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">User Roster Profile</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Company / Facility</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-slate-300 text-base">No matching user accounts found.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'Try adjusting your search keywords or clearing active role/status filters.'
                        : 'There are currently no registered users matching this view scope.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-brand-lime text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const userStatus = u.status || (u.isInvitedPending ? 'pending' : 'active');
                  const avatarSrc =
                    u.photoUrl ||
                    u.avatarUrl ||
                    `https://robohash.org/${encodeURIComponent(u.name || u.email)}?set=set4`;

                  return (
                    <tr key={u.uid || u.email} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Roster Profile Picture + User Name */}
                      <td className="py-4 px-6 font-bold text-white">
                        <div className="flex items-center space-x-3.5">
                          {/* Roster Avatar with Status Ring */}
                          <div className="relative w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900 overflow-hidden flex-shrink-0 shadow-md ring-2 ring-slate-800/60">
                            <img
                              src={avatarSrc}
                              alt={u.name || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  u.name || 'User'
                                )}&background=b5f529&color=0f172a&bold=true`;
                              }}
                            />
                            {/* Status Indicator Dot */}
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                userStatus === 'active'
                                  ? 'bg-emerald-400'
                                  : userStatus === 'pending'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              title={`Status: ${userStatus}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="font-extrabold text-white text-sm truncate group-hover:text-brand-lime transition-colors">
                              {u.name || 'User'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium truncate sm:hidden">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td className="py-4 px-6 text-xs font-mono text-slate-300">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider border ${
                            u.role === 'super_admin'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : u.role === 'client_admin'
                              ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/30'
                              : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          }`}
                        >
                          {u.role === 'super_admin' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              <span>Super Admin</span>
                            </>
                          ) : u.role === 'client_admin' ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              <span>Client Admin</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              <span>Player</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Company Affiliation */}
                      <td className="py-4 px-6 text-xs text-slate-400">
                        <div className="font-medium text-slate-300">
                          {u.companyName || u.companyId || 'Global Platform'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                            userStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : userStatus === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              userStatus === 'active'
                                ? 'bg-emerald-400'
                                : userStatus === 'pending'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          <span>{userStatus}</span>
                        </span>
                      </td>

                      {/* Action Buttons Column */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit User Profile Button */}
                          {(onEditUser || onToggleStatus) && (
                            <button
                              onClick={() => (onEditUser ? onEditUser(u) : onToggleStatus?.(u.uid!, u.status))}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition-all cursor-pointer"
                              title="Edit User Profile & Role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Toggle Status Button */}
                          {onToggleStatus && u.uid && (
                            <button
                              onClick={() => onToggleStatus(u.uid!, u.status)}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                              title={userStatus === 'inactive' ? 'Activate Account' : 'Deactivate Account'}
                            >
                              {userStatus === 'inactive' ? (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <UserX className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </button>
                          )}

                          {/* Delete User Button */}
                          {onDeleteUser && (
                            <button
                              onClick={() => (typeof onDeleteUser === 'function' ? onDeleteUser(u as any) : null)}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination Navigation */}
        {filteredUsers.length > 0 && (
          <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer focus:outline-none focus:border-brand-lime"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="hidden sm:inline">
                Showing{' '}
                <strong className="text-slate-200">
                  {(safeCurrentPage - 1) * pageSize + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-200">
                  {Math.min(safeCurrentPage * pageSize, filteredUsers.length)}
                </strong>{' '}
                of <strong className="text-brand-lime">{filteredUsers.length}</strong> entries
              </span>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 py-1 text-slate-300 font-extrabold">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
