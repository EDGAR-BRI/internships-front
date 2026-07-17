# Internships Frontend

Frontend para el sistema de seguimiento de pasantías. Construido con Astro 6 + Vue 3 + Tailwind CSS.

## Stack

- **Framework:** Astro 6 (SSR)
- **UI:** Vue 3 + Tailwind CSS v4
- **Despliegue:** Vercel / Railway / Node.js

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL de tu API

# Iniciar servidor de desarrollo
npm run dev
```

## Scripts

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Compilar para producción
- `npm run preview` - Vista previa de producción
- `npm run lint` - Linting
- `npm run typecheck` - Verificación de tipos

## Despliegue

### Vercel

Conecta este repositorio a Vercel. El `vercel.json` ya está configurado.

### Railway

El repositorio incluye `railway.json` configurado para despliegue SSR.

### Node.js (SSR)

```bash
npm run build
node dist/server/entry.mjs
```

## Variables de entorno

- `PUBLIC_API_URL` - URL completa de la API backend (ej: `https://api.example.com/api/v1`)

## Estructura

- `src/components/` - Componentes Vue reutilizables
- `src/pages/` - Rutas de Astro
- `src/layouts/` - Layouts de página
- `src/composables/` - Lógica reutilizable (auth, bitácora)
- `src/lib/` - Utilidades (cliente HTTP)

## Licencia

MIT
