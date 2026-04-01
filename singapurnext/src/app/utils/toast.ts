export type ToastType = 'success' | 'error' | 'info';

export const showToast = (
  message: string,
  type: ToastType = 'info',
  duration = 3000
) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: {
        message,
        type,
        duration,
      },
    })
  );
};