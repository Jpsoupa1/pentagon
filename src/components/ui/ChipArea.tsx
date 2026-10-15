import type { AreaId } from "@/lib/dominio";
import { AREA_POR_ID } from "@/lib/areas";
import s from "./ui.module.css";

export function ChipArea({
  area,
  texto,
  curto,
}: {
  area: AreaId;
  texto?: string;
  curto?: boolean;
}) {
  const a = AREA_POR_ID[area];
  return (
    <span className={s.chip} data-area={area}>
      <span className={s.ponto} aria-hidden />
      {texto ?? (curto ? a.curto : a.nome)}
    </span>
  );
}

export function PontoArea({ area }: { area: AreaId }) {
  return <span className={s.ponto} data-area={area} aria-hidden />;
}
