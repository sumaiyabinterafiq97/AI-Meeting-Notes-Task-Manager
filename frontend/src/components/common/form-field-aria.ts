export function getFieldAriaProps(error?: string, id?: string) {
  return {
    'aria-invalid': Boolean(error) as boolean,
    ...(error && id ? { 'aria-describedby': `${id}-error` } : {}),
  };
}
