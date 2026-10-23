"use client";

import { useState, type FormEvent } from "react";

type ImportResult = {
  trainerName: string;
  pokemonFound: number;
  pokemonAdded: number;
  pokemonUpdated: number;
  medalsAdded: number;
  unknownMapIds: number[];
  hasStorage: boolean;
  pokemonInDeadBoxes: number;
};

export default function SaveImportForm() {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function importSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/player/import-save", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const responseBody = (await response.json()) as {
        error?: string;
        ok?: boolean;
      } & Partial<ImportResult>;

      if (!response.ok || !responseBody.ok) {
        setError(responseBody.error ?? "No se pudo importar el save.");
        return;
      }

      if (
        typeof responseBody.trainerName !== "string" ||
        typeof responseBody.pokemonFound !== "number" ||
        typeof responseBody.pokemonAdded !== "number" ||
        typeof responseBody.pokemonUpdated !== "number" ||
        typeof responseBody.medalsAdded !== "number" ||
        !Array.isArray(responseBody.unknownMapIds) ||
        typeof responseBody.hasStorage !== "boolean" ||
        typeof responseBody.pokemonInDeadBoxes !== "number"
      ) {
        setError("El servidor respondió con un resultado no válido.");
        return;
      }

      setResult(responseBody as ImportResult);
    } catch {
      setError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-5 rounded-2xl border border-cyan-300/15 bg-slate-950/75 p-5 shadow-xl shadow-cyan-950/15 sm:p-7"
        onSubmit={importSave}
      >
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Archivo de partida (.rxdata)</span>
          <input
            accept=".rxdata"
            className="block w-full rounded-lg border border-white/15 bg-slate-900/80 px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-cyan-100"
            name="save"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            required
            type="file"
          />
          <span className="block text-xs text-slate-500">
            {fileName || "Tamaño máximo: 4 MB. El archivo se procesa en el servidor y no se conserva."}
          </span>
        </label>

        <button
          className="rounded-lg border border-cyan-300/35 bg-cyan-400/15 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={uploading}
          type="submit"
        >
          {uploading ? "Importando…" : "Importar partida"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-rose-400/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section
          className="rounded-2xl border border-teal-300/20 bg-teal-950/20 p-5"
          aria-label="Resultado de la importación"
          role="status"
        >
          <h2 className="text-lg font-bold text-teal-100">Partida importada</h2>
          <p className="mt-1 text-sm text-slate-300">Entrenador detectado: {result.trainerName}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-slate-500">Pokémon encontrados</dt>
              <dd className="mt-1 font-semibold text-slate-100">{result.pokemonFound}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nuevos añadidos</dt>
              <dd className="mt-1 font-semibold text-slate-100">{result.pokemonAdded}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ya existentes / actualizados</dt>
              <dd className="mt-1 font-semibold text-slate-100">{result.pokemonUpdated}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Medallas nuevas</dt>
              <dd className="mt-1 font-semibold text-slate-100">{result.medalsAdded}</dd>
            </div>
            <div>
              <dt className="text-slate-500">En las cajas de caídos</dt>
              <dd className="mt-1 font-semibold text-rose-200">{result.pokemonInDeadBoxes}</dd>
            </div>
          </dl>
          {result.unknownMapIds.length > 0 && (
            <p className="mt-4 text-xs text-amber-200">
              Mapas sin ruta reconocida: {result.unknownMapIds.join(", ")}.
            </p>
          )}
          {!result.hasStorage && (
            <p className="mt-4 text-xs text-amber-200">
              Este archivo no incluye las cajas; solo se pudo importar el equipo activo.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
