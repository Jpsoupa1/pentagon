import { recusarBancoDeProducao } from "../../src/server/db/url";

// Roda antes de cada arquivo de integração: nenhum teste (nem fixture) toca um banco de produção.
recusarBancoDeProducao(process.env.DATABASE_URL ?? "");
