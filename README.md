<div align="center">

# ⚔️ EKLOCKE

**El hub de jugadores, equipos y torneos del Nuzlocke de Pokémon Consonancia.**

Sube tu partida, enseña tu equipo y pelea por el trono con tus colegas.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ Qué hace

- 💾 **Importa el save** del juego y saca automáticamente capturas, equipo, muertes y Pokémon en caja.
- 👥 **Perfiles de jugador** con su equipo, color, sprite de entrenador y modo desafío.
- 🗺️ **Rutas por tramos** de medallas, para ver qué ha pillado cada uno en cada zona.
- 📰 **Feed de actividad** en directo, con anuncios de shinies.
- 🔴 **Indicador de Twitch** para ver quién está retransmitiendo.
- 📋 **PokéPaste**: exporta equipos y guarda el historial de pastes de cada jugador.
- 🏆 **Torneos**: cuadro eliminatorio, rondas individuales, byes repartidos, gestión para organizadores e historial de ediciones archivadas.
- 🧬 Soporte para las **habilidades del randomizer** de Consonancia.

## 🛠️ Stack

| Parte | Tecnología |
| --- | --- |
| Frontend y API | Next.js 16 (App Router) + React 19 |
| Estilos | Tailwind CSS 4 |
| Base de datos | Supabase (Postgres + funciones RPC) |
| Lectura del save | `@hyrious/marshal` (formato Ruby Marshal) |
| Login | Sesión en servidor con cookie `httpOnly` y PIN por jugador |

## 🚀 Puesta en marcha

```bash
git clone https://github.com/Rubaso/ConsonanciaLocke.git
cd ConsonanciaLocke
npm install
cp .env.example .env.local   # rellena tus claves
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Copia `.env.example` a `.env.local` y rellena estas variables:

| Variable | Para qué sirve |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servidor de Supabase (nunca la expongas en el cliente) |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | App de Twitch para el indicador de directos |
| `CRON_SECRET` | Secreto que usa la tarea programada que comprueba los directos |

### Base de datos

Las migraciones están en `supabase/migrations`. Aplícalas en orden con la CLI de Supabase:

```bash
supabase db push
```

## 📁 Estructura

```
src/
├── app/          # Páginas (inicio, jugadores, tramos, torneo, importar…) y rutas de API
├── components/   # Componentes de interfaz
└── lib/          # Lector de saves, catálogos de rutas, auth, Supabase y Twitch
supabase/
└── migrations/   # Esquema y funciones de la base de datos
```

## 🎮 Cómo se usa

1. Entra con tu usuario y PIN.
2. Ve a **Importar** y sube tu archivo de partida.
3. Tu equipo, capturas y bajas aparecen al momento en tu perfil y en el feed.
4. Los espectadores pueden mirarlo todo sin cuenta.

---

<div align="center">
Hecho con 💜 para las runs con los colegas.
</div>