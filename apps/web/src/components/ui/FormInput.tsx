import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    error?: string;
    containerClassName?: string;
    labelClassName?: string;
}

export function FormInput({
    label,
    id,
    error,
    containerClassName = '',
    labelClassName = '',
    className = '',
    ...props
}: FormInputProps) {
    const defaultInputClasses = "w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all";
    const errorInputClasses = "border-red-500/50 focus:ring-red-500/50";

    // Note: The classes above are the ones from the Login page. 
    // We might need a "variant" prop if pages use different styles.
    // For now, I'll pass the className as a prop to maintain the visual style of each page.

    return (
        <div className={containerClassName}>
            <label
                htmlFor={id}
                className={`block text-blue-200 text-sm font-medium mb-1.5 ${labelClassName}`}
            >
                {label}
            </label>
            <input
                id={id}
                name={props.name || id}
                className={className || defaultInputClasses}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            />
            {error && (
                <p
                    id={`${id}-error`}
                    className="mt-1 text-xs text-red-400"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
