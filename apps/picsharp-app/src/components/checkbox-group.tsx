import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CheckboxGroupOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  options: CheckboxGroupOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  labelClassName?: string;
}

export function CheckboxGroup({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  disabled = false,
  className,
  itemClassName,
  labelClassName,
}: CheckboxGroupProps) {
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue || []);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleCheckedChange = (optionValue: string, checked: boolean) => {
    let newValue: string[];
    if (checked) {
      newValue = [...currentValue, optionValue];
    } else {
      newValue = currentValue.filter((v) => v !== optionValue);
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div role='group' className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const isChecked = currentValue.includes(option.value);
        const isDisabled = disabled || option.disabled;
        const id = name ? `${name}-${option.value}` : option.value;

        return (
          <div key={option.value} className={`flex items-center space-x-2 ${itemClassName || ''}`}>
            <Checkbox
              id={id}
              name={name ? `${name}[]` : undefined} // For form submission, treat as an array
              value={option.value}
              checked={isChecked}
              onCheckedChange={(checked) => {
                handleCheckedChange(option.value, !!checked);
              }}
              disabled={isDisabled}
              aria-labelledby={`${id}-label`}
            />
            <Label
              htmlFor={id}
              id={`${id}-label`}
              className={`font-normal ${isDisabled ? 'cursor-not-allowed opacity-70' : ''} ${labelClassName || ''}`}
            >
              {option.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
