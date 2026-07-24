import '@testing-library/jest-dom/vitest'

// Mock URL.createObjectURL for tests
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = () => 'blob:mock-url'
  global.URL.revokeObjectURL = () => {}
}
