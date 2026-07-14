import api from '@/lib/api'

// The spendable wallet balance. Distinct from customer.credits, which is a running total
// of what has been paid, not money the customer can spend.
export async function fetchWalletBalance(customerID) {
  if (!customerID) return 0
  const result = await api.get(`/api/wallet/${customerID}/balance`)
  return result.success ? Number(result.data?.balance ?? 0) : 0
}
