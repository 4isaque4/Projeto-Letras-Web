import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

type Variant = "avancar" | "voltar" | "confirmar";

interface ActionButtonProps {
  variant: Variant;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ActionButton({ variant, label, onClick, disabled }: ActionButtonProps) {
  const icons = {
    avancar: <ArrowRight size={40} strokeWidth={1.5} />,
    voltar: <ArrowLeft size={40} strokeWidth={1.5} />,
    confirmar: <CheckCircle2 size={40} strokeWidth={1.5} />,
  };
  const labels = { avancar: "AVANÇAR", voltar: "VOLTAR", confirmar: "CONFIRMAR" };
  const colors = {
    avancar: "text-[#17335B]",
    voltar: "text-[#333]",
    confirmar: "text-[#17335B]",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 ${colors[variant]} ${disabled ? "opacity-40" : ""}`}
    >
      {icons[variant]}
      <span style={{ fontSize: 13 }}>{label || labels[variant]}</span>
    </button>
  );
}
