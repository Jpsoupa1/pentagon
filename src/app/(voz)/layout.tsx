/** Modo voz em tela cheia, fora da navegação do app. */
export default function LayoutVoz({ children }: LayoutProps<"/">) {
  return <div style={{ background: "#0F1115", minHeight: "100dvh" }}>{children}</div>;
}
