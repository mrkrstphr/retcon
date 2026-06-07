import { Form } from 'react-router';
import { Button, type ButtonProps } from './Button';

export type ButtonActionProps = ButtonProps & {
  action: string;
  method?: 'POST' | 'DELETE' | 'PUT' | 'PATCH';
};

export function ButtonAction({
  action,
  method = 'POST',
  children,
  ...buttonProps
}: ButtonActionProps) {
  return (
    <Form method={method} action={action}>
      <Button type="submit" {...buttonProps}>
        {children}
      </Button>
    </Form>
  );
}
