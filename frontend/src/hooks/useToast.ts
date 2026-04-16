import { useToastContext } from '../components/toast/ToastProvider';

export const useToast = () => {
  const { addToast, removeToast } = useToastContext();
  return { addToast, removeToast };
};

export default useToast;
