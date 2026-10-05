export const TRIAL_STATES = {
  eligible: { label: '可试用', color: 'success' },
  ineligible: { label: '无试用', color: 'default' },
  unknown: { label: '未确认', color: 'warning' }
}
export const PAYMENT_STATES = {
  detected: { label: '已检测', color: 'success' },
  unknown: { label: '未检测', color: 'default' },
  error: { label: '检测失败', color: 'error' },
  none: { label: '无可用方式', color: 'warning' }
}
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' }, { value: 'paypal', label: 'PayPal' },
  { value: 'apple_pay', label: 'Apple Pay' }, { value: 'gcash', label: 'GCash' },
  { value: 'gopay', label: 'GoPay' }
]
export const CHECKOUT_TYPES = [
  { value: 'oaics', label: 'oaics' }, { value: 'cs_live', label: 'cs_live' },
  { value: 'cs_test', label: 'cs_test' }, { value: 'unknown', label: '未识别' },
  { value: 'disabled', label: '未检测' }
]
