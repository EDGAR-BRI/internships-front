import { toRef } from 'vue'
import pinia from '../stores/pinia'
import {
  useAdminStore,
  type Plan,
  type UpgradeRequest,
  type AdminUser,
  type AdminSummary,
  type AdminUserDetail,
  type UserPlanInfo,
} from '../stores/useAdmin'

export type {
  Plan,
  UpgradeRequest,
  AdminUser,
  AdminSummary,
  AdminUserDetail,
  UserPlanInfo,
}

export function useAdmin() {
  const store = useAdminStore(pinia)
  return {
    users: toRef(store, 'users'),
    summary: toRef(store, 'summary'),
    loading: toRef(store, 'loading'),
    error: toRef(store, 'error'),
    details: toRef(store, 'details'),
    detailLoadingId: toRef(store, 'detailLoadingId'),
    actionError: toRef(store, 'actionError'),
    plans: toRef(store, 'plans'),
    plansLoading: toRef(store, 'plansLoading'),
    upgradeRequests: toRef(store, 'upgradeRequests'),
    requestsLoading: toRef(store, 'requestsLoading'),
    fetchUsers: store.fetchUsers,
    fetchSummary: store.fetchSummary,
    fetchUserDetail: store.fetchUserDetail,
    updateRole: store.updateRole,
    deleteUser: store.deleteUser,
    assignPlan: store.assignPlan,
    fetchPlans: store.fetchPlans,
    createPlan: store.createPlan,
    updatePlan: store.updatePlan,
    deletePlan: store.deletePlan,
    fetchUpgradeRequests: store.fetchUpgradeRequests,
    approveUpgradeRequest: store.approveUpgradeRequest,
    rejectUpgradeRequest: store.rejectUpgradeRequest,
    clearError: store.clearError,
  }
}
