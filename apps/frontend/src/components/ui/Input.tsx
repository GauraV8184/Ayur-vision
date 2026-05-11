interface InputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  rightElement?: React.ReactNode;
}

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  rightElement,
}: InputProps) => {
  return (
    <label className="form-label">
      {label}
      <div className="input-wrapper">
        <input
          className="form-input"
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
        />
        {rightElement && (
          <span className="input-right-element">{rightElement}</span>
        )}
      </div>
    </label>
  );
};

export default Input;

