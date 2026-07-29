export const SMS_VARIABLES = [
  { name: '{{name}}', description: 'Contact name' },
  { name: '{{location}}', description: 'Branch location' },
]

export function previewMessage(message = '') {
  return String(message || '')
    .replaceAll('{{name}}', 'John Doe')
    .replaceAll('{{first_name}}', 'John')
    .replaceAll('{{location}}', 'Stamford')
}
