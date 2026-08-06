import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useSubscriptionStore, type MySubscription } from '../stores/useSubscription'

export type { MySubscription }

export function useSubscription() {
  const store = useSubscriptionStore(pinia)
  return {
    requesting: toRef(store, 'requesting'),
    error: toRef(store, 'error'),
    mySubscription: toRef(store, 'mySubscription'),
    fetchMySubscription: store.fetchMySubscription,
    requestUpgrade: store.requestUpgrade,
  }
}
