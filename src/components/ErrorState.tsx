import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      title={message}
      action={
        <Button variant="primary" onPress={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
}
