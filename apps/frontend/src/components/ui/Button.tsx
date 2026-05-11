interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: string;
}

const Button = ({
  children,
  loading = false,
  variant = "primary",
  ...rest
}: ButtonProps) => {
  const className =
    variant === "secondary" ? "btn-secondary" : "btn-primary";

  return (
    <button className={className} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="loader-dot" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;

