import { Input, type InputProps } from './Input';
import { Label } from './Label';

export type InputWithLabelProps = Omit<InputProps, 'className'> & {
  classes?: {
    input?: string;
    label?: string;
  };
  errors?: string[];
  label: string;
};

export function InputWithLabel({ classes, errors, id, label, ...inputProps }: InputWithLabelProps) {
  return (
    <div>
      <Label className={classes?.label} htmlFor={id}>
        {label}
      </Label>
      <Input className={classes?.input} id={id} {...inputProps} />
      {errors && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.join('. ')}</p>}
    </div>
  );
}
